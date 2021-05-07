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

function TnglCodeParser() {} // TnglCodeParser.prototype.TRIGGERS = Object.freeze({
//   /* null */
//   NONE: 0,
//   TOUCH: 1,
//   MOVEMENT: 2,
//   KEYPRESS: 3,
//   TEST: 255,
// });


TnglCodeParser.prototype.CONSTANTS = Object.freeze({
  MODIFIER_SWITCH_NONE: 0,
  MODIFIER_SWITCH_RG: 1,
  MODIFIER_SWITCH_GB: 2,
  MODIFIER_SWITCH_BR: 3,
  DEVICE_ID_APP: 255
});
TnglCodeParser.prototype.FLAGS = Object.freeze({
  /* no code or command used by decoder as a validation */
  NONE: 0,

  /* filters 1 -> 30 */
  FILTER_NONE: 1,
  FILTER_BLUR: 2,
  FILTER_COLOR_SHIFT: 3,
  FILTER_MIRROR: 4,
  FILTER_SCATTER: 5,

  /* drawings 31 -> 36 */
  DRAWING_SET: 31,
  DRAWING_ADD: 32,
  DRAWING_SUB: 33,
  DRAWING_SCALE: 34,
  DRAWING_FILTER: 35,

  /* windows 37 -> 42 */
  WINDOW_SET: 37,
  WINDOW_ADD: 38,
  WINDOW_SUB: 39,
  WINDOW_SCALE: 40,
  WINDOW_FILTER: 41,

  /* frame 42 */
  FRAME: 42,

  /* clip 43 */
  CLIP: 43,

  /* sifters 46 -> 52 */
  SIFT_DEVICE: 46,
  SIFT_TANGLE: 47,
  SIFT_GROUP: 48,

  /* event handler 53 */
  HANDLER: 53,

  /* animations 54 -> 182 */
  ANIMATION_NONE: 54,
  ANIMATION_FILL: 55,
  ANIMATION_RAINBOW: 56,
  ANIMATION_FADE: 57,
  ANIMATION_PROJECTILE: 58,
  ANIMATION_LOADING: 59,
  ANIMATION_COLOR_ROLL: 60,
  ANIMATION_PALLETTE_ROLL: 61,
  ANIMATION_INL_ANI: 62,
  ANIMATION_DEFINED: 63,

  /* modifiers and filters 189 -> 206 */
  MODIFIER_BRIGHTNESS: 189,
  MODIFIER_TIMELINE: 190,
  MODIFIER_FADE_IN: 191,
  MODIFIER_FADE_OUT: 192,
  MODIFIER_SWITCH_COLORS: 193,
  MODIFIER_TIME_LOOP: 194,
  MODIFIER_TIME_SCALE: 195,
  MODIFIER_TIME_CHANGE: 196,

  /* variables 207 -> 222 */
  DEVICE: 207,
  TANGLE: 208,
  PIXELS: 209,
  PORT: 210,
  GROUP: 211,
  MARK: 212,
  CONSTANT: 213,
  CHANNEL: 214,
  EVENT: 215,

  /* definitions 223 -> 230 */
  DEFINE_DEVICE_1PORT: 223,
  DEFINE_DEVICE_2PORT: 224,
  DEFINE_DEVICE_4PORT: 225,
  DEFINE_DEVICE_8PORT: 226,
  DEFINE_TANGLE: 227,
  DEFINE_GROUP: 228,
  DEFINE_MARKS: 229,
  DEFINE_ANIMATION: 230,

  /* events 231 -> 240 */
  EVENT_EMIT: 231,
  EVENT_ON: 232,
  EVENT_SET_PARAM: 233,

  /* channels 240 -> 250 */
  CHANNEL_WRITE: 240,
  CHANNEL_PARAMETER_VALUE: 241,
  CHANNEL_PARAMETER_VALUE_SMOOTHED: 242,
  CHANNEL_ADD_VALUES: 243,
  CHANNEL_SUB_VALUES: 244,
  CHANNEL_MUL_VALUES: 245,
  CHANNEL_DIV_VALUES: 246,
  CHANNEL_MOD_VALUES: 247,
  CHANNEL_SCALE_VALUE: 248,
  CHANNEL_MAP_VALUE: 249,

  /* command flags */
  FLAG_TNGL_BYTES: 251,
  FLAG_SET_TIMELINE: 252,
  FLAG_EMIT_EVENT: 253,

  /* command ends */
  END_OF_STATEMENT: 254,
  END_OF_TNGL_BYTES: 255
});

