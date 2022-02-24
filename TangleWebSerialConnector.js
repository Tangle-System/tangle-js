import { sleep, toBytes, numberToBytes, crc8, crc32 } from "./functions.js";
import { TimeTrack } from "./TimeTrack.js";
import { DEVICE_FLAGS } from "./TangleInterface.js";
import { TnglWriter } from "./TnglWriter.js";

///////////////////////////////////////////////////////////////////////////////////

/**
 * @name LineBreakTransformer
 * TransformStream to parse the stream into lines.
 */
class LineBreakTransformer {
  constructor() {
    // A container for holding stream data until a new line.
    this.container = "";
  }

  transform(chunk, controller) {
    // Handle incoming chunk
    this.container += chunk;
    const lines = this.container.split("\n");
    this.container = lines.pop();
    lines.forEach(line => controller.enqueue(line));
  }

  flush(controller) {
    // Flush the stream.
    controller.enqueue(this.container);
  }
}

///////////////////////////////////////////////////////////////////////////////////

// Connector connects the application with one Tangle Device, that is then in a
// position of a controller for other Tangle Devices
export class TangleWebSerialConnector {
  #interfaceReference;

  #serialPort;
  #writing;

  #connected;

  #transmitStream;
  #transmitStreamWriter;

  #receiveStream;
  #receiveStreamReader;
  #receiveTextDecoderDone;

  #divisor;

  #readCallback;

  constructor(interfaceReference) {
    this.#interfaceReference = interfaceReference;

    this.PORT_OPTIONS = { baudRate: 1000000, dataBits: 8, stopBits: 1, parity: "none" };

    this.#serialPort = null;
    this.#writing = false;

    this.#connected = false;

    this.#transmitStream = null;
    this.#transmitStreamWriter = null;

    this.#receiveStream = null;
    this.#receiveStreamReader = null;
    this.#receiveTextDecoderDone = null;

    this.#divisor = 8;

    this.#readCallback = null;

    this.UNKNOWN_PACKET = 0;
    this.NETWORK_PACKET = 1;
    this.DEVICE_PACKET = 2;
    this.CLOCK_PACKET = 3;
  }

  /**
   * @name #run()
   * Reads data from the input stream until it is interruped in some way. Then it returns.
   * Received data is handled to the processor's funtion onReceive(value).
   */
  async #run() {
    let error = null;

    while (true) {
      // try {
      let { value, done } = await this.#receiveStreamReader.read();

      if (this.#readCallback) {
        value = this.#readCallback(value);
      }

      if (value && value.length !== 0) {
        console.log(`${value}`);
        this.#interfaceReference.emit("receive", { target: this, payload: value });
      }

      if (done) {
        this.#receiveStreamReader.releaseLock();
        console.log("Reader done");
        break;
      }
      // } catch (e) {
      //   console.error(e);
      //   error = e;
      // }
    }

    if (this.#receiveStream) {
      if (this.#receiveStreamReader) {
        await this.#receiveStreamReader.cancel().catch(() => {});
        await this.#receiveTextDecoderDone.catch(() => {});
        this.#receiveStreamReader = null;
      }
      this.#receiveStream = null;
    }

