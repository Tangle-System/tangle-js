function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { var _i = arr && (typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]); if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var TimeTrack = /*#__PURE__*/function () {
  function TimeTrack(time) {
    _classCallCheck(this, TimeTrack);

    this.memory_ = 0;
    this.paused_ = false;

    if (time) {
      this.setMillis(time);
    } else {
      this.setMillis(0);
    }
  }

  _createClass(TimeTrack, [{
    key: "millis",
    value: function millis() {
      if (this.paused_) {
        return this.memory_;
      } else {
        return Date.now() - this.memory_;
      }
    }
  }, {
    key: "setMillis",
    value: function setMillis(current) {
      this.memory_ = this.paused_ ? current : Date.now() - current;
    }
  }, {
    key: "setStatus",
    value: function setStatus(timestamp, paused) {
      this.paused_ = paused !== null && paused !== void 0 ? paused : this.paused_;
      this.memory_ = this.paused_ ? timestamp : Date.now() - timestamp;
    }
  }, {
    key: "pause",
    value: function pause() {
      if (!this.paused_) {
        this.paused_ = true;
        this.memory_ = Date.now() - this.memory_;
      }
    }
  }, {
    key: "unpause",
    value: function unpause() {
      if (this.paused_) {
        this.paused_ = false;
        this.memory_ = Date.now() - this.memory_;
      }
    }
  }, {
    key: "paused",
    value: function paused() {
      return this.paused_;
    }
  }]);

  return TimeTrack;
}(); // const FLAGS = Object.freeze({
//   /* command flags */
//   FLAG_TNGL_BYTES: 248,
//   FLAG_SET_TIMELINE: 249,
//   FLAG_EMIT_TIMESTAMP_EVENT: 250,
//   FLAG_EMIT_COLOR_EVENT: 251,
//   FLAG_EMIT_PERCENTAGE_EVENT: 252,
//   FLAG_EMIT_LABEL_EVENT: 253,
//   /* command ends */
//   END_OF_STATEMENT: 254,
//   END_OF_TNGL_BYTES: 255,
// });


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
} // The MIT License (MIT)
// Copyright 2016 Andrey Sitnik <andrey@sitnik.ru>
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


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

function detectAndroid() {
  return navigator.userAgent.toLowerCase().indexOf("android") > -1;
}

function debugLog() {
  var _console;

  for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }

  // if (window.localStorage.getItem('debug') === 'true') {
  (_console = console).log.apply(_console, ["TangleDevice"].concat(args)); // }

} //////////////////////////////////////////////////////////////////////////


var FLAG_OTA_BEGIN = 255;
var FLAG_OTA_WRITE = 0;
var FLAG_OTA_END = 254;
var FLAG_OTA_RESET = 253;
var FLAG_CONFIG_BEGIN = 1;
var FLAG_CONFIG_WRITE = 2;
var FLAG_CONFIG_END = 3;
var FLAG_CONFIG_RESET = 4;
var FLAG_REBOOT = 5;

function Transmitter() {
  this.TERMINAL_CHAR_UUID = "33a0937e-0c61-41ea-b770-007ade2c79fa";
  this.SYNC_CHAR_UUID = "bec2539d-4535-48da-8e2f-3caa88813f55";
  this.UPDATE_CHAR_UUID = "9ebe2e4b-10c7-4a81-ac83-49540d1135a5";
  this._service = null;
  this._terminalChar = null;
  this._syncChar = null;
  this._updateChar = null;
  this._writing = false;
  this._queue = [];
}

Transmitter.prototype.attach = function (service) {
  var _this2 = this;

  this._service = service;
  return this._service.getCharacteristic(this.TERMINAL_CHAR_UUID)["catch"](function (e) {
    console.warn(e);
  }).then(function (characteristic) {
    _this2._terminalChar = characteristic;
    return _this2._service.getCharacteristic(_this2.SYNC_CHAR_UUID);
  })["catch"](function (e) {
    console.warn(e);
  }).then(function (characteristic) {
    _this2._syncChar = characteristic;
    return _this2._service.getCharacteristic(_this2.UPDATE_CHAR_UUID);
  })["catch"](function (e) {
    console.warn(e);
  }).then(function (characteristic) {
    _this2._updateChar = characteristic;

    _this2.deliver(); // kick off transfering thread if there are item in queue

  })["catch"](function (e) {
    console.warn(e);
  });
}; // deliver() thansfers data reliably to the Bluetooth Device. It might not be instant.
// It may even take ages to get to the device, but it will! (in theory)


Transmitter.prototype.deliver = function (data) {
  var _this3 = this;

  //console.log("deliver()");
  if (data) {
    this._queue.push({
      payload: data,
      reliable: true
    });
  }

  if (!this._writing) {
    this._writing = true; // spawn async function to handle the transmittion one payload at the time

    _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
      var item;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (!(_this3._queue.length > 0)) {
                _context.next = 15;
                break;
              }

              //let timestamp = Date.now();
              item = _this3._queue.shift();
              _context.prev = 2;
              _context.next = 5;
              return _this3._writeBytes(_this3._terminalChar, item.payload, item.reliable);

            case 5:
              _context.next = 13;
              break;

            case 7:
              _context.prev = 7;
              _context.t0 = _context["catch"](2);
              console.warn(_context.t0); // if writing characteristic fail, then stop transmitting
              // but keep data to transmit in queue

              if (item.reliable) _this3._queue.unshift(item);
              _this3._writing = false;
              return _context.abrupt("return");

            case 13:
              _context.next = 0;
              break;

            case 15:
              _this3._writing = false;

            case 16:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, null, [[2, 7]]);
    }))();
  }
}; // transmit() tryes to transmit data NOW. ASAP. It will fail,
// if deliver or another transmit is being executed at the moment
// returns true if transmittion (only transmittion, not receive) was successful


Transmitter.prototype.transmit = function (data) {
  //console.log("transmit()");
  if (!data) {
    return true;
  }

  if (!this._writing) {
    // insert data as first item in sending queue
    this._queue.unshift({
      payload: data,
      reliable: false
    }); // and deliver the data to device


    this.deliver();
    return true;
  } else {
    return false;
  }
};

Transmitter.prototype._writeSync = /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(timestamp) {
    var _this4 = this;

    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            return _context3.abrupt("return", new Promise( /*#__PURE__*/function () {
              var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(resolve, reject) {
                var success, bytes;
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        success = true;
                        _context2.prev = 1;
                        bytes = _toConsumableArray(toBytes(timestamp, 4));
                        _context2.next = 5;
                        return _this4._syncChar.writeValueWithoutResponse(new Uint8Array(bytes))["catch"](function (e) {
                          console.warn(e);
                          success = false;
                        });

                      case 5:
                        _context2.next = 7;
                        return _this4._syncChar.writeValueWithoutResponse(new Uint8Array([]))["catch"](function (e) {
                          console.warn(e);
                          success = false;
                        });

                      case 7:
                        if (!success) {
                          _context2.next = 12;
                          break;
                        }

                        resolve();
                        return _context2.abrupt("return");

                      case 12:
                        reject();
                        return _context2.abrupt("return");

                      case 14:
                        _context2.next = 21;
                        break;

                      case 16:
                        _context2.prev = 16;
                        _context2.t0 = _context2["catch"](1);
                        console.error(_context2.t0);
                        reject();
                        return _context2.abrupt("return");

                      case 21:
                      case "end":
                        return _context2.stop();
                    }
                  }
                }, _callee2, null, [[1, 16]]);
              }));

              return function (_x2, _x3) {
                return _ref3.apply(this, arguments);
              };
            }()));

          case 1:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));

  return function (_x) {
    return _ref2.apply(this, arguments);
  };
}(); // sync() synchronizes the device clock


Transmitter.prototype.sync = /*#__PURE__*/function () {
  var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(timestamp) {
    var success;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            if (this._syncChar) {
              _context4.next = 2;
              break;
            }

            return _context4.abrupt("return", false);

          case 2:
            if (this._writing) {
              _context4.next = 11;
              break;
            }

            this._writing = true;
            success = true;
            _context4.next = 7;
            return this._writeSync(timestamp)["catch"](function (e) {
              console.warn(e);
              success = false;
            });

          case 7:
            this._writing = false;
            return _context4.abrupt("return", success);

          case 11:
            return _context4.abrupt("return", false);

          case 12:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function (_x4) {
    return _ref4.apply(this, arguments);
  };
}();

Transmitter.prototype._writeFirmware = function (firmware) {
  var _this5 = this;

  return new Promise( /*#__PURE__*/function () {
    var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(resolve, reject) {
      var data_size, index_from, index_to, written, bytes, _bytes, start_timestamp, _bytes2, _bytes3;

      return regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              data_size = detectAndroid() ? 992 : 4992;
              index_from = 0;
              index_to = data_size;
              written = 0;
              console.log("OTA UPDATE");
              console.log(firmware);
              tangleEvents.emit('ota_progress', 0.01);
              //===========// RESET //===========//
              console.log("OTA RESET");
              bytes = [FLAG_OTA_RESET, 0x00].concat(_toConsumableArray(toBytes(0x00000000, 4)));
              _context5.next = 11;
              return _this5._writeBytes(_this5._updateChar, bytes, true)["catch"](function (e) {
                console.error(e);
                reject(e);
                return;
              });

            case 11:
              _context5.next = 13;
              return sleep(100);

            case 13:
              //===========// BEGIN //===========//
              console.log("OTA BEGIN");
              _bytes = [FLAG_OTA_BEGIN, 0x00].concat(_toConsumableArray(toBytes(firmware.length, 4)));
              _context5.next = 17;
              return _this5._writeBytes(_this5._updateChar, _bytes, true)["catch"](function (e) {
                console.error(e);
                reject(e);
                return;
              });

            case 17:
              _context5.next = 19;
              return sleep(10000);

            case 19:
              //===========// WRITE //===========//
              console.log("OTA WRITE");
              start_timestamp = new Date().getTime();

            case 21:
              if (!(written < firmware.length)) {
                _context5.next = 33;
                break;
              }

              if (index_to > firmware.length) {
                index_to = firmware.length;
              }

              _bytes2 = [FLAG_OTA_WRITE, 0x00].concat(_toConsumableArray(toBytes(written, 4)), _toConsumableArray(firmware.slice(index_from, index_to)));
              _context5.next = 26;
              return _this5._writeBytes(_this5._updateChar, _bytes2, true)["catch"](function (e) {
                console.error(e);
                reject(e);
                return;
              });

            case 26:
              written += index_to - index_from;
              tangleEvents.emit('ota_progress', Math.floor(written * 10000 / firmware.length) / 100);
              console.log(Math.floor(written * 10000 / firmware.length) / 100 + "%");
              index_from += data_size;
              index_to = index_from + data_size;
              _context5.next = 21;
              break;

            case 33:
              tangleEvents.emit('ota_progress', 100);
              console.log("Firmware written in " + (new Date().getTime() - start_timestamp) / 1000 + " seconds");
              _context5.next = 37;
              return sleep(100);

            case 37:
              //===========// END //===========//
              console.log("OTA END");
              _bytes3 = [FLAG_OTA_END, 0x00].concat(_toConsumableArray(toBytes(written, 4)));
              _context5.next = 41;
              return _this5._writeBytes(_this5._updateChar, _bytes3, true)["catch"](function (e) {
                console.error(e);
                reject(e);
                return;
              });

            case 41:
              resolve();
              return _context5.abrupt("return");

            case 43:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5);
    }));

    return function (_x5, _x6) {
      return _ref5.apply(this, arguments);
    };
  }());
};

