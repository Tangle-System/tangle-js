import { logging } from "./Logging.js";
import {
  colorToBytes,
  createNanoEvents,
  hexStringToUint8Array,
  labelToBytes,
  numberToBytes,
  percentageToBytes,
  sleep,
  stringToBytes,
  detectBluefy,
  noSleep,
  detectTangleConnect,
  detectSpectodaConnect,
  mapValue,
  rgbToHex,
  detectAndroid,
  detectSafari,
  detectChrome,
  detectWindows,
  detectLinux,
  detectIPhone,
  detectMacintosh,
} from "./functions.js";
import { TangleDummyConnector } from "./TangleDummyConnector.js";
import { TangleWebBluetoothConnector } from "./TangleWebBluetoothConnector.js";
import { TangleWebSerialConnector } from "./TangleWebSerialConnector.js";
import { TangleConnectConnector } from "./TangleConnectConnector.js";
import { TangleWebSocketsConnector } from "./TangleWebSocketsConnector.js";
import { TimeTrack } from "./TimeTrack.js";
import "./TnglReader.js";
import "./TnglWriter.js";
import { TnglReader } from "./TnglReader.js";
import { FlutterConnector } from "./FlutterConnector.js";
import { t } from "./i18n.js";

export const DEVICE_FLAGS = Object.freeze({
  // legacy FW update flags
  FLAG_OTA_BEGIN: 255, // legacy
  FLAG_OTA_WRITE: 0, // legacy
  FLAG_OTA_END: 254, // legacy
  FLAG_OTA_RESET: 253, // legacy

  FLAG_DEVICE_REBOOT_REQUEST: 5, // legacy
  FLAG_DEVICE_DISCONNECT_REQUEST: 6,

  FLAG_CONFIG_UPDATE_REQUEST: 10,
  FLAG_CONFIG_UPDATE_RESPONSE: 11,

  FLAG_SAVE_STATE_REQUEST: 220,
  FLAG_SAVE_STATE_RESPONSE: 221,

  FLAG_SLEEP_REQUEST: 222,
  FLAG_SLEEP_RESPONSE: 223,
  FLAG_CONNECTED_PEERS_INFO_REQUEST: 224,
  FLAG_CONNECTED_PEERS_INFO_RESPONSE: 225,

  FLAG_DEVICE_CONFIG_REQUEST: 226,
  FLAG_DEVICE_CONFIG_RESPONSE: 227,
  FLAG_ROM_PHY_VDD33_REQUEST: 228,
  FLAG_ROM_PHY_VDD33_RESPONSE: 229,
  FLAG_VOLTAGE_ON_PIN_REQUEST: 230,
  FLAG_VOLTAGE_ON_PIN_RESPONSE: 231,

  FLAG_CHANGE_DATARATE_REQUEST: 232,
  FLAG_CHANGE_DATARATE_RESPONSE: 233,

  FLAG_FW_VERSION_REQUEST: 234,
  FLAG_FW_VERSION_RESPONSE: 235,
  FLAG_ERASE_OWNER_REQUEST: 236,
  FLAG_ERASE_OWNER_RESPONSE: 237,

  FLAG_TNGL_FINGERPRINT_REQUEST: 242,
  FLAG_TNGL_FINGERPRINT_RESPONSE: 243,
  FLAG_TIMELINE_REQUEST: 245,
  FLAG_TIMELINE_RESPONSE: 246,

  FLAG_CONNECT_REQUEST: 238,
  FLAG_CONNECT_RESPONSE: 239,
  FLAG_ADOPT_REQUEST: 240,
  FLAG_ADOPT_RESPONSE: 241,
});

export const NETWORK_FLAGS = Object.freeze({
  /* command flags */

  FLAG_RSSI_DATA: 100,
  FLAG_PEER_CONNECTED: 101,
  FLAG_PEER_DISCONNECTED: 102,

  FLAG_CONF_BYTES: 240,
  FLAG_TNGL_BYTES: 248,
  FLAG_SET_TIMELINE: 249,

  FLAG_EMIT_LAZY_EVENT: 230,
  FLAG_EMIT_LAZY_TIMESTAMP_EVENT: 231,
  FLAG_EMIT_LAZY_COLOR_EVENT: 232,
  FLAG_EMIT_LAZY_PERCENTAGE_EVENT: 233,
  FLAG_EMIT_LAZY_LABEL_EVENT: 234,

  FLAG_EMIT_EVENT: 247,
  FLAG_EMIT_TIMESTAMP_EVENT: 250,
  FLAG_EMIT_COLOR_EVENT: 251,
  FLAG_EMIT_PERCENTAGE_EVENT: 252,
  FLAG_EMIT_LABEL_EVENT: 253,
});

// TangleDevice.js -> TangleInterface.js -> | TangleXXXConnector.js ->

// TangleInterface vsude vraci Promisy a ma v sobe spolecne
// koncepty pro vsechny konektory. Tzn send queue, ktery paruje odpovedi a resolvuje
// promisy.
// TangleInterface definuje
// userSelect, autoSelect, selected
// connect, disconnect, connected
// execute, request
// setClock, getClock, updateFW
// addEventListener - "connected", "disconnected", "otastatus", "tngl"

