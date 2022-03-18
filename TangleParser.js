

import { mapValue, uint8ArrayToHexString } from "./functions.js";
import { logging } from "./Logging.js";
import { TnglWriter } from "./TnglWriter.js";

const CONSTANTS = Object.freeze({
  MODIFIER_SWITCH_NONE: 0,
  MODIFIER_SWITCH_RG: 1,
  MODIFIER_SWITCH_GB: 2,
  MODIFIER_SWITCH_BR: 3,
});

const TNGL_FLAGS = Object.freeze({
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

  /* command ends */
  END_OF_STATEMENT: 254,
  END_OF_TNGL_BYTES: 255,
});

export class TnglCompiler {
  #tnglWriter;
  constructor() {
    this.#tnglWriter = new TnglWriter();
  }

  compileFlag(flag) {
    this.#tnglWriter.writeUint8(flag);
  }

  compileByte(byte) {
    let reg = byte.match(/0x([0-9a-f][0-9a-f])(?![0-9a-f])/i);
    if (!reg) {
      logging.error("Failed to compile a byte");
      return;
    }
    this.#tnglWriter.writeUint8(parseInt(reg[1], 16));
  }

  compileChar(char) {
    let reg = char.match(/(-?)'([\W\w])'/);
    if (!reg) {
      logging.error("Failed to compile char");
      return;
    }
    if (reg[1] === "-") {
      this.#tnglWriter.writeUint8(-reg[2].charCodeAt(0));
    } else {
      this.#tnglWriter.writeUint8(reg[2].charCodeAt(0));
    }
  }

  // takes string string as '"this is a string"'
  compileString(string) {
    let reg = string.match(/"([\w ]*)"/);
    if (!reg) {
      logging.error("Failed to compile a string");
      return;
    }

    for (let i = 0; i < string.length; i++) {
      this.#tnglWriter.writeUint8(string.charCodeAt(i));
    }

    this.#tnglWriter.writeFlag(TNGL_FLAGS.NONE);
  }

  compileInfinity(infinity) {
    let reg = infinity.match(/([+-]?Infinity)/);
    if (!reg) {
      logging.error("Failed to compile a infinity");
      return;
    }

    if (reg[1] === "Infinity" || reg[1] === "+Infinity") {
      this.#tnglWriter.writeFlag(TNGL_FLAGS.TIMESTAMP_MAX);
    } else if (reg[1] === "-Infinity") {
      this.#tnglWriter.writeFlag(TNGL_FLAGS.TIMESTAMP_MIN);
    } else {
      logging.error("Error while compiling infinity");
    }
  }

  // takes in time string token like "1.2d+9h2m7.2s-123t" and appeds to payload the total time in ms (tics) as a int32_t: [FLAG.TIMESTAMP, BYTE4, BYTE2, BYTE1, BYTE0]
  compileTimestamp(timestamp) {
    // logging.debug(timestamp);

    timestamp.replace(/_/g, ""); // replaces all '_' with nothing

    let total_tics = 0;

    while (timestamp) {
      let reg = timestamp.match(/([+-]?[0-9]*[.]?[0-9]+)([dhmst])/); // for example gets "-1.4d" from "-1.4d23.2m1s"

      if (!reg) {
        // if the regex match failes, then the algorithm is done
        if (timestamp != "") {
          logging.error("Error while parsing timestamp");
          logging.debug("Leftover string:", timestamp);
        }
        break;
      }

      let value = reg[0]; // gets "-1.4d" from "-1.4d"
      let unit = reg[2]; // gets "d" from "-1.4d"
      let number = parseFloat(reg[1]); // gets "-1.4" from "-1.4d"

      // logging.debug("value:", value);
      // logging.debug("unit:", unit);
      // logging.debug("number:", number);

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
          logging.error("Error while parsing timestamp");
          break;
      }

      timestamp = timestamp.replace(value, ""); // removes one value from the string
    }

    // logging.debug("total_tics:", total_tics);

