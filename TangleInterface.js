import { colorToBytes, createNanoEvents, hexStringToUint8Array, labelToBytes, numberToBytes, percentageToBytes, sleep, stringToBytes, detectBluefy } from "./functions.js";
import { TangleWebBluetoothConnector } from "./TangleWebBluetoothConnector.js";
import "./TnglReader.js";
import "./TnglWriter.js";

export const DEVICE_FLAGS = Object.freeze({
  // legacy FW update flags
  FLAG_OTA_BEGIN: 255, // legacy
  FLAG_OTA_WRITE: 0, // legacy
  FLAG_OTA_END: 254, // legacy
  FLAG_OTA_RESET: 253, // legacy
  FLAG_DEVICE_REBOOT: 5, // legacy

  FLAG_CONFIG_UPDATE_REQUEST: 10,
  FLAG_CONFIG_UPDATE_RESPONSE: 11,

  FLAG_TNGL_FINGERPRINT_REQUEST: 242,
  FLAG_TNGL_FINGERPRINT_RESPONSE: 243,
  FLAG_TIMELINE_REQUEST: 245,
  FLAG_TIMELINE_RESPONSE: 246,

  FLAG_CONNECT_REQUEST: 238,
  FLAG_CONNECT_RESPONSE: 239,
  FLAG_ADOPT_REQUEST: 240,
  FLAG_ADOPT_RESPONSE: 241
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
  FLAG_EMIT_LABEL_EVENT: 253
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
class QueueItem {
  static TYPE_EXECUTE = 1;
  static TYPE_REQUEST = 2;
  static TYPE_SET_CLOCK = 3;
  static TYPE_GET_CLOCK = 4;
  static TYPE_FIRMWARE_UPDATE = 5;

  constructor(type, a = null, b = null, c = null) {
    this.type = type;
    this.a = a;
    this.b = b;
    this.c = c;
    this.promise = new Promise((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    });
  }
}

// filters out duplicate payloads and merges them together. Also decodes payloads received from the connector.
export class TangleInterface {
  #queue;
  #processing;

  #chunkSize;

  #reconection;
  #connecting;
  #selecting;

  constructor() {
    this.connector = new TangleWebBluetoothConnector();

    this.connector.addEventListener("disconnected", () => {
      this.#onDisconnected();
    });

    this.#queue = /** @type {QueueItem[]} */ ([]);
    this.#processing = false;
    this.#chunkSize = 5000;

    this.#reconection = false;
    this.#connecting = false;
    this.#selecting = false;

    window.addEventListener("beforeunload", () => {
      this.disconnect();
    });
  }

  #onDisconnected() {
    for (let i = 0; i < this.#queue.length; i++) {
      this.#queue[i].reject("Disconnected");
    }
    this.#queue = [];

    if (this.#reconection) {
      console.log("Reconnecting in 1s...");
      setTimeout(() => {
        console.log("Reconnecting device");
        return this.connect().catch(() => {
          console.log("Reconnection failed.");
        });
      }, 1000);
    }
  }

  addEventListener(event, callback) {
    return this.connector.addEventListener(event, callback);
  }

  userSelect(criteria) {
    this.#reconection = false;

    if (this.#selecting) {
      return Promise.reject("SelectingInProgress");
    }

    this.#selecting = true;

    return this.connector
      .disconnect()
      .catch(() => {})
      .then(() => {
        return this.connector.userSelect(criteria);
      })
      .finally(() => {
        this.#selecting = false;
      });
  }

  autoSelect(criteria) {
    this.#reconection = false;

    if (this.#selecting) {
      return Promise.reject("SelectingInProgress");
    }

    this.#selecting = true;

    return this.connector
      .disconnect()
      .catch(() => {})
      .then(() => {
        return this.connector.autoSelect(criteria);
      })
      .finally(() => {
        this.#selecting = false;
      });
  }

  unselect() {
    if (this.connector.connected()) {
      return Promise.reject("DeviceConnected");
    }

    if (this.#selecting) {
      return Promise.reject("SelectingInProgress");
    }

    return this.connector.unselect();
  }

  selected() {
    return this.connector.selected();
  }

  connect(attempts) {
    this.#reconection = true;

    if (this.connector.connected()) {
      return Promise.resolve();
    }

    if (this.#connecting) {
      return Promise.reject("ConnectingInProgress");
    }

    this.#connecting = true;

    if (!this.connector.selected()) {
      return Promise.reject("NoDeviceSelected");
    }

    return this.connector.connect(attempts).finally(() => {
      this.#connecting = false;
    });
  }

  disconnect() {
    this.#reconection = false;

    if (this.connector.selected() && this.connector.connected()) {
      return this.connector.disconnect();
    }
    return Promise.resolve();
  }

  connected() {
    return this.connector.connected();
  }

  execute(bytes, bytes_label) {
    const item = new QueueItem(QueueItem.TYPE_EXECUTE, bytes, bytes_label);

    // there must only by one item in the queue with given label
    // this is used to send only the most recent item.
    // for example events
    // so if there is a item with that label, then remove it and
    // push this item to the end of the queue
    if (item.b) {
      for (let i = 0; i < this.#queue.length; i++) {
        if (this.#queue[i].type === QueueItem.TYPE_EXECUTE && this.#queue[i].b === item.b) {
          this.#queue[i].resolve();
          this.#queue.splice(i, 1);
          break;
        }
      }
    }

    this.#queue.push(item);
    this.#process();

    return item.promise;
  }

  request(bytes, read_response) {
    const item = new QueueItem(QueueItem.TYPE_REQUEST, bytes, read_response);

    this.#queue.push(item);
    this.#process();

    return item.promise;
  }

  setClock(clock) {
    const item = new QueueItem(QueueItem.TYPE_SET_CLOCK, clock);

    for (let i = 0; i < this.#queue.length; i++) {
      if (this.#queue[i].type === QueueItem.TYPE_SET_CLOCK) {
        this.#queue[i].reject("Multiple Clock writes");
        this.#queue.splice(i, 1);
        break;
      }
    }

    this.#queue.push(item);
    this.#process();

    return item.promise;
  }

  getClock() {
    const item = new QueueItem(QueueItem.TYPE_GET_CLOCK);

    for (let i = 0; i < this.#queue.length; i++) {
      if (this.#queue[i].type === QueueItem.TYPE_GET_CLOCK) {
        this.#queue[i].reject("Multiple Clock Requests");
        this.#queue.splice(i, 1);
        break;
      }
    }

    this.#queue.push(item);
    this.#process();

    return item.promise;
  }

  updateFW(firmware_bytes) {
    const item = new QueueItem(QueueItem.TYPE_FIRMWARE_UPDATE, firmware_bytes);

    for (let i = 0; i < this.#queue.length; i++) {
      if (this.#queue[i].type === QueueItem.TYPE_FIRMWARE_UPDATE) {
        this.#queue[i].reject("Multiple FW Updates");
        this.#queue.splice(i, 1);
        break;
      }
    }

    this.#queue.push(item);
    this.#process();

    return item.promise;
  }

  // starts a "thread" that is processing the commands from queue
  #process() {
    if (!this.#processing) {
      this.#processing = true;
     
      // spawn async function to handle the transmittion one item at the time
      (async () => {
        await sleep(0.001); // short delay to let fill up the queue to merge the execure items if possible

        try {
          while (this.#queue.length > 0) {
            const item = this.#queue.shift();

            switch (item.type) {
              case QueueItem.TYPE_EXECUTE:
                let payload = new Uint8Array(this.#chunkSize);
                let index = 0;

                payload.set(item.a, index);
                index += item.a.length;

                // while there are items in the queue, and the next item is also TYPE_EXECUTE
                while (this.#queue.length && this.#queue[0].type == QueueItem.TYPE_EXECUTE) {
                  const next_item = this.#queue.shift();

                  // then check if I have toom to merge the payload bytes
                  if (index + next_item.a.length <= payload.length) {
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

              case QueueItem.TYPE_REQUEST:
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

              case QueueItem.TYPE_SET_CLOCK:
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

              case QueueItem.TYPE_GET_CLOCK:
                await this.connector
                  .getClock()
                  .then(response => {
                    item.resolve(response);
                  })

                  .catch(error => {
                    //console.warn(error);
                    item.reject(error);
                  });
                break;

              case QueueItem.TYPE_FIRMWARE_UPDATE:
                await this.connector
                  .updateFW(item.a)
                  .then(response => {
                    item.resolve(response);
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
