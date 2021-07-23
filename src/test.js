import { timeTrack } from './initialize.js';
import { TangleDevice } from './main.js';

const tnglCode = `
defDevice4("device1", 0x00, 0xff, 0x01, 15, 50, 0, 100);

addWindow(0, 2147483647, {
  addDrawing(0, 2147483647, animFill(2147483647, #ff0000));
}).modifyBrightness(channel(0x0a));

eventHandler(0, 3600000, 0x64, 0x00, {
  addDrawing(0, 300, animRainbow(300, constant(100%)));
});

writeChannel(0x0a, eventParameterValueSmoothed(0x0a, 500));

`

const tangleDevice = TangleDevice();

// const connectBtn = document.getElementById('connect');

document.querySelector('#connectBluetooth').addEventListener('click', () => {
  tangleDevice.connect({ type: "bluetooth" });
})
document.querySelector('#connectSerial').addEventListener('click', () => {
  tangleDevice.connect({ type: "serial" });
})

const shootBtn = document.getElementById('shoot');

shootBtn.addEventListener('click', () => {
  tangleDevice.emitEvent(100, 0);
})

const control_value_range = document.getElementById('control_value_range');


control_value_range.oninput = (e) => {
  const value = e.target.value;
  tangleDevice.emitEvent(10, parseInt(value))
};

const uploadBtn = document.getElementById('upload');

uploadBtn.addEventListener('click', () => {
  tangleDevice.uploadTngl(tnglCode);
})

tangleDevice.on("connection", (event) => {
  console.log('Tangle:' + event);

  if (event === "connected") {
    if (tangleDevice.getConnectionType() === "bluetooth") {
      document.querySelector('#connectBluetooth').textContent = "Connected"
    } else if (tangleDevice.getConnectionType() === "serial") {
      document.querySelector('#connectSerial').textContent = "Connected"
    }

    setTimeout(_ => {
      // timeSyncing = setInterval(() => {
      //   tangleDevice.setTime(timeTrack.millis(), false)
      // }, 5000)
      console.log("Sending TANGLE_CODE");
      tangleDevice.uploadTngl(tnglCode)
    }, 300)
  } else {
    if (tangleDevice.getConnectionType() === "bluetooth") {
      document.querySelector('#connectBluetooth').textContent = "Disconnected"
    } else if (tangleDevice.getConnectionType() === "serial") {
      document.querySelector('#connectSerial').textContent = "Disconnected"
    }


    clearInterval(timeSyncing)
  }
});




console.log('module running');