TnglCodeParser.prototype.parseTnglCode = function (tngl_code) {
  var buffer = new ArrayBuffer(65535);
  var payload = new DataView(buffer);
  payload.cursor = 0;

  payload.fillCommand = function (tngl_code) {
    payload.setUint8(payload.cursor++, tngl_code);
  };

  payload.fillByte = function (value) {
    payload.setUint8(payload.cursor++, parseInt(value, 16));
  };

  payload.fillUInt8 = function (value) {
    payload.setUint8(payload.cursor++, value);
  };

  payload.fillInt16 = function (value) {
    payload.setUint8(payload.cursor++, value);
    payload.setUint8(payload.cursor++, value >> 8);
  };

  payload.fillInt32 = function (value) {
    payload.setUint8(payload.cursor++, value);
    payload.setUint8(payload.cursor++, value >> 8);
    payload.setUint8(payload.cursor++, value >> 16);
    payload.setUint8(payload.cursor++, value >> 24);
  };

  payload.fillRGB = function (r, g, b) {
    payload.setUint8(payload.cursor++, r);
    payload.setUint8(payload.cursor++, g);
    payload.setUint8(payload.cursor++, b);
  };

  payload.fillPercentage = function (percent) {
    payload.setUint16(payload.cursor++, Math.round(percent / 100.0 * 0xffff));
  };

  var parses = {
    comment: /\/\/[^\n]*/,
    htmlrgb: /#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/i,
    string: /"([\w ]*)"/,
    arrow: /->/,
    "char": /'([\W\w])'/,
    "byte": /(0[xX][0-9a-fA-F][0-9a-fA-F](?![0-9a-fA-F]))/,
    word: /([a-zA-Z_][a-zA-Z_0-9]*)/,
    percentage: /([\d.]+)%/,
    "float": /([+-]?[0-9]*[.][0-9]+)/,
    number: /([+-]?[0-9]+)/,
    whitespace: /(\s+)/,
    punctuation: /([^\w\s])/
  };
  console.log(tngl_code);

  var tokens = this._tokenize(tngl_code, parses);

  console.log(tokens);
  payload.fillCommand(this.FLAGS.FLAG_TNGL_BYTES);

  for (var index = 0; index < tokens.length; index++) {
    var element = tokens[index];

    if (element.type === "whitespace") {
      continue;
    } else if (element.type === "char") {
      payload.fillUInt8(element.matches[0].charCodeAt(0));
    } else if (element.type === "byte") {
      payload.fillByte(element.matches[0]);
    } else if (element.type === "string") {
      for (var _index = 0; _index < 8; _index++) {
        payload.fillUInt8(element.matches[0].charCodeAt(_index));
      }
    } else if (element.type === "punctuation") {
      if (element.matches[0] === "{") {
        continue;
      } else if (element.matches[0] === "}") {
        payload.fillCommand(this.FLAGS.END_OF_STATEMENT);
      } else if (element.matches[0] === "[") {
        continue;
      } else if (element.matches[0] === "]") {
        continue;
      } else if (element.matches[0] === "(") {
        continue;
      } else if (element.matches[0] === ")") {
        continue;
      } else if (element.matches[0] === ";") {
        continue;
      } else if (element.matches[0] === ".") {
        continue;
      } else if (element.matches[0] === ",") {
        continue;
      } else {
        console.warn("Unknown punctuation >", element.matches[0], "<");
      }
    } else if (element.type === "word") {
      // === true, false ===
      if (element.matches[0] === "true") {
        payload.fillUInt8(0x01);
      } else if (element.matches[0] === "false") {
        payload.fillUInt8(0x00);
      } // === canvas operations ===
      else if (element.matches[0] === "setDrawing") {
          payload.fillCommand(this.FLAGS.DRAWING_SET);
        } else if (element.matches[0] === "addDrawing") {
          payload.fillCommand(this.FLAGS.DRAWING_ADD);
        } else if (element.matches[0] === "subDrawing") {
          payload.fillCommand(this.FLAGS.DRAWING_SUB);
        } else if (element.matches[0] === "scaDrawing") {
          payload.fillCommand(this.FLAGS.DRAWING_SCALE);
        } else if (element.matches[0] === "filDrawing") {
          payload.fillCommand(this.FLAGS.DRAWING_FILTER);
        } else if (element.matches[0] === "setWindow") {
          payload.fillCommand(this.FLAGS.WINDOW_SET);
        } else if (element.matches[0] === "addWindow") {
          payload.fillCommand(this.FLAGS.WINDOW_ADD);
        } else if (element.matches[0] === "subWindow") {
          payload.fillCommand(this.FLAGS.WINDOW_SUB);
        } else if (element.matches[0] === "scaWindow") {
          payload.fillCommand(this.FLAGS.WINDOW_SCALE);
        } else if (element.matches[0] === "filWindow") {
          payload.fillCommand(this.FLAGS.WINDOW_FILTER);
        } // === time operations ===
        else if (element.matches[0] === "frame") {
            payload.fillCommand(this.FLAGS.FRAME);
          } else if (element.matches[0] === "timetransformer") {
            payload.fillCommand(this.FLAGS.TIMETRANSFORMER_CONVERT);
          } else if (element.matches[0] === "timeloop") {
            payload.fillCommand(this.FLAGS.TIMETRANSFORMER_LOOP);
          } // === animations ===
          else if (element.matches[0] === "animDefined") {
              payload.fillCommand(this.FLAGS.ANIMATION_DEFINED);
            } else if (element.matches[0] === "animNone") {
              payload.fillCommand(this.FLAGS.ANIMATION_NONE);
            } else if (element.matches[0] === "animFill") {
              payload.fillCommand(this.FLAGS.ANIMATION_FILL);
            } else if (element.matches[0] === "animRainbow") {
              payload.fillCommand(this.FLAGS.ANIMATION_RAINBOW);
            } else if (element.matches[0] === "animPlasmaShot") {
              payload.fillCommand(this.FLAGS.ANIMATION_PROJECTILE);
            } else if (element.matches[0] === "animLoadingBar") {
              payload.fillCommand(this.FLAGS.ANIMATION_LOADING);
            } else if (element.matches[0] === "animFade") {
              payload.fillCommand(this.FLAGS.ANIMATION_FADE);
            } else if (element.matches[0] === "animColorRoll") {
              payload.fillCommand(this.FLAGS.ANIMATION_COLOR_ROLL);
            } else if (element.matches[0] === "animPaletteRoll") {
              payload.fillCommand(this.FLAGS.ANIMATION_PALLETTE_ROLL);
            } // === handlers ===
            else if (element.matches[0] === "eventHandler") {
                payload.fillCommand(this.FLAGS.HANDLER);
              } // === clip ===
              else if (element.matches[0] === "clip") {
                  payload.fillCommand(this.FLAGS.CLIP);
                } // === definitions ===
                else if (element.matches[0] === "defAnimation") {
                    payload.fillCommand(this.FLAGS.DEFINE_ANIMATION);
                  } else if (element.matches[0] === "defDevice1") {
                    payload.fillCommand(this.FLAGS.DEFINE_DEVICE_1PORT);
                  } else if (element.matches[0] === "defDevice2") {
                    payload.fillCommand(this.FLAGS.DEFINE_DEVICE_2PORT);
                  } else if (element.matches[0] === "defDevice4") {
                    payload.fillCommand(this.FLAGS.DEFINE_DEVICE_4PORT);
                  } else if (element.matches[0] === "defDevice8") {
                    payload.fillCommand(this.FLAGS.DEFINE_DEVICE_8PORT);
                  } else if (element.matches[0] === "defTangle") {
                    payload.fillCommand(this.FLAGS.DEFINE_TANGLE);
                  } else if (element.matches[0] === "defGroup") {
                    payload.fillCommand(this.FLAGS.DEFINE_GROUP);
                  } else if (element.matches[0] === "defMarks") {
                    payload.fillCommand(this.FLAGS.DEFINE_MARKS);
                  } // === sifters ===
                  else if (element.matches[0] === "siftDevices") {
                      payload.fillCommand(this.FLAGS.SIFT_DEVICE);
                    } else if (element.matches[0] === "siftTangles") {
                      payload.fillCommand(this.FLAGS.SIFT_TANGLE);
                    } else if (element.matches[0] === "siftGroups") {
                      payload.fillCommand(this.FLAGS.SIFT_GROUP);
                    } // === variables ===
                    else if (element.matches[0] === "device") {
                        payload.fillCommand(this.FLAGS.DEVICE);
                      } else if (element.matches[0] === "tangle") {
                        payload.fillCommand(this.FLAGS.TANGLE);
                      } else if (element.matches[0] === "pixels") {
                        payload.fillCommand(this.FLAGS.PIXELS);
                      } else if (element.matches[0] === "port") {
                        payload.fillCommand(this.FLAGS.PORT);
                      } else if (element.matches[0] === "group") {
                        payload.fillCommand(this.FLAGS.GROUP);
                      } else if (element.matches[0] === "mark") {
                        payload.fillCommand(this.FLAGS.MARK);
                      } else if (element.matches[0] === "constant") {
                        payload.fillCommand(this.FLAGS.CONSTANT);
                      } else if (element.matches[0] === "channel") {
                        payload.fillCommand(this.FLAGS.CHANNEL);
                      } else if (element.matches[0] === "event") {
                        payload.fillCommand(this.FLAGS.EVENT);
                      } // === modifiers ===
                      else if (element.matches[0] === "modifyBrightness") {
                          payload.fillCommand(this.FLAGS.MODIFIER_BRIGHTNESS);
                        } else if (element.matches[0] === "modifyTimeline") {
                          payload.fillCommand(this.FLAGS.MODIFIER_TIMELINE);
                        } else if (element.matches[0] === "modifyFadeIn") {
                          payload.fillCommand(this.FLAGS.MODIFIER_FADE_IN);
                        } else if (element.matches[0] === "modifyFadeOut") {
                          payload.fillCommand(this.FLAGS.MODIFIER_FADE_OUT);
                        } else if (element.matches[0] === "modifyColorSwitch") {
                          payload.fillCommand(this.FLAGS.MODIFIER_SWITCH_COLORS);
                        } else if (element.matches[0] === "modifyTimeLoop") {
                          payload.fillCommand(this.FLAGS.MODIFIER_TIME_LOOP);
                        } else if (element.matches[0] === "modifyTimeScale") {
                          payload.fillCommand(this.FLAGS.MODIFIER_TIME_SCALE);
                        } else if (element.matches[0] === "modifyTimeChange") {
                          payload.fillCommand(this.FLAGS.MODIFIER_TIME_CHANGE);
                        } // === filters ===
                        else if (element.matches[0] === "filterNone") {
                            payload.fillCommand(this.FLAGS.FILTER_NONE);
                          } else if (element.matches[0] === "filterBlur") {
                            payload.fillCommand(this.FLAGS.FILTER_BLUR);
                          } else if (element.matches[0] === "filterColorShift") {
                            payload.fillCommand(this.FLAGS.FILTER_COLOR_SHIFT);
                          } else if (element.matches[0] === "filterMirror") {
                            payload.fillCommand(this.FLAGS.FILTER_MIRROR);
                          } else if (element.matches[0] === "filterScatter") {
                            payload.fillCommand(this.FLAGS.FILTER_SCATTER);
                          } // === channels ===
                          else if (element.matches[0] === "writeChannel") {
                              payload.fillCommand(this.FLAGS.CHANNEL_WRITE);
                            } else if (element.matches[0] === "eventParameterValue") {
                              payload.fillCommand(this.FLAGS.CHANNEL_PARAMETER_VALUE);
                            } else if (element.matches[0] === "eventParameterValueSmoothed") {
                              payload.fillCommand(this.FLAGS.CHANNEL_PARAMETER_VALUE_SMOOTHED);
                            } else if (element.matches[0] === "addValues") {
                              payload.fillCommand(this.FLAGS.CHANNEL_ADD_VALUES);
                            } else if (element.matches[0] === "subValues") {
                              payload.fillCommand(this.FLAGS.CHANNEL_SUB_VALUES);
                            } else if (element.matches[0] === "mulValues") {
                              payload.fillCommand(this.FLAGS.CHANNEL_MUL_VALUES);
                            } else if (element.matches[0] === "divValues") {
                              payload.fillCommand(this.FLAGS.CHANNEL_DIV_VALUES);
                            } else if (element.matches[0] === "modValues") {
                              payload.fillCommand(this.FLAGS.CHANNEL_MOD_VALUES);
                            } else if (element.matches[0] === "scaValue") {
                              payload.fillCommand(this.FLAGS.CHANNEL_SCALE_VALUE);
                            } else if (element.matches[0] === "mapValue") {
                              payload.fillCommand(this.FLAGS.CHANNEL_MAP_VALUE);
                            } // === events ===
                            else if (element.matches[0] === "emitEvent") {
                                payload.fillCommand(this.FLAGS.EVENT_EMIT);
                              } else if (element.matches[0] === "onEvent") {
                                payload.fillCommand(this.FLAGS.EVENT_ON);
                              } else if (element.matches[0] === "setEventParam") {
                                payload.fillCommand(this.FLAGS.EVENT_SET_PARAM);
                              } // === constants ===
                              else if (element.matches[0] === "MODIFIER_SWITCH_NONE") {
                                  payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_NONE);
                                } else if (element.matches[0] === "MODIFIER_SWITCH_RG") {
                                  payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_RG);
                                } else if (element.matches[0] === "MODIFIER_SWITCH_GR") {
                                  payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_RG);
                                } else if (element.matches[0] === "MODIFIER_SWITCH_GB") {
                                  payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_GB);
                                } else if (element.matches[0] === "MODIFIER_SWITCH_BG") {
                                  payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_GB);
                                } else if (element.matches[0] === "MODIFIER_SWITCH_BR") {
                                  payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_BR);
                                } else if (element.matches[0] === "MODIFIER_SWITCH_RB") {
                                  payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_BR);
                                } // === unknown ===
                                else {
                                    console.warn("Unknown word >", element.matches[0], "<");
                                  }
    } else if (element.type === "percentage") {
      payload.fillPercentage(element.matches[0]);
    } else if (element.type === "number") {
      payload.fillInt32(element.matches[0]);
    } else if (element.type === "htmlrgb") {
      payload.fillRGB(parseInt(element.matches[0], 16), parseInt(element.matches[1], 16), parseInt(element.matches[2], 16));
    } else if (element.type === "comment") ;else if (element.type === "arrow") ;else {
      console.warn("Unknown type >", element.type, "<");
    }
  }

  payload.fillCommand(this.FLAGS.END_OF_TNGL_BYTES);
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
}; // // LZW-compress a string
// function lzw_encode(s) {
//   var dict = {};
//   var data = (s + "").split("");
//   var out = [];
//   var currChar;
//   var phrase = data[0];
//   var code = 256;
//   for (var i=1; i<data.length; i++) {
//       currChar=data[i];
//       if (dict[phrase + currChar] != null) {
//           phrase += currChar;
//       }
//       else {
//           out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
//           dict[phrase + currChar] = code;
//           code++;
//           phrase=currChar;
//       }
//   }
//   out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
//   for (var i=0; i<out.length; i++) {
//       out[i] = String.fromCharCode(out[i]);
//   }
//   return out.join("");
// }
// // Decompress an LZW-encoded string
// function lzw_decode(s) {
//   var dict = {};
//   var data = (s + "").split("");
//   var currChar = data[0];
//   var oldPhrase = currChar;
//   var out = [currChar];
//   var code = 256;
//   var phrase;
//   for (var i=1; i<data.length; i++) {
//       var currCode = data[i].charCodeAt(0);
//       if (currCode < 256) {
//           phrase = data[i];
//       }
//       else {
//          phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
//       }
//       out.push(phrase);
//       currChar = phrase.charAt(0);
//       dict[code] = oldPhrase + currChar;
//       code++;
//       oldPhrase = phrase;
//   }
//   return out.join("");
// }


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
}();

