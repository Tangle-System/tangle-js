import { sleep } from "./functions.js";
import { TimeTrack } from "./TimeTrack.js";
import { TnglWriter } from "./TnglWriter.js";
import { TnglReader } from "./TnglReader.js";

/////////////////////////////////////////////////////////////////////////////////////

// Connector connects the application with one Tangle Device, that is then in a
// position of a controller for other Tangle Devices
export class TangleConnectConnector {
  #interfaceReference;

  #promise;
  // #resolve; // function that will resolve current promise
  // #reject; // function that will reject current promise

  constructor(interfaceReference) {
    this.#interfaceReference = interfaceReference;

    this.#promise = null;

    if (!("tangleConnect" in window)) {
      window.tangleConnect = {};

      window.tangleConnect.userSelect = function () {
        window.tangleConnect.resolve();
      };
      window.tangleConnect.autoSelect = function () {
        window.tangleConnect.resolve();
      };
      window.tangleConnect.selected = function () {
        window.tangleConnect.resolve();
      };
      window.tangleConnect.unselect = function () {
        window.tangleConnect.resolve();
      };
      window.tangleConnect.connect = function () {
        window.tangleConnect.resolve();
      };
      window.tangleConnect.disconnect = function () {
        window.tangleConnect.resolve();
      };
      window.tangleConnect.connected = function () {
        window.tangleConnect.resolve();
      };
      window.tangleConnect.deliver = function () {
        window.tangleConnect.resolve();
      };
      window.tangleConnect.transmit = function () {
        window.tangleConnect.resolve();
      };
      window.tangleConnect.request = function () {
        window.tangleConnect.resolve([]);
      };
      window.tangleConnect.readClock = function () {
        window.tangleConnect.resolve([0, 0, 0, 0]);
      };
      window.tangleConnect.writeClock = function () {
        window.tangleConnect.resolve();
      };
      window.tangleConnect.updateFW = function () {
        window.tangleConnect.resolve();
      };
    }

    window.tangleConnect.emit = this.#interfaceReference.emit;

    // if ("tangleConnect" in window) {
    //   // window.tangleConnect.resolve = (json_response) => {
    //   //   this.resolve(json_response);
    //   // }

    //   // window.tangleConnect.resolve = this.#resolve;
    //   // window.tangleConnect.reject = this.#reject;
    // }
  }

  available() {
    return "tangleConnect" in window;
  }

  async ping() {
    console.time("ping_measure");
    for (let i = 0; i < 1000; i++) {
      this.#promise = new Promise((resolve, reject) => {
        window.tangleConnect.resolve = resolve;
        window.tangleConnect.reject = reject;
      });

