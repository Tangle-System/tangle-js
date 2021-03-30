# Tangle JS library
- Tangle library for Javascript

## Requirements
- Your browser must support WebBluetooth, check your browser here [caniuse.com/web-bluetooth](https://caniuse.com/web-bluetooth)  

## QuickStart
play with demo here https://tangle-example.glitch.me/
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.jsdelivr.net/npm/@tangle-system/tangle-js@0.5.2/dist/TangleBluetoothDevice.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tangle-system/tangle-js@0.5.2/dist/TangleDevice.umd.min.js"></script>
  <link rel="stylesheet" href="style.css" />
  <title>Tangle Example</title>
</head>

<body>
  <button id="connect">Connect</button>
  <input type="color" value="#ffffff" id="color" />
  <button id="upload">Upload</button>

  <script>
    const tangleBluetoothDevice = new TangleBluetoothDevice();
    const tangleDevice = TangleDevice({ ble: tangleBluetoothDevice });

    const connectButton = document.querySelector("#connect");
    const colorInput = document.querySelector("#color");

    connectButton.onclick = () => {
      tangleDevice.connect();

      // Events for bluetooth connection and disconnect
      tangleBluetoothDevice.bluetoothConnection.addEventListener("disconnected", (_) => {
        connectButton.textContent = "Connect";
        connectButton.classList.remove("danger");
      });
      tangleBluetoothDevice.bluetoothConnection.addEventListener("connected", (_) => {
        connectButton.textContent = "Disconnect";
        connectButton.classList.add("danger");
      });
    };

    document.querySelector("#upload").onclick = () => {
      if (tangleBluetoothDevice.bluetoothConnection.connected) {
        // Tangle run this effect for 15s
        const time = 1000 * 15;

        // User selected color value
        const selectedColor = colorInput.value;

        // Code we generated via Tangle Blockly
        const code = `addDrawing(0, ${time}, animFill(${time}, ${selectedColor}););`;

        // Uploads code to tangle device
        tangleDevice.uploadTngl(code);
      } else {
        alert("You have to connect your device first.");
      }
    };
  </script>
</body>
</html>
```


You can also install it as NPM package to your project
```bash
npm install @tangle-system/tangle-js 
```
Then import and initialize 
```js
import { TangleBluetoothDevice, TnglCodeParser } from 'tangle-js'

const tangleBluetoothDevice = new TangleBluetoothDevice();
const tnglParser = new TnglCodeParser();
```
 
## License

[MIT](LICENSE).
