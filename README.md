# Tangle JS library
- Tangle library for Javascript

## Requirements
- Your browser must support WebBluetooth, check your browser here [caniuse.com/web-bluetooth](https://caniuse.com/web-bluetooth)  

## QuickStart
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.jsdelivr.net/npm/tangle-js@1.0.3/dist/TangleBluetoothDevice.umd.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/tangle-js@1.0.3/dist/TangleCodeParser.umd.js"></script>
    <link rel="stylesheet" href="style.css" />

    <title>Tangle Example</title>
  </head>

  <body>
    <button id="connect">Connect</button>
    <input type="color" value="#ffffff" id="color" />
    <button id="upload">Upload</button>

    <script>
      const tangleBluetoothDevice = new TangleBluetoothDevice();
      const tnglParser = new TnglCodeParser();

      const connectButton = document.querySelector("#connect");
      const colorInput = document.querySelector("#color");

      connectButton.onclick = () => {
        tangleBluetoothDevice.connect();

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

          const compiledCode = tnglParser.parseTnglCode(code);

          // Uploads code to tangle device
          tangleBluetoothDevice.uploadTngl(compiledCode, 0, false);
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
npm install tangle-js
```
Then import and initialize 
```js
import { TangleBluetoothDevice, TnglCodeParser } from 'tangle-js'

const tangleBluetoothDevice = new TangleBluetoothDevice();
const tnglParser = new TnglCodeParser();
```
 
## License

[MIT](LICENSE).