Transmitter.prototype._writeConfig = function (config) {
  var _this6 = this;

  return new Promise( /*#__PURE__*/function () {
    var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(resolve, reject) {
      var written, bytes, _bytes4, start_timestamp, _bytes5, end_timestamp, _bytes6;

      return regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              written = 0;
              console.log("CONFIG UPDATE");
              console.log(config);
              //===========// RESET //===========//
              console.log("CONFIG RESET");
              bytes = [FLAG_CONFIG_RESET, 0x00].concat(_toConsumableArray(toBytes(0x00000000, 4)));
              _context6.next = 7;
              return _this6._writeBytes(_this6._updateChar, bytes, true)["catch"](function (e) {
                console.error(e);
                reject(e);
                return;
              });

            case 7:
              _context6.next = 9;
              return sleep(100);

            case 9:
              //===========// BEGIN //===========//
              console.log("CONFIG BEGIN");
              _bytes4 = [FLAG_CONFIG_BEGIN, 0x00].concat(_toConsumableArray(toBytes(config.length, 4)));
              _context6.next = 13;
              return _this6._writeBytes(_this6._updateChar, _bytes4, true)["catch"](function (e) {
                console.error(e);
                reject(e);
                return;
              });

            case 13:
              _context6.next = 15;
              return sleep(100);

            case 15:
              start_timestamp = new Date().getTime();
              //===========// WRITE //===========//
              console.log("CONFIG WRITE");
              _bytes5 = [FLAG_CONFIG_WRITE, 0x00].concat(_toConsumableArray(toBytes(written, 4)), _toConsumableArray(config));
              _context6.next = 20;
              return _this6._writeBytes(_this6._updateChar, _bytes5, true)["catch"](function (e) {
                console.error(e);
                reject(e);
                return;
              });

            case 20:
              written += config.length;
              end_timestamp = new Date().getTime();
              console.log("Config written in " + (end_timestamp - start_timestamp) / 1000 + " seconds");
              _context6.next = 25;
              return sleep(100);

            case 25:
              //===========// END //===========//
              console.log("CONFIG END");
              _bytes6 = [FLAG_CONFIG_END, 0x00].concat(_toConsumableArray(toBytes(written, 4)));
              _context6.next = 29;
              return _this6._writeBytes(_this6._updateChar, _bytes6, true)["catch"](function (e) {
                console.error(e);
                reject(e);
                return;
              });

            case 29:
              resolve();
              return _context6.abrupt("return");

            case 31:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee6);
    }));

    return function (_x7, _x8) {
      return _ref6.apply(this, arguments);
    };
  }());
}; // sync() synchronizes the device clock


Transmitter.prototype.updateFirmware = /*#__PURE__*/function () {
  var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(firmware) {
    var success;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            if (!this._writing) {
              _context7.next = 3;
              break;
            }

            console.error("Write currently in progress");
            return _context7.abrupt("return", false);

          case 3:
            this._writing = true;
            success = true;
            _context7.next = 7;
            return this._writeFirmware(firmware)["catch"](function (e) {
              console.error(e);
              success = false;
            });

          case 7:
            this._writing = false;
            return _context7.abrupt("return", success);

          case 9:
          case "end":
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function (_x9) {
    return _ref7.apply(this, arguments);
  };
}(); // sync() synchronizes the device clock


Transmitter.prototype.updateConfig = /*#__PURE__*/function () {
  var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8(config) {
    var success;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            if (!this._writing) {
              _context8.next = 3;
              break;
            }

            console.error("Write currently in progress");
            return _context8.abrupt("return", false);

          case 3:
            this._writing = true;
            success = true;
            _context8.next = 7;
            return this._writeConfig(config)["catch"](function (e) {
              console.error(e);
              success = false;
            });

          case 7:
            this._writing = false;
            return _context8.abrupt("return", success);

          case 9:
          case "end":
            return _context8.stop();
        }
      }
    }, _callee8, this);
  }));

  return function (_x10) {
    return _ref8.apply(this, arguments);
  };
}(); // sync() synchronizes the device clock


Transmitter.prototype.deviceReboot = function () {
  var bytes = [FLAG_REBOOT, 0x00].concat(_toConsumableArray(toBytes(0x00000000, 4)));
  return this._writeBytes(this._updateChar, bytes, true);
}; // resets the transmitter, leaving send queue intact


Transmitter.prototype.reset = function () {
  var clear_queue = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  this._service = null;
  this._terminalChar = null;
  this._syncChar = null;
  this._updateChar = null;
  this._writing = false;

  if (clear_queue) {
    this._queue = [];
  }
}; /////////////////////////////////////////////////////////////////////////////////////
// Tangle Bluetooth Device


function TangleBluetoothConnection() {
  this.TRANSMITTER_SERVICE_UUID = "60cb125a-0000-0007-0002-5ad20c574c10";
  this.BLE_OPTIONS = {
    //acceptAllDevices: true,
    filters: [{
      services: [this.TRANSMITTER_SERVICE_UUID]
    } // {services: ['c48e6067-5295-48d3-8d5c-0395f61792b1']},
    // {name: 'ExampleName'},
    ] //optionalServices: [this.TRANSMITTER_SERVICE_UUID],

  };
  this.bluetoothDevice = null;
  this.transmitter = null;
  this.eventEmitter = tangleEvents;
}

TangleBluetoothConnection.prototype.connected = false;
/**
 * @name TangleBluetoothConnection.prototype.addEventListener
 * events: "connected", "disconnected"
 *
 * all events: event.target === the sender object (this)
 * event "disconnected": event.reason has a string with a disconnect reason
 *
 * @returns unbind function
 */

TangleBluetoothConnection.prototype.addEventListener = function (event, callback) {
  return this.eventEmitter.on(event, callback);
};

TangleBluetoothConnection.prototype.scan = function () {
  var _this7 = this;

  //console.log("scan()");
  if (this.bluetoothDevice) {
    this.disconnect();
  }

  return navigator.bluetooth.requestDevice(this.BLE_OPTIONS).then(function (device) {
    _this7.bluetoothDevice = device;
    _this7.bluetoothDevice.connection = _this7;

    _this7.bluetoothDevice.addEventListener("gattserverdisconnected", _this7.onDisconnected);
  });
};

TangleBluetoothConnection.prototype.connect = function () {
  var _this8 = this;

  //console.log("connect()");
  if (this.bluetoothDevice.gatt.connected) {
    console.log("> Bluetooth Device is already connected");
    this.connected = true;
    return Promise.resolve();
  }

  console.log("> Connecting to Bluetooth device...");
  return this.bluetoothDevice.gatt.connect().then(function (server) {
    if (!_this8.transmitter) {
      _this8.transmitter = new Transmitter();
    } else {
      _this8.transmitter.reset();
    }

    console.log("> Getting the Bluetooth Service...");
    return server.getPrimaryService(_this8.TRANSMITTER_SERVICE_UUID);
  }).then(function (service) {
    console.log("> Getting the Service Characteristic...");
    return _this8.transmitter.attach(service);
  }).then(function () {
    console.log("> Connected");
    _this8.connected = true;
    {
      var event = {};
      event.target = _this8;

      _this8.eventEmitter.emit("connected", event);
    }
  })["catch"](function (error) {
    console.warn(error.name); // If the device is far away, sometimes this "NetworkError" happends

    if (error.name == "NetworkError") {
      return sleep(1000).then(function () {
        return _this8.reconnect();
      });
    } else {
      throw error;
    }
  });
};

TangleBluetoothConnection.prototype.reconnect = function () {
  //console.log("reconnect()");
  if (this.connected && this.bluetoothDevice.gatt.connected) {
    console.log("> Bluetooth Device is already connected");
    return Promise.resolve();
  }

  console.log("> Reconnecting Bluetooth device...");
  return this.connect();
};

TangleBluetoothConnection.prototype.disconnect = function () {
  //console.log("disconnect()");
  if (!this.bluetoothDevice) {
    //console.warn("No bluetoothDevice")
    return;
  }

  console.log("> Disconnecting from Bluetooth Device..."); // wanted disconnect removes the transmitter

  this.transmitter = null;
  this.connected = false;

  if (this.bluetoothDevice.gatt.connected) {
    this.bluetoothDevice.gatt.disconnect();
  } else {
    console.log("> Bluetooth Device is already disconnected");
  }
}; // Object event.target is Bluetooth Device getting disconnected.


TangleBluetoothConnection.prototype.onDisconnected = function (e) {
  //console.log("> Bluetooth Device disconnected");
  var self = e.target.connection;
  {
    var event = {};
    event.target = self;
    self.eventEmitter.emit("disconnected", event);
  }
  self.connected = false;
}; ///////////////////////////////// 0.7.0 /////////////////////////////////


Transmitter.prototype._writeBytes = function (characteristic, bytes, response) {
  var write_uuid = parseInt(Math.random() * 0xffffffff);
  var packet_header_size = 12; // 3x 4byte integers: write_uuid, index_from, payload.length

  var packet_size = detectAndroid() ? 212 : 512; // min size packet_header_size + 1 !!!! ANDROID NEEDS PACKET SIZE <= 212!!!!

  var bytes_size = packet_size - packet_header_size;

  if (!response && bytes.length > bytes_size) {
    console.error("The maximum bytes that can be written without response is " + bytes_size);
    return;
  }

  if (!response) {
    return characteristic.writeValueWithoutResponse(new Uint8Array([]));
  } else {
    return new Promise( /*#__PURE__*/function () {
      var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9(resolve, reject) {
        var index_from, index_to, payload;
        return regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                index_from = 0;
                index_to = bytes_size;

              case 2:
                if (!(index_from < bytes.length)) {
                  _context9.next = 11;
                  break;
                }

                if (index_to > bytes.length) {
                  index_to = bytes.length;
                }

                payload = [].concat(_toConsumableArray(toBytes(write_uuid, 4)), _toConsumableArray(toBytes(index_from, 4)), _toConsumableArray(toBytes(bytes.length, 4)), _toConsumableArray(bytes.slice(index_from, index_to)));
                _context9.next = 7;
                return characteristic.writeValueWithResponse(new Uint8Array(payload))["catch"](function (e) {
                  console.error(e);
                  reject(e);
                  return;
                });

              case 7:
                index_from += bytes_size;
                index_to = index_from + bytes_size;
                _context9.next = 2;
                break;

              case 11:
                resolve();
                return _context9.abrupt("return");

              case 13:
              case "end":
                return _context9.stop();
            }
          }
        }, _callee9);
      }));

      return function (_x11, _x12) {
        return _ref9.apply(this, arguments);
      };
    }());
  }
};

