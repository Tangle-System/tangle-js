var TangleFunctions = (function (exports) {
  'use strict';

  exports.timeOffset = new Date().getTime() % 0x7fffffff;
  // must be positive int32_t (4 bytes)
  function getTimestamp() {
    return (new Date().getTime() % 0x7fffffff) - exports.timeOffset;
  }

  // The MIT License (MIT)
  // Copyright 2016 Andrey Sitnik <andrey@sitnik.ru>
  const createNanoEvents = () => ({
    events: {},
    emit(event, ...args) {
      (this.events[event] || []).forEach((i) => i(...args));
    },
    on(event, cb) {
      (this.events[event] = this.events[event] || []).push(cb);
      return () => (this.events[event] = (this.events[event] || []).filter((i) => i !== cb));
    },
  });

  function replaceConstants(content = "", replacableConstants) {
    const constantsarray = Object.entries(replacableConstants);
    constantsarray.forEach(([constant, value]) => {
      const constantRegex = new RegExp(constant, "g");
      content = content.replace(constantRegex, value);
    });
    return content;
  }

  function getHexColor(colorStr) {
    const a = document.createElement("div");
    a.style.color = colorStr;
    const colors = window
      .getComputedStyle(document.body.appendChild(a))
      .color.match(/\d+/g)
      .map(function (a) {
        return parseInt(a, 10);
      });
    document.body.removeChild(a);
    return colors.length >= 3 ? "#" + ((1 << 24) + (colors[0] << 16) + (colors[1] << 8) + colors[2]).toString(16).substr(1) : false;
  }



  var FLAGS = Object.freeze({
    /* whole flags */
    FLAG_TNGL_BYTES: 251,
    FLAG_SET_TIMELINE: 252,
    FLAG_EMIT_EVENT: 253,

    /* end of statements with no boundary 255 */
    END_OF_STATEMENT: 254,
    END_OF_TNGL_BYTES: 255,
  });

  var CONSTANTS = Object.freeze({
    APP_DEVICE_ID: 255,
  });

  function toBytes(value, byteCount) {
    var byteArray = [];
    for (let index = 0; index < byteCount; index++) {
      const byte = value & 0xff;
      byteArray.push(byte);
      value = value >> 8;
    }
    return byteArray;
  }

  // timeline_index [0 - 15]
  // timeline_paused [true/false]
  function getTimelineFlags(timeline_index, timeline_paused) {
    // flags bits: [ Reserved,Reserved,Reserved,PausedFLag,IndexBit3,IndexBit2,IndexBit1,IndexBit0]
    timeline_index = timeline_index & 0b00001111;
    timeline_paused = (timeline_paused << 4) & 0b00010000;
    return timeline_paused | timeline_index;
  }

  // function floatingByteToInt16(value) {
  //   if (value < 0.0) {
  //     value = 0.0;
  //   } else if (value > 255.0) {
  //     value = 255.0;
  //   }

  //   let value_whole = Math.floor(value);
  //   let value_rational = Math.round((value - value_whole) / (1 / 256));
  //   let value_int16 = (value_whole << 8) + value_rational;

  //   // console.log(value_whole);
  //   // console.log(value_rational);
  //   // console.log(value_int16);

  //   return value_int16;
  // }

  // function eventParamToBytes(event_param) {
  //   return toBytes(floatingByteToInt16(event_param), 2);
  // }

  exports.timeOffset = new Date().getTime() % 0x7fffffff;
  // must be positive int32 (4 bytes)
  function getClockTimestamp() {
    return (new Date().getTime() % 0x7fffffff) - exports.timeOffset;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  exports.CONSTANTS = CONSTANTS;
  exports.FLAGS = FLAGS;
  exports.createNanoEvents = createNanoEvents;
  exports.getClockTimestamp = getClockTimestamp;
  exports.getHexColor = getHexColor;
  exports.getTimelineFlags = getTimelineFlags;
  exports.getTimestamp = getTimestamp;
  exports.replaceConstants = replaceConstants;
  exports.sleep = sleep;
  exports.toBytes = toBytes;

  return exports;

}({}));
