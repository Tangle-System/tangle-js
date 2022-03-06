import { sleep, toBytes, numberToBytes, crc8, crc32, hexStringToArray, rgbToHex } from "./functions.js";
import { TimeTrack } from "./TimeTrack.js";
import { DEVICE_FLAGS } from "./TangleInterface.js";
import { TnglWriter } from "./TnglWriter.js";
import { TnglReader } from "./TnglReader.js";

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
  #opened;
  #disconnecting;

  #transmitStream;
  #transmitStreamWriter;

  #receiveStream;
  #receiveStreamReader;
  #receiveTextDecoderDone;

  #divisor;

  #beginCallback;
  // #endCallback;
  // #successCallback;
  // #failCallback;

  #feedbackCallback;
  #dataCallback;

  constructor(interfaceReference) {
    this.type = "webserial";

    this.#interfaceReference = interfaceReference;

    this.PORT_OPTIONS = { baudRate: 1000000, dataBits: 8, stopBits: 1, parity: "none" };

    this.#serialPort = null;
    this.#writing = false;

    this.#connected = false;
    this.#opened = false;
    this.#disconnecting = false;

    this.#transmitStream = null;
    this.#transmitStreamWriter = null;

    this.#receiveStream = null;
    this.#receiveStreamReader = null;
    this.#receiveTextDecoderDone = null;

    this.#divisor = 8;

    // this.#beginCallback = null;
    // this.#endCallback = null;
    // this.#successCallback = null;
    // this.#failCallback = null;

    this.#beginCallback = null;
    this.#feedbackCallback = null;
    this.#dataCallback = null;

    this.NETWORK_WRITE = 1;
    this.DEVICE_WRITE = 2;
    this.CLOCK_WRITE = 3;

    this.NETWORK_REQUEST = 4;
    this.DEVICE_REQUEST = 5;
    this.CLOCK_REQUEST = 6;
  }

  /**
   * @name #run()
   * Reads data from the input stream until it is interruped in some way. Then it returns.
   * Received data is handled to the processor's funtion onReceive(value).
   */
  async #run() {
    while (true) {
      // try {
      let { value, done } = await this.#receiveStreamReader.read();

      // console.log(value);

      if (value) {
        value = value.replace(/>>>[\w\d=]*<<</g, (match, $1) => {
          console.warn(match);

          if (match === ">>>BEGIN<<<") {
            this.#beginCallback && this.#beginCallback();
          } else if (match === ">>>END<<<") {
            this.disconnect();
          } else if (match === ">>>SUCCESS<<<") {
            this.#feedbackCallback && this.#feedbackCallback(true);
          } else if (match === ">>>FAIL<<<") {
            this.#feedbackCallback && this.#feedbackCallback(false);
          } else if (match.match(/>>>DATA=/)) {
            // >>>DATA=ab2351ab90cfe72209999009f08e987a9bcd8dcbbd<<<
            let reg = match.match(/>>>DATA=([0123456789abcdef]*)<<</i);
            reg && this.#dataCallback && this.#dataCallback(hexStringToArray(reg[1]));
          }

          // Return the replacement leveraging the parameters.
          return "";
        });

        if (value.length !== 0) {
          console.log(`${value}`);
          this.#interfaceReference.emit("receive", { target: this, payload: value });
        }
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

    if (!this.#disconnecting) {
      this.disconnect();
    }
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
      return this.disconnect().then(() => {
        return this.userSelect(criteria);
      });
    }

    if (this.#serialPort) {
      this.#serialPort = null;
    }

    return navigator.serial.requestPort().then(port => {
      this.#serialPort = port;
      return Promise.resolve({ connector: this.type });
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
    return Promise.resolve(this.#serialPort ? { connector: this.type } : null);
  }

  unselect() {
    if (this.#connected) {
      return this.disconnect().then(() => {
        return this.unselect();
      });
    }

    this.#serialPort = null;

    return Promise.resolve();
  }

  connect(timeout = 5000) {
    if (!this.#serialPort) {
      return Promise.reject("NotSelected");
    }

    if (this.#connected) {
      console.warn("Serial device already connected");
      return Promise.resolve();
    }

    return this.#serialPort
      .open(this.PORT_OPTIONS)
      .then(() => {
        this.#opened = true;

        // this.transmitter.attach(this.serialPort.writable);
        this.#transmitStream = this.#serialPort.writable;

        // this.receiver.attach(this.serialPort.readable);
        this.#receiveStream = this.#serialPort.readable;
        let textDecoder = new window.TextDecoderStream();
        this.#receiveTextDecoderDone = this.#receiveStream.pipeTo(textDecoder.writable);
        this.#receiveStream = textDecoder.readable.pipeThrough(new window.TransformStream(new LineBreakTransformer()));
        //.pipeThrough(new TransformStream(new JSONTransformer()));

        this.#receiveStreamReader = this.#receiveStream.getReader();

        this.#run();

        return new Promise((resolve, reject) => {
          const timeout_handle = setTimeout(() => {
            console.warn("Connection timeouted");
            this.#beginCallback = null;
            reject("ConnectTimeout");
          }, timeout);

          this.#beginCallback = () => {
            clearTimeout(timeout_handle);
            this.#beginCallback = null;

            setTimeout(() => {
              this.#connected = true;
              console.log("> Serial Connector Connected");
              this.#interfaceReference.emit("#connected");
              resolve({ connector: this.type });
            }, 100);
          };

          this.#transmitStreamWriter = this.#transmitStream.getWriter();
          this.#transmitStreamWriter.write(new Uint8Array(["\n".charCodeAt(0)]));
          this.#transmitStreamWriter.releaseLock();
        });
      })
      .catch(error => {
        return this.disconnect().then(() => {
          throw error;
        });
      });
  }

  connected() {
    return Promise.resolve(this.#connected ? { connector: this.type } : null);
  }

  // disconnect Connector from the connected Tangle Device. But keep it selected
  async disconnect() {
    console.log("> Closing serial port...");

    if (!this.#serialPort) {
      console.log("No Serial Port selected");
      return Promise.resolve();
    }

    if (!this.#opened) {
      console.log("Serial port already closed");
      return Promise.resolve();
    }

    if (this.#disconnecting) {
      console.log("Serial port already disconnecting");
      return Promise.resolve();
    }

    this.#disconnecting = true;

    if (this.#receiveStream) {
      if (this.#receiveStreamReader) {
        await this.#receiveStreamReader.cancel().catch(() => {});
        await this.#receiveTextDecoderDone.catch(() => {});
        this.#receiveStreamReader = null;
      }
      this.#receiveStream = null;
    }

    if (this.#transmitStream) {
      if (this.#transmitStreamWriter) {
        await this.#transmitStreamWriter.close().catch(() => {});
        this.#transmitStreamWriter = null;
      }
      this.#transmitStream = null;
    }

    return this.#serialPort
      .close()
      .then(() => {
        this.#opened = false;
        console.log("> Serial port closed");
      })
      .catch(error => {
        console.error("Failed to close serial port. Error: " + error);
      })
      .finally(() => {
        this.#disconnecting = false;
        if (this.#connected) {
          this.#connected = false;
          this.#interfaceReference.emit("#disconnected");
        }
      });
  }

  // serial_connector_packet_type_t packet_type;
  // uint32_t packet_size;
  // uint32_t packet_receive_timeout;
  // uint32_t packet_crc32;
  // uint32_t header_crc32;

  // enum serial_connector_packet_type_t : uint32_t {
  //   NETWORK_WRITE = 1,
  //   DEVICE_WRITE = 2,
  //   CLOCK_WRITE = 3
  // };

  #write(packet_type, payload, tries = 3) {
    if (!tries) {
      return Promise.reject("WriteFailed");
    }

    if(!payload) {
      payload = [];
    }

    const header_writer = new TnglWriter(32);
    const timeout = 25 + payload.length / this.#divisor;

    header_writer.writeUint32(packet_type);
    header_writer.writeUint32(payload.length);
    header_writer.writeUint32(timeout);
    header_writer.writeUint32(crc32(payload));
    header_writer.writeUint32(crc32(new Uint8Array(header_writer.bytes.buffer)));

    this.#transmitStreamWriter = this.#transmitStream.getWriter();

    return new Promise((resolve, reject) => {
      const timeout_handle = setTimeout(
        () => {
          console.error("ResponseTimeout");
          this.#feedbackCallback = null;
          this.#transmitStreamWriter.releaseLock();
          reject("ResponseTimeout");
        },
        timeout < 5000 ? 10000 : timeout * 2,
      );

      this.#feedbackCallback = success => {
        this.#feedbackCallback = null;
        clearInterval(timeout_handle);
        if (success) {
          setTimeout(() => {
            this.#transmitStreamWriter.releaseLock();
            resolve();
          }, 10);
        } else {
          //try to write it once more
          console.log("Trying to recover...");
          setTimeout(() => {
            this.#transmitStreamWriter.releaseLock();
            resolve(this.#write(packet_type, payload, tries - 1));
          }, 100);
        }
      };

      return this.#transmitStreamWriter
        .write(new Uint8Array(header_writer.bytes.buffer))
        .then(() => {
          return this.#transmitStreamWriter.write(new Uint8Array(payload));
        })
        .catch(error => {
          console.error(error);
          // this.#transmitStreamWriter.releaseLock();
          // reject(error);
        });
    });
  }

  #writeNetwork(payload) {
    return this.#write(this.NETWORK_WRITE, payload);
  }

  #writeDevice(payload) {
    return this.#write(this.DEVICE_WRITE, payload);
  }

  #writeClock(payload) {
    return this.#write(this.CLOCK_WRITE, payload);
  }

  #request(request_type, payload, tries = 3) {
    if (!tries) {
      return Promise.reject("RequestFailed");
    }

    let response = null;

    this.#dataCallback = data => {
      response = data;
      this.#dataCallback = null;
    };

    return this.#write(request_type, payload, tries).then(() => {
      return response;
    });
  }

  #readClock() {
    return this.#request(this.CLOCK_REQUEST);
  }

  #requestDevice(request) {
    return this.#request(this.DEVICE_REQUEST, request);
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

    return this.#requestDevice(payload);
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

    if (!this.#connected) {
      return Promise.reject("DeviceDisconnected");
    }

    return new Promise(async (resolve, reject) => {
      for (let index = 0; index < 3; index++) {
        await sleep(1000);
        try {
          const bytes = await this.#readClock();

          const reader = new TnglReader(new DataView(new Uint8Array(bytes).buffer));
          const timestamp = reader.readInt32();

          // const timestamp = await this.#promise;
          console.log("Clock read success:", timestamp);
          resolve(new TimeTrack(timestamp));
          return;
        } catch (e) {
          console.warn("Clock read failed:", e);
        }
      }

      reject("ClockReadFailed");
      return;
    });
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

        await sleep(8000); // need to wait 10 seconds to let the ESP erase the flash.

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