    if (total_tics === 0) {
      this.#tnglWriter.writeFlag(TNGL_FLAGS.TIMESTAMP_ZERO);
    } else {
      this.#tnglWriter.writeFlag(TNGL_FLAGS.TIMESTAMP);
      this.#tnglWriter.writeInt32(total_tics);
    }
  }

  // takes in html color string "#abcdef" and encodes it into 24 bits [FLAG.COLOR, R, G, B]
  compileColor(color) {
    let reg = color.match(/#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/i);
    if (!reg) {
      logging.error("Failed to compile color");
      return;
    }

    let r = parseInt(reg[1], 16);
    let g = parseInt(reg[2], 16);
    let b = parseInt(reg[3], 16);

    if (r === 255 && g === 255 && b === 255) {
      this.#tnglWriter.writeFlag(TNGL_FLAGS.COLOR_WHITE);
    } else if (r === 0 && g === 0 && b === 0) {
      this.#tnglWriter.writeFlag(TNGL_FLAGS.COLOR_BLACK);
    } else {
      this.#tnglWriter.writeFlag(TNGL_FLAGS.COLOR);
      this.#tnglWriter.writeUint8(r);
      this.#tnglWriter.writeUint8(g);
      this.#tnglWriter.writeUint8(b);
    }
  }

  // takes in percentage string "83.234%" and encodes it into 24 bits
  compilePercentage(percentage) {
    let reg = percentage.match(/([+-]?[\d.]+)%/);
    if (!reg) {
      logging.error("Failed to compile percentage");
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

    this.#tnglWriter.writeFlag(TNGL_FLAGS.PERCENTAGE);
    this.#tnglWriter.writeInt32(parseInt(remapped));
  }

  // takes label string as "$label" and encodes it into 32 bits
  compileLabel(label) {
    let reg = label.match(/\$([\w]*)/);
    if (!reg) {
      logging.error("Failed to compile a label");
      return;
    }

    this.#tnglWriter.writeFlag(TNGL_FLAGS.LABEL);
    for (let index = 0; index < 5; index++) {
      this.#tnglWriter.writeUint8(reg[1].charCodeAt(index));
    }
  }

  // takes pixels string "12px" and encodes it into 16 bits
  compilePixels(pixels) {
    let reg = pixels.match(/(-?[\d]+)px/);
    if (!reg) {
      logging.error("Failed to compile pixels");
      return;
    }

    let count = parseInt(reg[1]);

    this.#tnglWriter.writeFlag(TNGL_FLAGS.PIXELS);
    this.#tnglWriter.writeInt16(count);
  }

  ///////////////////////////////////////////////////////////

  compileWord(word) {
    switch (word) {
      // === canvas operations ===
      case "setDrawing":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.DRAWING_SET);
        break;
      case "addDrawing":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.DRAWING_ADD);
        break;
      case "subDrawing":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.DRAWING_SUB);
        break;
      case "scaDrawing":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.DRAWING_SCALE);
        break;
      case "filDrawing":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.DRAWING_FILTER);
        break;
      case "setWindow":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.WINDOW_SET);
        break;
      case "addWindow":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.WINDOW_ADD);
        break;
      case "subWindow":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.WINDOW_SUB);
        break;
      case "scaWindow":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.WINDOW_SCALE);
        break;
      case "filWindow":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.WINDOW_FILTER);

        // === time operations ===
        break;
      case "frame":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.FRAME);
        break;

      // === animations ===
      case "animDefined":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.ANIMATION_DEFINED);
        break;
      case "animNone":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.ANIMATION_NONE);
        break;
      case "animFill":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.ANIMATION_FILL);
        break;
      case "animRainbow":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.ANIMATION_RAINBOW);
        break;
      case "animPlasmaShot":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.ANIMATION_PROJECTILE);
        break;
      case "animLoadingBar":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.ANIMATION_LOADING);
        break;
      case "animFade":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.ANIMATION_FADE);
        break;
      case "animColorRoll":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.ANIMATION_COLOR_ROLL);
        break;
      case "animPaletteRoll":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.ANIMATION_PALLETTE_ROLL);
        break;

      // === handlers ===
      case "interactive":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.INTERACTIVE);
        break;

      // === clip ===
      case "clip":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.CLIP);
        break;

      // === definitions ===
      case "defAnimation":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.DEFINE_ANIMATION);
        break;
      case "defDevice":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.DEFINE_DEVICE);
        break;
      case "defTangle":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.DEFINE_TANGLE);
        break;
      case "defGroup":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.DEFINE_GROUP);
        break;
      case "defMarks":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.DEFINE_MARKS);
        break;
      case "defVariable":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.DEFINE_VARIABLE);
        break;

      // === sifters ===
      case "siftDevices":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.SIFTER_DEVICE);
        break;
      case "siftTangles":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.SIFTER_TANGLE);
        break;
      case "siftGroups":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.SIFTER_GROUP);
        break;

      // === objects ===
      case "device":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.DEVICE);
        break;
      case "tangle":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.TANGLE);
        break;
      case "slice":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.SLICE);
        break;
      case "port":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.PORT);
        break;
      case "group":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.GROUP);
        break;
      case "marks":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.MARKS);
        break;

      // === modifiers ===
      case "modifyBrightness":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.MODIFIER_BRIGHTNESS);
        break;
      case "modifyTimeline":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.MODIFIER_TIMELINE);
        break;
      case "modifyFadeIn":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.MODIFIER_FADE_IN);
        break;
      case "modifyFadeOut":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.MODIFIER_FADE_OUT);
        break;
      case "modifyColorSwitch":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.MODIFIER_SWITCH_COLORS);
        break;
      case "modifyTimeLoop":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.MODIFIER_TIME_LOOP);
        break;
      case "modifyTimeScale":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.MODIFIER_TIME_SCALE);
        break;
      case "modifyTimeScaleSmoothed":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.MODIFIER_TIME_SCALE_SMOOTHED);
        break;
      case "modifyTimeChange":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.MODIFIER_TIME_CHANGE);
        break;
      case "modifyTimeSet":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.MODIFIER_TIME_SET);
        break;

      // === events ===
      case "handleEvent":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.EVENT_HANDLE);
        break;
      case "setValue":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.EVENT_SET_VALUE);
        break;
      case "emitAs":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.EVENT_EMIT_LOCAL);
        break;

      // === generators ===
      case "genLastEventParam":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.GENERATOR_LAST_EVENT_VALUE);
        break;
      case "genSine":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.GENERATOR_SINE);
        break;
      case "genSaw":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.GENERATOR_SAW);
        break;
      case "genTriangle":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.GENERATOR_TRIANGLE);
        break;
      case "genSquare":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.GENERATOR_SQUARE);
        break;
      case "genPerlinNoise":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.GENERATOR_PERLIN_NOISE);
        break;
      case "genSmoothOut":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.GENERATOR_SMOOTHOUT);
        break;

      /* === variable operations === */

      case "variable":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.VARIABLE_READ);
        break;
      case "addValues":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.VARIABLE_ADD);
        break;
      case "subValues":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.VARIABLE_SUB);
        break;
      case "mulValues":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.VARIABLE_MUL);
        break;
      case "divValues":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.VARIABLE_DIV);
        break;
      case "modValues":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.VARIABLE_MOD);
        break;
      case "scaValue":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.VARIABLE_SCALE);
        break;
      case "mapValue":
        this.#tnglWriter.writeFlag(TNGL_FLAGS.VARIABLE_MAP);
        break;

      // === constants ===
      case "true":
        this.#tnglWriter.writeUint8(0x01);
        break;
      case "false":
        this.#tnglWriter.writeUint8(0x00);
        break;

      case "MODIFIER_SWITCH_NONE":
        this.#tnglWriter.writeUint8(CONSTANTS.MODIFIER_SWITCH_NONE);
        break;
      case "MODIFIER_SWITCH_RG":
      case "MODIFIER_SWITCH_GR":
        this.#tnglWriter.writeUint8(CONSTANTS.MODIFIER_SWITCH_RG);
        break;
      case "MODIFIER_SWITCH_GB":
      case "MODIFIER_SWITCH_BG":
        this.#tnglWriter.writeUint8(CONSTANTS.MODIFIER_SWITCH_GB);
        break;
      case "MODIFIER_SWITCH_BR":
      case "MODIFIER_SWITCH_RB":
        this.#tnglWriter.writeUint8(CONSTANTS.MODIFIER_SWITCH_BR);
        break;

      // === unknown ===
      default:
        logging.warn("Unknown word >", word, "<");
        break;
    }
  }

  get tnglBytes() {
    return new Uint8Array(this.#tnglWriter.bytes.buffer, 0, this.#tnglWriter.written);
  }
}

