function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr && (typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]); if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var timeOffset = new Date().getTime() % 0x7fffffff; // must be positive int32_t (4 bytes)

function getTimestamp() {
  return new Date().getTime() % 0x7fffffff - timeOffset;
} // The MIT License (MIT)
// Copyright 2016 Andrey Sitnik <andrey@sitnik.ru>


var createNanoEvents = function createNanoEvents() {
  return {
    events: {},
    emit: function emit(event) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      (this.events[event] || []).forEach(function (i) {
        return i.apply(void 0, args);
      });
    },
    on: function on(event, cb) {
      var _this = this;

      (this.events[event] = this.events[event] || []).push(cb);
      return function () {
        return _this.events[event] = (_this.events[event] || []).filter(function (i) {
          return i !== cb;
        });
      };
    }
  };
};

function replaceConstants() {
  var content = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
  var replacableConstants = arguments.length > 1 ? arguments[1] : undefined;
  var constantsarray = Object.entries(replacableConstants);
  constantsarray.forEach(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        constant = _ref2[0],
        value = _ref2[1];

    var constantRegex = new RegExp(constant, "g");
    content = content.replace(constantRegex, value);
  });
  return content;
}

function getHexColor(colorStr) {
  var a = document.createElement("div");
  a.style.color = colorStr;
  var colors = window.getComputedStyle(document.body.appendChild(a)).color.match(/\d+/g).map(function (a) {
    return parseInt(a, 10);
  });
  document.body.removeChild(a);
  return colors.length >= 3 ? "#" + ((1 << 24) + (colors[0] << 16) + (colors[1] << 8) + colors[2]).toString(16).substr(1) : false;
} // function floatingByteToInt16(value) {
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


function debugLog() {
  var _console;

  for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }

  // if (window.localStorage.getItem('debug') === 'true') {
  (_console = console).log.apply(_console, ["TangleDevice"].concat(args)); // }

}

var CONSTANTS = Object.freeze({
  MODIFIER_SWITCH_NONE: 0,
  MODIFIER_SWITCH_RG: 1,
  MODIFIER_SWITCH_GB: 2,
  MODIFIER_SWITCH_BR: 3
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
  END_OF_TNGL_BYTES: 255
});

function toBytes(value, byteCount) {
  var byteArray = [];

  for (var index = 0; index < byteCount; index++) {
    var _byte = value & 0xff;

    byteArray.push(_byte);
    value = value >> 8;
  }

  return byteArray;
} // timeline_index [0 - 15]
// timeline_paused [true/false]


function getTimelineFlags(timeline_index, timeline_paused) {
  // flags bits: [ Reserved,Reserved,Reserved,PausedFLag,IndexBit3,IndexBit2,IndexBit1,IndexBit0]
  timeline_index = timeline_index & 15;
  timeline_paused = timeline_paused << 4 & 16;
  return timeline_paused | timeline_index;
} // function floatingByteToInt16(value) {
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


var timeOffset = new Date().getTime() % 0x7fffffff; // must be positive int32 (4 bytes)

function getClockTimestamp() {
  return new Date().getTime() % 0x7fffffff - timeOffset;
}

function sleep(ms) {
  return new Promise(function (resolve) {
    return setTimeout(resolve, ms);
  });
} /////////////////////////////////////////////// == 0.7 == ///////////////////////////////////////////////////


var getSeconds = function getSeconds(str) {
  var seconds = 0;
  var months = str.match(/(\d+)\s*M/);
  var days = str.match(/(\d+)\s*D/);
  var hours = str.match(/(\d+)\s*h/);
  var minutes = str.match(/(\d+)\s*m/);
  var secs = str.match(/(\d+)\s*s/);

  if (months) {
    seconds += parseInt(months[1]) * 86400 * 30;
  }

  if (days) {
    seconds += parseInt(days[1]) * 86400;
  }

  if (hours) {
    seconds += parseInt(hours[1]) * 3600;
  }

  if (minutes) {
    seconds += parseInt(minutes[1]) * 60;
  }

  if (secs) {
    seconds += parseInt(secs[1]);
  }

  return seconds;
};

function mapValue(x, in_min, in_max, out_min, out_max) {
  if (in_max == in_min) {
    return out_min / 2 + out_max / 2;
  }

  var minimum = Math.min(in_min, in_max);
  var maximum = Math.max(in_min, in_max);

  if (x < minimum) {
    x = minimum;
  } else if (x > maximum) {
    x = maximum;
  }

  var result = (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
  minimum = Math.min(out_min, out_max);
  maximum = Math.max(out_min, out_max);

  if (result < minimum) {
    result = minimum;
  } else if (result > maximum) {
    result = maximum;
  }

  return result;
} // takes "label" and outputs ascii characters in a list of bytes


function labelToBytes(label_string) {
  var byteArray = [];

  for (var index = 0; index < 5; index++) {
    byteArray.push(label_string.charCodeAt(index));
  }

  return byteArray;
}

function colorToBytes(color_hex_code) {
  var reg = color_hex_code.match(/#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/i);

  if (!reg) {
    console.error('Wrong color code: "' + color_hex_code + '"');
    return [0, 0, 0];
  }

  var r = parseInt(reg[1], 16);
  var g = parseInt(reg[2], 16);
  var b = parseInt(reg[3], 16);
  return [r, g, b];
}

function percentageToBytes(percentage_float) {
  var value = mapValue(percentage_float, -100.0, 100.0, -2147483647, 2147483647);
  return toBytes(Math.floor(value), 4);
}

export { CONSTANTS, FLAGS, colorToBytes, createNanoEvents, debugLog, getClockTimestamp, getHexColor, getSeconds, getTimelineFlags, getTimestamp, labelToBytes, mapValue, percentageToBytes, replaceConstants, sleep, timeOffset, toBytes };