TangleBluetoothConnection.prototype.reset = function () {
  console.log("Reseting TangleBluetoothConnection...");
  this.disconnect();

  if (this.transmitter) {
    this.transmitter.reset(true);
  }

  this.bluetoothDevice = null;
  this.transmitter = null;
};

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
  MODIFIER_TIME_SET: 137,

  /* events */
  GENERATOR_LAST_EVENT_VALUE: 144,
  GENERATOR_SMOOTHOUT: 145,
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

function TnglCodeParser() {}

TnglCodeParser.prototype.parseTnglCode = function (tngl_code) {
  var buffer = new ArrayBuffer(65535);
  var payload = new DataView(buffer);
  payload.cursor = 0;

  payload.fillFlag = function (flag) {
    this.setUint8(this.cursor++, flag);
  };

  payload.fillUInt8 = function (value) {
    this.setUint8(this.cursor++, value);
  };

  payload.fillInt16 = function (value) {
    this.setUint8(this.cursor++, value);
    this.setUint8(this.cursor++, value >> 8);
  };

  payload.fillInt24 = function (value) {
    this.setUint8(this.cursor++, value);
    this.setUint8(this.cursor++, value >> 8);
    this.setUint8(this.cursor++, value >> 16);
  };

  payload.fillInt32 = function (value) {
    this.setUint8(this.cursor++, value);
    this.setUint8(this.cursor++, value >> 8);
    this.setUint8(this.cursor++, value >> 16);
    this.setUint8(this.cursor++, value >> 24);
  }; ///////////////////////////////////////////////////////////


  var compiler = {};

  compiler.compileFlag = function (flag) {
    payload.fillUInt8(flag);
  };

  compiler.compileByte = function (_byte2) {
    var reg = _byte2.match(/0x([0-9a-f][0-9a-f])(?![0-9a-f])/i);

    if (!reg) {
      console.error("Failed to compile a byte");
      return;
    }

    payload.fillUInt8(parseInt(reg[1], 16));
  };

  compiler.compileChar = function (_char) {
    var reg = _char.match(/(-?)'([\W\w])'/);

    if (!reg) {
      console.error("Failed to compile char");
      return;
    }

    if (reg[1] == "-") {
      payload.fillUInt8(-reg[2].charCodeAt(0));
    } else {
      payload.fillUInt8(reg[2].charCodeAt(0));
    }
  }; // takes string string as '"this is a string"'


  compiler.compileString = function (string) {
    var reg = string.match(/"([\w ]*)"/);

    if (!reg) {
      console.error("Failed to compile a string");
      return;
    }

    for (var i = 0; i < string.length; i++) {
      payload.fillUInt8(string.charCodeAt(i));
    }

    payload.fillFlag(FLAGS.NONE);
  };

  compiler.compileInfinity = function (infinity) {
    var reg = infinity.match(/([+-]?Infinity)/);

    if (!reg) {
      console.error("Failed to compile a infinity");
      return;
    }

    if (reg[1] == "Infinity" || reg[1] == "+Infinity") {
      payload.fillFlag(FLAGS.TIMESTAMP_MAX);
    } else if (reg[1] == "-Infinity") {
      payload.fillFlag(FLAGS.TIMESTAMP_MIN);
    } else {
      console.error("Error while compiling infinity");
    }
  }; // takes in time string token like "1.2d+9h2m7.2s-123t" and appeds to payload the total time in ms (tics) as a int32_t: [FLAG.TIMESTAMP, BYTE4, BYTE2, BYTE1, BYTE0]


  compiler.compileTimestamp = function (timestamp) {
    // console.log(timestamp);
    timestamp.replace(/_/g, ""); // replaces all '_' with nothing

    var total_tics = 0;

    while (timestamp) {
      var reg = timestamp.match(/([+-]?[0-9]*[.]?[0-9]+)([dhmst])/); // for example gets "-1.4d" from "-1.4d23.2m1s"

      if (!reg) {
        // if the regex match failes, then the algorithm is done
        if (timestamp != "") {
          console.error("Error while parsing timestamp");
          console.log("Leftover string:", timestamp);
        }

        break;
      }

      var value = reg[0]; // gets "-1.4d" from "-1.4d"

      var unit = reg[2]; // gets "d" from "-1.4d"

      var number = parseFloat(reg[1]); // gets "-1.4" from "-1.4d"
      // console.log("value:", value);
      // console.log("unit:", unit);
      // console.log("number:", number);

      switch (unit) {
        case "d":
          total_tics += number * 86400000;
          break;

        case "h":
          total_tics += number * 3600000;
          break;

        case "m":
          total_tics += number * 60000;
          break;

        case "s":
          total_tics += number * 1000;
          break;

        case "t":
          total_tics += number;
          break;

        default:
          console.error("Error while parsing timestamp");
          break;
      }

      timestamp = timestamp.replace(value, ""); // removes one value from the string
    } // console.log("total_tics:", total_tics);


    if (total_tics == 0) {
      payload.fillFlag(FLAGS.TIMESTAMP_ZERO);
    } else {
      payload.fillFlag(FLAGS.TIMESTAMP);
      payload.fillInt32(total_tics);
    }
  }; // takes in html color string "#abcdef" and encodes it into 24 bits [FLAG.COLOR, R, G, B]


  compiler.compileColor = function (color) {
    var reg = color.match(/#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/i);

    if (!reg) {
      console.error("Failed to compile color");
      return;
    }

    var r = parseInt(reg[1], 16);
    var g = parseInt(reg[2], 16);
    var b = parseInt(reg[3], 16);

    if (r == 255 && g == 255 && b == 255) {
      payload.fillFlag(FLAGS.COLOR_WHITE);
    } else if (r == 0 && g == 0 && b == 0) {
      payload.fillFlag(FLAGS.COLOR_BLACK);
    } else {
      payload.fillFlag(FLAGS.COLOR);
      payload.fillUInt8(r);
      payload.fillUInt8(g);
      payload.fillUInt8(b);
    }
  }; // takes in percentage string "83.234%" and encodes it into 24 bits


  compiler.compilePercentage = function (percentage) {
    var reg = percentage.match(/([+-]?[\d.]+)%/);

    if (!reg) {
      console.error("Failed to compile percentage");
      return;
    }

    var val = parseFloat(reg[1]);

    if (val > 100.0) {
      val = 100.0;
    }

    if (val < -100.0) {
      val = -100.0;
    }

    var remapped = mapValue(val, -100.0, 100.0, -2147483647, 2147483647);
    payload.fillFlag(FLAGS.PERCENTAGE);
    payload.fillInt32(parseInt(remapped));
  }; // takes label string as "$label" and encodes it into 32 bits


  compiler.compileLabel = function (label) {
    var reg = label.match(/\$([\w]*)/);

    if (!reg) {
      console.error("Failed to compile a label");
      return;
    }

    payload.fillFlag(FLAGS.LABEL);

    for (var index = 0; index < 5; index++) {
      payload.fillUInt8(reg[1].charCodeAt(index));
    }
  }; // takes pixels string "12px" and encodes it into 16 bits


  compiler.compilePixels = function (pixels) {
    var reg = pixels.match(/([\d]+)px/);

    if (!reg) {
      console.error("Failed to compile pixels");
      return;
    }

    var count = parseInt(reg[1]);
    payload.fillFlag(FLAGS.PIXELS);
    payload.fillInt16(count);
  }; ///////////////////////////////////////////////////////////


  compiler.compileWord = function (word) {
    switch (word) {
      // === canvas operations ===
      case "setDrawing":
        payload.fillFlag(FLAGS.DRAWING_SET);
        break;

      case "addDrawing":
        payload.fillFlag(FLAGS.DRAWING_ADD);
        break;

      case "subDrawing":
        payload.fillFlag(FLAGS.DRAWING_SUB);
        break;

      case "scaDrawing":
        payload.fillFlag(FLAGS.DRAWING_SCALE);
        break;

      case "filDrawing":
        payload.fillFlag(FLAGS.DRAWING_FILTER);
        break;

      case "setWindow":
        payload.fillFlag(FLAGS.WINDOW_SET);
        break;

      case "addWindow":
        payload.fillFlag(FLAGS.WINDOW_ADD);
        break;

      case "subWindow":
        payload.fillFlag(FLAGS.WINDOW_SUB);
        break;

      case "scaWindow":
        payload.fillFlag(FLAGS.WINDOW_SCALE);
        break;

      case "filWindow":
        payload.fillFlag(FLAGS.WINDOW_FILTER); // === time operations ===

        break;

      case "frame":
        payload.fillFlag(FLAGS.FRAME);
        break;
      // === animations ===

      case "animDefined":
        payload.fillFlag(FLAGS.ANIMATION_DEFINED);
        break;

      case "animNone":
        payload.fillFlag(FLAGS.ANIMATION_NONE);
        break;

      case "animFill":
        payload.fillFlag(FLAGS.ANIMATION_FILL);
        break;

      case "animRainbow":
        payload.fillFlag(FLAGS.ANIMATION_RAINBOW);
        break;

      case "animPlasmaShot":
        payload.fillFlag(FLAGS.ANIMATION_PROJECTILE);
        break;

      case "animLoadingBar":
        payload.fillFlag(FLAGS.ANIMATION_LOADING);
        break;

      case "animFade":
        payload.fillFlag(FLAGS.ANIMATION_FADE);
        break;

      case "animColorRoll":
        payload.fillFlag(FLAGS.ANIMATION_COLOR_ROLL);
        break;

      case "animPaletteRoll":
        payload.fillFlag(FLAGS.ANIMATION_PALLETTE_ROLL);
        break;
      // === handlers ===

      case "interactive":
        payload.fillFlag(FLAGS.INTERACTIVE);
        break;
      // === clip ===

      case "clip":
        payload.fillFlag(FLAGS.CLIP);
        break;
      // === definitions ===

      case "defAnimation":
        payload.fillFlag(FLAGS.DEFINE_ANIMATION);
        break;

      case "defDevice":
        payload.fillFlag(FLAGS.DEFINE_DEVICE);
        break;

      case "defTangle":
        payload.fillFlag(FLAGS.DEFINE_TANGLE);
        break;

      case "defGroup":
        payload.fillFlag(FLAGS.DEFINE_GROUP);
        break;

      case "defMarks":
        payload.fillFlag(FLAGS.DEFINE_MARKS);
        break;

      case "defVariable":
        payload.fillFlag(FLAGS.DEFINE_VARIABLE);
        break;
      // === sifters ===

      case "siftDevices":
        payload.fillFlag(FLAGS.SIFTER_DEVICE);
        break;

      case "siftTangles":
        payload.fillFlag(FLAGS.SIFTER_TANGLE);
        break;

      case "siftGroups":
        payload.fillFlag(FLAGS.SIFTER_GROUP);
        break;
      // === objects ===

      case "device":
        payload.fillFlag(FLAGS.DEVICE);
        break;

      case "tangle":
        payload.fillFlag(FLAGS.TANGLE);
        break;

      case "slice":
        payload.fillFlag(FLAGS.SLICE);
        break;

      case "port":
        payload.fillFlag(FLAGS.PORT);
        break;

      case "group":
        payload.fillFlag(FLAGS.GROUP);
        break;

      case "marks":
        payload.fillFlag(FLAGS.MARKS);
        break;
      // === modifiers ===

      case "modifyBrightness":
        payload.fillFlag(FLAGS.MODIFIER_BRIGHTNESS);
        break;

      case "modifyTimeline":
        payload.fillFlag(FLAGS.MODIFIER_TIMELINE);
        break;

      case "modifyFadeIn":
        payload.fillFlag(FLAGS.MODIFIER_FADE_IN);
        break;

      case "modifyFadeOut":
        payload.fillFlag(FLAGS.MODIFIER_FADE_OUT);
        break;

      case "modifyColorSwitch":
        payload.fillFlag(FLAGS.MODIFIER_SWITCH_COLORS);
        break;

      case "modifyTimeLoop":
        payload.fillFlag(FLAGS.MODIFIER_TIME_LOOP);
        break;

      case "modifyTimeScale":
        payload.fillFlag(FLAGS.MODIFIER_TIME_SCALE);
        break;

      case "modifyTimeScaleSmoothed":
        payload.fillFlag(FLAGS.MODIFIER_TIME_SCALE_SMOOTHED);
        break;

      case "modifyTimeChange":
        payload.fillFlag(FLAGS.MODIFIER_TIME_CHANGE);
        break;

      case "modifyTimeSet":
        payload.fillFlag(FLAGS.MODIFIER_TIME_SET);
        break;
      // === events ===

      case "handleEvent":
        payload.fillFlag(FLAGS.EVENT_HANDLE);
        break;

      case "setValue":
        payload.fillFlag(FLAGS.EVENT_SET_VALUE);
        break;

      case "emitAs":
        payload.fillFlag(FLAGS.EVENT_EMIT_LOCAL);
        break;
      // === generators ===

      case "genLastEventParam":
        payload.fillFlag(FLAGS.GENERATOR_LAST_EVENT_VALUE);
        break;

      case "genSine":
        payload.fillFlag(FLAGS.GENERATOR_SINE);
        break;

      case "genSaw":
        payload.fillFlag(FLAGS.GENERATOR_SAW);
        break;

      case "genTriangle":
        payload.fillFlag(FLAGS.GENERATOR_TRIANGLE);
        break;

      case "genSquare":
        payload.fillFlag(FLAGS.GENERATOR_SQUARE);
        break;

      case "genPerlinNoise":
        payload.fillFlag(FLAGS.GENERATOR_PERLIN_NOISE);
        break;

      case "genSmoothOut":
        payload.fillFlag(FLAGS.GENERATOR_SMOOTHOUT);
        break;

      /* === variable operations === */

      case "variable":
        payload.fillFlag(FLAGS.VARIABLE_READ);
        break;

      case "genSmoothOut":
        payload.fillFlag(FLAGS.VARIABLE_SMOOTH_TIMED);
        break;

      case "addValues":
        payload.fillFlag(FLAGS.VARIABLE_ADD);
        break;

      case "subValues":
        payload.fillFlag(FLAGS.VARIABLE_SUB);
        break;

      case "mulValues":
        payload.fillFlag(FLAGS.VARIABLE_MUL);
        break;

      case "divValues":
        payload.fillFlag(FLAGS.VARIABLE_DIV);
        break;

      case "modValues":
        payload.fillFlag(FLAGS.VARIABLE_MOD);
        break;

      case "scaValue":
        payload.fillFlag(FLAGS.VARIABLE_SCALE);
        break;

      case "mapValue":
        payload.fillFlag(FLAGS.VARIABLE_MAP);
        break;
      // === constants ===

      case "true":
        payload.fillUInt8(0x01);
        break;

      case "false":
        payload.fillUInt8(0x00);
        break;

      case "MODIFIER_SWITCH_NONE":
        payload.fillByte(CONSTANTS.MODIFIER_SWITCH_NONE);
        break;

      case "MODIFIER_SWITCH_RG":
      case "MODIFIER_SWITCH_GR":
        payload.fillByte(CONSTANTS.MODIFIER_SWITCH_RG);
        break;

      case "MODIFIER_SWITCH_GB":
      case "MODIFIER_SWITCH_BG":
        payload.fillByte(CONSTANTS.MODIFIER_SWITCH_GB);
        break;

      case "MODIFIER_SWITCH_BR":
      case "MODIFIER_SWITCH_RB":
        payload.fillByte(CONSTANTS.MODIFIER_SWITCH_BR);
        break;
      // === unknown ===

      default:
        console.warn("Unknown word >", word, "<");
        break;
    }
  }; ///////////////////////////////////////////////////////////


  var parses = {
    comment: /\/\/[^\n]*/,
    htmlrgb: /#[0-9a-f]{6}/i,
    infinity: /[+-]?Infinity/,
    string: /"[\w ]*"/,
    timestamp: /(_?[+-]?[0-9]*[.]?[0-9]+[dhmst])+/,
    label: /\$[\w]*/,
    "char": /-?'[\W\w]'/,
    "byte": /0x[0-9a-f][0-9a-f](?![0-9a-f])/i,
    pixels: /[\d]+px/,
    percentage: /[+-]?[\d.]+%/,
    "float": /([+-]?[0-9]*[.][0-9]+)/,
    number: /([+-]?[0-9]+)/,
    arrow: /->/,
    word: /[a-z_][\w]*/i,
    whitespace: /\s+/,
    punctuation: /[^\w\s]/
  };
  console.log(tngl_code);

  var tokens = this._tokenize(tngl_code, parses);

  console.log(tokens);
  compiler.compileFlag(FLAGS.FLAG_TNGL_BYTES);

  for (var index = 0; index < tokens.length; index++) {
    var element = tokens[index]; // console.log(element);

    switch (element.type) {
      case "comment":
        // skip
        break;

      case "htmlrgb":
        compiler.compileColor(element.token);
        break;

      case "infinity":
        compiler.compileInfinity(element.token);
        break;

      case "string":
        compiler.compileString(element.token);
        break;

      case "timestamp":
        compiler.compileTimestamp(element.token);
        break;

      case "label":
        compiler.compileLabel(element.token);
        break;

      case "char":
        compiler.compileChar(element.token);
        break;

      case "byte":
        compiler.compileByte(element.token);
        break;

      case "pixels":
        compiler.compilePixels(element.token);
        break;

      case "percentage":
        compiler.compilePercentage(element.token);
        break;

      case "float":
        console.error('"Naked" float numbers are not permitted.');
        break;

      case "number":
        console.error('"Naked" numbers are not permitted.');
        break;

      case "arrow":
        // skip
        break;

      case "word":
        compiler.compileWord(element.token);
        break;

      case "whitespace":
        // skip
        break;

      case "punctuation":
        if (element.token == "}") {
          payload.fillFlag(FLAGS.END_OF_STATEMENT);
        }

        break;

      default:
        console.warn("Unknown token type >", element.type, "<");
        break;
    }
  }

  compiler.compileFlag(FLAGS.END_OF_TNGL_BYTES);
  var tngl_bytes = new Uint8Array(buffer, 0, payload.cursor);
  console.log(tngl_bytes);
  return tngl_bytes;
};
/*
 * Tiny tokenizer
 *
 * - Accepts a subject string and an object of regular expressions for parsing
 * - Returns an array of token objects
 *
 * tokenize('this is text.', { word:/\w+/, whitespace:/\s+/, punctuation:/[^\w\s]/ }, 'invalid');
 * result => [{ token="this", type="word" },{ token=" ", type="whitespace" }, Object { token="is", type="word" }, ... ]
 *
 */


TnglCodeParser.prototype._tokenize = function (s, parsers, deftok) {
  var m,
      r,
      t,
      tokens = [];

  while (s) {
    t = null;
    m = s.length;

    for (var key in parsers) {
      r = parsers[key].exec(s); // try to choose the best match if there are several
      // where "best" is the closest to the current starting point

      if (r && r.index < m) {
        t = {
          token: r[0],
          type: key,
          matches: r.slice(1)
        };
        m = r.index;
      }
    }

    if (m) {
      // there is text between last token and currently
      // matched token - push that out as default or "unknown"
      tokens.push({
        token: s.substr(0, m),
        type: deftok || "unknown"
      });
    }

    if (t) {
      // push current token onto sequence
      tokens.push(t);
    }

    s = s.substr(m + (t ? t.token.length : 0));
  }

  return tokens;
}; /////////////////////////////////////////////////////////////////////////


function TangleBluetoothDevice() {
  this.bluetoothConnection = new TangleBluetoothConnection();
  this.bluetoothConnection.addEventListener("disconnected", this.onDisconnect);
  this.bluetoothConnection.addEventListener("connected", this.onConnect); // auto clock sync loop

  var self = this;
  setInterval(function () {
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

  if (event.target.connected) {
    setTimeout(function () {
      console.log("Reconnecting device...");
      return event.target.reconnect().then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10() {
        var success, index;
        return regeneratorRuntime.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                success = false;
                index = 0;

              case 2:
                if (!(index < 3)) {
                  _context10.next = 19;
                  break;
                }

                _context10.next = 5;
                return sleep(1000);

              case 5:
                _context10.prev = 5;
                _context10.next = 8;
                return event.target.transmitter.sync(getClockTimestamp());

              case 8:
                if (!_context10.sent) {
                  _context10.next = 11;
                  break;
                }

                success = true;
                return _context10.abrupt("break", 19);

              case 11:
                _context10.next = 16;
                break;

              case 13:
                _context10.prev = 13;
                _context10.t0 = _context10["catch"](5);
                console.warn("time sync unsuccessful");

              case 16:
                index++;
                _context10.next = 2;
                break;

              case 19:
                if (success) {
                  console.log("Sync time success");
                } else {
                  console.error("Sync time on connection failed");
                }

              case 20:
              case "end":
                return _context10.stop();
            }
          }
        }, _callee10, null, [[5, 13]]);
      })))["catch"](function (error) {
        console.error(error);
        event.target.reset();
      });
    }, 1000);
  }
};

