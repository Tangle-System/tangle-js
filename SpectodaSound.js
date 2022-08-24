import { logging } from "./Logging.js";
import { createNanoEvents, mapValue, sleep } from "./functions.js";
import { FFT } from "./dsp.js";
import { t } from "./i18n.js";

function calculateSensitivityValue(value, sensitivity) {
  return (value * sensitivity) / 100;
}

// function lerpUp(a, b, t) {
//   if (b > a) {
//     t *= 5;
//   }
//   return (1 - t) * a + t * b;
// }

export class SpectodaSound {
  #stream;
  #gain_node;
  #source;
  #audioContext;
  #bufferedValues;
  /**
   * @type {ScriptProcessorNode}
   */
  #script_processor_get_audio_samples;
  #events;
  #fft;
  #sensitivity;
  #movingAverageGapValues;
  evRate;

  constructor() {
    this.running = false;
    this.#source = null;
    this.#gain_node = null;
    this.#script_processor_get_audio_samples = null;
    this.BUFF_SIZE = 4096;
    this.#audioContext = null;
    this.#stream = null;
    this.#fft = null;
    this.#bufferedValues = [];
    this.#movingAverageGapValues = [];
    this.#sensitivity = 100;
    this.evRate = 100;
    this.lastValue = 0;
    /**
     * @type {"static"|"dynamic"}
     */
    this.evRateType = "dynamic";

    this.#events = createNanoEvents();
  }

