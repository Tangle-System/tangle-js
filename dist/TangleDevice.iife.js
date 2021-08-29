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

  var timeOffset = new Date().getTime() % 0x7fffffff;

  // The MIT License (MIT)
  // Copyright 2016 Andrey Sitnik <andrey@sitnik.ru>
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


  function debugLog(...args) {
    // if (window.localStorage.getItem('debug') === 'true') {
    console.log(`TangleDevice`, ...args);
    // }
  }


  var FLAGS = Object.freeze({
    /* whole flags */
    FLAG_TNGL_BYTES: 251,
    FLAG_SET_TIMELINE: 252,
    FLAG_EMIT_EVENT: 253,

    /* end of statements with no boundary 255 */
    END_OF_STATEMENT: 254,
    END_OF_TNGL_BYTES: 255,
  });

  var CONSTANTS = Object.freeze({
    APP_DEVICE_ID: 255,
  });

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

  var timeOffset = new Date().getTime() % 0x7fffffff;
  // must be positive int32 (4 bytes)
  function getClockTimestamp() {
    return (new Date().getTime() % 0x7fffffff) - timeOffset;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


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

  //////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////

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

  // Transmitter.prototype.disconnect = function () {
  //   this._service = null;
  //   this._terminalChar = null;
  //   this._syncChar = null;
  // };

  Transmitter.prototype._writeTerminal = function (payload, response) {
  	//console.log("_writeTerminal()");

  	return new Promise(async (resolve, reject) => {
  		const payload_uuid = parseInt(Math.random() * 0xffffffff);
  		const packet_header_size = 12; // 3x 4byte integers: payload_uuid, index_from, payload.length
  		const packet_size = 512; // min size packet_header_size + 1
  		//const packet_size = 128;
  		const bytes_size = packet_size - packet_header_size;

  		let index_from = 0;
  		let index_to = bytes_size;

  		let error = null;

  		while (index_from < payload.length) {
  			if (index_to > payload.length) {
  				index_to = payload.length;
  			}

  			const bytes = [...toBytes(payload_uuid, 4), ...toBytes(index_from, 4), ...toBytes(payload.length, 4), ...payload.slice(index_from, index_to)];

  			try {
  				if (response) {
  					await this._terminalChar.writeValueWithResponse(new Uint8Array(bytes));
  				} else {
  					await this._terminalChar.writeValueWithoutResponse(new Uint8Array(bytes));
  				}
  			} catch (e) {
  				error = e;
  				break;
  			}

  			index_from += bytes_size;
  			index_to = index_from + bytes_size;
  		}

  		if (error) {
  			reject(error);
  		} else {
  			resolve();
  		}
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
  					await this._writeTerminal(item.payload, item.reliable);
  				} catch (error) {
  					console.warn(error);
  					//console.warn("write to the characteristics was unsuccessful");

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
  			} else {
  				reject();
  			}
  		} catch (e) {
  			console.error(e);
  			reject();
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
  		const FLAG_OTA_BEGIN = 255;
  		const FLAG_OTA_WRITE = 0;
  		const FLAG_OTA_END = 254;
  		const FLAG_OTA_RESET = 253;

  		let data_size = 496;

  		let index_from = 0;
  		let index_to = data_size;

  		let written = 0;

  		console.log("OTA UPDATE");

  		console.log(firmware);

  		{
  			//===========// RESET //===========//
  			console.log("OTA RESET");

  			const bytes = [FLAG_OTA_RESET, 0x00, ...toBytes(0x00000000, 4)];

  			try {
  				await this._updateChar.writeValueWithResponse(new Uint8Array(bytes));
  			} catch (error) {
  				console.error(error);
  				reject(error);
  				return;
  			}
  		}

  		await sleep(100);

  		{
  			//===========// BEGIN //===========//
  			console.log("OTA BEGIN");

  			const bytes = [FLAG_OTA_BEGIN, 0x00, ...toBytes(firmware.length, 4)];

  			try {
  				await this._updateChar.writeValueWithResponse(new Uint8Array(bytes));
  			} catch (error) {
  				console.error(error);
  				reject(error);
  				return;
  			}
  		}

  		await sleep(100);

  		const start_timestamp = new Date().getTime();

  		{
  			//===========// WRITE //===========//
  			console.log("OTA WRITE");

  			while (written < firmware.length) {
  				if (index_to > firmware.length) {
  					index_to = firmware.length;
  				}

  				const bytes = [FLAG_OTA_WRITE, 0x00, ...toBytes(written, 4), ...firmware.slice(index_from, index_to)];

  				try {
  					await this._updateChar.writeValueWithResponse(new Uint8Array(bytes));

  					written += index_to - index_from;
  				} catch (error) {
  					console.error(error);
  					reject(error);
  					return;
  				}

  				console.log(Math.floor((written * 10000) / firmware.length) / 100 + "%");

  				index_from += data_size;
  				index_to = index_from + data_size;
  			}
  		}

  		const end_timestamp = new Date().getTime();

  		console.log("Firmware written in " + ((end_timestamp - start_timestamp) / 1000) + " seconds");

  		await sleep(100);

  		{
  			//===========// END //===========//
  			console.log("OTA END");

  			const bytes = [FLAG_OTA_END, 0x00, ...toBytes(written, 4)];

  			try {
  				await this._updateChar.writeValueWithResponse(new Uint8Array(bytes));
  			} catch (error) {
  				console.error(error);
  				reject(error);
  				return;
  			}
  		}

  		resolve();
  	});
  };

  Transmitter.prototype._writeConfig = function (config) {
  	return new Promise(async (resolve, reject) => {
  		const FLAG_CONFIG_BEGIN = 1;
  		const FLAG_CONFIG_WRITE = 2;
  		const FLAG_CONFIG_END = 3;
  		const FLAG_CONFIG_RESET = 4;

  		const data_size = 496;

  		let index_from = 0;
  		let index_to = data_size;

  		let written = 0;

  		console.log("CONFIG UPDATE");

  		console.log(config);

  		{
  			//===========// RESET //===========//
  			console.log("CONFIG RESET");

  			const bytes = [FLAG_CONFIG_RESET, 0x00, ...toBytes(0x00000000, 4)];

  			try {
  				await this._updateChar.writeValueWithResponse(new Uint8Array(bytes));
  			} catch (error) {
  				console.error(error);
  				reject(error);
  				return;
  			}
  		}

  		await sleep(100);

  		{
  			//===========// BEGIN //===========//
  			console.log("CONFIG BEGIN");

  			const bytes = [FLAG_CONFIG_BEGIN, 0x00, ...toBytes(config.length, 4)];

  			try {
  				await this._updateChar.writeValueWithResponse(new Uint8Array(bytes));
  			} catch (error) {
  				console.error(error);
  				reject(error);
  				return;
  			}
  		}

  		await sleep(100);

  		const start_timestamp = new Date().getTime();

  		{
  			//===========// WRITE //===========//
  			console.log("CONFIG WRITE");

  			while (written < config.length) {
  				if (index_to > config.length) {
  					index_to = config.length;
  				}

  				const bytes = [FLAG_CONFIG_WRITE, 0x00, ...toBytes(written, 4), ...config.slice(index_from, index_to)];

  				try {
  					await this._updateChar.writeValueWithResponse(new Uint8Array(bytes));
  					written += index_to - index_from;
  				} catch (error) {
  					console.error(error);
  					reject(error);
  					return;
  				}

  				console.log(Math.floor((written * 10000) / config.length) / 100 + "%");

  				index_from += data_size;
  				index_to = index_from + data_size;
  			}
  		}

  		const end_timestamp = new Date().getTime();

  		console.log("Config written in " + ((end_timestamp - start_timestamp) / 1000) + " seconds");

  		await sleep(100);

  		{
  			//===========// END //===========//
  			console.log("CONFIG END");

  			const bytes = [FLAG_CONFIG_END, 0x00, ...toBytes(written, 4)];

  			try {
  				await this._updateChar.writeValueWithResponse(new Uint8Array(bytes));
  			} catch (error) {
  				console.error(error);
  				reject(error);
  				return;
  			}
  		}

  		resolve();
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
  		console.warn(e);
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
  		console.warn(e);
  		success = false;
  	});

  	this._writing = false;

  	return success;
  };

  // clears the queue of items to send
  Transmitter.prototype.reset = function () {
  	this._writing = false;
  	this._queue = [];
  };

  /////////////////////////////////////////////////////////////////////////////////////

  // Tangle Bluetooth Device

  function TangleBluetoothConnection() {
  	this.TRANSMITTER_SERVICE_UUID = "60cb125a-0000-0007-0000-5ad20c574c10";

  	this.BLE_OPTIONS = {
  		//acceptAllDevices: true,
  		filters: [
  			{ services: [this.TRANSMITTER_SERVICE_UUID] },
  			// {services: [0xffe0, 0x1803]},
  			// {services: ['c48e6067-5295-48d3-8d5c-0395f61792b1']},
  			// {name: 'ExampleName'},
  		],
  		//optionalServices: [this.TRANSMITTER_SERVICE_UUID],
  	};

  	this.bluetoothDevice = null;
  	this.transmitter = null;
  	this.eventEmitter = createNanoEvents();
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

  	//console.log("> Connecting to Bluetooth device...");
  	return this.bluetoothDevice.gatt
  		.connect()
  		.then((server) => {
  			//console.log("> Getting the Bluetooth Service...");
  			return server.getPrimaryService(this.TRANSMITTER_SERVICE_UUID);
  		})
  		.then((service) => {
  			//console.log("> Getting the Service Characteristic...");

  			if (!this.transmitter) {
  				this.transmitter = new Transmitter();
  			}

  			return this.transmitter.attach(service);
  		})
  		.then(() => {
  			this.connected = true;
  			{
  				let event = {};
  				event.target = this;
  				this.eventEmitter.emit("connected", event);
  			}
  		});
  };

  TangleBluetoothConnection.prototype.reconnect = function () {
  	//console.log("reconnect()");

  	if (this.connected && this.bluetoothDevice.gatt.connected) {
  		//console.log("> Bluetooth Device is already connected");
  		return Promise.resolve();
  	}
  	return this.connect();
  };

  TangleBluetoothConnection.prototype.disconnect = function () {
  	//console.log("disconnect()");

  	if (!this.bluetoothDevice) {
  		return;
  	}

  	//console.log("> Disconnecting from Bluetooth Device...");

  	// wanted disconnect removes the transmitter
  	this.transmitter = null;

  	if (this.connected && this.bluetoothDevice.gatt.connected) {
  		this.bluetoothDevice.gatt.disconnect();
  	}
  };

  // Object event.target is Bluetooth Device getting disconnected.
  TangleBluetoothConnection.prototype.onDisconnected = function (e) {
  	//console.log("> Bluetooth Device disconnected");

  	let self = e.target.connection;

  	self.connected = false;
  	{
  		let event = {};
  		event.target = self;
  		self.eventEmitter.emit("disconnected", event);
  	}
  };

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

    if (event.target.transmitter) {
      setTimeout(() => {
        console.log("Reconnecting device...");
        return event.target
          .reconnect()
          .then(async () => {
            let success = false;

            for (let index = 0; index < 3; index++) {
              await sleep(500);
              try {
                if (await this.bluetoothConnection.transmitter.sync(getClockTimestamp())) {
                  success = true;
                  break;
                }
              } catch (e) {
                console.error("time sync failed");
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
        return this.bluetoothConnection.connect();
      })
      .then(async () => {
        let success = false;

        for (let index = 0; index < 3; index++) {
          await sleep(500);
          try {
            if (await this.bluetoothConnection.transmitter.sync(getClockTimestamp())) {
              success = true;
              break;
            }
          } catch (e) {
            console.error("time sync failed");
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
      });
  };

  TangleBluetoothDevice.prototype.reconnect = function () {
    return this.bluetoothConnection
      .reconnect()
      .then(async () => {
        let success = false;

        for (let index = 0; index < 3; index++) {
          await sleep(500);
          try {
            if (await this.bluetoothConnection.transmitter.sync(getClockTimestamp())) {
              success = true;
              break;
            }
          } catch (e) {
            console.error("time sync failed");
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
  TangleBluetoothDevice.prototype.emitTimestampEvent = function (event_label, event_value_timestamp, event_timestamp, device_id) {
    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    const payload = [FLAGS.FLAG_EMIT_TIMESTAMP_EVENT, ...toBytes(event_value_timestamp, 4), ...labelToBytes(event_label), ...toBytes(event_timestamp, 4), device_id];
    this.bluetoothConnection.transmitter.deliver(payload);

    return true;
  };

  // event_label example: "evt1"
  // event_value example: "#00aaff"
  TangleBluetoothDevice.prototype.emitColorEvent = function (event_label, event_value, event_timestamp, device_id) {
    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    const payload = [FLAGS.FLAG_EMIT_COLOR_EVENT, ...colorToBytes(event_value), ...labelToBytes(event_label), ...toBytes(event_timestamp, 4), device_id];
    this.bluetoothConnection.transmitter.deliver(payload);

    return true;
  };

  // event_label example: "evt1"
  // event_value example: 100.0
  TangleBluetoothDevice.prototype.emitPercentageEvent = function (event_label, event_value, event_timestamp, device_id) {
    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    const payload = [FLAGS.FLAG_EMIT_PERCENTAGE_EVENT, ...percentageToBytes(event_value), ...labelToBytes(event_label), ...toBytes(event_timestamp, 4), device_id];
    this.bluetoothConnection.transmitter.deliver(payload);

    return true;
  };

  // event_label example: "evt1"
  // event_value example: "label"
  TangleBluetoothDevice.prototype.emitLabelEvent = function (event_label, event_value, event_timestamp, device_id) {
    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    const payload = [FLAGS.FLAG_EMIT_LABEL_EVENT, ...labelToBytes(event_value), ...labelToBytes(event_label), ...toBytes(event_timestamp, 4), device_id];
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

  var CONSTANTS$1 = Object.freeze({
  	MODIFIER_SWITCH_NONE: 0,
  	MODIFIER_SWITCH_RG: 1,
  	MODIFIER_SWITCH_GB: 2,
  	MODIFIER_SWITCH_BR: 3,
  });

  var FLAGS$1 = Object.freeze({
  	/* no code or command used by decoder as a validation */
  	NONE: 0,

  	// ======================

  	/* drawings */
  	DRAWING_SET: 1,
  	DRAWING_ADD: 2,
  	DRAWING_SUB: 3,
  	DRAWING_SCALE: 4,
  	DRAWING_FILTER: 5,

  	_DRAWINGS_BEGIN: 1,
  	_DRAWINGS_END: 5,

  	/* windows */
  	WINDOW_SET: 6,
  	WINDOW_ADD: 7,
  	WINDOW_SUB: 8,
  	WINDOW_SCALE: 9,
  	WINDOW_FILTER: 10,

  	_WINDOWS_BEGIN: 6,
  	_WINDOWS_END: 10,

  	/* frame */
  	FRAME: 11,

  	/* clip */
  	CLIP: 12,

  	/* sifters */
  	SIFTER_DEVICE: 13,
  	SIFTER_TANGLE: 14,
  	SIFTER_GROUP: 15,

  	_SIFTERS_BEGIN: 13,
  	_SIFTERS_END: 15,

  	/* event handlers */
  	INTERACTIVE: 16,
  	EVENT_HANDLE: 17,

  	/* definitions scoped */
  	DEFINE_VARIABLE: 18,

  	_BLOCKS_BOUNDARY: 18,

  	// ======================

  	/* definitions global */
  	DEFINE_DEVICE: 24,
  	DEFINE_TANGLE: 25,
  	DEFINE_GROUP: 26,
  	DEFINE_MARKS: 27,
  	DEFINE_ANIMATION: 28,
  	DEFINE_EMITTER: 28,

  	_DEFINITIONS_BEGIN: 24,
  	_DEFINITIONS_END: 28,

  	_DEFINITIONS_BOUNDARY: 28,

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

  	_ANIMATIONS_BEGIN: 32,
  	_ANIMATIONS_END: 41,

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

  	_MODIFIERS_BEGIN: 128,
  	_MODIFIERS_END: 136,

  	/* events */
  	GENERATOR_LAST_EVENT_VALUE: 144,
  	GENERATOR_SMOOTHOUT: 145,
  	GENERATOR_SINE: 146,
  	GENERATOR_SAW: 147,
  	GENERATOR_TRIANGLE: 148,
  	GENERATOR_SQUARE: 149,
  	GENERATOR_PERLIN_NOISE: 150,

  	_GENERATORS_BEGIN: 144,
  	_GENERATORS_END: 150,

  	/* variable operations gates */
  	VARIABLE_READ: 160,
  	VARIABLE_ADD: 161,
  	VARIABLE_SUB: 162,
  	VARIABLE_MUL: 163,
  	VARIABLE_DIV: 164,
  	VARIABLE_MOD: 165,
  	VARIABLE_SCALE: 166,
  	VARIABLE_MAP: 167,

  	_COMPUTATIONALS_BEGIN: 160,
  	_COMPUTATIONALS_END: 167,

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

  	_COMPLEMENTARY_BOUNDARY: 185,

  	// ======================

  	/* values */
  	TIMESTAMP: 188,
  	COLOR: 189,
  	PERCENTAGE: 190,
  	LABEL: 191,
  	PIXELS: 192,
  	TUPLE: 193,

  	_VALUES_BOUNDARY: 193,

  	// ======================

  	/* most used constants */
  	TIMESTAMP_ZERO: 194,
  	TIMESTAMP_MAX: 195,
  	TIMESTAMP_MIN: 196,
  	COLOR_WHITE: 197,
  	COLOR_BLACK: 198,

  	_CONSTANTS_BOUNDARY: 198,

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
  	END_OF_TNGL_BYTES: 255,

  	_CONTROL_BOUNDARY: 255,
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

  		payload.fillFlag(FLAGS$1.NONE);
  	};

  	compiler.compileInfinity = function (infinity) {
  		let reg = infinity.match(/([+-]?Infinity)/);
  		if (!reg) {
  			console.error("Failed to compile a infinity");
  			return;
  		}

  		if (reg[1] == "Infinity" || reg[1] == "+Infinity") {
  			payload.fillFlag(FLAGS$1.TIMESTAMP_MAX);
  		} else if (reg[1] == "-Infinity") {
  			payload.fillFlag(FLAGS$1.TIMESTAMP_MIN);
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
  			payload.fillFlag(FLAGS$1.TIMESTAMP_ZERO);
  		} else {
  			payload.fillFlag(FLAGS$1.TIMESTAMP);
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
  			payload.fillFlag(FLAGS$1.COLOR_WHITE);
  		} else if (r == 0 && g == 0 && b == 0) {
  			payload.fillFlag(FLAGS$1.COLOR_BLACK);
  		} else {
  			payload.fillFlag(FLAGS$1.COLOR);
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

  		payload.fillFlag(FLAGS$1.PERCENTAGE);
  		payload.fillInt32(parseInt(remapped));
  	};

  	// takes label string as "$label" and encodes it into 32 bits
  	compiler.compileLabel = function (label) {
  		let reg = label.match(/\$([\w]*)/);
  		if (!reg) {
  			console.error("Failed to compile a label");
  			return;
  		}

  		payload.fillFlag(FLAGS$1.LABEL);
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

  		payload.fillFlag(FLAGS$1.PIXELS);
  		payload.fillInt16(count);
  	};

  	///////////////////////////////////////////////////////////

  	compiler.compileWord = function (word) {
  		switch (word) {
  			// === canvas operations ===
  			case "setDrawing":
  				payload.fillFlag(FLAGS$1.DRAWING_SET);
  				break;
  			case "addDrawing":
  				payload.fillFlag(FLAGS$1.DRAWING_ADD);
  				break;
  			case "subDrawing":
  				payload.fillFlag(FLAGS$1.DRAWING_SUB);
  				break;
  			case "scaDrawing":
  				payload.fillFlag(FLAGS$1.DRAWING_SCALE);
  				break;
  			case "filDrawing":
  				payload.fillFlag(FLAGS$1.DRAWING_FILTER);
  				break;
  			case "setWindow":
  				payload.fillFlag(FLAGS$1.WINDOW_SET);
  				break;
  			case "addWindow":
  				payload.fillFlag(FLAGS$1.WINDOW_ADD);
  				break;
  			case "subWindow":
  				payload.fillFlag(FLAGS$1.WINDOW_SUB);
  				break;
  			case "scaWindow":
  				payload.fillFlag(FLAGS$1.WINDOW_SCALE);
  				break;
  			case "filWindow":
  				payload.fillFlag(FLAGS$1.WINDOW_FILTER);

  				// === time operations ===
  				break;
  			case "frame":
  				payload.fillFlag(FLAGS$1.FRAME);
  				break;

  			// === animations ===
  			case "animDefined":
  				payload.fillFlag(FLAGS$1.ANIMATION_DEFINED);
  				break;
  			case "animNone":
  				payload.fillFlag(FLAGS$1.ANIMATION_NONE);
  				break;
  			case "animFill":
  				payload.fillFlag(FLAGS$1.ANIMATION_FILL);
  				break;
  			case "animRainbow":
  				payload.fillFlag(FLAGS$1.ANIMATION_RAINBOW);
  				break;
  			case "animPlasmaShot":
  				payload.fillFlag(FLAGS$1.ANIMATION_PROJECTILE);
  				break;
  			case "animLoadingBar":
  				payload.fillFlag(FLAGS$1.ANIMATION_LOADING);
  				break;
  			case "animFade":
  				payload.fillFlag(FLAGS$1.ANIMATION_FADE);
  				break;
  			case "animColorRoll":
  				payload.fillFlag(FLAGS$1.ANIMATION_COLOR_ROLL);
  				break;
  			case "animPaletteRoll":
  				payload.fillFlag(FLAGS$1.ANIMATION_PALLETTE_ROLL);
  				break;

  			// === handlers ===
  			case "interactive":
  				payload.fillFlag(FLAGS$1.INTERACTIVE);
  				break;

  			// === clip ===
  			case "clip":
  				payload.fillFlag(FLAGS$1.CLIP);
  				break;

  			// === definitions ===
  			case "defAnimation":
  				payload.fillFlag(FLAGS$1.DEFINE_ANIMATION);
  				break;
  			case "defDevice":
  				payload.fillFlag(FLAGS$1.DEFINE_DEVICE);
  				break;
  			case "defTangle":
  				payload.fillFlag(FLAGS$1.DEFINE_TANGLE);
  				break;
  			case "defGroup":
  				payload.fillFlag(FLAGS$1.DEFINE_GROUP);
  				break;
  			case "defMarks":
  				payload.fillFlag(FLAGS$1.DEFINE_MARKS);
  				break;
  			case "defVariable":
  				payload.fillFlag(FLAGS$1.DEFINE_VARIABLE);
  				break;

  			// === sifters ===
  			case "siftDevices":
  				payload.fillFlag(FLAGS$1.SIFTER_DEVICE);
  				break;
  			case "siftTangles":
  				payload.fillFlag(FLAGS$1.SIFTER_TANGLE);
  				break;
  			case "siftGroups":
  				payload.fillFlag(FLAGS$1.SIFTER_GROUP);
  				break;

  			// === objects ===
  			case "device":
  				payload.fillFlag(FLAGS$1.DEVICE);
  				break;
  			case "tangle":
  				payload.fillFlag(FLAGS$1.TANGLE);
  				break;
  			case "slice":
  				payload.fillFlag(FLAGS$1.SLICE);
  				break;
  			case "port":
  				payload.fillFlag(FLAGS$1.PORT);
  				break;
  			case "group":
  				payload.fillFlag(FLAGS$1.GROUP);
  				break;
  			case "marks":
  				payload.fillFlag(FLAGS$1.MARKS);
  				break;

  			// === modifiers ===
  			case "modifyBrightness":
  				payload.fillFlag(FLAGS$1.MODIFIER_BRIGHTNESS);
  				break;
  			case "modifyTimeline":
  				payload.fillFlag(FLAGS$1.MODIFIER_TIMELINE);
  				break;
  			case "modifyFadeIn":
  				payload.fillFlag(FLAGS$1.MODIFIER_FADE_IN);
  				break;
  			case "modifyFadeOut":
  				payload.fillFlag(FLAGS$1.MODIFIER_FADE_OUT);
  				break;
  			case "modifyColorSwitch":
  				payload.fillFlag(FLAGS$1.MODIFIER_SWITCH_COLORS);
  				break;
  			case "modifyTimeLoop":
  				payload.fillFlag(FLAGS$1.MODIFIER_TIME_LOOP);
  				break;
  			case "modifyTimeScale":
  				payload.fillFlag(FLAGS$1.MODIFIER_TIME_SCALE);
  				break;
  			case "modifyTimeScaleSmoothed":
  				payload.fillFlag(FLAGS$1.MODIFIER_TIME_SCALE_SMOOTHED);
  				break;
  			case "modifyTimeChange":
  				payload.fillFlag(FLAGS$1.MODIFIER_TIME_CHANGE);
  				break;

  			// === events ===
  			case "handleEvent":
  				payload.fillFlag(FLAGS$1.EVENT_HANDLE);
  				break;
  			case "setValue":
  				payload.fillFlag(FLAGS$1.EVENT_SET_VALUE);
  				break;
  			case "emitAs":
  				payload.fillFlag(FLAGS$1.EVENT_EMIT_LOCAL);
  				break;

  			// === generators ===
  			case "genLastEventParam":
  				payload.fillFlag(FLAGS$1.GENERATOR_LAST_EVENT_VALUE);
  				break;
  			case "genSine":
  				payload.fillFlag(FLAGS$1.GENERATOR_SINE);
  				break;
  			case "genSaw":
  				payload.fillFlag(FLAGS$1.GENERATOR_SAW);
  				break;
  			case "genTriangle":
  				payload.fillFlag(FLAGS$1.GENERATOR_TRIANGLE);
  				break;
  			case "genSquare":
  				payload.fillFlag(FLAGS$1.GENERATOR_SQUARE);
  				break;
  			case "genPerlinNoise":
  				payload.fillFlag(FLAGS$1.GENERATOR_PERLIN_NOISE);
  				break;
  			case "genSmoothOut":
  				payload.fillFlag(FLAGS$1.GENERATOR_SMOOTHOUT);
  				break;

  			/* === variable operations === */

  			case "variable":
  				payload.fillFlag(FLAGS$1.VARIABLE_READ);
  				break;
  			case "genSmoothOut":
  				payload.fillFlag(FLAGS$1.VARIABLE_SMOOTH_TIMED);
  				break;
  			case "addValues":
  				payload.fillFlag(FLAGS$1.VARIABLE_ADD);
  				break;
  			case "subValues":
  				payload.fillFlag(FLAGS$1.VARIABLE_SUB);
  				break;
  			case "mulValues":
  				payload.fillFlag(FLAGS$1.VARIABLE_MUL);
  				break;
  			case "divValues":
  				payload.fillFlag(FLAGS$1.VARIABLE_DIV);
  				break;
  			case "modValues":
  				payload.fillFlag(FLAGS$1.VARIABLE_MOD);
  				break;
  			case "scaValue":
  				payload.fillFlag(FLAGS$1.VARIABLE_SCALE);
  				break;
  			case "mapValue":
  				payload.fillFlag(FLAGS$1.VARIABLE_MAP);
  				break;

  			// === constants ===
  			case "true":
  				payload.fillUInt8(0x01);
  				break;
  			case "false":
  				payload.fillUInt8(0x00);
  				break;

  			case "MODIFIER_SWITCH_NONE":
  				payload.fillByte(CONSTANTS$1.MODIFIER_SWITCH_NONE);
  				break;
  			case "MODIFIER_SWITCH_RG":
  			case "MODIFIER_SWITCH_GR":
  				payload.fillByte(CONSTANTS$1.MODIFIER_SWITCH_RG);
  				break;
  			case "MODIFIER_SWITCH_GB":
  			case "MODIFIER_SWITCH_BG":
  				payload.fillByte(CONSTANTS$1.MODIFIER_SWITCH_GB);
  				break;
  			case "MODIFIER_SWITCH_BR":
  			case "MODIFIER_SWITCH_RB":
  				payload.fillByte(CONSTANTS$1.MODIFIER_SWITCH_BR);
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

  	compiler.compileFlag(FLAGS$1.FLAG_TNGL_BYTES);

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
  					payload.fillFlag(FLAGS$1.END_OF_STATEMENT);
  				}
  				break;

  			default:
  				console.warn("Unknown token type >", element.type, "<");
  				break;
  		}
  	}

  	// if (element.type === "whitespace") {
  	//   continue; // skip
  	// } else if (element.type === "char") {
  	// } else if (element.type === "byte") {
  	//   payload.fillByte(element.matches[0]);
  	// } else if (element.type === "string") {
  	//   for (let index = 0; index < 8; index++) {
  	//     payload.fillUInt8(element.matches[0].charCodeAt(index));
  	//   }
  	// } else if (element.type === "punctuation") {
  	//   if (element.matches[0] === "{") {
  	//     continue; // skip
  	//   } else if (element.matches[0] === "}") {
  	//     payload.fillFlag(FLAGS.END_OF_STATEMENT);
  	//   } else if (element.matches[0] === "[") {
  	//     continue; // skip
  	//   } else if (element.matches[0] === "]") {
  	//     continue; // skip
  	//   } else if (element.matches[0] === "(") {
  	//     continue; // skip
  	//   } else if (element.matches[0] === ")") {
  	//     continue; // skip
  	//   } else if (element.matches[0] === ";") {
  	//     continue; // skip
  	//   } else if (element.matches[0] === ".") {
  	//     continue; // skip
  	//   } else if (element.matches[0] === ",") {
  	//     continue; // skip
  	//   } else {
  	//     console.warn("Unknown punctuation >", element.matches[0], "<");
  	//   }
  	// } else if (element.type === "word") {
  	//   // === true, false ===

  	//   if (element.matches[0] === "true") {
  	//     payload.fillUInt8(0x01);
  	//   } else if (element.matches[0] === "false") {
  	//     payload.fillUInt8(0x00);
  	//   }

  	//   // === canvas operations ===
  	//   else if (element.matches[0] === "setDrawing") {
  	//     payload.fillFlag(FLAGS.DRAWING_SET);
  	//   } else if (element.matches[0] === "addDrawing") {
  	//     payload.fillFlag(FLAGS.DRAWING_ADD);
  	//   } else if (element.matches[0] === "subDrawing") {
  	//     payload.fillFlag(FLAGS.DRAWING_SUB);
  	//   } else if (element.matches[0] === "scaDrawing") {
  	//     payload.fillFlag(FLAGS.DRAWING_SCALE);
  	//   } else if (element.matches[0] === "filDrawing") {
  	//     payload.fillFlag(FLAGS.DRAWING_FILTER);
  	//   } else if (element.matches[0] === "setWindow") {
  	//     payload.fillFlag(FLAGS.WINDOW_SET);
  	//   } else if (element.matches[0] === "addWindow") {
  	//     payload.fillFlag(FLAGS.WINDOW_ADD);
  	//   } else if (element.matches[0] === "subWindow") {
  	//     payload.fillFlag(FLAGS.WINDOW_SUB);
  	//   } else if (element.matches[0] === "scaWindow") {
  	//     payload.fillFlag(FLAGS.WINDOW_SCALE);
  	//   } else if (element.matches[0] === "filWindow") {
  	//     payload.fillFlag(FLAGS.WINDOW_FILTER);
  	//   }

  	//   // === time operations ===
  	//   else if (element.matches[0] === "frame") {
  	//     payload.fillFlag(FLAGS.FRAME);
  	//   }

  	//   // === animations ===
  	//   else if (element.matches[0] === "animDefined") {
  	//     payload.fillFlag(FLAGS.ANIMATION_DEFINED);
  	//   } else if (element.matches[0] === "animNone") {
  	//     payload.fillFlag(FLAGS.ANIMATION_NONE);
  	//   } else if (element.matches[0] === "animFill") {
  	//     payload.fillFlag(FLAGS.ANIMATION_FILL);
  	//   } else if (element.matches[0] === "animRainbow") {
  	//     payload.fillFlag(FLAGS.ANIMATION_RAINBOW);
  	//   } else if (element.matches[0] === "animPlasmaShot") {
  	//     payload.fillFlag(FLAGS.ANIMATION_PROJECTILE);
  	//   } else if (element.matches[0] === "animLoadingBar") {
  	//     payload.fillFlag(FLAGS.ANIMATION_LOADING);
  	//   } else if (element.matches[0] === "animFade") {
  	//     payload.fillFlag(FLAGS.ANIMATION_FADE);
  	//   } else if (element.matches[0] === "animColorRoll") {
  	//     payload.fillFlag(FLAGS.ANIMATION_COLOR_ROLL);
  	//   } else if (element.matches[0] === "animPaletteRoll") {
  	//     payload.fillFlag(FLAGS.ANIMATION_PALLETTE_ROLL);
  	//   }

  	//   // === handlers ===
  	//   else if (element.matches[0] === "eventHandler") {
  	//     payload.fillFlag(FLAGS.EVENT_HANDLER);
  	//   }

  	//   // === clip ===
  	//   else if (element.matches[0] === "clip") {
  	//     payload.fillFlag(FLAGS.CLIP);
  	//   }

  	//   // === definitions ===
  	//   else if (element.matches[0] === "defAnimation") {
  	//     payload.fillFlag(FLAGS.DEFINE_ANIMATION);
  	//   } else if (element.matches[0] === "defDevice1") {
  	//     payload.fillFlag(FLAGS.DEFINE_DEVICE_1PORT);
  	//   } else if (element.matches[0] === "defDevice2") {
  	//     payload.fillFlag(FLAGS.DEFINE_DEVICE_2PORT);
  	//   } else if (element.matches[0] === "defDevice4") {
  	//     payload.fillFlag(FLAGS.DEFINE_DEVICE_4PORT);
  	//   } else if (element.matches[0] === "defDevice8") {
  	//     payload.fillFlag(FLAGS.DEFINE_DEVICE_8PORT);
  	//   } else if (element.matches[0] === "defTangle") {
  	//     payload.fillFlag(FLAGS.DEFINE_TANGLE);
  	//   } else if (element.matches[0] === "defGroup") {
  	//     payload.fillFlag(FLAGS.DEFINE_GROUP);
  	//   } else if (element.matches[0] === "defMarks") {
  	//     payload.fillFlag(FLAGS.DEFINE_MARKS);
  	//   }

  	//   // === sifters ===
  	//   else if (element.matches[0] === "siftDevices") {
  	//     payload.fillFlag(FLAGS.SIFT_DEVICE);
  	//   } else if (element.matches[0] === "siftTangles") {
  	//     payload.fillFlag(FLAGS.SIFT_TANGLE);
  	//   } else if (element.matches[0] === "siftGroups") {
  	//     payload.fillFlag(FLAGS.SIFT_GROUP);
  	//   }

  	//   // === variables ===
  	//   else if (element.matches[0] === "device") {
  	//     payload.fillFlag(FLAGS.DEVICE);
  	//   } else if (element.matches[0] === "tangle") {
  	//     payload.fillFlag(FLAGS.TANGLE);
  	//   } else if (element.matches[0] === "pixels") {
  	//     payload.fillFlag(FLAGS.PIXELS);
  	//   } else if (element.matches[0] === "port") {
  	//     payload.fillFlag(FLAGS.PORT);
  	//   } else if (element.matches[0] === "group") {
  	//     payload.fillFlag(FLAGS.GROUP);
  	//   } else if (element.matches[0] === "mark") {
  	//     payload.fillFlag(FLAGS.MARK);
  	//   } else if (element.matches[0] === "value") {
  	//     payload.fillFlag(FLAGS.VALUE);
  	//   } else if (element.matches[0] === "channel") {
  	//     payload.fillFlag(FLAGS.CHANNEL);
  	//   } else if (element.matches[0] === "event") {
  	//     payload.fillFlag(FLAGS.EVENT);
  	//   }

  	//   // === modifiers ===
  	//   else if (element.matches[0] === "modifyBrightness") {
  	//     payload.fillFlag(FLAGS.MODIFIER_BRIGHTNESS);
  	//   } else if (element.matches[0] === "modifyTimeline") {
  	//     payload.fillFlag(FLAGS.MODIFIER_TIMELINE);
  	//   } else if (element.matches[0] === "modifyFadeIn") {
  	//     payload.fillFlag(FLAGS.MODIFIER_FADE_IN);
  	//   } else if (element.matches[0] === "modifyFadeOut") {
  	//     payload.fillFlag(FLAGS.MODIFIER_FADE_OUT);
  	//   } else if (element.matches[0] === "modifyColorSwitch") {
  	//     payload.fillFlag(FLAGS.MODIFIER_SWITCH_COLORS);
  	//   } else if (element.matches[0] === "modifyTimeLoop") {
  	//     payload.fillFlag(FLAGS.MODIFIER_TIME_LOOP);
  	//   } else if (element.matches[0] === "modifyTimeScale") {
  	//     payload.fillFlag(FLAGS.MODIFIER_TIME_SCALE);
  	//   } else if (element.matches[0] === "modifyTimeScaleSmoothed") {
  	//     payload.fillFlag(FLAGS.MODIFIER_TIME_SCALE_SMOOTHED);
  	//   } else if (element.matches[0] === "modifyTimeChange") {
  	//     payload.fillFlag(FLAGS.MODIFIER_TIME_CHANGE);
  	//   }

  	//   // === filters ===
  	//   else if (element.matches[0] === "filterNone") {
  	//     payload.fillFlag(FLAGS.FILTER_NONE);
  	//   } else if (element.matches[0] === "filterBlur") {
  	//     payload.fillFlag(FLAGS.FILTER_BLUR);
  	//   } else if (element.matches[0] === "filterColorShift") {
  	//     payload.fillFlag(FLAGS.FILTER_COLOR_SHIFT);
  	//   } else if (element.matches[0] === "filterMirror") {
  	//     payload.fillFlag(FLAGS.FILTER_MIRROR);
  	//   } else if (element.matches[0] === "filterScatter") {
  	//     payload.fillFlag(FLAGS.FILTER_SCATTER);
  	//   }

  	//   // === channels ===
  	//   else if (element.matches[0] === "writeChannel") {
  	//     payload.fillFlag(FLAGS.CHANNEL_WRITE);
  	//   } else if (element.matches[0] === "eventParameterValue") {
  	//     payload.fillFlag(FLAGS.CHANNEL_PARAMETER_VALUE);
  	//   } else if (element.matches[0] === "eventParameterValueSmoothed") {
  	//     payload.fillFlag(FLAGS.CHANNEL_PARAMETER_VALUE_SMOOTHED);
  	//   } else if (element.matches[0] === "addValues") {
  	//     payload.fillFlag(FLAGS.CHANNEL_ADD_VALUES);
  	//   } else if (element.matches[0] === "subValues") {
  	//     payload.fillFlag(FLAGS.CHANNEL_SUB_VALUES);
  	//   } else if (element.matches[0] === "mulValues") {
  	//     payload.fillFlag(FLAGS.CHANNEL_MUL_VALUES);
  	//   } else if (element.matches[0] === "divValues") {
  	//     payload.fillFlag(FLAGS.CHANNEL_DIV_VALUES);
  	//   } else if (element.matches[0] === "modValues") {
  	//     payload.fillFlag(FLAGS.CHANNEL_MOD_VALUES);
  	//   } else if (element.matches[0] === "scaValue") {
  	//     payload.fillFlag(FLAGS.CHANNEL_SCALE_VALUE);
  	//   } else if (element.matches[0] === "mapValue") {
  	//     payload.fillFlag(FLAGS.CHANNEL_MAP_VALUE);
  	//   }

  	//   // === events ===
  	//   else if (element.matches[0] === "emitLocalEvent") {
  	//     payload.fillFlag(FLAGS.EVENT_EMIT_LOCAL);
  	//   } else if (element.matches[0] === "onEvent") {
  	//     payload.fillFlag(FLAGS.EVENT_ON);
  	//   } else if (element.matches[0] === "setEventParam") {
  	//     payload.fillFlag(FLAGS.EVENT_SET_PARAM);
  	//   }

  	//   // === constants ===
  	//   else if (element.matches[0] === "MODIFIER_SWITCH_NONE") {
  	//     payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_NONE);
  	//   } else if (element.matches[0] === "MODIFIER_SWITCH_RG") {
  	//     payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_RG);
  	//   } else if (element.matches[0] === "MODIFIER_SWITCH_GR") {
  	//     payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_RG);
  	//   } else if (element.matches[0] === "MODIFIER_SWITCH_GB") {
  	//     payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_GB);
  	//   } else if (element.matches[0] === "MODIFIER_SWITCH_BG") {
  	//     payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_GB);
  	//   } else if (element.matches[0] === "MODIFIER_SWITCH_BR") {
  	//     payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_BR);
  	//   } else if (element.matches[0] === "MODIFIER_SWITCH_RB") {
  	//     payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_BR);
  	//   }

  	//   // === unknown ===
  	//   else {
  	//     console.warn("Unknown word >", element.matches[0], "<");
  	//   }
  	// } else if (element.type === "percentage") {
  	//   payload.fillPercentage(element.matches[0]);
  	// } else if (element.type === "number") {
  	//   payload.fillInt32(element.matches[0]);
  	// } else if (element.type === "arrow") {
  	//   continue; // skip
  	// } else {
  	//   console.warn("Unknown type >", element.type, "<");
  	// }

  	compiler.compileFlag(FLAGS$1.END_OF_TNGL_BYTES);

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

  //////////////
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
    this.eventEmitter = createNanoEvents();
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
  TangleSerialDevice.prototype.emitTimestampEvent = function (event_label, event_value_timestamp, event_timestamp, device_id) {


    if (!this.serialConnection || !this.serialConnection.transmitter) {
      console.warn("Serial device disconnected");
      return false;
    }

    const payload = [FLAGS.FLAG_EMIT_TIMESTAMP_EVENT, ...toBytes(event_value_timestamp, 4), ...labelToBytes(event_label), ...toBytes(event_timestamp, 4), device_id];
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

  const tnglParser = new TnglCodeParser();
  const timeTrack = new TimeTrack();
  const tangleConnect = window.tangleConnect;
  const tangleBluetoothDevice = new TangleBluetoothDevice();
  const tangleSerialDevice = new TangleSerialDevice();
  const nanoevents = createNanoEvents();

  window.nanoevents = nanoevents;

  const TangleConnectANDROID = {
    connect: (filters = null) => {
      console.log("Connection is handled by tangleConnect.");
    },
    // TODO - add  0, timeline_timestamp, timeline_paused) to required function, currently not supported on Java part
    uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
      console.info("posilam TNGL Kod uploadTngl()");
      tangleConnect.uploadTngl(tngl_code, 0, timeline_timestamp, timeline_paused);
      timeTrack.setStatus(timeline_timestamp, timeline_paused);
    },
    uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
      console.info("posilam TNGL bajty uploadTnglBytes()");
      tangleConnect.uploadTnglBytes(tngl_bytes, 0, timeline_timestamp, timeline_paused);
      timeTrack.setStatus(timeline_timestamp, timeline_paused);
    },
    setTimeline: (timeline_timestamp = 0, timeline_paused = false) => {
      console.info("posilam setTime setTime()");
      tangleConnect.setTimeline(timeline_timestamp, timeline_paused);
      timeTrack.setStatus(timeline_timestamp, timeline_paused);
    },
    emitEvent: (event_code, param, device_id = 0) => {
      console.info("posilam emitEvent()");

      tangleConnect.emitEvent(device_id, event_code, param, timeTrack.millis());
    },
    emitEvents: (events) => {
      console.info("posilam emitEvents()");

      tangleConnect.emitEvents(events);
    },
    // for connection events
    initEvents: () => {

      document.addEventListener(
        "tangle-state",
        (e) => {
          e = e.detail;
          if (e.type === "connection") {
            if (e.status === "connected") {
              nanoevents.emit("connection", "connected");
            }
            if (e.status === "disconnected") {
              nanoevents.emit("connection", "disconnected");
            }
            if (e.status === "reconnecting") {
              nanoevents.emit("connection", "reconnecting");
            }
          }
        },
        false
      );
    },
    destroyEvents: () => {
      document.removeEventListener(
        "tangle-state",
        (e) => {
          e = e.detail;
          if (e.type === "connection") {
            if (e.status === "connected") {
              nanoevents.emit("connection", "connected");
            }
            if (e.status === "disconnected") {
              nanoevents.emit("connection", "disconnected");
            }
            if (e.status === "reconnecting") {
              nanoevents.emit("connection", "reconnecting");
            }
          }
        },
        false
      );
    },
    ...nanoevents

  };

  const TangleConnectWEBBLE = {
    connect: (filters = null) => {
      tangleBluetoothDevice.connect();
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
    emitEvent: (event_code, param, device_id = 0) => {
      tangleBluetoothDevice.emitEvent(device_id, event_code, param, timeTrack.millis());

    },
    emitEvents: (events) => {

      tangleBluetoothDevice.emitEvents(events);
      // TODO - timestamps autofill current time if not present

    },
    // for connection events
    initEvents: () => {
      tangleBluetoothDevice.bluetoothConnection.addEventListener(
        "connected",
        () => {
          nanoevents.emit("connection", "connected");
        }
      );
      tangleBluetoothDevice.bluetoothConnection.addEventListener(
        "disconnected",
        () => {
          nanoevents.emit("connection", "disconnected");
        }
      );
    },
    destroyEvents: () => {
      tangleBluetoothDevice.bluetoothConnection.removeEventListener(
        "connected",
        () => {
          nanoevents.emit("connection", "connected");
        }
      );
      tangleBluetoothDevice.bluetoothConnection.removeEventListener(
        "disconnected",
        () => {
          nanoevents.emit("connection", "disconnected");
        }
      );
    },
    ...nanoevents
  };




  const TangleConnectWEBSerial = {
    connect: (filters = null) => {
      tangleSerialDevice.connect();
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
    emitEvent: (event_code, param, device_id = 0) => {
      console.log();

      tangleSerialDevice.emitEvent(device_id, event_code, param, timeTrack.millis());

    },
    emitEvents: (events) => {

      tangleSerialDevice.emitEvents(events);
      // TODO - timestamps autofill current time if not present

    },
    // for connection events
    initEvents: () => {

      tangleSerialDevice.serialConnection.addEventListener(
        "connected",
        () => {
          nanoevents.emit("connection", "connected");
        }
      );
      tangleSerialDevice.serialConnection.addEventListener(
        "disconnected",
        () => {
          nanoevents.emit("connection", "disconnected");
        }
      );
    },
    destroyEvents: () => {
      tangleSerialDevice.serialConnection.removeEventListener(
        "connected",
        () => {
          nanoevents.emit("connection", "connected");
        }
      );
      tangleSerialDevice.serialConnection.removeEventListener(
        "disconnected",
        () => {
          nanoevents.emit("connection", "disconnected");
        }
      );
    },
    ...nanoevents
  };



  const PlaceHolderConnection = {
    connect: (filters = null) => {
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
    // for connection events
    initEvents: () => {

    },
    destroyEvents: () => {

    },
    ...nanoevents
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


    if ("tangleConnect" in window) {
      connectionType = "android";

      console.info("Running in Android Bluetooth mode");
    }
    else if ("bluetooth" in window?.navigator) {
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
    connector = connectors[connectionType];
    window.connector = connectors[connectionType];


    const connectionHandler = {
      connect: ({ filters, type } = {}) => {
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
          connectionType = type;
          connector.initEvents();
          return connector.connect(filters);
        }
        else {
          console.error(`Connector ${type} does not exist, or not initialized`);
        }
        debugLog(" .connect", filters);
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
      emitEvent: (event_code, param, device_id) => {
        debugLog(" .triggeremitEvent", 3, event_code, param, device_id, timeTrack.millis());
        return connector.emitEvent(event_code, param, device_id);
      },
      emitEvents: (events) => {
        debugLog(" .emitEvents", events);
        return connector.emitEvents(events);
      },
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
      ...nanoevents

    };
    window.tangleDevice = connectionHandler;
    return connectionHandler;
  }

  return TangleDevice;

}());
