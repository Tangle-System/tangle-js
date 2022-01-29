import { sleep } from "./functions.js";
import { TimeTrack } from "./TimeTrack.js";

/////////////////////////////////////////////////////////////////////////////////////


export class TangleChandelierConnector {
  #interfaceReference;
  #selected;
  #connected;

  constructor(interfaceReference) {
    this.#interfaceReference = interfaceReference;

    this.#selected = false;
    this.#connected = false;
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
    return Promise.resolve(this.#selected ? { fwVersion: "unknown" } : null);
  }

  unselect() {
    this.#selected = false;
    return Promise.resolve();
  }

  connect(timeout) {
    if (this.#selected) {
      this.#connected = true;
      this.#interfaceReference.emit("#connected");
      return Promise.resolve();
    } else {
      return Promise.reject("NotSelected");
    }
  }

  connected() {
    return Promise.resolve(this.#connected);
  }

  disconnect() {
    if (this.#selected) {
      this.#connected = false;
      this.#interfaceReference.emit("#disconnected");
      return Promise.resolve();
    } else {
      return Promise.reject("NotSelected");
    }
  }

  deliver(payload) {
    if (this.#connected) {
      return Promise.resolve();
    } else {
      return Promise.reject("Disconnected");
    }
  }

  transmit(payload) {
    if (this.#connected) {
      return Promise.resolve();
    } else {
      return Promise.reject("Disconnected");
    }
  }

  request(payload, read_response = true) {
    if (this.#connected) {
      return Promise.resolve([]);
    } else {
      return Promise.reject("Disconnected");
    }
  }

  setClock(clock) {
    if (this.#connected) {
      return Promise.resolve();
    } else {
      return Promise.reject("Disconnected");
    }
  }

  getClock() {
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
