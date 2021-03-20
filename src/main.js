import TangleBluetoothDevice from "./TangleBluetoothDevice.js";
import TnglCodeParser from "./TangleCodeParser.js";

const tangleBluetoothDevice = new TangleBluetoothDevice();

const TangleConnectWEBBLE = {
	uploadTngl: tangleBluetoothDevice.uploadTngl,
};

let tangleDevice;

if ("tangleConnect" in window) {
	const tangleConnect = window.tangleConnect;

	const TangleConnectANDROID = {
		uploadTngl: tangleConnect.uploadTngl,
	};

	TangleDevice = TangleConnectANDROID;

	console.info("tangleConnect mode");
} else {
	TangleDevice = TangleConnectWEBBLE;
	console.info("WebBluetooth mode");
}

export { TnglCodeParser, tangleBluetoothDevice, tangleDevice };
