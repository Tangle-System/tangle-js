import { colorToBytes, computeTnglFingerprint, czechHackyToEnglish, detectBluefy, detectTangleConnect, getClockTimestamp, hexStringToUint8Array, labelToBytes, numberToBytes, percentageToBytes, sleep, stringToBytes } from "./functions.js";
import { DEVICE_FLAGS, NETWORK_FLAGS, TangleInterface } from "./TangleInterface.js";
import { TnglCodeParser } from "./TangleParser.js";
import { TimeTrack } from "./TimeTrack.js";
import "./TnglReader.js";
import { TnglReader } from "./TnglReader.js";
import "./TnglWriter.js";
import { io } from "./lib/socketio.js";
import { logging, setLoggingLevel } from "./Logging.js";
import { t, changeLanguage } from "./i18n.js";

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
    this.timeline = new TimeTrack();

    this.#uuidCounter = Math.floor(Math.random() * 0xffffffff);

    this.#ownerSignature = null;
    this.#ownerKey = null;

    this.interface = new TangleInterface(this, reconnectionInterval);

    if (connectorType) {
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
              logging.warn(error);
            });
          }
        });
      }
    }, 60000);
  }

  #onConnected = event => {
    if (!this.#adopting) {
      logging.debug("> Device connected");
      this.interface.emit("connected", { target: this });

      this.requestTimeline().catch(e => {
        logging.error("Timeline request after reconnection failed.", e);
      });
    }
  };

  #onDisconnected = event => {
    if (!this.#adopting) {
      logging.debug("> Device disconnected");
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
    const reg = ownerSignature.match(/([\dabcdefABCDEF]{32})/g);

    if (!reg[0]) {
      throw "InvalidSignature";
    }

    this.#ownerSignature = reg[0];
    return true;
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
    const reg = ownerKey.match(/([\dabcdefABCDEF]{32})/g);

    if (!reg[0]) {
      throw "InvalidKey";
    }

    this.#ownerKey = reg[0];
    return true;
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

  setConnector(connector_type) {
    this.interface.assignConnector(connector_type);
  }

  /**
   * @alias this.setConnector
   */
  assignConnector(connector_type) {
    return this.setConnector(connector_type);
  }

  connectRemoteControl() {
    this.#reconnectRC = true;

    logging.debug("> Connecting to Remote Control");

    if (!this.socket) {
      // TODO - scopovani dle apky
      // TODO - authentifikace
      this.socket = io("https://tangle-remote-control.glitch.me/", { transports: ["websocket"] });

      this.socket.on("connect", () => {
        logging.debug("> Connected to remote control");
        window.alert(t("Connected to remote control"));
      });

      this.socket.on("disconnect", () => {
        logging.debug("> Disconnected from remote control");
        window.alert(t("Disconnected from remote control"));

        // if (this.#reconnectRC) {
        //   logging.debug("Disconnected by its own... Reloading");
        //   window.location.reload();
        // }

        // if (this.#reconnectRC) {
        //   logging.debug("> Reconnecting Remote Control...");

        //   this.socket.connect();
        // }
      });

      this.socket.on("deliver", payload => {
        logging.debug("deliver", payload);
        this.interface.deliver(new Uint8Array(payload));
      });

      this.socket.on("transmit", payload => {
        logging.debug("transmit", payload);
        this.interface.transmit(new Uint8Array(payload));
      });

      // this.socket.on("request", payload => {
      //   logging.debug("request", payload);
      //   this.interface.request(new Uint8Array(payload));
      // });

      this.socket.on("connect_error", error => {
        logging.debug("connect_error", error);
        setTimeout(() => {
          this.socket.connect();
        }, 1000);
      });

      // this.socket.on("setClock", payload => {
      //   logging.warn("setClock", payload);
      // });

      // // ============= CLOCK HACK ==============

      // const hackClock = () => {
      //   logging.warn("overriding clock with UTC clock");
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
    logging.debug("> Disonnecting from the Remote Control");

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
  //     logging.warn(error);
  //   });
  // }

  adopt(newDeviceName = null, newDeviceId = null, tnglCode = null, ownerSignature = null, ownerKey = null) {
    if (ownerSignature) {
      this.setOwnerSignature(ownerSignature);
    }

    if (ownerKey) {
      this.setOwnerKey(ownerKey);
    }

    if (!this.#ownerSignature) {
      throw "OwnerSignatureNotAssigned";
    }

    if (!this.#ownerKey) {
      throw "OwnerKeyNotAssigned";
    }

    const criteria = /** @type {any} */ ([{ adoptionFlag: true }, { legacy: true }]);

    return this.interface
      .userSelect(criteria, 60000)
      .then(() => {
        this.#adopting = true;
        return this.interface.connect(10000, true);
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
            let exit = false;

            newDeviceName = await window
              // @ts-ignore
              .prompt(t("Unikátní jméno pro vaši lampu vám ji pomůže odlišit od ostatních."), random_names[Math.floor(Math.random() * random_names.length)], t("Pojmenujte svoji lampu"), "text", {
                placeholder: "NARA",
                regex: /^[a-zA-Z0-9_ ]{1,16}$/,
                invalidText: t("Název obsahuje nepovolené znaky"),
                maxlength: 16,
              });

            if (!newDeviceName) {
              throw "AdoptionCancelled";
            }
          }
          while (!newDeviceId || (typeof newDeviceId !== "number" && !newDeviceId.match(/^[\d]+/))) {
            newDeviceId = await window
              // @ts-ignore
              .prompt(t("Prosím, zadejte ID zařízení v rozmezí 0-255."), "0", t("Přidělte ID svému zařízení"), "number", { min: 0, max: 255 });
            // @ts-ignore

            if (!newDeviceId) {
              throw "AdoptionCancelled";
            }
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

        logging.debug("> Adopting device...");

        logging.debug(bytes);

        return this.interface
          .request(bytes, true)
          .then(response => {
            let reader = new TnglReader(response);

            logging.debug("> Got response:", response);

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

            logging.debug(`error_code=${error_code}, device_mac=${device_mac}`);

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
                  //     logging.error("Timeline request failed.", e);
                  //   });
                  // })
                  .then(() => {
                    setTimeout(() => {
                      if (this.interface.connected()) {
                        logging.debug("> Device connected");
                        this.interface.emit("connected", { target: this });
                      }
                    }, 1);
                  })
                  .catch(e => {
                    logging.error(e);
                  })
                  .then(() => {
                    return { mac: device_mac, ownerSignature: this.#ownerSignature, ownerKey: this.#ownerKey, name: newDeviceName, id: newDeviceId };
                  })
              );
            } else {
              logging.warn("Adoption refused.");
              this.disconnect().finally(() => {
                // @ts-ignore
                window.confirm(t("Zkuste to, prosím, později."), t("Přidání se nezdařilo"), { confirm: t("Zkusit znovu"), cancel: t("Zpět") }).then(result => {
                  if (result) {
                    this.adopt(newDeviceName, newDeviceId, tnglCode);
                  }
                });
                throw "AdoptionRefused";
              });
            }
          })
          .catch(e => {
            logging.error(e);
            this.disconnect().finally(() => {
              // @ts-ignore
              window.confirm(t("Zkuste to, prosím, později."), t("Přidání se nezdařilo"), { confirm: t("Zkusit znovu"), cancel: t("Zpět") }).then(result => {
                if (result) {
                  this.adopt(newDeviceName, newDeviceId, tnglCode);
                }
              });
              throw "AdoptionFailed";
            });
          });
      })
      .catch(error => {
        logging.debug(error);
        if (error === "BluefyError") {
          // @ts-ignore
          window.alert(t("Zkontrolujte, prosím, že máte aktivní Bluetooth v telefonu a lampa je zapojená v zásuvce."), t("Spárování nové lampy se nezdařilo"));
          return;
        }
        if (error === "UserCanceledSelection") {
          return this.connected().then(result => {
            if (!result) {
              // @ts-ignore
              window.alert(t("Pro připojení již spárované lampy prosím stiskněte jakýkoli symbol") + ' "🛑"', t("Spárování nové lampy se nezdařilo"));
            }
          });
        }
      })
      .finally(() => {
        this.#adopting = false;
      });
  }

  // devices: [ {name:"Lampa 1", mac:"12:34:56:78:9a:bc"}, {name:"Lampa 2", mac:"12:34:56:78:9a:bc"} ]

  connect(devices = null, autoConnect = true, ownerSignature = null, ownerKey = null, connectAny = false) {
    if (ownerSignature) {
      this.setOwnerSignature(ownerSignature);
    }

    if (ownerKey) {
      this.setOwnerKey(ownerKey);
    }

    if (!this.#ownerSignature) {
      throw "OwnerSignatureNotAssigned";
    }

    if (!this.#ownerKey) {
      throw "OwnerKeyNotAssigned";
    }

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

    if (connectAny) {
      if (detectBluefy()) {
        criteria = [{}];
      } else {
        criteria = [{}, { adoptionFlag: true }, { legacy: true }];
      }
    }

    logging.debug(criteria);

    return (autoConnect ? this.interface.autoSelect(criteria, 1000, 5000) : this.interface.userSelect(criteria))
      .then(() => {
        return this.interface.connect(10000);
      })
      .catch(error => {
        logging.error(error);
        if (error === "UserCanceledSelection" || error === "BluefyError") {
          //@ts-ignore
          window.alert(t('Aktivujte prosím Bluetooth a vyberte svou lampu ze seznamu Pro spárování nové lampy prosím stiskněte tlačítko "Přidat zařízení".'), t("Připojení selhalo"));
          return;
        }
        if (error === "SecurityError") {
          console.error(error);
          return;
        }
        //@ts-ignore
        window.alert(t("Zkuste to, prosím, později.") + "\n\n" + t("Chyba: ") + error.toString(), t("Připojení selhalo"));
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
    //logging.debug("writeTngl()");

    if (tngl_code === null && tngl_bytes === null) {
      return Promise.reject("Invalid");
    }

    if (tngl_bytes === null) {
      tngl_bytes = new TnglCodeParser().parseTnglCode(tngl_code);
    }

    return this.getTnglFingerprint().then(device_fingerprint => {
      return computeTnglFingerprint(tngl_bytes, "fingerprint").then(new_fingerprint => {
        // logging.debug(device_fingerprint);
        // logging.debug(new_fingerprint);

        for (let i = 0; i < device_fingerprint.length; i++) {
          if (device_fingerprint[i] !== new_fingerprint[i]) {
            return this.writeTngl(null, tngl_bytes);
          }
        }
      });
    });
  }

  writeTngl(tngl_code, tngl_bytes = null) {
    //logging.debug("writeTngl()");

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
      // logging.debug("Written");
    });
  }

  // event_label example: "evt1"
  // event_value example: 1000
  emitEvent(event_label, device_ids = [0xff], force_delivery = true, is_lazy = true) {
    // logging.debug("emitTimestampEvent(id=" + device_ids + ")");

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
    // logging.debug("emitTimestampEvent(id=" + device_ids + ")");

    if (event_value > 2147483647) {
      logging.error("Invalid event value");
      event_value = 2147483647;
    }

    if (event_value < -2147483648) {
      logging.error("Invalid event value");
      event_value = -2147483648;
    }

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
    // logging.debug("emitColorEvent(id=" + device_ids + ")");

    if (!event_value.match(/#[\dabcdefABCDEF]{6}/g)) {
      logging.error("Invalid event value");
      event_value = "#000000";
    }

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
    // logging.debug("emitPercentageEvent(id=" + device_ids + ")");

    if (event_value > 100.0) {
      logging.error("Invalid event value");
      event_value = 100.0;
    }

    if (event_value < -100.0) {
      logging.error("Invalid event value");
      event_value = -100.0;
    }

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
    // logging.debug("emitLabelEvent(id=" + device_ids + ")");

    if (typeof event_value !== "string") {
      logging.error("Invalid event value");
      event_value = "";
    }

    if (event_value.length > 5) {
      logging.error("Invalid event value");
      event_value = event_value.slice(0, 5);
    }

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
    //logging.debug("syncTimeline()");
    const flags = this.timeline.paused() ? 0b00010000 : 0b00000000; // flags: [reserved,reserved,reserved,timeline_paused,reserved,reserved,reserved,reserved]
    const payload = [NETWORK_FLAGS.FLAG_SET_TIMELINE, ...numberToBytes(this.interface.clock.millis(), 4), ...numberToBytes(this.timeline.millis(), 4), flags];
    return this.interface.execute(payload, "TMLN");
  }

  syncClock() {
    logging.debug("> Forcing sync clock...");
    return this.interface.syncClock().then(() => {
      logging.debug("> Device clock synchronized");
    });
  }

  updateDeviceFirmware(firmware) {
    //logging.debug("updateDeviceFirmware()");
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
        .confirm(t("Nastaví rychlejší přenos dat, který ale nemá takový dosah."), t("Jsou zařízení blízko sebe?"))
        //@ts-ignore
        .then(result => {
          if (result) {
            return this.setNetworkDatarate(2000000).catch(() => {
              window.alert(t("Nastavení rychlejšího přenosu dat se nezdařilo."));
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

            logging.debug("OTA UPDATE");
            logging.debug(firmware);

            const start_timestamp = new Date().getTime();

            await sleep(100);

            try {
              this.interface.emit("ota_status", "begin");

              {
                //===========// RESET //===========//
                logging.debug("OTA RESET");

                const device_bytes = [DEVICE_FLAGS.FLAG_OTA_RESET, 0x00, ...numberToBytes(0x00000000, 4)];
                const network_bytes = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(device_bytes.length, 4), ...device_bytes];
                await this.interface.execute(network_bytes, null);
              }

              await sleep(100);

              {
                //===========// BEGIN //===========//
                logging.debug("OTA BEGIN");

                const device_bytes = [DEVICE_FLAGS.FLAG_OTA_BEGIN, 0x00, ...numberToBytes(firmware.length, 4)];
                const network_bytes = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(device_bytes.length, 4), ...device_bytes];
                await this.interface.execute(network_bytes, null);
              }

              await sleep(8000);

              {
                //===========// WRITE //===========//
                logging.debug("OTA WRITE");

                while (written < firmware.length) {
                  if (index_to > firmware.length) {
                    index_to = firmware.length;
                  }

                  const device_bytes = [DEVICE_FLAGS.FLAG_OTA_WRITE, 0x00, ...numberToBytes(written, 4), ...firmware.slice(index_from, index_to)];
                  const network_bytes = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(device_bytes.length, 4), ...device_bytes];
                  await this.interface.execute(network_bytes, null);

                  written += index_to - index_from;

                  const percentage = Math.floor((written * 10000) / firmware.length) / 100;
                  logging.debug(percentage + "%");
                  this.interface.emit("ota_progress", percentage);

                  index_from += chunk_size;
                  index_to = index_from + chunk_size;
                }
              }

              await sleep(100);

              {
                //===========// END //===========//
                logging.debug("OTA END");

                const device_bytes = [DEVICE_FLAGS.FLAG_OTA_END, 0x00, ...numberToBytes(written, 4)];
                const network_bytes = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(device_bytes.length, 4), ...device_bytes];
                await this.interface.execute(network_bytes, null);
              }

              await sleep(3000);

              logging.debug("Rebooting whole network...");

              const payload = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(1, 4), DEVICE_FLAGS.FLAG_DEVICE_REBOOT_REQUEST];
              await this.interface.execute(payload, null);

              logging.debug("Firmware written in " + (new Date().getTime() - start_timestamp) / 1000 + " seconds");

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
   * @returns {Promise} config;
   *
   *
   *
   *
   */

  readDeviceConfig() {
    logging.debug("> Reading device config...");

    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_DEVICE_CONFIG_REQUEST, ...numberToBytes(request_uuid, 4)];

    return this.interface.request(bytes, true).then(response => {
      let reader = new TnglReader(response);

      logging.debug("> Got response:", response);

      if (reader.readFlag() !== DEVICE_FLAGS.FLAG_DEVICE_CONFIG_RESPONSE) {
        throw "InvalidResponseFlag";
      }

      const response_uuid = reader.readUint32();

      if (response_uuid != request_uuid) {
        throw "InvalidResponseUuid";
      }

      const error_code = reader.readUint8();

      logging.debug(`error_code=${error_code}`);

      if (error_code === 0) {
        const config_size = reader.readUint32();
        logging.debug(`config_size=${config_size}`);

        const config_bytes = reader.readBytes(config_size);
        logging.debug(`config_bytes=${config_bytes}`);

        const decoder = new TextDecoder();
        const config = decoder.decode(new Uint8Array(config_bytes));
        logging.debug(`config=${config}`);

        if (config.charAt(config.length - 1) == "\0") {
          logging.warn("NULL config character detected");
          return config.slice(0, config.length - 1);
        }

        return config;
      } else {
        throw "Fail";
      }
    });
  }

  /**
   * @param {string} config;
   *
   *
   *
   *
   */

  updateDeviceConfig(config) {
    logging.debug("> Updating config...");

    const encoder = new TextEncoder();
    const config_bytes = encoder.encode(config);
    const config_bytes_size = config.length;

    // make config update request
    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_CONFIG_UPDATE_REQUEST, ...numberToBytes(request_uuid, 4), ...numberToBytes(config_bytes_size, 4), ...config_bytes];
    return this.interface.request(bytes, true).then(response => {
      let reader = new TnglReader(response);

      logging.debug("> Got response:", response);

      if (reader.readFlag() !== DEVICE_FLAGS.FLAG_CONFIG_UPDATE_RESPONSE) {
        throw "InvalidResponse";
      }

      const response_uuid = reader.readUint32();

      if (response_uuid != request_uuid) {
        throw "InvalidResponse";
      }

      const error_code = reader.readUint8();

      logging.debug(`error_code=${error_code}`);

      if (error_code === 0) {
        logging.debug("Write Config Success");
        // reboot device
        const payload = [DEVICE_FLAGS.FLAG_DEVICE_REBOOT_REQUEST];
        return this.interface.request(payload, false);
      } else {
        throw "Fail";
      }
    });
  }

  /**
   * @param {string} config;
   *
   *
   *
   *
   */

  updateNetworkConfig(config) {
    logging.debug("> Updating config of whole network...");

    const encoder = new TextEncoder();
    const config_bytes = encoder.encode(config);
    const config_bytes_size = config.length;

    // make config update request
    const request_uuid = this.#getUUID();
    const request_bytes = [DEVICE_FLAGS.FLAG_CONFIG_UPDATE_REQUEST, ...numberToBytes(request_uuid, 4), ...numberToBytes(config_bytes_size, 4), ...config_bytes];
    const payload_bytes = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(request_bytes.length, 4), ...request_bytes];

    return this.interface.execute(payload_bytes, "CONF").then(() => {
      logging.debug("> Rebooting network...");
      const payload = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(1, 4), DEVICE_FLAGS.FLAG_DEVICE_REBOOT_REQUEST];
      return this.interface.execute(payload, null);
    });
  }

  requestTimeline() {
    logging.debug("> Requesting timeline...");

    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_TIMELINE_REQUEST, ...numberToBytes(request_uuid, 4)];

    return this.interface.request(bytes, true).then(response => {
      logging.debug("> Got response:", response);

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

      logging.debug(`clock_timestamp=${clock_timestamp}, timeline_timestamp=${timeline_timestamp}, timeline_paused=${timeline_paused}`);

      if (timeline_paused) {
        this.timeline.setState(timeline_timestamp, true);
      } else {
        this.timeline.setState(timeline_timestamp + (this.interface.clock.millis() - clock_timestamp), false);
      }
    });
  }

  // Code.device.interface.execute([240,1,0,0,0,5],null)
  rebootNetwork() {
    logging.debug("> Rebooting network...");

    const payload = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(1, 4), DEVICE_FLAGS.FLAG_DEVICE_REBOOT_REQUEST];
    return this.interface.execute(payload, null);
  }

  rebootDevice() {
    logging.debug("> Rebooting device...");

    const payload = [DEVICE_FLAGS.FLAG_DEVICE_REBOOT_REQUEST];
    return this.interface.request(payload, false);
  }

  rebootAndDisconnectDevice() {
    logging.debug("> Rebooting and disconnecting device...");

    this.interface.reconnection(false);

    return this.rebootDevice().then(() => {
      return this.interface.disconnect();
    });
  }

  removeOwner() {
    logging.debug("> Removing owner...");

    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_ERASE_OWNER_REQUEST, ...numberToBytes(request_uuid, 4)];

    return this.interface.request(bytes, true).then(response => {
      let reader = new TnglReader(response);

      logging.debug("> Got response:", response);

      if (reader.readFlag() !== DEVICE_FLAGS.FLAG_ERASE_OWNER_RESPONSE) {
        throw "InvalidResponseFlag";
      }

      const response_uuid = reader.readUint32();

      if (response_uuid != request_uuid) {
        throw "InvalidResponseUuid";
      }

      const error_code = reader.readUint8();

      logging.debug(`error_code=${error_code}`);

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

  removeNetworkOwner() {
    logging.debug("> Removing network owner...");

    const request_uuid = this.#getUUID();
    const bytes = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(5, 4), DEVICE_FLAGS.FLAG_ERASE_OWNER_REQUEST, ...numberToBytes(request_uuid, 4)];

    return this.interface.execute(bytes, true);
  }

  getFwVersion() {
    logging.debug("> Requesting fw version...");

    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_FW_VERSION_REQUEST, ...numberToBytes(request_uuid, 4)];

    return this.interface.request(bytes, true).then(response => {
      let reader = new TnglReader(response);

      logging.debug("> Got response:", response);

      if (reader.readFlag() !== DEVICE_FLAGS.FLAG_FW_VERSION_RESPONSE) {
        throw "InvalidResponseFlag";
      }

      const response_uuid = reader.readUint32();

      if (response_uuid != request_uuid) {
        throw "InvalidResponseUuid";
      }

      const error_code = reader.readUint8();

      logging.debug(`error_code=${error_code}`);

      let version = null;

      if (error_code === 0) {
        version = reader.readString(32);
      } else {
        throw "Fail";
      }
      logging.debug(`version=${version}`);

      return version.trim();
    });
  }

  getTnglFingerprint() {
    logging.debug("> Getting TNGL fingerprint...");

    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_TNGL_FINGERPRINT_REQUEST, ...numberToBytes(request_uuid, 4)];

    return this.interface.request(bytes, true).then(response => {
      let reader = new TnglReader(response);

      logging.debug("> Got response:", response);

      if (reader.readFlag() !== DEVICE_FLAGS.FLAG_TNGL_FINGERPRINT_RESPONSE) {
        throw "InvalidResponseFlag";
      }

      const response_uuid = reader.readUint32();

      if (response_uuid != request_uuid) {
        throw "InvalidResponseUuid";
      }

      const error_code = reader.readUint8();

      logging.debug(`error_code=${error_code}`);

      let fingerprint = null;

      if (error_code === 0) {
        fingerprint = reader.readBytes(32);
      } else {
        throw "Fail";
      }

      logging.debug(`fingerprint=${fingerprint}`);

      return new Uint8Array(fingerprint);
    });
  }

  // setDeviceId(id) {
  //   logging.debug("> Rebooting network...");

  //   const payload = [NETWORK_FLAGS.FLAG_DEVICE_ID, id];
  //   return this.connector.request(payload);
  // }

  // datarate in bits per second
  setNetworkDatarate(datarate) {
    logging.debug(`> Setting network datarate to ${datarate} bsp...`);

    const request_uuid = this.#getUUID();
    const payload = [NETWORK_FLAGS.FLAG_CONF_BYTES, ...numberToBytes(9, 4), DEVICE_FLAGS.FLAG_CHANGE_DATARATE_REQUEST, ...numberToBytes(request_uuid, 4), ...numberToBytes(datarate, 4)];

    return this.interface.execute(payload, null);
  }

  readRomPhyVdd33() {
    logging.debug("> Requesting rom_phy_vdd33 ...");

    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_ROM_PHY_VDD33_REQUEST, ...numberToBytes(request_uuid, 4)];

    return this.interface.request(bytes, true).then(response => {
      let reader = new TnglReader(response);

      logging.debug("> Got response:", response);

      if (reader.readFlag() !== DEVICE_FLAGS.FLAG_ROM_PHY_VDD33_RESPONSE) {
        throw "InvalidResponseFlag";
      }

      const response_uuid = reader.readUint32();

      if (response_uuid != request_uuid) {
        throw "InvalidResponseUuid";
      }

      const error_code = reader.readUint8();

      logging.debug(`error_code=${error_code}`);

      let vdd_reading = null;

      if (error_code === 0) {
        vdd_reading = reader.readInt32();
      } else {
        throw "Fail";
      }
      logging.debug(`vdd_reading=${vdd_reading}`);

      return vdd_reading;
    });
  }

  readPinVoltage(pin) {
    logging.debug(`> Requesting pin ${pin} voltage ...`);

    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_VOLTAGE_ON_PIN_REQUEST, ...numberToBytes(request_uuid, 4), pin];

    return this.interface.request(bytes, true).then(response => {
      let reader = new TnglReader(response);

      logging.debug("> Got response:", response);

      if (reader.readFlag() !== DEVICE_FLAGS.FLAG_VOLTAGE_ON_PIN_RESPONSE) {
        throw "InvalidResponseFlag";
      }

      const response_uuid = reader.readUint32();

      if (response_uuid != request_uuid) {
        throw "InvalidResponseUuid";
      }

      const error_code = reader.readUint8();

      logging.debug(`error_code=${error_code}`);

      let pin_reading = null;

      if (error_code === 0) {
        pin_reading = reader.readUint32();
      } else {
        throw "Fail";
      }
      logging.debug(`pin_reading=${pin_reading}`);

      return pin_reading;
    });
  }

  /**
   * Change language for modals
   * @param {"en"|"cs"} lng
   */
  setLanguage(lng) {
    changeLanguage(lng);
  }

  hideHomeButton(hide = true) {
    if (detectTangleConnect()) {
      logging.info("Hiding home button");
      //@ts-ignore
      window.tangleConnect.hideHomeButton(hide);
    }
  }

  goHome() {
    if (detectTangleConnect()) {
      logging.info("Going home");
      //@ts-ignore
      window.tangleConnect.goHome();
    }
  }

  setRotation(rotation) {
    if (detectTangleConnect()) {
      logging.info("Setting rotation to " + rotation);
      //@ts-ignore
      window.tangleConnect.setRotation(rotation);
    }
  }

  setDebugLevel(level) {
    setLoggingLevel(level);
  }

  getConnectedPeersInfo() {
    logging.debug("> Requesting connected peers info...");

    const request_uuid = this.#getUUID();
    const bytes = [DEVICE_FLAGS.FLAG_CONNECTED_PEERS_INFO_REQUEST, ...numberToBytes(request_uuid, 4)];

    return this.interface.request(bytes, true).then(response => {
      let reader = new TnglReader(response);

      logging.debug("> Got response:", response);

      if (reader.readFlag() !== DEVICE_FLAGS.FLAG_CONNECTED_PEERS_INFO_RESPONSE) {
        throw "InvalidResponseFlag";
      }

      const response_uuid = reader.readUint32();

      if (response_uuid != request_uuid) {
        throw "InvalidResponseUuid";
      }

      const error_code = reader.readUint8();

      logging.debug(`error_code=${error_code}`);

      let count = 0;
      let peers = [];

      if (error_code === 0) {
      
        count = reader.readUint8();

        for (let index = 0; index < count; index++) {
         
          
          peers.push(reader
            .readBytes(6)
            .map(v => v.toString(16).padStart(2, "0"))
            .join(":"));
          
        }
      
      
      } else {
        throw "Fail";
      }
      logging.debug(`count=${count}, peers=`, peers);

      return  peers;
    });
  }

}
