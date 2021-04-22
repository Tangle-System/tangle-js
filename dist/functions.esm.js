var timeOffset = new Date().getTime() % 0x7fffffff;
// must be positive int32_t (4 bytes)
function getTimestamp() {
  return (new Date().getTime() % 0x7fffffff) - timeOffset;
}

function toBytes(value, byteCount) {
  var byteArray = [];
  for (var index = 0; index < byteCount; index++) {
    var byte = value & 0xff;
    byteArray.push(byte);
    value = (value - byte) / 256;
  }
  return byteArray;
}

// The MIT License (MIT)
// Copyright 2016 Andrey Sitnik <andrey@sitnik.ru>
const createNanoEvents = () => ({
  events: {},
  emit(event, ...args) {
    (this.events[event] || []).forEach((i) => i(...args));
  },
  on(event, cb) {
    (this.events[event] = this.events[event] || []).push(cb);
    return () => (this.events[event] = (this.events[event] || []).filter((i) => i !== cb));
  },
});

function replaceConstants(content = "", replacableConstants) {
  const constantsarray = Object.entries(replacableConstants);
  constantsarray.forEach(([constant, value]) => {
    const constantRegex = new RegExp(constant, "g");
    content = content.replace(constantRegex, value);
  });
  return content;
}

function getHexColor(colorStr) {
  const a = document.createElement("div");
  a.style.color = colorStr;
  const colors = window
    .getComputedStyle(document.body.appendChild(a))
    .color.match(/\d+/g)
    .map(function (a) {
      return parseInt(a, 10);
    });
  document.body.removeChild(a);
  return colors.length >= 3 ? "#" + ((1 << 24) + (colors[0] << 16) + (colors[1] << 8) + colors[2]).toString(16).substr(1) : false;
}

export { createNanoEvents, getHexColor, getTimestamp, replaceConstants, timeOffset, toBytes };
