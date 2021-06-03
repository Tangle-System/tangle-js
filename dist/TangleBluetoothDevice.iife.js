var TangleBluetoothDevice = (function () {
  'use strict';

  var timeOffset = new Date().getTime() % 0x7fffffff;
  // must be positive int32_t (4 bytes)
  function getTimestamp() {
    return (new Date().getTime() % 0x7fffffff) - timeOffset;
  }

  function toBytes(value, byteCount) {
    var byteArray = [];
    for (var index = 0; index < byteCount; index++) {
      var byte = value & 0xff;
      byteArray.push(byte);
      value = (value - byte) / 256;
    }
    return byteArray;
  }

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

  //////////////////////////////////////////////////////////////////////////
  function Transmitter() {
  	this.TERMINAL_CHAR_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
  	this.SYNC_CHAR_UUID = "0000ffe2-0000-1000-8000-00805f9b34fb";

  	this._service = null;
  	this._terminalChar = null;
  	this._syncChar = null;
  	this._writing = false;
  	this._queue = [];
  }

  Transmitter.prototype.attach = function (service) {
  	this._service = service;

  	return this._service
  		.getCharacteristic(this.TERMINAL_CHAR_UUID)
  		.then((characteristic) => {
  			this._terminalChar = characteristic;
  			return this._service.getCharacteristic(this.SYNC_CHAR_UUID);
  		})
  		.then((characteristic) => {
  			this._syncChar = characteristic;
  			this.deliver(); // kick off transfering thread if there are item in queue
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

  			const bytes = [
  				...toBytes(payload_uuid, 4),
  				...toBytes(index_from, 4),
  				...toBytes(payload.length, 4),
  				...payload.slice(index_from, index_to),
  			];

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
  		const bytes = [...toBytes(timestamp, 4)];
  		await this._syncChar.writeValueWithoutResponse(new Uint8Array(bytes)).catch((e) => {
  			//console.warn(e);
  		});
  		await this._syncChar.writeValueWithoutResponse(new Uint8Array([])).catch((e) => {
  			//console.warn(e);
  		});

  		resolve();
  	});
  };

  // sync() synchronizes the device clock
  Transmitter.prototype.sync = async function (timestamp) {
  	//console.log("sync(" + timestamp +")");

  	if (!this._writing) {
  		this._writing = true;

  		this._writeSync(timestamp);

  		this._writing = false;
  	}
  };

  // clears the queue of items to send
  Transmitter.prototype.reset = function () {
  	this._writing = false;
  	this._queue = [];
  };

  /////////////////////////////////////////////////////////////////////////////////////

  // Tangle Bluetooth Device

  function TangleBluetoothConnection() {
  	this.TRANSMITTER_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";

  	this.BLE_OPTIONS = {
  		// acceptAllDevices: true,
  		//   filters: [
  		//     { services: [TRANSMITTER_SERVICE_UUID] }
  		//     // {services: [0xffe0, 0x1803]},
  		//     // {services: ['c48e6067-5295-48d3-8d5c-0395f61792b1']},
  		//     // {name: 'ExampleName'},
  		//   ]
  		filters: [
  			// { services: [TRANSMITTER_SERVICE_UUID] }
  			// {services: [0xffe0, 0x1803]},
  			// {services: ['c48e6067-5295-48d3-8d5c-0395f61792b1']},
  			// {name: 'ExampleName'},
  			{ namePrefix: "A" },
  			{ namePrefix: "a" },
  			{ namePrefix: "B" },
  			{ namePrefix: "b" },
  			{ namePrefix: "C" },
  			{ namePrefix: "c" },
  			{ namePrefix: "D" },
  			{ namePrefix: "d" },
  			{ namePrefix: "E" },
  			{ namePrefix: "e" },
  			{ namePrefix: "F" },
  			{ namePrefix: "f" },
  			{ namePrefix: "G" },
  			{ namePrefix: "g" },
  			{ namePrefix: "H" },
  			{ namePrefix: "h" },
  			{ namePrefix: "I" },
  			{ namePrefix: "i" },
  			{ namePrefix: "J" },
  			{ namePrefix: "j" },
  			{ namePrefix: "K" },
  			{ namePrefix: "k" },
  			{ namePrefix: "L" },
  			{ namePrefix: "l" },
  			{ namePrefix: "M" },
  			{ namePrefix: "m" },
  			{ namePrefix: "N" },
  			{ namePrefix: "n" },
  			{ namePrefix: "O" },
  			{ namePrefix: "o" },
  			{ namePrefix: "P" },
  			{ namePrefix: "p" },
  			{ namePrefix: "Q" },
  			{ namePrefix: "q" },
  			{ namePrefix: "R" },
  			{ namePrefix: "r" },
  			{ namePrefix: "S" },
  			{ namePrefix: "s" },
  			{ namePrefix: "T" },
  			{ namePrefix: "t" },
  			{ namePrefix: "U" },
  			{ namePrefix: "u" },
  			{ namePrefix: "V" },
  			{ namePrefix: "v" },
  			{ namePrefix: "W" },
  			{ namePrefix: "w" },
  			{ namePrefix: "X" },
  			{ namePrefix: "x" },
  			{ namePrefix: "Y" },
  			{ namePrefix: "y" },
  			{ namePrefix: "Z" },
  			{ namePrefix: "z" },
  		],
  		optionalServices: [this.TRANSMITTER_SERVICE_UUID],
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

  TangleBluetoothConnection.prototype.scan = function (params) {
  	//console.log("scan()");

  	if (this.bluetoothDevice) {
  		this.disconnect();
  	}

  	return navigator.bluetooth.requestDevice(params ? params : this.BLE_OPTIONS).then((device) => {
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
        self.syncClock(getTimestamp());
      }
    }, 10000);

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
          .then(() => {
            event.target.transmitter.sync(getTimestamp());
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

  TangleBluetoothDevice.prototype.connect = function (params = null) {
    return this.bluetoothConnection
      .scan(params)
      .then(() => {
        return this.bluetoothConnection.connect();
      })
      .then(() => {
        this.bluetoothConnection.transmitter.sync(getTimestamp());
      })
      .catch((error) => {
        console.warn(error);
      });
  };

  TangleBluetoothDevice.prototype.reconnect = function () {
    return this.bluetoothConnection
      .reconnect()
      .then(() => {
        this.bluetoothConnection.transmitter.sync(getTimestamp());
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

  TangleBluetoothDevice.prototype.uploadTnglBytes = function (tngl_bytes, timeline_timestamp, timeline_paused) {
    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }
    const clock_timestamp = getTimestamp();

    const FLAG_SYNC_TIMELINE = 242;
    const payload = [...tngl_bytes, FLAG_SYNC_TIMELINE, ...toBytes(clock_timestamp, 4), ...toBytes(timeline_timestamp, 4), timeline_paused ? 1 : 0];
    this.bluetoothConnection.transmitter.deliver(payload);

    return true;
  };

  TangleBluetoothDevice.prototype.setTime = function (timeline_timestamp, timeline_paused) {
    //console.log("setTime()");

    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    const FLAG_SYNC_TIMELINE = 242;
    const payload = [FLAG_SYNC_TIMELINE, ...toBytes(getTimestamp(), 4), ...toBytes(timeline_timestamp, 4), timeline_paused ? 1 : 0];
    this.bluetoothConnection.transmitter.deliver(payload);

    return true;
  };

  TangleBluetoothDevice.prototype.writeTrigger = function (trigger_type, trigger_param, timeline_timestamp) {
    //console.log("writeTrigger()");

    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    const FLAG_TRIGGER = 241;
    const payload = [FLAG_TRIGGER, 0, trigger_type, trigger_param, ...toBytes(timeline_timestamp, 4)];
    this.bluetoothConnection.transmitter.deliver(payload);

    return true;
  };

  TangleBluetoothDevice.prototype.syncTime = function (timeline_timestamp, timeline_paused) {
    //console.log("syncTime()");

    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    const FLAG_SYNC_TIMELINE = 242;
    const payload = [FLAG_SYNC_TIMELINE, ...toBytes(getTimestamp(), 4), ...toBytes(timeline_timestamp, 4), timeline_paused ? 1 : 0];
    this.bluetoothConnection.transmitter.transmit(payload);

    return true;
  };

  TangleBluetoothDevice.prototype.syncClock = function () {
    //console.log("syncClock()");

    if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
      console.warn("Bluetooth device disconnected");
      return false;
    }

    this.bluetoothConnection.transmitter.sync(getTimestamp()); // bluetooth transmittion slack delay 10ms
    return true;
  }; /////////////////////////////////////////////////////////////////////////

  return TangleBluetoothDevice;

}());
