// import { sleep } from "./functions.js";
// import { TimeTrack } from "./TimeTrack.js";

// // Čus Viktore, tohle ber jenom jako nástřel. Pokud něco nebude dávat smysl, ozvi se. Díky

// // od 0.8.0 maji vsechny tangle enabled BLE zarizeni jednotne TANGLE_DEVICE_UUID.
// // kazdy typ (produkt) Tangle Zarizeni ma svuj kod v manufacturer data
// // verze FW lze získat také z manufacturer data

// // xxConnection.js udržuje komunikaci vždy pouze s
// // jedním zařízením v jednu chvíli

// /////////////////////////////////////////////////////////////////////////////////////

// // just a placeholder
// var JAVA_TANGLE_CONNECT = {};

// // Connector connects the application with one Tangle Device, that is then in a
// // position of a controller for other Tangle Devices
// export class TangleConnectConnector {
//   #interfaceReference;

//   constructor(interfaceReference) {
//     this.#interfaceReference = interfaceReference;

//     this.TANGLE_SERVICE_UUID = "cc540e31-80be-44af-b64a-5d2def886bf5";

//     this.TERMINAL_CHAR_UUID = "33a0937e-0c61-41ea-b770-007ade2c79fa";
//     this.CLOCK_CHAR_UUID = "7a1e0e3a-6b9b-49ef-b9b7-65c81b714a19";
//     this.DEVICE_CHAR_UUID = "9ebe2e4b-10c7-4a81-ac83-49540d1135a5";

//     JAVA_TANGLE_CONNECT.addEventListener("gattserverdisconnected", () => {
//       this.#onDisconnected();
//     });
//   }

//   /*

// criteria: pole objektu, kde plati: [{ tohle and tamto and toto } or { tohle and tamto }]

// možnosti:
//   name: string
//   namePrefix: string
//   fwVersion: string
//   ownerSignature: string
//   productCode: number
//   adoptionFlag: bool

// criteria example:
// [
//   // all Devices that are named "NARA Aplha", are on 0.7.2 fw and are
//   // adopted by the owner with "baf2398ff5e6a7b8c9d097d54a9f865f" signature.
//   // Product code is 1 what means NARA Alpha
//   {
//     name:"NARA Alpha" 
//     fwVersion:"0.7.2"
//     ownerSignature:"baf2398ff5e6a7b8c9d097d54a9f865f"
//     productCode:1
//   },
//   // all the devices with the name starting with "NARA", without the 0.7.3 FW and 
//   // that are not adopted by anyone
//   // Product code is 2 what means NARA Beta 
//   {
//     namePrefix:"NARA"
//     fwVersion:"!0.7.3"
//     productCode:2
//     adoptionFlag:true
//   }
// ]

// */
//   // choose one Tangle device (user chooses which device to connect to via a popup)
//   // if no criteria are set, then show all Tangle devices visible.
//   // first bonds the BLE device with the PC/Phone/Tablet if it is needed.
//   // Then selects the device

//   // returns true if selection was success, false on fail

//   userSelect(criteria) {
//     //console.log("choose()");

//     return JAVA_TANGLE_CONNECT.userSelect(criteria);
//   }

//   // takes the criteria, scans for scan_period and automatically selects the device,
//   // you can then connect to. This works only for BLE devices that are bond with the phone/PC/tablet
//   // the app is running on OR doesnt need to be bonded in a special way.
//   // if more devices are found matching the criteria, then the strongest signal wins
//   // if no device is found within the timeout period, then it returns an error

//   // if no criteria are provided, all Tangle enabled devices (with all different FWs and Owners and such)
//   // are eligible.

//   // returns true if selection was success,  false on fail

//   autoSelect(criteria, scan_period = 1000, timeout = 3000) {
//     // step 1. for the scan_period scan the surroundings for BLE devices.
//     // step 2. if some devices matching the criteria are found, then select the one with
//     //         the greatest signal strength. If no device is found until the timeout,
//     //         then return error

//     return JAVA_TANGLE_CONNECT.autoSelect(criteria, scan_period, timeout);
//   }

//   selected() {
//     return JAVA_TANGLE_CONNECT.selected();
//   }

//   unselect() {
//     return JAVA_TANGLE_CONNECT.unselect();
//   }

