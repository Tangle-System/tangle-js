import { TangleDevice } from './main.js';

const tnglCode = `defDevice4("device1", 0x00, 0xff, 0x01, 13, 50, 0, 100);

addDrawing(0, 2147483647, animFill(2147483647, #ff0000));

eventHandler(0, 3600000, 0x64, 0x00, {
  addDrawing(0, 5000, animRainbow(5000, constant(100%)));
});`

const tangleDevice = TangleDevice();

const connectBtn = document.getElementById('connect');

connectBtn.addEventListener('click', () => {
  tangleDevice.connect();
})

const shootBtn = document.getElementById('shoot');

shootBtn.addEventListener('click', () => {
  tangleDevice.emitEvent(100, 0);
})

const uploadBtn = document.getElementById('upload');

uploadBtn.addEventListener('click', () => {
  tangleDevice.uploadTngl(tnglCode);
})


console.log('module running');