import TnglCodeParser from "./TangleCodeParser.js";

export default function TangleDevice({ ble, serial } = { ble: null, serial: null }) {

  const tnglParser = new TnglCodeParser();

  let tangleDevice;

  const tangleBluetoothDevice = ble;
  const tangleSerialDevice = serial;


  if ("tangleConnect" in window) {

    const tangleConnect = window.tangleConnect;

    const TangleConnectANDROID = {
      connect: (filters = null) => {
        console.log('Connection is handled by tangleConnect.');
      },
      uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
        console.info('posilam TNGL Kod uploadTngl()')
        tangleConnect.uploadTngl(tngl_code, timeline_timestamp, timeline_paused);
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

  } else if (tangleBluetoothDevice) {
    const TangleConnectWEBBLE = {
      connect: (filters = null) => {
        tangleBluetoothDevice.connect();
      },
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
  } else if (tangleSerialDevice) {
    console.log('tangleSerialDevice is not supported yet.')
  }
  else {
    console.warn("No supported module found, you need to add atleast one supported connection module.")
  }
  return tangleDevice;
}