//   // connect Connector to the selected Tangle Device. Also can be used to reconnect.
//   // Fails if no device is selected
//   connect(attempts = 3) {
//     return JAVA_TANGLE_CONNECT.connect(attempts);
//   }

//   connected() {
//     // returns a bool if the selected device is connected
//     return JAVA_TANGLE_CONNECT.connected();
//   }

//   disconnect() {
//     // disconnect Connector from the connected Tangle Device. But keep it selected
//     return JAVA_TANGLE_CONNECT.disconnect();
//   }

//   // when the device is disconnected, the javascript Connector.js layer decides
//   // if it should be revonnected. Here is implemented that it should be
//   // reconnected only if the this.#reconection is true. The event handlers are fired
//   // synchronously. So that only after all event handlers (one after the other) are done,
//   // only then start this.connect() to reconnect to the bluetooth device
//   #onDisconnected = event => {
//     console.log("> Bluetooth Device disconnected");
//     this.#interfaceReference.emit("#disconnected", { target: this });
//   };

//   // deliver handles the communication with the Tangle network in a way
//   // that the command is guaranteed to arrive
//   deliver(payload) {
//     // "blocking function" - writes with response specified payload to the Network Characteristics.
//     // do not read a response
//     return JAVA_TANGLE_CONNECT.deliver(payload);
//   }

//   // transmit handles the communication with the Tangle network in a way
//   // that the command is NOT guaranteed to arrive
//   transmit(payload) {
//     // "blocking function" - writes without response specified payload to the Network Characteristics.
//     // do not read a response
//     return JAVA_TANGLE_CONNECT.transmit(payload);
//   }

//   // request handles the requests on the Tangle network. The command request
//   // is guaranteed to get a response
//   request(payload, read_response = true) {
//     // "blocking function" - writes with response specified payload to the Device Characteristics.
//     // and right after it reads the response from it. The response is then returned.
//     return JAVA_TANGLE_CONNECT.request(payload, read_response);
//   }

//   // synchronizes the device internal clock with the provided TimeTrack clock
//   // of the application as precisely as possible
//   setClock(clock) {
//     return new Promise(async (resolve, reject) => {
//       for (let index = 0; index < 3; index++) {
//         await sleep(1000);
//         try {
//           // tryes to ASAP write a timestamp to the clock characteristics.
//           // if the ASAP write fails, then try it once more
//           await JAVA_TANGLE_CONNECT.writeClock(clock.millis());
//           console.log("Clock write success");
//           resolve();
//           return;
//         } catch (e) {
//           console.warn("Clock write failed");
//         }
//       }

//       reject("Clock write failed");
//       return;
//     });
//   }

//   // returns a TimeTrack clock object that is synchronized with the internal clock
//   // of the device as precisely as possible
//   getClock() {
//     return new Promise(async (resolve, reject) => {
//       for (let index = 0; index < 3; index++) {
//         await sleep(1000);
//         try {
//           // tryes to ASAP read a timestamp from the clock characteristics.
//           // if the ASAP read fails, then try it once more
//           const timestamp = await JAVA_TANGLE_CONNECT.readClock();
//           console.log("Clock read success:", timestamp);
//           resolve(new TimeTrack(timestamp));
//           return;
//         } catch (e) {
//           console.warn("Clock read failed:", e);
//         }
//       }

//       reject("Clock read failed");
//       return;
//     });
//   }

//   // handles the firmware updating. Sends "ota" events
//   // to all handlers
//   updateFW(firmware) {
//     return JAVA_TANGLE_CONNECT.updateFirmware(firmware);
//   }

//   destroy() {
//     //this.#interfaceReference = null; // dont know if I need to destroy this reference.. But I guess I dont need to?
//     return this.disconnect()
//       .catch(() => {})
//       .then(() => {
//         return this.unselect();
//       })
//       .catch(() => {});
//   }
// }



import { sleep } from "./functions.js";
import { TimeTrack } from "./TimeTrack.js";

/////////////////////////////////////////////////////////////////////////////////////

// Connector connects the application with one Tangle Device, that is then in a
// position of a controller for other Tangle Devices
export class TangleConnectConnector {
  #interfaceReference;
  #selected;
  #connected;

