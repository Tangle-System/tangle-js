import TangleBluetoothDevice from "./TangleBluetoothDevice.js";
import TnglCodeParser from "./TangleCodeParser.js";

const tangleBluetoothDevice = new TangleBluetoothDevice();

function TangleDevice() {

	const tnglParser = new TnglCodeParser();

	let tangleDevice;

	if ("tangleConnect" in window) {

		const tangleConnect = window.tangleConnect;

		const TangleConnectANDROID = {
			uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
				console.info('posilam TNGL Kod uploadTngl()')
				tangleBluetoothDevice.uploadTngl(tngl_code, timeline_timestamp, timeline_paused);
			},
			uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
				console.info('posilam TNGL bajty uploadTnglBytes()')
				tangleConnect.uploadTnglBytes(tngl_bytes, timeline_timestamp, timeline_paused);
			},
			setTime: (timeline_timestamp = 0, timeline_paused = false) => {
				console.info('posilam setTime setTime()')
				tangleConnect.setTime(timeline_timestamp, timeline_paused);
			},
		};

		tangleDevice = TangleConnectANDROID;

		console.info("Running in Android Bluetooth mode");

	} else {
		const TangleConnectWEBBLE = {
			uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
				const tngl_bytes = tnglParser.parseTnglCode(tngl_code)
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

export { TnglCodeParser, tangleBluetoothDevice, TangleDevice };
