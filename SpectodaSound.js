import { logging } from './Logging.js';
import { createNanoEvents, mapValue } from './functions.js'
import { FFT } from './dsp.js'

export class SpectodaSound {
  #stream;
  #gain_node;
  #source;
  #audioContext;
  /**
   * @type {ScriptProcessorNode}
   */
  #script_processor_get_audio_samples;
  #events;
  #fft;

  constructor() {
    this.running = false;
    this.#source = null;
    this.#gain_node = null;
    this.#script_processor_get_audio_samples = null;
    this.BUFF_SIZE = 2048;
    this.#audioContext = new AudioContext();
    this.#stream = null;
    this.#fft = null;

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
    if (!mediaStream || mediaStream === "microphone") {
      // Dotaz na povolení přístupu k mikrofonu
      if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
          navigator.mozGetUserMedia || navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        await new Promise((resolve, reject) => {
          navigator.getUserMedia({ audio: true },
            (stream) => {
              this.#stream = stream;
              this.#source = this.#audioContext.createMediaStreamSource(this.#stream);
              resolve()
              logging.debug('SpectodaSound.connect', 'Connected microphone');
            },
            (e) => {
              alert('Error capturing audio.');
              reject(e)
            }
          );
        })
      } else { alert('getUserMedia not supported in this browser.'); }
    } else {
      this.#stream = mediaStream;
      this.#source = this.#audioContext.createMediaStreamSource(mediaStream);
      logging.debug('SpectodaSound.connect', 'Connected mediaStream');
    }


  }

  start() {
    this.#gain_node = this.#audioContext.createGain();
    this.#gain_node.connect(this.#audioContext.destination);


    // TODO use audio worklet https://developer.chrome.com/blog/audio-worklet/
    this.#script_processor_get_audio_samples = this.#audioContext.createScriptProcessor(this.BUFF_SIZE, 1, 1);
    this.#script_processor_get_audio_samples.connect(this.#gain_node);

    console.log("Sample rate of soundcard: " + this.#audioContext.sampleRate);
    this.#fft = new FFT(this.BUFF_SIZE, this.#audioContext.sampleRate);

    this.#source.connect(this.#script_processor_get_audio_samples);


    // TODO - this should be handled better
    this.running = true;
    // var bufferCount = 0;

    console.log("running samples", this.BUFF_SIZE)

    // Tato funkce se provede pokaždé když dojde k naplnění bufferu o velikosti 2048 vzorků.
    // Při vzorkovacím kmitočku 48 kHz se tedy zavolá jednou za cca 42 ms.

    this.#script_processor_get_audio_samples.addEventListener('audioprocess', this.processHandler.bind(this));
  }

  stop() {
    this.running = false;
  }

  on(...args) {
    return this.#events.on(...args);
  }

  setBuffSize(size) {
    return this.BUFF_SIZE = size;
  }


  processHandler(e) {
    console.log("audio processing")

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
    spectrum.forEach(element => {
      rms_loudness_spectrum += Math.pow(element, 2);
    });

    // for (let i = 30; i < 50; i++) {
    //   rms_loudness_spectrum += Math.pow(spectrum[i],2);
    // }

    // Odmocnina součtu druhých mocnin nám dá efektivní hodnotu signálu "RMS"
    rms_loudness_spectrum = Math.sqrt(rms_loudness_spectrum);

    // Mapování efektivní hodnoty signálu na rozmezí 0-255 pro vhodný přenos dat.
    // Zde je zejmána nutné dobře nastavit mapovací prahy. Spodní pro odstranění šumu okolí a horní nám udává výslednou dynamiku.
    var out = mapValue(rms_loudness_spectrum, 0.00001, 0.9, 0, 255)

    // console.log("spectrum avarge loudnes: "+ out);
    // this.#handleControlSend(out);
    this.#events.emit('loudness', out);
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

  // this.#events.emit('control', {
  //   type: 'loudness',
  //   value: value
  // });
}