TangleBluetoothDevice.prototype.onConnect = function (event) {
  console.log("Bluetooth Device connected");
};

TangleBluetoothDevice.prototype.connect = function () {
  var _this9 = this;

  return this.bluetoothConnection.scan().then(function () {
    return _this9.bluetoothConnection.connect().then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee11() {
      var success, index;
      return regeneratorRuntime.wrap(function _callee11$(_context11) {
        while (1) {
          switch (_context11.prev = _context11.next) {
            case 0:
              success = false;
              index = 0;

            case 2:
              if (!(index < 3)) {
                _context11.next = 19;
                break;
              }

              _context11.next = 5;
              return sleep(1000);

            case 5:
              _context11.prev = 5;
              _context11.next = 8;
              return _this9.bluetoothConnection.transmitter.sync(getClockTimestamp());

            case 8:
              if (!_context11.sent) {
                _context11.next = 11;
                break;
              }

              success = true;
              return _context11.abrupt("break", 19);

            case 11:
              _context11.next = 16;
              break;

            case 13:
              _context11.prev = 13;
              _context11.t0 = _context11["catch"](5);
              console.warn("time sync failed");

            case 16:
              index++;
              _context11.next = 2;
              break;

            case 19:
              if (success) {
                console.log("Sync time success");
              } else {
                console.error("Sync time on connection failed");
              }

            case 20:
            case "end":
              return _context11.stop();
          }
        }
      }, _callee11, null, [[5, 13]]);
    })))["catch"](function (error) {
      console.warn(error);

      _this9.bluetoothConnection.reset();
    });
  })["catch"](function (error) {
    console.warn(error);
  });
};

