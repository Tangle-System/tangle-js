import TimeTrack from "./TimeTrack.js";
import TangleBluetoothDevice from "./TangleBluetoothDevice.js";
import TnglCodeParser from "./TangleCodeParser.js";

function initBluetoothDevice() {
  return new TangleBluetoothDevice();
}

function initSerialDevice() { }

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
      setTime: (timeline_timestamp = 0, timeline_paused = false) => {
        console.info("posilam setTime setTime()");
        tangleConnect.setTime(timeline_timestamp, timeline_paused);
        timeTrack.setStatus(timeline_timestamp, timeline_paused);
      },
      emitEvent: (event_code, param, device_id = 0) => {
        console.info("posilam emitEvent()");

        tangleConnect.emitEvent(device_id, event_code, param, timeTrack.millis());
      },
      emitEvents: (events) => {
        console.info("posilam emitEvents()");

        tangleConnect.emitEvents(events);
      }
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
        tangleBluetoothDevice.uploadTngl(tngl_bytes, 0, timeline_timestamp, timeline_paused);

        timeTrack.setStatus(timeline_timestamp, timeline_paused);

        debugLog(".uploadTngl", tngl_bytes, timeline_timestamp, timeline_paused);
      },
      uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
        tangleBluetoothDevice.uploadTngl(tngl_bytes, 0, timeline_timestamp, timeline_paused);

        timeTrack.setStatus(timeline_timestamp, timeline_paused);

        debugLog(".uploadTnglBytes", tngl_bytes, timeline_timestamp, timeline_paused);
      },
      setTime: (timeline_timestamp = 0, timeline_paused = false) => {
        tangleBluetoothDevice.setTime(0, timeline_timestamp, timeline_paused);

        timeTrack.setStatus(timeline_timestamp, timeline_paused);

        debugLog(".setTime", timeline_timestamp, timeline_paused);
      },
      emitEvent: (event_code, param, device_id = 0) => {

        tangleBluetoothDevice.emitEvent(device_id, event_code, param, timeTrack.millis());

        debugLog(".emitEvent", event_code, param, timeTrack.millis());
      },
      emitEvents: (events) => {

        tangleBluetoothDevice.emitEvents(events);
        // TODO - timestamps autofill current time if not present

        debugLog(".emitEvents", events);
      }
    };

    tangleDevice = TangleConnectWEBBLE;

    console.info("Running in WebBluetooth mode");
  } else if (tangleSerialDevice) {
    console.log("tangleSerialDevice is not supported yet.");
  } else {

    const PlaceHolderConnection = {
      connect: (filters = null) => {
        debugLog("Placeholder .connect", filters);
      },
      uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {

        debugLog("Placeholder .uploadTngl", tngl_bytes, timeline_timestamp, timeline_paused);
      },
      uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {

        debugLog("Placeholder .uploadTnglBytes", tngl_bytes, timeline_timestamp, timeline_paused);
      },
      setTime: (timeline_timestamp = 0, timeline_paused = false) => {

        debugLog("Placeholder .setTime", timeline_timestamp, timeline_paused);
      },
      emitEvent: (event_code, param, device_id) => {

        debugLog("Placeholder .triggeremitEvent", 3, event_code, timeTrack.millis());
      },
      emitEvents: (events) => {

        debugLog("Placeholder .emitEvents", events);
      }
    };
    tangleDevice = PlaceHolderConnection;

    console.error("No supported module found, you need to add atleast one supported connection module.", 'Running in placeholder mode (will be handled in future by Tangle Devtools)');
  }
  return tangleDevice;
}
