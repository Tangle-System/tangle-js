import TimeTrack from "./TimeTrack.js";
import TangleBluetoothDevice from "./TangleBluetoothDevice.js";
import TnglCodeParser from "./TangleCodeParser.js";

function initBluetoothDevice() {
  return new TangleBluetoothDevice();
}

function initSerialDevice() {}

export default function TangleDevice({ ble, serial } = { ble: initBluetoothDevice(), serial: initSerialDevice() }) {
  const tnglParser = new TnglCodeParser();
  const timeTrack = new TimeTrack();

  function debugLog(...args) {
    if (window.debug === true) {
      console.log(`TangleDevice`, ...args);
    }
  }

  let tangleDevice;

  const tangleBluetoothDevice = ble;
  const tangleSerialDevice = serial;

  if ("tangleConnect" in window) {
    const tangleConnect = window.tangleConnect;

    const TangleConnectANDROID = {
      connect: (filters = null) => {
        console.log("Connection is handled by tangleConnect.");
      },
      uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
        console.info("posilam TNGL Kod uploadTngl()");
        tangleConnect.uploadTngl(tngl_code, timeline_timestamp, timeline_paused);
        timeTrack.setStatus(timeline_timestamp, timeline_paused);
      },
      uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
        console.info("posilam TNGL bajty uploadTnglBytes()");
        tangleConnect.uploadTnglBytes(tngl_bytes, timeline_timestamp, timeline_paused);
        timeTrack.setStatus(timeline_timestamp, timeline_paused);
      },
      setTime: (timeline_timestamp = 0, timeline_paused = false) => {
        console.info("posilam setTime setTime()");
        tangleConnect.setTime(timeline_timestamp, timeline_paused);
        timeTrack.setStatus(timeline_timestamp, timeline_paused);
      },
      trigger: (character) => {
        console.warn("Ignoring, not supported yet on tangleConnect");
      },
    };

    tangleDevice = TangleConnectANDROID;

    console.info("Running in Android Bluetooth mode");
  } else if ("bluetooth" in window?.navigator) {
    const TangleConnectWEBBLE = {
      connect: (filters = null) => {
        tangleBluetoothDevice.connect();
        debugLog(".connect", filters);
      },
      uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
        const tngl_bytes = tnglParser.parseTnglCode(tngl_code);
        tangleBluetoothDevice.uploadTnglBytes(tngl_bytes, timeline_timestamp, timeline_paused);

        timeTrack.setStatus(timeline_timestamp, timeline_paused);

        debugLog(".uploadTngl", tngl_bytes, timeline_timestamp, timeline_paused);
      },
      uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
        tangleBluetoothDevice.uploadTnglBytes(tngl_bytes, timeline_timestamp, timeline_paused);

        timeTrack.setStatus(timeline_timestamp, timeline_paused);

        debugLog(".uploadTnglBytes", tngl_bytes, timeline_timestamp, timeline_paused);
      },
      setTime: (timeline_timestamp = 0, timeline_paused = false) => {
        tangleBluetoothDevice.setTime(timeline_timestamp, timeline_paused);

        timeTrack.setStatus(timeline_timestamp, timeline_paused);

        debugLog(".setTime", 3, charAsciiCode, timeTrack.millis());
      },
      trigger: (character) => {
        const charAsciiCode = character.toUpperCase().charCodeAt(0);

        tangleBluetoothDevice.writeTrigger(3, charAsciiCode, timeTrack.millis());

        debugLog(".trigger", 3, charAsciiCode, timeTrack.millis());
      },
    };

    tangleDevice = TangleConnectWEBBLE;

    console.info("Running in WebBluetooth mode");
  } else if (tangleSerialDevice) {
    console.log("tangleSerialDevice is not supported yet.");
  } else {
    console.error("No supported module found, you need to add atleast one supported connection module.");
  }
  return tangleDevice;
}