// TangleXXXConnector.js je jakoby blokujici API, pres ktere se da pripojovat k FW.

/////////////////////////////////////////////////////////////////////////

// Deffered object
class Query {
  static TYPE_EXECUTE = 1;
  static TYPE_DELIVER = 2;
  static TYPE_TRANSMIT = 3;
  static TYPE_USERSELECT = 4;
  static TYPE_AUTOSELECT = 5;
  static TYPE_SELECTED = 6;
  static TYPE_UNSELECT = 7;
  static TYPE_CONNECT = 8;
  static TYPE_CONNECTED = 9;
  static TYPE_DISCONNECT = 10;
  static TYPE_REQUEST = 11;
  static TYPE_SET_CLOCK = 12;
  static TYPE_GET_CLOCK = 13;
  static TYPE_FIRMWARE_UPDATE = 14;
  static TYPE_DESTROY = 15;

  constructor(type, a = null, b = null, c = null, d = null) {
    this.type = type;
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.promise = new Promise((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    });
  }
}

// filters out duplicate payloads and merges them together. Also decodes payloads received from the connector.
export class TangleInterface {
  #deviceReference;

  #eventEmitter;
  #wakeLock;

  #queue;
  #processing;

  #chunkSize;

  #reconection;
  #selecting;
  #disconnectQuery;

  #reconnectionInterval;

  #connectGuard;

  #lastUpdateTime;
  #lastUpdatePercentage;

