import { sleep, stringToBytes, toBytes, getClockTimestamp } from "./functions.js";
import { TimeTrack } from "./TimeTrack.js";

import { io } from "./socketio.js";

/////////////////////////////////////////////////////////////////////////////////////

export class TangleWebSocketsConnector {
  #interfaceReference;
  #selected;
  #connected;

  constructor(interfaceReference) {
    this.#interfaceReference = interfaceReference;

    this.#selected = false;
    this.#connected = false;
    this.socket = null;
  }

  userSelect(criteria) {
    this.#selected = true;
    return Promise.resolve();
  }

  autoSelect(criteria, scan_period = 1000, timeout = 3000) {
    this.#selected = true;
    return Promise.resolve();
  }

  selected() {
    return Promise.resolve(this.#selected ? { connector: "websockets" } : null);
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
          this.socket = io("https://tangle-remote-control.glitch.me/", { transports: ['websocket'] });

          console.log(this.socket);

          this.socket.on("connect", socket => {
            console.log("connected");

            console.log("> Connected to remote control");

            // socket.join("sans-souci");

            this.#interfaceReference.emit("#connected");
          });

          this.socket.on("disconnect", () => {
            console.log("> Disconnected from remote control");

            this.#connected = false;

            this.#interfaceReference.emit("#disconnected");
          });

          this.socket.on("connect_error", (error) => {
            console.log('connect_error',error)
            setTimeout(() => {
              this.socket.connect();
            }, 1000);
          });

        } else {
          this.socket.connect();
        }
      }

      return Promise.resolve();
    } else {
      return Promise.reject("NotSelected");
    }
  }

  connected() {
    return Promise.resolve(this.#connected ? { connector: "websockets" } : null);
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
      this.socket.emit("deliver", payload);
      return sleep(100).then(() => {
        Promise.resolve();
      });
    } else {
      return Promise.reject("Disconnected");
    }
  }

  transmit(payload) {
    if (this.#connected) {
      this.socket.emit("transmit", payload);
      return sleep(100).then(() => {
        Promise.resolve();
      });
    } else {
      return Promise.reject("Disconnected");
    }
  }

  request(payload, read_response = true) {
    if (this.#connected) {
      this.socket.emit("request", payload);
      return Promise.resolve([]);
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
