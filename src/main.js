import TangleBluetoothDevice from "./TangleBluetoothDevice.js";
import TnglCodeParser from "./TangleCodeParser.js";

const tangleBluetoothDevice = new TangleBluetoothDevice();

function TangleDevice() {
	let tangleDevice;

	if ("tangleConnect" in window) {
		const tangleConnect = window.tangleConnect;

		const TangleConnectANDROID = {
			uploadTnglBytes: (v) => {
				console.log("SEND ANDROID", v);
				tangleConnect.uploadTnglBytes(v);
			},
			setTime: tangleConnect.setTime,
		};

		tangleDevice = TangleConnectANDROID;

		console.info("tangleConnect mode");
	} else {
		const TangleConnectWEBBLE = {
			uploadTnglBytes: (v) => {
				console.log("SEND WEB", v);
				tangleBluetoothDevice.uploadTnglBytes(v, 0, false);
			},
			setTime: () => {},
		};
		tangleDevice = TangleConnectWEBBLE;
		console.info("WebBluetooth mode");
	}
	return tangleDevice;
}

export { TnglCodeParser, tangleBluetoothDevice, TangleDevice };