var timeOffset = new Date().getTime() % 0x7fffffff; // The MIT License (MIT)
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
} //////////////////////////////////////////////////////////////////////////


function Transmitter() {
  this.TERMINAL_CHAR_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
  this.SYNC_CHAR_UUID = "0000ffe2-0000-1000-8000-00805f9b34fb";
  this._service = null;
  this._terminalChar = null;
  this._syncChar = null;
  this._writing = false;
  this._queue = [];
}

Transmitter.prototype.attach = function (service) {
  var _this2 = this;

  this._service = service;
  return this._service.getCharacteristic(this.TERMINAL_CHAR_UUID).then(function (characteristic) {
    _this2._terminalChar = characteristic;
    return _this2._service.getCharacteristic(_this2.SYNC_CHAR_UUID);
  }).then(function (characteristic) {
    _this2._syncChar = characteristic;

    _this2.deliver(); // kick off transfering thread if there are item in queue

  });
}; // Transmitter.prototype.disconnect = function () {
//   this._service = null;
//   this._terminalChar = null;
//   this._syncChar = null;
// };


Transmitter.prototype._writeTerminal = function (payload, response) {
  var _this3 = this;

  //console.log("_writeTerminal()");
  return new Promise( /*#__PURE__*/function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(resolve, reject) {
      var payload_uuid, packet_header_size, packet_size, bytes_size, index_from, index_to, error, bytes;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              payload_uuid = parseInt(Math.random() * 0xffffffff);
              packet_header_size = 12; // 3x 4byte integers: payload_uuid, index_from, payload.length

              packet_size = 512; // min size packet_header_size + 1
              //const packet_size = 128;

              bytes_size = packet_size - packet_header_size;
              index_from = 0;
              index_to = bytes_size;
              error = null;

            case 7:
              if (!(index_from < payload.length)) {
                _context.next = 28;
                break;
              }

              if (index_to > payload.length) {
                index_to = payload.length;
              }

              bytes = [].concat(_toConsumableArray(toBytes(payload_uuid, 4)), _toConsumableArray(toBytes(index_from, 4)), _toConsumableArray(toBytes(payload.length, 4)), _toConsumableArray(payload.slice(index_from, index_to)));
              _context.prev = 10;

              if (!response) {
                _context.next = 16;
                break;
              }

              _context.next = 14;
              return _this3._terminalChar.writeValueWithResponse(new Uint8Array(bytes));

            case 14:
              _context.next = 18;
              break;

            case 16:
              _context.next = 18;
              return _this3._terminalChar.writeValueWithoutResponse(new Uint8Array(bytes));

            case 18:
              _context.next = 24;
              break;

            case 20:
              _context.prev = 20;
              _context.t0 = _context["catch"](10);
              error = _context.t0;
              return _context.abrupt("break", 28);

            case 24:
              index_from += bytes_size;
              index_to = index_from + bytes_size;
              _context.next = 7;
              break;

            case 28:
              if (error) {
                reject(error);
              } else {
                resolve();
              }

            case 29:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, null, [[10, 20]]);
    }));

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }());
}; // deliver() thansfers data reliably to the Bluetooth Device. It might not be instant.
// It may even take ages to get to the device, but it will! (in theory)


