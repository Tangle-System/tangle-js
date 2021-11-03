import { toBytes, sleep, detectAndroid } from "./functions.js";
import { tangleEvents } from './initialize.js'

//////////////////////////////////////////////////////////////////////////

const FLAG_OTA_BEGIN = 255;
const FLAG_OTA_WRITE = 0;
const FLAG_OTA_END = 254;
const FLAG_OTA_RESET = 253;

const FLAG_CONFIG_BEGIN = 1;
const FLAG_CONFIG_WRITE = 2;
const FLAG_CONFIG_END = 3;
const FLAG_CONFIG_RESET = 4;
const FLAG_REBOOT = 5;
const FLAG_RESTART = 6;
const FLAG_ABORT = 7;

function Transmitter() {
  this.TERMINAL_CHAR_UUID = "33a0937e-0c61-41ea-b770-007ade2c79fa";
  this.SYNC_CHAR_UUID = "bec2539d-4535-48da-8e2f-3caa88813f55";
  this.UPDATE_CHAR_UUID = "9ebe2e4b-10c7-4a81-ac83-49540d1135a5";

  this._service = null;
  this._terminalChar = null;
  this._syncChar = null;
  this._updateChar = null;
  this._writing = false;
  this._queue = [];
}

Transmitter.prototype.attach = function (service) {
  this._service = service;

  return this._service
    .getCharacteristic(this.TERMINAL_CHAR_UUID)
    .catch((e) => {
      console.warn(e);
    })
    .then((characteristic) => {
      this._terminalChar = characteristic;
      return this._service.getCharacteristic(this.SYNC_CHAR_UUID);
    })
    .catch((e) => {
      console.warn(e);
    })
    .then((characteristic) => {
      this._syncChar = characteristic;
      return this._service.getCharacteristic(this.UPDATE_CHAR_UUID);
    })
    .catch((e) => {
      console.warn(e);
    })
    .then((characteristic) => {
      this._updateChar = characteristic;
      this.deliver(); // kick off transfering thread if there are item in queue
    })
    .catch((e) => {
      console.warn(e);
    });
};

// deliver() thansfers data reliably to the Bluetooth Device. It might not be instant.
// It may even take ages to get to the device, but it will! (in theory)
Transmitter.prototype.deliver = function (data) {
  //console.log("deliver()");

  if (data) {
    this._queue.push({ payload: data, reliable: true });
  }

  if (!this._writing) {
    this._writing = true;

    // spawn async function to handle the transmittion one payload at the time
    (async () => {
      while (this._queue.length > 0) {
        //let timestamp = Date.now();

        let item = this._queue.shift();

        try {
          await this._writeBytes(this._terminalChar, item.payload, item.reliable);
        } catch (error) {
          console.warn(error);

          // if writing characteristic fail, then stop transmitting
          // but keep data to transmit in queue
          if (item.reliable) this._queue.unshift(item);
          this._writing = false;

          return;
        }

        //let duration = Date.now() - timestamp;
        //console.log("Wrote " + item.payload.length + " bytes in " + duration + " ms (" + item.payload.length / (duration / 1000) / 1024 + " kBps)");
      }
      this._writing = false;
    })();
  }
};

// transmit() tryes to transmit data NOW. ASAP. It will fail,
// if deliver or another transmit is being executed at the moment
// returns true if transmittion (only transmittion, not receive) was successful
Transmitter.prototype.transmit = function (data) {
  //console.log("transmit()");

  if (!data) {
    return true;
  }

  if (!this._writing) {
    // insert data as first item in sending queue
    this._queue.unshift({ payload: data, reliable: false });
    // and deliver the data to device
    this.deliver();
    return true;
  } else {
    return false;
  }
};

