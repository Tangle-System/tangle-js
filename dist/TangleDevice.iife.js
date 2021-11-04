var TangleDevice = (function () {
  'use strict';

  class TimeTrack {
    constructor(time) {
      this.memory_ = 0;
      this.paused_ = false;

      if (time) {
        this.setMillis(time);
      } else {
        this.setMillis(0);
      }
    }

    millis() {
      if (this.paused_) {
        return this.memory_;
      } else {
        return Date.now() - this.memory_;
      }
    }

    setMillis(current) {
      this.memory_ = this.paused_ ? current : Date.now() - current;
    }

    setStatus(timestamp, paused) {
      this.paused_ = paused ?? this.paused_;
      this.memory_ = this.paused_ ? timestamp : Date.now() - timestamp;
    }

    pause() {
      if (!this.paused_) {
        this.paused_ = true;
        this.memory_ = Date.now() - this.memory_;
      }
    }

    unpause() {
      if (this.paused_) {
        this.paused_ = false;
        this.memory_ = Date.now() - this.memory_;
      }
    }

    paused() {
      return this.paused_;
    }
  }

  // const FLAGS = Object.freeze({
  //   /* command flags */
  //   FLAG_TNGL_BYTES: 248,
  //   FLAG_SET_TIMELINE: 249,
  //   FLAG_EMIT_TIMESTAMP_EVENT: 250,
  //   FLAG_EMIT_COLOR_EVENT: 251,
  //   FLAG_EMIT_PERCENTAGE_EVENT: 252,
  //   FLAG_EMIT_LABEL_EVENT: 253,

  //   /* command ends */
  //   END_OF_STATEMENT: 254,
  //   END_OF_TNGL_BYTES: 255,
  // });

  function toBytes(value, byteCount) {
    var byteArray = [];
    for (let index = 0; index < byteCount; index++) {
      const byte = value & 0xff;
      byteArray.push(byte);
      value = value >> 8;
    }
    return byteArray;
  }

  // timeline_index [0 - 15]
  // timeline_paused [true/false]
  function getTimelineFlags(timeline_index, timeline_paused) {
    // flags bits: [ Reserved,Reserved,Reserved,PausedFLag,IndexBit3,IndexBit2,IndexBit1,IndexBit0]
    timeline_index = timeline_index & 0b00001111;
    timeline_paused = (timeline_paused << 4) & 0b00010000;
    return timeline_paused | timeline_index;
  }

  // function floatingByteToInt16(value) {
  //   if (value < 0.0) {
  //     value = 0.0;
  //   } else if (value > 255.0) {
  //     value = 255.0;
  //   }

  //   let value_whole = Math.floor(value);
  //   let value_rational = Math.round((value - value_whole) / (1 / 256));
  //   let value_int16 = (value_whole << 8) + value_rational;

  //   // console.log(value_whole);
  //   // console.log(value_rational);
  //   // console.log(value_int16);

  //   return value_int16;
  // }

  // function eventParamToBytes(event_param) {
  //   return toBytes(floatingByteToInt16(event_param), 2);
  // }

  const timeOffset = new Date().getTime() % 0x7fffffff;
  // must be positive int32 (4 bytes)
  function getClockTimestamp() {
    return (new Date().getTime() % 0x7fffffff) - timeOffset;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // The MIT License (MIT)

  // Copyright 2016 Andrey Sitnik <andrey@sitnik.ru>

  // Permission is hereby granted, free of charge, to any person obtaining a copy of
  // this software and associated documentation files (the "Software"), to deal in
  // the Software without restriction, including without limitation the rights to
  // use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
  // the Software, and to permit persons to whom the Software is furnished to do so,
  // subject to the following conditions:

  // The above copyright notice and this permission notice shall be included in all
  // copies or substantial portions of the Software.

  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
  // FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
  // COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
  // IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  // CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

  const createNanoEvents = () => ({
    events: {},
    emit(event, ...args) {
      (this.events[event] || []).forEach((i) => i(...args));
    },
    on(event, cb) {
      (this.events[event] = this.events[event] || []).push(cb);
      return () => (this.events[event] = (this.events[event] || []).filter((i) => i !== cb));
    },
  });

  function mapValue(x, in_min, in_max, out_min, out_max) {
    if (in_max == in_min) {
      return out_min / 2 + out_max / 2;
    }

    let minimum = Math.min(in_min, in_max);
    let maximum = Math.max(in_min, in_max);

    if (x < minimum) {
      x = minimum;
    } else if (x > maximum) {
      x = maximum;
    }

    let result = ((x - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;

    minimum = Math.min(out_min, out_max);
    maximum = Math.max(out_min, out_max);

    if (result < minimum) {
      result = minimum;
    } else if (result > maximum) {
      result = maximum;
    }

    return result;
  }

  // takes "label" and outputs ascii characters in a list of bytes
  function labelToBytes(label_string) {
    var byteArray = [];

    for (let index = 0; index < 5; index++) {
      byteArray.push(label_string.charCodeAt(index));
    }
    return byteArray;
  }

  function colorToBytes(color_hex_code) {
    let reg = color_hex_code.match(/#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/i);
    if (!reg) {
      console.error('Wrong color code: "' + color_hex_code + '"');
      return [0, 0, 0];
    }

    let r = parseInt(reg[1], 16);
    let g = parseInt(reg[2], 16);
    let b = parseInt(reg[3], 16);

    return [r, g, b];
  }

  function percentageToBytes(percentage_float) {
    const value = mapValue(percentage_float, -100.0, 100.0, -2147483647, 2147483647);
    return toBytes(Math.floor(value), 4);
  }

  function detectAndroid() {
    return navigator.userAgent.toLowerCase().indexOf("android") > -1;
  }

  function debugLog(...args) {
    // if (window.localStorage.getItem('debug') === 'true') {
    console.log(`TangleDevice`, ...args);
    // }
  }

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
      const data_size = detectAndroid() ? 992 : 4992;

      let index_from = 0;
      let index_to = data_size;

      let written = 0;

      console.log("OTA UPDATE");

      console.log(firmware);
      tangleEvents.emit('ota_progress', 0.01);


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

          tangleEvents.emit('ota_progress', Math.floor((written * 10000) / firmware.length) / 100);
          console.log(Math.floor((written * 10000) / firmware.length) / 100 + "%");

          index_from += data_size;
          index_to = index_from + data_size;
        }
        tangleEvents.emit('ota_progress', 100);
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

  function TangleBluetoothConnection() {
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
      return characteristic.writeValueWithoutResponse(new Uint8Array([]));
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
      this.transmitter.reset((true));
    }

    this.bluetoothDevice = null;
    this.transmitter = null;
  };

  const CONSTANTS = Object.freeze({
    MODIFIER_SWITCH_NONE: 0,
    MODIFIER_SWITCH_RG: 1,
    MODIFIER_SWITCH_GB: 2,
    MODIFIER_SWITCH_BR: 3,
  });

  const FLAGS = Object.freeze({
    /* no code or command used by decoder as a validation */
    NONE: 0,

    // ======================

    /* drawings */
    DRAWING_SET: 1,
    DRAWING_ADD: 2,
    DRAWING_SUB: 3,
    DRAWING_SCALE: 4,
    DRAWING_FILTER: 5,

    /* windows */
    WINDOW_SET: 6,
    WINDOW_ADD: 7,
    WINDOW_SUB: 8,
    WINDOW_SCALE: 9,
    WINDOW_FILTER: 10,

    /* frame */
    FRAME: 11,

    /* clip */
    CLIP: 12,

    /* sifters */
    SIFTER_DEVICE: 13,
    SIFTER_TANGLE: 14,
    SIFTER_GROUP: 15,

    /* event handlers */
    INTERACTIVE: 16,
    EVENT_HANDLE: 17,

    /* definitions scoped */
    DEFINE_VARIABLE: 18,

    // ======================

    /* definitions global */
    DEFINE_DEVICE: 24,
    DEFINE_TANGLE: 25,
    DEFINE_GROUP: 26,
    DEFINE_MARKS: 27,
    DEFINE_ANIMATION: 28,
    DEFINE_EMITTER: 28,

    // ======================

    /* animations */
    ANIMATION_NONE: 32,
    ANIMATION_FILL: 33,
    ANIMATION_RAINBOW: 34,
    ANIMATION_FADE: 35,
    ANIMATION_PROJECTILE: 36,
    ANIMATION_LOADING: 37,
    ANIMATION_COLOR_ROLL: 38,
    ANIMATION_PALLETTE_ROLL: 39,
    ANIMATION_INL_ANI: 40,
    ANIMATION_DEFINED: 41,

    /* modifiers */
    MODIFIER_BRIGHTNESS: 128,
    MODIFIER_TIMELINE: 129,
    MODIFIER_FADE_IN: 130,
    MODIFIER_FADE_OUT: 131,
    MODIFIER_SWITCH_COLORS: 132,
    MODIFIER_TIME_LOOP: 133,
    MODIFIER_TIME_SCALE: 134,
    MODIFIER_TIME_SCALE_SMOOTHED: 135,
    MODIFIER_TIME_CHANGE: 136,
    MODIFIER_TIME_SET: 137,

    /* events */
    GENERATOR_LAST_EVENT_VALUE: 144,
    GENERATOR_SMOOTHOUT: 145,
    GENERATOR_SINE: 146,
    GENERATOR_SAW: 147,
    GENERATOR_TRIANGLE: 148,
    GENERATOR_SQUARE: 149,
    GENERATOR_PERLIN_NOISE: 150,

    /* variable operations gates */
    VARIABLE_READ: 160,
    VARIABLE_ADD: 161,
    VARIABLE_SUB: 162,
    VARIABLE_MUL: 163,
    VARIABLE_DIV: 164,
    VARIABLE_MOD: 165,
    VARIABLE_SCALE: 166,
    VARIABLE_MAP: 167,

    /* objects */
    DEVICE: 176,
    TANGLE: 177,
    SLICE: 178,
    PORT: 179,
    GROUP: 180,
    MARKS: 181,

    /* events */
    EVENT_SET_VALUE: 184,
    EVENT_EMIT_LOCAL: 185,

    // ======================

    /* values */
    TIMESTAMP: 188,
    COLOR: 189,
    PERCENTAGE: 190,
    LABEL: 191,
    PIXELS: 192,
    TUPLE: 193,


    // ======================

    /* most used constants */
    TIMESTAMP_ZERO: 194,
    TIMESTAMP_MAX: 195,
    TIMESTAMP_MIN: 196,
    COLOR_WHITE: 197,
    COLOR_BLACK: 198,

    // ======================

    /* command flags */
    FLAG_TNGL_BYTES: 248,
    FLAG_SET_TIMELINE: 249,
    FLAG_EMIT_TIMESTAMP_EVENT: 250,
    FLAG_EMIT_COLOR_EVENT: 251,
    FLAG_EMIT_PERCENTAGE_EVENT: 252,
    FLAG_EMIT_LABEL_EVENT: 253,

    /* command ends */
    END_OF_STATEMENT: 254,
    END_OF_TNGL_BYTES: 255
  });

  function TnglCodeParser() { }

  TnglCodeParser.prototype.parseTnglCode = function (tngl_code) {
    const buffer = new ArrayBuffer(65535);
    const payload = new DataView(buffer);

    payload.cursor = 0;

    payload.fillFlag = function (flag) {
      this.setUint8(this.cursor++, flag);
    };

    payload.fillUInt8 = function (value) {
      this.setUint8(this.cursor++, value);
    };

    payload.fillInt16 = function (value) {
      this.setUint8(this.cursor++, value);
      this.setUint8(this.cursor++, value >> 8);
    };

    payload.fillInt24 = function (value) {
      this.setUint8(this.cursor++, value);
      this.setUint8(this.cursor++, value >> 8);
      this.setUint8(this.cursor++, value >> 16);
    };

    payload.fillInt32 = function (value) {
      this.setUint8(this.cursor++, value);
      this.setUint8(this.cursor++, value >> 8);
      this.setUint8(this.cursor++, value >> 16);
      this.setUint8(this.cursor++, value >> 24);
    };

    ///////////////////////////////////////////////////////////

    let compiler = {};

    compiler.compileFlag = function (flag) {
      payload.fillUInt8(flag);
    };

    compiler.compileByte = function (byte) {
      let reg = byte.match(/0x([0-9a-f][0-9a-f])(?![0-9a-f])/i);
      if (!reg) {
        console.error("Failed to compile a byte");
        return;
      }
      payload.fillUInt8(parseInt(reg[1], 16));
    };

    compiler.compileChar = function (char) {
      let reg = char.match(/(-?)'([\W\w])'/);
      if (!reg) {
        console.error("Failed to compile char");
        return;
      }
      if (reg[1] == "-") {
        payload.fillUInt8(-reg[2].charCodeAt(0));
      } else {
        payload.fillUInt8(reg[2].charCodeAt(0));
      }
    };

    // takes string string as '"this is a string"'
    compiler.compileString = function (string) {
      let reg = string.match(/"([\w ]*)"/);
      if (!reg) {
        console.error("Failed to compile a string");
        return;
      }

      for (let i = 0; i < string.length; i++) {
        payload.fillUInt8(string.charCodeAt(i));
      }

      payload.fillFlag(FLAGS.NONE);
    };

    compiler.compileInfinity = function (infinity) {
      let reg = infinity.match(/([+-]?Infinity)/);
      if (!reg) {
        console.error("Failed to compile a infinity");
        return;
      }

      if (reg[1] == "Infinity" || reg[1] == "+Infinity") {
        payload.fillFlag(FLAGS.TIMESTAMP_MAX);
      } else if (reg[1] == "-Infinity") {
        payload.fillFlag(FLAGS.TIMESTAMP_MIN);
      } else {
        console.error("Error while compiling infinity");
      }
    };

    // takes in time string token like "1.2d+9h2m7.2s-123t" and appeds to payload the total time in ms (tics) as a int32_t: [FLAG.TIMESTAMP, BYTE4, BYTE2, BYTE1, BYTE0]
    compiler.compileTimestamp = function (timestamp) {
      // console.log(timestamp);

      timestamp.replace(/_/g, ""); // replaces all '_' with nothing

      let total_tics = 0;

      while (timestamp) {
        let reg = timestamp.match(/([+-]?[0-9]*[.]?[0-9]+)([dhmst])/); // for example gets "-1.4d" from "-1.4d23.2m1s"

        if (!reg) {
          // if the regex match failes, then the algorithm is done
          if (timestamp != "") {
            console.error("Error while parsing timestamp");
            console.log("Leftover string:", timestamp);
          }
          break;
        }

        let value = reg[0]; // gets "-1.4d" from "-1.4d"
        let unit = reg[2]; // gets "d" from "-1.4d"
        let number = parseFloat(reg[1]); // gets "-1.4" from "-1.4d"

        // console.log("value:", value);
        // console.log("unit:", unit);
        // console.log("number:", number);

        switch (unit) {
          case "d":
            total_tics += number * 86400000;
            break;

          case "h":
            total_tics += number * 3600000;
            break;

          case "m":
            total_tics += number * 60000;
            break;

          case "s":
            total_tics += number * 1000;
            break;

          case "t":
            total_tics += number;
            break;

          default:
            console.error("Error while parsing timestamp");
            break;
        }

        timestamp = timestamp.replace(value, ""); // removes one value from the string
      }

      // console.log("total_tics:", total_tics);

      if (total_tics == 0) {
        payload.fillFlag(FLAGS.TIMESTAMP_ZERO);
      } else {
        payload.fillFlag(FLAGS.TIMESTAMP);
        payload.fillInt32(total_tics);
      }
    };

    // takes in html color string "#abcdef" and encodes it into 24 bits [FLAG.COLOR, R, G, B]
    compiler.compileColor = function (color) {
      let reg = color.match(/#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/i);
      if (!reg) {
        console.error("Failed to compile color");
        return;
      }

      let r = parseInt(reg[1], 16);
      let g = parseInt(reg[2], 16);
      let b = parseInt(reg[3], 16);

      if (r == 255 && g == 255 && b == 255) {
        payload.fillFlag(FLAGS.COLOR_WHITE);
      } else if (r == 0 && g == 0 && b == 0) {
        payload.fillFlag(FLAGS.COLOR_BLACK);
      } else {
        payload.fillFlag(FLAGS.COLOR);
        payload.fillUInt8(r);
        payload.fillUInt8(g);
        payload.fillUInt8(b);
      }
    };

    // takes in percentage string "83.234%" and encodes it into 24 bits
    compiler.compilePercentage = function (percentage) {
      let reg = percentage.match(/([+-]?[\d.]+)%/);
      if (!reg) {
        console.error("Failed to compile percentage");
        return;
      }

      let val = parseFloat(reg[1]);

      if (val > 100.0) {
        val = 100.0;
      }
      if (val < -100.0) {
        val = -100.0;
      }

      const remapped = mapValue(val, -100.0, 100.0, -2147483647, 2147483647);

      payload.fillFlag(FLAGS.PERCENTAGE);
      payload.fillInt32(parseInt(remapped));
    };

    // takes label string as "$label" and encodes it into 32 bits
    compiler.compileLabel = function (label) {
      let reg = label.match(/\$([\w]*)/);
      if (!reg) {
        console.error("Failed to compile a label");
        return;
      }

      payload.fillFlag(FLAGS.LABEL);
      for (let index = 0; index < 5; index++) {
        payload.fillUInt8(reg[1].charCodeAt(index));
      }
    };

    // takes pixels string "12px" and encodes it into 16 bits
    compiler.compilePixels = function (pixels) {
      let reg = pixels.match(/([\d]+)px/);
      if (!reg) {
        console.error("Failed to compile pixels");
        return;
      }

      let count = parseInt(reg[1]);

      payload.fillFlag(FLAGS.PIXELS);
      payload.fillInt16(count);
    };

    ///////////////////////////////////////////////////////////

    compiler.compileWord = function (word) {
      switch (word) {
        // === canvas operations ===
        case "setDrawing":
          payload.fillFlag(FLAGS.DRAWING_SET);
          break;
        case "addDrawing":
          payload.fillFlag(FLAGS.DRAWING_ADD);
          break;
        case "subDrawing":
          payload.fillFlag(FLAGS.DRAWING_SUB);
          break;
        case "scaDrawing":
          payload.fillFlag(FLAGS.DRAWING_SCALE);
          break;
        case "filDrawing":
          payload.fillFlag(FLAGS.DRAWING_FILTER);
          break;
        case "setWindow":
          payload.fillFlag(FLAGS.WINDOW_SET);
          break;
        case "addWindow":
          payload.fillFlag(FLAGS.WINDOW_ADD);
          break;
        case "subWindow":
          payload.fillFlag(FLAGS.WINDOW_SUB);
          break;
        case "scaWindow":
          payload.fillFlag(FLAGS.WINDOW_SCALE);
          break;
        case "filWindow":
          payload.fillFlag(FLAGS.WINDOW_FILTER);

          // === time operations ===
          break;
        case "frame":
          payload.fillFlag(FLAGS.FRAME);
          break;

        // === animations ===
        case "animDefined":
          payload.fillFlag(FLAGS.ANIMATION_DEFINED);
          break;
        case "animNone":
          payload.fillFlag(FLAGS.ANIMATION_NONE);
          break;
        case "animFill":
          payload.fillFlag(FLAGS.ANIMATION_FILL);
          break;
        case "animRainbow":
          payload.fillFlag(FLAGS.ANIMATION_RAINBOW);
          break;
        case "animPlasmaShot":
          payload.fillFlag(FLAGS.ANIMATION_PROJECTILE);
          break;
        case "animLoadingBar":
          payload.fillFlag(FLAGS.ANIMATION_LOADING);
          break;
        case "animFade":
          payload.fillFlag(FLAGS.ANIMATION_FADE);
          break;
        case "animColorRoll":
          payload.fillFlag(FLAGS.ANIMATION_COLOR_ROLL);
          break;
        case "animPaletteRoll":
          payload.fillFlag(FLAGS.ANIMATION_PALLETTE_ROLL);
          break;

        // === handlers ===
        case "interactive":
          payload.fillFlag(FLAGS.INTERACTIVE);
          break;

        // === clip ===
        case "clip":
          payload.fillFlag(FLAGS.CLIP);
          break;

        // === definitions ===
        case "defAnimation":
          payload.fillFlag(FLAGS.DEFINE_ANIMATION);
          break;
        case "defDevice":
          payload.fillFlag(FLAGS.DEFINE_DEVICE);
          break;
        case "defTangle":
          payload.fillFlag(FLAGS.DEFINE_TANGLE);
          break;
        case "defGroup":
          payload.fillFlag(FLAGS.DEFINE_GROUP);
          break;
        case "defMarks":
          payload.fillFlag(FLAGS.DEFINE_MARKS);
          break;
        case "defVariable":
          payload.fillFlag(FLAGS.DEFINE_VARIABLE);
          break;

        // === sifters ===
        case "siftDevices":
          payload.fillFlag(FLAGS.SIFTER_DEVICE);
          break;
        case "siftTangles":
          payload.fillFlag(FLAGS.SIFTER_TANGLE);
          break;
        case "siftGroups":
          payload.fillFlag(FLAGS.SIFTER_GROUP);
          break;

        // === objects ===
        case "device":
          payload.fillFlag(FLAGS.DEVICE);
          break;
        case "tangle":
          payload.fillFlag(FLAGS.TANGLE);
          break;
        case "slice":
          payload.fillFlag(FLAGS.SLICE);
          break;
        case "port":
          payload.fillFlag(FLAGS.PORT);
          break;
        case "group":
          payload.fillFlag(FLAGS.GROUP);
          break;
        case "marks":
          payload.fillFlag(FLAGS.MARKS);
          break;

        // === modifiers ===
        case "modifyBrightness":
          payload.fillFlag(FLAGS.MODIFIER_BRIGHTNESS);
          break;
        case "modifyTimeline":
          payload.fillFlag(FLAGS.MODIFIER_TIMELINE);
          break;
        case "modifyFadeIn":
          payload.fillFlag(FLAGS.MODIFIER_FADE_IN);
          break;
        case "modifyFadeOut":
          payload.fillFlag(FLAGS.MODIFIER_FADE_OUT);
          break;
        case "modifyColorSwitch":
          payload.fillFlag(FLAGS.MODIFIER_SWITCH_COLORS);
          break;
        case "modifyTimeLoop":
          payload.fillFlag(FLAGS.MODIFIER_TIME_LOOP);
          break;
        case "modifyTimeScale":
          payload.fillFlag(FLAGS.MODIFIER_TIME_SCALE);
          break;
        case "modifyTimeScaleSmoothed":
          payload.fillFlag(FLAGS.MODIFIER_TIME_SCALE_SMOOTHED);
          break;
        case "modifyTimeChange":
          payload.fillFlag(FLAGS.MODIFIER_TIME_CHANGE);
          break;
        case "modifyTimeSet":
          payload.fillFlag(FLAGS.MODIFIER_TIME_SET);
          break;

        // === events ===
        case "handleEvent":
          payload.fillFlag(FLAGS.EVENT_HANDLE);
          break;
        case "setValue":
          payload.fillFlag(FLAGS.EVENT_SET_VALUE);
          break;
        case "emitAs":
          payload.fillFlag(FLAGS.EVENT_EMIT_LOCAL);
          break;

        // === generators ===
        case "genLastEventParam":
          payload.fillFlag(FLAGS.GENERATOR_LAST_EVENT_VALUE);
          break;
        case "genSine":
          payload.fillFlag(FLAGS.GENERATOR_SINE);
          break;
        case "genSaw":
          payload.fillFlag(FLAGS.GENERATOR_SAW);
          break;
        case "genTriangle":
          payload.fillFlag(FLAGS.GENERATOR_TRIANGLE);
          break;
        case "genSquare":
          payload.fillFlag(FLAGS.GENERATOR_SQUARE);
          break;
        case "genPerlinNoise":
          payload.fillFlag(FLAGS.GENERATOR_PERLIN_NOISE);
          break;
        case "genSmoothOut":
          payload.fillFlag(FLAGS.GENERATOR_SMOOTHOUT);
          break;

        /* === variable operations === */

        case "variable":
          payload.fillFlag(FLAGS.VARIABLE_READ);
          break;
        case "genSmoothOut":
          payload.fillFlag(FLAGS.VARIABLE_SMOOTH_TIMED);
          break;
        case "addValues":
          payload.fillFlag(FLAGS.VARIABLE_ADD);
          break;
        case "subValues":
          payload.fillFlag(FLAGS.VARIABLE_SUB);
          break;
        case "mulValues":
          payload.fillFlag(FLAGS.VARIABLE_MUL);
          break;
        case "divValues":
          payload.fillFlag(FLAGS.VARIABLE_DIV);
          break;
        case "modValues":
          payload.fillFlag(FLAGS.VARIABLE_MOD);
          break;
        case "scaValue":
          payload.fillFlag(FLAGS.VARIABLE_SCALE);
          break;
        case "mapValue":
          payload.fillFlag(FLAGS.VARIABLE_MAP);
          break;

        // === constants ===
        case "true":
          payload.fillUInt8(0x01);
          break;
        case "false":
          payload.fillUInt8(0x00);
          break;

        case "MODIFIER_SWITCH_NONE":
          payload.fillByte(CONSTANTS.MODIFIER_SWITCH_NONE);
          break;
        case "MODIFIER_SWITCH_RG":
        case "MODIFIER_SWITCH_GR":
          payload.fillByte(CONSTANTS.MODIFIER_SWITCH_RG);
          break;
        case "MODIFIER_SWITCH_GB":
        case "MODIFIER_SWITCH_BG":
          payload.fillByte(CONSTANTS.MODIFIER_SWITCH_GB);
          break;
        case "MODIFIER_SWITCH_BR":
        case "MODIFIER_SWITCH_RB":
          payload.fillByte(CONSTANTS.MODIFIER_SWITCH_BR);
          break;

        // === unknown ===
        default:
          console.warn("Unknown word >", word, "<");
          break;
      }
    };

    ///////////////////////////////////////////////////////////

    const parses = {
      comment: /\/\/[^\n]*/,
      htmlrgb: /#[0-9a-f]{6}/i,
      infinity: /[+-]?Infinity/,
      string: /"[\w ]*"/,
      timestamp: /(_?[+-]?[0-9]*[.]?[0-9]+[dhmst])+/,
      label: /\$[\w]*/,
      char: /-?'[\W\w]'/,
      byte: /0x[0-9a-f][0-9a-f](?![0-9a-f])/i,
      pixels: /[\d]+px/,
      percentage: /[+-]?[\d.]+%/,
      float: /([+-]?[0-9]*[.][0-9]+)/,
      number: /([+-]?[0-9]+)/,
      arrow: /->/,
      word: /[a-z_][\w]*/i,
      whitespace: /\s+/,
      punctuation: /[^\w\s]/,
    };

    console.log(tngl_code);
    const tokens = this._tokenize(tngl_code, parses);
    console.log(tokens);

    compiler.compileFlag(FLAGS.FLAG_TNGL_BYTES);

    for (let index = 0; index < tokens.length; index++) {
      const element = tokens[index];

      // console.log(element);

      switch (element.type) {
        case "comment":
          // skip
          break;

        case "htmlrgb":
          compiler.compileColor(element.token);
          break;

        case "infinity":
          compiler.compileInfinity(element.token);
          break;

        case "string":
          compiler.compileString(element.token);
          break;

        case "timestamp":
          compiler.compileTimestamp(element.token);
          break;

        case "label":
          compiler.compileLabel(element.token);
          break;

        case "char":
          compiler.compileChar(element.token);
          break;

        case "byte":
          compiler.compileByte(element.token);
          break;

        case "pixels":
          compiler.compilePixels(element.token);
          break;

        case "percentage":
          compiler.compilePercentage(element.token);
          break;

        case "float":
          console.error('"Naked" float numbers are not permitted.');
          break;

        case "number":
          console.error('"Naked" numbers are not permitted.');
          break;

        case "arrow":
          // skip
          break;

        case "word":
          compiler.compileWord(element.token);
          break;

        case "whitespace":
          // skip
          break;

        case "punctuation":
          if (element.token == "}") {
            payload.fillFlag(FLAGS.END_OF_STATEMENT);
          }
          break;

        default:
          console.warn("Unknown token type >", element.type, "<");
          break;
      }
    }

    compiler.compileFlag(FLAGS.END_OF_TNGL_BYTES);

    let tngl_bytes = new Uint8Array(buffer, 0, payload.cursor);
    console.log(tngl_bytes);
    return tngl_bytes;
  };

  /*
   * Tiny tokenizer
   *
   * - Accepts a subject string and an object of regular expressions for parsing
   * - Returns an array of token objects
   *
   * tokenize('this is text.', { word:/\w+/, whitespace:/\s+/, punctuation:/[^\w\s]/ }, 'invalid');
   * result => [{ token="this", type="word" },{ token=" ", type="whitespace" }, Object { token="is", type="word" }, ... ]
   *
   */

  TnglCodeParser.prototype._tokenize = function (s, parsers, deftok) {
    var m,
      r,
      t,
      tokens = [];
    while (s) {
      t = null;
      m = s.length;
      for (var key in parsers) {
        r = parsers[key].exec(s);
        // try to choose the best match if there are several
        // where "best" is the closest to the current starting point
        if (r && r.index < m) {
          t = {
            token: r[0],
            type: key,
            matches: r.slice(1),
          };
          m = r.index;
        }
      }
      if (m) {
        // there is text between last token and currently
        // matched token - push that out as default or "unknown"
        tokens.push({
          token: s.substr(0, m),
          type: deftok || "unknown",
        });
      }
      if (t) {
        // push current token onto sequence
        tokens.push(t);
      }
      s = s.substr(m + (t ? t.token.length : 0));
    }
    return tokens;
  };

  /////////////////////////////////////////////////////////////////////////

  function TangleBluetoothDevice() {
    this.bluetoothConnection = new TangleBluetoothConnection();
    this.bluetoothConnection.addEventListener("disconnected", this.onDisconnect);
    this.bluetoothConnection.addEventListener("connected", this.onConnect);

    // auto clock sync loop
    var self = this;
    setInterval(() => {
      if (self.isConnected()) {
        self.syncClock(getClockTimestamp());
      }
    }, 60000);

    window.addEventListener("beforeunload", this.bluetoothConnection.disconnect);
  }

  /**
   * @name TangleBluetoothDevice.prototype.addEventListener
   * events: "disconnected", "connected"
   *
   * all events: event.target === the sender object (TangleBluetoothConnection)
   * event "disconnected": event.reason has a string with a disconnect reason
   *
   * @returns unbind function
   */
  TangleBluetoothDevice.prototype.addEventListener = function (event, callback) {
    this.bluetoothConnection.addEventListener(event, callback);
  };

  TangleBluetoothDevice.prototype.onDisconnect = function (event) {
    console.log("Bluetooth Device disconnected");

    if (event.target.connected) {
      setTimeout(() => {
        console.log("Reconnecting device...");
        return event.target
          .reconnect()
          .then(async () => {
            let success = false;

            for (let index = 0; index < 3; index++) {
              await sleep(1000);
              try {
                if (await event.target.transmitter.sync(getClockTimestamp())) {
                  success = true;
                  break;
                }
              } catch (e) {
                console.warn("time sync unsuccessful");
              }
            }

            if (success) {
              console.log("Sync time success");
            } else {
              console.error("Sync time on connection failed");
            }
          })
          .catch((error) => {
            console.error(error);
            event.target.reset();
          });
      }, 1000);
    }
  };

  TangleBluetoothDevice.prototype.onConnect = function (event) {
    console.log("Bluetooth Device connected");
  };

  TangleBluetoothDevice.prototype.connect = function () {
    return this.bluetoothConnection
      .scan()
      .then(() => {
        return this.bluetoothConnection
          .connect()
          .then(async () => {
            let success = false;

            for (let index = 0; index < 3; index++) {
              await sleep(1000);
              try {
                if (await this.bluetoothConnection.transmitter.sync(getClockTimestamp())) {
                  success = true;
                  break;
                }
              } catch (e) {
                console.warn("time sync failed");
              }
            }

            if (success) {
              console.log("Sync time success");
            } else {
              console.error("Sync time on connection failed");
            }
          })
          .catch((error) => {
            console.warn(error);
            this.bluetoothConnection.reset();
          });
      })
      .catch((error) => {
        console.warn(error);
      });
  };

  TangleBluetoothDevice.prototype.reconnect = function () {
    return this.bluetoothConnection
      .reconnect()
      .then(async () => {
        let success = false;

        for (let index = 0; index < 3; index++) {
          await sleep(1000);
          try {
            if (await this.bluetoothConnection.transmitter.sync(getClockTimestamp())) {
              success = true;
              break;
            }
          } catch (e) {
            console.warn("time sync failed");
          }
        }

        if (success) {
          console.log("Sync time success");
        } else {
          console.error("Sync time on connection failed");
        }
      })
      .catch((error) => {
        console.warn(error);
        this.bluetoothConnection.reset();
      });
  };

  TangleBluetoothDevice.prototype.disconnect = function () {
    return this.bluetoothConnection.disconnect();
  };

  TangleBluetoothDevice.prototype.isConnected = function () {
    return this.bluetoothConnection.connected;
  };

  TangleBluetoothDevice.prototype.uploadTngl = function (tngl_bytes, timeline_index, timeline_timestamp, timeline_paused) {
    //console.log("uploadTngl()");

    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    const flags = getTimelineFlags(timeline_index, timeline_paused);
    const timeline_bytes = [FLAGS.FLAG_SET_TIMELINE, ...toBytes(getClockTimestamp(), 4), ...toBytes(timeline_timestamp, 4), flags];

    const payload = [...timeline_bytes, ...tngl_bytes];
    this.bluetoothConnection.transmitter.deliver(payload);

    return true;
  };



  TangleBluetoothDevice.prototype.setTimeline = function (timeline_index, timeline_timestamp, timeline_paused) {
    //console.log("setTimeline()");

    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    const flags = getTimelineFlags(timeline_index, timeline_paused);

    const payload = [FLAGS.FLAG_SET_TIMELINE, ...toBytes(getClockTimestamp(), 4), ...toBytes(timeline_timestamp, 4), flags];
    this.bluetoothConnection.transmitter.deliver(payload);

    return true;
  };

  // event_label example: "evt1"
  // event_value example: 1000
  TangleBluetoothDevice.prototype.emitTimestampEvent = function (event_label, event_value, event_timeline_timestamp, device_id) {
    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    // default broadcast
    if (device_id === null) {
      device_id = 0xff;
    }

    const payload = [FLAGS.FLAG_EMIT_TIMESTAMP_EVENT, ...toBytes(event_value, 4), ...labelToBytes(event_label), ...toBytes(event_timeline_timestamp, 4), device_id];
    this.bluetoothConnection.transmitter.deliver(payload);

    return true;
  };

  // event_label example: "evt1"
  // event_value example: "#00aaff"
  TangleBluetoothDevice.prototype.emitColorEvent = function (event_label, event_value, event_timeline_timestamp, device_id) {
    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    // default broadcast
    if (device_id === null) {
      device_id = 0xff;
    }

    const payload = [FLAGS.FLAG_EMIT_COLOR_EVENT, ...colorToBytes(event_value), ...labelToBytes(event_label), ...toBytes(event_timeline_timestamp, 4), device_id];
    this.bluetoothConnection.transmitter.deliver(payload);

    return true;
  };

  // event_label example: "evt1"
  // event_value example: 100.0
  TangleBluetoothDevice.prototype.emitPercentageEvent = function (event_label, event_value, event_timeline_timestamp, device_id) {
    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    // default broadcast
    if (device_id === null) {
      device_id = 0xff;
    }

    const payload = [FLAGS.FLAG_EMIT_PERCENTAGE_EVENT, ...percentageToBytes(event_value), ...labelToBytes(event_label), ...toBytes(event_timeline_timestamp, 4), device_id];
    this.bluetoothConnection.transmitter.deliver(payload);

    return true;
  };

  // event_label example: "evt1"
  // event_value example: "label"
  TangleBluetoothDevice.prototype.emitLabelEvent = function (event_label, event_value, event_timeline_timestamp, device_id) {
    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    // default broadcast
    if (device_id === null) {
      device_id = 0xff;
    }

    const payload = [FLAGS.FLAG_EMIT_LABEL_EVENT, ...labelToBytes(event_value), ...labelToBytes(event_label), ...toBytes(event_timeline_timestamp, 4), device_id];
    this.bluetoothConnection.transmitter.deliver(payload);

    return true;
  };

  /* 
  function emitEvents(events)

  events - array of event objects

  event object must have:
    device_id [0; 255]
    code [0; 255]
    parameter [0; 255]
    timeline_timestamp [-2147483648; 2147483647] 


  == EXAMPLE ==

    let events = [];

    let e1 = {};
    e1.code = 0;
    e1.parameter = 0;
    e1.timeline_timestamp = 0;

    let e2 = {};
    e2.code = 0;
    e2.parameter = 255;
    e2.timeline_timestamp = 1000;

    events.push(e1);
    events.push(e2);

    bluetoothdevice.emitEvents(events);

  == EXAMPLE ==
  */

  // TangleBluetoothDevice.prototype.emitEvents = function (events) {
  //   //console.log("emitEvents()");

  //   if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
  //     console.warn("Bluetooth device disconnected");
  //     return false;
  //   }

  //   let payload = [];

  //   for (let i = 0; i < events.length; i++) {
  //     const e = events[i];
  //     const bytes = [FLAGS.FLAG_EMIT_EVENT, e.device_id, e.code, e.parameter, ...toBytes(e.timeline_timestamp, 4)];
  //     payload.push(...bytes);
  //   }

  //   this.bluetoothConnection.transmitter.deliver(payload);

  //   return true;
  // };

  /* timeline_index [0 - 15]



  */
  TangleBluetoothDevice.prototype.syncTimeline = function (timeline_index, timeline_timestamp, timeline_paused) {
    //console.log("syncTimeline()");

    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    const flags = getTimelineFlags(timeline_index, timeline_paused);

    const payload = [FLAGS.FLAG_SET_TIMELINE, ...toBytes(getClockTimestamp(), 4), ...toBytes(timeline_timestamp, 4), flags];
    this.bluetoothConnection.transmitter.transmit(payload);

    return true;
  };

  TangleBluetoothDevice.prototype.syncClock = function () {
    //console.log("syncClock()");

    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    this.bluetoothConnection.transmitter.sync(getClockTimestamp()); // bluetooth transmittion slack delay 10ms
    return true;
  };

  TangleBluetoothDevice.prototype.updateFirmware = function (firmware) {
    //console.log("syncClock()");

    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    this.bluetoothConnection.transmitter.updateFirmware(firmware); // bluetooth transmittion slack delay 10ms
    return true;
  };

  TangleBluetoothDevice.prototype.updateConfig = function (config) {
    //console.log("syncClock()");

    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    this.bluetoothConnection.transmitter.updateConfig(config); // bluetooth transmittion slack delay 10ms
    return true;
  };

  TangleBluetoothDevice.prototype.reboot = function () {
    //console.log("syncClock()");

    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    this.bluetoothConnection.transmitter.deviceReboot(); // bluetooth transmittion slack delay 10ms
    return true;
  };

  ///////////////////////////////////////////////////////////////////////////////////

  /**
   * @name LineBreakTransformer
   * TransformStream to parse the stream into lines.
   */
  class LineBreakTransformer {
    constructor() {
      // A container for holding stream data until a new line.
      this.container = "";
    }

    transform(chunk, controller) {
      // Handle incoming chunk
      this.container += chunk;
      const lines = this.container.split("\n");
      this.container = lines.pop();
      lines.forEach((line) => controller.enqueue(line));
    }

    flush(controller) {
      // Flush the stream.
      controller.enqueue(this.container);
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////

  function TangleSerialTransmitter() {
    this._writing = false;
    this._queue = [];

    this._transmitStream = null;
    //this._transmitStreamWriter = null;
  }

  TangleSerialTransmitter.prototype.attach = function (writableStream) {
    this._transmitStream = writableStream;
  };

  TangleSerialTransmitter.prototype.detach = async function () {
    //console.log("detach()");

    if (this._transmitStream) {
      // if (this._transmitStreamWriter) {
      //   await this._transmitStreamWriter.close().catch(() => {});
      //   this._transmitStreamWriter = null;
      // }
      this._transmitStream = null;
    }
  };

  TangleSerialTransmitter.prototype._writeTerminal = function (payload) {
    //console.log("_writeTerminal()");

    return new Promise(async (resolve, reject) => {
      const bytes = [...toBytes(123456789, 4), ...toBytes(payload.length, 4), ...payload];
      const timeout = 25;

      try {
        const writer = this._transmitStream.getWriter();
        writer.write(new Uint8Array(bytes)).then(() => {
          setTimeout(() => {
            writer.releaseLock();
            resolve();
          }, timeout);
        });
      } catch (error) {
        reject(error);
      }
    });
  };

  // deliver() thansfers data reliably to the Bluetooth Device. It might not be instant.
  // It may even take ages to get to the device, but it will! (in theory)
  TangleSerialTransmitter.prototype.deliver = function (data) {
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
            await this._writeTerminal(item.payload);
          } catch (error) {
            console.warn(error);
            //console.warn("write was unsuccessful");

            // if writing characteristic fail, then stop transmitting
            // but keep data to transmit in queue
            if (item.reliable) this._queue.unshift(item);
            this._writing = false;

            return;
          }

          // let duration = Date.now() - timestamp;
          // console.log("Wrote " + item.payload.length + " bytes in " + duration + " ms (" + item.payload.length / (duration / 1000) / 1024 + " kBps)");
        }
        this._writing = false;
      })();
    }
  };

  // transmit() tryes to transmit data NOW. ASAP. It will fail,
  // if deliver or another transmit is being executed at the moment
  // returns true if transmittion (only transmittion, not receive) was successful
  TangleSerialTransmitter.prototype.transmit = function (data) {
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

  TangleSerialTransmitter.prototype._writeSync = function (timestamp) {
    //console.log("_writeSync()");

    return new Promise(async (resolve, reject) => {

      const payload = [...toBytes(timestamp, 4)];
      const bytes = [...toBytes(987654321, 4), ...toBytes(payload.length, 4), ...payload];

      try {
        const writer = this._transmitStream.getWriter();
        const timeout = 25;
        writer.write(new Uint8Array(bytes)).then(() => {
          setTimeout(() => {
            writer.releaseLock();
            resolve();
          }, timeout);
        });
      } catch (error) {
        reject(error);
      }
    });
  };

  // sync() synchronizes the device clock
  TangleSerialTransmitter.prototype.sync = function (timestamp) {
    //console.log("sync(" + timestamp + ")");

    if (!this._writing) {
      this._writing = true;

      this._writeSync(timestamp).catch((e) => {
        console.warn(e);
      });

      this._writing = false;
    }
  };

  // clears the queue of items to send
  TangleSerialTransmitter.prototype.reset = function () {
    this._writing = false;
    this._queue = [];
  };

  ///////////////////////////////////////////////////////////////////////////////////

  function TangleSerialReceiver() {
    this._receiveStream = null;
    this._receiveStreamReader = null;
    this._receiveTextDecoderDone = null;
  }

  TangleSerialReceiver.prototype.attach = function (readableStream) {
    //console.log("attach()");

    this._receiveStream = readableStream;

    let textDecoder = new window.TextDecoderStream();
    this._receiveTextDecoderDone = this._receiveStream.pipeTo(textDecoder.writable);
    this._receiveStream = textDecoder.readable.pipeThrough(new window.TransformStream(new LineBreakTransformer()));
    //.pipeThrough(new TransformStream(new JSONTransformer()));

    this._receiveStreamReader = this._receiveStream.getReader();
  };

  TangleSerialReceiver.prototype.detach = async function () {
    //console.log("detach()");

    if (this._receiveStream) {
      if (this._receiveStreamReader) {
        await this._receiveStreamReader.cancel().catch(() => { });
        await this._receiveTextDecoderDone.catch(() => { });
        this._receiveStreamReader = null;
      }
      this._receiveStream = null;
    }
  };

  /**
   * @name TangleSerialReceiver.prototype.kickstart
   * Reads data from the input stream until it is interruped in some way. Then it returns.
   * Received data is handled to the processor's funtion onReceive(value).
   */
  TangleSerialReceiver.prototype.kickstart = async function (processor) {
    while (true) {
      try {
        const { value, done } = await this._receiveStreamReader.read();

        if (value) {
          processor.onReceive(value);
        }

        if (done) {
          this._receiveStreamReader.releaseLock();
          return "ReaderDone";
        }
      } catch (error) {
        console.warn(error);
        this.detach();
        return error.name; // "BreakError" or "NetworkError" or "FramingError"
      }
    }
  };

  ///////////////////////////////////////////////////////////////////////////////////

  function TangleSerialConnection() {
    this.PORT_OPTIONS = { baudRate: 1000000 };

    this.serialPort = null;
    this.transmitter = new TangleSerialTransmitter();
    this.receiver = new TangleSerialReceiver();
    this.eventEmitter = tangleEvents;
  }

  TangleSerialConnection.prototype.connected = false;

  TangleSerialConnection.prototype.scan = function () {
    //console.log("scan()");

    if (this.serialPort) {
      this.disconnect();
    }

    return navigator.serial.requestPort().then((port) => {
      this.serialPort = port;
    });
  };

  TangleSerialConnection.prototype.connect = function () {
    //console.log("connect()");

    return this.serialPort
      .open(this.PORT_OPTIONS)
      .then(() => {
        this.transmitter.attach(this.serialPort.writable);
        this.receiver.attach(this.serialPort.readable);
        this.run();
      })
      .catch((error) => {
        return this.disconnect().then(() => {
          throw error;
        });
      });
  };

  TangleSerialConnection.prototype.run = async function () {
    this.connected = true;
    {
      let event = {};
      event.target = this;
      this.eventEmitter.emit("connected", event);
    }

    let obj = {};
    obj.self = this;
    obj.onReceive = function (payload) {
      let event = {};
      event.target = this;
      event.payload = payload;
      this.self.eventEmitter.emit("receive", event);
    };

    let result = await this.receiver.kickstart(obj);
    //console.log(result);

    this.connected = false;
    {
      let event = {};
      event.target = this;
      event.reason = result;
      this.eventEmitter.emit("disconnected", event);
    }
  };

  /**
   * @name TangleSerialConnection.prototype.addEventListener
   * events: "receive", "disconnected", "connected"
   *
   * all events: event.target === the sender object (this)
   * event "receive": event.payload contains received data
   * event "disconnected": event.reason has a string with a disconnect reason
   *
   * @returns unbind function
   */
  TangleSerialConnection.prototype.addEventListener = function (event, callback) {
    return this.eventEmitter.on(event, callback);
  };

  TangleSerialConnection.prototype._close = async function () {
    //console.log("_close()");

    await this.receiver.detach();
    await this.transmitter.detach();

    if (this.serialPort) {
      await this.serialPort.close().catch(() => { });
    }
  };

  TangleSerialConnection.prototype.reconnect = function () {
    //console.log("reconnect()");

    if (this.serialPort) {
      //console.log("Reconnecting serial port...");
      return this._close().then(() => {
        return this.connect();
      });
    } else {
      return this.scan().then(() => {
        return this.connect();
      });
    }
  };

  TangleSerialConnection.prototype.disconnect = function () {
    //console.log("disconnect()");

    if (!this.serialPort) {
      //console.log("Serial port is already disconnected");
      return Promise.resolve();
    }

    if (this.serialPort) {
      //console.log("Disconnecting serial port...");
      return this._close().then(() => {
        this.serialPort = null;
      });
    }
  };

  /** Example TangleDevice implementation
   */

  function TangleSerialDevice() {
    this.serialConnection = new TangleSerialConnection();

    this.serialConnection.addEventListener("disconnected", this.onDisconnected);
    this.serialConnection.addEventListener("connected", this.onConnected);
    this.serialConnection.addEventListener("receive", this.onReceive);

    // auto clock sync loop
    var self = this;
    setInterval(() => {
      if (self.isConnected()) {
        self.syncClock(getClockTimestamp());
      }
    }, 60000);

    window.addEventListener("beforeunload", this.serialConnection.disconnect);
  }

  /**
   * @name TangleSerialDevice.prototype.addEventListener
   * events: "receive", "disconnected", "connected"
   *
   * all events: event.target === the sender object (TangleSerialConnection)
   * event "receive": event.payload contains received data
   * event "disconnected": event.reason has a string with a disconnect reason
   *
   * @returns unbind function
   */
  TangleSerialDevice.prototype.addEventListener = function (event, callback) {
    return this.serialConnection.addEventListener(event, callback);
  };

  TangleSerialDevice.prototype.onDisconnected = function (event) {
    console.log("Serial Device disconnected");

    if (event.reason === "BreakError") {
      setTimeout(() => {
        console.log("Reconnecting device...");
        return event.target
          .reconnect()
          .then(() => {
            event.target.transmitter.sync(getClockTimestamp());
          })
          .catch((error) => {
            console.error(error);
          });
      }, 1000);
    }
  };

  TangleSerialDevice.prototype.onConnected = function (event) {
    console.log("Serial Device connected");
  };

  TangleSerialDevice.prototype.onReceive = function (event) {
    //console.log(">", event.payload);
  };

  TangleSerialDevice.prototype.connect = function () {
    return this.serialConnection
      .scan()
      .then(() => {
        return this.serialConnection.connect();
      })
      .then(() => {
        this.serialConnection.transmitter.sync(getClockTimestamp());
      })
      .catch((error) => {
        console.warn(error);
      });
  };

  TangleSerialDevice.prototype.reconnect = function () {
    return this.serialConnection
      .reconnect()
      .then(() => {
        this.serialConnection.transmitter.sync(getClockTimestamp());
      })
      .catch((error) => {
        console.warn(error);
      });
  };

  TangleSerialDevice.prototype.disconnect = function () {
    return this.serialConnection.disconnect().catch((error) => {
      console.warn(error);
    });
  };

  TangleSerialDevice.prototype.isConnected = function () {
    return this.serialConnection.connected;
  };

  TangleSerialDevice.prototype.uploadTngl = function (tngl_bytes, timeline_index, timeline_timestamp, timeline_paused) {
    //console.log("uploadTngl()");

    if (!this.serialConnection || !this.serialConnection.transmitter) {
      console.warn("Serial device disconnected");
      return false;
    }

    const flags = getTimelineFlags(timeline_index, timeline_paused);
    const timeline_bytes = [FLAGS.FLAG_SET_TIMELINE, ...toBytes(getClockTimestamp(), 4), ...toBytes(timeline_timestamp, 4), flags];

    const payload = [...timeline_bytes, ...tngl_bytes];
    this.serialConnection.transmitter.deliver(payload);

    return true;
  };

  TangleSerialDevice.prototype.setTimeline = function (timeline_index, timeline_timestamp, timeline_paused) {
    //console.log("setTimeline()");

    if (!this.serialConnection || !this.serialConnection.transmitter) {
      console.warn("Serial device disconnected");
      return false;
    }

    const flags = getTimelineFlags(timeline_index, timeline_paused);

    const payload = [FLAGS.FLAG_SET_TIMELINE, ...toBytes(getClockTimestamp(), 4), ...toBytes(timeline_timestamp, 4), flags];
    this.serialConnection.transmitter.deliver(payload);

    return true;
  };

  // event_label example: "evt1"
  // event_value example: 1000
  TangleSerialDevice.prototype.emitTimestampEvent = function (event_label, event_value, event_timestamp, device_id) {


    if (!this.serialConnection || !this.serialConnection.transmitter) {
      console.warn("Serial device disconnected");
      return false;
    }

    const payload = [FLAGS.FLAG_EMIT_TIMESTAMP_EVENT, ...toBytes(event_value, 4), ...labelToBytes(event_label), ...toBytes(event_timestamp, 4), device_id];
    this.serialConnection.transmitter.deliver(payload);

    return true;
  };

  // event_label example: "evt1"
  // event_value example: "#00aaff"
  TangleSerialDevice.prototype.emitColorEvent = function (event_label, event_value, event_timestamp, device_id) {


    if (!this.serialConnection || !this.serialConnection.transmitter) {
      console.warn("Serial device disconnected");
      return false;
    }

    const payload = [FLAGS.FLAG_EMIT_COLOR_EVENT, ...colorToBytes(event_value), ...labelToBytes(event_label), ...toBytes(event_timestamp, 4), device_id];
    this.serialConnection.transmitter.deliver(payload);

    return true;
  };

  // event_label example: "evt1"
  // event_value example: 100.0
  TangleSerialDevice.prototype.emitPercentageEvent = function (event_label, event_value, event_timestamp, device_id) {


    if (!this.serialConnection || !this.serialConnection.transmitter) {
      console.warn("Serial device disconnected");
      return false;
    }

    const payload = [FLAGS.FLAG_EMIT_PERCENTAGE_EVENT, ...percentageToBytes(event_value), ...labelToBytes(event_label), ...toBytes(event_timestamp, 4), device_id];
    this.serialConnection.transmitter.deliver(payload);

    return true;
  };

  // event_label example: "evt1"
  // event_value example: "label"
  TangleSerialDevice.prototype.emitLabelEvent = function (event_label, event_value, event_timestamp, device_id) {


    if (!this.serialConnection || !this.serialConnection.transmitter) {
      console.warn("Serial device disconnected");
      return false;
    }

    const payload = [FLAGS.FLAG_EMIT_LABEL_EVENT, ...labelToBytes(event_value), ...labelToBytes(event_label), ...toBytes(event_timestamp, 4), device_id];
    this.serialConnection.transmitter.deliver(payload);

    return true;
  };



  /* 
  function emitEvents(events)

  events - array of event objects

  event object must have:
    device_id [0; 255]
    code [0; 255]
    parameter [0; 255]
    timeline_timestamp [-2147483648; 2147483647] 


  == EXAMPLE ==

    let events = [];

    let e1 = {};
    e1.code = 0;
    e1.parameter = 0;
    e1.timeline_timestamp = 0;

    let e2 = {};
    e2.code = 0;
    e2.parameter = 255;
    e2.timeline_timestamp = 1000;

    events.push(e1);
    events.push(e2);

    serialdevice.emitEvents(events);

  == EXAMPLE ==
  */

  // TangleSerialDevice.prototype.emitEvents = function (events) {
  //   //console.log("emitEvents()");

  //   if (!this.serialConnection || !this.serialConnection.transmitter) {
  //     console.warn("Serial device disconnected");
  //     return false;
  //   }

  //   let payload = [];

  //   for (let i = 0; i < events.length; i++) {
  //     const e = events[i];
  //     const bytes = [FLAGS.FLAG_EMIT_EVENT, e.device_id, e.code, e.parameter, ...toBytes(e.timeline_timestamp, 4)];
  //     payload.push(...bytes);
  //   }

  //   this.serialConnection.transmitter.deliver(payload);

  //   return true;
  // };

  TangleSerialDevice.prototype.syncTimeline = function (timeline_index, timeline_timestamp, timeline_paused) {
    //console.log("syncTimeline()");

    if (!this.serialConnection || !this.serialConnection.transmitter) {
      console.warn("Serial device disconnected");
      return false;
    }

    const flags = getTimelineFlags(timeline_index, timeline_paused);

    const payload = [FLAGS.FLAG_SET_TIMELINE, ...toBytes(getClockTimestamp(), 4), ...toBytes(timeline_timestamp, 4), flags];
    this.serialConnection.transmitter.transmit(payload);

    return true;
  };

  TangleSerialDevice.prototype.syncClock = function () {
    //console.log("syncClock()");

    if (!this.serialConnection || !this.serialConnection.connected) {
      console.warn("Serial device disconnected");
      return false;
    }

    this.serialConnection.transmitter.sync(getClockTimestamp());
    return true;
  };

  const tangleEvents = createNanoEvents();
  const tnglParser = new TnglCodeParser();
  const timeTrack = new TimeTrack();
  const tangleConnect = window.tangleConnect;
  const tangleBluetoothDevice = new TangleBluetoothDevice();
  const tangleSerialDevice = new TangleSerialDevice();

  window.tangleEvents = tangleEvents;
  window.timeTrack = timeTrack;

  let tangleEventsAndroid = () => { };

  const TangleConnectANDROID = {
    connect: (filters = null) => {
      console.log("Connection is handled by tangleConnect.");
    },
    updateFirmware: (fw) => {
      tangleConnect.updateFirmware(fw);
    },
    // TODO - add  0, timeline_timestamp, timeline_paused) to required function, currently not supported on Java part
    uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
      tangleConnect.uploadTngl(tngl_code, timeline_timestamp, timeline_paused);
      timeTrack.setStatus(timeline_timestamp, timeline_paused);
    },
    uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
      tangleConnect.uploadTnglBytes(tngl_bytes, timeline_timestamp, timeline_paused);
      timeTrack.setStatus(timeline_timestamp, timeline_paused);
    },
    setTimeline: (timeline_timestamp = 0, timeline_paused = false) => {
      tangleConnect.setTimeline(timeline_timestamp, timeline_paused);
      timeTrack.setStatus(timeline_timestamp, timeline_paused);
    },
    emitColorEvent: (event_name, event_data, event_timestamp, device_id) => {
      tangleConnect.emitColorEvent(event_name, event_data, event_timestamp, device_id);
    },
    emitPercentageEvent: (event_name, event_data, event_timestamp, device_id) => {
      tangleConnect.emitPercentageEvent(event_name, event_data, event_timestamp, device_id);
    },
    emitTimeEvent: (event_name, event_data, event_timestamp, device_id) => {
      tangleConnect.emitTimeEvent(event_name, event_data, event_timestamp, device_id);
    },
    // for connection events
    initEvents: () => {
      tangleEventsAndroid = tangleEvents.on(
        "tangle-state",
        (e) => {
          e = e.detail;
          if (e.type === "connection") {
            if (e.status === "connected") {
              tangleEvents.emit("connection", "connected");
            }
            if (e.status === "disconnected") {
              tangleEvents.emit("connection", "disconnected");
            }
            if (e.status === "reconnecting") {
              tangleEvents.emit("connection", "reconnecting");
            }
          }
          if (e.type === "ota_progress") {
            tangleEvents.emit('ota_progress', e.progress);
          }
        },
        false
      );
    },
    destroyEvents: () => {
      tangleEventsAndroid();
    },
  };

  const TangleConnectWEBBLE = {
    connect: (filters = null) => {
      tangleBluetoothDevice.connect();
    },
    disconnect: () => {
      tangleBluetoothDevice.disconnect();
    },
    updateFirmware: (fw) => {
      tangleBluetoothDevice.updateFirmware(fw);
    },
    uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
      const tngl_bytes = tnglParser.parseTnglCode(tngl_code);
      tangleBluetoothDevice.uploadTngl(tngl_bytes, 0x00, timeline_timestamp, timeline_paused);

      timeTrack.setStatus(timeline_timestamp, timeline_paused);
      console.log('uploaded');
    },
    uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
      tangleBluetoothDevice.uploadTngl(tngl_bytes, 0x00, timeline_timestamp, timeline_paused);

      timeTrack.setStatus(timeline_timestamp, timeline_paused);

    },
    setTimeline: (timeline_timestamp = 0, timeline_paused = false) => {
      tangleBluetoothDevice.setTimeline(0, timeline_timestamp, timeline_paused);

      timeTrack.setStatus(timeline_timestamp, timeline_paused);

    },
    emitColorEvent: (event_name, event_data, event_timestamp, device_id) => {
      tangleBluetoothDevice.emitColorEvent(event_name, event_data, event_timestamp, device_id);
    },
    emitPercentageEvent: (event_name, event_data, event_timestamp, device_id) => {
      tangleBluetoothDevice.emitPercentageEvent(event_name, event_data, event_timestamp, device_id);
    },
    emitTimeEvent: (event_name, event_data, event_timestamp, device_id) => {
      tangleBluetoothDevice.emitTimestampEvent(event_name, event_data, event_timestamp, device_id);
    },
    // emitEvent: (event_code, param, device_id = 0) => {
    //   tangleBluetoothDevice.emitEvent(device_id, event_code, param, timeTrack.millis());

    // },
    // emitEvents: (events) => {

    //   tangleBluetoothDevice.emitEvents(events);
    //   // TODO - timestamps autofill current time if not present

    // },
    // for connection events
    initEvents: () => {
      tangleBluetoothDevice.bluetoothConnection.addEventListener(
        "connected",
        () => {
          tangleEvents.emit("connection", "connected");
        }
      );
      tangleBluetoothDevice.bluetoothConnection.addEventListener(
        "disconnected",
        () => {
          tangleEvents.emit("connection", "disconnected");
        }
      );
    },
    destroyEvents: () => {
      tangleBluetoothDevice.bluetoothConnection.removeEventListener(
        "connected",
        () => {
          tangleEvents.emit("connection", "connected");
        }
      );
      tangleBluetoothDevice.bluetoothConnection.removeEventListener(
        "disconnected",
        () => {
          tangleEvents.emit("connection", "disconnected");
        }
      );
    },
  };




  const TangleConnectWEBSerial = {
    connect: (filters = null) => {
      tangleSerialDevice.connect();
    },
    disconnect: () => {
      tangleSerialDevice.disconnect();
    },
    updateFirmware: (fw) => {
      alert('update firmware not supported on web serial');
      tangleSerialDevice.updateFirmware(fw);
    },
    uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
      const tngl_bytes = tnglParser.parseTnglCode(tngl_code);
      tangleSerialDevice.uploadTngl(tngl_bytes, 0, timeline_timestamp, timeline_paused);

      timeTrack.setStatus(timeline_timestamp, timeline_paused);

    },
    uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
      tangleSerialDevice.uploadTngl(tngl_bytes, 0, timeline_timestamp, timeline_paused);

      timeTrack.setStatus(timeline_timestamp, timeline_paused);

    },
    setTimeline: (timeline_timestamp = 0, timeline_paused = false) => {
      tangleSerialDevice.setTimeline(0, timeline_timestamp, timeline_paused);

      timeTrack.setStatus(timeline_timestamp, timeline_paused);

    },

    emitColorEvent: (event_name, event_data, event_timestamp, device_id) => {
      tangleSerialDevice.emitColorEvent(event_name, event_data, event_timestamp, device_id);
    },
    emitPercentageEvent: (event_name, event_data, event_timestamp, device_id) => {
      tangleSerialDevice.emitPercentageEvent(event_name, event_data, event_timestamp, device_id);
    },
    emitTimeEvent: (event_name, event_data, event_timestamp, device_id) => {
      tangleSerialDevice.emitTimeEvent(event_name, event_data, event_timestamp, device_id);
    },
    // emitEvent: (event_code, param, device_id = 0) => {
    //   console.log()

    //   tangleSerialDevice.emitEvent(device_id, event_code, param, timeTrack.millis());

    // },
    // emitEvents: (events) => {

    //   tangleSerialDevice.emitEvents(events);
    //   // TODO - timestamps autofill current time if not present

    // },
    // for connection events
    initEvents: () => {

      tangleSerialDevice.serialConnection.addEventListener(
        "connected",
        () => {
          tangleEvents.emit("connection", "connected");
        }
      );
      tangleSerialDevice.serialConnection.addEventListener(
        "disconnected",
        () => {
          tangleEvents.emit("connection", "disconnected");
        }
      );
    },
    destroyEvents: () => {
      tangleSerialDevice.serialConnection.removeEventListener(
        "connected",
        () => {
          tangleEvents.emit("connection", "connected");
        }
      );
      tangleSerialDevice.serialConnection.removeEventListener(
        "disconnected",
        () => {
          tangleEvents.emit("connection", "disconnected");
        }
      );
    },
  };



  const PlaceHolderConnection = {
    connect: (filters = null) => {
      setTimeout(_ => {
        tangleEvents.emit("connection", "connected");
      }, 200);
    },
    disconnect: () => {
      setTimeout(_ => {
        tangleEvents.emit("connection", "disconnected");
      }, 200);
    },
    updateFirmware: (fw) => {
    },
    uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {

    },
    uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {

    },
    setTimeline: (timeline_timestamp = 0, timeline_paused = false) => {

    },
    emitEvent: (event_code, param, device_id) => {

    },
    emitEvents: (events) => {

    },
    emitColorEvent: (event_name, event_data, event_timestamp, device_id) => { },
    emitPercentageEvent: (event_name, event_data, event_timestamp, device_id) => { },
    emitTimeEvent: (event_name, event_data, event_timestamp, device_id) => { },
    // for connection events
    initEvents: () => {

    },
    destroyEvents: () => {

    },
  };


  var connectors = {
    "android": TangleConnectANDROID,
    "bluetooth": TangleConnectWEBBLE,
    "serial": TangleConnectWEBSerial,
    "none": PlaceHolderConnection
  };

  function TangleDevice() {
    let connectionType = "none";
    let connector = connectors.none;

    (async () => {
      if ("tangleConnect" in window) {
        connectionType = "android";

        connectors['android'].initEvents();

        console.info("Running in Android Bluetooth mode");
      }
      else if ("bluetooth" in window?.navigator && await navigator.bluetooth.getAvailability()) {
        connectionType = "bluetooth";

        console.info("Running in WebBluetooth mode");
      }
      else if ("serial" in window.navigator) {
        connectionType = "serial";

        console.log("Running in TangleSerialDevice mode.");
      } else {
        connectionType = "none";

        console.error("No supported module found, you need to add atleast one supported connection module.", 'Running in placeholder mode (will be handled in future by Tangle Devtools)');
      }
    })();

    connector = connectors[connectionType];
    window.connector = connectors[connectionType];
    window.TangleConnectionType = connectionType;


    function emitMultipleIfArray(func, [event_name, event_data, event_timestamp, device_id]) {
      let promises = [];
      if (typeof device_id === "object" && device_id.length > 0) {
        if (device_id.find(v => v === 255)) {
          device_id = [255];
        }
        for (let dev_id of device_id) {
          promises.push(func(event_name, event_data, event_timestamp, dev_id));
        }
      } else {
        promises.push(func(event_name, event_data, event_timestamp, device_id));
      }
      return Promise.all(promises);
    }

    const connectionHandler = {
      connect: ({ filters, type } = { filters: {} }) => {
        // TODO if connector type is not defined use autodecision algorithm
        if (Object.keys(connectors).includes(type)) {
          connector = connectors[type];
          window.connector = connector;
          // not implemented in TangleConnectors !!!
          // connectors[connectionType].destroyEvents();
          connectionType = type;
          connectors[connectionType].initEvents();
          return connector.connect(filters);
        } else if (connectionType !== 'none') {
          connector = connectors[connectionType];
          // connectors[connectionType].destroyEvents();
          // connectionType = 'bluetooth';
          connector.initEvents();
          return connector.connect(filters);
        }
        else {
          console.error(`Connector ${type} does not exist, or not initialized`);
        }
        debugLog(" .connect", filters);
      },
      disconnect: () => {
        debugLog(" .disconnect");
        return connector.disconnect();
      },
      updateFirmware: (fw) => {
        debugLog(" .updateFirmware", fw);
        return connector.updateFirmware(fw);
      },
      uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
        debugLog(" .uploadTngl", tngl_code, timeline_timestamp, timeline_paused);
        return connector.uploadTngl(tngl_code, timeline_timestamp = 0, timeline_paused = false);
      },
      uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
        debugLog(" .uploadTnglBytes", tngl_bytes, timeline_timestamp, timeline_paused);
        return connector.uploadTnglBytes(tngl_bytes, timeline_timestamp = 0, timeline_paused = false);
      },
      setTimeline: (timeline_timestamp = 0, timeline_paused = false) => {
        debugLog(" .setTime", timeline_timestamp, timeline_paused);
        return connector.setTimeline(timeline_timestamp, timeline_paused);
      },
      emitColorEvent: (event_name, event_data, device_id = 255, event_timestamp = timeTrack.millis()) => {
        debugLog(" .emitColorEvent", event_name, event_data, device_id, event_timestamp);
        return emitMultipleIfArray(connector.emitColorEvent, [event_name, event_data, event_timestamp, device_id]);
      },
      emitPercentageEvent: (event_name, event_data, device_id = 255, event_timestamp = timeTrack.millis()) => {
        debugLog(" .emitPercentageEvent", event_name, event_data, device_id, event_timestamp);
        return emitMultipleIfArray(connector.emitPercentageEvent, [event_name, event_data, event_timestamp, device_id]);
      },
      emitTimeEvent: (event_name, event_data, device_id = 255, event_timestamp = timeTrack.millis()) => {
        debugLog(" .emitTimeEvent", event_name, event_data, device_id, event_timestamp);
        return emitMultipleIfArray(connector.emitTimeEvent, [event_name, event_data, event_timestamp, device_id]);
      },
      // emitEvent: (event_code, param, device_id) => {
      //   debugLog(" .triggeremitEvent", 3, event_code, param, device_id, timeTrack.millis());
      //   return connector.emitEvent(event_code, param, device_id);
      // },
      // emitEvents: (events) => {
      //   debugLog(" .emitEvents", events);
      //   return connector.emitEvents(events);
      // },
      // for connection events
      initEvents: () => {
        return connector.initEvents();
      },
      destroyEvents: () => {
        return connector.destroyEvents();
      },
      getConnectionType: () => {
        return connectionType;
      },
      ...tangleEvents
    };
    window.tangleDevice = connectionHandler;
    return connectionHandler;
  }

  return TangleDevice;

}());
