import TangleDevice from "./lib/TangleDevice.js";
window.debug = true;

const tangleDevice = TangleDevice();
// tangleDevice.uploadTngl("ahoj");
document.querySelector("#connect").onclick = (_) => tangleDevice.connect();
document.querySelector("#hello").onclick = (_) =>
  tangleDevice.uploadTngl(`
  defDevice("nara", 0x00, 0xff, 15, 60, 60, 60);

  addDrawing(0, 2147483647, animFill(1000000, #c00060));
handlerKeyPress['Q'](0, 3600000, "nara", {
    subDrawing(0, 3000, animPlasmaShot(3000, #ffffff, 100%));
  });
  `);
document.querySelector("#hello2").onclick = (_) => tangleDevice.trigger("Q");