Transmitter.prototype._writeSync = async function (timestamp) {
  return new Promise(async (resolve, reject) => {
    let success = true;

    try {
      const bytes = [...toBytes(timestamp, 4)];
      await this._syncChar.writeValueWithoutResponse(new Uint8Array(bytes)).catch((e) => {
        console.warn(e);
        success = false;
      });
      await this._syncChar.writeValueWithoutResponse(new Uint8Array([])).catch((e) => {
        console.warn(e);
        success = false;
      });

      if (success) {
        resolve();
        return;
      } else {
        reject();
        return;
      }
    } catch (e) {
      console.error(e);
      reject();
      return;
    }
  });
};

// sync() synchronizes the device clock
Transmitter.prototype.sync = async function (timestamp) {
  //console.log("sync(" + timestamp +")");

  if (!this._syncChar) {
    log.warn("Sync characteristics is Null");
    return false;
  }

  if (!this._writing) {
    this._writing = true;

    let success = true;

    await this._writeSync(timestamp).catch((e) => {
      console.warn(e);
      success = false;
    });

    this._writing = false;

    return success;
  } else {
    return false;
  }
};

Transmitter.prototype._writeFirmware = function (firmware) {
  return new Promise(async (resolve, reject) => {
    const data_size = detectAndroid() ? 1000 : 4992;

    let index_from = 0;
    let index_to = data_size;

    let written = 0;

    console.log("OTA UPDATE");

    console.log(firmware);

    {
      //===========// RESET //===========//
      console.log("OTA RESET");

      const bytes = [FLAG_OTA_RESET, 0x00, ...toBytes(0x00000000, 4)];
      await this._writeBytes(this._updateChar, bytes, true).catch((e) => {
        console.error(e);
        reject(e);
        return;
      });
    }

    await sleep(100);

    {
      //===========// BEGIN //===========//
      console.log("OTA BEGIN");

      const bytes = [FLAG_OTA_BEGIN, 0x00, ...toBytes(firmware.length, 4)];
      await this._writeBytes(this._updateChar, bytes, true).catch((e) => {
        console.error(e);
        reject(e);
        return;
      });
    }

    await sleep(10000);

    {
      //===========// WRITE //===========//
      console.log("OTA WRITE");

      const start_timestamp = new Date().getTime();

      while (written < firmware.length) {
        if (index_to > firmware.length) {
          index_to = firmware.length;
        }

        const bytes = [FLAG_OTA_WRITE, 0x00, ...toBytes(written, 4), ...firmware.slice(index_from, index_to)];

        await this._writeBytes(this._updateChar, bytes, true).catch((e) => {
          console.error(e);
          reject(e);
          return;
        });

        written += index_to - index_from;

        console.log(Math.floor((written * 10000) / firmware.length) / 100 + "%");

        index_from += data_size;
        index_to = index_from + data_size;
      }

      console.log("Firmware written in " + (new Date().getTime() - start_timestamp) / 1000 + " seconds");
    }

    await sleep(100);

    {
      //===========// END //===========//
      console.log("OTA END");

      const bytes = [FLAG_OTA_END, 0x00, ...toBytes(written, 4)];
      await this._writeBytes(this._updateChar, bytes, true).catch((e) => {
        console.error(e);
        reject(e);
        return;
      });
    }

    resolve();
    return;
  });
};

Transmitter.prototype._writeConfig = function (config) {
  return new Promise(async (resolve, reject) => {

    let written = 0;

    console.log("CONFIG UPDATE");
    console.log(config);

    {
      //===========// RESET //===========//
      console.log("CONFIG RESET");

      const bytes = [FLAG_CONFIG_RESET, 0x00, ...toBytes(0x00000000, 4)];
      await this._writeBytes(this._updateChar, bytes, true).catch((e) => {
        console.error(e);
        reject(e);
        return;
      });
    }

    await sleep(100);

    {
      //===========// BEGIN //===========//
      console.log("CONFIG BEGIN");

      const bytes = [FLAG_CONFIG_BEGIN, 0x00, ...toBytes(config.length, 4)];
      await this._writeBytes(this._updateChar, bytes, true).catch((e) => {
        console.error(e);
        reject(e);
        return;
      });
    }

    await sleep(100);

    const start_timestamp = new Date().getTime();

    {
      //===========// WRITE //===========//
      console.log("CONFIG WRITE");

      const bytes = [FLAG_CONFIG_WRITE, 0x00, ...toBytes(written, 4), ...config];
      await this._writeBytes(this._updateChar, bytes, true).catch((e) => {
        console.error(e);
        reject(e);
        return;
      });

      written += config.length;
    }

    const end_timestamp = new Date().getTime();

    console.log("Config written in " + (end_timestamp - start_timestamp) / 1000 + " seconds");

    await sleep(100);

    {
      //===========// END //===========//
      console.log("CONFIG END");

      const bytes = [FLAG_CONFIG_END, 0x00, ...toBytes(written, 4)];
      await this._writeBytes(this._updateChar, bytes, true).catch((e) => {
        console.error(e);
        reject(e);
        return;
      });
    }

    resolve();
    return;
  });
};