    this.#connected = false;
    this.#interfaceReference.emit("#disconnected");
  }

  /*

criteria: pole objektu, kde plati: [{ tohle and tamto and toto } or { tohle and tamto }]

možnosti:
  name: string
  namePrefix: string
  fwVersion: string
  ownerSignature: string
  productCode: number
  adoptionFlag: bool

criteria example:
[
  // all Devices that are named "NARA Aplha", are on 0.7.2 fw and are
  // adopted by the owner with "baf2398ff5e6a7b8c9d097d54a9f865f" signature.
  // Product code is 1 what means NARA Alpha
  {
    name:"NARA Alpha" 
    fwVersion:"0.7.2"
    ownerSignature:"baf2398ff5e6a7b8c9d097d54a9f865f"
    productCode:1
  },
  // all the devices with the name starting with "NARA", without the 0.7.3 FW and 
  // that are not adopted by anyone
  // Product code is 2 what means NARA Beta 
  {
    namePrefix:"NARA"
    fwVersion:"!0.7.3"
    productCode:2
    adoptionFlag:true
  }
]

*/
  // choose one Tangle device (user chooses which device to connect to via a popup)
  // if no criteria are set, then show all Tangle devices visible.
  // first bonds the BLE device with the PC/Phone/Tablet if it is needed.
  // Then selects the device
  userSelect(criteria) {
    if (this.#connected) {
      this.disconnect().then(() => {
        this.userSelect(criteria);
      });
    }

    if (this.#serialPort) {
      this.#serialPort = null;
    }

    return navigator.serial.requestPort().then(port => {
      this.#serialPort = port;
    });
  }

  // takes the criteria, scans for scan_period and automatically selects the device,
  // you can then connect to. This works only for BLE devices that are bond with the phone/PC/tablet
  // the app is running on OR doesnt need to be bonded in a special way.
  // if more devices are found matching the criteria, then the strongest signal wins
  // if no device is found within the timeout period, then it returns an error

  // if no criteria are provided, all Tangle enabled devices (with all different FWs and Owners and such)
  // are eligible.

  autoSelect(criteria, scan_period = 1000, timeout = 3000) {
    // step 1. for the scan_period scan the surroundings for BLE devices.
    // step 2. if some devices matching the criteria are found, then select the one with
    //         the greatest signal strength. If no device is found until the timeout,
    //         then return error

    return this.userSelect();
  }

  selected() {
    return Promise.resolve(this.#serialPort ? { connector: "webserial" } : null);
  }

  unselect() {
    if (this.#connected) {
      return this.disconnect().then(() => {
        this.unselect();
      });
    }

    this.#serialPort = null;

    return Promise.resolve();
  }

  connect(timeout = 5000) {
    if (!this.#serialPort) {
      return Promise.reject("NotSelected");
    }

    return this.#serialPort
      .open(this.PORT_OPTIONS)
      .then(() => {
        // this.transmitter.attach(this.serialPort.writable);
        this.#transmitStream = this.#serialPort.writable;

        // this.receiver.attach(this.serialPort.readable);
        this.#receiveStream = this.#serialPort.readable;
        let textDecoder = new TextDecoderStream();
        this.#receiveTextDecoderDone = this.#receiveStream.pipeTo(textDecoder.writable);
        this.#receiveStream = textDecoder.readable.pipeThrough(new TransformStream(new LineBreakTransformer()));
        //.pipeThrough(new TransformStream(new JSONTransformer()));

        this.#receiveStreamReader = this.#receiveStream.getReader();

        this.#run();

        return this.#write(this.UNKNOWN_PACKET, []).finally(() => {
          return sleep(1000).then(() => {
            console.log("> Serial Connector Connected");
            this.#connected = true;
            this.#interfaceReference.emit("#connected");
          });
        });
      })
      .catch(error => {
        return this.disconnect().then(() => {
          throw error;
        });
      });
  }

  connected() {
    return Promise.resolve(this.#connected ? { connector: "webserial" } : null);
  }

  // disconnect Connector from the connected Tangle Device. But keep it selected
  async disconnect() {
    if (!this.#connected || !this.#serialPort) {
      return Promise.resolve();
    }

    // await this.receiver.detach();
    if (this.#receiveStream) {
      if (this.#receiveStreamReader) {
        await this.#receiveStreamReader.cancel().catch(() => {});
        await this.#receiveTextDecoderDone.catch(() => {});
        this.#receiveStreamReader = null;
      }
      this.#receiveStream = null;
    }

    // await this.#transmitter.detach();
    if (this.#transmitStream) {
      // if (this.#transmitStreamWriter) {
      //   await this.#transmitStreamWriter.close().catch(() => {});
      //   this.#transmitStreamWriter = null;
      // }
      this.#transmitStream = null;
    }

    return this.#serialPort.close().finally(() => {
      this.#connected = false;
    });
  }

  // serial_connector_packet_type_t packet_type;
  // uint32_t packet_size;
  // uint32_t packet_receive_timeout;
  // uint32_t packet_crc32;
  // uint32_t header_crc32;

  // enum serial_connector_packet_type_t : uint32_t {
  //   UNKNOWN_PACKET = 0,
  //   NETWORK_PACKET = 1,
  //   DEVICE_PACKET = 2,
  //   CLOCK_PACKET = 3
  // };

  #write(packet_type, payload) {
    const header_writer = new TnglWriter(32);
    const timeout = 25 + payload.length / this.#divisor;

    header_writer.writeUint32(packet_type);
    header_writer.writeUint32(payload.length);
    header_writer.writeUint32(timeout);
    header_writer.writeUint32(crc32(payload));
    header_writer.writeUint32(crc32(new Uint8Array(header_writer.bytes.buffer)));

    const stream_writer = this.#transmitStream.getWriter();

    return new Promise((resolve, reject) => {
      const timeout_handle = setTimeout(
        () => {
          console.error("ResponseTimeout");
          this.#readCallback = null;
          stream_writer.releaseLock();
          reject("ResponseTimeout");
          //resolve();
        },
        timeout < 5000 ? 10000 : timeout * 2,
      );

      this.#readCallback = message => {
        if (message.match(/>>>SUCCESS<<</)) {
          message = message.replace(/>>>SUCCESS<<</, "");
          this.#readCallback = null;
          clearInterval(timeout_handle);
          setInterval(() => {
            stream_writer.releaseLock();
            resolve();
          }, 10);
        } else if (message.match(/>>>FAIL<<</)) {
          message = message.replace(/>>>FAIL<<</, "");
          console.error("Serial write fail code detected");
          this.#readCallback = null;
          clearInterval(timeout_handle);
          stream_writer.releaseLock();
          //try to write it once more
          console.log("Trying to recover...");
          sleep(100).then(() => {
            resolve(this.#write(packet_type, payload));
          });
        }

        return message;
      };

      return stream_writer
        .write(new Uint8Array(header_writer.bytes.buffer))
        .then(() => {
          return stream_writer.write(new Uint8Array(payload));
        })
        .catch(error => {
          stream_writer.releaseLock();
          reject(error);
        });
    });
  }

  #writeNetwork(payload) {
    return this.#write(this.NETWORK_PACKET, payload);
  }

  #writeDevice(payload) {
    return this.#write(this.DEVICE_PACKET, payload);
  }

  #writeClock(payload) {
    return this.#write(this.CLOCK_PACKET, payload);
  }

  // deliver handles the communication with the Tangle network in a way
  // that the command is guaranteed to arrive
  deliver(payload) {
    // console.log(`deliver(payload=${payload})`);

    if (!this.#connected) {
      return Promise.reject("DeviceDisconnected");
      return;
    }

    if (!payload) {
      return Promise.resolve();
    }

    return this.#writeNetwork(payload);
  }

  // transmit handles the communication with the Tangle network in a way
  // that the command is NOT guaranteed to arrive
  transmit(payload) {
    // console.log(`transmit(payload=${payload})`);

    if (!this.#connected) {
      return Promise.reject("DeviceDisconnected");
      return;
    }

    if (!payload) {
      return Promise.resolve();
    }

    return this.#writeNetwork(payload);
  }

  // request handles the requests on the Tangle network. The command request
  // is guaranteed to get a response
  request(payload, read_response = true) {
    if (!this.#connected) {
      return Promise.reject("DeviceDisconnected");
      return;
    }

    if (!payload) {
      return Promise.resolve();
    }

    if (read_response) {
      return Promise.reject("NotImplemented");
    }

    return this.#writeDevice(payload);
  }

  // synchronizes the device internal clock with the provided TimeTrack clock
  // of the application as precisely as possible
  setClock(clock) {
    // console.log(`setClock(clock.millis()=${clock.millis()})`);

    if (!this.#connected) {
      return Promise.reject("DeviceDisconnected");
    }

    return new Promise(async (resolve, reject) => {
      for (let index = 0; index < 3; index++) {
        try {
          await this.#writeClock([...toBytes(clock.millis(), 4)]);
          console.log("Clock write success");
          resolve();
          return;
        } catch (e) {
          console.warn("Clock write failed");
          await sleep(1000);
        }
      }

      reject("ClockWriteFailed");
      return;
    });
  }

  // returns a TimeTrack clock object that is synchronized with the internal clock
  // of the device as precisely as possible
  getClock() {
    // console.log(`getClock()`);

    return Promise.reject("NotImplemented");
  }

  // handles the firmware updating. Sends "ota" events
  // to all handlers
  updateFW(firmware) {
    // console.log(`updateFW(firmware=${firmware})`);

    if (!this.#serialPort) {
      console.warn("Serial Port is null");
      return Promise.reject("UpdateFailed");
    }

    if (this.#writing) {
      console.warn("Communication in proccess");
      return Promise.reject("UpdateFailed");
    }

    this.#writing = true;

    return new Promise(async (resolve, reject) => {
      const chunk_size = 3984; // must be modulo 16

      this.#divisor = 32;

      let index_from = 0;
      let index_to = chunk_size;

      let written = 0;

      console.log("OTA UPDATE");
      console.log(firmware);

      try {
        this.#interfaceReference.emit("ota_status", "begin");

        {
          //===========// RESET //===========//
          console.log("OTA RESET");

          const bytes = [DEVICE_FLAGS.FLAG_OTA_RESET, 0x00, ...numberToBytes(0x00000000, 4)];
          await this.#writeDevice(bytes);
        }

        await sleep(100);

        {
          //===========// BEGIN //===========//
          console.log("OTA BEGIN");

          const bytes = [DEVICE_FLAGS.FLAG_OTA_BEGIN, 0x00, ...numberToBytes(firmware.length, 4)];
          await this.#writeDevice(bytes);
        }

        await sleep(10000); // need to wait 10 seconds to let the ESP erase the flash.

        {
          //===========// WRITE //===========//
          console.log("OTA WRITE");

          const start_timestamp = new Date().getTime();

          while (written < firmware.length) {
            if (index_to > firmware.length) {
              index_to = firmware.length;
            }

            const bytes = [DEVICE_FLAGS.FLAG_OTA_WRITE, 0x00, ...numberToBytes(written, 4), ...firmware.slice(index_from, index_to)];

            await this.#writeDevice(bytes);
            written += index_to - index_from;

            const percentage = Math.floor((written * 10000) / firmware.length) / 100;
            console.log(percentage + "%");

            this.#interfaceReference.emit("ota_progress", percentage);

            index_from += chunk_size;
            index_to = index_from + chunk_size;
          }

          console.log("Firmware written in " + (new Date().getTime() - start_timestamp) / 1000 + " seconds");
        }

        await sleep(100);

        {
          //===========// END //===========//
          console.log("OTA END");

          const bytes = [DEVICE_FLAGS.FLAG_OTA_END, 0x00, ...numberToBytes(written, 4)];
          await this.#writeDevice(bytes);
        }

        await sleep(3000);

        this.#interfaceReference.emit("ota_status", "success");
        resolve();
      } catch (e) {
        console.error(e);
        this.#interfaceReference.emit("ota_status", "fail");
        reject("UpdateFailed");
      }
    }).finally(() => {
      this.#divisor = 8;
      this.#writing = false;
    });
  }

  destroy() {
    //this.#interfaceReference = null; // dont know if I need to destroy this reference.. But I guess I dont need to?
    return this.disconnect()
      .catch(() => {})
      .then(() => {
        return this.unselect();
      })
      .catch(() => {});
  }
}
