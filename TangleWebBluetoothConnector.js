// npm install --save-dev @types/web-bluetooth
/// <reference types="web-bluetooth" />

import { createNanoEvents, detectAndroid, hexStringToUint8Array, numberToBytes, sleep, toBytes } from "./functions.js";
import { DEVICE_FLAGS } from "./TangleInterface.js";
import { TimeTrack } from "./TimeTrack.js";
import { TnglReader } from "./TnglReader.js";

// od 0.8.0 maji vsechny tangle enabled BLE zarizeni jednotne TANGLE_DEVICE_UUID.
// kazdy typ (produkt) Tangle Zarizeni ma svuj kod v manufacturer data
// verze FW lze získat také z manufacturer data

// xxConnection.js udržuje komunikaci vždy pouze s
// jedním zařízením v jednu chvíli

//////////////////////////////////////////////////////////////////////////

/*
    is renamed Transmitter. Helper class for WebBluetoothConnector.js
*/
export class WebBLEConnection {
  #interfaceReference;
  // private fields
  #service;
  #networkChar;
  #clockChar;
  #deviceChar;
  #writing;
  #uuidCounter;

  constructor(interfaceReference) {
    this.#interfaceReference = interfaceReference;

    /*
      BLE Tangle Service
    */
    this.#service = /** @type {BluetoothRemoteGATTService} */ (null);

    /*  
      Network Characteristics governs the communication with the Tangle Netwok.
      That means tngl uploads, timeline manipulation, event emitting...
      You can access it only if you are authenticated via the Device Characteristics
    */
    this.#networkChar = /** @type {BluetoothRemoteGATTCharacteristic} */ (null); // ? only accesable when connected to the mesh network

    /*  
      The whole purpuse of clock characteristics is to synchronize clock time
      of the application with the Tangle network
    */
    this.#clockChar = /** @type {BluetoothRemoteGATTCharacteristic} */ (null); // ? always accesable

    /*  
      Device Characteristics is renamed Update Characteristics
      Device Characteristics handles ALL CONCEPTS WITH THE 
      PHYSICAL CONNECTED DEVICE. On the other hand Network Characteristics 
      handles concepts connected with the whole tangle network - all devices 
      With Device Charactristics you can upload FW to the single device, 
      access and manipulate json config of the device, adopt device, 
      and authenticate the application client with the tangle network
    */
    this.#deviceChar = /** @type {BluetoothRemoteGATTCharacteristic} */ (null);

    /*
      simple mutex indicating that communication over BLE is in progress
    */
    this.#writing = false;

    this.#uuidCounter = 0;
  }

  #getUUID() {
    // valid UUIDs are in range [1..4294967295] (32 bit number)
    if (this.#uuidCounter >= 4294967295) {
      this.#uuidCounter = 0;
    }

