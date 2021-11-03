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


  function debugLog(...args) {
    // if (window.localStorage.getItem('debug') === 'true') {
    console.log(`TangleDevice`, ...args);
    // }
  }



  var CONSTANTS = Object.freeze({
    MODIFIER_SWITCH_NONE: 0,
    MODIFIER_SWITCH_RG: 1,
    MODIFIER_SWITCH_GB: 2,
    MODIFIER_SWITCH_BR: 3,
  });

  var FLAGS = Object.freeze({
    /* no code or command used by decoder as a validation */
    NONE: 0,

    // ======================

    /* drawings */
    DRAWING_SET: 1,
    DRAWING_ADD: 2,
    DRAWING_SUB: 3,
    DRAWING_SCALE: 4,
    DRAWING_FILTER: 5,


    /* windows */
    WINDOW_SET: 6,
    WINDOW_ADD: 7,
    WINDOW_SUB: 8,
    WINDOW_SCALE: 9,
    WINDOW_FILTER: 10,


    /* frame */
    FRAME: 11,

    /* clip */
    CLIP: 12,

    /* sifters */
    SIFTER_DEVICE: 13,
    SIFTER_TANGLE: 14,
    SIFTER_GROUP: 15,


    /* event handlers */
    INTERACTIVE: 16,
    EVENT_HANDLE: 17,

    /* definitions scoped */
    DEFINE_VARIABLE: 18,


    // ======================

    /* definitions global */
    DEFINE_DEVICE: 24,
    DEFINE_TANGLE: 25,
    DEFINE_GROUP: 26,
    DEFINE_MARKS: 27,
    DEFINE_ANIMATION: 28,
    DEFINE_EMITTER: 28,

    // ======================

    /* animations */
    ANIMATION_NONE: 32,
    ANIMATION_FILL: 33,
    ANIMATION_RAINBOW: 34,
    ANIMATION_FADE: 35,
    ANIMATION_PROJECTILE: 36,
    ANIMATION_LOADING: 37,
    ANIMATION_COLOR_ROLL: 38,
    ANIMATION_PALLETTE_ROLL: 39,
    ANIMATION_INL_ANI: 40,
    ANIMATION_DEFINED: 41,

    /* modifiers */
    MODIFIER_BRIGHTNESS: 128,
    MODIFIER_TIMELINE: 129,
    MODIFIER_FADE_IN: 130,
    MODIFIER_FADE_OUT: 131,
    MODIFIER_SWITCH_COLORS: 132,
    MODIFIER_TIME_LOOP: 133,
    MODIFIER_TIME_SCALE: 134,
    MODIFIER_TIME_SCALE_SMOOTHED: 135,
    MODIFIER_TIME_CHANGE: 136,


    /* events */
    GENERATOR_LAST_EVENT_VALUE: 144,
    GENERATOR_SMOOTH_TIMED: 145,
    GENERATOR_SINE: 146,
    GENERATOR_SAW: 147,
    GENERATOR_TRIANGLE: 148,
    GENERATOR_SQUARE: 149,
    GENERATOR_PERLIN_NOISE: 150,


    /* variable operations gates */
    VARIABLE_READ: 160,
    VARIABLE_ADD: 161,
    VARIABLE_SUB: 162,
    VARIABLE_MUL: 163,
    VARIABLE_DIV: 164,
    VARIABLE_MOD: 165,
    VARIABLE_SCALE: 166,
    VARIABLE_MAP: 167,


    /* objects */
    DEVICE: 176,
    TANGLE: 177,
    SLICE: 178,
    PORT: 179,
    GROUP: 180,
    MARKS: 181,

    /* events */
    EVENT_SET_VALUE: 184,
    EVENT_EMIT_LOCAL: 185,


    // ======================

    /* values */
    TIMESTAMP: 188,
    COLOR: 189,
    PERCENTAGE: 190,
    LABEL: 191,
    PIXELS: 192,
    TUPLE: 193,


    // ======================

    /* most used constants */
    TIMESTAMP_ZERO: 194,
    TIMESTAMP_MAX: 195,
    TIMESTAMP_MIN: 196,
    COLOR_WHITE: 197,
    COLOR_BLACK: 198,


    // ======================

    /* command flags */
    FLAG_TNGL_BYTES: 248,
    FLAG_SET_TIMELINE: 249,
    FLAG_EMIT_TIMESTAMP_EVENT: 250,
    FLAG_EMIT_COLOR_EVENT: 251,
    FLAG_EMIT_PERCENTAGE_EVENT: 252,
    FLAG_EMIT_LABEL_EVENT: 253,

    /* command ends */
    END_OF_STATEMENT: 254,
    END_OF_TNGL_BYTES: 255,

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

  /////////////////////////////////////////////// == 0.7 == ///////////////////////////////////////////////////


  const getSeconds = str => {
    let seconds = 0;
    let months = str.match(/(\d+)\s*M/);
    let days = str.match(/(\d+)\s*D/);
    let hours = str.match(/(\d+)\s*h/);
    let minutes = str.match(/(\d+)\s*m/);
    let secs = str.match(/(\d+)\s*s/);
    if (months) { seconds += parseInt(months[1]) * 86400 * 30; }
    if (days) { seconds += parseInt(days[1]) * 86400; }
    if (hours) { seconds += parseInt(hours[1]) * 3600; }
    if (minutes) { seconds += parseInt(minutes[1]) * 60; }
    if (secs) { seconds += parseInt(secs[1]); }
    return seconds;
  };


  function mapValue(x, in_min, in_max, out_min, out_max) {
    if (in_max == in_min) {
      return out_min / 2 + out_max / 2;
    }

    let minimum = Math.min(in_min, in_max);
    let maximum = Math.max(in_min, in_max);

    if (x < minimum) {
      x = minimum;
    } else if (x > maximum) {
      x = maximum;
    }

    let result = ((x - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;

    minimum = Math.min(out_min, out_max);
    maximum = Math.max(out_min, out_max);

    if (result < minimum) {
      result = minimum;
    } else if (result > maximum) {
      result = maximum;
    }

    return result;
  }


  // takes "label" and outputs ascii characters in a list of bytes
  function labelToBytes(label_string) {
    var byteArray = [];

    for (let index = 0; index < 5; index++) {
      byteArray.push(label_string.charCodeAt(index));
    }
    return byteArray;
  }

  function colorToBytes(color_hex_code) {
    let reg = color_hex_code.match(/#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/i);
    if (!reg) {
      console.error('Wrong color code: "' + color_hex_code + '"');
      return [0, 0, 0];
    }

    let r = parseInt(reg[1], 16);
    let g = parseInt(reg[2], 16);
    let b = parseInt(reg[3], 16);

    return [r, g, b];
  }

  function percentageToBytes(percentage_float) {
    const value = mapValue(percentage_float, -100.0, 100.0, -2147483647, 2147483647);
    return toBytes(Math.floor(value), 4);
  }

  exports.CONSTANTS = CONSTANTS;
  exports.FLAGS = FLAGS;
  exports.colorToBytes = colorToBytes;
  exports.createNanoEvents = createNanoEvents;
  exports.debugLog = debugLog;
  exports.getClockTimestamp = getClockTimestamp;
  exports.getHexColor = getHexColor;
  exports.getSeconds = getSeconds;
  exports.getTimelineFlags = getTimelineFlags;
  exports.getTimestamp = getTimestamp;
  exports.labelToBytes = labelToBytes;
  exports.mapValue = mapValue;
  exports.percentageToBytes = percentageToBytes;
  exports.replaceConstants = replaceConstants;
  exports.sleep = sleep;
  exports.toBytes = toBytes;

  return exports;

}({}));