Transmitter.prototype.deliver = function (data) {
  var _this4 = this;

  //console.log("deliver()");
  if (data) {
    this._queue.push({
      payload: data,
      reliable: true
    });
  }

  if (!this._writing) {
    this._writing = true; // spawn async function to handle the transmittion one payload at the time

    _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
      var item;
      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (!(_this4._queue.length > 0)) {
                _context2.next = 15;
                break;
              }

              //let timestamp = Date.now();
              item = _this4._queue.shift();
              _context2.prev = 2;
              _context2.next = 5;
              return _this4._writeTerminal(item.payload, item.reliable);

            case 5:
              _context2.next = 13;
              break;

            case 7:
              _context2.prev = 7;
              _context2.t0 = _context2["catch"](2);
              console.warn(_context2.t0); //console.warn("write to the characteristics was unsuccessful");
              // if writing characteristic fail, then stop transmitting
              // but keep data to transmit in queue

              if (item.reliable) _this4._queue.unshift(item);
              _this4._writing = false;
              return _context2.abrupt("return");

            case 13:
              _context2.next = 0;
              break;

            case 15:
              _this4._writing = false;

            case 16:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, null, [[2, 7]]);
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
  var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(timestamp) {
    var _this5 = this;

    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            return _context4.abrupt("return", new Promise( /*#__PURE__*/function () {
              var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(resolve, reject) {
                var success, bytes;
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        success = true;
                        bytes = _toConsumableArray(toBytes(timestamp, 4));
                        _context3.next = 4;
                        return _this5._syncChar.writeValueWithoutResponse(new Uint8Array(bytes))["catch"](function (e) {
                          console.warn(e);
                          success = false;
                        });

                      case 4:
                        _context3.next = 6;
                        return _this5._syncChar.writeValueWithoutResponse(new Uint8Array([]))["catch"](function (e) {
                          console.warn(e);
                          success = false;
                        });

                      case 6:
                        if (success) {
                          resolve();
                        } else {
                          reject();
                        }

                      case 7:
                      case "end":
                        return _context3.stop();
                    }
                  }
                }, _callee3);
              }));

              return function (_x4, _x5) {
                return _ref4.apply(this, arguments);
              };
            }()));

          case 1:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));

  return function (_x3) {
    return _ref3.apply(this, arguments);
  };
}(); // sync() synchronizes the device clock