TangleBluetoothDevice.prototype.reconnect = function () {
  var _this10 = this;

  return this.bluetoothConnection.reconnect().then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee12() {
    var success, index;
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            success = false;
            index = 0;

          case 2:
            if (!(index < 3)) {
              _context12.next = 19;
              break;
            }

            _context12.next = 5;
            return sleep(1000);

          case 5:
            _context12.prev = 5;
            _context12.next = 8;
            return _this10.bluetoothConnection.transmitter.sync(getClockTimestamp());

          case 8:
            if (!_context12.sent) {
              _context12.next = 11;
              break;
            }

            success = true;
            return _context12.abrupt("break", 19);

          case 11:
            _context12.next = 16;
            break;

          case 13:
            _context12.prev = 13;
            _context12.t0 = _context12["catch"](5);
            console.warn("time sync failed");

          case 16:
            index++;
            _context12.next = 2;
            break;

          case 19:
            if (success) {
              console.log("Sync time success");
            } else {
              console.error("Sync time on connection failed");
            }

          case 20:
          case "end":
            return _context12.stop();
        }
      }
    }, _callee12, null, [[5, 13]]);
  })))["catch"](function (error) {
    console.warn(error);

    _this10.bluetoothConnection.reset();
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

  var flags = getTimelineFlags(timeline_index, timeline_paused);
  var timeline_bytes = [FLAGS.FLAG_SET_TIMELINE].concat(_toConsumableArray(toBytes(getClockTimestamp(), 4)), _toConsumableArray(toBytes(timeline_timestamp, 4)), [flags]);
  var payload = [].concat(_toConsumableArray(timeline_bytes), _toConsumableArray(tngl_bytes));
  this.bluetoothConnection.transmitter.deliver(payload);
  return true;
};

TangleBluetoothDevice.prototype.setTimeline = function (timeline_index, timeline_timestamp, timeline_paused) {
  //console.log("setTimeline()");
  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  }

  var flags = getTimelineFlags(timeline_index, timeline_paused);
  var payload = [FLAGS.FLAG_SET_TIMELINE].concat(_toConsumableArray(toBytes(getClockTimestamp(), 4)), _toConsumableArray(toBytes(timeline_timestamp, 4)), [flags]);
  this.bluetoothConnection.transmitter.deliver(payload);
  return true;
}; // event_label example: "evt1"
// event_value example: 1000


TangleBluetoothDevice.prototype.emitTimestampEvent = function (event_label, event_value, event_timeline_timestamp, device_id) {
  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  } // default broadcast


  if (device_id === null) {
    device_id = 0xff;
  }

  var payload = [FLAGS.FLAG_EMIT_TIMESTAMP_EVENT].concat(_toConsumableArray(toBytes(event_value, 4)), _toConsumableArray(labelToBytes(event_label)), _toConsumableArray(toBytes(event_timeline_timestamp, 4)), [device_id]);
  this.bluetoothConnection.transmitter.deliver(payload);
  return true;
}; // event_label example: "evt1"
// event_value example: "#00aaff"


TangleBluetoothDevice.prototype.emitColorEvent = function (event_label, event_value, event_timeline_timestamp, device_id) {
  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  } // default broadcast


  if (device_id === null) {
    device_id = 0xff;
  }

  var payload = [FLAGS.FLAG_EMIT_COLOR_EVENT].concat(_toConsumableArray(colorToBytes(event_value)), _toConsumableArray(labelToBytes(event_label)), _toConsumableArray(toBytes(event_timeline_timestamp, 4)), [device_id]);
  this.bluetoothConnection.transmitter.deliver(payload);
  return true;
}; // event_label example: "evt1"
// event_value example: 100.0


TangleBluetoothDevice.prototype.emitPercentageEvent = function (event_label, event_value, event_timeline_timestamp, device_id) {
  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  } // default broadcast


  if (device_id === null) {
    device_id = 0xff;
  }

  var payload = [FLAGS.FLAG_EMIT_PERCENTAGE_EVENT].concat(_toConsumableArray(percentageToBytes(event_value)), _toConsumableArray(labelToBytes(event_label)), _toConsumableArray(toBytes(event_timeline_timestamp, 4)), [device_id]);
  this.bluetoothConnection.transmitter.deliver(payload);
  return true;
}; // event_label example: "evt1"
// event_value example: "label"


TangleBluetoothDevice.prototype.emitLabelEvent = function (event_label, event_value, event_timeline_timestamp, device_id) {
  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  } // default broadcast


  if (device_id === null) {
    device_id = 0xff;
  }

  var payload = [FLAGS.FLAG_EMIT_LABEL_EVENT].concat(_toConsumableArray(labelToBytes(event_value)), _toConsumableArray(labelToBytes(event_label)), _toConsumableArray(toBytes(event_timeline_timestamp, 4)), [device_id]);
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
// TangleBluetoothDevice.prototype.emitEvents = function (events) {
//   //console.log("emitEvents()");
//   if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
//     console.warn("Bluetooth device disconnected");
//     return false;
//   }
//   let payload = [];
//   for (let i = 0; i < events.length; i++) {
//     const e = events[i];
//     const bytes = [FLAGS.FLAG_EMIT_EVENT, e.device_id, e.code, e.parameter, ...toBytes(e.timeline_timestamp, 4)];
//     payload.push(...bytes);
//   }
//   this.bluetoothConnection.transmitter.deliver(payload);
//   return true;
// };

/* timeline_index [0 - 15]



*/


TangleBluetoothDevice.prototype.syncTimeline = function (timeline_index, timeline_timestamp, timeline_paused) {
  //console.log("syncTimeline()");
  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  }

  var flags = getTimelineFlags(timeline_index, timeline_paused);
  var payload = [FLAGS.FLAG_SET_TIMELINE].concat(_toConsumableArray(toBytes(getClockTimestamp(), 4)), _toConsumableArray(toBytes(timeline_timestamp, 4)), [flags]);
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

TangleBluetoothDevice.prototype.updateFirmware = function (firmware) {
  //console.log("syncClock()");
  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  }

  this.bluetoothConnection.transmitter.updateFirmware(firmware); // bluetooth transmittion slack delay 10ms

  return true;
};

TangleBluetoothDevice.prototype.updateConfig = function (config) {
  //console.log("syncClock()");
  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  }

  this.bluetoothConnection.transmitter.updateConfig(config); // bluetooth transmittion slack delay 10ms

  return true;
};

TangleBluetoothDevice.prototype.reboot = function () {
  //console.log("syncClock()");
  if (!this.bluetoothConnection || !this.bluetoothConnection.transmitter) {
    console.warn("Bluetooth device disconnected");
    return false;
  }

  this.bluetoothConnection.transmitter.deviceReboot(); // bluetooth transmittion slack delay 10ms

  return true;
}; ///////////////////////////////////////////////////////////////////////////////////

/**
 * @name LineBreakTransformer
 * TransformStream to parse the stream into lines.
 */


var LineBreakTransformer = /*#__PURE__*/function () {
  function LineBreakTransformer() {
    _classCallCheck(this, LineBreakTransformer);

    // A container for holding stream data until a new line.
    this.container = "";
  }

  _createClass(LineBreakTransformer, [{
    key: "transform",
    value: function transform(chunk, controller) {
      // Handle incoming chunk
      this.container += chunk;
      var lines = this.container.split("\n");
      this.container = lines.pop();
      lines.forEach(function (line) {
        return controller.enqueue(line);
      });
    }
  }, {
    key: "flush",
    value: function flush(controller) {
      // Flush the stream.
      controller.enqueue(this.container);
    }
  }]);

  return LineBreakTransformer;
}(); ///////////////////////////////////////////////////////////////////////////////////


function TangleSerialTransmitter() {
  this._writing = false;
  this._queue = [];
  this._transmitStream = null; //this._transmitStreamWriter = null;
}

TangleSerialTransmitter.prototype.attach = function (writableStream) {
  this._transmitStream = writableStream;
};

TangleSerialTransmitter.prototype.detach = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee13() {
  return regeneratorRuntime.wrap(function _callee13$(_context13) {
    while (1) {
      switch (_context13.prev = _context13.next) {
        case 0:
          //console.log("detach()");
          if (this._transmitStream) {
            // if (this._transmitStreamWriter) {
            //   await this._transmitStreamWriter.close().catch(() => {});
            //   this._transmitStreamWriter = null;
            // }
            this._transmitStream = null;
          }

        case 1:
        case "end":
          return _context13.stop();
      }
    }
  }, _callee13, this);
}));

