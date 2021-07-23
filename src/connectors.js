import { debugLog } from "./functions.js";
import { timeTrack, tangleConnect, tnglParser, tangleBluetoothDevice, tangleSerialDevice, nanoevents } from "./initialize.js";

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
  },
  // for connection events
  initEvents: () => {

    document.addEventListener(
      "tangle-state",
      (e) => {
        e = e.detail;
        if (e.type === "connection") {
          if (e.status === "connected") {
            nanoevents.emit("connection", "connected");
          }
          if (e.status === "disconnected") {
            nanoevents.emit("connection", "disconnected");
          }
          if (e.status === "reconnecting") {
            nanoevents.emit("connection", "reconnecting");
          }
        }
      },
      false
    );
  },
  destroyEvents: () => {
    document.removeEventListener(
      "tangle-state",
      (e) => {
        e = e.detail;
        if (e.type === "connection") {
          if (e.status === "connected") {
            nanoevents.emit("connection", "connected");
          }
          if (e.status === "disconnected") {
            nanoevents.emit("connection", "disconnected");
          }
          if (e.status === "reconnecting") {
            nanoevents.emit("connection", "reconnecting");
          }
        }
      },
      false
    );
  },
  ...nanoevents

};

const TangleConnectWEBBLE = {
  connect: (filters = null) => {
    tangleBluetoothDevice.connect();
  },
  uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
    const tngl_bytes = tnglParser.parseTnglCode(tngl_code);
    tangleBluetoothDevice.uploadTngl(tngl_bytes, 0, timeline_timestamp, timeline_paused);

    timeTrack.setStatus(timeline_timestamp, timeline_paused);
    console.log('uploaded')
  },
  uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
    tangleBluetoothDevice.uploadTngl(tngl_bytes, 0, timeline_timestamp, timeline_paused);

    timeTrack.setStatus(timeline_timestamp, timeline_paused);

  },
  setTime: (timeline_timestamp = 0, timeline_paused = false) => {
    tangleBluetoothDevice.setTime(0, timeline_timestamp, timeline_paused);

    timeTrack.setStatus(timeline_timestamp, timeline_paused);

  },
  emitEvent: (event_code, param, device_id = 0) => {
    tangleBluetoothDevice.emitEvent(device_id, event_code, param, timeTrack.millis());

  },
  emitEvents: (events) => {

    tangleBluetoothDevice.emitEvents(events);
    // TODO - timestamps autofill current time if not present

  },
  // for connection events
  initEvents: () => {
    tangleBluetoothDevice.bluetoothConnection.addEventListener(
      "connected",
      () => {
        nanoevents.emit("connection", "connected");
      }
    );
    tangleBluetoothDevice.bluetoothConnection.addEventListener(
      "disconnected",
      () => {
        nanoevents.emit("connection", "disconnected");
      }
    );
  },
  destroyEvents: () => {
    tangleBluetoothDevice.bluetoothConnection.removeEventListener(
      "connected",
      () => {
        nanoevents.emit("connection", "connected");
      }
    );
    tangleBluetoothDevice.bluetoothConnection.removeEventListener(
      "disconnected",
      () => {
        nanoevents.emit("connection", "disconnected");
      }
    );
  },
  ...nanoevents
};




const TangleConnectWEBSerial = {
  connect: (filters = null) => {
    tangleSerialDevice.connect();
  },
  uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
    const tngl_bytes = tnglParser.parseTnglCode(tngl_code);
    tangleSerialDevice.uploadTngl(tngl_bytes, 0, timeline_timestamp, timeline_paused);

    timeTrack.setStatus(timeline_timestamp, timeline_paused);

  },
  uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
    tangleSerialDevice.uploadTngl(tngl_bytes, 0, timeline_timestamp, timeline_paused);

    timeTrack.setStatus(timeline_timestamp, timeline_paused);

  },
  setTime: (timeline_timestamp = 0, timeline_paused = false) => {
    tangleSerialDevice.setTime(0, timeline_timestamp, timeline_paused);

    timeTrack.setStatus(timeline_timestamp, timeline_paused);

  },
  emitEvent: (event_code, param, device_id = 0) => {
    console.log()

    tangleSerialDevice.emitEvent(device_id, event_code, param, timeTrack.millis());

  },
  emitEvents: (events) => {

    tangleSerialDevice.emitEvents(events);
    // TODO - timestamps autofill current time if not present

  },
  // for connection events
  initEvents: () => {

    tangleSerialDevice.serialConnection.addEventListener(
      "connected",
      () => {
        nanoevents.emit("connection", "connected");
      }
    );
    tangleSerialDevice.serialConnection.addEventListener(
      "disconnected",
      () => {
        nanoevents.emit("connection", "disconnected");
      }
    );
  },
  destroyEvents: () => {
    tangleSerialDevice.serialConnection.removeEventListener(
      "connected",
      () => {
        nanoevents.emit("connection", "connected");
      }
    );
    tangleSerialDevice.serialConnection.removeEventListener(
      "disconnected",
      () => {
        nanoevents.emit("connection", "disconnected");
      }
    );
  },
  ...nanoevents
};



const PlaceHolderConnection = {
  connect: (filters = null) => {
  },
  uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {

  },
  uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {

  },
  setTime: (timeline_timestamp = 0, timeline_paused = false) => {

  },
  emitEvent: (event_code, param, device_id) => {

  },
  emitEvents: (events) => {

  },
  // for connection events
  initEvents: () => {

  },
  destroyEvents: () => {

  },
  ...nanoevents
};


export default {
  "android": TangleConnectANDROID,
  "bluetooth": TangleConnectWEBBLE,
  "serial": TangleConnectWEBSerial,
  "none": PlaceHolderConnection
}