// sync() synchronizes the device clock
Transmitter.prototype.updateFirmware = async function (firmware) {
  if (this._writing) {
    console.error("Write currently in progress");
    return false;
  }

  this._writing = true;

  let success = true;

  await this._writeFirmware(firmware).catch((e) => {
    console.error(e);
    success = false;
  });

  this._writing = false;

  return success;
};

// sync() synchronizes the device clock
Transmitter.prototype.updateConfig = async function (config) {
  if (this._writing) {
    console.error("Write currently in progress");
    return false;
  }

  this._writing = true;

  let success = true;

  await this._writeConfig(config).catch((e) => {
    console.error(e);
    success = false;
  });

  this._writing = false;

  return success;
};

// sync() synchronizes the device clock
Transmitter.prototype.deviceReboot = function () {
  const bytes = [FLAG_REBOOT, 0x00, ...toBytes(0x00000000, 4)];
  return this._writeBytes(this._updateChar, bytes, true);
};

// resets the transmitter, leaving send queue intact
Transmitter.prototype.reset = function (clear_queue = false) {
  this._service = null;
  this._terminalChar = null;
  this._syncChar = null;
  this._updateChar = null;
  this._writing = false;
  if (clear_queue) {
    this._queue = [];
  }
};

/////////////////////////////////////////////////////////////////////////////////////

// Tangle Bluetooth Device

export default function TangleBluetoothConnection() {
  this.TRANSMITTER_SERVICE_UUID = "60cb125a-0000-0007-0002-5ad20c574c10";

  this.BLE_OPTIONS = {
    //acceptAllDevices: true,
    filters: [
      { services: [this.TRANSMITTER_SERVICE_UUID] },

      // {services: ['c48e6067-5295-48d3-8d5c-0395f61792b1']},
      // {name: 'ExampleName'},
    ],
    //optionalServices: [this.TRANSMITTER_SERVICE_UUID],
  };

  this.bluetoothDevice = null;
  this.transmitter = null;
  this.eventEmitter = tangleEvents;
}

TangleBluetoothConnection.prototype.connected = false;

/**
 * @name TangleBluetoothConnection.prototype.addEventListener
 * events: "connected", "disconnected"
 *
 * all events: event.target === the sender object (this)
 * event "disconnected": event.reason has a string with a disconnect reason
 *
 * @returns unbind function
 */
TangleBluetoothConnection.prototype.addEventListener = function (event, callback) {
  return this.eventEmitter.on(event, callback);
};

TangleBluetoothConnection.prototype.scan = function () {
  //console.log("scan()");

  if (this.bluetoothDevice) {
    this.disconnect();
  }

  return navigator.bluetooth.requestDevice(this.BLE_OPTIONS).then((device) => {
    this.bluetoothDevice = device;
    this.bluetoothDevice.connection = this;
    this.bluetoothDevice.addEventListener("gattserverdisconnected", this.onDisconnected);
  });
};