Transmitter.prototype.sync = /*#__PURE__*/function () {
  var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(timestamp) {
    var success;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            if (this._writing) {
              _context5.next = 9;
              break;
            }

            this._writing = true;
            success = true;
            _context5.next = 5;
            return this._writeSync(timestamp)["catch"](function (e) {
              console.warn(e);
              success = false;
            });

          case 5:
            this._writing = false;
            return _context5.abrupt("return", success);

          case 9:
            return _context5.abrupt("return", false);

          case 10:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function (_x6) {
    return _ref5.apply(this, arguments);
  };
}(); // clears the queue of items to send


Transmitter.prototype.reset = function () {
  this._writing = false;
  this._queue = [];
}; /////////////////////////////////////////////////////////////////////////////////////
// Tangle Bluetooth Device


function TangleBluetoothConnection() {
  this.TRANSMITTER_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
  this.BLE_OPTIONS = {
    acceptAllDevices: true,
    //   filters: [
    //     { services: [TRANSMITTER_SERVICE_UUID] }
    //     // {services: [0xffe0, 0x1803]},
    //     // {services: ['c48e6067-5295-48d3-8d5c-0395f61792b1']},
    //     // {name: 'ExampleName'},
    //   ]
    optionalServices: [this.TRANSMITTER_SERVICE_UUID]
  };
  this.bluetoothDevice = null;
  this.transmitter = null;
  this.eventEmitter = createNanoEvents();
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
  var _this6 = this;

  //console.log("scan()");
  if (this.bluetoothDevice) {
    this.disconnect();
  }

  return navigator.bluetooth.requestDevice(this.BLE_OPTIONS).then(function (device) {
    _this6.bluetoothDevice = device;
    _this6.bluetoothDevice.connection = _this6;

    _this6.bluetoothDevice.addEventListener("gattserverdisconnected", _this6.onDisconnected);
  });
};
/**
 * TODO - add filter params
 */


TangleBluetoothConnection.prototype.connect = function () {
  var _this7 = this;

  //console.log("connect()");
  //console.log("> Connecting to Bluetooth device...");
  return this.bluetoothDevice.gatt.connect().then(function (server) {
    //console.log("> Getting the Bluetooth Service...");
    return server.getPrimaryService(_this7.TRANSMITTER_SERVICE_UUID);
  }).then(function (service) {
    //console.log("> Getting the Service Characteristic...");
    if (!_this7.transmitter) {
      _this7.transmitter = new Transmitter();
    }

    return _this7.transmitter.attach(service);
  }).then(function () {
    _this7.connected = true;
    {
      var event = {};
      event.target = _this7;

      _this7.eventEmitter.emit("connected", event);
    }
  });
};

TangleBluetoothConnection.prototype.reconnect = function () {
  //console.log("reconnect()");
  if (this.connected && this.bluetoothDevice.gatt.connected) {
    //console.log("> Bluetooth Device is already connected");
    return Promise.resolve();
  }

  return this.connect();
};

TangleBluetoothConnection.prototype.disconnect = function () {
  //console.log("disconnect()");
  if (!this.bluetoothDevice) {
    return;
  } //console.log("> Disconnecting from Bluetooth Device...");
  // wanted disconnect removes the transmitter


  this.transmitter = null;

  if (this.connected && this.bluetoothDevice.gatt.connected) {
    this.bluetoothDevice.gatt.disconnect();
  }
}; // Object event.target is Bluetooth Device getting disconnected.


TangleBluetoothConnection.prototype.onDisconnected = function (e) {
  //console.log("> Bluetooth Device disconnected");
  var self = e.target.connection;
  self.connected = false;
  {
    var event = {};
    event.target = self;
    self.eventEmitter.emit("disconnected", event);
  }
}; //////////////////////////////////////////////////////////////////////////


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

  if (event.target.transmitter) {
    setTimeout(function () {
      console.log("Reconnecting device...");
      return event.target.reconnect().then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6() {
        var success, index;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                success = false;
                index = 0;

              case 2:
                if (!(index < 3)) {
                  _context6.next = 15;
                  break;
                }

                _context6.next = 5;
                return event.target.transmitter.sync(getClockTimestamp());

              case 5:
                if (!_context6.sent) {
                  _context6.next = 10;
                  break;
                }

                success = true;
                return _context6.abrupt("break", 15);

              case 10:
                _context6.next = 12;
                return sleep(100);

              case 12:
                index++;
                _context6.next = 2;
                break;

              case 15:
                if (success) {
                  console.log("Sync time success");
                } else {
                  console.error("Sync time on connection failed");
                }

              case 16:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6);
      })))["catch"](function (error) {
        console.error(error);
      });
    }, 1000);
  }
};

