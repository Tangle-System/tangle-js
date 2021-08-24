import { nanoevents, tangleBluetoothDevice, tangleConnect, tangleSerialDevice, timeTrack, tnglParser } from './initialize.js'
import { debugLog } from './functions.js'
import connectors from "./connectors.js";


export default function TangleDevice() {
  let connectionType = "none";
  let connector = connectors.none;


  if ("tangleConnect" in window) {
    connectionType = "android";

    console.info("Running in Android Bluetooth mode");
  }
  else if ("bluetooth" in window?.navigator) {
    connectionType = "bluetooth";

    console.info("Running in WebBluetooth mode");
  }
  else if ("serial" in window.navigator) {
    connectionType = "serial";

    console.log("Running in TangleSerialDevice mode.");
  } else {
    connectionType = "none";

    console.error("No supported module found, you need to add atleast one supported connection module.", 'Running in placeholder mode (will be handled in future by Tangle Devtools)');
  }
  connector = connectors[connectionType];
  window.connector = connectors[connectionType];


  const connectionHandler = {
    connect: ({ filters, type } = {}) => {
      if (Object.keys(connectors).includes(type)) {
        connector = connectors[type];
        window.connector = connector
        // not implemented in TangleConnectors !!!
        // connectors[connectionType].destroyEvents();
        connectionType = type;
        connectors[connectionType].initEvents();
        return connector.connect(filters);
      } else if (connectionType !== 'none') {
        connector = connectors[connectionType];
        // connectors[connectionType].destroyEvents();
        connectionType = type;
        connector.initEvents();
        return connector.connect(filters);
      }
      else {
        console.error(`Connector ${type} does not exist, or not initialized`)
      }
      debugLog(" .connect", filters);
    },
    uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
      debugLog(" .uploadTngl", tngl_code, timeline_timestamp, timeline_paused);
      return connector.uploadTngl(tngl_code, timeline_timestamp = 0, timeline_paused = false);
    },
    uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
      debugLog(" .uploadTnglBytes", tngl_bytes, timeline_timestamp, timeline_paused);
      return connector.uploadTnglBytes(tngl_bytes, timeline_timestamp = 0, timeline_paused = false);
    },
    setTimeline: (timeline_timestamp = 0, timeline_paused = false) => {
      debugLog(" .setTime", timeline_timestamp, timeline_paused);
      return connector.setTimeline(timeline_timestamp, timeline_paused);
    },
    emitEvent: (event_code, param, device_id) => {
      debugLog(" .triggeremitEvent", 3, event_code, param, device_id, timeTrack.millis());
      return connector.emitEvent(event_code, param, device_id);
    },
    emitEvents: (events) => {
      debugLog(" .emitEvents", events);
      return connector.emitEvents(events);
    },
    // for connection events
    initEvents: () => {
      return connector.initEvents();
    },
    destroyEvents: () => {
      return connector.destroyEvents();
    },
    getConnectionType: () => {
      return connectionType;
    },
    ...nanoevents

  };
  window.tangleDevice = connectionHandler
  return connectionHandler;
}