TangleBluetoothConnection.prototype.connect = function () {
  //console.log("connect()");

  if (this.bluetoothDevice.gatt.connected) {
    console.log("> Bluetooth Device is already connected");
    this.connected = true;
    return Promise.resolve();
  }

  console.log("> Connecting to Bluetooth device...");
  return this.bluetoothDevice.gatt
    .connect()
    .then((server) => {
      if (!this.transmitter) {
        this.transmitter = new Transmitter();
      } else {
        this.transmitter.reset();
      }

      console.log("> Getting the Bluetooth Service...");
      return server.getPrimaryService(this.TRANSMITTER_SERVICE_UUID);
    })
    .then((service) => {
      console.log("> Getting the Service Characteristic...");

      return this.transmitter.attach(service);
    })
    .then(() => {
      console.log("> Connected");
      this.connected = true;
      {
        let event = {};
        event.target = this;
        this.eventEmitter.emit("connected", event);
      }
    })
    .catch((error) => {
      console.warn(error.name);

      // If the device is far away, sometimes this "NetworkError" happends
      if (error.name == "NetworkError") {
        return sleep(1000).then(() => {
          return this.reconnect();
        });
      } else {
        throw error;
      }
    });
};

TangleBluetoothConnection.prototype.reconnect = function () {
  //console.log("reconnect()");

  if (this.connected && this.bluetoothDevice.gatt.connected) {
    console.log("> Bluetooth Device is already connected");
    return Promise.resolve();
  }
  console.log("> Reconnecting Bluetooth device...");
  return this.connect();
};

TangleBluetoothConnection.prototype.disconnect = function () {
  //console.log("disconnect()");

  if (!this.bluetoothDevice) {
    //console.warn("No bluetoothDevice")
    return;
  }

  console.log("> Disconnecting from Bluetooth Device...");

  // wanted disconnect removes the transmitter
  this.transmitter = null;
  this.connected = false;

  if (this.bluetoothDevice.gatt.connected) {
    this.bluetoothDevice.gatt.disconnect();
  } else {
    console.log("> Bluetooth Device is already disconnected");
  }
};

// Object event.target is Bluetooth Device getting disconnected.
TangleBluetoothConnection.prototype.onDisconnected = function (e) {
  //console.log("> Bluetooth Device disconnected");

  let self = e.target.connection;

  {
    let event = {};
    event.target = self;
    self.eventEmitter.emit("disconnected", event);
  }

  self.connected = false;
};

///////////////////////////////// 0.7.0 /////////////////////////////////

Transmitter.prototype._writeBytes = function (characteristic, bytes, response) {
  const write_uuid = parseInt(Math.random() * 0xffffffff);
  const packet_header_size = 12; // 3x 4byte integers: write_uuid, index_from, payload.length
  const packet_size = detectAndroid() ? 212 : 512; // min size packet_header_size + 1 !!!! ANDROID NEEDS PACKET SIZE <= 212!!!!
  const bytes_size = packet_size - packet_header_size;

  if (!response && bytes.length > bytes_size) {
    console.error("The maximum bytes that can be written without response is " + bytes_size);
    return;
  }

  if (!response) {
    return characteristic.writeValueWithoutResponse(new Uint8Array(payload));
  } else {
    return new Promise(async (resolve, reject) => {
      let index_from = 0;
      let index_to = bytes_size;

      while (index_from < bytes.length) {
        if (index_to > bytes.length) {
          index_to = bytes.length;
        }

        const payload = [...toBytes(write_uuid, 4), ...toBytes(index_from, 4), ...toBytes(bytes.length, 4), ...bytes.slice(index_from, index_to)];

        await characteristic.writeValueWithResponse(new Uint8Array(payload)).catch((e) => {
          console.error(e);
          reject(e);
          return;
        });

        index_from += bytes_size;
        index_to = index_from + bytes_size;
      }
      resolve();
      return;
    });
  }
};

TangleBluetoothConnection.prototype.reset = function () {
  console.log("Reseting TangleBluetoothConnection...");

  this.disconnect();

  if (this.transmitter) {
    this.transmitter.reset((clear_queue = true));
  }

  this.bluetoothDevice = null;
  this.transmitter = null;
  // this.eventEmitter = createNanoEvents();
};
