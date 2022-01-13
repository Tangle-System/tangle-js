import { colorToBytes, createNanoEvents, detectBluefy, hexStringToUint8Array, labelToBytes, numberToBytes, percentageToBytes, sleep, stringToBytes } from "./functions.js";
import { DEVICE_FLAGS, NETWORK_FLAGS, TangleInterface } from "./TangleInterface.js";
import { TnglCodeParser } from "./TangleParser.js";
import { TimeTrack } from "./TimeTrack.js";
import "./TnglReader.js";
import { TnglReader } from "./TnglReader.js";
import "./TnglWriter.js";

/////////////////////////////////////////////////////////////////////////

const bluefy_obechcavka_criteria = [
  { namePrefix: "A" },
  { namePrefix: "a" },
  { namePrefix: "B" },
  { namePrefix: "b" },
  { namePrefix: "C" },
  { namePrefix: "c" },
  { namePrefix: "D" },
  { namePrefix: "d" },
  { namePrefix: "E" },
  { namePrefix: "e" },
  { namePrefix: "F" },
  { namePrefix: "f" },
  { namePrefix: "G" },
  { namePrefix: "g" },
  { namePrefix: "H" },
  { namePrefix: "h" },
  { namePrefix: "I" },
  { namePrefix: "i" },
  { namePrefix: "J" },
  { namePrefix: "j" },
  { namePrefix: "K" },
  { namePrefix: "k" },
  { namePrefix: "L" },
  { namePrefix: "l" },
  { namePrefix: "M" },
  { namePrefix: "m" },
  { namePrefix: "N" },
  { namePrefix: "n" },
  { namePrefix: "O" },
  { namePrefix: "o" },
  { namePrefix: "P" },
  { namePrefix: "p" },
  { namePrefix: "Q" },
  { namePrefix: "q" },
  { namePrefix: "R" },
  { namePrefix: "r" },
  { namePrefix: "S" },
  { namePrefix: "s" },
  { namePrefix: "T" },
  { namePrefix: "t" },
  { namePrefix: "U" },
  { namePrefix: "u" },
  { namePrefix: "V" },
  { namePrefix: "v" },
  { namePrefix: "W" },
  { namePrefix: "w" },
  { namePrefix: "X" },
  { namePrefix: "x" },
  { namePrefix: "Y" },
  { namePrefix: "y" },
  { namePrefix: "Z" },
  { namePrefix: "z" }
];

/////////////////////////////////////////////////////////////////////////

// should not create more than one object!
// the destruction of the TangleDevice is not well implemented

export class TangleDevice {
  #uuidCounter;
  #ownerSignature;
  #ownerKey;

  constructor(connectorType = "default") {
    this.timeline = new TimeTrack();

    this.#uuidCounter = 0;

    this.#ownerSignature = null;
    this.#ownerKey = null;

    this.interface = new TangleInterface(this);
    if (connectorType != "dummy") {
      this.interface.assignConnector(connectorType);
    }

    this.interface.on("#reconnected", e => {
      this.#onReconnected(e);
    });
  }

  setOwnerSignature(ownerSignature) {
    if (ownerSignature.length != 32) {
      throw "InvalidSignature";
    }

    const reg = ownerSignature.match(/[\dabcdefABCDEF]{32}/);

    if (!reg[0]) {
      throw "InvalidSignature";
    }

    this.interface.unselect().finally(() => {
      this.#ownerSignature = ownerSignature;
    });
  }

  /**
   * @alias this.setOwnerSignature
   */
  assignOwnerSignature(ownerSignature) {
    return this.setOwnerSignature(ownerSignature);
  }

  getOwnerSignature() {
    return this.#ownerSignature;
  }

  setOwnerKey(ownerKey) {
    if (ownerKey.length != 32) {
      throw "InvalidKey";
    }

    const reg = ownerKey.match(/[\dabcdefABCDEF]{32}/);

    if (!reg[0]) {
      throw "InvalidKey";
    }

    this.interface.unselect().finally(() => {
      this.#ownerKey = reg[0];
    });
  }

  /**
   * @alias this.setOwnerKey
   */
  assignOwnerKey(ownerKey) {
    return this.setOwnerKey(ownerKey);
  }

