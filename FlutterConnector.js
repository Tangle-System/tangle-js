import { logging } from "./Logging.js";
import { sleep, toBytes, detectTangleConnect } from "./functions.js";
import { TimeTrack } from "./TimeTrack.js";
import { TnglReader } from "./TnglReader.js";

/////////////////////////////////////////////////////////////////////////////////////

var simulatedFails = false;

class FlutterConnection {
  constructor() {
    // @ts-ignore
    if (window.flutterConnection) {
      logging.debug("FlutterConnection already inited");
      return;
    }

    logging.debug("Initing FlutterConnection");

    // @ts-ignore
    window.flutterConnection = {};

    // @ts-ignore
    window.flutterConnection.resolve = null;

    // @ts-ignore
    window.flutterConnection.reject = null;

    // @ts-ignore
    window.flutterConnection.emit = null;

    // // target="_blank" global handler
    // // @ts-ignore
    // window.flutterConnection.hasOwnProperty("open") &&
    //   /** @type {HTMLBodyElement} */ (document.querySelector("body")).addEventListener("click", function (e) {
    //     e.preventDefault();
    //     // @ts-ignore
    //     for (let el of e.path) {
    //       if (el.tagName === "A" && el.getAttribute("target") === "_blank") {
    //         e.preventDefault();
    //         const url = el.getAttribute("href");
    //         // console.log(url);
    //         // @ts-ignore
    //         window.flutterConnection.open(url);
    //         break;
    //       }
    //     }
    //   });

    if (this.available()) {
      logging.debug("Flutter Connector available");

      window.addEventListener("#resolve", e => {
        // @ts-ignore
        const value = e.detail.value;
        logging.debug("Triggered #resolve:", typeof(value), value);

        // @ts-ignore
        window.flutterConnection.resolve(value);
      });

      window.addEventListener("#reject", e => {
        // @ts-ignore
        const value = e.detail.value;
        logging.debug("Triggered #reject:", typeof(value), value);

        // @ts-ignore
        window.flutterConnection.reject(value);
      });

      window.addEventListener("#emit", e => {
        // @ts-ignore
        const value = e.detail.value;
        logging.debug("Triggered #emit:", typeof(value), value);

        // @ts-ignore
        window.flutterConnection.emit(value);
      });

      window.addEventListener("#process", e => {
        // @ts-ignore
        const bytes = e.detail.value;
        logging.debug("Triggered #process:", typeof(bytes), bytes);

        const array = new Uint8Array(bytes);
        logging.debug("array", array);

        const view = new DataView(array.buffer)
        logging.debug("view", view);


        // @ts-ignore
        window.flutterConnection.process(view);
      });
      
      
    } else {
      logging.debug("flutter_inappwebview in window NOT detected");
      logging.info("Simulating Flutter Functions");

      var _connected = false;
      var _selected = false;

      function _fail(failChance) {
        if (simulatedFails) {
          return Math.random() < failChance;
        } else {
          return false;
        }
      }

      // @ts-ignore
      window.flutter_inappwebview = {};

      // @ts-ignore
      window.flutter_inappwebview.callHandler = async function (handler, a, b, c, d) {
        //
        switch (handler) {
          //
          case "userSelect": // params: (criteria_json, timeout_number)
            {
              // disconnect if already connected
              if (_connected) {
                // @ts-ignore
                await window.flutter_inappwebview.callHandler("disconnect");
              }
              await sleep(Math.random() * 5000); // do the userSelect task filtering devices by the criteria_json parameter
              if (_fail(0.5)) {
                // @ts-ignore
                window.flutterConnection.reject("UserCanceledSelection"); // reject with "UserCanceledSelection" message if user cancels selection
                return;
              }
              if (_fail(0.1)) {
                // @ts-ignore
                window.flutterConnection.reject("SelectionFailed");
                return;
              }
              _selected = true;
              // @ts-ignore
              window.flutterConnection.resolve('{"connector":"tangleconnect"}');
            }
            break;

          case "autoSelect": // params: (criteria_json, scan_period_number, timeout_number)
            {
              if (_connected) {
                // @ts-ignore
                await window.flutter_inappwebview.callHandler("disconnect"); // handle disconnection inside the flutter app
              }
              await sleep(Math.random() * 5000); // do the autoSelect task filtering devices by the criteria_json parameter and scanning minimum time scan_period_number, maximum timeout_number
              if (_fail(0.1)) {
                // @ts-ignore
                window.flutterConnection.reject("SelectionFailed"); // if the selection fails, return "SelectionFailed"
                return;
              }
              _selected = true;
              // @ts-ignore
              window.flutterConnection.resolve('{"connector":"tangleconnect"}'); // resolve with json containing the information about the connected device
            }
            break;

          case "selected":
            {
              // params: ()
              if (_selected) {
                // @ts-ignore
                window.flutterConnection.resolve('{"connector":"tangleconnect"}'); // if the device is selected, return json
              } else {
                // @ts-ignore
                window.flutterConnection.resolve(); // if no device is selected resolve nothing
              }
            }
            break;

          case "unselect":
            {
              // params: ()
              if (_connected) {
                // @ts-ignore
                await window.flutterConnection.disconnect();
              }
              await sleep(10); // unselect logic
              _selected = false;
              // @ts-ignore
              window.flutterConnection.resolve();
            }
            break;

          case "connect":
            {
              // params: (timeout_number)
              if (!_selected) {
                // @ts-ignore
                window.flutterConnection.reject("DeviceNotSelected");
                return;
              }
              await sleep(Math.random() * 5000); // connecting logic
              if (_fail(0.1)) {
                // @ts-ignore
                window.flutterConnection.reject("ConnectionFailed");
                return;
              }
              _connected = true;
              // @ts-ignore
              // @ts-ignore
              window.flutterConnection.resolve('{"connector":"tangleconnect"}');
              // after connection the TangleConnect can any time emit #disconnect event.

              await sleep(1000); // unselect logic

              // @ts-ignore
              window.flutterConnection.emit("#connected");

              setTimeout(() => {
                // @ts-ignore
                window.flutterConnection.emit("#disconnected");
                //}, Math.random() * 60000);
                _connected = false;
              }, 60000);
            }
            break;

          case "disconnect":
            {
              // params: ()
              if (_connected) {
                await sleep(100); // disconnecting logic
                _connected = false;
                // @ts-ignore
                window.flutterConnection.emit("#disconnected");
              }
              // @ts-ignore
              window.flutterConnection.resolve(); // always resolves even if there are internal errors
            }
            break;

          case "connected":
            {
              // params: ()
              if (_connected) {
                // @ts-ignore
                window.flutterConnection.resolve('{"connector":"tangleconnect"}');
              } else {
                // @ts-ignore
                window.flutterConnection.resolve();
              }
            }
            break;

          case "deliver":
            {
              // params: (payload_bytes)
              if (!_connected) {
                // @ts-ignore
                window.flutterConnection.reject("DeviceDisconnected");
                return;
              }
              await sleep(25); // delivering logic
              if (_fail(0.1)) {
                // @ts-ignore
                window.flutterConnection.reject("DeliverFailed");
                return;
              }
              // @ts-ignore
              window.flutterConnection.resolve();
            }
            break;

          case "transmit":
            {
              // params: (payload_bytes)
              if (!_connected) {
                // @ts-ignore
                window.flutterConnection.reject("DeviceDisconnected");
                return;
              }
              await sleep(10); // transmiting logic
              if (_fail(0.1)) {
                // @ts-ignore
                window.flutterConnection.reject("TransmitFailed");
                return;
              }
              // @ts-ignore
              window.flutterConnection.resolve();
            }
            break;

          case "request":
            {
              // params: (payload_bytes, read_response)
              if (!_connected) {
                // @ts-ignore
                window.flutterConnection.reject("DeviceDisconnected");
                return;
              }
              await sleep(50); // requesting logic
              if (_fail(0.1)) {
                // @ts-ignore
                window.flutterConnection.reject("RequestFailed");
                return;
              }

              // @ts-ignore
              window.flutterConnection.resolve([246, 1, 0, 0, 0, 188, 251, 18, 0, 212, 247, 18, 0, 0]); // returns data as an array of bytes: [0,255,123,89]
            }
            break;

          case "writeClock":
            {
              // params: (clock_bytes)
              if (!_connected) {
                // @ts-ignore
                window.flutterConnection.reject("DeviceDisconnected");
                return;
              }
              await sleep(10); // writing clock logic.
              if (_fail(0.1)) {
                // @ts-ignore
                window.flutterConnection.reject("ClockWriteFailed");
                return;
              }
              // @ts-ignore
              window.flutterConnection.resolve();
            }
            break;

          case "readClock":
            {
              // params: ()
              if (!_connected) {
                // @ts-ignore
                window.flutterConnection.reject("DeviceDisconnected");
                return;
              }
              await sleep(50); // reading clock logic.
              if (_fail(0.1)) {
                // @ts-ignore
                window.flutterConnection.reject("ClockReadFailed");
                return;
              }
              // @ts-ignore
              window.flutterConnection.resolve([0, 0, 0, 0]); // returns timestamp as an 32-bit signed number
            }
            break;

          case "updateFW":
            {
              // params: (bytes)
              if (!_connected) {
                // @ts-ignore
                window.flutterConnection.reject("DeviceDisconnected");
                return;
              }
              // @ts-ignore
              window.flutterConnection.emit("ota_status", "begin");
              await sleep(10000); // preparing FW logic.
              if (_fail(0.1)) {
                // @ts-ignore
                window.flutterConnection.emit("ota_status", "fail");
                // @ts-ignore
                window.flutterConnection.reject("UpdateFailed");
                return;
              }
              for (let i = 1; i <= 100; i++) {
                // @ts-ignore
                window.flutterConnection.emit("ota_progress", i);
                await sleep(25); // writing FW logic.
                if (_fail(0.01)) {
                  // @ts-ignore
                  window.flutterConnection.emit("ota_status", "fail");
                  // @ts-ignore
                  window.flutterConnection.reject("UpdateFailed");
                  return;
                }
              }
              await sleep(1000); // finishing FW logic.
              if (_fail(0.1)) {
                // @ts-ignore
                window.flutterConnection.emit("ota_status", "fail");
                // @ts-ignore
                window.flutterConnection.reject("UpdateFailed");
                return;
              }
              // @ts-ignore
              window.flutterConnection.emit("ota_status", "success");
              // @ts-ignore
              window.flutterConnection.resolve();
            }
            break;

          default:
            logging.error("Unknown handler");
            break;
        }
      };
    }
  }