  /**
   *
   * @param {MediaStream|"microphone"} mediaStream
   */
  async connect(mediaStream = null) {
    // Uává velikost bloků ze kterých bude vypočítávána průměrná hlasitos.
    // Maximální velikost je 2048 vzorků.
    // Hodnota musí být vždy násobkem dvou.
    // Pokud bude buffer menší bude se také rychleji posílat výpočet efektivní hodnoty.
    if (!this.#audioContext) {
      this.#audioContext = new AudioContext();
    }
    if (!mediaStream || mediaStream === "microphone") {
      // Dotaz na povolení přístupu k mikrofonu
      if (navigator.mediaDevices) {
        const constraints = (window.constraints = {
          audio: {
            echoCancellation: false,
            autoGainControl: false,
            noiseSuppression: false,
            sampleRate: 48000,
          },
          video: false,
        });
        await new Promise((resolve, reject) => {
          navigator.mediaDevices
            .getUserMedia(constraints)
            .then((stream) => {
              this.#stream = stream;
              this.#source = this.#audioContext.createMediaStreamSource(
                this.#stream
              );
              resolve();
              logging.debug("SpectodaSound.connect", "Connected microphone");
            })
            .catch((e) => {
              window.alert(
                t(
                  "Zkontrolujte, zda jste v Nastavení povolili aplikaci Bluefy přístup k mikrofonu. Pokud ano, obnovte aktuální stránku, vymažte cookies a zkuste to znovu."
                ),
                t("Mikrofon se nepodařilo spustit.")
              );
              reject(e);
            });
        });
        console.log("Connected Mic");
        // await new Promise((resolve, reject) => { navigator.mediaDevices.getUserMedia(constraints).then(resolve).catch(reject)) };
      } else {
        // TODO - check, tato chyba možná vzniká jinak. Navíc ta chyba nemusí být bluefy only
        window.alert(
          t(
            "Zkontrolujte, zda jste v Nastavení povolili aplikaci Bluefy přístup k mikrofonu. Pokud ano, obnovte aktuální stránku, vymažte cookies a zkuste to znovu."
          ),
          t("Mikrofon se nepodařilo spustit.")
        );
      }
    } else {
      this.#stream = mediaStream;
      this.#source = this.#audioContext.createMediaStreamSource(mediaStream);
      logging.debug("SpectodaSound.connect", "Connected mediaStream");
      console.log("Connected mediaStream");
    }
  }

  async start() {
    if (!this.#stream) {
      await this.connect();
    }
    if (!this.running) {
      this.#gain_node = this.#audioContext.createGain();
      this.#gain_node.connect(this.#audioContext.destination);

      // TODO use audio worklet https://developer.chrome.com/blog/audio-worklet/
      this.#script_processor_get_audio_samples =
        this.#audioContext.createScriptProcessor(this.BUFF_SIZE, 1, 1);
      this.#script_processor_get_audio_samples.connect(this.#gain_node);

      console.log("Sample rate of soundcard: " + this.#audioContext.sampleRate);
      this.#fft = new FFT(this.BUFF_SIZE, this.#audioContext.sampleRate);

      this.#source.connect(this.#script_processor_get_audio_samples);

      // TODO - this should be handled better
      this.running = true;
      // var bufferCount = 0;

      console.log("running samples", this.BUFF_SIZE);

      // Tato funkce se provede pokaždé když dojde k naplnění bufferu o velikosti 2048 vzorků.
      // Při vzorkovacím kmitočku 48 kHz se tedy zavolá jednou za cca 42 ms.

      this.#script_processor_get_audio_samples.addEventListener(
        "audioprocess",
        this.processHandler.bind(this)
      );
    }
  }

  stop() {
    this.running = false;
  }

  on(...args) {
    return this.#events.on(...args);
  }

  getBufferedDataAverage() {
    if (this.#bufferedValues.length > 0) {
      let value =
        this.#bufferedValues.reduce((p, v) => p + v) /
        this.#bufferedValues.length;
      this.#bufferedValues = [];

      // value = lerpUp(this.lastValue, value, 0.2);
      this.lastValue = value;

      return { value };
    }
  }

  calcEventGap() {
    let gapValues = [...this.#movingAverageGapValues];
    let evRate;
    if (gapValues.length > 0) {
      gapValues = gapValues.map((v) => v - gapValues[0]);
      for (let i = 0; i < gapValues.length; i++) {
        gapValues[i + 1] -= gapValues[i];
      }
      evRate = gapValues.reduce((p, v) => p + v) / gapValues.length;
      this.evRate = evRate;
      return evRate;
    }
    evRate = evRate > 20 ? evRate : 20;
  }

  /**
   *
   * @param {Function} func
   */
  async autoEmitFunctionValue(func) {
    let data = this.getBufferedDataAverage();
    if (data) {
      func(calculateSensitivityValue(data.value, this.#sensitivity)).finally(
        () => this.autoEmitFunctionValue(func)
      );
    } else {
      if (this.running) {
        sleep(10).finally(() => this.autoEmitFunctionValue(func));
      }
    }
  }

  setBuffSize(size) {
    return (this.BUFF_SIZE = size);
  }

  setSensitivity(value) {
    this.#sensitivity = value;
  }

  processHandler(e) {
    var samples = e.inputBuffer.getChannelData(0);
    var rms_loudness_spectrum = 0;
    this.#fft.forward(samples); //Vyypočtení fft ze vzorků.
    var spectrum = this.#fft.spectrum; // Získání spektra o délce bufeer/2 v našem případě 1024 harmonických.

    //--- Výpočet frekvence ---//
    //
    //    ((BufferSize/2)* Fvz)/BufferSize = Fmax
    //    Fmax / (BufferSize/2) = Frekvence jednoho vzorku
    //
    //------------------------//

    // Zde se postupně sečte druhá mocnina všech 1024 vzorků.
    spectrum.forEach((element) => {
      rms_loudness_spectrum += Math.pow(element, 2);
    });

    // for (let i = 30; i < 50; i++) {
    //   rms_loudness_spectrum += Math.pow(spectrum[i],2);
    // }

    // Odmocnina součtu druhých mocnin nám dá efektivní hodnotu signálu "RMS"
    rms_loudness_spectrum = Math.sqrt(rms_loudness_spectrum);

    // Mapování efektivní hodnoty signálu na rozmezí 0-255 pro vhodný přenos dat.
    // Zde je zejmána nutné dobře nastavit mapovací prahy. Spodní pro odstranění šumu okolí a horní nám udává výslednou dynamiku.
    var out = mapValue(rms_loudness_spectrum, 0.00001, 0.9, 0, 255);

    // console.log("spectrum avarge loudnes: "+ out);
    // this.#handleControlSend(out);
    this.#events.emit("loudness", (out * this.#sensitivity) / 100);
    this.#bufferedValues.push(out);
    this.#movingAverageGapValues.push(new Date().getTime());
    // { timestamp: new Date().getTime(), value:
    if (this.#bufferedValues.length > 5) {
      this.#bufferedValues.splice(0, 1);
    }
    if (this.#bufferedValues.length > 100) {
      this.#movingAverageGapValues.splice(0, 1);
    }
    // logging.debug('loudness', out);

    if (!this.running) {
      this.#source.disconnect();
      this.#gain_node.disconnect();
    }

    // if (bufferCount >= 5){
    //     bufferCount = 0;
    //     avarage_loudness = avarage_loudness/(BUFF_SIZE*6);
    //     avarge_loudness_spectrum = avarge_loudness_spectrum/(BUFF_SIZE*3);

    //     console.log("sample avarge loudnes: "+ mapValue(avarage_loudness,0.0005,0.05,0,255)); // This values set tresholds for noise and dynamics of signal.
    //     console.log("spectrum avarge loudnes: "+ mapValue(avarge_loudness_spectrum, 0.00001, 0.0001, 0, 255));
    //   } else {
    //     bufferCount++;
    // }
  }

  /**
   *
   * @returns {ScriptProcessorNode}
   */

  getScriptProcessorNode() {
    return this.#script_processor_get_audio_samples;
  }

  /**
   *
   * @returns {MediaStreamAudioSourceNode}
   */
  getSource() {
    return this.#source;
  }

  /**
   *
   * @returns {MediaStream}
   */
  getStream() {
    return this.#stream;
  }
  // this.#events.emit('control', {
  //   type: 'loudness',
  //   value: value
  // });
}
