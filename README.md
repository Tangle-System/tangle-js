# Tangle JS library 0.7
- Tangle library for Javascript

## Requirements (you need to meet atleast one of these)
- WebBluetooth, check your browser here [caniuse.com/web-bluetooth](https://caniuse.com/web-bluetooth)  
- WebSerial, check your browser here [caniuse.com/web-bluetooth](https://caniuse.com/web-serial)  
- TangleConnect APP, Android app will be available soon, IOS later

## QuickStart
<!-- TODO - make new playground project -->
play with demo here https://tangle-example.glitch.me/
```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
</head>

<body>
  Serial
  <button id="connectSerial">Disconnected</button>
  Bluetooth
  <button id="connectBluetooth">Disconnected</button>
  <button id="shoot">Shoot</button>
  <button id="upload">Upload</button>
  <button id="resetTime">Time to 0</button>

  <br>
  <input id="control_value_range" min="0" max="255" step="5" type="range">

  <script type="module" src="test.js"></script>
  <!-- Non js module version is not documented yer -->
</body>

</html>
```

```js (test.js)
import { timeTrack } from './initialize.js';
import { TangleDevice } from './main.js';

// build your own TnglCode logic on https://blockly.tangle.cz/0.7.0/
const tnglCode = `
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
```


You can also install it as NPM package to your project
```bash
npm install @tangle-system/tangle-js 
```
Then import and initialize 
<!-- TODO - rewrite this -->
```js
import { TangleBluetoothDevice, TnglCodeParser } from 'tangle-js'

const tangleBluetoothDevice = new TangleBluetoothDevice();
const tnglParser = new TnglCodeParser();
```
 
## License

[MIT](LICENSE).