  constructor(deviceReference, reconnectionInterval = 1000) {
    this.#deviceReference = deviceReference;

    this.clock = new TimeTrack(0);

    this.connector = /** @type {TangleDummyConnector | TangleWebBluetoothConnector | TangleWebSerialConnector | TangleConnectConnector | FlutterConnector | TangleWebSocketsConnector | null} */ (null);

    this.#eventEmitter = createNanoEvents();
    this.#wakeLock = null;

    this.#queue = /** @type {Query[]} */ ([]);
    this.#processing = false;
    this.#chunkSize = 5000;

    this.#reconection = false;
    this.#selecting = false;
    this.#disconnectQuery = null;

    this.#reconnectionInterval = reconnectionInterval;

    this.#connectGuard = false;

    this.#lastUpdateTime = new Date().getTime();
    this.#lastUpdatePercentage = 0;

    this.onConnected = e => { };
    this.onDisconnected = e => { };

    // this.#otaStart = new Date().getTime();

    // this.#eventEmitter.on("ota_status", value => {

    //   switch(value) {

    //   }
    // });

    this.#eventEmitter.on("ota_progress", value => {
      // const now = new Date().getTime();

      // const time_delta = now - this.lastUpdateTime;
      // logging.verbose("time_delta:", time_delta);
      // this.lastUpdateTime = now;

      // const percentage_delta = value - this.lastUpdatePercentage;
      // logging.verbose("percentage_delta:", percentage_delta);
      // this.lastUpdatePercentage = value;

      // const percentage_left = 100.0 - value;
      // logging.verbose("percentage_left:", percentage_left);

      // const time_left = (percentage_left / percentage_delta) * time_delta;
      // logging.verbose("time_left:", time_left);

      // this.emit("ota_timeleft", time_left);

      const now = new Date().getTime();

      const time_delta = now - this.lastUpdateTime;
      logging.verbose("time_delta:", time_delta);
      this.lastUpdateTime = now;

      const percentage_delta = value - this.lastUpdatePercentage;
      logging.verbose("percentage_delta:", percentage_delta);
      this.lastUpdatePercentage = value;

      const percentage_left = 100.0 - value;
      logging.verbose("percentage_left:", percentage_left);

      const time_left = (percentage_left / percentage_delta) * time_delta;
      logging.verbose("time_left:", time_left);

      this.emit("ota_timeleft", time_left);
    });

    this.#eventEmitter.on("#connected", e => {
      this.#onConnected(e);
    });

    this.#eventEmitter.on("#disconnected", e => {
      this.#onDisconnected(e);
    });

    // open external links in Flutter SC
    if (detectSpectodaConnect()) {
      // target="_blank" global handler
      // @ts-ignore

      /** @type {HTMLBodyElement} */ document.querySelector("body").addEventListener("click", function (e) {
      e.preventDefault();

      (function (e, d, w) {
        if (!e.composedPath) {
          e.composedPath = function () {
            if (this.path) {
              return this.path;
            }
            var target = this.target;

            this.path = [];
            while (target.parentNode !== null) {
              this.path.push(target);
              target = target.parentNode;
            }
            this.path.push(d, w);
            return this.path;
          };
        }
      })(Event.prototype, document, window);
      // @ts-ignore
      const path = e.path || (e.composedPath && e.composedPath());

      // @ts-ignore
      for (let el of path) {
        if (el.tagName === "A" && el.getAttribute("target") === "_blank") {
          e.preventDefault();
          const url = el.getAttribute("href");
          // console.log(url);
          // @ts-ignore
          console.log("Openning external url", url)
          window.flutter_inappwebview.callHandler("openExternalUrl", url);
          break;
        }
      }
    });
    }

    // open external links in JAVA TC
    else if (detectTangleConnect()) {
      // target="_blank" global handler
      // @ts-ignore
      window.tangleConnect.hasOwnProperty("openExternal") &&
        /** @type {HTMLBodyElement} */ (document.querySelector("body")).addEventListener("click", function (e) {
          e.preventDefault();
          // @ts-ignore
          for (let el of e.path) {
            if (el.tagName === "A" && el.getAttribute("target") === "_blank") {
              e.preventDefault();
              const url = el.getAttribute("href");
              // console.log(url);
              // @ts-ignore
              window.tangleConnect.open(url);
              break;
            }
          }
        });
    }

    window.addEventListener("beforeunload", e => {
      // If I cant disconnect right now for some readon
      // return this.disconnect(false).catch(reason => {
      //   if (reason == "CurrentlyWriting") {
      //     e.preventDefault();
      //     e.cancelBubble = true;
      //     e.returnValue = "Právě probíhá update připojeného zařízení, neopouštějte tuto stránku.";
      //     window.confirm("Právě probíhá update připojeného zařízení, neopouštějte tuto stránku.");
      //   }
      // });

      this.destroyConnector(); // dodelat .destroy() v tangleConnectConnectoru
    });
  }

  /**
   * @name addEventListener
   * @param {string} event
   * @param {Function} callback
   *
   * events: "disconnected", "connected"
   *
   * all events: event.target === the sender object (TangleWebBluetoothConnector)
   * event "disconnected": event.reason has a string with a disconnect reason
   *
   * @returns {Function} unbind function
   */

  addEventListener(event, callback) {
    return this.#eventEmitter.on(event, callback);
  }
  /**
   * @alias this.addEventListener
   */
  on(event, callback) {
    return this.#eventEmitter.on(event, callback);
  }

  emit(event, ...arg) {
    this.#eventEmitter.emit(event, ...arg);
  }

  requestWakeLock() {
    logging.debug("> Activating wakeLock...");
    if (detectSpectodaConnect()) {
      return window.flutter_inappwebview.callHandler("setWakeLock", true);
    } else {
      return noSleep.enable();
    }
  }

  releaseWakeLock() {
    logging.debug("> Deactivating wakeLock...");
    if (detectSpectodaConnect()) {
      return window.flutter_inappwebview.callHandler("setWakeLock", false);
    } else {
      noSleep.disable();
      return Promise.resolve();
    }
  }

  assignConnector(connector_type) {
    if (!connector_type) {
      connector_type = "none";
    }

    logging.debug(`> Assigning ${connector_type} connector...`);

    if ((!this.connector && connector_type === "none") || (this.connector && this.connector.type === connector_type)) {
      logging.warn("Trying to reassign current connector.");
      return Promise.resolve();
    }

    if (connector_type == "default") {
      if (detectSpectodaConnect()) {
        connector_type = "flutter";
      } else if (detectTangleConnect()) {
        connector_type = "tangleconnect";
      } else if (navigator.bluetooth) {
        connector_type = "webbluetooth";
      } else {
        connector_type = "none";
      }
    }

    return this.connector ? this.destroyConnector() : Promise.resolve()
      .catch(() => {})
      .then(() => {
        switch (connector_type) {
          case "none":
            this.connector = null;
            break;

          case "dummy":
            this.connector = new TangleDummyConnector(this, false);
            break;

          case "vdummy":
            return (
              window
                // @ts-ignore
                .prompt("Simulace FW verze dummy connecoru", "VDUMMY_0.8.1_20220301", "Zvolte FW verzi dummy connecoru", "text", {
                  placeholder: "DUMMY_0.0.0_00000000",
                  regex: /^[\w\d]+_\d.\d.\d_[\d]{8}/,
                  invalidText: "FW verze není správná",
                  maxlength: 32,
                })
                // @ts-ignore
                .then(version => {
                  this.connector = new TangleDummyConnector(this, false, version);
                })
            );

          case "edummy":
            this.connector = new TangleDummyConnector(this, true);
            break;

          case "webbluetooth":
            if (detectBluefy() || (detectAndroid() && detectChrome()) || (detectMacintosh() && detectChrome()) || (detectWindows() && detectChrome()) || (detectLinux() && detectChrome())) {
              this.connector = new TangleWebBluetoothConnector(this);
            } else {
              // iPhone outside Bluefy and TangleConnect
              if (detectIPhone()) {
                // @ts-ignore
                window.confirm(t("Z tohoto webového prohlížeče bohužel není možné NARU ovládat. Prosím, otevřete aplikace v prohlížeči Bluefy."), t("Prohlížeč není podporován")).then(result => {
                  if (result) {
                    // redirect na Bluefy v app store
                    window.location.replace("https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055");
                  }
                });
              }
              // Macs outside Google Chrome
              else if (detectMacintosh()) {
                // @ts-ignore
                window.confirm(t("Z tohoto webového prohlížeče bohužel není možné NARU ovládat. Prosím, otevřete aplikace v prohlížeči Google Chrome."), t("Prohlížeč není podporován")).then(result => {
                  if (result) {
                    // redirect na Google Chrome
                    window.location.replace("https://www.google.com/intl/cs_CZ/chrome/");
                  }
                });
              }
              // Android outside Google Chrome
              else if (detectAndroid()) {
                // @ts-ignore
                window.confirm(t("Z tohoto webového prohlížeče bohužel není možné NARU ovládat. Prosím, otevřete aplikace v prohlížeči Google Chrome."), t("Prohlížeč není podporován")).then(result => {
                  if (result) {
                    // redirect na Google Chrome
                    window.location.replace("https://www.google.com/intl/cs_CZ/chrome/");
                  }
                });
              }
              // Windows outside Google Chrome
              else if (detectWindows()) {
                // @ts-ignore
                window.confirm(t("Z tohoto webového prohlížeče bohužel není možné NARU ovládat. Prosím, otevřete aplikace v prohlížeči Google Chrome."), t("Prohlížeč není podporován")).then(result => {
                  if (result) {
                    // redirect na Google Chrome
                    window.location.replace("https://www.google.com/intl/cs_CZ/chrome/");
                  }
                });
              }
              // Linux ChromeBooks atd...
              else {
                window.confirm(t("Z tohoto webového prohlížeče bohužel nejspíš není možné NARU ovládat."));
              }
            }

            this.connector = new TangleWebBluetoothConnector(this);

            break;

          case "webserial":
            if (detectChrome()) {
            this.connector = new TangleWebSerialConnector(this);
            } else {
              logging.error("Error: Assigning unsupported connector");
              this.connector = null;  
            }
            break;

          case "tangleconnect":
            if (detectTangleConnect()) {
              this.connector = new TangleConnectConnector(this);
            } else {
              logging.error("Error: Assigning unsupported connector");
              this.connector = null;
            }
            break;

          case "flutter":
            if (detectSpectodaConnect()) {
              this.connector = new FlutterConnector(this);
            } else {
              logging.error("Error: Assigning unsupported connector");
              this.connector = null;
            }
            break;

          case "websockets":
            this.connector = new TangleWebSocketsConnector(this);
            break;

          default:
            throw "UnknownConnector";
        }
      });
  }

  reconnection(enable) {
    this.#reconection = enable;
  }

  userSelect(criteria, timeout = 60000) {
    // this.#reconection = false;

    if (timeout < 1000) {
      logging.error("Timeout is too short.");
      return Promise.reject("InvalidTimeout");
    }

    if (this.#selecting) {
      return Promise.reject("SelectingInProgress");
    }

    this.#selecting = true;

    if (criteria === null) {
      criteria = [];
    } else if (!Array.isArray(criteria)) {
      criteria = [criteria];
    }

    const item = new Query(Query.TYPE_USERSELECT, criteria, timeout);
    this.#process(item);
    return item.promise.finally(() => {
      this.#selecting = false;
    });

    // =========================================

    // this.#reconection = false;

    // if (this.#selecting) {
    //   return Promise.reject("SelectingInProgress");
    // }

    // this.#selecting = true;

    // return this.connector
    //   .disconnect()
    //   .catch(() => {})
    //   .then(() => {
    //     return this.connector.userSelect(criteria, timeout);
    //   })
    //   .finally(() => {
    //     this.#selecting = false;
    //   });
  }

  autoSelect(criteria, scan_period = 1000, timeout = 10000) {
    // this.#reconection = false;

    if (timeout < 1000) {
      logging.error("Timeout is too short.");
      return Promise.reject("InvalidTimeout");
    }

    if (this.#selecting) {
      return Promise.reject("SelectingInProgress");
    }

    this.#selecting = true;

    if (criteria === null) {
      criteria = [];
    } else if (!Array.isArray(criteria)) {
      criteria = [criteria];
    }

    const item = new Query(Query.TYPE_AUTOSELECT, criteria, scan_period, timeout);
    this.#process(item);
    return item.promise.finally(() => {
      this.#selecting = false;
    });

    // =========================================

    // this.#reconection = false;

    // if (this.#selecting) {
    //   return Promise.reject("SelectingInProgress");
    // }

    // this.#selecting = true;

    // return this.connector
    //   .disconnect()
    //   .catch(() => {})
    //   .then(() => {
    //     return this.connector.autoSelect(criteria, scan_period, timeout);
    //   })
    //   .finally(() => {
    //     this.#selecting = false;
    //   });
  }

  unselect() {
    const item = new Query(Query.TYPE_UNSELECT);
    this.#process(item);
    return item.promise;

    //========================================

    // return this.connector.unselect();
  }

  selected() {
    const item = new Query(Query.TYPE_SELECTED);
    this.#process(item);
    return item.promise;

    //========================================

    // return this.connector.selected();
  }

  connect(timeout = 10000, supportLegacy = false) {
    if (timeout < 1000) {
      logging.error("Timeout is too short.");
      return Promise.reject("InvalidTimeout");
    }

    const item = new Query(Query.TYPE_CONNECT, timeout, supportLegacy);
    this.#process(item);
    return item.promise;

    //========================================

    // this.#reconection = true;

    // if (timeout < 1000) {
    //   logging.error("Timeout is too short.");
    //   return Promise.reject("InvalidTimeout");
    // }

    // if (this.#connecting) {
    //   return Promise.reject("ConnectingInProgress");
    // }

    // this.#connecting = true;

    // return this.connector
    //   .connect(timeout)
    //   .then(() => {
    //     return this.connector
    //       .getClock()
    //       .then(clock => {
    //         this.clock = clock;
    //       })
    //       .catch(e => {
    //         this.clock = new TimeTrack();
    //         return this.connector.setClock(this.clock);
    //       });
    //   })

    //   .finally(() => {
    //     this.#connecting = false;
    //   });
  }

  #onConnected = event => {
    if (this.#connectGuard) {
      logging.error("Connecting logic error. #connected called when already connected?");
      logging.warn("Ignoring the #connected event");
      return;
    }

    this.#connectGuard = true;
    this.onConnected(event);
  };

  disconnect() {
    this.#reconection = false;

    const item = new Query(Query.TYPE_DISCONNECT);
    this.#process(item);
    return item.promise;
  }

  #onDisconnected = event => {
    if (!this.#connectGuard) {
      logging.error("Connecting logic error. #disconnected called when already disconnected?");
      logging.warn("Ignoring the #disconnected event");
      return;
    }

    this.#connectGuard = false;
    this.onDisconnected(event);

    // for (let i = 0; i < this.#queue.length; i++) {
    //   this.#queue[i].reject("Disconnected");
    // }
    // this.#queue = [];

    if (this.#reconection && this.#reconnectionInterval) {
      logging.debug("Reconnecting...");
      setTimeout(() => {
        logging.debug("Reconnecting device");
        return this.connect(this.#reconnectionInterval).catch(() => {
          logging.warn("Reconnection failed.");
        });
      }, 2000);
    }

    if (this.#disconnectQuery) {
      this.#disconnectQuery.resolve();
    }
  };

  connected() {
    const item = new Query(Query.TYPE_CONNECTED);
    this.#process(item);
    return item.promise;

    //========================================

    // return this.connector.connected();
  }

  deliver(bytes) {
    const item = new Query(Query.TYPE_DELIVER, bytes);
    this.#process(item);
    return item.promise;
  }

  transmit(bytes) {
    const item = new Query(Query.TYPE_TRANSMIT, bytes);
    this.#process(item);
    return item.promise;
  }

  execute(bytes, bytes_label) {
    const item = new Query(Query.TYPE_EXECUTE, bytes, bytes_label);

    // there must only by one item in the queue with given label
    // this is used to send only the most recent item.
    // for example events
    // so if there is a item with that label, then remove it and
    // push this item to the end of the queue
    if (item.b) {
      for (let i = 0; i < this.#queue.length; i++) {
        if (this.#queue[i].type === Query.TYPE_EXECUTE && this.#queue[i].b === item.b) {
          this.#queue[i].resolve();
          this.#queue.splice(i, 1);
          break;
        }
      }
    }

    this.#process(item);
    return item.promise;
  }

  request(bytes, read_response) {
    console.log({ bytes, read_response });
    const item = new Query(Query.TYPE_REQUEST, bytes, read_response);
    this.#process(item);
    return item.promise;
  }

  syncClock() {
    const item = new Query(Query.TYPE_SET_CLOCK, this.clock);

    for (let i = 0; i < this.#queue.length; i++) {
      if (this.#queue[i].type === Query.TYPE_SET_CLOCK) {
        this.#queue[i].reject("Multiple Clock writes");
        this.#queue.splice(i, 1);
        break;
      }
    }

    this.#process(item);
    return item.promise;
  }

  // getClock() {
  //   const item = new Query(Query.TYPE_GET_CLOCK);

  //   for (let i = 0; i < this.#queue.length; i++) {
  //     if (this.#queue[i].type === Query.TYPE_GET_CLOCK) {
  //       this.#queue[i].reject("Multiple Clock Requests");
  //       this.#queue.splice(i, 1);
  //       break;
  //     }
  //   }

  //   this.#process(item);

  //   return item.promise;
  // }

  updateFW(firmware_bytes) {
    const item = new Query(Query.TYPE_FIRMWARE_UPDATE, firmware_bytes);

    for (let i = 0; i < this.#queue.length; i++) {
      if (this.#queue[i].type === Query.TYPE_FIRMWARE_UPDATE) {
        this.#queue[i].reject("Multiple FW Updates");
        this.#queue.splice(i, 1);
        break;
      }
    }

    this.#process(item);
    return item.promise;
  }

  destroyConnector() {
    const item = new Query(Query.TYPE_DESTROY);

    for (let i = 0; i < this.#queue.length; i++) {
      if (this.#queue[i].type === Query.TYPE_DESTROY) {
        this.#queue[i].reject("Multiple Connector destroy()");
        this.#queue.splice(i, 1);
        break;
      }
    }

    this.#process(item);
    return item.promise;
  }

  // starts a "thread" that is processing the commands from queue
  #process(item) {
    if (item) {
      this.#queue.push(item);
    }

    if (!this.#processing) {
      this.#processing = true;

      // spawn async function to handle the transmittion one item at the time
      (async () => {
        await sleep(0.001); // short delay to let fill up the queue to merge the execute items if possible

        try {
          while (this.#queue.length > 0) {
            const item = this.#queue.shift();

            if (this.connector === null) {
              window.alert("Error: ConnectorNotAssigned");
              item.reject("ConnectorNotAssigned");
              continue;
            }

            switch (item.type) {
              case Query.TYPE_USERSELECT:
                this.#reconection = false;
                await this.connector
                  .userSelect(item.a, item.b) // criteria, timeout
                  .then(device => {
                    item.resolve(device);
                  })
                  .catch(error => {
                    //logging.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_AUTOSELECT:
                this.#reconection = false;
                await this.connector
                  .autoSelect(item.a, item.b, item.c) // criteria, scan_period, timeout
                  .then(device => {
                    item.resolve(device);
                  })
                  .catch(error => {
                    //logging.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_SELECTED:
                await this.connector
                  .selected()
                  .then(device => {
                    item.resolve(device);
                  })
                  .catch(error => {
                    //logging.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_UNSELECT:
                this.#reconection = false;
                await this.connector
                  .unselect()
                  .then(() => {
                    item.resolve();
                  })
                  .catch(error => {
                    //logging.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_CONNECT:
                this.#reconection = true;
                logging.verbose("TYPE_CONNECT begin");
                await this.connector
                  .connect(item.a, item.b) // a = timeout, b = supportLegacy
                  .then(device => {
                    if (!this.#connectGuard) {
                      logging.error("Connection logic error. #connected not called during successful connect()?");
                      logging.warn("Emitting #connected");
                      this.#eventEmitter.emit("#connected");
                    }

                    return this.connector
                      .getClock()
                      .then(clock => {
                        this.clock = clock;
                      })
                      .catch(e => {
                        this.clock = new TimeTrack();
                        return this.connector.setClock(this.clock);
                      })
                      .finally(() => {
                        logging.verbose("TYPE_CONNECT end");
                        item.resolve(device);
                      });
                  })
                  .catch(error => {
                    this.disconnect();
                    //logging.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_CONNECTED:
                await this.connector
                  .connected()
                  .then(device => {
                    item.resolve(device);
                  })
                  .catch(error => {
                    //logging.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_DISCONNECT:
                this.#reconection = false;
                this.#disconnectQuery = new Query();
                await this.connector
                  .request([DEVICE_FLAGS.FLAG_DEVICE_DISCONNECT_REQUEST], false)
                  .catch(() => { })
                  .then(() => {
                    return this.connector.disconnect();
                  })
                  .then(this.#disconnectQuery.promise)
                  .then(() => {
                    this.#disconnectQuery = null;
                    item.resolve();
                  })
                  .catch(error => {
                    //logging.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_DELIVER:
                await this.connector
                  .deliver(item.a)
                  .then(() => {
                    this.process(new DataView(new Uint8Array(item.a).buffer));
                    item.resolve();
                  })
                  .catch(error => {
                    //logging.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_TRANSMIT:
                await this.connector
                  .transmit(item.a)
                  .then(() => {
                    this.process(new DataView(new Uint8Array(item.a).buffer));
                    item.resolve();
                  })
                  .catch(error => {
                    //logging.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_EXECUTE:
                let payload = new Uint8Array(0xffff);
                let index = 0;

                payload.set(item.a, index);
                index += item.a.length;

                // while there are items in the queue, and the next item is also TYPE_EXECUTE
                while (this.#queue.length && this.#queue[0].type == Query.TYPE_EXECUTE) {
                  const next_item = this.#queue.shift();

                  // then check if I have toom to merge the payload bytes
                  if (index + next_item.a.length <= this.#chunkSize) {
                    payload.set(next_item.a, index);
                    index += next_item.a.length;
                  }

                  // if not, then return the item back into the queue
                  else {
                    this.#queue.unshift(next_item);
                  }
                }

                const data = payload.slice(0, index);

                await this.connector
                  .deliver(data)
                  .then(() => {
                    this.process(new DataView(data.buffer));
                    item.resolve();
                  })
                  .catch(error => {
                    //logging.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_REQUEST:
                await this.connector
                  .request(item.a, item.b)
                  .then(response => {
                    item.resolve(response);
                  })

                  .catch(error => {
                    //logging.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_SET_CLOCK:
                await this.connector
                  .setClock(item.a)
                  .then(response => {
                    item.resolve(response);
                  })
                  .catch(error => {
                    //logging.warn(error);
                    item.reject(error);
                  });
                break;

              // case Query.TYPE_GET_CLOCK:
              //   await this.connector
              //     .getClock()
              //     .then(response => {
              //       item.resolve(response);
              //     })

              //     .catch(error => {
              //       //logging.warn(error);
              //       item.reject(error);
              //     });
              //   break;

              case Query.TYPE_FIRMWARE_UPDATE:
                try {
                  await this.requestWakeLock();
                } catch { }
                await this.connector
                  .updateFW(item.a)
                  .then(response => {
                    item.resolve(response);
                  })
                  .catch(error => {
                    //logging.warn(error);
                    item.reject(error);
                  })
                  .finally(() => {
                    this.releaseWakeLock();
                  });
                break;

              case Query.TYPE_DESTROY:
                this.#reconection = false;
                await this.connector
                  .request([DEVICE_FLAGS.FLAG_DEVICE_DISCONNECT_REQUEST], false)
                  .catch(() => { })
                  .then(() => {
                    return this.connector.disconnect();
                  })
                  .then(() => {
                    return this.connector.destroy();
                  })
                  .then(() => {
                    this.connector = null;
                    item.resolve();
                  })
                  .catch(error => {
                    //logging.warn(error);
                    this.connector = null;
                    item.reject(error);
                  });
                break;

              default:
                break;
            }
          }
        } catch (e) {
          logging.error(e);
        } finally {
          this.#processing = false;
        }
      })();
    }
  }

  process(bytecode) {
    let tangleBytes = new TnglReader(bytecode);

    logging.verbose(tangleBytes);

    while (tangleBytes.available > 0) {
      switch (tangleBytes.peekFlag()) {
        case NETWORK_FLAGS.FLAG_CONF_BYTES:
          {
            logging.verbose("FLAG_CONF_BYTES");
            tangleBytes.readFlag(); // NETWORK_FLAGS.FLAG_CONF_BYTES

            const conf_size = tangleBytes.readUint32();
            //const bytecode_offset = tangleBytes.position() + offset;
            tangleBytes.foward(conf_size);

            logging.verbose(`conf_size=${conf_size}`);
            //logging.debug("bytecode_offset=%u", bytecode_offset);

            // control::feed(bytecode, bytecode_offset, conf_size);
          }
          break;

        case NETWORK_FLAGS.FLAG_TNGL_BYTES:
          {
            logging.verbose("FLAG_TNGL_BYTES");
            tangleBytes.readFlag(); // NETWORK_FLAGS.FLAG_TNGL_BYTES

            const tngl_size = tangleBytes.readUint32();
            //const bytecode_offset = tangleBytes.position() + offset;
            tangleBytes.foward(tngl_size);

            logging.verbose(`tngl_size=${tngl_size}`);
            //logging.debug("bytecode_offset=%u", bytecode_offset);

            // Runtime::feed(bytecode, bytecode_offset, tngl_size);
          }
          break;

        case NETWORK_FLAGS.FLAG_EMIT_EVENT:
        case NETWORK_FLAGS.FLAG_EMIT_TIMESTAMP_EVENT:
        case NETWORK_FLAGS.FLAG_EMIT_COLOR_EVENT:
        case NETWORK_FLAGS.FLAG_EMIT_PERCENTAGE_EVENT:
        case NETWORK_FLAGS.FLAG_EMIT_LABEL_EVENT:
        case NETWORK_FLAGS.FLAG_EMIT_LAZY_EVENT:
        case NETWORK_FLAGS.FLAG_EMIT_LAZY_TIMESTAMP_EVENT:
        case NETWORK_FLAGS.FLAG_EMIT_LAZY_COLOR_EVENT:
        case NETWORK_FLAGS.FLAG_EMIT_LAZY_PERCENTAGE_EVENT:
        case NETWORK_FLAGS.FLAG_EMIT_LAZY_LABEL_EVENT:
          {
            let is_lazy = false;
            let event_value = null;
            let event_type = "unknown";

            switch (tangleBytes.readFlag()) {
              case NETWORK_FLAGS.FLAG_EMIT_LAZY_EVENT:
                is_lazy = true;
              case NETWORK_FLAGS.FLAG_EMIT_EVENT:
                logging.verbose("FLAG_EVENT");
                event_value = null;
                event_type = "none";
                break;

              case NETWORK_FLAGS.FLAG_EMIT_LAZY_TIMESTAMP_EVENT:
                is_lazy = true;
              case NETWORK_FLAGS.FLAG_EMIT_TIMESTAMP_EVENT:
                logging.verbose("FLAG_TIMESTAMP_EVENT");
                event_value = tangleBytes.readInt32();
                event_type = "timestamp";
                break;

              case NETWORK_FLAGS.FLAG_EMIT_LAZY_COLOR_EVENT:
                is_lazy = true;
              case NETWORK_FLAGS.FLAG_EMIT_COLOR_EVENT:
                logging.verbose("FLAG_COLOR_EVENT");
                const bytes = tangleBytes.readBytes(3);
                event_value = rgbToHex(bytes[0], bytes[1], bytes[2]);
                event_type = "color";
                break;

              case NETWORK_FLAGS.FLAG_EMIT_LAZY_PERCENTAGE_EVENT:
                is_lazy = true;
              case NETWORK_FLAGS.FLAG_EMIT_PERCENTAGE_EVENT:
                logging.verbose("FLAG_PERCENTAGE_EVENT");
                event_value = Math.round(mapValue(tangleBytes.readInt32(), -2147483647, 2147483647, -100, 100) * 1000000.0) / 1000000.0;
                event_type = "percentage";
                break;

              case NETWORK_FLAGS.FLAG_EMIT_LAZY_LABEL_EVENT:
                is_lazy = true;
              case NETWORK_FLAGS.FLAG_EMIT_LABEL_EVENT:
                logging.verbose("FLAG_LABEL_EVENT");
                event_value = String.fromCharCode(...tangleBytes.readBytes(5)).match(/[\w\d_]*/g)[0];
                event_type = "label";
                break;

              default:
                // logging.error("ERROR");
                break;
            }

            logging.debug(`is_lazy = ${is_lazy ? "true" : "false"}`);
            logging.debug(`event_value = ${event_value}`);

            const event_label = String.fromCharCode(...tangleBytes.readBytes(5)).match(/[\w\d_]*/g)[0]; // 5 bytes
            logging.debug(`event_label = ${event_label}`);

            const event_timestamp = is_lazy ? -1 : tangleBytes.readInt32(); // 4 bytes
            logging.debug(`event_timestamp = ${event_timestamp} ms`);

            const event_device_id = tangleBytes.readUint8(); // 1 byte
            logging.debug(`event_device_id = ${event_device_id}`);

            if (is_lazy) {
              let event = { type: event_type, value: event_value, label: event_label, id: event_device_id };
              this.emit("event", event);
            } else {
              let event = { type: event_type, value: event_value, label: event_label, timestamp: event_timestamp, id: event_device_id };
              this.emit("event", event);
            }
          }
          break;

        case NETWORK_FLAGS.FLAG_SET_TIMELINE:
          {
            logging.verbose("FLAG_SET_TIMELINE");
            tangleBytes.readFlag(); // NETWORK_FLAGS.FLAG_SET_TIMELINE

            const PAUSED_FLAG = 1 << 4;

            // (int32_t) = clock_timestamp
            // (int32_t) = timeline_timestamp
            // (uint8_t) = timeline_flags bits: [ Reserved,Reserved,Reserved,PausedFLag,IndexBit3,IndexBit2,IndexBit1,IndexBit0]

            const clock_timestamp = tangleBytes.readInt32();
            const timeline_timestamp = tangleBytes.readInt32();
            const timeline_flags = tangleBytes.readUint8();
            logging.debug(`clock_timestamp = ${clock_timestamp} ms`);
            logging.debug(`timeline_timestamp = ${timeline_timestamp} ms`);
            logging.debug(`timeline_flags = ${timeline_flags}`);

            const timeline_paused = timeline_flags & PAUSED_FLAG ? true : false;
            logging.debug("timeline_paused = %s", timeline_paused ? "true" : "false");

            if (timeline_paused) {
              this.#deviceReference.timeline.pause();
              this.#deviceReference.timeline.setMillis(timeline_timestamp);
            } else {
              const time_delta = this.clock.millis() - clock_timestamp;
              const current_timeline_timestamp = timeline_timestamp + time_delta;

              this.#deviceReference.timeline.unpause();
              this.#deviceReference.timeline.setMillis(current_timeline_timestamp);
            }
          }
          break;

        case NETWORK_FLAGS.FLAG_RSSI_DATA:
          {
            let obj = {};

            logging.verbose("FLAG_RSSI_DATA");
            tangleBytes.readFlag(); // NETWORK_FLAGS.FLAG_RSSI_DATA

            obj.device_mac = tangleBytes
              .readBytes(6)
              .map(v => v.toString(16).padStart(2, "0"))
              .join(":");
            logging.verbose("obj.device_mac =", obj.device_mac);

            const rssi_data_items = tangleBytes.readUint32();
            obj.rssi = [];

            for (let i = 0; i < rssi_data_items; i++) {
              let item = {};
              item.mac = tangleBytes
                .readBytes(6)
                .map(v => v.toString(16).padStart(2, "0"))
                .join(":");
              item.value = tangleBytes.readInt16() / 256;
              logging.verbose("mac =", item.mac);
              logging.verbose("rssi =", item.value);
              obj.rssi.push(item);
            }

            logging.debug(obj);
            this.#eventEmitter.emit("rssi_data", obj);
          }
          break;

        case NETWORK_FLAGS.FLAG_PEER_CONNECTED:
          {
            logging.verbose("FLAG_PEER_CONNECTED");
            tangleBytes.readFlag(); // TangleFlag::FLAG_PEER_CONNECTED

            const device_mac = tangleBytes
              .readBytes(6)
              .map(v => v.toString(16).padStart(2, "0"))
              .join(":");

            this.#eventEmitter.emit("peer_connected", device_mac);
          }
          break;

        case NETWORK_FLAGS.FLAG_PEER_DISCONNECTED:
          {
            logging.verbose("FLAG_PEER_DISCONNECTED");
            tangleBytes.readFlag(); // TangleFlag::FLAG_PEER_DISCONNECTED

            const device_mac = tangleBytes
              .readBytes(6)
              .map(v => v.toString(16).padStart(2, "0"))
              .join(":");

            this.#eventEmitter.emit("peer_disconnected", device_mac);
          }
          break;

        default:
          logging.error(`ERROR flag=${tangleBytes.readFlag()}, available=${tangleBytes.available}`);
          //throw "UnknownNetworkFlag";
          break;
      }
    }
  }
}

//////////////