TangleSerialTransmitter.prototype._writeTerminal = function (payload) {
  var _this11 = this;

  //console.log("_writeTerminal()");
  return new Promise( /*#__PURE__*/function () {
    var _ref14 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee14(resolve, reject) {
      var bytes, timeout, writer;
      return regeneratorRuntime.wrap(function _callee14$(_context14) {
        while (1) {
          switch (_context14.prev = _context14.next) {
            case 0:
              bytes = [].concat(_toConsumableArray(toBytes(123456789, 4)), _toConsumableArray(toBytes(payload.length, 4)), _toConsumableArray(payload));
              timeout = 25;

              try {
                writer = _this11._transmitStream.getWriter();
                writer.write(new Uint8Array(bytes)).then(function () {
                  setTimeout(function () {
                    writer.releaseLock();
                    resolve();
                  }, timeout);
                });
              } catch (error) {
                reject(error);
              }

            case 3:
            case "end":
              return _context14.stop();
          }
        }
      }, _callee14);
    }));

    return function (_x13, _x14) {
      return _ref14.apply(this, arguments);
    };
  }());
}; // deliver() thansfers data reliably to the Bluetooth Device. It might not be instant.
// It may even take ages to get to the device, but it will! (in theory)


TangleSerialTransmitter.prototype.deliver = function (data) {
  var _this12 = this;

  //console.log("deliver()");
  if (data) {
    this._queue.push({
      payload: data,
      reliable: true
    });
  }

  if (!this._writing) {
    this._writing = true; // spawn async function to handle the transmittion one payload at the time

    _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee15() {
      var item;
      return regeneratorRuntime.wrap(function _callee15$(_context15) {
        while (1) {
          switch (_context15.prev = _context15.next) {
            case 0:
              if (!(_this12._queue.length > 0)) {
                _context15.next = 15;
                break;
              }

              //let timestamp = Date.now();
              item = _this12._queue.shift();
              _context15.prev = 2;
              _context15.next = 5;
              return _this12._writeTerminal(item.payload);

            case 5:
              _context15.next = 13;
              break;

            case 7:
              _context15.prev = 7;
              _context15.t0 = _context15["catch"](2);
              console.warn(_context15.t0); //console.warn("write was unsuccessful");
              // if writing characteristic fail, then stop transmitting
              // but keep data to transmit in queue

              if (item.reliable) _this12._queue.unshift(item);
              _this12._writing = false;
              return _context15.abrupt("return");

            case 13:
              _context15.next = 0;
              break;

            case 15:
              _this12._writing = false;

            case 16:
            case "end":
              return _context15.stop();
          }
        }
      }, _callee15, null, [[2, 7]]);
    }))();
  }
}; // transmit() tryes to transmit data NOW. ASAP. It will fail,
// if deliver or another transmit is being executed at the moment
// returns true if transmittion (only transmittion, not receive) was successful


TangleSerialTransmitter.prototype.transmit = function (data) {
  //console.log("transmit()");
  if (!data) {
    return true;
  }

  if (!this._writing) {
    // insert data as first item in sending queue
    this._queue.unshift({
      payload: data,
      reliable: false
    }); // and deliver the data to device


    this.deliver();
    return true;
  } else {
    return false;
  }
};

TangleSerialTransmitter.prototype._writeSync = function (timestamp) {
  var _this13 = this;

  //console.log("_writeSync()");
  return new Promise( /*#__PURE__*/function () {
    var _ref16 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee16(resolve, reject) {
      var payload, bytes, writer, timeout;
      return regeneratorRuntime.wrap(function _callee16$(_context16) {
        while (1) {
          switch (_context16.prev = _context16.next) {
            case 0:
              payload = _toConsumableArray(toBytes(timestamp, 4));
              bytes = [].concat(_toConsumableArray(toBytes(987654321, 4)), _toConsumableArray(toBytes(payload.length, 4)), _toConsumableArray(payload));

              try {
                writer = _this13._transmitStream.getWriter();
                timeout = 25;
                writer.write(new Uint8Array(bytes)).then(function () {
                  setTimeout(function () {
                    writer.releaseLock();
                    resolve();
                  }, timeout);
                });
              } catch (error) {
                reject(error);
              }

            case 3:
            case "end":
              return _context16.stop();
          }
        }
      }, _callee16);
    }));

    return function (_x15, _x16) {
      return _ref16.apply(this, arguments);
    };
  }());
}; // sync() synchronizes the device clock


TangleSerialTransmitter.prototype.sync = function (timestamp) {
  //console.log("sync(" + timestamp + ")");
  if (!this._writing) {
    this._writing = true;

    this._writeSync(timestamp)["catch"](function (e) {
      console.warn(e);
    });

    this._writing = false;
  }
}; // clears the queue of items to send


TangleSerialTransmitter.prototype.reset = function () {
  this._writing = false;
  this._queue = [];
}; ///////////////////////////////////////////////////////////////////////////////////


function TangleSerialReceiver() {
  this._receiveStream = null;
  this._receiveStreamReader = null;
  this._receiveTextDecoderDone = null;
}

TangleSerialReceiver.prototype.attach = function (readableStream) {
  //console.log("attach()");
  this._receiveStream = readableStream;
  var textDecoder = new window.TextDecoderStream();
  this._receiveTextDecoderDone = this._receiveStream.pipeTo(textDecoder.writable);
  this._receiveStream = textDecoder.readable.pipeThrough(new window.TransformStream(new LineBreakTransformer())); //.pipeThrough(new TransformStream(new JSONTransformer()));

  this._receiveStreamReader = this._receiveStream.getReader();
};

TangleSerialReceiver.prototype.detach = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee17() {
  return regeneratorRuntime.wrap(function _callee17$(_context17) {
    while (1) {
      switch (_context17.prev = _context17.next) {
        case 0:
          if (!this._receiveStream) {
            _context17.next = 8;
            break;
          }

          if (!this._receiveStreamReader) {
            _context17.next = 7;
            break;
          }

          _context17.next = 4;
          return this._receiveStreamReader.cancel()["catch"](function () {});

        case 4:
          _context17.next = 6;
          return this._receiveTextDecoderDone["catch"](function () {});

        case 6:
          this._receiveStreamReader = null;

        case 7:
          this._receiveStream = null;

        case 8:
        case "end":
          return _context17.stop();
      }
    }
  }, _callee17, this);
}));
/**
 * @name TangleSerialReceiver.prototype.kickstart
 * Reads data from the input stream until it is interruped in some way. Then it returns.
 * Received data is handled to the processor's funtion onReceive(value).
 */

TangleSerialReceiver.prototype.kickstart = /*#__PURE__*/function () {
  var _ref18 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee18(processor) {
    var _yield$this$_receiveS, value, done;

    return regeneratorRuntime.wrap(function _callee18$(_context18) {
      while (1) {
        switch (_context18.prev = _context18.next) {
          case 0:
            if (!true) {
              _context18.next = 20;
              break;
            }

            _context18.prev = 1;
            _context18.next = 4;
            return this._receiveStreamReader.read();

          case 4:
            _yield$this$_receiveS = _context18.sent;
            value = _yield$this$_receiveS.value;
            done = _yield$this$_receiveS.done;

            if (value) {
              processor.onReceive(value);
            }

            if (!done) {
              _context18.next = 11;
              break;
            }

            this._receiveStreamReader.releaseLock();

            return _context18.abrupt("return", "ReaderDone");

          case 11:
            _context18.next = 18;
            break;

          case 13:
            _context18.prev = 13;
            _context18.t0 = _context18["catch"](1);
            console.warn(_context18.t0);
            this.detach();
            return _context18.abrupt("return", _context18.t0.name);

          case 18:
            _context18.next = 0;
            break;

          case 20:
          case "end":
            return _context18.stop();
        }
      }
    }, _callee18, this, [[1, 13]]);
  }));

  return function (_x17) {
    return _ref18.apply(this, arguments);
  };
}(); ///////////////////////////////////////////////////////////////////////////////////


function TangleSerialConnection() {
  this.PORT_OPTIONS = {
    baudRate: 1000000
  };
  this.serialPort = null;
  this.transmitter = new TangleSerialTransmitter();
  this.receiver = new TangleSerialReceiver();
  this.eventEmitter = tangleEvents;
}

TangleSerialConnection.prototype.connected = false;

TangleSerialConnection.prototype.scan = function () {
  var _this14 = this;

  //console.log("scan()");
  if (this.serialPort) {
    this.disconnect();
  }

  return navigator.serial.requestPort().then(function (port) {
    _this14.serialPort = port;
  });
};

TangleSerialConnection.prototype.connect = function () {
  var _this15 = this;

  //console.log("connect()");
  return this.serialPort.open(this.PORT_OPTIONS).then(function () {
    _this15.transmitter.attach(_this15.serialPort.writable);

    _this15.receiver.attach(_this15.serialPort.readable);

    _this15.run();
  })["catch"](function (error) {
    return _this15.disconnect().then(function () {
      throw error;
    });
  });
};

TangleSerialConnection.prototype.run = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee19() {
  var event, obj, result, _event;

  return regeneratorRuntime.wrap(function _callee19$(_context19) {
    while (1) {
      switch (_context19.prev = _context19.next) {
        case 0:
          this.connected = true;
          event = {};
          event.target = this;
          this.eventEmitter.emit("connected", event);
          obj = {};
          obj.self = this;

          obj.onReceive = function (payload) {
            var event = {};
            event.target = this;
            event.payload = payload;
            this.self.eventEmitter.emit("receive", event);
          };

          _context19.next = 9;
          return this.receiver.kickstart(obj);

        case 9:
          result = _context19.sent;
          //console.log(result);
          this.connected = false;
          _event = {};
          _event.target = this;
          _event.reason = result;
          this.eventEmitter.emit("disconnected", _event);

        case 15:
        case "end":
          return _context19.stop();
      }
    }
  }, _callee19, this);
}));
/**
 * @name TangleSerialConnection.prototype.addEventListener
 * events: "receive", "disconnected", "connected"
 *
 * all events: event.target === the sender object (this)
 * event "receive": event.payload contains received data
 * event "disconnected": event.reason has a string with a disconnect reason
 *
 * @returns unbind function
 */

TangleSerialConnection.prototype.addEventListener = function (event, callback) {
  return this.eventEmitter.on(event, callback);
};

