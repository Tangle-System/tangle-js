(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = global || self, global.TangleDevice = factory());
}(this, (function () { 'use strict';

	function TnglCodeParser() { }

	TnglCodeParser.prototype.TRIGGERS = Object.freeze({
		/* null */
		NONE: 0,
		TOUCH: 1,
		MOVEMENT: 2,
		KEYPRESS: 3,
		TEST: 255,
	});

	TnglCodeParser.prototype.FLAGS = Object.freeze({
		/* no code or command used by decoder as a validation */
		NONE: 0,

		/* handlers 1 -> 30 */
		HANDLER_TOUCH: 1,
		HANDLER_MOVEMENT: 2,
		HANDLER_KEYPRESS: 3,

		/* drawings 31 -> 36 */
		DRAWING_SET: 31,
		DRAWING_ADD: 32,
		DRAWING_SUB: 33,
		DRAWING_MUL: 34,
		DRAWING_FIL: 35,

		/* windows 37 -> 42 */
		WINDOW_SET: 37,
		WINDOW_ADD: 38,
		WINDOW_SUB: 39,
		WINDOW_MUL: 40,
		WINDOW_FIL: 41,

		/* frame 43 */
		FRAME: 43,

		/* clip 44 */
		CLIP: 44,

		/* time manipulation 45 */
		TIMETRANSFORMER: 45,

		/* sifters 46 -> 53 */
		SIFT_DEVICE: 46,
		SIFT_TANGLE: 47,
		SIFT_GROUP: 48,

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

		/* effects 189 -> 206 */
		EFFECT_FADEIN: 189,
		EFFECT_FADEOUT: 190,
		EFFECT_BLURE: 191,
		EFFECT_SCATTER: 192,
		EFFECT_STRIPEIFY: 193,
		EFFECT_INVERT: 194,

		/* variables 207 -> 222 */
		DEVICE: 207,
		TANGLE: 208,
		PIXELS: 209,
		NEOPIXEL: 210,
		GROUP: 211,
		MARK: 212,

		/* definitions 223 -> 238 */
		DEFINE_DEVICE: 223,
		DEFINE_TANGLE: 224,
		DEFINE_GROUP: 225,
		DEFINE_MARKS: 226,

		/* control codes 239 -> 254 */
		COMMAND_SET_TIME_OFFSET: 239,

		FLAG_TNGL_BYTES: 240,
		FLAG_TRIGGER: 241,
		FLAG_SYNC_TIMELINE: 242,

		/* end of statements with no boundary 255 */
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

		payload.fillUInt8 = function (value) {
			payload.setUint8(payload.cursor++, value);
		};

		payload.fillByte = function (value) {
			payload.setUint8(payload.cursor++, parseInt(value, 16));
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
			payload.setUint8(payload.cursor++, Math.floor((percent / 100.0) * 255));
		};

		const parses = {
			htmlrgb: /#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/i,
			string: /"([\w ]*)"/,
			char: /'([\W\w])'/,
			byte: /(0[xX][0-9a-fA-F][0-9a-fA-F](?![0-9a-fA-F]))/,
			word: /([a-zA-Z_]+)/,
			percentage: /([\d.]+)%/,
			float: /([+-]?[0-9]*[.][0-9]+)/,
			number: /([+-]?[0-9]+)/,
			whitespace: /(\s+)/,
			punctuation: /([^\w\s])/,
		};

		//console.log(tngl_code);
		const tokens = this._tokenize(tngl_code, parses);
		//console.log(tokens);

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
					payload.fillUInt8(1);
				} else if (element.matches[0] === "false") {
					payload.fillUInt8(0);
				}

				// === canvas operations ===
				else if (element.matches[0] === "setDrawing") {
					payload.fillCommand(this.FLAGS.DRAWING_SET);
				} else if (element.matches[0] === "addDrawing") {
					payload.fillCommand(this.FLAGS.DRAWING_ADD);
				} else if (element.matches[0] === "subDrawing") {
					payload.fillCommand(this.FLAGS.DRAWING_SUB);
				} else if (element.matches[0] === "mulDrawing") {
					payload.fillCommand(this.FLAGS.DRAWING_MUL);
				} else if (element.matches[0] === "filDrawing") {
					payload.fillCommand(this.FLAGS.DRAWING_FIL);
				} else if (element.matches[0] === "setWindow") {
					payload.fillCommand(this.FLAGS.WINDOW_SET);
				} else if (element.matches[0] === "addWindow") {
					payload.fillCommand(this.FLAGS.WINDOW_ADD);
				} else if (element.matches[0] === "subWindow") {
					payload.fillCommand(this.FLAGS.WINDOW_SUB);
				} else if (element.matches[0] === "mulWindow") {
					payload.fillCommand(this.FLAGS.WINDOW_MUL);
				} else if (element.matches[0] === "filWindow") {
					payload.fillCommand(this.FLAGS.WINDOW_FIL);
				}

				// === time operations ===
				else if (element.matches[0] === "frame") {
					payload.fillCommand(this.FLAGS.FRAME);
				} else if (element.matches[0] === "timetransformer") {
					payload.fillCommand(this.FLAGS.TIMETRANSFORMER);
				}

				// === animations ===
				else if (element.matches[0] === "animNone") {
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
				else if (element.matches[0] === "handlerTouch") {
					payload.fillCommand(this.FLAGS.HANDLER_TOUCH);
				} else if (element.matches[0] === "handlerMovement") {
					payload.fillCommand(this.FLAGS.HANDLER_MOVEMENT);
				} else if (element.matches[0] === "handlerKeyPress") {
					payload.fillCommand(this.FLAGS.HANDLER_KEYPRESS);
				}

				// === clip ===
				else if (element.matches[0] === "clip") {
					payload.fillCommand(this.FLAGS.CLIP);
				}

				// === definitions ===
				else if (element.matches[0] === "defDevice") {
					payload.fillCommand(this.FLAGS.DEFINE_DEVICE);
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
				} else if (element.matches[0] === "neopixel") {
					payload.fillCommand(this.FLAGS.NEOPIXEL);
				} else if (element.matches[0] === "group") {
					payload.fillCommand(this.FLAGS.GROUP);
				} else if (element.matches[0] === "mark") {
					payload.fillCommand(this.FLAGS.MARK);
				}

				// === other ===
				else if (element.matches[0] === "next") ; else {
					console.warn("Unknown word >", element.matches[0], "<");
				}
			} else if (element.type === "percentage") {
				payload.fillPercentage(element.matches[0]);
			} else if (element.type === "number") {
				payload.fillInt32(element.matches[0]);
			}
			// else if (element.type === "float") {
			//   payload.fillFloat(element.matches[0]);
			// }
			else if (element.type === "htmlrgb") {
				payload.fillRGB(
					parseInt(element.matches[0], 16),
					parseInt(element.matches[1], 16),
					parseInt(element.matches[2], 16)
				);
			} else {
				console.warn("Unknown type >", element.type, "<");
			}
		}

		payload.fillCommand(this.FLAGS.END_OF_TNGL_BYTES);

		let tngl_bytes = new Uint8Array(buffer, 0, payload.cursor);
		//console.log(tngl_bytes);
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

	function TangleDevice({ ble, serial } = { ble: null, serial: null }) {

	  const tnglParser = new TnglCodeParser();

	  let tangleDevice;

	  const tangleBluetoothDevice = ble;
	  const tangleSerialDevice = serial;


	  if ("tangleConnect" in window) {

	    const tangleConnect = window.tangleConnect;

	    const TangleConnectANDROID = {
	      connect: (filters = null) => {
	        console.log('Connection is handled by tangleConnect.');
	      },
	      uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
	        console.info('posilam TNGL Kod uploadTngl()');
	        tangleConnect.uploadTngl(tngl_code, timeline_timestamp, timeline_paused);
	      },
	      uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
	        console.info('posilam TNGL bajty uploadTnglBytes()');
	        tangleConnect.uploadTnglBytes(tngl_bytes, timeline_timestamp, timeline_paused);
	      },
	      setTime: (timeline_timestamp = 0, timeline_paused = false) => {
	        console.info('posilam setTime setTime()');
	        tangleConnect.setTime(timeline_timestamp, timeline_paused);
	      },
	    };

	    tangleDevice = TangleConnectANDROID;

	    console.info("Running in Android Bluetooth mode");

	  } else if (tangleBluetoothDevice) {
	    const TangleConnectWEBBLE = {
	      connect: (filters = null) => {
	        tangleBluetoothDevice.connect();
	      },
	      uploadTngl: (tngl_code, timeline_timestamp = 0, timeline_paused = false) => {
	        const tngl_bytes = tnglParser.parseTnglCode(tngl_code);
	        tangleBluetoothDevice.uploadTnglBytes(tngl_bytes, timeline_timestamp, timeline_paused);
	      },
	      uploadTnglBytes: (tngl_bytes, timeline_timestamp = 0, timeline_paused = false) => {
	        tangleBluetoothDevice.uploadTnglBytes(tngl_bytes, timeline_timestamp, timeline_paused);
	      },
	      setTime: (timeline_timestamp = 0, timeline_paused = false) => {
	        tangleBluetoothDevice.setTime(timeline_timestamp, timeline_paused);
	      },
	    };

	    tangleDevice = TangleConnectWEBBLE;

	    console.info("Running in WebBluetooth mode");
	  } else if (tangleSerialDevice) {
	    console.log('tangleSerialDevice is not supported yet.');
	  }
	  else {
	    console.warn("No supported module found, you need to add atleast one supported connection module.");
	  }
	  return tangleDevice;
	}

	return TangleDevice;

})));