TangleBluetoothDevice.prototype.onConnect = function (event) {
  console.log("Bluetooth Device connected");
};

TangleBluetoothDevice.prototype.connect = function () {
  var _this8 = this;

  return this.bluetoothConnection.scan().then(function () {
    return _this8.bluetoothConnection.connect();
  }).then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7() {
    var success, index;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            success = false;
            index = 0;

          case 2:
            if (!(index < 3)) {
              _context7.next = 15;
              break;
            }

            _context7.next = 5;
            return _this8.bluetoothConnection.transmitter.sync(getClockTimestamp());

          case 5:
            if (!_context7.sent) {
              _context7.next = 10;
              break;
            }

            success = true;
            return _context7.abrupt("break", 15);

          case 10:
            _context7.next = 12;
            return sleep(100);

          case 12:
            index++;
            _context7.next = 2;
            break;

          case 15:
            if (success) {
              console.log("Sync time success");
            } else {
              console.error("Sync time on connection failed");
            }

          case 16:
          case "end":
            return _context7.stop();
        }
      }
    }, _callee7);
  })))["catch"](function (error) {
    console.warn(error);
  });
};

TangleBluetoothDevice.prototype.reconnect = function () {
  var _this9 = this;

  return this.bluetoothConnection.reconnect().then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8() {
    var success, index;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            success = false;
            index = 0;

          case 2:
            if (!(index < 3)) {
              _context8.next = 15;
              break;
            }

            _context8.next = 5;
            return _this9.bluetoothConnection.transmitter.sync(getClockTimestamp());

          case 5:
            if (!_context8.sent) {
              _context8.next = 10;
              break;
            }

            success = true;
            return _context8.abrupt("break", 15);

          case 10:
            _context8.next = 12;
            return sleep(100);

          case 12:
            index++;
            _context8.next = 2;
            break;

          case 15:
            if (success) {
              console.log("Sync time success");
            } else {
              console.error("Sync time on connection failed");
            }

          case 16:
          case "end":
            return _context8.stop();
        }
      }
    }, _callee8);
  })))["catch"](function (error) {
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

  var payload = [FLAGS.FLAG_EMIT_EVENT, device_id, code, parameter].concat(_toConsumableArray(toBytes(timeline_timestamp, 4)));
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

  var payload = [];

  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    var bytes = [FLAGS.FLAG_EMIT_EVENT, e.device_id, e.code, e.parameter].concat(_toConsumableArray(toBytes(e.timeline_timestamp, 4)));
    payload.push.apply(payload, _toConsumableArray(bytes));
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

function initBluetoothDevice() {
  return new TangleBluetoothDevice();
}

function initSerialDevice() {}

function TangleDevice() {
  var _window;

  var _ref9 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
    ble: initBluetoothDevice(),
    serial: initSerialDevice()
  },
      ble = _ref9.ble,
      serial = _ref9.serial;

  var tnglParser = new TnglCodeParser();
  var timeTrack = new TimeTrack();

  function debugLog() {
    if (window.debug === true) {
      var _console;

      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      (_console = console).log.apply(_console, ["TangleDevice"].concat(args));
    }
  }

  var tangleDevice;
  var tangleBluetoothDevice = ble;
  var tangleSerialDevice = serial;

  if ("tangleConnect" in window) {
    var tangleConnect = window.tangleConnect;
    var TangleConnectANDROID = {
      connect: function connect() {
        var filters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        console.log("Connection is handled by tangleConnect.");
      },
      uploadTngl: function uploadTngl(tngl_code) {
        var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
        var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        console.info("posilam TNGL Kod uploadTngl()");
        tangleConnect.uploadTngl(tngl_code, timeline_timestamp, timeline_paused);
        timeTrack.setStatus(timeline_timestamp, timeline_paused);
      },
      uploadTnglBytes: function uploadTnglBytes(tngl_bytes) {
        var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
        var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        console.info("posilam TNGL bajty uploadTnglBytes()");
        tangleConnect.uploadTnglBytes(tngl_bytes, timeline_timestamp, timeline_paused);
        timeTrack.setStatus(timeline_timestamp, timeline_paused);
      },
      setTime: function setTime() {
        var timeline_timestamp = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
        var timeline_paused = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        console.info("posilam setTime setTime()");
        tangleConnect.setTime(timeline_timestamp, timeline_paused);
        timeTrack.setStatus(timeline_timestamp, timeline_paused);
      },
      trigger: function trigger(character) {
        console.warn("Ignoring, not supported yet on tangleConnect");
      }
    };
    tangleDevice = TangleConnectANDROID;
    console.info("Running in Android Bluetooth mode");
  } else if ("bluetooth" in ((_window = window) === null || _window === void 0 ? void 0 : _window.navigator)) {
    var TangleConnectWEBBLE = {
      connect: function connect() {
        var filters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        tangleBluetoothDevice.connect();
        debugLog(".connect", filters);
      },
      uploadTngl: function uploadTngl(tngl_code) {
        var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
        var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        var tngl_bytes = tnglParser.parseTnglCode(tngl_code);
        tangleBluetoothDevice.uploadTngl(tngl_bytes, 0, timeline_timestamp, timeline_paused);
        timeTrack.setStatus(timeline_timestamp, timeline_paused);
        debugLog(".uploadTngl", tngl_bytes, timeline_timestamp, timeline_paused);
      },
      uploadTnglBytes: function uploadTnglBytes(tngl_bytes) {
        var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
        var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        tangleBluetoothDevice.uploadTngl(tngl_bytes, 0, timeline_timestamp, timeline_paused);
        timeTrack.setStatus(timeline_timestamp, timeline_paused);
        debugLog(".uploadTnglBytes", tngl_bytes, timeline_timestamp, timeline_paused);
      },
      setTime: function setTime() {
        var timeline_timestamp = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
        var timeline_paused = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        tangleBluetoothDevice.setTime(0, timeline_timestamp, timeline_paused);
        timeTrack.setStatus(timeline_timestamp, timeline_paused);
        debugLog(".setTime", timeline_timestamp, timeline_paused);
      },
      emitEvent: function emitEvent(character, param) {
        var device_id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
        var charAsciiCode = character.toUpperCase().charCodeAt(0);
        tangleBluetoothDevice.emitEvent(device_id, charAsciiCode, param, timeTrack.millis());
        debugLog(".emitEvent", charAsciiCode, param, timeTrack.millis());
      },
      emitEvents: function emitEvents(events) {
        tangleBluetoothDevice.emitEvents(events);
        debugLog(".emitEvents", events);
      }
    };
    tangleDevice = TangleConnectWEBBLE;
    console.info("Running in WebBluetooth mode");
  } else if (tangleSerialDevice) {
    console.log("tangleSerialDevice is not supported yet.");
  } else {
    var PlaceHolderConnection = {
      connect: function connect() {
        var filters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        debugLog("Placeholder .connect", filters);
      },
      uploadTngl: function uploadTngl(tngl_code) {
        var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
        var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        debugLog("Placeholder .uploadTngl", tngl_bytes, timeline_timestamp, timeline_paused);
      },
      uploadTnglBytes: function uploadTnglBytes(tngl_bytes) {
        var timeline_timestamp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
        var timeline_paused = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        debugLog("Placeholder .uploadTnglBytes", tngl_bytes, timeline_timestamp, timeline_paused);
      },
      setTime: function setTime() {
        var timeline_timestamp = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
        var timeline_paused = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        debugLog("Placeholder .setTime", timeline_timestamp, timeline_paused);
      },
      emitEvent: function emitEvent(character, param, device_id) {
        debugLog("Placeholder .triggeremitEvent", 3, charAsciiCode, timeTrack.millis());
      },
      emitEvents: function emitEvents(events) {
        debugLog("Placeholder .emitEvents", events);
      }
    };
    tangleDevice = PlaceHolderConnection;
    console.error("No supported module found, you need to add atleast one supported connection module.", 'Running in placeholder mode (will be handled in future by Tangle Devtools)');
  }

  return tangleDevice;
}

export { TangleBluetoothDevice, TangleDevice, TimeTrack, TnglCodeParser };
