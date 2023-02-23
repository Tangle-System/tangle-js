import { logging } from "./Logging.js";
import {
  sleep,
  stringToBytes,
  toBytes,
  getClockTimestamp,
} from "./functions.js";
import { TimeTrack } from "./TimeTrack.js";
import { io } from "./lib/socketio.js";
import { nanoid } from "nanoid";

// const WEBSOCKET_URL = "https://tangle-remote-control.glitch.me/"
export const WEBSOCKET_URL = "https://ws.host.spectoda.com/";
/////////////////////////////////////////////////////////////////////////////////////

export class TangleWebSocketsConnector {
  #interfaceReference;
  #selected;
  #connected;
  #promise;

  constructor(interfaceReference) {
    this.type = "websockets";

    this.#interfaceReference = interfaceReference;

    this.#selected = false;
    this.#connected = false;
    this.socket = null;
    this.#promise = null;
  }

  userSelect(criteria) {
    this.#selected = true;
    return Promise.resolve({ connector: this.type });
  }

  autoSelect(criteria, scan_period = 1000, timeout = 3000) {
    this.#selected = true;
    return Promise.resolve({ connector: this.type });
  }

  selected() {
    return Promise.resolve(this.#selected ? { connector: this.type } : null);
  }

  unselect() {
    this.#selected = false;
    return Promise.resolve();
  }

  connect(timeout) {
    if (this.#selected) {
      if (!this.#connected) {
        this.#connected = true;

        if (!this.socket) {
          this.socket = io(WEBSOCKET_URL, { transports: ["websocket"] });
          window.wssocket = this.socket;

          logging.debug(this.socket);

          this.socket.on("connect", (socket) => {
            logging.debug("connected");

            logging.debug("> Connected to remote control");

            // socket.join("sans-souci");

            this.#interfaceReference.emit("#connected");
          });

          this.socket.on("disconnect", () => {
            logging.debug("> Disconnected from remote control");

            this.#connected = false;

            this.#interfaceReference.emit("#disconnected");
          });

          this.socket.on("connect_error", (error) => {
            logging.debug("connect_error", error);
            setTimeout(() => {
              this.socket.connect();
            }, 1000);
          });
        } else {
          this.socket.connect();
        }
      }

      return Promise.resolve({ connector: this.type });
    } else {
      return Promise.reject("NotSelected");
    }
  }

  connected() {
    return Promise.resolve(this.#connected ? { connector: this.type } : null);
  }

  disconnect() {
    if (this.#selected) {
      if (this.#connected) {
        this.#connected = false;
        this.socket.disconnect();
      }
      return Promise.resolve();
    } else {
      return Promise.reject("NotSelected");
    }
  }

  deliver(payload) {
    if (this.#connected) {
      const reqId = nanoid();
      // console.log("Emit deliver", reqId, payload);

      this.socket.emit("deliver", reqId, payload);
      const socket = this.socket;
      this.#promise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => rejectFunc(reqId, "timeout"), 5000);

        function resolveFunc(reqId, response) {
          if (reqId === reqId) {
            resolve(response);
            socket.off("response_error", rejectFunc);
            clearTimeout(timeout);
          }
        }

        function rejectFunc(reqId, error) {
          if (reqId === reqId) {
            reject(error);
            socket.off("response_success", resolveFunc);
            clearTimeout(timeout);
          }
        }

        this.socket.once("response_success", resolveFunc);
        this.socket.once("response_error", rejectFunc);
      });

      return this.#promise;
    } else {
      return Promise.reject("Disconnected");
    }
  }

  transmit(payload) {
    if (this.#connected) {
      const reqId = nanoid();

      // console.log("Emit transmit", reqId, payload);

      this.socket.emit("transmit", reqId, payload);
      const socket = this.socket;

      this.#promise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => rejectFunc(reqId, "timeout"), 5000);

        function resolveFunc(reqId, response) {
          if (reqId === reqId) {
            resolve(response);
            socket.off("response_error", rejectFunc);
            clearTimeout(timeout);
          }
        }

        function rejectFunc(reqId, error) {
          if (reqId === reqId) {
            reject(error);
            socket.off("response_success", resolveFunc);
            clearTimeout(timeout);
          }
        }

        this.socket.once("response_success", resolveFunc);
        this.socket.once("response_error", rejectFunc);
      });

