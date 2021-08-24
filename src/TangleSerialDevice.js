import { getClockTimestamp, getTimelineFlags, toBytes, FLAGS, CONSTANTS, labelToBytes, colorToBytes, percentageToBytes } from "./functions.js";
import TangleSerialConnection from './TangleSerialConnection.js'

/** Example TangleDevice implementation
 */

export default function TangleSerialDevice() {
  this.serialConnection = new TangleSerialConnection();

  this.serialConnection.addEventListener("disconnected", this.onDisconnected);
  this.serialConnection.addEventListener("connected", this.onConnected);
  this.serialConnection.addEventListener("receive", this.onReceive);

  // auto clock sync loop
  var self = this;
  setInterval(() => {
    if (self.isConnected()) {
      self.syncClock(getClockTimestamp());
    }
  }, 60000);

  window.addEventListener("beforeunload", this.serialConnection.disconnect);
}

/**
 * @name TangleSerialDevice.prototype.addEventListener
 * events: "receive", "disconnected", "connected"
 *
 * all events: event.target === the sender object (TangleSerialConnection)
 * event "receive": event.payload contains received data
 * event "disconnected": event.reason has a string with a disconnect reason
 *
 * @returns unbind function
 */
TangleSerialDevice.prototype.addEventListener = function (event, callback) {
  return this.serialConnection.addEventListener(event, callback);
};

TangleSerialDevice.prototype.onDisconnected = function (event) {
  console.log("Serial Device disconnected");

  if (event.reason === "BreakError") {
    setTimeout(() => {
      console.log("Reconnecting device...");
      return event.target
        .reconnect()
        .then(() => {
          event.target.transmitter.sync(getClockTimestamp());
        })
        .catch((error) => {
          console.error(error);
        });
    }, 1000);
  }
};

TangleSerialDevice.prototype.onConnected = function (event) {
  console.log("Serial Device connected");
};

TangleSerialDevice.prototype.onReceive = function (event) {
  //console.log(">", event.payload);
};

TangleSerialDevice.prototype.connect = function () {
  return this.serialConnection
    .scan()
    .then(() => {
      return this.serialConnection.connect();
    })
    .then(() => {
      this.serialConnection.transmitter.sync(getClockTimestamp());
    })
    .catch((error) => {
      console.warn(error);
    });
};

TangleSerialDevice.prototype.reconnect = function () {
  return this.serialConnection
    .reconnect()
    .then(() => {
      this.serialConnection.transmitter.sync(getClockTimestamp());
    })
    .catch((error) => {
      console.warn(error);
    });
};

TangleSerialDevice.prototype.disconnect = function () {
  return this.serialConnection.disconnect().catch((error) => {
    console.warn(error);
  });
};

TangleSerialDevice.prototype.isConnected = function () {
  return this.serialConnection.connected;
};

TangleSerialDevice.prototype.uploadTngl = function (tngl_bytes, timeline_index, timeline_timestamp, timeline_paused) {
  //console.log("uploadTngl()");

  if (!this.serialConnection || !this.serialConnection.transmitter) {
    console.warn("Serial device disconnected");
    return false;
  }

  const flags = getTimelineFlags(timeline_index, timeline_paused);
  const timeline_bytes = [FLAGS.FLAG_SET_TIMELINE, ...toBytes(getClockTimestamp(), 4), ...toBytes(timeline_timestamp, 4), flags];

  const payload = [...timeline_bytes, ...tngl_bytes];
  this.serialConnection.transmitter.deliver(payload);

  return true;
};

TangleSerialDevice.prototype.setTimeline = function (timeline_index, timeline_timestamp, timeline_paused) {
  //console.log("setTimeline()");

  if (!this.serialConnection || !this.serialConnection.transmitter) {
    console.warn("Serial device disconnected");
    return false;
  }

  const flags = getTimelineFlags(timeline_index, timeline_paused);

  const payload = [FLAGS.FLAG_SET_TIMELINE, ...toBytes(getClockTimestamp(), 4), ...toBytes(timeline_timestamp, 4), flags];
  this.serialConnection.transmitter.deliver(payload);

  return true;
};

