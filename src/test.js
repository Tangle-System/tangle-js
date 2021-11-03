import { timeTrack } from './initialize.js';
import { TangleDevice } from './main.js';


const tnglCode = `
// defDevice($dev, 0x00, 0xff, 0x01, 15px);
// defVariable($var1, #ff00ff);
// addDrawing(0s, Infinity, animPlasmaShot(5s, $var1, 25%));

defDevice($dev, 0x00, 0xff, 0x01, 15px);

addDrawing(-100s, 1000s, animRainbow(5s, 100%));

`

const tangleDevice = TangleDevice();


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

const resetTimeBtn = document.querySelector('#resetTime')

resetTimeBtn.addEventListener('click', () => {
  timeTrack.setMillis(0);
  tangleDevice.setTimeline(0, false);
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
      // console.log("Sending TANGLE_CODE");
      // tangleDevice.uploadTngl(tnglCode)

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