TangleSerialConnection.prototype._close = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee20() {
  return regeneratorRuntime.wrap(function _callee20$(_context20) {
    while (1) {
      switch (_context20.prev = _context20.next) {
        case 0:
          _context20.next = 2;
          return this.receiver.detach();

        case 2:
          _context20.next = 4;
          return this.transmitter.detach();

        case 4:
          if (!this.serialPort) {
            _context20.next = 7;
            break;
          }

          _context20.next = 7;
          return this.serialPort.close()["catch"](function () {});

        case 7:
        case "end":
          return _context20.stop();
      }
    }
  }, _callee20, this);
}));

TangleSerialConnection.prototype.reconnect = function () {
  var _this16 = this;

  //console.log("reconnect()");
  if (this.serialPort) {
    //console.log("Reconnecting serial port...");
    return this._close().then(function () {
      return _this16.connect();
    });
  } else {
    return this.scan().then(function () {
      return _this16.connect();
    });
  }
};

TangleSerialConnection.prototype.disconnect = function () {
  var _this17 = this;

  //console.log("disconnect()");
  if (!this.serialPort) {
    //console.log("Serial port is already disconnected");
    return Promise.resolve();
  }

  if (this.serialPort) {
    //console.log("Disconnecting serial port...");
    return this._close().then(function () {
      _this17.serialPort = null;
    });
  }
};
/** Example TangleDevice implementation
 */


