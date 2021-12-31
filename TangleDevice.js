import { colorToBytes, createNanoEvents, detectBluefy, hexStringToUint8Array, labelToBytes, numberToBytes, percentageToBytes, sleep, stringToBytes } from "./functions.js";
import { DEVICE_FLAGS, NETWORK_FLAGS, TangleInterface } from "./TangleInterface.js";
import { TnglCodeParser } from "./TangleParser.js";
import { TimeTrack } from "./TimeTrack.js";
import "./TnglReader.js";
import { TnglReader } from "./TnglReader.js";
import "./TnglWriter.js";

/////////////////////////////////////////////////////////////////////////

// should not create more than one object!
// the destruction of the TangleDevice is not well implemented

export class TangleDevice {
  #eventEmitter;
  #uuidCounter;
  #ownerSignature;
  #ownerKey;

  constructor() {
    this.clock = new TimeTrack();
    this.timeline = new TimeTrack();

    this.#uuidCounter = 0;

    this.#eventEmitter = createNanoEvents();
    this.#ownerSignature = null;
    this.#ownerKey = null;

    this.interface = new TangleInterface(this);

    this.#eventEmitter.on("#disconnected", e => {
      this.#onDisconnected(e);
    });
    this.#eventEmitter.on("#connected", e => {
      this.#onConnected(e);
    });

    // auto clock sync loop
    // how to get rid of it on TangleDevice object destruction ????
    setInterval(() => {
      if (this.connected()) {
        this.syncClock().catch(error => {
          console.warn(error);
        });
      }
    }, 60000);
  }

  assignOwnerSignature(ownerSignature) {
    this.interface.unselect().finally(() => {
      this.#ownerSignature = ownerSignature;
    });
  }

  assignOwnerKey(ownerKey) {
    this.interface.unselect().finally(() => {
      this.#ownerKey = ownerKey;
    });
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
    return this.#eventEmitter.on(event, callback);
  }
  /**
   * @alias this.addEventListener
   */
  on(event, callback) {
    return this.#eventEmitter.on(event, callback);
  }

  emit(event, ...args) {
    this.#eventEmitter.emit(event, ...args);
  }

  #onDisconnected = event => {
    console.log("> Bluetooth Device disconnected");
    return this.#eventEmitter.emit("disconnected", { target: this });
  };

  #onConnected = event => {
    return event.target
      .getClock()
      .then(clock => {
        this.clock = clock;
        return this.requestTimeline();
      })
      .then(() => {
        console.log("> Bluetooth Device connected");
        return this.#eventEmitter.emit("connected", { target: this });
      })
      .catch(error => {
        console.warn(error);
      });
  };

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
    const criteria = detectBluefy() ? [{ name: "NARA Alpha" }] : [{ adoptionFlag: true }]; // Bluefy workaroud

    return this.interface
      .userSelect(criteria)
      .then(() => {
        return this.interface.connect(3);
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

        return this.interface.request(bytes, true).then(response => {
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
          const device_mac = error_code === 0 ? reader.readBytes(6) : [0, 0, 0, 0, 0, 0];

          console.log(`error_code=${error_code}, device_mac=${device_mac}`);

          if (error_code === 0) {
            return (tnglCode ? this.writeTngl(tnglCode) : Promise.resolve())
              .then(() => {
                return this.interface.disconnect();
              })
              .then(() => {
                return this.interface.connect(3);
              })
              .then(() => {
                return { mac: device_mac };
              });
          } else {
            console.warn("Adoption failed.");
            throw "AdoptionRefused";
          }
        });
      });
  }

  connect() {
    const criteria = [{ ownerSignature: this.#ownerSignature }]; //, { ownerSignature: "00000000000000000000000000000000" }

    return this.interface.autoSelect(criteria).then(() => {
      this.interface.connect(3);
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
    const timeline_payload = [NETWORK_FLAGS.FLAG_SET_TIMELINE, ...numberToBytes(this.clock.millis(), 4), ...numberToBytes(this.timeline.millis(), 4), timeline_flags];
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
    //console.log("emitTimestampEvent()");

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
    //console.log("emitPercentageEvent()");

    const payload = [NETWORK_FLAGS.FLAG_EMIT_LAZY_PERCENTAGE_EVENT, ...percentageToBytes(event_value), ...labelToBytes(event_label), device_id];
    return this.interface.execute(payload, force_delivery ? null : "E" + event_label + device_id);
  }

  // event_label example: "evt1"
  // event_value example: "label"
  // !!! PARAMETER CHANGE !!!
  emitLabelEvent(event_label, event_value, device_id = 0xff, force_delivery = false) {
    //console.log("emitLabelEvent()");

    const payload = [NETWORK_FLAGS.FLAG_EMIT_LAZY_LABEL_EVENT, ...labelToBytes(event_value), ...labelToBytes(event_label), device_id];
    return this.interface.execute(payload, force_delivery ? null : "E" + event_label + device_id);
  }

  // !!! PARAMETER CHANGE !!!
  syncTimeline() {
    //console.log("syncTimeline()");
    const flags = this.timeline.paused() ? 0b00010000 : 0b00000000; // flags: [reserved,reserved,reserved,timeline_paused,reserved,reserved,reserved,reserved]
    const payload = [NETWORK_FLAGS.FLAG_SET_TIMELINE, ...numberToBytes(this.clock.millis(), 4), ...numberToBytes(this.timeline.millis(), 4), flags];
    return this.interface.execute(payload, "TMLN");
  }

  // syncClock() {
  //   //console.log("syncClock()");
  //   return this.connector.setClock(this.clock);
  // };

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
        this.#eventEmitter.emit("ota_status", "begin");

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
            this.#eventEmitter.emit("ota_progress", percentage);

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

        this.#eventEmitter.emit("ota_status", "success");
        resolve();
        return;
      } catch (e) {
        this.#eventEmitter.emit("ota_status", "fail");
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
        throw "InvalidResponse";
      }

      const response_uuid = reader.readUint32();

      if (response_uuid != request_uuid) {
        throw "InvalidResponse";
      }

      const clock_timestamp = reader.readInt32();
      const timeline_timestamp = reader.readInt32();
      const timeline_paused = reader.readUint8();

      console.log(`clock_timestamp=${clock_timestamp}, timeline_timestamp=${timeline_timestamp}, timeline_paused=${timeline_paused}`);

      if (timeline_paused) {
        this.timeline.setState(timeline_timestamp, true);
      } else {
        this.timeline.setState(timeline_timestamp + (this.clock.millis() - clock_timestamp), false);
      }
    });
  }

  syncClock() {
    console.log("> Setting current clock...");

    return this.interface.setClock(this.clock).then(() => {
      console.log("> Device clock synchronized");
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
