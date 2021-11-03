import { timeTrack} from './initialize.js';
import { tangleDevice } from './main.js';
import './control.js'



const tnglCode = `
defDevice($dev1, 0x00, 0xff, 0x0f, 15px);

addDrawing(0s, 2s, animFade(2s, #0000ff, #000000));
interactive(0s, Infinity, $vystr, {
  addDrawing(0s, 1s, animPlasmaShot(1s, #ff0000, 25%));
});
defVariable($brigh, genSmoothOut(genLastEventParam($brigh), 0.3s));
addWindow(0s, Infinity, {
  addDrawing(0s, Infinity, animRainbow(1s, 100%));
}).modifyBrightness($brigh);
  addDrawing(0s, Infinity, animFill(5s, $color));
interactive(0s, Infinity, $vystb, {
  defVariable($vystb, genLastEventParam($vystb));
  addDrawing(0s, 1s, animPlasmaShot(1s, $vystb, 25%));
});
interactive(0s, Infinity, $vystd, {
  defVariable($vystd, genLastEventParam($vystd));
  addDrawing(0s, $vystd, animPlasmaShot($vystd, #00ff00, 25%));
});
`


document.querySelector('#connectBluetooth').addEventListener('click', () => {
  tangleDevice.connect({ type: "bluetooth" });
})
document.querySelector('#connectSerial').addEventListener('click', () => {
  tangleDevice.connect({ type: "serial" });
})

// const shootBtn = document.getElementById('shoot');

// shootBtn.addEventListener('click', () => {
//   tangleDevice.emitEvent(100, 0);
// })

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
    } else if (tangleDevice.getConnectionType() === "android") {
      document.querySelector('#connectTangleConnect').textContent = "Connected"
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
      document.querySelector('#connectSerial').textContent = "Connected"
    } else if (tangleDevice.getConnectionType() === "android") {
      document.querySelector('#connectTangleConnect').textContent = "Disconnected"
    }


    clearInterval(timeSyncing)
  }
});

console.log('module running');