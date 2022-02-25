import { colorToBytes, computeTnglFingerprint, czechHackyToEnglish, getClockTimestamp, hexStringToUint8Array, labelToBytes, numberToBytes, percentageToBytes, sleep, stringToBytes } from "./functions.js";
import { DEVICE_FLAGS, NETWORK_FLAGS, TangleInterface } from "./TangleInterface.js";
import { TnglCodeParser } from "./TangleParser.js";
import { TimeTrack } from "./TimeTrack.js";
import "./TnglReader.js";
import { TnglReader } from "./TnglReader.js";
import "./TnglWriter.js";
import { io } from "./socketio.js";

/////////////////////////////////////////////////////////////////////////

// should not create more than one object!
// the destruction of the TangleDevice is not well implemented

// TODO - kdyz zavolam tangleDevice.connect(), kdyz jsem pripojeny, tak nechci aby se do interfacu poslal select
// TODO - kdyz zavolam funkci connect a uz jsem pripojeny, tak vyslu event connected, pokud si myslim ze nejsem pripojeny.
// TODO - "watchdog timer" pro resolve/reject z TC

export class TangleDevice {
  #uuidCounter;
  #ownerSignature;
  #ownerKey;
  #adopting;
  #updating;
  #selected;

  #reconnectRC;

  constructor(connectorType = "default", reconnectionInterval = 1000) {
    if (!connectorType) {
      connectorType = "default";
    }

    this.timeline = new TimeTrack();

    this.#uuidCounter = Math.floor(Math.random() * 0xffffffff);

    this.#ownerSignature = null;
    this.#ownerKey = null;

    this.interface = new TangleInterface(this, reconnectionInterval);
    if (connectorType != "dummy") {
      this.interface.assignConnector(connectorType);
    }

    this.#adopting = false;
    this.#updating = false;

    this.#reconnectRC = false;

    this.interface.on("#connected", e => {
      this.#onConnected(e);
    });
    this.interface.on("#disconnected", e => {
      this.#onDisconnected(e);
    });

    // auto clock sync loop
    setInterval(() => {
      if (!this.#updating) {
        this.connected().then(connected => {
          if (connected) {
            this.syncClock().catch(error => {
              console.warn(error);
            });
          }
        });
      }
    }, 60000);
  }