  constructor(interfaceReference) {
    this.#interfaceReference = interfaceReference;

    this.#selected = true;
    this.#connected = true;
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
  // all Devices that are named "NARA Aplha", are on 0.7.2 fw and are
  // adopted by the owner with "baf2398ff5e6a7b8c9d097d54a9f865f" signature.
  // Product code is 1 what means NARA Alpha
  {
    name:"NARA Alpha" 
    fwVersion:"0.7.2"
    ownerSignature:"baf2398ff5e6a7b8c9d097d54a9f865f"
    productCode:1
  },
  // all the devices with the name starting with "NARA", without the 0.7.3 FW and 
  // that are not adopted by anyone
  // Product code is 2 what means NARA Beta 
  {
    namePrefix:"NARA"
    fwVersion:"!0.7.3"
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
    // this.#selected = true;
    // //console.log("choose()");
    // return Promise.resolve();

    console.log("TC.js userSelect()");

    const criteria_string = JSON.stringify(criteria);

    console.log(`JS->TC userSelect(${criteria_string})`);
    window.tangleConnect.userSelect(criteria_string);
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

    // this.#selected = true;
    // return Promise.resolve();

    console.log("TC.js autoSelect()");

    return this.userSelect(criteria);
  }

  selected() {
    return Promise.resolve(this.#selected ? { fwVersion: "unknown" } : null);
  }

  unselect() {
    //this.#selected = false;
    return Promise.resolve();
  }

  connect(attempts) {
    console.log("TC.js connect()");

    let criteria = { ownerSignature: "00000000000000000000000000000000" };
    return this.userSelect(criteria);

    // if (this.#selected) {
    //   this.#connected = true;
    //   this.#interfaceReference.emit("#connected");
    //   return Promise.resolve();
    // } else {
    //   return Promise.reject("NotSelected");
    // }
  }

  connected() {
    return Promise.resolve(this.#connected);
  }

  // disconnect Connector from the connected Tangle Device. But keep it selected
  disconnect() {
    if (this.#selected) {
      this.#connected = false;
      this.#interfaceReference.emit("#disconnected");
      return Promise.resolve();
    } 
    // else {
    //   return Promise.reject("NotSelected");
    // }
  }

  // deliver handles the communication with the Tangle network in a way
  // that the command is guaranteed to arrive
  deliver(payload) {
    if (this.#connected) {
      return Promise.resolve();
    } else {
      return Promise.reject("Disconnected");
    }
  }

  // transmit handles the communication with the Tangle network in a way
  // that the command is NOT guaranteed to arrive
  transmit(payload) {
    if (this.#connected) {
      return Promise.resolve();
    } else {
      return Promise.reject("Disconnected");
    }
  }

  // request handles the requests on the Tangle network. The command request
  // is guaranteed to get a response
  request(payload, read_response = true) {
    if (this.#connected) {
      return Promise.resolve([]);
    } else {
      return Promise.reject("Disconnected");
    }
  }

  // synchronizes the device internal clock with the provided TimeTrack clock
  // of the application as precisely as possible
  setClock(clock) {
    if (this.#connected) {
      return Promise.resolve();
    } else {
      return Promise.reject("Disconnected");
    }
  }

  // returns a TimeTrack clock object that is synchronized with the internal clock
  // of the device as precisely as possible
  getClock() {
    if (this.#connected) {
      return Promise.resolve(new TimeTrack(0));
    } else {
      return Promise.reject("Disconnected");
    }
  }

  // handles the firmware updating. Sends "ota" events
  // to all handlers
  updateFW(firmware) {
    return new Promise(async (resolve, reject) => {
      if (!this.#connected) {
        reject("Disconnected");
        return;
      }

      this.#interfaceReference.emit("ota_status", "begin");

      await sleep(1000);

      for (let percentage = 1; percentage <= 100; percentage++) {
        this.#interfaceReference.emit("ota_progress", percentage);

        await sleep(50);

        if (!this.#connected) {
          this.#interfaceReference.emit("ota_status", "fail");
          reject("Connection Failure");
          return;
        }

        if (Math.random() <= 0.01) {
          this.#interfaceReference.emit("ota_status", "fail");
          reject("Simulated Failure");
          return;
        }
      }

      await sleep(1000);

      this.#interfaceReference.emit("ota_status", "success");

      resolve();
      return;
    });
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