function TangleSerialDevice() {
  this.serialConnection = new TangleSerialConnection();
  this.serialConnection.addEventListener("disconnected", this.onDisconnected);
  this.serialConnection.addEventListener("connected", this.onConnected);
  this.serialConnection.addEventListener("receive", this.onReceive); // auto clock sync loop

  var self = this;
  setInterval(function () {
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
    setTimeout(function () {
      console.log("Reconnecting device...");
      return event.target.reconnect().then(function () {
        event.target.transmitter.sync(getClockTimestamp());
      })["catch"](function (error) {
        console.error(error);
      });
    }, 1000);
  }
};

TangleSerialDevice.prototype.onConnected = function (event) {
  console.log("Serial Device connected");
};

TangleSerialDevice.prototype.onReceive = function (event) {//console.log(">", event.payload);
};

TangleSerialDevice.prototype.connect = function () {
  var _this18 = this;

  return this.serialConnection.scan().then(function () {
    return _this18.serialConnection.connect();
  }).then(function () {
    _this18.serialConnection.transmitter.sync(getClockTimestamp());
  })["catch"](function (error) {
    console.warn(error);
  });
};

TangleSerialDevice.prototype.reconnect = function () {
  var _this19 = this;

  return this.serialConnection.reconnect().then(function () {
    _this19.serialConnection.transmitter.sync(getClockTimestamp());
  })["catch"](function (error) {
    console.warn(error);
  });
};

TangleSerialDevice.prototype.disconnect = function () {
  return this.serialConnection.disconnect()["catch"](function (error) {
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

  var flags = getTimelineFlags(timeline_index, timeline_paused);
  var timeline_bytes = [FLAGS.FLAG_SET_TIMELINE].concat(_toConsumableArray(toBytes(getClockTimestamp(), 4)), _toConsumableArray(toBytes(timeline_timestamp, 4)), [flags]);
  var payload = [].concat(_toConsumableArray(timeline_bytes), _toConsumableArray(tngl_bytes));
  this.serialConnection.transmitter.deliver(payload);
  return true;
};

TangleSerialDevice.prototype.setTimeline = function (timeline_index, timeline_timestamp, timeline_paused) {
  //console.log("setTimeline()");
  if (!this.serialConnection || !this.serialConnection.transmitter) {
    console.warn("Serial device disconnected");
    return false;
  }

  var flags = getTimelineFlags(timeline_index, timeline_paused);
  var payload = [FLAGS.FLAG_SET_TIMELINE].concat(_toConsumableArray(toBytes(getClockTimestamp(), 4)), _toConsumableArray(toBytes(timeline_timestamp, 4)), [flags]);
  this.serialConnection.transmitter.deliver(payload);
  return true;
}; // event_label example: "evt1"
// event_value example: 1000


TangleSerialDevice.prototype.emitTimestampEvent = function (event_label, event_value, event_timestamp, device_id) {
  if (!this.serialConnection || !this.serialConnection.transmitter) {
    console.warn("Serial device disconnected");
    return false;
  }

  var payload = [FLAGS.FLAG_EMIT_TIMESTAMP_EVENT].concat(_toConsumableArray(toBytes(event_value, 4)), _toConsumableArray(labelToBytes(event_label)), _toConsumableArray(toBytes(event_timestamp, 4)), [device_id]);
  this.serialConnection.transmitter.deliver(payload);
  return true;
}; // event_label example: "evt1"
// event_value example: "#00aaff"


TangleSerialDevice.prototype.emitColorEvent = function (event_label, event_value, event_timestamp, device_id) {
  if (!this.serialConnection || !this.serialConnection.transmitter) {
    console.warn("Serial device disconnected");
    return false;
  }

  var payload = [FLAGS.FLAG_EMIT_COLOR_EVENT].concat(_toConsumableArray(colorToBytes(event_value)), _toConsumableArray(labelToBytes(event_label)), _toConsumableArray(toBytes(event_timestamp, 4)), [device_id]);
  this.serialConnection.transmitter.deliver(payload);
  return true;
}; // event_label example: "evt1"
// event_value example: 100.0


TangleSerialDevice.prototype.emitPercentageEvent = function (event_label, event_value, event_timestamp, device_id) {
  if (!this.serialConnection || !this.serialConnection.transmitter) {
    console.warn("Serial device disconnected");
    return false;
  }

  var payload = [FLAGS.FLAG_EMIT_PERCENTAGE_EVENT].concat(_toConsumableArray(percentageToBytes(event_value)), _toConsumableArray(labelToBytes(event_label)), _toConsumableArray(toBytes(event_timestamp, 4)), [device_id]);
  this.serialConnection.transmitter.deliver(payload);
  return true;
}; // event_label example: "evt1"
// event_value example: "label"


TangleSerialDevice.prototype.emitLabelEvent = function (event_label, event_value, event_timestamp, device_id) {
  if (!this.serialConnection || !this.serialConnection.transmitter) {
    console.warn("Serial device disconnected");
    return false;
  }

  var payload = [FLAGS.FLAG_EMIT_LABEL_EVENT].concat(_toConsumableArray(labelToBytes(event_value)), _toConsumableArray(labelToBytes(event_label)), _toConsumableArray(toBytes(event_timestamp, 4)), [device_id]);
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

  var flags = getTimelineFlags(timeline_index, timeline_paused);
  var payload = [FLAGS.FLAG_SET_TIMELINE].concat(_toConsumableArray(toBytes(getClockTimestamp(), 4)), _toConsumableArray(toBytes(timeline_timestamp, 4)), [flags]);
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

var tangleEvents = createNanoEvents();
var tnglParser = new TnglCodeParser();
var timeTrack = new TimeTrack();
var tangleConnect = window.tangleConnect;
var tangleBluetoothDevice = new TangleBluetoothDevice();
var tangleSerialDevice = new TangleSerialDevice();
window.tangleEvents = tangleEvents;
window.timeTrack = timeTrack;

var tangleEventsAndroid = function tangleEventsAndroid() {};

var TangleConnectANDROID = {
  connect: function connect() {
    var filters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    console.log("Connection is handled by tangleConnect.");
  },
  updateFirmware: function updateFirmware(fw) {
    tangleConnect.updateFirmware(fw);
  },
  // TODO - add  0, timeline_timestamp, timeline_paused) to required function, currently not supported on Java part
  uploadTngl: function uploadTngl(tngl_code) {
    var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    tangleConnect.uploadTngl(tngl_code, timeline_timestamp, timeline_paused);
    timeTrack.setStatus(timeline_timestamp, timeline_paused);
  },
  uploadTnglBytes: function uploadTnglBytes(tngl_bytes) {
    var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    tangleConnect.uploadTnglBytes(tngl_bytes, timeline_timestamp, timeline_paused);
    timeTrack.setStatus(timeline_timestamp, timeline_paused);
  },
  setTimeline: function setTimeline() {
    var timeline_timestamp = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var timeline_paused = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    tangleConnect.setTimeline(timeline_timestamp, timeline_paused);
    timeTrack.setStatus(timeline_timestamp, timeline_paused);
  },
  emitColorEvent: function emitColorEvent(event_name, event_data, event_timestamp, device_id) {
    tangleConnect.emitColorEvent(event_name, event_data, event_timestamp, device_id);
  },
  emitPercentageEvent: function emitPercentageEvent(event_name, event_data, event_timestamp, device_id) {
    tangleConnect.emitPercentageEvent(event_name, event_data, event_timestamp, device_id);
  },
  emitTimeEvent: function emitTimeEvent(event_name, event_data, event_timestamp, device_id) {
    tangleConnect.emitTimeEvent(event_name, event_data, event_timestamp, device_id);
  },
  // for connection events
  initEvents: function initEvents() {
    tangleEventsAndroid = tangleEvents.on("tangle-state", function (e) {
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
        tangleEvents.emit('ota_progress', e.progress);
      }
    }, false);
  },
  destroyEvents: function destroyEvents() {
    tangleEventsAndroid();
  }
};
var TangleConnectWEBBLE = {
  connect: function connect() {
    var filters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    tangleBluetoothDevice.connect();
  },
  disconnect: function disconnect() {
    tangleBluetoothDevice.disconnect();
  },
  updateFirmware: function updateFirmware(fw) {
    tangleBluetoothDevice.updateFirmware(fw);
  },
  uploadTngl: function uploadTngl(tngl_code) {
    var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var tngl_bytes = tnglParser.parseTnglCode(tngl_code);
    tangleBluetoothDevice.uploadTngl(tngl_bytes, 0x00, timeline_timestamp, timeline_paused);
    timeTrack.setStatus(timeline_timestamp, timeline_paused);
    console.log('uploaded');
  },
  uploadTnglBytes: function uploadTnglBytes(tngl_bytes) {
    var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    tangleBluetoothDevice.uploadTngl(tngl_bytes, 0x00, timeline_timestamp, timeline_paused);
    timeTrack.setStatus(timeline_timestamp, timeline_paused);
  },
  setTimeline: function setTimeline() {
    var timeline_timestamp = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var timeline_paused = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    tangleBluetoothDevice.setTimeline(0, timeline_timestamp, timeline_paused);
    timeTrack.setStatus(timeline_timestamp, timeline_paused);
  },
  emitColorEvent: function emitColorEvent(event_name, event_data, event_timestamp, device_id) {
    tangleBluetoothDevice.emitColorEvent(event_name, event_data, event_timestamp, device_id);
  },
  emitPercentageEvent: function emitPercentageEvent(event_name, event_data, event_timestamp, device_id) {
    tangleBluetoothDevice.emitPercentageEvent(event_name, event_data, event_timestamp, device_id);
  },
  emitTimeEvent: function emitTimeEvent(event_name, event_data, event_timestamp, device_id) {
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
  initEvents: function initEvents() {
    tangleBluetoothDevice.bluetoothConnection.addEventListener("connected", function () {
      tangleEvents.emit("connection", "connected");
    });
    tangleBluetoothDevice.bluetoothConnection.addEventListener("disconnected", function () {
      tangleEvents.emit("connection", "disconnected");
    });
  },
  destroyEvents: function destroyEvents() {
    tangleBluetoothDevice.bluetoothConnection.removeEventListener("connected", function () {
      tangleEvents.emit("connection", "connected");
    });
    tangleBluetoothDevice.bluetoothConnection.removeEventListener("disconnected", function () {
      tangleEvents.emit("connection", "disconnected");
    });
  }
};
var TangleConnectWEBSerial = {
  connect: function connect() {
    var filters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    tangleSerialDevice.connect();
  },
  disconnect: function disconnect() {
    tangleSerialDevice.disconnect();
  },
  updateFirmware: function updateFirmware(fw) {
    alert('update firmware not supported on web serial');
    tangleSerialDevice.updateFirmware(fw);
  },
  uploadTngl: function uploadTngl(tngl_code) {
    var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var tngl_bytes = tnglParser.parseTnglCode(tngl_code);
    tangleSerialDevice.uploadTngl(tngl_bytes, 0, timeline_timestamp, timeline_paused);
    timeTrack.setStatus(timeline_timestamp, timeline_paused);
  },
  uploadTnglBytes: function uploadTnglBytes(tngl_bytes) {
    var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    tangleSerialDevice.uploadTngl(tngl_bytes, 0, timeline_timestamp, timeline_paused);
    timeTrack.setStatus(timeline_timestamp, timeline_paused);
  },
  setTimeline: function setTimeline() {
    var timeline_timestamp = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var timeline_paused = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    tangleSerialDevice.setTimeline(0, timeline_timestamp, timeline_paused);
    timeTrack.setStatus(timeline_timestamp, timeline_paused);
  },
  emitColorEvent: function emitColorEvent(event_name, event_data, event_timestamp, device_id) {
    tangleSerialDevice.emitColorEvent(event_name, event_data, event_timestamp, device_id);
  },
  emitPercentageEvent: function emitPercentageEvent(event_name, event_data, event_timestamp, device_id) {
    tangleSerialDevice.emitPercentageEvent(event_name, event_data, event_timestamp, device_id);
  },
  emitTimeEvent: function emitTimeEvent(event_name, event_data, event_timestamp, device_id) {
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
  initEvents: function initEvents() {
    tangleSerialDevice.serialConnection.addEventListener("connected", function () {
      tangleEvents.emit("connection", "connected");
    });
    tangleSerialDevice.serialConnection.addEventListener("disconnected", function () {
      tangleEvents.emit("connection", "disconnected");
    });
  },
  destroyEvents: function destroyEvents() {
    tangleSerialDevice.serialConnection.removeEventListener("connected", function () {
      tangleEvents.emit("connection", "connected");
    });
    tangleSerialDevice.serialConnection.removeEventListener("disconnected", function () {
      tangleEvents.emit("connection", "disconnected");
    });
  }
};
var PlaceHolderConnection = {
  connect: function connect() {
    var filters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    setTimeout(function (_) {
      tangleEvents.emit("connection", "connected");
    }, 200);
  },
  disconnect: function disconnect() {
    setTimeout(function (_) {
      tangleEvents.emit("connection", "disconnected");
    }, 200);
  },
  updateFirmware: function updateFirmware(fw) {},
  uploadTngl: function uploadTngl(tngl_code) {
    var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  },
  uploadTnglBytes: function uploadTnglBytes(tngl_bytes) {
    var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  },
  setTimeline: function setTimeline() {
    var timeline_timestamp = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var timeline_paused = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  },
  emitEvent: function emitEvent(event_code, param, device_id) {},
  emitEvents: function emitEvents(events) {},
  emitColorEvent: function emitColorEvent(event_name, event_data, event_timestamp, device_id) {},
  emitPercentageEvent: function emitPercentageEvent(event_name, event_data, event_timestamp, device_id) {},
  emitTimeEvent: function emitTimeEvent(event_name, event_data, event_timestamp, device_id) {},
  // for connection events
  initEvents: function initEvents() {},
  destroyEvents: function destroyEvents() {}
};
var connectors = {
  "android": TangleConnectANDROID,
  "bluetooth": TangleConnectWEBBLE,
  "serial": TangleConnectWEBSerial,
  "none": PlaceHolderConnection
};

function TangleDevice() {
  var connectionType = "none";
  var connector = connectors.none;

  _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee21() {
    var _window;

    return regeneratorRuntime.wrap(function _callee21$(_context21) {
      while (1) {
        switch (_context21.prev = _context21.next) {
          case 0:
            if (!("tangleConnect" in window)) {
              _context21.next = 6;
              break;
            }

            connectionType = "android";
            connectors['android'].initEvents();
            console.info("Running in Android Bluetooth mode");
            _context21.next = 17;
            break;

          case 6:
            _context21.t0 = "bluetooth" in ((_window = window) === null || _window === void 0 ? void 0 : _window.navigator);

            if (!_context21.t0) {
              _context21.next = 11;
              break;
            }

            _context21.next = 10;
            return navigator.bluetooth.getAvailability();

          case 10:
            _context21.t0 = _context21.sent;

          case 11:
            if (!_context21.t0) {
              _context21.next = 16;
              break;
            }

            connectionType = "bluetooth";
            console.info("Running in WebBluetooth mode");
            _context21.next = 17;
            break;

          case 16:
            if ("serial" in window.navigator) {
              connectionType = "serial";
              console.log("Running in TangleSerialDevice mode.");
            } else {
              connectionType = "none";
              console.error("No supported module found, you need to add atleast one supported connection module.", 'Running in placeholder mode (will be handled in future by Tangle Devtools)');
            }

          case 17:
          case "end":
            return _context21.stop();
        }
      }
    }, _callee21);
  }))();

  connector = connectors[connectionType];
  window.connector = connectors[connectionType];
  window.TangleConnectionType = connectionType;

  function emitMultipleIfArray(func, _ref22) {
    var _ref23 = _slicedToArray(_ref22, 4),
        event_name = _ref23[0],
        event_data = _ref23[1],
        event_timestamp = _ref23[2],
        device_id = _ref23[3];

    var promises = [];

    if (_typeof(device_id) === "object" && device_id.length > 0) {
      if (device_id.find(function (v) {
        return v === 255;
      })) {
        device_id = [255];
      }

      var _iterator = _createForOfIteratorHelper(device_id),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var dev_id = _step.value;
          promises.push(func(event_name, event_data, event_timestamp, dev_id));
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    } else {
      promises.push(func(event_name, event_data, event_timestamp, device_id));
    }

    return Promise.all(promises);
  }

  var connectionHandler = _objectSpread({
    connect: function connect() {
      var _ref24 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
        filters: {}
      },
          filters = _ref24.filters,
          type = _ref24.type;

      // TODO if connector type is not defined use autodecision algorithm
      if (Object.keys(connectors).includes(type)) {
        connector = connectors[type];
        window.connector = connector; // not implemented in TangleConnectors !!!
        // connectors[connectionType].destroyEvents();

        connectionType = type;
        connectors[connectionType].initEvents();
        return connector.connect(filters);
      } else if (connectionType !== 'none') {
        connector = connectors[connectionType]; // connectors[connectionType].destroyEvents();
        // connectionType = 'bluetooth';

        connector.initEvents();
        return connector.connect(filters);
      } else {
        console.error("Connector ".concat(type, " does not exist, or not initialized"));
      }

      debugLog(" .connect", filters);
    },
    disconnect: function disconnect() {
      debugLog(" .disconnect");
      return connector.disconnect();
    },
    updateFirmware: function updateFirmware(fw) {
      debugLog(" .updateFirmware", fw);
      return connector.updateFirmware(fw);
    },
    uploadTngl: function uploadTngl(tngl_code) {
      var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      debugLog(" .uploadTngl", tngl_code, timeline_timestamp, timeline_paused);
      return connector.uploadTngl(tngl_code, timeline_timestamp = 0, timeline_paused = false);
    },
    uploadTnglBytes: function uploadTnglBytes(tngl_bytes) {
      var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      debugLog(" .uploadTnglBytes", tngl_bytes, timeline_timestamp, timeline_paused);
      return connector.uploadTnglBytes(tngl_bytes, timeline_timestamp = 0, timeline_paused = false);
    },
    setTimeline: function setTimeline() {
      var timeline_timestamp = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var timeline_paused = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      debugLog(" .setTime", timeline_timestamp, timeline_paused);
      return connector.setTimeline(timeline_timestamp, timeline_paused);
    },
    emitColorEvent: function emitColorEvent(event_name, event_data) {
      var device_id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 255;
      var event_timestamp = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : timeTrack.millis();
      debugLog(" .emitColorEvent", event_name, event_data, device_id, event_timestamp);
      return emitMultipleIfArray(connector.emitColorEvent, [event_name, event_data, event_timestamp, device_id]);
    },
    emitPercentageEvent: function emitPercentageEvent(event_name, event_data) {
      var device_id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 255;
      var event_timestamp = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : timeTrack.millis();
      debugLog(" .emitPercentageEvent", event_name, event_data, device_id, event_timestamp);
      return emitMultipleIfArray(connector.emitPercentageEvent, [event_name, event_data, event_timestamp, device_id]);
    },
    emitTimeEvent: function emitTimeEvent(event_name, event_data) {
      var device_id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 255;
      var event_timestamp = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : timeTrack.millis();
      debugLog(" .emitTimeEvent", event_name, event_data, device_id, event_timestamp);
      return emitMultipleIfArray(connector.emitTimeEvent, [event_name, event_data, event_timestamp, device_id]);
    },
    // emitEvent: (event_code, param, device_id) => {
    //   debugLog(" .triggeremitEvent", 3, event_code, param, device_id, timeTrack.millis());
    //   return connector.emitEvent(event_code, param, device_id);
    // },
    // emitEvents: (events) => {
    //   debugLog(" .emitEvents", events);
    //   return connector.emitEvents(events);
    // },
    // for connection events
    initEvents: function initEvents() {
      return connector.initEvents();
    },
    destroyEvents: function destroyEvents() {
      return connector.destroyEvents();
    },
    getConnectionType: function getConnectionType() {
      return connectionType;
    }
  }, tangleEvents);

  window.tangleDevice = connectionHandler;
  return connectionHandler;
}

var tangleDevice = TangleDevice();
export { tangleDevice };
