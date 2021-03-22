'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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
		acceptAllDevices: true,
		//   filters: [
		//     { services: [TRANSMITTER_SERVICE_UUID] }
		//     // {services: [0xffe0, 0x1803]},
		//     // {services: ['c48e6067-5295-48d3-8d5c-0395f61792b1']},
		//     // {name: 'ExampleName'},
		//   ]
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
	//console.log("uploadTnglBytes()");

	if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
		console.warn("Bluetooth device disconnected");
		return false;
	}

	const FLAG_SYNC_TIMELINE = 242;
	const payload = [
		FLAG_SYNC_TIMELINE,
		...toBytes(getTimestamp(), 4),
		...toBytes(timeline_timestamp, 4),
		timeline_paused ? 1 : 0,
		...tngl_bytes,
	];
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
	const payload = [
		FLAG_SYNC_TIMELINE,
		...toBytes(getTimestamp(), 4),
		...toBytes(timeline_timestamp, 4),
		timeline_paused ? 1 : 0,
	];
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
	const payload = [
		FLAG_SYNC_TIMELINE,
		...toBytes(getTimestamp(), 4),
		...toBytes(timeline_timestamp, 4),
		timeline_paused ? 1 : 0,
	];
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

function TnglCodeParser() { }

TnglCodeParser.prototype.TRIGGERS = Object.freeze({
	/* null */
	NONE: 0,
	TOUCH: 1,
	MOVEMENT: 2,
	KEYPRESS: 3,
	TEST: 255,
});

TnglCodeParser.prototype.FLAGS = Object.freeze({
	/* no code or command used by decoder as a validation */
	NONE: 0,

	/* handlers 1 -> 30 */
	HANDLER_TOUCH: 1,
	HANDLER_MOVEMENT: 2,
	HANDLER_KEYPRESS: 3,

	/* drawings 31 -> 36 */
	DRAWING_SET: 31,
	DRAWING_ADD: 32,
	DRAWING_SUB: 33,
	DRAWING_MUL: 34,
	DRAWING_FIL: 35,

	/* windows 37 -> 42 */
	WINDOW_SET: 37,
	WINDOW_ADD: 38,
	WINDOW_SUB: 39,
	WINDOW_MUL: 40,
	WINDOW_FIL: 41,

	/* frame 43 */
	FRAME: 43,

	/* clip 44 */
	CLIP: 44,

	/* time manipulation 45 */
	TIMETRANSFORMER: 45,

	/* sifters 46 -> 53 */
	SIFT_DEVICE: 46,
	SIFT_TANGLE: 47,
	SIFT_GROUP: 48,

	/* animations 54 -> 182 */
	ANIMATION_NONE: 54,
	ANIMATION_FILL: 55,
	ANIMATION_RAINBOW: 56,
	ANIMATION_FADE: 57,
	ANIMATION_PROJECTILE: 58,
	ANIMATION_LOADING: 59,
	ANIMATION_COLOR_ROLL: 60,
	ANIMATION_PALLETTE_ROLL: 61,
	ANIMATION_INL_ANI: 62,

	/* effects 189 -> 206 */
	EFFECT_FADEIN: 189,
	EFFECT_FADEOUT: 190,
	EFFECT_BLURE: 191,
	EFFECT_SCATTER: 192,
	EFFECT_STRIPEIFY: 193,
	EFFECT_INVERT: 194,

	/* variables 207 -> 222 */
	DEVICE: 207,
	TANGLE: 208,
	PIXELS: 209,
	NEOPIXEL: 210,
	GROUP: 211,
	MARK: 212,

	/* definitions 223 -> 238 */
	DEFINE_DEVICE: 223,
	DEFINE_TANGLE: 224,
	DEFINE_GROUP: 225,
	DEFINE_MARKS: 226,

	/* control codes 239 -> 254 */
	COMMAND_SET_TIME_OFFSET: 239,

	FLAG_TNGL_BYTES: 240,
	FLAG_TRIGGER: 241,
	FLAG_SYNC_TIMELINE: 242,

	/* end of statements with no boundary 255 */
	END_OF_STATEMENT: 254,
	END_OF_TNGL_BYTES: 255,
});