      return this.#promise;
    } else {
      return Promise.reject("Disconnected");
    }
  }

  request(payload, read_response = true) {
    if (this.#connected) {
      const reqId = nanoid();
      // console.log("Emit request", reqId, payload, read_response);

      this.socket.emit("request", reqId, payload, read_response);
      const socket = this.socket;

      this.#promise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => rejectFunc(reqId, "timeout"), 5000);

        function resolveFunc(reqId, response) {
          // console.log(reqId, new DataView(new Uint8Array(response).buffer));

          if (reqId === reqId) {
            resolve(new DataView(new Uint8Array(response).buffer));
            socket.off("response_error", rejectFunc);
            clearTimeout(timeout);
          }
        }

        function rejectFunc(reqId, error) {
          // console.log(reqId, "Failed", error);

          if (reqId === reqId) {
            reject(error);
            socket.off("response_success", resolveFunc);
            clearTimeout(timeout);
          }
        }

        // TODO optimize this to kill the socket if the request is not received and destroy also the second socket
        this.socket.once("response_success", resolveFunc);
        this.socket.once("response_error", rejectFunc);
        // todo kill sockets on receive
      });

      return this.#promise;
    } else {
      return Promise.reject("Disconnected");
    }
  }

  setClock(clock) {
    // if (this.#connected) {

    //   //const message = JSON.stringify({ clock_timestamp: clock.millis(), utc_timestamp: new Date().getTime() });
    //   const payload = new Uint8Array([ ...toBytes(clock.millis(), 4), ...toBytes(new Date().getTime(), 4) ]);

    //   this.socket.emit("setClock", payload);
    //   return Promise.resolve();
    // } else {
    //   return Promise.reject("Disconnected");
    // }

    return Promise.reject("Not Supported");
  }

  getClock() {
    // if (this.#connected) {
    //   let clock = new TimeTrack(0);

    //   //const message = JSON.stringify({ clock_timestamp: clock.millis(), utc_timestamp: new Date().getTime() });
    //   const payload = new Uint8Array([ ...toBytes(clock.millis(), 4), ...toBytes(new Date().getTime(), 4) ]);

    //   this.socket.emit("setClock", payload);
    //   return Promise.resolve(clock);
    // } else {
    //   return Promise.reject("Disconnected");
    // }

    // ============= CLOCK HACK ==============

    if (this.#connected) {
      return Promise.resolve(new TimeTrack(0));
    } else {
      return Promise.reject("Disconnected");
    }
  }

  updateFW(firmware) {
    // return new Promise(async (resolve, reject) => {
    //   if (!this.#connected) {
    //     reject("Disconnected");
    //     return;
    //   }

    //   this.#interfaceReference.emit("ota_status", "begin");

    //   await sleep(1000);

    //   for (let percentage = 1; percentage <= 100; percentage++) {
    //     this.#interfaceReference.emit("ota_progress", percentage);

    //     await sleep(50);

    //     if (!this.#connected) {
    //       this.#interfaceReference.emit("ota_status", "fail");
    //       reject("Connection Failure");
    //       return;
    //     }

    //     if (Math.random() <= 0.01) {
    //       this.#interfaceReference.emit("ota_status", "fail");
    //       reject("Simulated Failure");
    //       return;
    //     }
    //   }

    //   await sleep(1000);

    //   this.#interfaceReference.emit("ota_status", "success");

    //   resolve();
    //   return;
    // });

    return Promise.reject("Not supported");
  }

  destroy() {
    return this.disconnect()
      .catch(() => {})
      .then(() => {
        return this.unselect();
      })
      .catch(() => {});
  }
}
