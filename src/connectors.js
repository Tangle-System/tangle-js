import { debugLog } from "./functions.js";
import { timeTrack, tangleConnect, tnglParser, tangleBluetoothDevice, tangleSerialDevice, nanoevents } from "./initialize.js";

const TangleConnectANDROID = {
  connect: (filters = null) => {
    console.log("Connection is handled by tangleConnect.");
  },
  // TODO - add  0, timeline_timestamp, timeline_paused) to required function, currently not supported on Java part
  uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
    tangleConnect.uploadTngl(tngl_code, timeline_timestamp, timeline_paused);
    timeTrack.setStatus(timeline_timestamp, timeline_paused);
  },
  uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
    tangleConnect.uploadTnglBytes(tngl_bytes, timeline_timestamp, timeline_paused);
    timeTrack.setStatus(timeline_timestamp, timeline_paused);
  },
  setTimeline: (timeline_timestamp = 0, timeline_paused = false) => {
    tangleConnect.setTimeline(timeline_timestamp, timeline_paused);
    timeTrack.setStatus(timeline_timestamp, timeline_paused);
  },
  emitColorEvent: (event_name, event_data, event_timestamp, device_id) => {
    tangleConnect.emitColorEvent(event_name, event_data, event_timestamp, device_id);
  },
  emitPercentageEvent: (event_name, event_data, event_timestamp, device_id) => {
    tangleConnect.emitPercentageEvent(event_name, event_data, event_timestamp, device_id);
  },
  emitTimeEvent: (event_name, event_data, event_timestamp, device_id) => {
    tangleConnect.emitTimeEvent(event_name, event_data, event_timestamp, device_id);
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
  disconnect: () => {
    tangleBluetoothDevice.disconnect();
  },
  uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
    const tngl_bytes = tnglParser.parseTnglCode(tngl_code);
    tangleBluetoothDevice.uploadTngl(tngl_bytes, 0x00, timeline_timestamp, timeline_paused);

    timeTrack.setStatus(timeline_timestamp, timeline_paused);
    console.log('uploaded')
  },
  uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
    tangleBluetoothDevice.uploadTngl(tngl_bytes, 0x00, timeline_timestamp, timeline_paused);

    timeTrack.setStatus(timeline_timestamp, timeline_paused);

  },
  setTimeline: (timeline_timestamp = 0, timeline_paused = false) => {
    tangleBluetoothDevice.setTimeline(0, timeline_timestamp, timeline_paused);

    timeTrack.setStatus(timeline_timestamp, timeline_paused);

  },
  emitColorEvent: (event_name, event_data, event_timestamp, device_id) => {
    tangleBluetoothDevice.emitColorEvent(event_name, event_data, event_timestamp, device_id);
  },
  emitPercentageEvent: (event_name, event_data, event_timestamp, device_id) => {
    tangleBluetoothDevice.emitPercentageEvent(event_name, event_data, event_timestamp, device_id);
  },
  emitTimeEvent: (event_name, event_data, event_timestamp, device_id) => {
    tangleBluetoothDevice.emitTimestampEvent(event_name, event_data, event_timestamp, device_id);
  },
  // emitEvent: (event_code, param, device_id = 0) => {
  //   tangleBluetoothDevice.emitEvent(device_id, event_code, param, timeTrack.millis());

  // },
  // emitEvents: (events) => {

  //   tangleBluetoothDevice.emitEvents(events);
  //   // TODO - timestamps autofill current time if not present

  // },
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
  disconnect: () => {
    tangleSerialDevice.disconnect();
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
  setTimeline: (timeline_timestamp = 0, timeline_paused = false) => {
    tangleSerialDevice.setTimeline(0, timeline_timestamp, timeline_paused);

    timeTrack.setStatus(timeline_timestamp, timeline_paused);

  },

  emitColorEvent: (event_name, event_data, event_timestamp, device_id) => {
    tangleSerialDevice.emitColorEvent(event_name, event_data, event_timestamp, device_id);
  },
  emitPercentageEvent: (event_name, event_data, event_timestamp, device_id) => {
    tangleSerialDevice.emitPercentageEvent(event_name, event_data, event_timestamp, device_id);
  },
  emitTimeEvent: (event_name, event_data, event_timestamp, device_id) => {
    tangleSerialDevice.emitTimeEvent(event_name, event_data, event_timestamp, device_id);
  },
  // emitEvent: (event_code, param, device_id = 0) => {
  //   console.log()

  //   tangleSerialDevice.emitEvent(device_id, event_code, param, timeTrack.millis());

  // },
  // emitEvents: (events) => {

  //   tangleSerialDevice.emitEvents(events);
  //   // TODO - timestamps autofill current time if not present

  // },
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
  disconnect: () => { },
  uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {

  },
  uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {

  },
  setTimeline: (timeline_timestamp = 0, timeline_paused = false) => {

  },
  emitEvent: (event_code, param, device_id) => {

  },
  emitEvents: (events) => {

  },
  emitColorEvent: (event_name, event_data, event_timestamp, device_id) => { },
  emitPercentageEvent: (event_name, event_data, event_timestamp, device_id) => { },
  emitTimeEvent: (event_name, event_data, event_timestamp, device_id) => { },
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