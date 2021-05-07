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
}

var FLAGS = Object.freeze({
  /* whole flags */
  FLAG_TNGL_BYTES: 251,
  FLAG_SET_TIMELINE: 252,
  FLAG_EMIT_EVENT: 253,

  /* end of statements with no boundary 255 */
  END_OF_STATEMENT: 254,
  END_OF_TNGL_BYTES: 255
});
var CONSTANTS = Object.freeze({
  APP_DEVICE_ID: 255
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
}

export { CONSTANTS, FLAGS, createNanoEvents, getClockTimestamp, getHexColor, getTimelineFlags, getTimestamp, replaceConstants, sleep, timeOffset, toBytes };
