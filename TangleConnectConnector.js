import { sleep, toBytes } from "./functions.js";
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
      // simulate Tangle Connect

      var _connected = false;
      var _seleted = false;

      function _fail(chance) {
        return Math.random() < chance;
      }

      window.tangleConnect = {};

      window.tangleConnect.userSelect = async function (criteria, timeout = 60000) {
        if (_connected) {
          await window.tangleConnect.disconnect();
        }
        await sleep(Math.random() * 5000); // userSelect logic
        if (_fail(0.5)) {
          window.tangleConnect.reject("UserCanceledSelection");
          return;
        }
        if (_fail(0.1)) {
          window.tangleConnect.reject("SelectionFailed");
          return;
        }
        _seleted = true;
        window.tangleConnect.resolve('{"connector":"tangleconnect"}');
      };

      window.tangleConnect.autoSelect = async function (criteria, scan_period = 1000, timeout = 10000) {
        if (_connected) {
          await window.tangleConnect.disconnect();
        }
        await sleep(Math.random() * 5000); // autoSelect logic
        if (_fail(0.1)) {
          window.tangleConnect.reject("SelectionFailed");
          return;
        }
        _seleted = true;
        window.tangleConnect.resolve('{"connector":"tangleconnect"}');
      };

      window.tangleConnect.selected = async function () {
        if (_seleted) {
          window.tangleConnect.resolve('{"connector":"tangleconnect"}');
        } else {
          window.tangleConnect.resolve();
        }
      };

      window.tangleConnect.unselect = async function () {
        if (_connected) {
          await window.tangleConnect.disconnect();
        }
        await sleep(10); // unselect logic
        _seleted = false;
        window.tangleConnect.resolve();
      };

      window.tangleConnect.connect = async function (timeout) {
        if (!_seleted) {
          window.tangleConnect.reject("DeviceNotSelected");
          return;
        }
        await sleep(Math.random() * 5000); // connecting logic
        if (_fail(0.1)) {
          window.tangleConnect.reject("ConnectionFailed");
          return;
        }
        _connected = true;
        window.tangleConnect.emit("#connected");
        window.tangleConnect.resolve('{"connector":"tangleconnect"}');
        // after connection the TangleConnect can any time emit #disconnect event.
        setTimeout(() => {
          window.tangleConnect.emit("#disconnected");
          //}, Math.random() * 60000);
        }, 60000);
      };

      window.tangleConnect.disconnect = async function () {
        if (_connected) {
          await sleep(100); // disconnecting logic
          _connected = false;
          window.tangleConnect.emit("#disconnected");
        }
        window.tangleConnect.resolve(); // always resolves even if there are internal errors
      };

      window.tangleConnect.connected = async function () {
        if (_connected) {
          window.tangleConnect.resolve('{"connector":"tangleconnect"}');
        } else {
          window.tangleConnect.resolve();
        }
      };

      window.tangleConnect.deliver = async function () {
        if (!_connected) {
          window.tangleConnect.reject("DeviceNotConnected");
          return;
        }
        await sleep(25); // delivering logic
        if (_fail(0.1)) {
          window.tangleConnect.reject("DeliverFailed");
          return;
        }
        window.tangleConnect.resolve();
      };

      window.tangleConnect.transmit = async function () {
        if (!_connected) {
          window.tangleConnect.reject("DeviceNotConnected");
          return;
        }
        await sleep(10); // transmiting logic
        if (_fail(0.1)) {
          window.tangleConnect.reject("TransmitFailed");
          return;
        }
        window.tangleConnect.resolve();
      };

      window.tangleConnect.request = async function () {
        if (!_connected) {
          window.tangleConnect.reject("DeviceNotConnected");
          return;
        }
        await sleep(50); // requesting logic
        if (_fail(0.1)) {
          window.tangleConnect.reject("RequestFailed");
          return;
        }

        window.tangleConnect.resolve([246, 1, 0, 0, 0, 188, 251, 18, 0, 212, 247, 18, 0, 0]); // returns data as an array of bytes: [0,255,123,89]
      };

      window.tangleConnect.readClock = async function () {
        if (!_connected) {
          window.tangleConnect.reject("DeviceNotConnected");
          return;
        }
        await sleep(50); // reading clock logic.
        if (_fail(0.1)) {
          window.tangleConnect.reject("ClockReadFailed");
          return;
        }
        window.tangleConnect.resolve([0, 0, 0, 0]); // returns timestamp as an 32-bit signed number
      };

      window.tangleConnect.writeClock = async function (bytes) {
        if (!_connected) {
          window.tangleConnect.reject("DeviceNotConnected");
          return;
        }
        await sleep(10); // writing clock logic.
        if (_fail(0.1)) {
          window.tangleConnect.reject("ClockWriteFailed");
          return;
        }
        window.tangleConnect.resolve();
      };

      window.tangleConnect.updateFW = async function () {
        if (!_connected) {
          window.tangleConnect.reject("DeviceNotConnected");
          return;
        }
        window.tangleConnect.emit("ota_status", "begin");
        await sleep(10000); // preparing FW logic.
        if (_fail(0.1)) {
          window.tangleConnect.emit("ota_status", "fail");
          window.tangleConnect.reject("UpdateFailed");
          return;
        }
        for (let i = 1; i <= 100; i++) {
          window.tangleConnect.emit("ota_progress", i);
          await sleep(25); // writing FW logic.
          if (_fail(0.01)) {
            window.tangleConnect.emit("ota_status", "fail");
            window.tangleConnect.reject("UpdateFailed");
            return;
          }
        }
        await sleep(1000); // finishing FW logic.
        if (_fail(0.1)) {
          window.tangleConnect.emit("ota_status", "fail");
          window.tangleConnect.reject("UpdateFailed");
          return;
        }
        window.tangleConnect.emit("ota_status", "success");
        window.tangleConnect.resolve();
      };
    }

    window.tangleConnect.emit = (event, param) => {
      this.#interfaceReference.emit(event, param);
    };

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

  #applyTimeout(promise, timeout, message) {
    let id = setTimeout(() => {
      window.alert(message, "Error: TC response timeouted");
      window.tangleConnect.reject("ResponseTimeout");
    }, timeout);
    return promise.finally(() => {
      clearTimeout(id);
    });
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

    return this.#applyTimeout(this.#promise, 10000, "ping");
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
  userSelect(criteria, timeout = 60000) {
    // this.#selected = true;
    // //console.log("choose()");

    console.log(`userSelect(criteria=${JSON.stringify(criteria)}, timeout=${timeout})`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = function (json) {
        resolve(json ? JSON.parse(json) : null);
      };
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.userSelect(JSON.stringify(criteria), timeout);

    return this.#applyTimeout(this.#promise, timeout * 2, "userSelect");
  }

  // takes the criteria, scans for scan_period and automatically selects the device,
  // you can then connect to. This works only for BLE devices that are bond with the phone/PC/tablet
  // the app is running on OR doesnt need to be bonded in a special way.
  // if more devices are found matching the criteria, then the strongest signal wins
  // if no device is found within the timeout period, then it returns an error

  // if no criteria are provided, all Tangle enabled devices (with all different FWs and Owners and such)
  // are eligible.

  autoSelect(criteria, scan_period = 1000, timeout = 10000) {
    // step 1. for the scan_period scan the surroundings for BLE devices.
    // step 2. if some devices matching the criteria are found, then select the one with
    //         the greatest signal strength. If no device is found until the timeout,
    //         then return error

    console.log(`autoSelect(criteria=${JSON.stringify(criteria)}, scan_period=${scan_period}, timeout=${timeout})`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = function (json) {
        resolve(json ? JSON.parse(json) : null);
      };
      window.tangleConnect.reject = reject;
    });

    // ! for now autoselect calls userSelect
    window.tangleConnect.autoSelect(JSON.stringify(criteria), scan_period, timeout);

    return this.#applyTimeout(this.#promise, timeout * 2.0, "autoSelect");
  }

  selected() {
    console.log(`selected()`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = function (json) {
        resolve(json ? JSON.parse(json) : null);
      };
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.selected();

    return this.#applyTimeout(this.#promise, 1000);
  }

  unselect() {
    console.log(`unselect()`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = resolve;
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.unselect();

    return this.#applyTimeout(this.#promise, 1000, "unselect");
  }

  /*
  
  timeout ms 

  */
  connect(timeout = 10000) {
    console.log(`connect(timeout=${timeout})`);

    if (timeout < 1000) {
      console.error("Invalid timeout. Must be more than 1000 ms.");
      timeout = 1000;
    }

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = function (json) {
        resolve(json ? JSON.parse(json) : null);
      };
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.connect(timeout);

    return this.#applyTimeout(this.#promise, timeout * 2.0, "connect");
  }

  connected() {
    console.log(`connected()`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = function (json) {
        resolve(json ? JSON.parse(json) : null);
      };
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.connected();

    return this.#applyTimeout(this.#promise, 1000, "connected");
  }

  // disconnect Connector from the connected Tangle Device. But keep it selected
  disconnect() {
    console.log(`disconnect()`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = resolve;
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.disconnect();

    return this.#applyTimeout(this.#promise, 1000, "disconnect");
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

    return this.#applyTimeout(this.#promise, 5000, "deliver");
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

    return this.#applyTimeout(this.#promise, 1000, "transmit");
  }

  // request handles the requests on the Tangle network. The command request
  // is guaranteed to get a response
  request(payload, read_response = true) {
    console.log(`request(payload=[${payload}], read_response=${read_response ? "true" : "false"})`);

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = response => {
        resolve(new DataView(new Uint8Array(response).buffer));
      };
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.request(payload, read_response);

    return this.#applyTimeout(this.#promise, 5000, "request");
  }

  // synchronizes the device internal clock with the provided TimeTrack clock
  // of the application as precisely as possible
  setClock(clock) {
    console.log("setClock()");

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

          const timestamp = clock.millis();
          const bytes = toBytes(timestamp, 4);
          window.tangleConnect.writeClock(bytes);

          // const timestamp = clock.millis();
          // window.tangleConnect.writeClock(timestamp);

          await this.#applyTimeout(this.#promise, 1000, "writeClock");
          console.log("Clock write success:", timestamp);

          resolve();
          return;
        } catch (e) {
          console.warn("Clock write failed: " + e);
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

          const bytes = await this.#applyTimeout(this.#promise, 5000, "readClock");

          const reader = new TnglReader(new DataView(new Uint8Array(bytes).buffer));
          const timestamp = reader.readInt32();

          // const timestamp = await this.#promise;
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

    this.#promise = new Promise((resolve, reject) => {
      window.tangleConnect.resolve = resolve;
      window.tangleConnect.reject = reject;
    });

    window.tangleConnect.updateFW(firmware);

    return this.#applyTimeout(this.#promise, 60000, "updateFW");
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
