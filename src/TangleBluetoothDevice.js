import { getTimestamp, toBytes } from "./functions.js";
import TangleBluetoothConnection from "./TangleBluetoothConnection.js";

export default function TangleBluetoothDevice() {
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