    return ++this.#uuidCounter;
  }

  #writeBytes(characteristic, bytes, response) {
    const write_uuid = this.#getUUID(); // two messages za sebou nesmi mit stejne UUID!
    const packet_header_size = 12; // 3x 4byte integers: write_uuid, index_from, payload.length
    const packet_size = detectAndroid() ? 212 : 512; // min size packet_header_size + 1 !!!! ANDROID NEEDS PACKET SIZE <= 212!!!!
    const bytes_size = packet_size - packet_header_size;

    if (response) {
      return new Promise(async (resolve, reject) => {
        let index_from = 0;
        let index_to = bytes_size;

        while (index_from < bytes.length) {
          if (index_to > bytes.length) {
            index_to = bytes.length;
          }

          const payload = [...numberToBytes(write_uuid, 4), ...numberToBytes(index_from, 4), ...numberToBytes(bytes.length, 4), ...bytes.slice(index_from, index_to)];

          try {
            await characteristic.writeValueWithResponse(new Uint8Array(payload));
          } catch (e) {
            console.warn(e);
            reject(e);
            return;
          }

          index_from += bytes_size;
          index_to = index_from + bytes_size;
        }
        resolve();
        return;
      });
    } else {
      if (bytes.length > bytes_size) {
        console.error("The maximum bytes that can be written without response is " + bytes_size);
        return Promise.reject("WriteError");
      }
      const payload = [...numberToBytes(write_uuid, 4), ...numberToBytes(0, 4), ...numberToBytes(bytes.length, 4), ...bytes.slice(0, bytes.length)];
      return characteristic.writeValueWithoutResponse(new Uint8Array(payload));
    }
  }

  #readBytes(characteristic) {
    // read the requested value
    return characteristic.readValue();
  }

  // WIP, event handling from tangle network to application
  // timeline changes from tangle network to application ...
  #onNetworkNotification(event) {
    // let value = event.target.value;
    // let a = [];
    // for (let i = 0; i < value.byteLength; i++) {
    //   a.push("0x" + ("00" + value.getUint8(i).toString(16)).slice(-2));
    // }
    // console.log("> " + a.join(" "));
  }

  // WIP
  #onDeviceNotification(event) {
    // let value = event.target.value;
    // let a = [];
    // for (let i = 0; i < value.byteLength; i++) {
    //   a.push("0x" + ("00" + value.getUint8(i).toString(16)).slice(-2));
    // }
    // console.log("> " + a.join(" "));
  }

  attach(service, networkUUID, clockUUID, deviceUUID) {
    this.#service = service;

    console.log("> Getting Network Characteristics...");
    return this.#service
      .getCharacteristic(networkUUID)
      .then(characteristic => {
        this.#networkChar = characteristic;
        return this.#networkChar.startNotifications();
      })
      .then(() => {
        console.log("> Network notifications started");
        this.#networkChar.addEventListener("characteristicvaluechanged", () => {
          this.#onNetworkNotification();
        });
      })
      .catch(e => {
        console.warn(e);
      })
      .then(() => {
        console.log("> Getting Clock Characteristics...");
        return this.#service.getCharacteristic(clockUUID);
      })
      .then(characteristic => {
        this.#clockChar = characteristic;
      })
      .catch(e => {
        console.warn(e);
      })
      .then(() => {
        console.log("> Getting Device Characteristics...");
        return this.#service.getCharacteristic(deviceUUID);
      })
      .then(characteristic => {
        this.#deviceChar = characteristic;
        return this.#deviceChar.startNotifications();
      })
      .then(() => {
        console.log("> Device notifications started");
        this.#networkChar.addEventListener("characteristicvaluechanged", () => {
          this.#onDeviceNotification();
        });
      })
      .catch(e => {
        console.warn(e);
      });
  }

  // deliver() thansfers data reliably to the Bluetooth Device. It might not be instant.
  // It may even take ages to get to the device, but it will! (in theory)
  // returns promise that resolves when message is physically send, but you
  // dont need to wait for it to resolve, and spam deliver() as you please.
  // transmering queue will handle it
  deliver(payload) {
    if (!this.#networkChar) {
      return Promise.reject("Network characteristics is null");
    }

    if (this.#writing) {
      return Promise.reject("Communication in proccess");
    }

    this.#writing = true;

    return this.#writeBytes(this.#networkChar, payload, true).finally(() => {
      this.#writing = false;
    });
  }

  // transmit() tryes to transmit data NOW. ASAP. It will fail,
  // if deliver or another transmit is being executed at the moment
  // returns promise that will be resolved when message is physically send (only transmittion, not receive)
  transmit(payload) {
    if (!this.#networkChar) {
      return Promise.reject("Network characteristics is null");
    }

    if (this.#writing) {
      return Promise.reject("Communication in proccess");
    }

    this.#writing = true;

    return this.#writeBytes(this.#networkChar, payload, false).finally(() => {
      this.#writing = false;
    });
  }

  // request first writes the request to the Device Characteristics
  // and then reads the response also from the Device Characteristics
  request(payload, read_response) {
    if (!this.#deviceChar) {
      return Promise.reject("Device characteristics is null");
    }

    if (this.#writing) {
      return Promise.reject("Communication in proccess");
    }

    this.#writing = true;

    return this.#writeBytes(this.#deviceChar, payload, true)
      .then(() => {
        if (read_response) {
          return this.#readBytes(this.#deviceChar);
        } else {
          return Promise.resolve([]);
        }
      })
      .finally(() => {
        this.#writing = false;
      });
  }

  // write timestamp to clock characteristics as fast as possible
  writeClock(timestamp) {
    if (!this.#clockChar) {
      return Promise.reject("Sync characteristics is null");
    }

    if (this.#writing) {
      return Promise.reject("Communication in proccess");
    }

    this.#writing = true;

    const bytes = toBytes(timestamp, 4);
    return this.#clockChar.writeValueWithoutResponse(new Uint8Array(bytes)).finally(() => {
      this.#writing = false;
    });
  }

  // reads the current clock characteristics timestamp from the device
  // as fast as possible
  readClock() {
    if (!this.#clockChar) {
      return Promise.reject("Clock characteristics is null");
    }

    if (this.#writing) {
      return Promise.reject("Communication in proccess");
    }

    this.#writing = true;

    return this.#clockChar
      .readValue()
      .then(dataView => {
        let reader = new TnglReader(dataView);
        return reader.readInt32();
      })
      .finally(() => {
        this.#writing = false;
      });
  }

  updateFirmware(firmware) {
    if (!this.#deviceChar) {
      return Promise.reject("Device characteristics is null");
    }

    if (this.#writing) {
      return Promise.reject("Communication in proccess");
    }

    this.#writing = true;

    return new Promise(async (resolve, reject) => {
      const chunk_size = detectAndroid() ? 1008 : 4992; // must be modulo 16

      let index_from = 0;
      let index_to = chunk_size;

      let written = 0;

      console.log("OTA UPDATE");
      console.log(firmware);

      try {
        this.#interfaceReference.emit("ota_status", "begin");

        {
          //===========// RESET //===========//
          console.log("OTA RESET");

          const bytes = [DEVICE_FLAGS.FLAG_OTA_RESET, 0x00, ...numberToBytes(0x00000000, 4)];
          await this.#writeBytes(this.#deviceChar, bytes, true);
        }

        await sleep(100);

        {
          //===========// BEGIN //===========//
          console.log("OTA BEGIN");

          const bytes = [DEVICE_FLAGS.FLAG_OTA_BEGIN, 0x00, ...numberToBytes(firmware.length, 4)];
          await this.#writeBytes(this.#deviceChar, bytes, true);
        }

        await sleep(10000); // need to wait 10 seconds to let the ESP erase the flash.

        {
          //===========// WRITE //===========//
          console.log("OTA WRITE");

          const start_timestamp = new Date().getTime();

          while (written < firmware.length) {
            if (index_to > firmware.length) {
              index_to = firmware.length;
            }

            const bytes = [DEVICE_FLAGS.FLAG_OTA_WRITE, 0x00, ...numberToBytes(written, 4), ...firmware.slice(index_from, index_to)];

            await this.#writeBytes(this.#deviceChar, bytes, true);
            written += index_to - index_from;

            const percentage = Math.floor((written * 10000) / firmware.length) / 100;
            console.log(percentage + "%");

            this.#interfaceReference.emit("ota_progress", percentage);

            index_from += chunk_size;
            index_to = index_from + chunk_size;
          }

          console.log("Firmware written in " + (new Date().getTime() - start_timestamp) / 1000 + " seconds");
        }

        await sleep(100);

        {
          //===========// END //===========//
          console.log("OTA END");

          const bytes = [DEVICE_FLAGS.FLAG_OTA_END, 0x00, ...numberToBytes(written, 4)];
          await this.#writeBytes(this.#deviceChar, bytes, true);
        }

        this.#interfaceReference.emit("ota_status", "success");
        resolve();
      } catch (e) {
        this.#interfaceReference.emit("ota_status", "fail");
        reject(e);
      }
    }).finally(() => {
      this.#writing = false;
    });
  }

  // resets the Communations, discarding command queue
  reset() {
    this.#service = null;
    this.#networkChar = null;
    this.#clockChar = null;
    this.#deviceChar = null;
    this.#writing = false;
  }

  destroy() {
    this.reset();
    this.#interfaceReference = null;
  }
}

