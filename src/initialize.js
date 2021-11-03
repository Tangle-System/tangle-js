import TimeTrack from "./TimeTrack.js";
import TangleBluetoothDevice from "./TangleBluetoothDevice.js";
import TnglCodeParser from "./TangleCodeParser.js";
import TangleSerialDevice from "./TangleSerialDevice.js";
import { createNanoEvents } from "./functions.js";

export const tnglParser = new TnglCodeParser();
export const timeTrack = new TimeTrack();
export const tangleConnect = window.tangleConnect;
export const tangleBluetoothDevice = new TangleBluetoothDevice();
export const tangleSerialDevice = new TangleSerialDevice();
export const nanoevents = createNanoEvents();

window.nanoevents = nanoevents;
window.timeTrack = timeTrack