      // console.log("ping")
      window.tangleConnect.ping();
      await this.#promise;
      // console.log("pong")
    }
    //
    console.timeEnd("ping_measure");

    return this.#promise;
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
    // this.#selected = true;
    // //console.log("choose()");

    console.log(`userSelect(criteria=${JSON.stringify(criteria)})`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = resolve;
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.userSelect(JSON.stringify(criteria));

    return this.#promise;
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

    console.log(`autoSelect(criteria=${JSON.stringify(criteria)}scan_period=${scan_period}, timeout=${timeout})`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = resolve;
      window.tangleConnect.reject = reject;
    });

    // ! for now autoselect calls userSelect
    window.tangleConnect.autoSelect(JSON.stringify(criteria), scan_period = 1000, timeout = 3000);

    return this.#promise;
  }

  selected() {
    console.log(`selected()`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = resolve;
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.selected();

    return this.#promise;
  }

  unselect() {
    console.log(`unselect()`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = resolve;
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.unselect();

    return this.#promise;
  }

  /*
  
  timeout ms 

  */
  connect(timeout = 5000) {
    console.log(`connect(timeout=${timeout})`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = resolve;
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.connect(timeout);

    return this.#promise;
  }

  connected() {
    console.log(`connected()`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = resolve;
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.connected();

    return this.#promise.catch(() => {
      return Promise.resolve();
    });
  }

  // disconnect Connector from the connected Tangle Device. But keep it selected
  disconnect() {
    console.log(`disconnect()`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = () => {
        console.log("TangleConnect Disconnected");
        this.#interfaceReference.emit("#disconnected");
        resolve();
      };
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.disconnect();

    return this.#promise;
  }

  // deliver handles the communication with the Tangle network in a way
  // that the command is guaranteed to arrive
  deliver(payload) {
    console.log(`deliver(payload=[${payload}])`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = resolve;
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.deliver(payload);

    return this.#promise;
  }

  // transmit handles the communication with the Tangle network in a way
  // that the command is NOT guaranteed to arrive
  transmit(payload) {
    console.log(`transmit(payload=[${payload}])`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = resolve;
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.transmit(payload);

    return this.#promise;
  }

  // request handles the requests on the Tangle network. The command request
  // is guaranteed to get a response
  request(payload, read_response = true) {
    console.log(`request(payload=[${payload}], read_response=${read_response ? "true" : "false"})`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = resolve;
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.request(payload, read_response);

    return this.#promise;
  }

  // synchronizes the device internal clock with the provided TimeTrack clock
  // of the application as precisely as possible
  setClock(clock) {
    console.log("setClock()");
    return Promise.resolve();

    return new Promise(async (resolve, reject) => {
      for (let index = 0; index < 3; index++) {
        await sleep(1000);
        try {
          // tryes to ASAP write a timestamp to the clock characteristics.
          // if the ASAP write fails, then try it once more

          this.#promise = new Promise((resolve, reject) => {
            window.tangleConnect.resolve = resolve;
            window.tangleConnect.reject = reject;
          });

          // const writer = new TnglWriter(4);
          // const timestamp = clock.millis();
          // writer.writeInt32(timestamp)
          // window.tangleConnect.writeClock(writer.bytes());

          const timestamp = clock.millis();
          window.tangleConnect.writeClock(timestamp);

          await this.#promise;
          console.log("Clock write success:", timestamp);

          resolve();
          return;
        } catch (e) {
          console.warn("Clock write failed");
        }
      }

      reject("Clock write failed");
      return;
    });
  }

  // returns a TimeTrack clock object that is synchronized with the internal clock
  // of the device as precisely as possible
  getClock() {
    console.log("getClock()");

    return new Promise(async (resolve, reject) => {
      for (let index = 0; index < 3; index++) {
        try {
          // tryes to ASAP read a timestamp from the clock characteristics.
          // if the ASAP read fails, then try it once more

          this.#promise = new Promise((resolve, reject) => {
            window.tangleConnect.resolve = resolve;
            window.tangleConnect.reject = reject;
          });

          window.tangleConnect.readClock();

          // const bytes = await this.#promise;
          // const reader = new TnglReader(new DataView(new Uint8Array(bytes).buffer));
          // const timestamp = reader.readInt32();

          const timestamp = await this.#promise;
          console.log("Clock read success:", timestamp);

          resolve(new TimeTrack(timestamp));
          return;
        } catch (e) {
          console.warn("Clock read failed:", e);
          await sleep(1000);
        }
      }

      reject("Clock read failed");
      return;
    });
  }

  // handles the firmware updating. Sends "ota" events
  // to all handlers

  // TODO - emit "ota_progress" events

  updateFW(firmware) {
    console.log(`updateFW(firmware.length=${firmware.length})`);

    this.#interfaceReference.emit("ota_status", "begin");

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = () => {
        this.#interfaceReference.emit("ota_status", "success");
        resolve();
      };
      window.tangleConnect.reject = () => {
        this.#interfaceReference.emit("ota_status", "fail");
        reject();
      };
    });

    window.tangleConnect.updateFW(firmware);

    return this.#promise;
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