/////////////////////////////////////////////////////////////////////////////////////

// Connector connects the application with one Tangle Device, that is then in a
// position of a controller for other Tangle Devices
export class TangleWebBluetoothConnector {
  #interfaceReference;

  #webBTDevice;
  #webBTDeviceFwVersion;
  #connection;
  #reconection;
  #criteria;

  constructor(interfaceReference) {
    this.#interfaceReference = interfaceReference;

    this.TANGLE_SERVICE_UUID = "cc540e31-80be-44af-b64a-5d2def886bf5";

    this.TERMINAL_CHAR_UUID = "33a0937e-0c61-41ea-b770-007ade2c79fa";
    this.CLOCK_CHAR_UUID = "7a1e0e3a-6b9b-49ef-b9b7-65c81b714a19";
    this.DEVICE_CHAR_UUID = "9ebe2e4b-10c7-4a81-ac83-49540d1135a5";

    this.#webBTDevice = null;
    this.#webBTDeviceFwVersion = "";
    this.#connection = new WebBLEConnection(interfaceReference);
    this.#reconection = false;
    this.#criteria = {};
  }

  /*

criteria: pole objektu, kde plati: [{ tohle and tamto and toto } or { tohle and tamto }]

možnosti:
  name: string
  namePrefix: string
  fwVersion: string
  ownerSignature: string
  productCode: number
  adoptionFlag: bool

criteria example:
[
  // selects all legacy devices
  {
    legacy:true
  }
  // all Devices that are named "NARA Aplha", are on 0.8.0 fw and are
  // adopted by the owner with "baf2398ff5e6a7b8c9d097d54a9f865f" signature.
  // Product code is 1 what means NARA Alpha
  {
    name:"NARA Alpha" 
    fwVersion:"0.8.0"
    ownerSignature:"baf2398ff5e6a7b8c9d097d54a9f865f"
    productCode:1
  },
  // all the devices with the name starting with "NARA", without the 0.8.0 FW and 
  // that are not adopted by anyone
  // Product code is 2 what means NARA Beta 
  {
    namePrefix:"NARA"
    fwVersion:"!0.8.0"
    productCode:2
    adoptionFlag:true
  }
]

*/
  // choose one Tangle device (user chooses which device to connect to via a popup)
  // if no criteria are set, then show all Tangle devices visible.
  // first bonds the BLE device with the PC/Phone/Tablet if it is needed.
  // Then selects the device
  userSelect(criteria) {
    //console.log("choose()");

    if (this.#webBTDevice && this.#webBTDevice.gatt.connected) {
      return this.disconnect().then(() => {
        return this.userSelect(criteria);
      });
    }

    console.log(criteria);

    // store new criteria as a array
    if (criteria) {
      if (Array.isArray(criteria)) {
        this.#criteria = criteria;
      } else {
        this.#criteria = [criteria];
      }
    } else {
      this.#criteria = [];
    }

    /** @type {RequestDeviceOptions} */
    let web_ble_options = { filters: /** @type {BluetoothLEScanFilter[]} */ ([]), optionalServices: [this.TANGLE_SERVICE_UUID] };

    if (this.#criteria.length == 0) {
      web_ble_options.filters.push({ services: [this.TANGLE_SERVICE_UUID] });
    }
    //
    else {
      for (let i = 0; i < this.#criteria.length; i++) {
        const criterium = this.#criteria[i];

        // if legacy criterium is set, then fill the
        if (criterium.legacy) {
          // TO-DO make legacy filter
          continue;
        }

        let filter = { services: [this.TANGLE_SERVICE_UUID] };

        if (criterium.name) {
          filter.name = criterium.name;
        } else if (criterium.namePrefix) {
          filter.namePrefix = criterium.namePrefix;
        }

        // if any of these criteria are required, then we need to build a manufacturer data filter.
        if (criterium.fwVersion || criterium.ownerSignature || criterium.productCode || criterium.adoptionFlag) {
          const company_identifier = 0x02e5; // Bluetooth SIG company identifier of Espressif

          delete filter.services;

          let prefix = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          let mask = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

          if (criterium.productCode) {
            if (criterium.productCode < 0 || criterium.productCode > 0xffff) {
              throw "invalid productCode";
            }

            const product_code_byte_offset = 2;
            const product_code_bytes = [criterium.productCode & 0xff, (criterium.productCode >> 8) & 0xff];

            for (let i = 0; i < 2; i++) {
              prefix[product_code_byte_offset + i] = product_code_bytes[i];
              mask[product_code_byte_offset + i] = 0xff;
            }
          }

          if (criterium.ownerSignature) {
            if (criterium.ownerSignature.length != 32) {
              throw "invalid ownerSignature";
            }

            const owner_signature_byte_offset = 4;
            const owner_signature_code_bytes = hexStringToUint8Array(criterium.ownerSignature);

            for (let i = 0; i < 16; i++) {
              prefix[owner_signature_byte_offset + i] = owner_signature_code_bytes[i];
              mask[owner_signature_byte_offset + i] = 0xff;
            }
          }

          if (criterium.adoptionFlag) {
            const other_flags_offset = 20;

            let flags_prefix = 0b00000000;
            const flags_mask = 0b11111111;

            if (criterium.adoptionFlag === true) {
              const adoption_flag_bit_pos = 0;

              flags_prefix |= 1 << adoption_flag_bit_pos;
            }

            prefix[other_flags_offset] = flags_prefix;
            mask[other_flags_offset] = flags_mask;
          }

          if (criterium.fwVersion) {
            const fw_version_byte_offset = 0;
            const reg = criterium.fwVersion.match(/(!?)([\d]+).([\d]+).([\d]+)/);
            const version_code = reg[2] * 10000 + reg[3] * 100 + reg[4] * 1;
            const version_bytes = [version_code & 0xff, (version_code >> 8) & 0xff];

            if (reg[1] === "!") {
              // workaround for web bluetooth not having a filter for "if the manufacturer data are not this, then show me the device"
              // we will generate 16 filters, each filtering one of the 16 bits that is different from my version.
              // if the one bit is different, then the version of the found device is different than mine.
              // and thats what we need.

              filter.manufacturerData = [];

              for (let i = 0; i < 2; i++) {
                // version is defined as 2 bytes
                for (let j = 0; j < 8; j++) {
                  // each byte 8 bits

                  for (let k = 0; k < 2; k++) {
                    prefix[fw_version_byte_offset + k] = 0;
                    mask[fw_version_byte_offset + k] = 0;
                  }

                  prefix[fw_version_byte_offset + i] = ~(version_bytes[i] & (1 << j));
                  mask[fw_version_byte_offset + i] = 1 << j;

                  let filter_clone = JSON.parse(JSON.stringify(filter));
                  filter_clone.manufacturerData = [{ companyIdentifier: company_identifier, dataPrefix: new Uint8Array(prefix), mask: new Uint8Array(mask) }];
                  web_ble_options.filters.push(filter_clone);
                }
              }
            } else {
              for (let i = 0; i < 2; i++) {
                prefix[fw_version_byte_offset + i] = version_bytes[i];
                mask[fw_version_byte_offset + i] = 0xff;
              }
              filter.manufacturerData = [{ companyIdentifier: company_identifier, dataPrefix: new Uint8Array(prefix), mask: new Uint8Array(mask) }];
              web_ble_options.filters.push(filter);
            }
          } else {
            filter.manufacturerData = [{ companyIdentifier: company_identifier, dataPrefix: new Uint8Array(prefix), mask: new Uint8Array(mask) }];
            web_ble_options.filters.push(filter);
          }
        } else {
          web_ble_options.filters.push(filter);
        }
      }
    }

    console.log(web_ble_options.filters);

    return navigator.bluetooth.requestDevice(web_ble_options.filters.length != 0 ? web_ble_options : { acceptAllDevices: true, optionalServices: [this.TANGLE_SERVICE_UUID] }).then(device => {
      console.log(device);

      this.#webBTDevice = device;
      this.#webBTDevice.addEventListener("gattserverdisconnected", () => {
        this.#onDisconnected();
      });

      // TO-DO detect FW version from manufacturer data field
      // Seems like imposibble in web bluetooth so setting this to "unknown"
      this.#webBTDeviceFwVersion = "unknown";
    });
  }

  // takes the criteria, scans for scan_period and automatically selects the device,
  // you can then connect to. This works only for BLE devices that are bond with the phone/PC/tablet
  // the app is running on OR doesnt need to be bonded in a special way.
  // if more devices are found matching the criteria, then the strongest signal wins
  // if no device is found within the timeout period, then it returns an error

  // if no criteria are provided, all Tangle enabled devices (with all different FWs and Owners and such)
  // are eligible.

  autoSelect(criteria, scan_period = 1000, timeout = 3000) {
    // step 1. for the scan_period scan the surroundings for BLE devices.
    // step 2. if some devices matching the criteria are found, then select the one with
    //         the greatest signal strength. If no device is found until the timeout,
    //         then return error

    if (this.#webBTDevice && this.#webBTDevice.gatt.connected) {
      return this.disconnect().then(() => {
        return this.autoSelect(criteria);
      });
    }

    // web bluetooth cant really auto select bluetooth device. This is the closest you can get.
    if (this.#webBTDevice && criteria.ownerSignature === this.#criteria.ownerSignature) {
      return Promise.resolve();
    }

    // Web Bluetooth nepodporuje možnost automatické volby zařízení.
    // Proto je to tady implementováno totožně jako userSelect.

    return this.userSelect(criteria);
  }

  // if device is not connected, then erase it
  unselect() {
    if (!(this.#webBTDevice && this.#webBTDevice.gatt.connected)) {
      this.#webBTDevice = null;
      this.#connection.reset();
      return Promise.resolve();
    }

    return Promise.reject();
  }

  selected() {
    return Promise.resolve(this.#webBTDevice ? { fwVersion: this.#webBTDeviceFwVersion } : null);
  }

  // connect Connector to the selected Tangle Device. Also can be used to reconnect.
  // Fails if no device is selected
  connect(attempts = 3) {
    this.#reconection = true;

    if (!this.#webBTDevice) {
      return Promise.reject("NotSelected");
    }

    if (this.#webBTDevice.gatt.connected) {
      console.log("> Bluetooth Device is already connected");
      return Promise.resolve();
    }

    if (attempts <= 0) {
      console.log("> Connect attempts have expired");
      return Promise.reject("ConnectionError");
    }

    console.log("> Connecting to Bluetooth device...");
    return this.#webBTDevice.gatt
      .connect()
      .then(server => {
        this.#connection.reset();

        console.log("> Getting the Bluetooth Service...");
        return server.getPrimaryService(this.TANGLE_SERVICE_UUID);
      })
      .then(service => {
        console.log("> Getting the Service Characteristic...");

        return this.#connection.attach(service, this.TERMINAL_CHAR_UUID, this.CLOCK_CHAR_UUID, this.DEVICE_CHAR_UUID);
      })
      .then(() => {
        console.log("> Bluetooth Device Connected");
        return this.#interfaceReference.emit("#connected", { target: this });
      })
      .catch(error => {
        console.warn(error.name);

        // If the device is far away, sometimes this "NetworkError" happends
        if (error.name == "NetworkError") {
          return sleep(1000).then(() => {
            if (this.#reconection) {
              return this.connect(attempts - 1);
            } else {
              return Promise.reject("ConnectionError");
            }
          });
        } else {
          throw error;
        }
      });
  }

  connected() {
    return Promise.resolve(this.#webBTDevice && this.#webBTDevice.gatt.connected);
  }

  // disconnect Connector from the connected Tangle Device. But keep it selected
  disconnect() {
    this.#reconection = false;

    console.log("> Disconnecting from Bluetooth Device...");

    this.#connection.reset();

    if (!this.#webBTDevice) {
      return Promise.reject("NotSelected");
    }

    if (this.#webBTDevice.gatt.connected) {
      this.#webBTDevice.gatt.disconnect();
    } else {
      console.log("Bluetooth Device is already disconnected");
    }

    return Promise.resolve();
  }

  // when the device is disconnected, the javascript Connector.js layer decides
  // if it should be revonnected. Here is implemented that it should be
  // reconnected only if the this.#reconection is true. The event handlers are fired
  // synchronously. So that only after all event handlers (one after the other) are done,
  // only then start this.connect() to reconnect to the bluetooth device
  #onDisconnected = event => {
    console.log("> Bluetooth Device disconnected");
    this.#connection.reset();
    this.#interfaceReference.emit("#disconnected", { target: this });
  };

  // deliver handles the communication with the Tangle network in a way
  // that the command is guaranteed to arrive
  deliver(payload) {
    if (!(this.#webBTDevice && this.#webBTDevice.gatt.connected)) {
      return Promise.reject("Disconnected");
    }

    return this.#connection.deliver(payload);
  }

  // transmit handles the communication with the Tangle network in a way
  // that the command is NOT guaranteed to arrive
  transmit(payload) {
    if (!(this.#webBTDevice && this.#webBTDevice.gatt.connected)) {
      return Promise.reject("Disconnected");
    }

    return this.#connection.transmit(payload);
  }

  // request handles the requests on the Tangle network. The command request
  // is guaranteed to get a response
  request(payload, read_response = true) {
    if (!(this.#webBTDevice && this.#webBTDevice.gatt.connected)) {
      return Promise.reject("Disconnected");
    }

    return this.#connection.request(payload, read_response);
  }

  // synchronizes the device internal clock with the provided TimeTrack clock
  // of the application as precisely as possible
  setClock(clock) {
    if (!(this.#webBTDevice && this.#webBTDevice.gatt.connected)) {
      return Promise.reject("Disconnected");
    }

    return new Promise(async (resolve, reject) => {
      for (let index = 0; index < 3; index++) {
        await sleep(1000);
        try {
          await this.#connection.writeClock(clock.millis());
          console.log("Clock write success");
          resolve();
          return;
        } catch (e) {
          console.warn("Clock write failed");
        }
      }

      reject("Clock write failed");
      return;
    });
  }

  // returns a TimeTrack clock object that is synchronized with the internal clock
  // of the device as precisely as possible
  getClock() {
    if (!(this.#webBTDevice && this.#webBTDevice.gatt.connected)) {
      return Promise.reject("Disconnected");
    }

    return new Promise(async (resolve, reject) => {
      for (let index = 0; index < 3; index++) {
        await sleep(1000);
        try {
          const timestamp = await this.#connection.readClock();
          console.log("Clock read success:", timestamp);
          resolve(new TimeTrack(timestamp));
          return;
        } catch (e) {
          console.warn("Clock read failed:", e);
        }
      }

      reject("Clock read failed");
      return;
    });
  }

  // handles the firmware updating. Sends "ota" events
  // to all handlers
  updateFW(firmware) {
    if (!(this.#webBTDevice && this.#webBTDevice.gatt.connected)) {
      return Promise.reject("Disconnected");
    }

    return this.#connection.updateFirmware(firmware);
  }

  destroy() {
    //this.#interfaceReference = null; // dont know if I need to destroy this reference.. But I guess I dont need to?
    return this.disconnect()
      .catch(() => {})
      .then(() => {
        return this.unselect();
      })
      .catch(() => {});
  }
}