  #onConnected = event => {
    if (!this.#adopting) {
      console.log("> Device connected");
      this.interface.emit("connected", { target: this });

      this.requestTimeline().catch(e => {
        console.error("Timeline request after reconnection failed.", e);
      });
    }
  };

  #onDisconnected = event => {
    if (!this.#adopting) {
      console.log("> Device disconnected");
      this.interface.emit("disconnected", { target: this });
    }
  };

  requestWakeLock() {
    return this.interface.requestWakeLock();
  }

  releaseWakeLock() {
    return this.interface.releaseWakeLock();
  }

  setOwnerSignature(ownerSignature) {
    if (ownerSignature.length != 32) {
      throw "InvalidSignature";
    }

    const reg = ownerSignature.match(/[\dabcdefABCDEF]{32}/);

    if (!reg[0]) {
      throw "InvalidSignature";
    }

    this.#ownerSignature = ownerSignature;
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

    this.#ownerKey = reg[0];
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

  connectRemoteControl() {
    this.#reconnectRC = true;

    console.log("> Connecting to Remote Control");

    if (!this.socket) {
      // TODO - scopovani dle apky
      // TODO - authentifikace
      this.socket = io("https://tangle-remote-control.glitch.me/", { transports: ["websocket"] });

      this.socket.on("connect", () => {
        console.log("> Connected to remote control");
        window.alert("Connected to remote control");
      });

      this.socket.on("disconnect", () => {
        console.log("> Disconnected from remote control");
        window.alert("Disconnected from remote control");

        // if (this.#reconnectRC) {
        //   console.log("Disconnected by its own... Reloading");
        //   window.location.reload();
        // }

        // if (this.#reconnectRC) {
        //   console.log("> Reconnecting Remote Control...");

        //   this.socket.connect();
        // }
      });

      this.socket.on("deliver", payload => {
        console.log("deliver", payload);
        this.interface.deliver(new Uint8Array(payload));
      });

      this.socket.on("transmit", payload => {
        console.log("transmit", payload);
        this.interface.transmit(new Uint8Array(payload));
      });

      // this.socket.on("request", payload => {
      //   console.log("request", payload);
      //   this.interface.request(new Uint8Array(payload));
      // });

      this.socket.on("connect_error", error => {
        console.log("connect_error", error);
        setTimeout(() => {
          this.socket.connect();
        }, 1000);
      });

      // this.socket.on("setClock", payload => {
      //   console.warn("setClock", payload);
      // });

      // // ============= CLOCK HACK ==============

      // const hackClock = () => {
      //   console.warn("overriding clock with UTC clock");
      //   this.interface.clock.setMillis(getClockTimestamp());
      //   this.syncClock();
      // };

      // hackClock();

      // this.interface.on("connected", () => {
      //   hackClock();
      // });
    } else {
      this.socket.connect();
    }
  }

  disconnectRemoteControl() {
    console.log("> Disonnecting from the Remote Control");

    this.#reconnectRC = false;

    this.socket?.disconnect();
  }

  // valid UUIDs are in range [1..4294967295] (32-bit unsigned number)
  #getUUID() {
    if (this.#uuidCounter >= 0xffffffff) {
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

  adopt(newDeviceName = null, newDeviceId = null, tnglCode = null) {
    const criteria = /** @type {any} */ ([{ adoptionFlag: true }, { legacy: true }]);

    return this.interface
      .userSelect(criteria, 60000)
      .then(() => {
        this.#adopting = true;
        return this.interface.connect(10000);
      })
      .then(async () => {
        const random_names = [
          "Karel",
          "Kobliha",
          "Lucie",
          "Anna",
          "Julie",
          "Emanuel",
          "Leontynka",
          "Maxipes Fik",
          "Otesanek",
          "Karkulka",
          "Popelka",
          "Malenka",
          "Fifinka",
          "Myspulin",
          "Brumda",
          "Cmelda",
          "Saxana",
          "Petronel",
          "Odetta",
          "Vecernice",
          "Trautenberk",
          "Rakosnicek",
          "Asterix",
          "Obelix",
          "Gargamel",
          "Dasenka",
          "Pucmeloud",
          "Fantomas",
          "Skrblik",
          "Rumburak",
          "Arabela",
          "Xenie",
          "Rumcajs",
          "Cipisek",
          "Sarka Farka",
          "Lotrando",
          "Zubejda",
          "Fido",
          "Canfourek",
          "Hurvinek",
          "Spejbl",
          "Manicka",
          "Manka",
          "Macourek",
          "Ferda",
          "Beruska",
          "Vydrysek",
          "Bolek",
          "Lolek",
          "Pepina",
          "Bambi",
          "Krakonos",
          "Lucifek",
          "Vetrnik",
          "Laskonka",
          "Kremrole",
          "Bombicka",
          "Kokoska",
          "Marlenka",
          "Bobinka",
          "Louskacek",
          "Bila pani",
          "Bob",
          "Bobek",
          "Brouk Pytlik",
          "Kremilek",
          "Vochomurka",
          "Kubula",
          "Locika",
          "Otesanek",
          "Petr Pan",
          "Snehurka",
          "Smoulinka",
          "Vila Amalka",
          "Zlata rybka",
          "Zvonilka",
        ];

        try {
          while (!newDeviceName || !newDeviceName.match(/^[\w_ ]+/)) {
            // @ts-ignore
            newDeviceName = await window.prompt("Unikátní jméno pro vaši lampu vám ji pomůže odlišit od ostatních.", random_names[Math.floor(Math.random() * random_names.length)], "Pojmenujte svoji lampu", "text", {
              placeholder: "NARA",
              regex: /^[a-zA-Z0-9_ ]{1,16}$/,
              invalidText: "Název obsahuje nepovolené znaky",
              maxlength: 16,
            });
          }
          while (!newDeviceId || (typeof newDeviceId !== "number" && !newDeviceId.match(/^[\d]+/))) {
            // @ts-ignore
            newDeviceId = await window.prompt("Prosím, zadejte ID zařízení v rozmezí 0-255", "0", "Přidělte ID svému zařízení", "number", { min: 0, max: 255 });
          }

          newDeviceName = czechHackyToEnglish(newDeviceName); // replace all hacky carky with english letters
          newDeviceName = newDeviceName.replace(/((?![\w_ ]).)/g, " "); // replace all unsupported characters with whitespaces
          newDeviceName = newDeviceName.trim(); // trim whitespaces on start and end
          newDeviceName = newDeviceName.match(/^[\w_ ]+/)[0]; // do final match of only supported chars

          if (typeof newDeviceId !== "number") {
            newDeviceId = Number(newDeviceId.match(/^[\d]+/)[0]);
          }
        } catch (e) {
          await this.disconnect();
          return Promise.reject("UserRefused");
        }
        return Promise.resolve();
      })
      .then(() => {
        const owner_signature_bytes = hexStringToUint8Array(this.#ownerSignature, 16);
        const owner_key_bytes = hexStringToUint8Array(this.#ownerKey, 16);
        const device_name_bytes = stringToBytes(newDeviceName.slice(0, 11), 16);
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
              return (
                (tnglCode ? this.writeTngl(tnglCode) : Promise.resolve())
                  .then(() => {
                    return sleep(1000).then(() => {
                      return this.rebootAndDisconnectDevice();
                    });
                  })
                  .then(() => {
                    return sleep(3500).then(() => {
                      return this.interface.connect(10000);
                    });
                  })
                  // .then(() => {
                  //   return this.requestTimeline().catch(e => {
                  //     console.error("Timeline request failed.", e);
                  //   });
                  // })
                  .then(() => {
                    setTimeout(() => {
                      if (this.interface.connected()) {
                        console.log("> Device connected");
                        this.interface.emit("connected", { target: this });
                      }
                    }, 1);
                  })
                  .catch(e => {
                    console.error(e);
                  })
                  .then(() => {
                    return { mac: device_mac, ownerSignature: this.#ownerSignature, ownerKey: this.#ownerKey, name: newDeviceName, id: newDeviceId };
                  })
              );
            } else {
              console.warn("Adoption refused.");
              this.disconnect().finally(() => {
                // @ts-ignore
                window.confirm("Zkuste to, prosím, později.", "Přidání se nezdařilo", { confirm: "Zkusit znovu", cancel: "Zpět" }).then(result => {
                  if (result) {
                    this.adopt(newDeviceName, newDeviceId, tnglCode);
                  }
                });
                throw "AdoptionRefused";
              });
            }
          })
          .catch(e => {
            console.error(e);
            this.disconnect().finally(() => {
              // @ts-ignore
              window.confirm("Zkuste to, prosím, později.", "Přidání se nezdařilo", { confirm: "Zkusit znovu", cancel: "Zpět" }).then(result => {
                if (result) {
                  this.adopt(newDeviceName, newDeviceId, tnglCode);
                }
              });
              throw "AdoptionFailed";
            });
          });
      })
      .finally(() => {
        this.#adopting = false;
      });
  }

  // devices: [ {name:"Lampa 1", mac:"12:34:56:78:9a:bc"}, {name:"Lampa 2", mac:"12:34:56:78:9a:bc"} ]

  connect(devices = null, autoConnect = true) {
    let criteria = /** @type {any} */ ([{ ownerSignature: this.#ownerSignature }]);

    if (devices && devices.length > 0) {
      let devices_criteria = /** @type {any} */ ([]);

      for (let i = 0; i < devices.length; i++) {
        let criterium = {};

        if (devices[i].name) {
          criterium.ownerSignature = this.#ownerSignature;
          criterium.name = devices[i].name.slice(0, 11);
          devices_criteria.push(criterium);
        } else if (devices[i].mac) {
          criterium.ownerSignature = this.#ownerSignature;
          criterium.mac = devices[i].mac;
          devices_criteria.push(criterium);
        }
      }

      if (devices_criteria.length != 0) {
        criteria = devices_criteria;
      }
    }

    console.log(criteria);

    return (autoConnect ? this.interface.autoSelect(criteria, 2000, 10000) : this.interface.userSelect(criteria))
      .then(() => {
        return this.interface.connect(10000);
      })
      .catch(error => {
        if (error !== "UserCanceledSelection") {
          //@ts-ignore
          window.alert("Zkuste to, prosím, později.\n\nChyba: " + error.toString(), "Připojení selhalo.");
        }
      });
  }

  disconnect() {
    return this.interface.disconnect();
  }

  connected() {
    return this.interface.connected();
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // WIP, writes Tngl only if fingerprints does not match
  syncTngl(tngl_code, tngl_bytes = null) {
    //console.log("writeTngl()");

    if (tngl_code === null && tngl_bytes === null) {
      return Promise.reject("Invalid");
    }

    if (tngl_bytes === null) {
      tngl_bytes = new TnglCodeParser().parseTnglCode(tngl_code);
    }

    return this.getTnglFingerprint().then(device_fingerprint => {
      return computeTnglFingerprint(tngl_bytes, "fingerprint").then(new_fingerprint => {
        // console.log(device_fingerprint);
        // console.log(new_fingerprint);

        for (let i = 0; i < device_fingerprint.length; i++) {
          if (device_fingerprint[i] !== new_fingerprint[i]) {
            return this.writeTngl(null, tngl_bytes);
          }
        }
      });
    });
  }

  writeTngl(tngl_code, tngl_bytes = null) {
    //console.log("writeTngl()");

    if (tngl_code === null && tngl_bytes === null) {
      return Promise.reject("Invalid");
    }

    if (tngl_bytes === null) {
      tngl_bytes = new TnglCodeParser().parseTnglCode(tngl_code);
    }

    const timeline_flags = this.timeline.paused() ? 0b00010000 : 0b00000000; // flags: [reserved,reserved,reserved,timeline_paused,reserved,reserved,reserved,reserved]
    const timeline_payload = [NETWORK_FLAGS.FLAG_SET_TIMELINE, ...numberToBytes(this.interface.clock.millis(), 4), ...numberToBytes(this.timeline.millis(), 4), timeline_flags];

    const tngl_payload = [NETWORK_FLAGS.FLAG_TNGL_BYTES, ...numberToBytes(tngl_bytes.length, 4), ...tngl_bytes];

    const payload = [...timeline_payload, ...tngl_payload];
    return this.interface.execute(payload, "TNGL").then(() => {
      // console.log("Written");
    });
  }

  // event_label example: "evt1"
  // event_value example: 1000
  emitEvent(event_label, device_ids = [0xff], force_delivery = true, is_lazy = true) {
    // console.log("emitTimestampEvent(id=" + device_ids + ")");

    const func = device_id => {
      const payload = is_lazy ? [NETWORK_FLAGS.FLAG_EMIT_LAZY_EVENT, ...labelToBytes(event_label), device_id] : [NETWORK_FLAGS.FLAG_EMIT_EVENT, ...labelToBytes(event_label), ...numberToBytes(this.timeline.millis(), 4), device_id];
      return this.interface.execute(payload, force_delivery ? null : "E" + event_label + device_id);
    };

    if (typeof device_ids === "object") {
      let promises = device_ids.map(func);
      return Promise.all(promises);
    } else {
      return func(device_ids);
    }
  }

  // event_label example: "evt1"
  // event_value example: 1000
  emitTimestampEvent(event_label, event_value, device_ids = [0xff], force_delivery = false, is_lazy = true) {
    // console.log("emitTimestampEvent(id=" + device_ids + ")");

    const func = device_id => {
      const payload = is_lazy
        ? [NETWORK_FLAGS.FLAG_EMIT_LAZY_TIMESTAMP_EVENT, ...numberToBytes(event_value, 4), ...labelToBytes(event_label), device_id]
        : [NETWORK_FLAGS.FLAG_EMIT_TIMESTAMP_EVENT, ...numberToBytes(event_value, 4), ...labelToBytes(event_label), ...numberToBytes(this.timeline.millis(), 4), device_id];
      return this.interface.execute(payload, force_delivery ? null : "E" + event_label + device_id);
    };

    if (typeof device_ids === "object") {
      let promises = device_ids.map(func);
      return Promise.all(promises);
    } else {
      return func(device_ids);
    }
  }

  // event_label example: "evt1"
  // event_value example: "#00aaff"
  emitColorEvent(event_label, event_value, device_ids = [0xff], force_delivery = false, is_lazy = true) {
    // console.log("emitColorEvent(id=" + device_ids + ")");

    const func = device_id => {
      const payload = is_lazy
        ? [NETWORK_FLAGS.FLAG_EMIT_LAZY_COLOR_EVENT, ...colorToBytes(event_value), ...labelToBytes(event_label), device_id]
        : [NETWORK_FLAGS.FLAG_EMIT_COLOR_EVENT, ...colorToBytes(event_value), ...labelToBytes(event_label), ...numberToBytes(this.timeline.millis(), 4), device_id];
      return this.interface.execute(payload, force_delivery ? null : "E" + event_label + device_id);
    };

    if (typeof device_ids === "object") {
      let promises = device_ids.map(func);
      return Promise.all(promises);
    } else {
      return func(device_ids);
    }
  }

  // event_label example: "evt1"
  // event_value example: 100.0
  // !!! PARAMETER CHANGE !!!
  emitPercentageEvent(event_label, event_value, device_ids = [0xff], force_delivery = false, is_lazy = true) {
    // console.log("emitPercentageEvent(id=" + device_ids + ")");

    const func = device_id => {
      const payload = is_lazy
        ? [NETWORK_FLAGS.FLAG_EMIT_LAZY_PERCENTAGE_EVENT, ...percentageToBytes(event_value), ...labelToBytes(event_label), device_id]
        : [NETWORK_FLAGS.FLAG_EMIT_PERCENTAGE_EVENT, ...percentageToBytes(event_value), ...labelToBytes(event_label), ...numberToBytes(this.timeline.millis(), 4), device_id];
      return this.interface.execute(payload, force_delivery ? null : "E" + event_label + device_id);
    };

    if (typeof device_ids === "object") {
      let promises = device_ids.map(func);
      return Promise.all(promises);
    } else {
      return func(device_ids);
    }
  }

  // event_label example: "evt1"
  // event_value example: "label"
  // !!! PARAMETER CHANGE !!!
  emitLabelEvent(event_label, event_value, device_ids = [0xff], force_delivery = false, is_lazy = true) {
    // console.log("emitLabelEvent(id=" + device_ids + ")");

    const func = device_id => {
      const payload = is_lazy
        ? [NETWORK_FLAGS.FLAG_EMIT_LAZY_LABEL_EVENT, ...labelToBytes(event_value), ...labelToBytes(event_label), device_id]
        : [NETWORK_FLAGS.FLAG_EMIT_LABEL_EVENT, ...labelToBytes(event_value), ...labelToBytes(event_label), ...numberToBytes(this.timeline.millis(), 4), device_id];
      return this.interface.execute(payload, force_delivery ? null : "E" + event_label + device_id);
    };

    if (typeof device_ids === "object") {
      let promises = device_ids.map(func);
      return Promise.all(promises);
    } else {
      return func(device_ids);
    }
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
    this.#updating = true;

    this.interface.requestWakeLock();

    return (
      window
        //@ts-ignore
        .confirm("Nastaví rychlejší přenos dat, který ale nemá takový dosah.", "Jsou zařízení blízko sebe?")
        //@ts-ignore
        .then(result => {
          if (result) {
            return this.setNetworkDatarate(2000000).catch(()=>{
              window.alert("Nastavení rychlejšího přenosu dat se nezdařilo.");
            });
          } else {
            return Promise.resolve();
          }
        })
        .then(() => {
          return new Promise(async (resolve, reject) => {
            const chunk_size = 3984; // must be modulo 16
            // const chunk_size = 992; // must be modulo 16

            let index_from = 0;
            let index_to = chunk_size;

            let written = 0;

            console.log("OTA UPDATE");
            console.log(firmware);

            await sleep(100);

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

              await sleep(5000);

              console.log("Rebooting whole network...");

              const payload = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(1, 4), DEVICE_FLAGS.FLAG_DEVICE_REBOOT_REQUEST];
              await this.interface.execute(payload, null);

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
        })

        .finally(() => {
          this.interface.releaseWakeLock();
          this.#updating = false;
        })
    );
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
    return this.interface.request(bytes, true).then(response => {
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
        // reboot device
        const payload = [DEVICE_FLAGS.FLAG_DEVICE_REBOOT_REQUEST];
        return this.interface.request(payload, false);
      } else {
        throw "Fail";
      }
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
      const payload = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(1, 4), DEVICE_FLAGS.FLAG_DEVICE_REBOOT_REQUEST];
      return this.interface.execute(payload, null);
    });
  }

  requestTimeline() {
    console.log("> Requesting timeline...");

    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_TIMELINE_REQUEST, ...numberToBytes(request_uuid, 4)];

    return this.interface.request(bytes, true).then(response => {
      console.log("> Got response:", response);

      let reader = new TnglReader(response);

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

  // Code.device.interface.execute([240,1,0,0,0,5],null)
  rebootNetwork() {
    console.log("> Rebooting network...");

    const payload = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(1, 4), DEVICE_FLAGS.FLAG_DEVICE_REBOOT_REQUEST];
    return this.interface.execute(payload, null);
  }

  rebootDevice() {
    console.log("> Rebooting device...");

    const payload = [DEVICE_FLAGS.FLAG_DEVICE_REBOOT_REQUEST];
    return this.interface.request(payload, false);
  }

  rebootAndDisconnectDevice() {
    console.log("> Rebooting and disconnecting device...");

    this.interface.reconnection(false);

    return this.rebootDevice().then(() => {
      return this.interface.disconnect();
    });
  }

  removeOwner() {
    console.log("> Removing owner...");

    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_ERASE_OWNER_REQUEST, ...numberToBytes(request_uuid, 4)];

    return this.interface.request(bytes, true).then(response => {
      let reader = new TnglReader(response);

      console.log("> Got response:", response);

      if (reader.readFlag() !== DEVICE_FLAGS.FLAG_ERASE_OWNER_RESPONSE) {
        throw "InvalidResponseFlag";
      }

      const response_uuid = reader.readUint32();

      if (response_uuid != request_uuid) {
        throw "InvalidResponseUuid";
      }

      const error_code = reader.readUint8();

      console.log(`error_code=${error_code}`);

      if (error_code !== 0) {
        throw "OwnerEraseFailed";
      }

      const removed_device_mac_bytes = reader.readBytes(6);

      return this.rebootAndDisconnectDevice()
        .catch(() => {})
        .then(() => {
          let removed_device_mac = "00:00:00:00:00:00";
          if (removed_device_mac_bytes.length >= 6) {
            removed_device_mac = Array.from(removed_device_mac_bytes, function (byte) {
              return ("0" + (byte & 0xff).toString(16)).slice(-2);
            }).join(":");
          }
          return { mac: removed_device_mac !== "00:00:00:00:00:00" ? removed_device_mac : null };
        });
    });
  }

  getFwVersion() {
    console.log("> Requesting fw version...");

    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_FW_VERSION_REQUEST, ...numberToBytes(request_uuid, 4)];

    return this.interface.request(bytes, true).then(response => {
      let reader = new TnglReader(response);

      console.log("> Got response:", response);

      if (reader.readFlag() !== DEVICE_FLAGS.FLAG_FW_VERSION_RESPONSE) {
        throw "InvalidResponseFlag";
      }

      const response_uuid = reader.readUint32();

      if (response_uuid != request_uuid) {
        throw "InvalidResponseUuid";
      }

      const error_code = reader.readUint8();

      console.log(`error_code=${error_code}`);

      let version = null;

      if (error_code === 0) {
        version = reader.readString(32);
      } else {
        throw "Fail";
      }
      console.log(`version=${version}`);

      return version;
    });
  }

  getTnglFingerprint() {
    console.log("> Getting TNGL fingerprint...");

    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_TNGL_FINGERPRINT_REQUEST, ...numberToBytes(request_uuid, 4)];

    return this.interface.request(bytes, true).then(response => {
      let reader = new TnglReader(response);

      console.log("> Got response:", response);

      if (reader.readFlag() !== DEVICE_FLAGS.FLAG_TNGL_FINGERPRINT_RESPONSE) {
        throw "InvalidResponseFlag";
      }

      const response_uuid = reader.readUint32();

      if (response_uuid != request_uuid) {
        throw "InvalidResponseUuid";
      }

      const error_code = reader.readUint8();

      console.log(`error_code=${error_code}`);

      let fingerprint = null;

      if (error_code === 0) {
        fingerprint = reader.readBytes(32);
      } else {
        throw "Fail";
      }

      console.log(`fingerprint=${fingerprint}`);

      return new Uint8Array(fingerprint);
    });
  }

  // setDeviceId(id) {
  //   console.log("> Rebooting network...");

  //   const payload = [NETWORK_FLAGS.FLAG_DEVICE_ID, id];
  //   return this.connector.request(payload);
  // }

  // datarate in bits per second
  setNetworkDatarate(datarate) {
    console.log(`> Setting network datarate to ${datarate} bsp...`);

    const request_uuid = this.#getUUID();
    const payload = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(9, 4), DEVICE_FLAGS.FLAG_CHANGE_DATARATE_REQUEST, ...numberToBytes(request_uuid, 4), ...numberToBytes(datarate, 4)];

    return this.interface.execute(payload, null);
  }
}
