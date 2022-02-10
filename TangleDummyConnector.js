import { sleep } from "./functions.js";
import { TimeTrack } from "./TimeTrack.js";
import { DEVICE_FLAGS } from "./TangleInterface.js";
import { TnglReader } from "./TnglReader.js";
import { TnglWriter } from "./TnglWriter.js";

/////////////////////////////////////////////////////////////////////////////////////

// Connector connects the application with one Tangle Device, that is then in a
// position of a controller for other Tangle Devices
export class TangleDummyConnector {
  #interfaceReference;
  #selected;
  #connected;

  constructor(interfaceReference) {
    this.#interfaceReference = interfaceReference;

    this.#selected = false;
    this.#connected = false;
  }

  #fail(chance) {
    //return Math.random() < chance;
    return false; // deactivate fail function
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
    console.log(`userSelect(criteria=${criteria}`);

    return new Promise(async (resolve, reject) => {
      if (this.#connected) {
        await this.disconnect();
      }
      await sleep(Math.random() * 1000); // userSelect logic
      if (this.#fail(0.25)) {
        reject("UserCanceledSelection");
        return;
      }
      if (this.#fail(0.1)) {
        reject("SelectionFailed");
        return;
      }
      this.#selected = true;
      resolve('{"connector":"dummy"}');
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
    console.log(`autoSelect(criteria=${criteria}, scan_period=${scan_period}, timeout=${timeout})`);
    // step 1. for the scan_period scan the surroundings for BLE devices.
    // step 2. if some devices matching the criteria are found, then select the one with
    //         the greatest signal strength. If no device is found until the timeout,
    //         then return error

    return new Promise(async (resolve, reject) => {
      if (this.#connected) {
        await this.disconnect();
      }
      await sleep(Math.random() * 1000); // autoSelect logic
      if (this.#fail(0.1)) {
        reject("SelectionFailed");
        return;
      }
      this.#selected = true;
      resolve('{"connector":"dummy"}');
    });
  }

  selected() {
    console.log(`selected()`);

    return new Promise(async (resolve, reject) => {
      if (this.#selected) {
        resolve('{"connector":"dummy"}');
      } else {
        resolve();
      }
    });
  }

  unselect() {
    console.log(`unselect()`);

    return new Promise(async (resolve, reject) => {
      if (this.#connected) {
        await this.disconnect();
      }
      await sleep(10); // unselect logic
      this.#selected = false;
      resolve();
    });
  }

  connect(timeout) {
    console.log(`connect(timeout=${timeout})`);

    return new Promise(async (resolve, reject) => {
      if (!this.#selected) {
        reject("DeviceNotSelected");
        return;
      }
      await sleep(Math.random() * 1000); // connecting logic
      if (this.#fail(0.1)) {
        reject("ConnectionFailed");
        return;
      }
      this.#connected = true;
      this.#interfaceReference.emit("#connected");
      resolve('{"connector":"dummy"}');

      /**  
        // after connection the connector can any time emit #disconnect event.
        setTimeout(() => {
                    this.#interfaceReference.emit("#disconnected");
          //}, Math.random() * 60000);
        }, 60000);
      */
    });
  }

  // disconnect Connector from the connected Tangle Device. But keep it selected
  disconnect() {
    console.log(`disconnect()`);

    return new Promise(async (resolve, reject) => {
      if (this.#connected) {
        await sleep(100); // disconnecting logic
        this.#connected = false;
        this.#interfaceReference.emit("#disconnected");
      }
      resolve(); // always resolves even if there are internal errors
    });
  }

  connected() {
    console.log(`connected()`);

    return new Promise(async (resolve, reject) => {
      if (this.#connected) {
        resolve('{"connector":"dummy"}');
      } else {
        resolve();
      }
    });
  }

  // deliver handles the communication with the Tangle network in a way
  // that the command is guaranteed to arrive
  deliver(payload) {
    console.log(`deliver(payload=${payload})`);

    return new Promise(async (resolve, reject) => {
      if (!this.#connected) {
        reject("DeviceNotConnected");
        return;
      }
      await sleep(25); // delivering logic
      if (this.#fail(0.1)) {
        reject("DeliverFailed");
        return;
      }
      resolve();
    });
  }

  // transmit handles the communication with the Tangle network in a way
  // that the command is NOT guaranteed to arrive
  transmit(payload) {
    console.log(`transmit(payload=${payload})`);

    return new Promise(async (resolve, reject) => {
      if (!this.#connected) {
        reject("DeviceNotConnected");
        return;
      }
      await sleep(10); // transmiting logic
      if (this.#fail(0.1)) {
        reject("TransmitFailed");
        return;
      }
      resolve();
    });
  }

  // request handles the requests on the Tangle network. The command request
  // is guaranteed to get a response
  request(payload, read_response = true) {
    console.log(`request(payload=${payload}, read_response=${read_response ? "true" : "false"})`);

    const ERROR_CODE_SUCCESS = 0;
    const DUMMY_MACS = [0x111111111111, 0x222222222222, 0x333333333333, 0x444444444444, 0x555555555555, 0x666666666666, 0x777777777777, 0x888888888888];

    return new Promise(async (resolve, reject) => {
      if (!this.#connected) {
        reject("DeviceNotConnected");
        return;
      }
      await sleep(50); // requesting logic
      if (this.#fail(0.1)) {
        reject("RequestFailed");
        return;
      }

      let reader = new TnglReader(new DataView(new Uint8Array(payload).buffer));

      switch (reader.peekFlag()) {
        case DEVICE_FLAGS.FLAG_ADOPT_REQUEST:
          {
            reader.readFlag(); // DEVICE_FLAGS.FLAG_ADOPT_REQUEST

            const request_uuid = reader.readUint32();

            // const uint8_t* const owner_signature = confBytes.readBytes(16);
            // // log_d("owner_signature=%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x", owner_signature[0], owner_signature[1], owner_signature[2], owner_signature[3], owner_signature[4], owner_signature[5], owner_signature[6], owner_signature[7], owner_signature[8], owner_signature[9], owner_signature[10], owner_signature[11], owner_signature[12], owner_signature[13], owner_signature[14], owner_signature[15]);

            // const uint8_t* const owner_key = confBytes.readBytes(16);
            // // log_d("owner_key=%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x", owner_key[0], owner_key[1], owner_key[2], owner_key[3], owner_key[4], owner_key[5], owner_key[6], owner_key[7], owner_key[8], owner_key[9], owner_key[10], owner_key[11], owner_key[12], owner_key[13], owner_key[14], owner_key[15]);

            // char device_name[17];
            // confBytes.readString(device_name, 16);
            // // log_d("device_name=%s", device_name);

            // const uint8_t device_id = confBytes.read<uint8_t>();
            // // log_d("device_id=%u", device_id);

            let error_code = ERROR_CODE_SUCCESS;

            // // log_d("error_code=%u", error_code);

            let writer = new TnglWriter(64);
            writer.writeFlag(DEVICE_FLAGS.FLAG_ADOPT_RESPONSE);
            writer.writeUint32(request_uuid);
            writer.writeUint8(error_code);

            if (error_code == ERROR_CODE_SUCCESS) {
              writer.writeValue(DUMMY_MACS[Math.floor(Math.random() * DUMMY_MACS.length)], 6);
            }

            resolve(writer.bytes);
          }
          break;

        case DEVICE_FLAGS.FLAG_CONFIG_UPDATE_REQUEST:
          {
            // log_d("FLAG_CONFIG_UPDATE_REQUEST");
            reader.readFlag(); // DEVICE_FLAGS.FLAG_CONFIG_UPDATE_REQUEST

            const request_uuid = reader.readUint32();
            // const uint32_t config_size = confBytes.read<uint32_t>();
            // const uint8_t* const config_bytes = confBytes.readBytes(config_size);

            let error_code = ERROR_CODE_SUCCESS;

            // {
            //     if (!unit::writeConfig(config_bytes, config_size)) {
            //         error_code = DeviceErrorCode::CONFIG_UPDATE_FAIL;
            //     }
            // }

            // log_d("error_code=%u", error_code);

            let writer = new TnglWriter(64);
            writer.writeFlag(DEVICE_FLAGS.FLAG_CONFIG_UPDATE_RESPONSE);
            writer.writeUint32(request_uuid);
            writer.writeUint8(error_code);

            resolve(writer.bytes);
          }
          break;

        case DEVICE_FLAGS.FLAG_TIMELINE_REQUEST:
          {
            reader.readFlag(); // DEVICE_FLAGS.FLAG_TIMELINE_REQUEST

            const request_uuid = reader.readUint32();
            // const time_ms clock_timestamp = Runtime::getClock().millis();
            // const time_ms timeline_timestamp = Runtime::getTimeline().millis();
            // const bool timeline_paused = Runtime::getTimeline().paused();

            // // log_d("request_uuid = %u", request_uuid);
            // // log_d("clock_timestamp = %" PRITIMEMS " ms", clock_timestamp);
            // // log_d("timeline_timestamp = %" PRITIMEMS " ms", timeline_timestamp);
            // // log_d("timeline_paused = %s", timeline_paused ? "true" : "false");

            let writer = new TnglWriter(64);
            writer.writeFlag(DEVICE_FLAGS.FLAG_TIMELINE_RESPONSE);
            writer.writeUint32(request_uuid);
            writer.writeInt32(0); // clock_timestamp
            writer.writeInt32(0); //timeline_timestamp
            writer.writeUint8(0b00000000); // flags

            resolve(writer.bytes);
          }
          break;

        case DEVICE_FLAGS.FLAG_TNGL_FINGERPRINT_REQUEST:
          {
            // log_d("FLAG_TNGL_FINGERPRINT_REQUEST");

            reader.readFlag(); // FLAG_TNGL_FINGERPRINT_REQUEST

            const request_uuid = reader.readUint32();

            let error_code = ERROR_CODE_SUCCESS;

            // uint8_t fingerprint[32];

            // if (!tangle::getTnglFingerprint(fingerprint)) {
            //     error_code = DeviceErrorCode::NO_TNGL_CODE_STORED;
            // }

            // log_d("error_code=%u", error_code);

            let writer = new TnglWriter(64);
            writer.writeFlag(DEVICE_FLAGS.FLAG_TNGL_FINGERPRINT_RESPONSE);
            writer.writeUint32(request_uuid);
            writer.writeUint8(error_code);

            if (error_code == ERROR_CODE_SUCCESS) {
              writer.writeBytes(
                new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
                32,
              );
            }

            resolve(writer.bytes);
          }
          break;

        case DEVICE_FLAGS.FLAG_ERASE_OWNER_REQUEST:
          {
            // log_d("FLAG_ERASE_OWNER_REQUEST");
            reader.readFlag(); // FLAG_ERASE_OWNER_REQUEST

            const request_uuid = reader.readUint32();

            let error_code = ERROR_CODE_SUCCESS;

            // if (unit::eraseOwner()) {
            //     bluetooth::rebootOnDisconnect(true);
            // } else {
            //     error_code = DeviceErrorCode::FAILED_TO_ERASE_OWNER;
            // }

            // log_d("error_code=%u", error_code);

            let writer = new TnglWriter(64);
            writer.writeFlag(DEVICE_FLAGS.FLAG_ERASE_OWNER_RESPONSE);
            writer.writeUint32(request_uuid);
            writer.writeUint8(error_code);

            resolve(writer.bytes);
          }
          break;

        case DEVICE_FLAGS.FLAG_FW_VERSION_REQUEST:
          {
            // log_d("FLAG_FW_VERSION_REQUEST");
            reader.readFlag(); // FLAG_FW_VERSION_REQUEST

            const request_uuid = reader.readUint32();

            let error_code = ERROR_CODE_SUCCESS;

            // log_d("error_code=%u", error_code);

            let writer = new TnglWriter(64);
            writer.writeFlag(DEVICE_FLAGS.FLAG_FW_VERSION_RESPONSE);
            writer.writeUint32(request_uuid);
            writer.writeUint8(error_code);

            writer.writeString("DUMMY_0.0.0_00000000", 32);

            resolve(writer.bytes);
          }
          break;

        default: {
          resolve([]);
        }
      }
    });
  }

  // synchronizes the device internal clock with the provided TimeTrack clock
  // of the application as precisely as possible
  setClock(clock) {
    console.log(`setClock(clock.millis()=${clock.millis()})`);

    return new Promise(async (resolve, reject) => {
      if (!this.#connected) {
        reject("DeviceNotConnected");
        return;
      }
      await sleep(10); // writing clock logic.
      if (this.#fail(0.1)) {
        reject("ClockWriteFailed");
        return;
      }
      resolve();
    });
  }

  // returns a TimeTrack clock object that is synchronized with the internal clock
  // of the device as precisely as possible
  getClock() {
    console.log(`getClock()`);

    return new Promise(async (resolve, reject) => {
      if (!this.#connected) {
        reject("DeviceNotConnected");
        return;
      }
      await sleep(50); // reading clock logic.
      if (this.#fail(0.1)) {
        reject("ClockReadFailed");
        return;
      }

      resolve(new TimeTrack(0));
    });
  }

  // handles the firmware updating. Sends "ota" events
  // to all handlers
  updateFW(firmware) {
    console.log(`updateFW(firmware=${firmware})`);

    return new Promise(async (resolve, reject) => {
      if (!this.#connected) {
        reject("DeviceNotConnected");
        return;
      }
      this.#interfaceReference.emit("ota_status", "begin");
      await sleep(10000); // preparing FW logic.
      if (this.#fail(0.1)) {
        this.#interfaceReference.emit("ota_status", "fail");
        reject("UpdateFailed");
        return;
      }
      for (let i = 1; i <= 100; i++) {
        this.#interfaceReference.emit("ota_progress", i);
        await sleep(25); // writing FW logic.
        if (this.#fail(0.01)) {
          this.#interfaceReference.emit("ota_status", "fail");
          reject("UpdateFailed");
          return;
        }
      }
      await sleep(1000); // finishing FW logic.
      if (this.#fail(0.1)) {
        this.#interfaceReference.emit("ota_status", "fail");
        reject("UpdateFailed");
        return;
      }
      this.#interfaceReference.emit("ota_status", "success");
      resolve();
    });
  }

  destroy() {
    console.log(`destroy()`);

    //this.#interfaceReference = null; // dont know if I need to destroy this reference.. But I guess I dont need to?
    return this.disconnect()
      .catch(() => {})
      .then(() => {
        return this.unselect();
      })
      .catch(() => {});
  }
}