TnglCodeParser.prototype.parseTnglCode = function (tngl_code) {
	const buffer = new ArrayBuffer(65535);
	const payload = new DataView(buffer);

	payload.cursor = 0;

	payload.fillCommand = function (tngl_code) {
		payload.setUint8(payload.cursor++, tngl_code);
	};

	payload.fillUInt8 = function (value) {
		payload.setUint8(payload.cursor++, value);
	};

	payload.fillByte = function (value) {
		payload.setUint8(payload.cursor++, parseInt(value, 16));
	};

	payload.fillInt32 = function (value) {
		payload.setUint8(payload.cursor++, value);
		payload.setUint8(payload.cursor++, value >> 8);
		payload.setUint8(payload.cursor++, value >> 16);
		payload.setUint8(payload.cursor++, value >> 24);
	};

	payload.fillRGB = function (r, g, b) {
		payload.setUint8(payload.cursor++, r);
		payload.setUint8(payload.cursor++, g);
		payload.setUint8(payload.cursor++, b);
	};

	payload.fillPercentage = function (percent) {
		payload.setUint8(payload.cursor++, Math.floor((percent / 100.0) * 255));
	};

	const parses = {
		htmlrgb: /#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/i,
		string: /"([\w ]*)"/,
		char: /'([\W\w])'/,
		byte: /(0[xX][0-9a-fA-F][0-9a-fA-F](?![0-9a-fA-F]))/,
		word: /([a-zA-Z_]+)/,
		percentage: /([\d.]+)%/,
		float: /([+-]?[0-9]*[.][0-9]+)/,
		number: /([+-]?[0-9]+)/,
		whitespace: /(\s+)/,
		punctuation: /([^\w\s])/,
	};

	//console.log(tngl_code);
	const tokens = this._tokenize(tngl_code, parses);
	//console.log(tokens);

	payload.fillCommand(this.FLAGS.FLAG_TNGL_BYTES);

	for (let index = 0; index < tokens.length; index++) {
		const element = tokens[index];

		if (element.type === "whitespace") {
			continue;
		} else if (element.type === "char") {
			payload.fillUInt8(element.matches[0].charCodeAt(0));
		} else if (element.type === "byte") {
			payload.fillByte(element.matches[0]);
		} else if (element.type === "string") {
			for (let index = 0; index < 8; index++) {
				payload.fillUInt8(element.matches[0].charCodeAt(index));
			}
		} else if (element.type === "punctuation") {
			if (element.matches[0] === "{") {
				continue;
			} else if (element.matches[0] === "}") {
				payload.fillCommand(this.FLAGS.END_OF_STATEMENT);
			} else if (element.matches[0] === "[") {
				continue;
			} else if (element.matches[0] === "]") {
				continue;
			} else if (element.matches[0] === "(") {
				continue;
			} else if (element.matches[0] === ")") {
				continue;
			} else if (element.matches[0] === ";") {
				continue;
			} else if (element.matches[0] === ".") {
				continue;
			} else if (element.matches[0] === ",") {
				continue;
			} else {
				console.warn("Unknown punctuation >", element.matches[0], "<");
			}
		} else if (element.type === "word") {
			// === true, false ===

			if (element.matches[0] === "true") {
				payload.fillUInt8(1);
			} else if (element.matches[0] === "false") {
				payload.fillUInt8(0);
			}

			// === canvas operations ===
			else if (element.matches[0] === "setDrawing") {
				payload.fillCommand(this.FLAGS.DRAWING_SET);
			} else if (element.matches[0] === "addDrawing") {
				payload.fillCommand(this.FLAGS.DRAWING_ADD);
			} else if (element.matches[0] === "subDrawing") {
				payload.fillCommand(this.FLAGS.DRAWING_SUB);
			} else if (element.matches[0] === "mulDrawing") {
				payload.fillCommand(this.FLAGS.DRAWING_MUL);
			} else if (element.matches[0] === "filDrawing") {
				payload.fillCommand(this.FLAGS.DRAWING_FIL);
			} else if (element.matches[0] === "setWindow") {
				payload.fillCommand(this.FLAGS.WINDOW_SET);
			} else if (element.matches[0] === "addWindow") {
				payload.fillCommand(this.FLAGS.WINDOW_ADD);
			} else if (element.matches[0] === "subWindow") {
				payload.fillCommand(this.FLAGS.WINDOW_SUB);
			} else if (element.matches[0] === "mulWindow") {
				payload.fillCommand(this.FLAGS.WINDOW_MUL);
			} else if (element.matches[0] === "filWindow") {
				payload.fillCommand(this.FLAGS.WINDOW_FIL);
			}

			// === time operations ===
			else if (element.matches[0] === "frame") {
				payload.fillCommand(this.FLAGS.FRAME);
			} else if (element.matches[0] === "timetransformer") {
				payload.fillCommand(this.FLAGS.TIMETRANSFORMER);
			}

			// === animations ===
			else if (element.matches[0] === "animNone") {
				payload.fillCommand(this.FLAGS.ANIMATION_NONE);
			} else if (element.matches[0] === "animFill") {
				payload.fillCommand(this.FLAGS.ANIMATION_FILL);
			} else if (element.matches[0] === "animRainbow") {
				payload.fillCommand(this.FLAGS.ANIMATION_RAINBOW);
			} else if (element.matches[0] === "animPlasmaShot") {
				payload.fillCommand(this.FLAGS.ANIMATION_PROJECTILE);
			} else if (element.matches[0] === "animLoadingBar") {
				payload.fillCommand(this.FLAGS.ANIMATION_LOADING);
			} else if (element.matches[0] === "animFade") {
				payload.fillCommand(this.FLAGS.ANIMATION_FADE);
			} else if (element.matches[0] === "animColorRoll") {
				payload.fillCommand(this.FLAGS.ANIMATION_COLOR_ROLL);
			} else if (element.matches[0] === "animPaletteRoll") {
				payload.fillCommand(this.FLAGS.ANIMATION_PALLETTE_ROLL);
			}

			// === handlers ===
			else if (element.matches[0] === "handlerTouch") {
				payload.fillCommand(this.FLAGS.HANDLER_TOUCH);
			} else if (element.matches[0] === "handlerMovement") {
				payload.fillCommand(this.FLAGS.HANDLER_MOVEMENT);
			} else if (element.matches[0] === "handlerKeyPress") {
				payload.fillCommand(this.FLAGS.HANDLER_KEYPRESS);
			}

			// === clip ===
			else if (element.matches[0] === "clip") {
				payload.fillCommand(this.FLAGS.CLIP);
			}

			// === definitions ===
			else if (element.matches[0] === "defDevice") {
				payload.fillCommand(this.FLAGS.DEFINE_DEVICE);
			} else if (element.matches[0] === "defTangle") {
				payload.fillCommand(this.FLAGS.DEFINE_TANGLE);
			} else if (element.matches[0] === "defGroup") {
				payload.fillCommand(this.FLAGS.DEFINE_GROUP);
			} else if (element.matches[0] === "defMarks") {
				payload.fillCommand(this.FLAGS.DEFINE_MARKS);
			}

			// === sifters ===
			else if (element.matches[0] === "siftDevices") {
				payload.fillCommand(this.FLAGS.SIFT_DEVICE);
			} else if (element.matches[0] === "siftTangles") {
				payload.fillCommand(this.FLAGS.SIFT_TANGLE);
			} else if (element.matches[0] === "siftGroups") {
				payload.fillCommand(this.FLAGS.SIFT_GROUP);
			}

			// === variables ===
			else if (element.matches[0] === "device") {
				payload.fillCommand(this.FLAGS.DEVICE);
			} else if (element.matches[0] === "tangle") {
				payload.fillCommand(this.FLAGS.TANGLE);
			} else if (element.matches[0] === "pixels") {
				payload.fillCommand(this.FLAGS.PIXELS);
			} else if (element.matches[0] === "neopixel") {
				payload.fillCommand(this.FLAGS.NEOPIXEL);
			} else if (element.matches[0] === "group") {
				payload.fillCommand(this.FLAGS.GROUP);
			} else if (element.matches[0] === "mark") {
				payload.fillCommand(this.FLAGS.MARK);
			}

			// === other ===
			else if (element.matches[0] === "next") ; else {
				console.warn("Unknown word >", element.matches[0], "<");
			}
		} else if (element.type === "percentage") {
			payload.fillPercentage(element.matches[0]);
		} else if (element.type === "number") {
			payload.fillInt32(element.matches[0]);
		}
		// else if (element.type === "float") {
		//   payload.fillFloat(element.matches[0]);
		// }
		else if (element.type === "htmlrgb") {
			payload.fillRGB(
				parseInt(element.matches[0], 16),
				parseInt(element.matches[1], 16),
				parseInt(element.matches[2], 16)
			);
		} else {
			console.warn("Unknown type >", element.type, "<");
		}
	}

	payload.fillCommand(this.FLAGS.END_OF_TNGL_BYTES);

	let tngl_bytes = new Uint8Array(buffer, 0, payload.cursor);
	//console.log(tngl_bytes);
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

// // LZW-compress a string
// function lzw_encode(s) {
//   var dict = {};
//   var data = (s + "").split("");
//   var out = [];
//   var currChar;
//   var phrase = data[0];
//   var code = 256;
//   for (var i=1; i<data.length; i++) {
//       currChar=data[i];
//       if (dict[phrase + currChar] != null) {
//           phrase += currChar;
//       }
//       else {
//           out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
//           dict[phrase + currChar] = code;
//           code++;
//           phrase=currChar;
//       }
//   }
//   out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
//   for (var i=0; i<out.length; i++) {
//       out[i] = String.fromCharCode(out[i]);
//   }
//   return out.join("");
// }

// // Decompress an LZW-encoded string
// function lzw_decode(s) {
//   var dict = {};
//   var data = (s + "").split("");
//   var currChar = data[0];
//   var oldPhrase = currChar;
//   var out = [currChar];
//   var code = 256;
//   var phrase;
//   for (var i=1; i<data.length; i++) {
//       var currCode = data[i].charCodeAt(0);
//       if (currCode < 256) {
//           phrase = data[i];
//       }
//       else {
//          phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
//       }
//       out.push(phrase);
//       currChar = phrase.charAt(0);
//       dict[code] = oldPhrase + currChar;
//       code++;
//       oldPhrase = phrase;
//   }
//   return out.join("");
// }

const tangleBluetoothDevice = new TangleBluetoothDevice();

function TangleDevice() {

	const tnglParser = new TnglCodeParser();

	let tangleDevice;

	if ("tangleConnect" in window) {

		const tangleConnect = window.tangleConnect;

		const TangleConnectANDROID = {
			uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
				console.info('posilam TNGL Kod uploadTngl()');
				tangleBluetoothDevice.uploadTngl(tngl_code, timeline_timestamp, timeline_paused);
			},
			uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
				console.info('posilam TNGL bajty uploadTnglBytes()');
				tangleConnect.uploadTnglBytes(tngl_bytes, timeline_timestamp, timeline_paused);
			},
			setTime: (timeline_timestamp = 0, timeline_paused = false) => {
				console.info('posilam setTime setTime()');
				tangleConnect.setTime(timeline_timestamp, timeline_paused);
			},
		};

		tangleDevice = TangleConnectANDROID;

		console.info("Running in Android Bluetooth mode");

	} else {
		const TangleConnectWEBBLE = {
			uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
				const tngl_bytes = tnglParser.parseTnglCode(tngl_code);
				tangleBluetoothDevice.uploadTnglBytes(tngl_bytes, timeline_timestamp, timeline_paused);
			},
			uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
				tangleBluetoothDevice.uploadTnglBytes(tngl_bytes, timeline_timestamp, timeline_paused);
			},
			setTime: (timeline_timestamp = 0, timeline_paused = false) => {
				tangleBluetoothDevice.setTime(timeline_timestamp, timeline_paused);
			},
		};

		tangleDevice = TangleConnectWEBBLE;

		console.info("Running in WebBluetooth mode");
	}
	return tangleDevice;
}

exports.TangleDevice = TangleDevice;
exports.TnglCodeParser = TnglCodeParser;
exports.tangleBluetoothDevice = tangleBluetoothDevice;