export class TnglCodeParser {
  #compiler;
  constructor() {
    this.#compiler = new TnglCompiler();
  }

  parseTnglCode(tngl_code) {
    logging.debug(tngl_code);

    const tokens = this.#tokenize(tngl_code, TnglCodeParser.#parses);
    logging.debug(tokens);

    for (let index = 0; index < tokens.length; index++) {
      const element = tokens[index];

      // logging.debug(element);

      switch (element.type) {
        case "comment":
          // skip
          break;

        case "htmlrgb":
          this.#compiler.compileColor(element.token);
          break;

        case "infinity":
          this.#compiler.compileInfinity(element.token);
          break;

        case "string":
          this.#compiler.compileString(element.token);
          break;

        case "timestamp":
          this.#compiler.compileTimestamp(element.token);
          break;

        case "label":
          this.#compiler.compileLabel(element.token);
          break;

        case "char":
          this.#compiler.compileChar(element.token);
          break;

        case "byte":
          this.#compiler.compileByte(element.token);
          break;

        case "pixels":
          this.#compiler.compilePixels(element.token);
          break;

        case "percentage":
          this.#compiler.compilePercentage(element.token);
          break;

        case "float":
          logging.error('"Naked" float numbers are not permitted.');
          break;

        case "number":
          logging.error('"Naked" numbers are not permitted.');
          break;

        case "arrow":
          // skip
          break;

        case "word":
          this.#compiler.compileWord(element.token);
          break;

        case "whitespace":
          // skip
          break;

        case "punctuation":
          if (element.token === "}") {
            this.#compiler.compileFlag(TNGL_FLAGS.END_OF_STATEMENT);
          }
          break;

        default:
          logging.warn("Unknown token type >", element.type, "<");
          break;
      }
    }

    this.#compiler.compileFlag(TNGL_FLAGS.END_OF_TNGL_BYTES);

    let tnglBytes = this.#compiler.tnglBytes;

    logging.debug(tnglBytes);
    logging.info(uint8ArrayToHexString(tnglBytes));
    return tnglBytes;
  }

  static #parses = {
    comment: /\/\/[^\n]*/,
    htmlrgb: /#[0-9a-f]{6}/i,
    infinity: /[+-]?Infinity/,
    string: /"[\w ]*"/,
    timestamp: /(_?[+-]?[0-9]*[.]?[0-9]+[dhmst])+/,
    label: /\$[\w]*/,
    char: /-?'[\W\w]'/,
    byte: /0x[0-9a-f][0-9a-f](?![0-9a-f])/i,
    pixels: /-?[\d]+px/,
    percentage: /[+-]?[\d.]+%/,
    float: /([+-]?[0-9]*[.][0-9]+)/,
    number: /([+-]?[0-9]+)/,
    arrow: /->/,
    word: /[a-z_][\w]*/i,
    whitespace: /\s+/,
    punctuation: /[^\w\s]/,
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

  #tokenize(s, parsers, deftok) {
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
  }
}