  getOwnerKey() {
    return this.#ownerKey;
  }

  assignConnector(connector_type) {
    this.interface.assignConnector(connector_type);
  }

  // valid UUIDs are in range [1..4294967295]
  #getUUID() {
    if (this.#uuidCounter >= 4294967295) {
      this.#uuidCounter = 0;
    }

    return ++this.#uuidCounter;
  }

  /**
   * @name addEventListener
   * @param {string} event
   * @param {Function} callback
   *
   * events: "disconnected", "connected"
   *
   * all events: event.target === the sender object (TangleWebBluetoothConnector)
   * event "disconnected": event.reason has a string with a disconnect reason
   *
   * @returns {Function} unbind function
   */

  addEventListener(event, callback) {
    return this.interface.addEventListener(event, callback);
  }
  /**
   * @alias this.addEventListener
   */
  on(event, callback) {
    return this.interface.on(event, callback);
  }

  // každé tangle zařízení může být spárováno pouze s jedním účtem. (jednim user_key)
  // jakmile je sparovana, pak ji nelze prepsat novým učtem.
  // filtr pro pripojovani k zarizeni je pak účet.

  // adopt != pair
  // adopt reprezentuje proces, kdy si webovka osvoji nove zarizeni. Tohle zarizeni, ale uz
  // muze byt spárováno s telefonem / TangleConnectem

  // pri adoptovani MUSI byt vsechny zarizeni ze skupiny zapnuty.
  // vsechny zarizeni totiz MUSI vedet o vsech.
  // adopt() {
  // const BLE_OPTIONS = {
  //   //acceptAllDevices: true,
  //   filters: [
  //     { services: [this.TRANSMITTER_SERVICE_UUID] },
  //     // {services: ['c48e6067-5295-48d3-8d5c-0395f61792b1']},
  //     // {name: 'ExampleName'},
  //   ],
  //   //optionalServices: [this.TRANSMITTER_SERVICE_UUID],
  // };
  // //
  // return this.connector
  //   .adopt(BLE_OPTIONS).then((device)=> {
  //     // ulozit device do local storage jako json
  //   })
  //   .catch((error) => {
  //     console.warn(error);
  //   });
  // }

  adopt(newDeviceName, newDeviceId, tnglCode) {
    const criteria = /** @type {any} */ (detectBluefy() ? bluefy_obechcavka_criteria : [{ adoptionFlag: true }, { legacy: true }]);

    return this.interface
      .userSelect(criteria, 60000)
      .then(() => {
        return this.interface.connect(10000);
      })
      .then(() => {
        const owner_signature_bytes = hexStringToUint8Array(this.#ownerSignature, 16);
        const owner_key_bytes = hexStringToUint8Array(this.#ownerKey, 16);
        const device_name_bytes = stringToBytes(newDeviceName, 16);
        const device_id = newDeviceId;

        const request_uuid = this.#getUUID();
        const bytes = [DEVICE_FLAGS.FLAG_ADOPT_REQUEST, ...numberToBytes(request_uuid, 4), ...owner_signature_bytes, ...owner_key_bytes, ...device_name_bytes, ...numberToBytes(device_id, 1)];

        console.log("> Adopting device...");

        console.log(bytes);

        return this.interface
          .request(bytes, true)
          .then(response => {
            let reader = new TnglReader(response);

            console.log("> Got response:", response);

            if (reader.readFlag() !== DEVICE_FLAGS.FLAG_ADOPT_RESPONSE) {
              throw "InvalidResponse";
            }

            const response_uuid = reader.readUint32();

            if (response_uuid != request_uuid) {
              throw "InvalidResponse";
            }

            const error_code = reader.readUint8();
            const device_mac_bytes = error_code === 0 ? reader.readBytes(6) : [0, 0, 0, 0, 0, 0];

            const device_mac = Array.from(device_mac_bytes, function (byte) {
              return ("0" + (byte & 0xff).toString(16)).slice(-2);
            }).join(":");

            console.log(`error_code=${error_code}, device_mac=${device_mac}`);

            if (error_code === 0) {
              return (tnglCode ? this.writeTngl(tnglCode) : Promise.resolve())
                .then(() => {
                  return sleep(1000).then(() => {
                    this.interface.disconnect();
                  });
                })
                .then(() => {
                  return this.interface.connect(10000);
                })
                .then(() => {
                  return this.requestTimeline().catch(e => {
                    console.error("Timeline request failed.", e);
                  });
                })
                .then(() => {
                  return { mac: device_mac, ownerSignature: this.#ownerSignature, ownerKey: this.#ownerKey, name: newDeviceName, id: newDeviceId };
                })
                .catch(e => {
                  console.error(e);
                  throw "AdoptionFailed";
                });
            } else {
              console.warn("Adoption refused.");
              throw "AdoptionRefused";
            }
          })
          .catch(e => {
            console.error(e);
            throw "AdoptionFailed";
          });
      });
  }

  // devices: [ {name:"Lampa 1", mac:"12:34:56:78:9a:bc"}, {name:"Lampa 2", mac:"12:34:56:78:9a:bc"} ]

  connect(devices) {
    let criteria = /** @type {any} */ (detectBluefy() ? [] : [{ ownerSignature: this.#ownerSignature }]);

    if (devices !== null && devices.length > 0) {
      criteria = [];

      for (let i = 0; i < devices.length; i++) {
        let criterium = detectBluefy() ? {} : { ownerSignature: this.#ownerSignature };

        if (devices[i].name !== null) {
          criterium.name = devices[i].name;
        }

        if (devices[i].mac !== null) {
          criterium.mac = devices[i].mac;
        }

        criteria.push(criterium);
      }
    }

    return this.interface
      .autoSelect(criteria)
      .then(() => {
        return this.interface.connect(10000);
      })
      .then(() => {
        return this.requestTimeline().catch(e => {
          console.error("Timeline request failed.", e);
        });
      });
  }

  #onReconnected(e) {
    this.requestTimeline().catch(e => {
      console.error("Timeline request after reconnection failed.", e);
    });
  }

  disconnect() {
    return this.interface.disconnect();
  }

  connected() {
    return this.interface.connected();
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  writeTngl(tngl_code) {
    //console.log("writeTngl()");

    const timeline_flags = this.timeline.paused() ? 0b00010000 : 0b00000000; // flags: [reserved,reserved,reserved,timeline_paused,reserved,reserved,reserved,reserved]
    const timeline_payload = [NETWORK_FLAGS.FLAG_SET_TIMELINE, ...numberToBytes(this.interface.clock.millis(), 4), ...numberToBytes(this.timeline.millis(), 4), timeline_flags];
    const tngl_bytes = new TnglCodeParser().parseTnglCode(tngl_code);
    const tngl_payload = [NETWORK_FLAGS.FLAG_TNGL_BYTES, ...numberToBytes(tngl_bytes.length, 4), ...tngl_bytes];

    const payload = [...timeline_payload, ...tngl_payload];
    return this.interface.execute(payload, "TNGL").then(() => {
      // console.log("Written");
    });
  }

  // event_label example: "evt1"
  // event_value example: 1000
  emitEvent(event_label, device_id = 0xff, force_delivery = true) {
    //console.log("emitEvent()");

    const payload = [NETWORK_FLAGS.FLAG_EMIT_LAZY_EVENT, ...labelToBytes(event_label), device_id];
    return this.interface.execute(payload, force_delivery ? null : "E" + event_label + device_id);
  }

  // event_label example: "evt1"
  // event_value example: 1000
  emitTimestampEvent(event_label, event_value, device_id = 0xff, force_delivery = false) {
    console.log("emitTimestampEvent(id=" + device_id + ")");

    const payload = [NETWORK_FLAGS.FLAG_EMIT_LAZY_TIMESTAMP_EVENT, ...numberToBytes(event_value, 4), ...labelToBytes(event_label), device_id];
    return this.interface.execute(payload, force_delivery ? null : "E" + event_label + device_id);
  }

  // event_label example: "evt1"
  // event_value example: "#00aaff"
  emitColorEvent(event_label, event_value, device_id = 0xff, force_delivery = false) {
    console.log("emitColorEvent(id=" + device_id + ")");

    const payload = [NETWORK_FLAGS.FLAG_EMIT_LAZY_COLOR_EVENT, ...colorToBytes(event_value), ...labelToBytes(event_label), device_id];
    return this.interface.execute(payload, force_delivery ? null : "E" + event_label + device_id);
  }

  // event_label example: "evt1"
  // event_value example: 100.0
  // !!! PARAMETER CHANGE !!!
  emitPercentageEvent(event_label, event_value, device_id = 0xff, force_delivery = false) {
    console.log("emitColorEvent(id=" + device_id + ")");

    const payload = [NETWORK_FLAGS.FLAG_EMIT_LAZY_PERCENTAGE_EVENT, ...percentageToBytes(event_value), ...labelToBytes(event_label), device_id];
    return this.interface.execute(payload, force_delivery ? null : "E" + event_label + device_id);
  }

  // event_label example: "evt1"
  // event_value example: "label"
  // !!! PARAMETER CHANGE !!!
  emitLabelEvent(event_label, event_value, device_id = 0xff, force_delivery = false) {
    console.log("emitLabelEvent(id=" + device_id + ")");

    const payload = [NETWORK_FLAGS.FLAG_EMIT_LAZY_LABEL_EVENT, ...labelToBytes(event_value), ...labelToBytes(event_label), device_id];
    return this.interface.execute(payload, force_delivery ? null : "E" + event_label + device_id);
  }

  // !!! PARAMETER CHANGE !!!
  syncTimeline() {
    //console.log("syncTimeline()");
    const flags = this.timeline.paused() ? 0b00010000 : 0b00000000; // flags: [reserved,reserved,reserved,timeline_paused,reserved,reserved,reserved,reserved]
    const payload = [NETWORK_FLAGS.FLAG_SET_TIMELINE, ...numberToBytes(this.interface.clock.millis(), 4), ...numberToBytes(this.timeline.millis(), 4), flags];
    return this.interface.execute(payload, "TMLN");
  }

  syncClock() {
    console.log("> Forcing sync clock...");
    return this.interface.syncClock().then(() => {
      console.log("> Device clock synchronized");
    });
  }

  updateDeviceFirmware(firmware) {
    //console.log("updateDeviceFirmware()");
    return this.interface.updateFW(firmware).then(() => {
      this.disconnect();
    });
  }

  updateNetworkFirmware(firmware) {
    return new Promise(async (resolve, reject) => {
      const chunk_size = 4976; // must be modulo 16

      let index_from = 0;
      let index_to = chunk_size;

      let written = 0;

      console.log("OTA UPDATE");
      console.log(firmware);

      try {
        this.interface.emit("ota_status", "begin");

        {
          //===========// RESET //===========//
          console.log("OTA RESET");

          const device_bytes = [DEVICE_FLAGS.FLAG_OTA_RESET, 0x00, ...numberToBytes(0x00000000, 4)];
          const network_bytes = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(device_bytes.length, 4), ...device_bytes];
          await this.interface.execute(network_bytes, null);
        }

        await sleep(100);

        {
          //===========// BEGIN //===========//
          console.log("OTA BEGIN");

          const device_bytes = [DEVICE_FLAGS.FLAG_OTA_BEGIN, 0x00, ...numberToBytes(firmware.length, 4)];
          const network_bytes = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(device_bytes.length, 4), ...device_bytes];
          await this.interface.execute(network_bytes, null);
        }

        await sleep(10000);

        {
          //===========// WRITE //===========//
          console.log("OTA WRITE");

          const start_timestamp = new Date().getTime();

          while (written < firmware.length) {
            if (index_to > firmware.length) {
              index_to = firmware.length;
            }

            const device_bytes = [DEVICE_FLAGS.FLAG_OTA_WRITE, 0x00, ...numberToBytes(written, 4), ...firmware.slice(index_from, index_to)];
            const network_bytes = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(device_bytes.length, 4), ...device_bytes];
            await this.interface.execute(network_bytes, null);

            written += index_to - index_from;

            const percentage = Math.floor((written * 10000) / firmware.length) / 100;
            console.log(percentage + "%");
            this.interface.emit("ota_progress", percentage);

            index_from += chunk_size;
            index_to = index_from + chunk_size;
          }

          console.log("Firmware written in " + (new Date().getTime() - start_timestamp) / 1000 + " seconds");
        }

        await sleep(100);

        {
          //===========// END //===========//
          console.log("OTA END");

          const device_bytes = [DEVICE_FLAGS.FLAG_OTA_END, 0x00, ...numberToBytes(written, 4)];
          const network_bytes = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(device_bytes.length, 4), ...device_bytes];
          await this.interface.execute(network_bytes, null);
        }

        await sleep(1000);

        console.log("Rebooting whole network...");

        const payload = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(1, 4), DEVICE_FLAGS.FLAG_DEVICE_REBOOT];
        await this.interface.execute(payload, false);

        this.interface.emit("ota_status", "success");
        resolve();
        return;
      } catch (e) {
        this.interface.emit("ota_status", "fail");
        reject(e);
        return;
      }
    }).then(() => {
      this.disconnect();
    });
  }

  /**
   * @param {Uint8Array} config;
   *
   *
   *
   *
   */

  updateDeviceConfig(config) {
    console.log("> Updating config...");

    const config_bytes = config;
    const config_bytes_size = config.length;

    // make config update request
    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_CONFIG_UPDATE_REQUEST, ...numberToBytes(request_uuid, 4), ...numberToBytes(config_bytes_size, 4), ...config_bytes];
    return this.interface
      .request(bytes, true)
      .then(response => {
        let reader = new TnglReader(response);

        console.log("> Got response:", response);

        if (reader.readFlag() !== DEVICE_FLAGS.FLAG_CONFIG_UPDATE_RESPONSE) {
          throw "InvalidResponse";
        }

        const response_uuid = reader.readUint32();

        if (response_uuid != request_uuid) {
          throw "InvalidResponse";
        }

        const error_code = reader.readUint8();

        console.log(`error_code=${error_code}`);

        if (error_code === 0) {
          console.log("Write Config Success");
        }
      })
      .then(() => {
        // reboot device
        const payload = [DEVICE_FLAGS.FLAG_DEVICE_REBOOT];
        return this.interface.request(payload, false);
      });
  }

  updateNetworkConfig(config) {
    console.log("> Updating config of whole network...");

    const config_bytes = config;
    const config_bytes_size = config.length;

    // make config update request
    const request_uuid = this.#getUUID();
    const request_bytes = [DEVICE_FLAGS.FLAG_CONFIG_UPDATE_REQUEST, ...numberToBytes(request_uuid, 4), ...numberToBytes(config_bytes_size, 4), ...config_bytes];
    const payload_bytes = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(request_bytes.length, 4), ...request_bytes];

    return this.interface.execute(payload_bytes, "CONF").then(() => {
      console.log("> Rebooting network...");
      const payload = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(1, 4), DEVICE_FLAGS.FLAG_DEVICE_REBOOT];
      return this.interface.execute(payload, false);
    });
  }

  requestTimeline() {
    console.log("> Requesting timeline...");

    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_TIMELINE_REQUEST, ...numberToBytes(request_uuid, 4)];

    return this.interface.request(bytes, true).then(response => {
      let reader = new TnglReader(response);

      console.log("> Got response:", response);

      if (reader.readFlag() !== DEVICE_FLAGS.FLAG_TIMELINE_RESPONSE) {
        throw "InvalidResponseFlag";
      }

      const response_uuid = reader.readUint32();

      if (response_uuid != request_uuid) {
        throw "InvalidResponseUuid";
      }

      const clock_timestamp = reader.readInt32();
      const timeline_timestamp = reader.readInt32();
      const timeline_paused = reader.readUint8();

      console.log(`clock_timestamp=${clock_timestamp}, timeline_timestamp=${timeline_timestamp}, timeline_paused=${timeline_paused}`);

      if (timeline_paused) {
        this.timeline.setState(timeline_timestamp, true);
      } else {
        this.timeline.setState(timeline_timestamp + (this.interface.clock.millis() - clock_timestamp), false);
      }
    });
  }

  reboot() {
    console.log("> Rebooting network...");

    const payload = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(1, 4), DEVICE_FLAGS.FLAG_DEVICE_REBOOT];
    return this.interface.execute(payload, false);
  }

  // setDeviceId(id) {
  //   console.log("> Rebooting network...");

  //   const payload = [NETWORK_FLAGS.FLAG_DEVICE_ID, id];
  //   return this.connector.request(payload);
  // }
}
