
export function toBytes(value, byteCount) {
  var byteArray = [];
  for (let index = 0; index < byteCount; index++) {
    const byte = value & 0xff;
    byteArray.push(byte);
    value = value >> 8;
  }
  return byteArray;
}

// // timeline_index [0 - 15]
// // timeline_paused [true/false]
// function getTimelineFlags(timeline_index, timeline_paused) {
//   // flags bits: [ Reserved,Reserved,Reserved,PausedFLag,IndexBit3,IndexBit2,IndexBit1,IndexBit0]
//   timeline_index = timeline_index & 0b00001111;
//   timeline_paused = (timeline_paused << 4) & 0b00010000;
//   return timeline_paused | timeline_index;
// }

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

export const timeOffset = new Date().getTime() % 0x7fffffff;
// must be positive int32 (4 bytes)
export function getClockTimestamp() {
  return (new Date().getTime() % 0x7fffffff) - timeOffset;
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// The MIT License (MIT)

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

export const createNanoEvents = () => ({
  events: {},
  emit(event, ...args) {
    (this.events[event] || []).forEach(i => {
      let res = i(...args);
    });
  },
  on(event, cb) {
    (this.events[event] = this.events[event] || []).push(cb);
    return () => (this.events[event] = (this.events[event] || []).filter(i => i !== cb));
  },
});

/////////////////////////////////////////////// == 0.7 == ///////////////////////////////////////////////////

export const getSeconds = str => {
  let seconds = 0;
  let months = str.match(/(\d+)\s*M/);
  let days = str.match(/(\d+)\s*D/);
  let hours = str.match(/(\d+)\s*h/);
  let minutes = str.match(/(\d+)\s*m/);
  let secs = str.match(/(\d+)\s*s/);
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

export function mapValue(x, in_min, in_max, out_min, out_max) {
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
export function labelToBytes(label_string) {
  return stringToBytes(label_string, 5);
}

export function stringToBytes(string, length) {
  var byteArray = [];

  for (let index = 0; index < length; index++) {
    if (index < string.length) {
      byteArray.push(string.charCodeAt(index));
    } else {
      byteArray.push(0);
    }
  }
  return byteArray;
}

export function colorToBytes(color_hex_code) {
  if (!color_hex_code) {
    return [0, 0, 0];
  }

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

export function percentageToBytes(percentage_float) {
  const value = mapValue(percentage_float, -100.0, 100.0, -2147483647, 2147483647);
  return toBytes(Math.floor(value), 4);
}

export function numberToBytes(value, byteCount) {
  let number = Math.round(value);
  var byteArray = [];
  for (let index = 0; index < byteCount; index++) {
    const byte = number & 0xff;
    byteArray.push(byte);
    number = number >> 8;
  }
  return byteArray;
}

export function detectAndroid() {
  return navigator.userAgent.toLowerCase().indexOf("android") > -1;
}

export function detectBluefy() {
  // return navigator.userAgent.toLowerCase().indexOf("android") == -1 && navigator.userAgent.toLowerCase().indexOf("windows") == -1;
  return navigator.userAgent.toLowerCase().indexOf("bluefy") == -1;
}

//////////////////////////////////////////////////////

export function computeTnglFingerprint(tngl_bytes, tngl_label) {
  let enc = new TextEncoder();
  let algorithm = { name: "HMAC", hash: "SHA-256" };
  let body = new Uint8Array(tngl_bytes);

  return crypto.subtle
    .importKey("raw", enc.encode(tngl_label), algorithm, false, ["sign", "verify"])
    .then(key => {
      return crypto.subtle.sign(algorithm.name, key, body);
    })
    .then(signature => {
      // let digest = btoa(String.fromCharCode(...new Uint8Array(signature)));
      // console.log(digest);
      return new Uint8Array(signature);
    });
}

export function hexStringToUint8Array(hexString, arrayLength) {
  if (hexString.length % 2 != 0) {
    throw "Invalid hexString";
  }
  if (!arrayLength) {
    arrayLength = hexString.length / 2;
  }
  let arrayBuffer = new Uint8Array(arrayLength);
  for (let i = 0; i < arrayLength; i++) {
    const byteValue = parseInt(hexString.substr(i * 2, 2), 16);
    if (byteValue !== NaN) {
      arrayBuffer[i] = byteValue;
    } else {
      arrayBuffer[i] = 0;
    }
  }
  return arrayBuffer;
}

export function uint8ArrayToHexString(bytes) {
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");
}

export function czechHackyToEnglish(string) {
  return string
    .replace(/č/g, "c")
    .replace(/š/g, "s")
    .replace(/ř/g, "r")
    .replace(/ž/g, "z")
    .replace(/ý/g, "y")
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u")
    .replace(/ů/g, "u")
    .replace(/ě/g, "e")
    .replace(/ť/g, "t")
    .replace(/ď/g, "d")
    .replace(/ň/g, "n")
    .replace(/Š/g, "S")
    .replace(/Ž/g, "Z")
    .replace(/Ý/g, "Y")
    .replace(/Á/g, "A")
    .replace(/É/g, "E")
    .replace(/Í/g, "I")
    .replace(/Ó/g, "O")
    .replace(/Ú/g, "U")
    .replace(/Ů/g, "U")
    .replace(/Ě/g, "E")
    .replace(/Ť/g, "T")
    .replace(/Ď/g, "D")
    .replace(/Ň/g, "N");
}


// let secret = "sec-demo"; // the secret key
// let enc = new TextEncoder("utf-8");
// let body = "GET\npub-demo\n/v2/auth/grant/sub-key/sub-demo\nauth=myAuthKey&g=1&target-uuid=user-1&timestamp=1595619509&ttl=300";
// let algorithm = { name: "HMAC", hash: "SHA-256" };

// let key = await crypto.subtle.importKey("raw", enc.encode(secret), algorithm, false, ["sign", "verify"]);
// let signature = await crypto.subtle.sign(algorithm.name, key, enc.encode(body));
// let digest = btoa(String.fromCharCode(...new Uint8Array(signature)));