// event_label example: "evt1"
// event_value example: 1000
TangleSerialDevice.prototype.emitTimestampEvent = function (event_label, event_value_timestamp, event_timestamp, device_id) {


  if (!this.serialConnection || !this.serialConnection.transmitter) {
    console.warn("Serial device disconnected");
    return false;
  }

  const payload = [FLAGS.FLAG_EMIT_TIMESTAMP_EVENT, ...toBytes(event_value_timestamp, 4), ...labelToBytes(event_label), ...toBytes(event_timestamp, 4), device_id];
  this.serialConnection.transmitter.deliver(payload);

  return true;
};

// event_label example: "evt1"
// event_value example: "#00aaff"
TangleSerialDevice.prototype.emitColorEvent = function (event_label, event_value, event_timestamp, device_id) {


  if (!this.serialConnection || !this.serialConnection.transmitter) {
    console.warn("Serial device disconnected");
    return false;
  }

  const payload = [FLAGS.FLAG_EMIT_COLOR_EVENT, ...colorToBytes(event_value), ...labelToBytes(event_label), ...toBytes(event_timestamp, 4), device_id];
  this.serialConnection.transmitter.deliver(payload);

  return true;
};

// event_label example: "evt1"
// event_value example: 100.0
TangleSerialDevice.prototype.emitPercentageEvent = function (event_label, event_value, event_timestamp, device_id) {


  if (!this.serialConnection || !this.serialConnection.transmitter) {
    console.warn("Serial device disconnected");
    return false;
  }

  const payload = [FLAGS.FLAG_EMIT_PERCENTAGE_EVENT, ...percentageToBytes(event_value), ...labelToBytes(event_label), ...toBytes(event_timestamp, 4), device_id];
  this.serialConnection.transmitter.deliver(payload);

  return true;
};

// event_label example: "evt1"
// event_value example: "label"
TangleSerialDevice.prototype.emitLabelEvent = function (event_label, event_value, event_timestamp, device_id) {


  if (!this.serialConnection || !this.serialConnection.transmitter) {
    console.warn("Serial device disconnected");
    return false;
  }

  const payload = [FLAGS.FLAG_EMIT_LABEL_EVENT, ...labelToBytes(event_value), ...labelToBytes(event_label), ...toBytes(event_timestamp, 4), device_id];
  this.serialConnection.transmitter.deliver(payload);

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

  serialdevice.emitEvents(events);

== EXAMPLE ==
*/

// TangleSerialDevice.prototype.emitEvents = function (events) {
//   //console.log("emitEvents()");

//   if (!this.serialConnection || !this.serialConnection.transmitter) {
//     console.warn("Serial device disconnected");
//     return false;
//   }

//   let payload = [];

//   for (let i = 0; i < events.length; i++) {
//     const e = events[i];
//     const bytes = [FLAGS.FLAG_EMIT_EVENT, e.device_id, e.code, e.parameter, ...toBytes(e.timeline_timestamp, 4)];
//     payload.push(...bytes);
//   }

//   this.serialConnection.transmitter.deliver(payload);

//   return true;
// };

TangleSerialDevice.prototype.syncTimeline = function (timeline_index, timeline_timestamp, timeline_paused) {
  //console.log("syncTimeline()");

  if (!this.serialConnection || !this.serialConnection.transmitter) {
    console.warn("Serial device disconnected");
    return false;
  }

  const flags = getTimelineFlags(timeline_index, timeline_paused);

  const payload = [FLAGS.FLAG_SET_TIMELINE, ...toBytes(getClockTimestamp(), 4), ...toBytes(timeline_timestamp, 4), flags];
  this.serialConnection.transmitter.transmit(payload);

  return true;
};

TangleSerialDevice.prototype.syncClock = function () {
  //console.log("syncClock()");

  if (!this.serialConnection || !this.serialConnection.connected) {
    console.warn("Serial device disconnected");
    return false;
  }

  this.serialConnection.transmitter.sync(getClockTimestamp());
  return true;
};
