import { colorToBytes, createNanoEvents, hexStringToUint8Array, labelToBytes, numberToBytes, percentageToBytes, sleep, stringToBytes, detectBluefy, noSleep, detectTangleConnect } from "./functions.js";
import { TangleDummyConnector } from "./TangleDummyConnector.js";
import { TangleWebBluetoothConnector } from "./TangleWebBluetoothConnector.js";
import { TangleWebSerialConnector } from "./TangleWebSerialConnector.js";
import { TangleConnectConnector } from "./TangleConnectConnector.js";
import { TangleWebSocketsConnector } from "./TangleWebSocketsConnector.js";
import { TimeTrack } from "./TimeTrack.js";
import "./TnglReader.js";
import "./TnglWriter.js";

export const DEVICE_FLAGS = Object.freeze({
  // legacy FW update flags
  FLAG_OTA_BEGIN: 255, // legacy
  FLAG_OTA_WRITE: 0, // legacy
  FLAG_OTA_END: 254, // legacy
  FLAG_OTA_RESET: 253, // legacy
  FLAG_DEVICE_REBOOT_REQUEST: 5, // legacy

  FLAG_CONFIG_UPDATE_REQUEST: 10,
  FLAG_CONFIG_UPDATE_RESPONSE: 11,

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
  #connecting;
  #selecting;
  #disconnectQuery;

  #reconnectionInterval;

  constructor(deviceReference, reconnectionInterval = 1000) {
    this.#deviceReference = deviceReference;

    this.clock = new TimeTrack();

    this.connector = /** @type {TangleDummyConnector | TangleWebBluetoothConnector | TangleWebSerialConnector | TangleConnectConnector | TangleWebSocketsConnector} */ (new TangleDummyConnector(this));

    this.#eventEmitter = createNanoEvents();
    this.#wakeLock = null;

    this.#queue = /** @type {Query[]} */ ([]);
    this.#processing = false;
    this.#chunkSize = 5000;

    this.#reconection = false;
    this.#connecting = false;
    this.#selecting = false;
    this.#disconnectQuery = null;

    this.#reconnectionInterval = reconnectionInterval;

    this.#eventEmitter.on("#disconnected", e => {
      this.#onDisconnected(e);
    });

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

      this.#reconection = false;
      this.connector.destroy(); // dodelat .destroy() v tangleConnectConnectoru
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
    console.log("> Activating wakeLock...");

    return noSleep.enable();
  }

  releaseWakeLock() {
    console.log("> Deactivating wakeLock...");

    noSleep.disable();

    return Promise.resolve();
  }

  assignConnector(connector_type) {
    console.log("> Assigning connector...");

    if (this.connector.type === connector_type) {
      console.warn("Trying to reassign current connector.");
      return Promise.resolve();
    }

    return this.#destroy().then(() => {
      switch (connector_type) {
        
        case "default":
          if (detectTangleConnect()) {
            this.connector = new TangleConnectConnector(this);
          } else if (navigator.bluetooth) {
            this.connector = new TangleWebBluetoothConnector(this);
          } else if (navigator.serial) {
            this.connector = new TangleWebSerialConnector(this);
          } else {
            this.connector = new TangleDummyConnector(this);
          }
          break;

        case "dummy":
          this.connector = new TangleDummyConnector(this, false);
          break;

        case "edummy":
          this.connector = new TangleDummyConnector(this, true);
          break;

        case "webbluetooth":
          this.connector = new TangleWebBluetoothConnector(this);
          break;

        case "webserial":
          this.connector = new TangleWebSerialConnector(this);
          break;

        case "tangleconnect":
          this.connector = new TangleConnectConnector(this);
          break;

        case "websockets":
          this.connector = new TangleWebSocketsConnector(this);
          break;

        default:
          throw "UnknownConnector";
          break;
      }
    });
  }

  reconnection(enable) {
    this.#reconection = enable;
  }

  userSelect(criteria, timeout = 60000) {
    // this.#reconection = false;

    if (timeout < 1000) {
      console.error("Timeout is too short.");
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
      console.error("Timeout is too short.");
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

  connect(timeout = 10000) {
    if (timeout < 1000) {
      console.error("Timeout is too short.");
      return Promise.reject("InvalidTimeout");
    }

    if (this.#connecting) {
      return Promise.reject("ConnectingInProgress");
    }

    this.#connecting = true;

    const item = new Query(Query.TYPE_CONNECT, timeout);
    this.#process(item);
    return item.promise.finally(() => {
      this.#connecting = false;
    });

    //========================================

    // this.#reconection = true;

    // if (timeout < 1000) {
    //   console.error("Timeout is too short.");
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

  disconnect() {
    this.#reconection = false;

    const item = new Query(Query.TYPE_DISCONNECT);
    this.#process(item);
    return item.promise;

    //========================================

    // this.#reconection = false;

    // if (!this.#processing || force) {
    //   return this.connector.disconnect();
    // } else {
    //   return Promise.reject("CommunicationInProgress");
    // }
  }

  #onDisconnected = event => {
    // for (let i = 0; i < this.#queue.length; i++) {
    //   this.#queue[i].reject("Disconnected");
    // }
    // this.#queue = [];

    if (this.#reconection && this.#reconnectionInterval) {
      console.log("Reconnecting...");
      setTimeout(() => {
        console.log("Reconnecting device");
        return this.connect(this.#reconnectionInterval).catch(() => {
          console.warn("Reconnection failed.");
        });
      }, 1000);
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

  #destroy() {
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

            switch (item.type) {
              case Query.TYPE_USERSELECT:
                this.#reconection = false;
                await this.connector
                  .userSelect(item.a, item.b) // criteria, timeout
                  .then(device => {
                    item.resolve(device);
                  })
                  .catch(error => {
                    //console.warn(error);
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
                    //console.warn(error);
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
                    //console.warn(error);
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
                    //console.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_CONNECT:
                this.#reconection = true;
                await this.connector
                  .connect(item.a) // a = timeout
                  .then(device => {
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
                        item.resolve(device);
                      });
                  })
                  .catch(error => {
                    this.disconnect();
                    //console.warn(error);
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
                    //console.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_DISCONNECT:
                this.#reconection = false;
                this.#disconnectQuery = new Query();
                await this.connector
                  .disconnect()
                  .then(this.#disconnectQuery.promise)
                  .then(() => {
                    this.#disconnectQuery = null;
                    item.resolve();
                  })
                  .catch(error => {
                    //console.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_DELIVER:
                await this.connector
                  .deliver(item.a)
                  .then(() => {
                    item.resolve();
                  })
                  .catch(error => {
                    //console.warn(error);
                    item.reject(error);
                  });
                break;

              case Query.TYPE_TRANSMIT:
                await this.connector
                  .transmit(item.a)
                  .then(() => {
                    item.resolve();
                  })
                  .catch(error => {
                    //console.warn(error);
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

                await this.connector
                  .deliver(payload.slice(0, index))
                  .then(() => {
                    item.resolve();
                  })
                  .catch(error => {
                    //console.warn(error);
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
                    //console.warn(error);
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
                    //console.warn(error);
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
              //       //console.warn(error);
              //       item.reject(error);
              //     });
              //   break;

              case Query.TYPE_FIRMWARE_UPDATE:
                await this.requestWakeLock();
                await this.connector
                  .updateFW(item.a)
                  .then(response => {
                    item.resolve(response);
                  })
                  .catch(error => {
                    //console.warn(error);
                    item.reject(error);
                  })
                  .finally(() => {
                    this.releaseWakeLock();
                  });

                break;

              case Query.TYPE_DESTROY:
                this.#reconection = false;
                await this.connector
                  .destroy()
                  .then(device => {
                    item.resolve(device);
                  })
                  .catch(error => {
                    //console.warn(error);
                    item.reject(error);
                  });

                break;

              default:
                break;
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          this.#processing = false;
        }
      })();
    }
  }
}

//////////////
