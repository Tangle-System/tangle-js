import { getClockTimestamp, getTimelineFlags, toBytes, FLAGS, CONSTANTS } from "./functions.js";
import TangleBluetoothConnection from "./TangleBluetoothConnection.js";


export default function TangleBluetoothDevice() {
  this.bluetoothConnection = new TangleBluetoothConnection();
  this.bluetoothConnection.addEventListener("disconnected", this.onDisconnect);
  this.bluetoothConnection.addEventListener("connected", this.onConnect);

  // auto clock sync loop
  var self = this;
  setInterval(() => {
    if (self.isConnected()) {
      self.syncClock(getClockTimestamp());
    }
  }, 60000);

  window.addEventListener("beforeunload", this.bluetoothConnection.disconnect);
}

/**
 * @name TangleBluetoothDevice.prototype.addEventListener
 * events: "disconnected", "connected"
 *
 * all events: event.target === the sender object (TangleBluetoothConnection)
 * event "disconnected": event.reason has a string with a disconnect reason
 *
 * @returns unbind function
 */
TangleBluetoothDevice.prototype.addEventListener = function (event, callback) {
  this.bluetoothConnection.addEventListener(event, callback);
};

TangleBluetoothDevice.prototype.onDisconnect = function (event) {
  console.log("Bluetooth Device disconnected");

  if (event.target.transmitter) {
    setTimeout(() => {
      console.log("Reconnecting device...");
      return event.target
        .reconnect()
        .then(async () => {
          let success = false;

          for (let index = 0; index < 3; index++) {
            if (await event.target.transmitter.sync(getClockTimestamp())) {
              success = true;
              break;
            } else {
              await sleep(100);
            }
          }

          if (success) {
            console.log("Sync time success");
          } else {
            console.error("Sync time on connection failed");
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }, 1000);
  }
};

TangleBluetoothDevice.prototype.onConnect = function (event) {
  console.log("Bluetooth Device connected");
};

TangleBluetoothDevice.prototype.connect = function () {
  return this.bluetoothConnection
    .scan()
    .then(() => {
      return this.bluetoothConnection.connect();
    })
    .then(async () => {
      let success = false;

      for (let index = 0; index < 3; index++) {
        if (await this.bluetoothConnection.transmitter.sync(getClockTimestamp())) {
          success = true;
          break;
        } else {
          await sleep(100);
        }
      }

      if (success) {
        console.log("Sync time success");
      } else {
        console.error("Sync time on connection failed");
      }
    })
    .catch((error) => {
      console.warn(error);
    });
};

TangleBluetoothDevice.prototype.reconnect = function () {
  return this.bluetoothConnection
    .reconnect()
    .then(async () => {
      let success = false;

      for (let index = 0; index < 3; index++) {
        if (await this.bluetoothConnection.transmitter.sync(getClockTimestamp())) {
          success = true;
          break;
        } else {
          await sleep(100);
        }
      }

      if (success) {
        console.log("Sync time success");
      } else {
        console.error("Sync time on connection failed");
      }
    })
    .catch((error) => {
      console.warn(error);
    });
};

TangleBluetoothDevice.prototype.disconnect = function () {
  return this.bluetoothConnection.disconnect();
};

TangleBluetoothDevice.prototype.isConnected = function () {
  return this.bluetoothConnection.connected;
};

TangleBluetoothDevice.prototype.uploadTngl = function (tngl_bytes, timeline_index, timeline_timestamp, timeline_paused) {
  //console.log("uploadTngl()");

  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  }

  const flags = getTimelineFlags(timeline_index, timeline_paused);
  const timeline_bytes = [FLAGS.FLAG_SET_TIMELINE, ...toBytes(getClockTimestamp(), 4), ...toBytes(timeline_timestamp, 4), flags];

  const payload = [...timeline_bytes, ...tngl_bytes];
  this.bluetoothConnection.transmitter.deliver(payload);

  return true;
};

TangleBluetoothDevice.prototype.setTimeline = function (timeline_index, timeline_timestamp, timeline_paused) {
  //console.log("setTimeline()");

  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  }

  const flags = getTimelineFlags(timeline_index, timeline_paused);

  const payload = [FLAGS.FLAG_SET_TIMELINE, ...toBytes(getClockTimestamp(), 4), ...toBytes(timeline_timestamp, 4), flags];
  this.bluetoothConnection.transmitter.deliver(payload);

  return true;
};

/* 
function emitEvent(code, parameter, timeline_timestamp, device_id)

device_id [0; 255]
code [0; 255]
parameter [0; 255]
timeline_timestamp [-2147483648; 2147483647] 

*/

TangleBluetoothDevice.prototype.emitEvent = function (device_id, code, parameter, timeline_timestamp) {
  //console.log("emitEvent()");

  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  }

  const payload = [FLAGS.FLAG_EMIT_EVENT, device_id, code, parameter, ...toBytes(timeline_timestamp, 4)];
  this.bluetoothConnection.transmitter.deliver(payload);

  return true;
};

/* 
function emitEvents(events)

events - array of event objects

event object must have:
  device_id [0; 255]
  code [0; 255]
  parameter [0; 255]
  timeline_timestamp [-2147483648; 2147483647] 


== EXAMPLE ==

  let events = [];

  let e1 = {};
  e1.code = 0;
  e1.parameter = 0;
  e1.timeline_timestamp = 0;

  let e2 = {};
  e2.code = 0;
  e2.parameter = 255;
  e2.timeline_timestamp = 1000;

  events.push(e1);
  events.push(e2);

  bluetoothdevice.emitEvents(events);

== EXAMPLE ==
*/

TangleBluetoothDevice.prototype.emitEvents = function (events) {
  //console.log("emitEvents()");

  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  }

  let payload = [];

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const bytes = [FLAGS.FLAG_EMIT_EVENT, e.device_id, e.code, e.parameter, ...toBytes(e.timeline_timestamp, 4)];
    payload.push(...bytes);
  }

  this.bluetoothConnection.transmitter.deliver(payload);

  return true;
};

/* timeline_index [0 - 15]



*/
TangleBluetoothDevice.prototype.syncTimeline = function (timeline_index, timeline_timestamp, timeline_paused) {
  //console.log("syncTimeline()");

  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  }

  const flags = getTimelineFlags(timeline_index, timeline_paused);

  const payload = [FLAGS.FLAG_SET_TIMELINE, ...toBytes(getClockTimestamp(), 4), ...toBytes(timeline_timestamp, 4), flags];
  this.bluetoothConnection.transmitter.transmit(payload);

  return true;
};

TangleBluetoothDevice.prototype.syncClock = function () {
  //console.log("syncClock()");

  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  }

  this.bluetoothConnection.transmitter.sync(getClockTimestamp()); // bluetooth transmittion slack delay 10ms
  return true;
};
