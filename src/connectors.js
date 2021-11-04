import { debugLog } from "./functions.js";
import { timeTrack, tangleConnect, tnglParser, tangleBluetoothDevice, tangleSerialDevice, tangleEvents } from "./initialize.js";

let tangleEventsAndroid = () => { };

const TangleConnectANDROID = {
  connect: (filters = null) => {
    console.log("Connection is handled by tangleConnect.");
  },
  updateFirmware: (fw) => {
    tangleConnect.updateFirmware(fw);
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
    tangleEventsAndroid = tangleEvents.on(
      "tangle-state",
      (e) => {
        e = e.detail;
        if (e.type === "connection") {
          if (e.status === "connected") {
            tangleEvents.emit("connection", "connected");
          }
          if (e.status === "disconnected") {
            tangleEvents.emit("connection", "disconnected");
          }
          if (e.status === "reconnecting") {
            tangleEvents.emit("connection", "reconnecting");
          }
        }
        if (e.type === "ota_progress") {
          tangleEvents.emit('ota_progress', e.progress)
        }
      },
      false
    );
  },
  destroyEvents: () => {
    tangleEventsAndroid()
  },
};

const TangleConnectWEBBLE = {
  connect: (filters = null) => {
    tangleBluetoothDevice.connect();
  },
  disconnect: () => {
    tangleBluetoothDevice.disconnect();
  },
  updateFirmware: (fw) => {
    tangleBluetoothDevice.updateFirmware(fw);
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
        tangleEvents.emit("connection", "connected");
      }
    );
    tangleBluetoothDevice.bluetoothConnection.addEventListener(
      "disconnected",
      () => {
        tangleEvents.emit("connection", "disconnected");
      }
    );
  },
  destroyEvents: () => {
    tangleBluetoothDevice.bluetoothConnection.removeEventListener(
      "connected",
      () => {
        tangleEvents.emit("connection", "connected");
      }
    );
    tangleBluetoothDevice.bluetoothConnection.removeEventListener(
      "disconnected",
      () => {
        tangleEvents.emit("connection", "disconnected");
      }
    );
  },
};




const TangleConnectWEBSerial = {
  connect: (filters = null) => {
    tangleSerialDevice.connect();
  },
  disconnect: () => {
    tangleSerialDevice.disconnect();
  },
  updateFirmware: (fw) => {
    alert('update firmware not supported on web serial')
    tangleSerialDevice.updateFirmware(fw);
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
        tangleEvents.emit("connection", "connected");
      }
    );
    tangleSerialDevice.serialConnection.addEventListener(
      "disconnected",
      () => {
        tangleEvents.emit("connection", "disconnected");
      }
    );
  },
  destroyEvents: () => {
    tangleSerialDevice.serialConnection.removeEventListener(
      "connected",
      () => {
        tangleEvents.emit("connection", "connected");
      }
    );
    tangleSerialDevice.serialConnection.removeEventListener(
      "disconnected",
      () => {
        tangleEvents.emit("connection", "disconnected");
      }
    );
  },
};



const PlaceHolderConnection = {
  connect: (filters = null) => {
    setTimeout(_ => {
      tangleEvents.emit("connection", "connected");
    }, 200)
  },
  disconnect: () => {
    setTimeout(_ => {
      tangleEvents.emit("connection", "disconnected");
    }, 200)
  },
  updateFirmware: (fw) => {
  },
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
};


export default {
  "android": TangleConnectANDROID,
  "bluetooth": TangleConnectWEBBLE,
  "serial": TangleConnectWEBSerial,
  "none": PlaceHolderConnection
}