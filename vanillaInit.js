import { TangleDevice } from "./TangleDevice.js";
import { TimeTrack } from "./TimeTrack.js";
import { uint8ArrayToHexString } from "./functions.js";

window.TangleDevice = TangleDevice;
window.TimeTrack = TimeTrack;
window.uint8ArrayToHexString = uint8ArrayToHexString;

function injectScript(src) {
  const script = document.createElement("script");
  script.src = src;
  document.head.appendChild(script);
}

injectScript("code.js");
injectScript("control.js");