  available() {
    return "flutter_inappwebview" in window;
  }
}

// Connector connects the application with one Tangle Device, that is then in a
// position of a controller for other Tangle Devices
export class FlutterConnector extends FlutterConnection {
  #interfaceReference;

  #promise;

  constructor(interfaceReference) {
    super();

    this.type = "tangleconnect";

    this.#interfaceReference = interfaceReference;
    this.#promise = null;

    // @ts-ignore
    window.flutterConnection.emit = (event, param) => {
      this.#interfaceReference.emit(event, param);
    };

    // @ts-ignore
    window.flutterConnection.process = (event, param) => {
      this.#interfaceReference.process(new DataView(new Uint8Array(param).buffer));
    };
  }

  #applyTimeout(promise, timeout, message) {
    let id = setTimeout(() => {
      // @ts-ignore
      // window.alert(message, "Error: TC response timeouted");
      // @ts-ignore
      window.flutterConnection.reject("ResponseTimeout " + message);
    }, timeout);
    return promise.finally(() => {
      clearTimeout(id);
    });
  }

  async ping() {
    console.time("ping_measure");
    for (let i = 0; i < 1000; i++) {
      this.#promise = new Promise((resolve, reject) => {
        // @ts-ignore
        window.flutterConnection.resolve = resolve;
        // @ts-ignore
        window.flutterConnection.reject = reject;
      });

      // logging.debug("ping")
      // @ts-ignore
      window.flutterConnection.ping();
      await this.#promise;
      // logging.debug("pong")
    }
    //
    console.timeEnd("ping_measure");

    return this.#applyTimeout(this.#promise, 10000, "ping");
  }

  /*

criteria: JSON pole objektu, kde plati: [{ tohle AND tamto AND toto } OR { tohle AND tamto }]

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
  userSelect(criteria_object, timeout_number = 60000) {
    const criteria_json = JSON.stringify(criteria_object);

    logging.debug(`userSelect(criteria=${criteria_json}, timeout=${timeout_number})`);

    this.#promise = new Promise((resolve, reject) => {
      // @ts-ignore
      window.flutterConnection.resolve = function (j) {
        resolve(j ? JSON.parse(j) : null);
      };
      // @ts-ignore
      window.flutterConnection.reject = reject;
    });

    // @ts-ignore
    window.flutter_inappwebview.callHandler("userSelect", criteria_json, timeout_number);

    return this.#applyTimeout(this.#promise, timeout_number * 2, "userSelect");
  }

  // takes the criteria, scans for scan_period and automatically selects the device,
  // you can then connect to. This works only for BLE devices that are bond with the phone/PC/tablet
  // the app is running on OR doesnt need to be bonded in a special way.
  // if more devices are found matching the criteria, then the strongest signal wins
  // if no device is found within the timeout period, then it returns an error

  // if no criteria are provided, all Tangle enabled devices (with all different FWs and Owners and such)
  // are eligible.

  autoSelect(criteria_object, scan_period_number = 1000, timeout_number = 10000) {
    // step 1. for the scan_period scan the surroundings for BLE devices.
    // step 2. if some devices matching the criteria are found, then select the one with
    //         the greatest signal strength. If no device is found until the timeout,
    //         then return error

    const criteria_json = JSON.stringify(criteria_object);

    logging.debug(`autoSelect(criteria=${criteria_json}, scan_period=${scan_period_number}, timeout=${timeout_number})`);

    this.#promise = new Promise((resolve, reject) => {
      // @ts-ignore
      window.flutterConnection.resolve = function (j) {
        resolve(j ? JSON.parse(j) : null);
      };
      // @ts-ignore
      window.flutterConnection.reject = reject;
    });

    // @ts-ignore
    window.flutter_inappwebview.callHandler("autoSelect", criteria_json, scan_period_number, timeout_number);

    return this.#applyTimeout(this.#promise, timeout_number * 2.0, "autoSelect");
  }

  selected() {
    logging.debug(`selected()`);

    this.#promise = new Promise((resolve, reject) => {
      // @ts-ignore
      window.flutterConnection.resolve = function (j) {
        resolve(j ? JSON.parse(j) : null);
      };
      // @ts-ignore
      window.flutterConnection.reject = reject;
    });

    // @ts-ignore
    window.flutter_inappwebview.callHandler("selected");

    return this.#applyTimeout(this.#promise, 1000);
  }

  unselect() {
    logging.debug(`unselect()`);

    this.#promise = new Promise((resolve, reject) => {
      // @ts-ignore
      window.flutterConnection.resolve = resolve;
      // @ts-ignore
      window.flutterConnection.reject = reject;
    });

    // @ts-ignore
    window.flutter_inappwebview.callHandler("unselect");

    return this.#applyTimeout(this.#promise, 1000, "unselect");
  }

  /*
  
  timeout ms 

  */
  connect(timeout_number = 10000) {
    logging.debug(`connect(timeout=${timeout_number})`);

    if (timeout_number < 1000) {
      logging.error("Invalid timeout. Must be more than 1000 ms.");
      timeout_number = 1000;
    }

    this.#promise = new Promise((resolve, reject) => {
      // @ts-ignore
      window.flutterConnection.resolve = function (j) {
        resolve(j ? JSON.parse(j) : null);
      };
      // @ts-ignore
      window.flutterConnection.reject = reject;
    });

    // @ts-ignore
    window.flutter_inappwebview.callHandler("connect", timeout_number);

    return this.#applyTimeout(this.#promise, timeout_number < 5000 ? 10000 : timeout_number * 2, "connect");
  }

  // disconnect Connector from the connected Tangle Device. But keep it selected
  disconnect() {
    logging.debug(`disconnect()`);

    this.#promise = new Promise((resolve, reject) => {
      // @ts-ignore
      window.flutterConnection.resolve = resolve;
      // @ts-ignore
      window.flutterConnection.reject = reject;
    });

    // @ts-ignore
    window.flutter_inappwebview.callHandler("disconnect");

    return this.#applyTimeout(this.#promise, 10000, "disconnect");
  }

  connected() {
    logging.debug(`connected()`);

    this.#promise = new Promise((resolve, reject) => {
      // @ts-ignore
      window.flutterConnection.resolve = function (j) {
        resolve(j ? JSON.parse(j) : null);
      };
      // @ts-ignore
      window.flutterConnection.reject = reject;
    });

    // @ts-ignore
    window.flutter_inappwebview.callHandler("connected");

    return this.#applyTimeout(this.#promise, 1000, "connected");
  }

  // deliver handles the communication with the Tangle network in a way
  // that the command is guaranteed to arrive
  deliver(payload_bytes) {
    logging.debug(`deliver(payload=[${payload_bytes}])`);

    this.#promise = new Promise((resolve, reject) => {
      // @ts-ignore
      window.flutterConnection.resolve = resolve;
      // @ts-ignore
      window.flutterConnection.reject = reject;
    });

    // @ts-ignore
    window.flutter_inappwebview.callHandler("deliver", payload_bytes);

    return this.#applyTimeout(this.#promise, 10000, "deliver");
  }

  // transmit handles the communication with the Tangle network in a way
  // that the command is NOT guaranteed to arrive
  transmit(payload_bytes) {
    logging.debug(`transmit(payload=[${payload_bytes}])`);

    this.#promise = new Promise((resolve, reject) => {
      // @ts-ignore
      window.flutterConnection.resolve = resolve;
      // @ts-ignore
      window.flutterConnection.reject = reject;
    });

    // @ts-ignore
    window.flutter_inappwebview.callHandler("transmit", payload_bytes);

    return this.#applyTimeout(this.#promise, 10000, "transmit");
  }

  // request handles the requests on the Tangle network. The command request
  // is guaranteed to get a response
  request(payload_bytes, read_response = true) {
    logging.debug(`request(payload=[${payload_bytes}], read_response=${read_response ? "true" : "false"})`);

    this.#promise = new Promise((resolve, reject) => {
      // @ts-ignore
      window.flutterConnection.resolve = response => {
        resolve(new DataView(new Uint8Array(response).buffer));
      };
      // @ts-ignore
      window.flutterConnection.reject = reject;
    });

    // @ts-ignore
    window.flutter_inappwebview.callHandler("request", payload_bytes, read_response);

    return this.#applyTimeout(this.#promise, 10000, "request");
  }

  // synchronizes the device internal clock with the provided TimeTrack clock
  // of the application as precisely as possible
  setClock(clock) {
    logging.debug("setClock()");

    return new Promise(async (resolve, reject) => {
      for (let index = 0; index < 3; index++) {
        await sleep(1000);
        try {
          // tryes to ASAP write a timestamp to the clock characteristics.
          // if the ASAP write fails, then try it once more

          this.#promise = new Promise((resolve, reject) => {
            // @ts-ignore
            window.flutterConnection.resolve = resolve;
            // @ts-ignore
            window.flutterConnection.reject = reject;
          });

          const timestamp = clock.millis();
          const clock_bytes = toBytes(timestamp, 4);
          // @ts-ignore
          window.flutter_inappwebview.callHandler("writeClock", clock_bytes);

          await this.#applyTimeout(this.#promise, 5000, "writeClock");
          logging.debug("Clock write success:", timestamp);

          // @ts-ignore
          resolve();
          return;
        } catch (e) {
          logging.warn("Clock write failed: " + e);
        }
      }

      reject("Clock write failed");
      return;
    });
  }

  // returns a TimeTrack clock object that is synchronized with the internal clock
  // of the device as precisely as possible
  getClock() {
    logging.debug("getClock()");

    return new Promise(async (resolve, reject) => {
      for (let index = 0; index < 3; index++) {
        try {
          // tryes to ASAP read a timestamp from the clock characteristics.
          // if the ASAP read fails, then try it once more

          this.#promise = new Promise((resolve, reject) => {
            // @ts-ignore
            window.flutterConnection.resolve = resolve;
            // @ts-ignore
            window.flutterConnection.reject = reject;
          });

          // @ts-ignore
          window.flutter_inappwebview.callHandler("readClock");

          const bytes = await this.#applyTimeout(this.#promise, 5000, "readClock");

          const reader = new TnglReader(new DataView(new Uint8Array(bytes).buffer));
          const timestamp = reader.readInt32();

          // const timestamp = await this.#promise;
          logging.debug("Clock read success:", timestamp);

          resolve(new TimeTrack(timestamp));
          return;
        } catch (e) {
          logging.warn("Clock read failed:", e);
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

  updateFW(firmware_bytes) {
    logging.debug(`updateFW(firmware.length=${firmware_bytes.length})`);

    this.#promise = new Promise((resolve, reject) => {
      // @ts-ignore
      window.flutterConnection.resolve = resolve;
      // @ts-ignore
      window.flutterConnection.reject = reject;
    });

    // @ts-ignore
    window.flutter_inappwebview.callHandler("updateFW", firmware_bytes);

    return this.#applyTimeout(this.#promise, 600000, "updateFW");
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
