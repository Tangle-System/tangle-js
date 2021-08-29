var TangleBluetoothDevice = (function () {
  'use strict';

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

  return TangleBluetoothDevice;

}());
