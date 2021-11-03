import { mapValue } from './functions.js'

const CONSTANTS = Object.freeze({
  MODIFIER_SWITCH_NONE: 0,
  MODIFIER_SWITCH_RG: 1,
  MODIFIER_SWITCH_GB: 2,
  MODIFIER_SWITCH_BR: 3,
});

export const FLAGS = Object.freeze({
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

export default function TnglCodeParser() { }

TnglCodeParser.prototype.parseTnglCode = function (tngl_code) {
  const buffer = new ArrayBuffer(65535);
  const payload = new DataView(buffer);

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
  };

  ///////////////////////////////////////////////////////////

  let compiler = {};

  compiler.compileFlag = function (flag) {
    payload.fillUInt8(flag);
  };

  compiler.compileByte = function (byte) {
    let reg = byte.match(/0x([0-9a-f][0-9a-f])(?![0-9a-f])/i);
    if (!reg) {
      console.error("Failed to compile a byte");
      return;
    }
    payload.fillUInt8(parseInt(reg[1], 16));
  };

  compiler.compileChar = function (char) {
    let reg = char.match(/(-?)'([\W\w])'/);
    if (!reg) {
      console.error("Failed to compile char");
      return;
    }
    if (reg[1] == "-") {
      payload.fillUInt8(-reg[2].charCodeAt(0));
    } else {
      payload.fillUInt8(reg[2].charCodeAt(0));
    }
  };

  // takes string string as '"this is a string"'
  compiler.compileString = function (string) {
    let reg = string.match(/"([\w ]*)"/);
    if (!reg) {
      console.error("Failed to compile a string");
      return;
    }

    for (let i = 0; i < string.length; i++) {
      payload.fillUInt8(string.charCodeAt(i));
    }

    payload.fillFlag(FLAGS.NONE);
  };

  compiler.compileInfinity = function (infinity) {
    let reg = infinity.match(/([+-]?Infinity)/);
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
  };

  // takes in time string token like "1.2d+9h2m7.2s-123t" and appeds to payload the total time in ms (tics) as a int32_t: [FLAG.TIMESTAMP, BYTE4, BYTE2, BYTE1, BYTE0]
  compiler.compileTimestamp = function (timestamp) {
    // console.log(timestamp);

    timestamp.replace(/_/g, ""); // replaces all '_' with nothing

    let total_tics = 0;

    while (timestamp) {
      let reg = timestamp.match(/([+-]?[0-9]*[.]?[0-9]+)([dhmst])/); // for example gets "-1.4d" from "-1.4d23.2m1s"

      if (!reg) {
        // if the regex match failes, then the algorithm is done
        if (timestamp != "") {
          console.error("Error while parsing timestamp");
          console.log("Leftover string:", timestamp);
        }
        break;
      }

      let value = reg[0]; // gets "-1.4d" from "-1.4d"
      let unit = reg[2]; // gets "d" from "-1.4d"
      let number = parseFloat(reg[1]); // gets "-1.4" from "-1.4d"

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
    }

    // console.log("total_tics:", total_tics);

    if (total_tics == 0) {
      payload.fillFlag(FLAGS.TIMESTAMP_ZERO);
    } else {
      payload.fillFlag(FLAGS.TIMESTAMP);
      payload.fillInt32(total_tics);
    }
  };

  // takes in html color string "#abcdef" and encodes it into 24 bits [FLAG.COLOR, R, G, B]
  compiler.compileColor = function (color) {
    let reg = color.match(/#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/i);
    if (!reg) {
      console.error("Failed to compile color");
      return;
    }

    let r = parseInt(reg[1], 16);
    let g = parseInt(reg[2], 16);
    let b = parseInt(reg[3], 16);

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
  };

  // takes in percentage string "83.234%" and encodes it into 24 bits
  compiler.compilePercentage = function (percentage) {
    let reg = percentage.match(/([+-]?[\d.]+)%/);
    if (!reg) {
      console.error("Failed to compile percentage");
      return;
    }

    let val = parseFloat(reg[1]);

    if (val > 100.0) {
      val = 100.0;
    }
    if (val < -100.0) {
      val = -100.0;
    }

    const remapped = mapValue(val, -100.0, 100.0, -2147483647, 2147483647);

    payload.fillFlag(FLAGS.PERCENTAGE);
    payload.fillInt32(parseInt(remapped));
  };

  // takes label string as "$label" and encodes it into 32 bits
  compiler.compileLabel = function (label) {
    let reg = label.match(/\$([\w]*)/);
    if (!reg) {
      console.error("Failed to compile a label");
      return;
    }

    payload.fillFlag(FLAGS.LABEL);
    for (let index = 0; index < 5; index++) {
      payload.fillUInt8(reg[1].charCodeAt(index));
    }
  };

  // takes pixels string "12px" and encodes it into 16 bits
  compiler.compilePixels = function (pixels) {
    let reg = pixels.match(/([\d]+)px/);
    if (!reg) {
      console.error("Failed to compile pixels");
      return;
    }

    let count = parseInt(reg[1]);

    payload.fillFlag(FLAGS.PIXELS);
    payload.fillInt16(count);
  };

  ///////////////////////////////////////////////////////////

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
        payload.fillFlag(FLAGS.WINDOW_FILTER);

        // === time operations ===
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
  };

  ///////////////////////////////////////////////////////////

  const parses = {
    comment: /\/\/[^\n]*/,
    htmlrgb: /#[0-9a-f]{6}/i,
    infinity: /[+-]?Infinity/,
    string: /"[\w ]*"/,
    timestamp: /(_?[+-]?[0-9]*[.]?[0-9]+[dhmst])+/,
    label: /\$[\w]*/,
    char: /-?'[\W\w]'/,
    byte: /0x[0-9a-f][0-9a-f](?![0-9a-f])/i,
    pixels: /[\d]+px/,
    percentage: /[+-]?[\d.]+%/,
    float: /([+-]?[0-9]*[.][0-9]+)/,
    number: /([+-]?[0-9]+)/,
    arrow: /->/,
    word: /[a-z_][\w]*/i,
    whitespace: /\s+/,
    punctuation: /[^\w\s]/,
  };

  console.log(tngl_code);
  const tokens = this._tokenize(tngl_code, parses);
  console.log(tokens);

  compiler.compileFlag(FLAGS.FLAG_TNGL_BYTES);

  for (let index = 0; index < tokens.length; index++) {
    const element = tokens[index];

    // console.log(element);

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

  let tngl_bytes = new Uint8Array(buffer, 0, payload.cursor);
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
    l,
    cnt,
    t,
    tokens = [];
  while (s) {
    t = null;
    m = s.length;
    for (var key in parsers) {
      r = parsers[key].exec(s);
      // try to choose the best match if there are several
      // where "best" is the closest to the current starting point
      if (r && r.index < m) {
        t = {
          token: r[0],
          type: key,
          matches: r.slice(1),
        };
        m = r.index;
      }
    }
    if (m) {
      // there is text between last token and currently
      // matched token - push that out as default or "unknown"
      tokens.push({
        token: s.substr(0, m),
        type: deftok || "unknown",
      });
    }
    if (t) {
      // push current token onto sequence
      tokens.push(t);
    }
    s = s.substr(m + (t ? t.token.length : 0));
  }
  return tokens;
};
