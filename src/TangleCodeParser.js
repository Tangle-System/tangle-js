export default function TnglCodeParser() { }

// TnglCodeParser.prototype.TRIGGERS = Object.freeze({
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

	DEVICE_ID_APP: 255,
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
	END_OF_TNGL_BYTES: 255,
});

TnglCodeParser.prototype.parseTnglCode = function (tngl_code) {
	const buffer = new ArrayBuffer(65535);
	const payload = new DataView(buffer);

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
		payload.setUint16(payload.cursor++, Math.round((percent / 100.0) * 0xffff));
	};

	const parses = {
		comment: /\/\/[^\n]*/,
		htmlrgb: /#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/i,
		string: /"([\w ]*)"/,
		arrow: /->/,
		char: /'([\W\w])'/,
		byte: /(0[xX][0-9a-fA-F][0-9a-fA-F](?![0-9a-fA-F]))/,
		word: /([a-zA-Z_][a-zA-Z_0-9]*)/,
		percentage: /([\d.]+)%/,
		float: /([+-]?[0-9]*[.][0-9]+)/,
		number: /([+-]?[0-9]+)/,
		whitespace: /(\s+)/,
		punctuation: /([^\w\s])/,
	};

	console.log(tngl_code);
	const tokens = this._tokenize(tngl_code, parses);
	console.log(tokens);

	payload.fillCommand(this.FLAGS.FLAG_TNGL_BYTES);

	for (let index = 0; index < tokens.length; index++) {
		const element = tokens[index];

		if (element.type === "whitespace") {
			continue;
		} else if (element.type === "char") {
			payload.fillUInt8(element.matches[0].charCodeAt(0));
		} else if (element.type === "byte") {
			payload.fillByte(element.matches[0]);
		} else if (element.type === "string") {
			for (let index = 0; index < 8; index++) {
				payload.fillUInt8(element.matches[0].charCodeAt(index));
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
			}

			// === canvas operations ===
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
			}

			// === time operations ===
			else if (element.matches[0] === "frame") {
				payload.fillCommand(this.FLAGS.FRAME);
			} else if (element.matches[0] === "timetransformer") {
				payload.fillCommand(this.FLAGS.TIMETRANSFORMER_CONVERT);
			} else if (element.matches[0] === "timeloop") {
				payload.fillCommand(this.FLAGS.TIMETRANSFORMER_LOOP);
			}

			// === animations ===
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
			}

			// === handlers ===
			else if (element.matches[0] === "eventHandler") {
				payload.fillCommand(this.FLAGS.HANDLER);
			}

			// === clip ===
			else if (element.matches[0] === "clip") {
				payload.fillCommand(this.FLAGS.CLIP);
			}

			// === definitions ===
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
			}

			// === sifters ===
			else if (element.matches[0] === "siftDevices") {
				payload.fillCommand(this.FLAGS.SIFT_DEVICE);
			} else if (element.matches[0] === "siftTangles") {
				payload.fillCommand(this.FLAGS.SIFT_TANGLE);
			} else if (element.matches[0] === "siftGroups") {
				payload.fillCommand(this.FLAGS.SIFT_GROUP);
			}

			// === variables ===
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
			}

			// === modifiers ===
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
			}

			// === filters ===
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
			}

			// === channels ===
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
			}

			// === events ===
			else if (element.matches[0] === "emitEvent") {
				payload.fillCommand(this.FLAGS.EVENT_EMIT);
			} else if (element.matches[0] === "onEvent") {
				payload.fillCommand(this.FLAGS.EVENT_ON);
			} else if (element.matches[0] === "setEventParam") {
				payload.fillCommand(this.FLAGS.EVENT_SET_PARAM);
			}

			// === constants ===
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
			}

			// === unknown ===
			else {
				console.warn("Unknown word >", element.matches[0], "<");
			}
		} else if (element.type === "percentage") {
			payload.fillPercentage(element.matches[0]);
		} else if (element.type === "number") {
			payload.fillInt32(element.matches[0]);
		} else if (element.type === "htmlrgb") {
			payload.fillRGB(parseInt(element.matches[0], 16), parseInt(element.matches[1], 16), parseInt(element.matches[2], 16));
		} else if (element.type === "comment") {
			// NOP
		} else if (element.type === "arrow") {
			// NOP
		} else {
			console.warn("Unknown type >", element.type, "<");
		}
	}

	payload.fillCommand(this.FLAGS.END_OF_TNGL_BYTES);

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

// // LZW-compress a string
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
