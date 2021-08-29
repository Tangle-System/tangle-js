var TnglCodeParser = (function () {
  'use strict';

  var timeOffset = new Date().getTime() % 0x7fffffff;


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

  var timeOffset = new Date().getTime() % 0x7fffffff;


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

  var CONSTANTS$1 = Object.freeze({
  	MODIFIER_SWITCH_NONE: 0,
  	MODIFIER_SWITCH_RG: 1,
  	MODIFIER_SWITCH_GB: 2,
  	MODIFIER_SWITCH_BR: 3,
  });

  var FLAGS$1 = Object.freeze({
  	/* no code or command used by decoder as a validation */
  	NONE: 0,

  	// ======================

  	/* drawings */
  	DRAWING_SET: 1,
  	DRAWING_ADD: 2,
  	DRAWING_SUB: 3,
  	DRAWING_SCALE: 4,
  	DRAWING_FILTER: 5,

  	_DRAWINGS_BEGIN: 1,
  	_DRAWINGS_END: 5,

  	/* windows */
  	WINDOW_SET: 6,
  	WINDOW_ADD: 7,
  	WINDOW_SUB: 8,
  	WINDOW_SCALE: 9,
  	WINDOW_FILTER: 10,

  	_WINDOWS_BEGIN: 6,
  	_WINDOWS_END: 10,

  	/* frame */
  	FRAME: 11,

  	/* clip */
  	CLIP: 12,

  	/* sifters */
  	SIFTER_DEVICE: 13,
  	SIFTER_TANGLE: 14,
  	SIFTER_GROUP: 15,

  	_SIFTERS_BEGIN: 13,
  	_SIFTERS_END: 15,

  	/* event handlers */
  	INTERACTIVE: 16,
  	EVENT_HANDLE: 17,

  	/* definitions scoped */
  	DEFINE_VARIABLE: 18,

  	_BLOCKS_BOUNDARY: 18,

  	// ======================

  	/* definitions global */
  	DEFINE_DEVICE: 24,
  	DEFINE_TANGLE: 25,
  	DEFINE_GROUP: 26,
  	DEFINE_MARKS: 27,
  	DEFINE_ANIMATION: 28,
  	DEFINE_EMITTER: 28,

  	_DEFINITIONS_BEGIN: 24,
  	_DEFINITIONS_END: 28,

  	_DEFINITIONS_BOUNDARY: 28,

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

  	_ANIMATIONS_BEGIN: 32,
  	_ANIMATIONS_END: 41,

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

  	_MODIFIERS_BEGIN: 128,
  	_MODIFIERS_END: 136,

  	/* events */
  	GENERATOR_LAST_EVENT_VALUE: 144,
  	GENERATOR_SMOOTHOUT: 145,
  	GENERATOR_SINE: 146,
  	GENERATOR_SAW: 147,
  	GENERATOR_TRIANGLE: 148,
  	GENERATOR_SQUARE: 149,
  	GENERATOR_PERLIN_NOISE: 150,

  	_GENERATORS_BEGIN: 144,
  	_GENERATORS_END: 150,

  	/* variable operations gates */
  	VARIABLE_READ: 160,
  	VARIABLE_ADD: 161,
  	VARIABLE_SUB: 162,
  	VARIABLE_MUL: 163,
  	VARIABLE_DIV: 164,
  	VARIABLE_MOD: 165,
  	VARIABLE_SCALE: 166,
  	VARIABLE_MAP: 167,

  	_COMPUTATIONALS_BEGIN: 160,
  	_COMPUTATIONALS_END: 167,

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

  	_COMPLEMENTARY_BOUNDARY: 185,

  	// ======================

  	/* values */
  	TIMESTAMP: 188,
  	COLOR: 189,
  	PERCENTAGE: 190,
  	LABEL: 191,
  	PIXELS: 192,
  	TUPLE: 193,

  	_VALUES_BOUNDARY: 193,

  	// ======================

  	/* most used constants */
  	TIMESTAMP_ZERO: 194,
  	TIMESTAMP_MAX: 195,
  	TIMESTAMP_MIN: 196,
  	COLOR_WHITE: 197,
  	COLOR_BLACK: 198,

  	_CONSTANTS_BOUNDARY: 198,

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

  	_CONTROL_BOUNDARY: 255,
  });

  function TnglCodeParser() { }

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

  		payload.fillFlag(FLAGS$1.NONE);
  	};

  	compiler.compileInfinity = function (infinity) {
  		let reg = infinity.match(/([+-]?Infinity)/);
  		if (!reg) {
  			console.error("Failed to compile a infinity");
  			return;
  		}

  		if (reg[1] == "Infinity" || reg[1] == "+Infinity") {
  			payload.fillFlag(FLAGS$1.TIMESTAMP_MAX);
  		} else if (reg[1] == "-Infinity") {
  			payload.fillFlag(FLAGS$1.TIMESTAMP_MIN);
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
  			payload.fillFlag(FLAGS$1.TIMESTAMP_ZERO);
  		} else {
  			payload.fillFlag(FLAGS$1.TIMESTAMP);
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
  			payload.fillFlag(FLAGS$1.COLOR_WHITE);
  		} else if (r == 0 && g == 0 && b == 0) {
  			payload.fillFlag(FLAGS$1.COLOR_BLACK);
  		} else {
  			payload.fillFlag(FLAGS$1.COLOR);
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

  		payload.fillFlag(FLAGS$1.PERCENTAGE);
  		payload.fillInt32(parseInt(remapped));
  	};

  	// takes label string as "$label" and encodes it into 32 bits
  	compiler.compileLabel = function (label) {
  		let reg = label.match(/\$([\w]*)/);
  		if (!reg) {
  			console.error("Failed to compile a label");
  			return;
  		}

  		payload.fillFlag(FLAGS$1.LABEL);
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

  		payload.fillFlag(FLAGS$1.PIXELS);
  		payload.fillInt16(count);
  	};

  	///////////////////////////////////////////////////////////

  	compiler.compileWord = function (word) {
  		switch (word) {
  			// === canvas operations ===
  			case "setDrawing":
  				payload.fillFlag(FLAGS$1.DRAWING_SET);
  				break;
  			case "addDrawing":
  				payload.fillFlag(FLAGS$1.DRAWING_ADD);
  				break;
  			case "subDrawing":
  				payload.fillFlag(FLAGS$1.DRAWING_SUB);
  				break;
  			case "scaDrawing":
  				payload.fillFlag(FLAGS$1.DRAWING_SCALE);
  				break;
  			case "filDrawing":
  				payload.fillFlag(FLAGS$1.DRAWING_FILTER);
  				break;
  			case "setWindow":
  				payload.fillFlag(FLAGS$1.WINDOW_SET);
  				break;
  			case "addWindow":
  				payload.fillFlag(FLAGS$1.WINDOW_ADD);
  				break;
  			case "subWindow":
  				payload.fillFlag(FLAGS$1.WINDOW_SUB);
  				break;
  			case "scaWindow":
  				payload.fillFlag(FLAGS$1.WINDOW_SCALE);
  				break;
  			case "filWindow":
  				payload.fillFlag(FLAGS$1.WINDOW_FILTER);

  				// === time operations ===
  				break;
  			case "frame":
  				payload.fillFlag(FLAGS$1.FRAME);
  				break;

  			// === animations ===
  			case "animDefined":
  				payload.fillFlag(FLAGS$1.ANIMATION_DEFINED);
  				break;
  			case "animNone":
  				payload.fillFlag(FLAGS$1.ANIMATION_NONE);
  				break;
  			case "animFill":
  				payload.fillFlag(FLAGS$1.ANIMATION_FILL);
  				break;
  			case "animRainbow":
  				payload.fillFlag(FLAGS$1.ANIMATION_RAINBOW);
  				break;
  			case "animPlasmaShot":
  				payload.fillFlag(FLAGS$1.ANIMATION_PROJECTILE);
  				break;
  			case "animLoadingBar":
  				payload.fillFlag(FLAGS$1.ANIMATION_LOADING);
  				break;
  			case "animFade":
  				payload.fillFlag(FLAGS$1.ANIMATION_FADE);
  				break;
  			case "animColorRoll":
  				payload.fillFlag(FLAGS$1.ANIMATION_COLOR_ROLL);
  				break;
  			case "animPaletteRoll":
  				payload.fillFlag(FLAGS$1.ANIMATION_PALLETTE_ROLL);
  				break;

  			// === handlers ===
  			case "interactive":
  				payload.fillFlag(FLAGS$1.INTERACTIVE);
  				break;

  			// === clip ===
  			case "clip":
  				payload.fillFlag(FLAGS$1.CLIP);
  				break;

  			// === definitions ===
  			case "defAnimation":
  				payload.fillFlag(FLAGS$1.DEFINE_ANIMATION);
  				break;
  			case "defDevice":
  				payload.fillFlag(FLAGS$1.DEFINE_DEVICE);
  				break;
  			case "defTangle":
  				payload.fillFlag(FLAGS$1.DEFINE_TANGLE);
  				break;
  			case "defGroup":
  				payload.fillFlag(FLAGS$1.DEFINE_GROUP);
  				break;
  			case "defMarks":
  				payload.fillFlag(FLAGS$1.DEFINE_MARKS);
  				break;
  			case "defVariable":
  				payload.fillFlag(FLAGS$1.DEFINE_VARIABLE);
  				break;

  			// === sifters ===
  			case "siftDevices":
  				payload.fillFlag(FLAGS$1.SIFTER_DEVICE);
  				break;
  			case "siftTangles":
  				payload.fillFlag(FLAGS$1.SIFTER_TANGLE);
  				break;
  			case "siftGroups":
  				payload.fillFlag(FLAGS$1.SIFTER_GROUP);
  				break;

  			// === objects ===
  			case "device":
  				payload.fillFlag(FLAGS$1.DEVICE);
  				break;
  			case "tangle":
  				payload.fillFlag(FLAGS$1.TANGLE);
  				break;
  			case "slice":
  				payload.fillFlag(FLAGS$1.SLICE);
  				break;
  			case "port":
  				payload.fillFlag(FLAGS$1.PORT);
  				break;
  			case "group":
  				payload.fillFlag(FLAGS$1.GROUP);
  				break;
  			case "marks":
  				payload.fillFlag(FLAGS$1.MARKS);
  				break;

  			// === modifiers ===
  			case "modifyBrightness":
  				payload.fillFlag(FLAGS$1.MODIFIER_BRIGHTNESS);
  				break;
  			case "modifyTimeline":
  				payload.fillFlag(FLAGS$1.MODIFIER_TIMELINE);
  				break;
  			case "modifyFadeIn":
  				payload.fillFlag(FLAGS$1.MODIFIER_FADE_IN);
  				break;
  			case "modifyFadeOut":
  				payload.fillFlag(FLAGS$1.MODIFIER_FADE_OUT);
  				break;
  			case "modifyColorSwitch":
  				payload.fillFlag(FLAGS$1.MODIFIER_SWITCH_COLORS);
  				break;
  			case "modifyTimeLoop":
  				payload.fillFlag(FLAGS$1.MODIFIER_TIME_LOOP);
  				break;
  			case "modifyTimeScale":
  				payload.fillFlag(FLAGS$1.MODIFIER_TIME_SCALE);
  				break;
  			case "modifyTimeScaleSmoothed":
  				payload.fillFlag(FLAGS$1.MODIFIER_TIME_SCALE_SMOOTHED);
  				break;
  			case "modifyTimeChange":
  				payload.fillFlag(FLAGS$1.MODIFIER_TIME_CHANGE);
  				break;

  			// === events ===
  			case "handleEvent":
  				payload.fillFlag(FLAGS$1.EVENT_HANDLE);
  				break;
  			case "setValue":
  				payload.fillFlag(FLAGS$1.EVENT_SET_VALUE);
  				break;
  			case "emitAs":
  				payload.fillFlag(FLAGS$1.EVENT_EMIT_LOCAL);
  				break;

  			// === generators ===
  			case "genLastEventParam":
  				payload.fillFlag(FLAGS$1.GENERATOR_LAST_EVENT_VALUE);
  				break;
  			case "genSine":
  				payload.fillFlag(FLAGS$1.GENERATOR_SINE);
  				break;
  			case "genSaw":
  				payload.fillFlag(FLAGS$1.GENERATOR_SAW);
  				break;
  			case "genTriangle":
  				payload.fillFlag(FLAGS$1.GENERATOR_TRIANGLE);
  				break;
  			case "genSquare":
  				payload.fillFlag(FLAGS$1.GENERATOR_SQUARE);
  				break;
  			case "genPerlinNoise":
  				payload.fillFlag(FLAGS$1.GENERATOR_PERLIN_NOISE);
  				break;
  			case "genSmoothOut":
  				payload.fillFlag(FLAGS$1.GENERATOR_SMOOTHOUT);
  				break;

  			/* === variable operations === */

  			case "variable":
  				payload.fillFlag(FLAGS$1.VARIABLE_READ);
  				break;
  			case "genSmoothOut":
  				payload.fillFlag(FLAGS$1.VARIABLE_SMOOTH_TIMED);
  				break;
  			case "addValues":
  				payload.fillFlag(FLAGS$1.VARIABLE_ADD);
  				break;
  			case "subValues":
  				payload.fillFlag(FLAGS$1.VARIABLE_SUB);
  				break;
  			case "mulValues":
  				payload.fillFlag(FLAGS$1.VARIABLE_MUL);
  				break;
  			case "divValues":
  				payload.fillFlag(FLAGS$1.VARIABLE_DIV);
  				break;
  			case "modValues":
  				payload.fillFlag(FLAGS$1.VARIABLE_MOD);
  				break;
  			case "scaValue":
  				payload.fillFlag(FLAGS$1.VARIABLE_SCALE);
  				break;
  			case "mapValue":
  				payload.fillFlag(FLAGS$1.VARIABLE_MAP);
  				break;

  			// === constants ===
  			case "true":
  				payload.fillUInt8(0x01);
  				break;
  			case "false":
  				payload.fillUInt8(0x00);
  				break;

  			case "MODIFIER_SWITCH_NONE":
  				payload.fillByte(CONSTANTS$1.MODIFIER_SWITCH_NONE);
  				break;
  			case "MODIFIER_SWITCH_RG":
  			case "MODIFIER_SWITCH_GR":
  				payload.fillByte(CONSTANTS$1.MODIFIER_SWITCH_RG);
  				break;
  			case "MODIFIER_SWITCH_GB":
  			case "MODIFIER_SWITCH_BG":
  				payload.fillByte(CONSTANTS$1.MODIFIER_SWITCH_GB);
  				break;
  			case "MODIFIER_SWITCH_BR":
  			case "MODIFIER_SWITCH_RB":
  				payload.fillByte(CONSTANTS$1.MODIFIER_SWITCH_BR);
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

  	compiler.compileFlag(FLAGS$1.FLAG_TNGL_BYTES);

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
  					payload.fillFlag(FLAGS$1.END_OF_STATEMENT);
  				}
  				break;

  			default:
  				console.warn("Unknown token type >", element.type, "<");
  				break;
  		}
  	}

  	// if (element.type === "whitespace") {
  	//   continue; // skip
  	// } else if (element.type === "char") {
  	// } else if (element.type === "byte") {
  	//   payload.fillByte(element.matches[0]);
  	// } else if (element.type === "string") {
  	//   for (let index = 0; index < 8; index++) {
  	//     payload.fillUInt8(element.matches[0].charCodeAt(index));
  	//   }
  	// } else if (element.type === "punctuation") {
  	//   if (element.matches[0] === "{") {
  	//     continue; // skip
  	//   } else if (element.matches[0] === "}") {
  	//     payload.fillFlag(FLAGS.END_OF_STATEMENT);
  	//   } else if (element.matches[0] === "[") {
  	//     continue; // skip
  	//   } else if (element.matches[0] === "]") {
  	//     continue; // skip
  	//   } else if (element.matches[0] === "(") {
  	//     continue; // skip
  	//   } else if (element.matches[0] === ")") {
  	//     continue; // skip
  	//   } else if (element.matches[0] === ";") {
  	//     continue; // skip
  	//   } else if (element.matches[0] === ".") {
  	//     continue; // skip
  	//   } else if (element.matches[0] === ",") {
  	//     continue; // skip
  	//   } else {
  	//     console.warn("Unknown punctuation >", element.matches[0], "<");
  	//   }
  	// } else if (element.type === "word") {
  	//   // === true, false ===

  	//   if (element.matches[0] === "true") {
  	//     payload.fillUInt8(0x01);
  	//   } else if (element.matches[0] === "false") {
  	//     payload.fillUInt8(0x00);
  	//   }

  	//   // === canvas operations ===
  	//   else if (element.matches[0] === "setDrawing") {
  	//     payload.fillFlag(FLAGS.DRAWING_SET);
  	//   } else if (element.matches[0] === "addDrawing") {
  	//     payload.fillFlag(FLAGS.DRAWING_ADD);
  	//   } else if (element.matches[0] === "subDrawing") {
  	//     payload.fillFlag(FLAGS.DRAWING_SUB);
  	//   } else if (element.matches[0] === "scaDrawing") {
  	//     payload.fillFlag(FLAGS.DRAWING_SCALE);
  	//   } else if (element.matches[0] === "filDrawing") {
  	//     payload.fillFlag(FLAGS.DRAWING_FILTER);
  	//   } else if (element.matches[0] === "setWindow") {
  	//     payload.fillFlag(FLAGS.WINDOW_SET);
  	//   } else if (element.matches[0] === "addWindow") {
  	//     payload.fillFlag(FLAGS.WINDOW_ADD);
  	//   } else if (element.matches[0] === "subWindow") {
  	//     payload.fillFlag(FLAGS.WINDOW_SUB);
  	//   } else if (element.matches[0] === "scaWindow") {
  	//     payload.fillFlag(FLAGS.WINDOW_SCALE);
  	//   } else if (element.matches[0] === "filWindow") {
  	//     payload.fillFlag(FLAGS.WINDOW_FILTER);
  	//   }

  	//   // === time operations ===
  	//   else if (element.matches[0] === "frame") {
  	//     payload.fillFlag(FLAGS.FRAME);
  	//   }

  	//   // === animations ===
  	//   else if (element.matches[0] === "animDefined") {
  	//     payload.fillFlag(FLAGS.ANIMATION_DEFINED);
  	//   } else if (element.matches[0] === "animNone") {
  	//     payload.fillFlag(FLAGS.ANIMATION_NONE);
  	//   } else if (element.matches[0] === "animFill") {
  	//     payload.fillFlag(FLAGS.ANIMATION_FILL);
  	//   } else if (element.matches[0] === "animRainbow") {
  	//     payload.fillFlag(FLAGS.ANIMATION_RAINBOW);
  	//   } else if (element.matches[0] === "animPlasmaShot") {
  	//     payload.fillFlag(FLAGS.ANIMATION_PROJECTILE);
  	//   } else if (element.matches[0] === "animLoadingBar") {
  	//     payload.fillFlag(FLAGS.ANIMATION_LOADING);
  	//   } else if (element.matches[0] === "animFade") {
  	//     payload.fillFlag(FLAGS.ANIMATION_FADE);
  	//   } else if (element.matches[0] === "animColorRoll") {
  	//     payload.fillFlag(FLAGS.ANIMATION_COLOR_ROLL);
  	//   } else if (element.matches[0] === "animPaletteRoll") {
  	//     payload.fillFlag(FLAGS.ANIMATION_PALLETTE_ROLL);
  	//   }

  	//   // === handlers ===
  	//   else if (element.matches[0] === "eventHandler") {
  	//     payload.fillFlag(FLAGS.EVENT_HANDLER);
  	//   }

  	//   // === clip ===
  	//   else if (element.matches[0] === "clip") {
  	//     payload.fillFlag(FLAGS.CLIP);
  	//   }

  	//   // === definitions ===
  	//   else if (element.matches[0] === "defAnimation") {
  	//     payload.fillFlag(FLAGS.DEFINE_ANIMATION);
  	//   } else if (element.matches[0] === "defDevice1") {
  	//     payload.fillFlag(FLAGS.DEFINE_DEVICE_1PORT);
  	//   } else if (element.matches[0] === "defDevice2") {
  	//     payload.fillFlag(FLAGS.DEFINE_DEVICE_2PORT);
  	//   } else if (element.matches[0] === "defDevice4") {
  	//     payload.fillFlag(FLAGS.DEFINE_DEVICE_4PORT);
  	//   } else if (element.matches[0] === "defDevice8") {
  	//     payload.fillFlag(FLAGS.DEFINE_DEVICE_8PORT);
  	//   } else if (element.matches[0] === "defTangle") {
  	//     payload.fillFlag(FLAGS.DEFINE_TANGLE);
  	//   } else if (element.matches[0] === "defGroup") {
  	//     payload.fillFlag(FLAGS.DEFINE_GROUP);
  	//   } else if (element.matches[0] === "defMarks") {
  	//     payload.fillFlag(FLAGS.DEFINE_MARKS);
  	//   }

  	//   // === sifters ===
  	//   else if (element.matches[0] === "siftDevices") {
  	//     payload.fillFlag(FLAGS.SIFT_DEVICE);
  	//   } else if (element.matches[0] === "siftTangles") {
  	//     payload.fillFlag(FLAGS.SIFT_TANGLE);
  	//   } else if (element.matches[0] === "siftGroups") {
  	//     payload.fillFlag(FLAGS.SIFT_GROUP);
  	//   }

  	//   // === variables ===
  	//   else if (element.matches[0] === "device") {
  	//     payload.fillFlag(FLAGS.DEVICE);
  	//   } else if (element.matches[0] === "tangle") {
  	//     payload.fillFlag(FLAGS.TANGLE);
  	//   } else if (element.matches[0] === "pixels") {
  	//     payload.fillFlag(FLAGS.PIXELS);
  	//   } else if (element.matches[0] === "port") {
  	//     payload.fillFlag(FLAGS.PORT);
  	//   } else if (element.matches[0] === "group") {
  	//     payload.fillFlag(FLAGS.GROUP);
  	//   } else if (element.matches[0] === "mark") {
  	//     payload.fillFlag(FLAGS.MARK);
  	//   } else if (element.matches[0] === "value") {
  	//     payload.fillFlag(FLAGS.VALUE);
  	//   } else if (element.matches[0] === "channel") {
  	//     payload.fillFlag(FLAGS.CHANNEL);
  	//   } else if (element.matches[0] === "event") {
  	//     payload.fillFlag(FLAGS.EVENT);
  	//   }

  	//   // === modifiers ===
  	//   else if (element.matches[0] === "modifyBrightness") {
  	//     payload.fillFlag(FLAGS.MODIFIER_BRIGHTNESS);
  	//   } else if (element.matches[0] === "modifyTimeline") {
  	//     payload.fillFlag(FLAGS.MODIFIER_TIMELINE);
  	//   } else if (element.matches[0] === "modifyFadeIn") {
  	//     payload.fillFlag(FLAGS.MODIFIER_FADE_IN);
  	//   } else if (element.matches[0] === "modifyFadeOut") {
  	//     payload.fillFlag(FLAGS.MODIFIER_FADE_OUT);
  	//   } else if (element.matches[0] === "modifyColorSwitch") {
  	//     payload.fillFlag(FLAGS.MODIFIER_SWITCH_COLORS);
  	//   } else if (element.matches[0] === "modifyTimeLoop") {
  	//     payload.fillFlag(FLAGS.MODIFIER_TIME_LOOP);
  	//   } else if (element.matches[0] === "modifyTimeScale") {
  	//     payload.fillFlag(FLAGS.MODIFIER_TIME_SCALE);
  	//   } else if (element.matches[0] === "modifyTimeScaleSmoothed") {
  	//     payload.fillFlag(FLAGS.MODIFIER_TIME_SCALE_SMOOTHED);
  	//   } else if (element.matches[0] === "modifyTimeChange") {
  	//     payload.fillFlag(FLAGS.MODIFIER_TIME_CHANGE);
  	//   }

  	//   // === filters ===
  	//   else if (element.matches[0] === "filterNone") {
  	//     payload.fillFlag(FLAGS.FILTER_NONE);
  	//   } else if (element.matches[0] === "filterBlur") {
  	//     payload.fillFlag(FLAGS.FILTER_BLUR);
  	//   } else if (element.matches[0] === "filterColorShift") {
  	//     payload.fillFlag(FLAGS.FILTER_COLOR_SHIFT);
  	//   } else if (element.matches[0] === "filterMirror") {
  	//     payload.fillFlag(FLAGS.FILTER_MIRROR);
  	//   } else if (element.matches[0] === "filterScatter") {
  	//     payload.fillFlag(FLAGS.FILTER_SCATTER);
  	//   }

  	//   // === channels ===
  	//   else if (element.matches[0] === "writeChannel") {
  	//     payload.fillFlag(FLAGS.CHANNEL_WRITE);
  	//   } else if (element.matches[0] === "eventParameterValue") {
  	//     payload.fillFlag(FLAGS.CHANNEL_PARAMETER_VALUE);
  	//   } else if (element.matches[0] === "eventParameterValueSmoothed") {
  	//     payload.fillFlag(FLAGS.CHANNEL_PARAMETER_VALUE_SMOOTHED);
  	//   } else if (element.matches[0] === "addValues") {
  	//     payload.fillFlag(FLAGS.CHANNEL_ADD_VALUES);
  	//   } else if (element.matches[0] === "subValues") {
  	//     payload.fillFlag(FLAGS.CHANNEL_SUB_VALUES);
  	//   } else if (element.matches[0] === "mulValues") {
  	//     payload.fillFlag(FLAGS.CHANNEL_MUL_VALUES);
  	//   } else if (element.matches[0] === "divValues") {
  	//     payload.fillFlag(FLAGS.CHANNEL_DIV_VALUES);
  	//   } else if (element.matches[0] === "modValues") {
  	//     payload.fillFlag(FLAGS.CHANNEL_MOD_VALUES);
  	//   } else if (element.matches[0] === "scaValue") {
  	//     payload.fillFlag(FLAGS.CHANNEL_SCALE_VALUE);
  	//   } else if (element.matches[0] === "mapValue") {
  	//     payload.fillFlag(FLAGS.CHANNEL_MAP_VALUE);
  	//   }

  	//   // === events ===
  	//   else if (element.matches[0] === "emitLocalEvent") {
  	//     payload.fillFlag(FLAGS.EVENT_EMIT_LOCAL);
  	//   } else if (element.matches[0] === "onEvent") {
  	//     payload.fillFlag(FLAGS.EVENT_ON);
  	//   } else if (element.matches[0] === "setEventParam") {
  	//     payload.fillFlag(FLAGS.EVENT_SET_PARAM);
  	//   }

  	//   // === constants ===
  	//   else if (element.matches[0] === "MODIFIER_SWITCH_NONE") {
  	//     payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_NONE);
  	//   } else if (element.matches[0] === "MODIFIER_SWITCH_RG") {
  	//     payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_RG);
  	//   } else if (element.matches[0] === "MODIFIER_SWITCH_GR") {
  	//     payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_RG);
  	//   } else if (element.matches[0] === "MODIFIER_SWITCH_GB") {
  	//     payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_GB);
  	//   } else if (element.matches[0] === "MODIFIER_SWITCH_BG") {
  	//     payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_GB);
  	//   } else if (element.matches[0] === "MODIFIER_SWITCH_BR") {
  	//     payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_BR);
  	//   } else if (element.matches[0] === "MODIFIER_SWITCH_RB") {
  	//     payload.fillByte(this.CONSTANTS.MODIFIER_SWITCH_BR);
  	//   }

  	//   // === unknown ===
  	//   else {
  	//     console.warn("Unknown word >", element.matches[0], "<");
  	//   }
  	// } else if (element.type === "percentage") {
  	//   payload.fillPercentage(element.matches[0]);
  	// } else if (element.type === "number") {
  	//   payload.fillInt32(element.matches[0]);
  	// } else if (element.type === "arrow") {
  	//   continue; // skip
  	// } else {
  	//   console.warn("Unknown type >", element.type, "<");
  	// }

  	compiler.compileFlag(FLAGS$1.END_OF_TNGL_BYTES);

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

  return TnglCodeParser;

}());
