import { sleep } from "./functions.js";
import { TimeTrack } from "./TimeTrack.js";

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

  #selected;
  #connected;

  constructor(interfaceReference) {
    this.#interfaceReference = interfaceReference;

    this.PORT_OPTIONS = { baudRate: 1000000 };

    this.#serialPort = null;

    this.#selected = false;
    this.#connected = false;
  }

  /**
   * @name #run()
   * Reads data from the input stream until it is interruped in some way. Then it returns.
   * Received data is handled to the processor's funtion onReceive(value).
   */
  async #run() {
    let error = null;

    while (true) {
      try {
        const { value, done } = await this._receiveStreamReader.read();

        if (value) {
          this.#interfaceReference.emit("receive", { target: this, payload: value });
        }

        if (done) {
          this._receiveStreamReader.releaseLock();
          console.log("Reader done");
          break;
        }
      } catch (e) {
        console.error(e);
        error = e;
      }
    }

    this.detach();

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
    this.#connected
      ? this.disconnect()
      : Promise.resolve().then(() => {
          return navigator.serial.requestPort().then(port => {
            this.#serialPort = port;
          });
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
    return Promise.resolve(this.#serialPort ? { fwVersion: "unknown" } : null);
  }

  unselect() {
    if (this.#connected) {
      return Promise.reject("Connected");
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
        // this.receiver.attach(this.serialPort.readable);
        // this.run();

        let textDecoder = new window.TextDecoderStream();
        this._receiveTextDecoderDone = this.#serialPort.readable.pipeTo(textDecoder.writable);
        this._receiveStream = textDecoder.readable.pipeThrough(new window.TransformStream(new LineBreakTransformer()));
        //.pipeThrough(new TransformStream(new JSONTransformer()));

        this._receiveStreamReader = this._receiveStream.getReader();

        this.#run();

        this.#connected = true;
        this.#interfaceReference.emit("#connected");
      })
      .catch(error => {
        return this.disconnect().then(() => {
          throw error;
        });
      });
  }

  connected() {
    return Promise.resolve(this.#connected);
  }

  // disconnect Connector from the connected Tangle Device. But keep it selected
  disconnect() {
    if (!this.#serialPort) {
      return Promise.reject("NotSelected");
    }

    if (this._transmitStream) {
      this._transmitStream = null;
    }

    if (this._receiveStream) {
      if (this._receiveStreamReader) {
        //await this._receiveStreamReader.cancel().catch(() => {});
        //await this._receiveTextDecoderDone.catch(() => {});
        this._receiveStreamReader = null;
      }
      this._receiveStream = null;
    }

    //.then(() => {
    return this.#serialPort.close();
    //})

    this.#connected = false;
    this.#interfaceReference.emit("#disconnected");
  }

  // deliver handles the communication with the Tangle network in a way
  // that the command is guaranteed to arrive
  deliver(payload) {
    if (this.#connected) {
      return Promise.resolve();
    } else {
      return Promise.reject("Disconnected");
    }
  }

  // transmit handles the communication with the Tangle network in a way
  // that the command is NOT guaranteed to arrive
  transmit(payload) {
    if (this.#connected) {
      return Promise.resolve();
    } else {
      return Promise.reject("Disconnected");
    }
  }

  // request handles the requests on the Tangle network. The command request
  // is guaranteed to get a response
  request(payload, read_response = true) {
    if (this.#connected) {
      return Promise.resolve([]);
    } else {
      return Promise.reject("Disconnected");
    }
  }

  // synchronizes the device internal clock with the provided TimeTrack clock
  // of the application as precisely as possible
  setClock(clock) {
    if (this.#connected) {
      return Promise.resolve();
    } else {
      return Promise.reject("Disconnected");
    }
  }

  // returns a TimeTrack clock object that is synchronized with the internal clock
  // of the device as precisely as possible
  getClock() {
    if (this.#connected) {
      return Promise.resolve(new TimeTrack(0));
    } else {
      return Promise.reject("Disconnected");
    }
  }

  // handles the firmware updating. Sends "ota" events
  // to all handlers
  updateFW(firmware) {
    return new Promise(async (resolve, reject) => {
      if (!this.#connected) {
        reject("Disconnected");
        return;
      }

      this.#interfaceReference.emit("ota_status", "begin");

      await sleep(1000);

      for (let percentage = 1; percentage <= 100; percentage++) {
        this.#interfaceReference.emit("ota_progress", percentage);

        await sleep(50);

        if (!this.#connected) {
          this.#interfaceReference.emit("ota_status", "fail");
          reject("Connection Failure");
          return;
        }

        if (Math.random() <= 0.01) {
          this.#interfaceReference.emit("ota_status", "fail");
          reject("Simulated Failure");
          return;
        }
      }

      await sleep(1000);

      this.#interfaceReference.emit("ota_status", "success");

      resolve();
      return;
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
