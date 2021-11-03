import { toBytes } from "./functions.js";
import { tangleEvents } from "./initialize.js";
///////////////////////////////////////////////////////////////////////////////////

/**
 * @name LineBreakTransformer
 * TransformStream to parse the stream into lines.
 */
class LineBreakTransformer {
  constructor() {
    // A container for holding stream data until a new line.
    this.container = "";
  }

  transform(chunk, controller) {
    // Handle incoming chunk
    this.container += chunk;
    const lines = this.container.split("\n");
    this.container = lines.pop();
    lines.forEach((line) => controller.enqueue(line));
  }

  flush(controller) {
    // Flush the stream.
    controller.enqueue(this.container);
  }
}

///////////////////////////////////////////////////////////////////////////////////

function TangleSerialTransmitter() {
  this._writing = false;
  this._queue = [];

  this._transmitStream = null;
  //this._transmitStreamWriter = null;
}

TangleSerialTransmitter.prototype.attach = function (writableStream) {
  this._transmitStream = writableStream;
};

TangleSerialTransmitter.prototype.detach = async function () {
  //console.log("detach()");

  if (this._transmitStream) {
    // if (this._transmitStreamWriter) {
    //   await this._transmitStreamWriter.close().catch(() => {});
    //   this._transmitStreamWriter = null;
    // }
    this._transmitStream = null;
  }
};

TangleSerialTransmitter.prototype._writeTerminal = function (payload) {
  //console.log("_writeTerminal()");

  return new Promise(async (resolve, reject) => {
    const bytes = [...toBytes(123456789, 4), ...toBytes(payload.length, 4), ...payload];
    const timeout = 25;

    try {
      const writer = this._transmitStream.getWriter();
      writer.write(new Uint8Array(bytes)).then(() => {
        setTimeout(() => {
          writer.releaseLock();
          resolve();
        }, timeout);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// deliver() thansfers data reliably to the Bluetooth Device. It might not be instant.
// It may even take ages to get to the device, but it will! (in theory)
TangleSerialTransmitter.prototype.deliver = function (data) {
  //console.log("deliver()");

  if (data) {
    this._queue.push({ payload: data, reliable: true });
  }

  if (!this._writing) {
    this._writing = true;

    // spawn async function to handle the transmittion one payload at the time
    (async () => {
      while (this._queue.length > 0) {
        //let timestamp = Date.now();

        let item = this._queue.shift();

        try {
          await this._writeTerminal(item.payload);
        } catch (error) {
          console.warn(error);
          //console.warn("write was unsuccessful");

          // if writing characteristic fail, then stop transmitting
          // but keep data to transmit in queue
          if (item.reliable) this._queue.unshift(item);
          this._writing = false;

          return;
        }

        // let duration = Date.now() - timestamp;
        // console.log("Wrote " + item.payload.length + " bytes in " + duration + " ms (" + item.payload.length / (duration / 1000) / 1024 + " kBps)");
      }
      this._writing = false;
    })();
  }
};

// transmit() tryes to transmit data NOW. ASAP. It will fail,
// if deliver or another transmit is being executed at the moment
// returns true if transmittion (only transmittion, not receive) was successful
TangleSerialTransmitter.prototype.transmit = function (data) {
  //console.log("transmit()");

  if (!data) {
    return true;
  }

  if (!this._writing) {
    // insert data as first item in sending queue
    this._queue.unshift({ payload: data, reliable: false });
    // and deliver the data to device
    this.deliver();
    return true;
  } else {
    return false;
  }
};

TangleSerialTransmitter.prototype._writeSync = function (timestamp) {
  //console.log("_writeSync()");

  return new Promise(async (resolve, reject) => {

    const payload = [...toBytes(timestamp, 4)];
    const bytes = [...toBytes(987654321, 4), ...toBytes(payload.length, 4), ...payload];

    try {
      const writer = this._transmitStream.getWriter();
      const timeout = 25;
      writer.write(new Uint8Array(bytes)).then(() => {
        setTimeout(() => {
          writer.releaseLock();
          resolve();
        }, timeout);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// sync() synchronizes the device clock
TangleSerialTransmitter.prototype.sync = function (timestamp) {
  //console.log("sync(" + timestamp + ")");

  if (!this._writing) {
    this._writing = true;

    this._writeSync(timestamp).catch((e) => {
      console.warn(e);
    });

    this._writing = false;
  }
};

// clears the queue of items to send
TangleSerialTransmitter.prototype.reset = function () {
  this._writing = false;
  this._queue = [];
};

///////////////////////////////////////////////////////////////////////////////////

function TangleSerialReceiver() {
  this._receiveStream = null;
  this._receiveStreamReader = null;
  this._receiveTextDecoderDone = null;
}

TangleSerialReceiver.prototype.attach = function (readableStream) {
  //console.log("attach()");

  this._receiveStream = readableStream;

  let textDecoder = new window.TextDecoderStream();
  this._receiveTextDecoderDone = this._receiveStream.pipeTo(textDecoder.writable);
  this._receiveStream = textDecoder.readable.pipeThrough(new window.TransformStream(new LineBreakTransformer()));
  //.pipeThrough(new TransformStream(new JSONTransformer()));

  this._receiveStreamReader = this._receiveStream.getReader();
};

TangleSerialReceiver.prototype.detach = async function () {
  //console.log("detach()");

  if (this._receiveStream) {
    if (this._receiveStreamReader) {
      await this._receiveStreamReader.cancel().catch(() => { });
      await this._receiveTextDecoderDone.catch(() => { });
      this._receiveStreamReader = null;
    }
    this._receiveStream = null;
  }
};

/**
 * @name TangleSerialReceiver.prototype.kickstart
 * Reads data from the input stream until it is interruped in some way. Then it returns.
 * Received data is handled to the processor's funtion onReceive(value).
 */
TangleSerialReceiver.prototype.kickstart = async function (processor) {
  while (true) {
    try {
      const { value, done } = await this._receiveStreamReader.read();

      if (value) {
        processor.onReceive(value);
      }

      if (done) {
        this._receiveStreamReader.releaseLock();
        return "ReaderDone";
      }
    } catch (error) {
      console.warn(error);
      this.detach();
      return error.name; // "BreakError" or "NetworkError" or "FramingError"
    }
  }
};

///////////////////////////////////////////////////////////////////////////////////

export default function TangleSerialConnection() {
  this.PORT_OPTIONS = { baudRate: 1000000 };

  this.serialPort = null;
  this.transmitter = new TangleSerialTransmitter();
  this.receiver = new TangleSerialReceiver();
  this.eventEmitter = tangleEvents;
}

TangleSerialConnection.prototype.connected = false;

TangleSerialConnection.prototype.scan = function () {
  //console.log("scan()");

  if (this.serialPort) {
    this.disconnect();
  }

  return navigator.serial.requestPort().then((port) => {
    this.serialPort = port;
  });
};

TangleSerialConnection.prototype.connect = function () {
  //console.log("connect()");

  return this.serialPort
    .open(this.PORT_OPTIONS)
    .then(() => {
      this.transmitter.attach(this.serialPort.writable);
      this.receiver.attach(this.serialPort.readable);
      this.run();
    })
    .catch((error) => {
      return this.disconnect().then(() => {
        throw error;
      });
    });
};

TangleSerialConnection.prototype.run = async function () {
  this.connected = true;
  {
    let event = {};
    event.target = this;
    this.eventEmitter.emit("connected", event);
  }

  let obj = {};
  obj.self = this;
  obj.onReceive = function (payload) {
    let event = {};
    event.target = this;
    event.payload = payload;
    this.self.eventEmitter.emit("receive", event);
  };

  let result = await this.receiver.kickstart(obj);
  //console.log(result);

  this.connected = false;
  {
    let event = {};
    event.target = this;
    event.reason = result;
    this.eventEmitter.emit("disconnected", event);
  }
};

/**
 * @name TangleSerialConnection.prototype.addEventListener
 * events: "receive", "disconnected", "connected"
 *
 * all events: event.target === the sender object (this)
 * event "receive": event.payload contains received data
 * event "disconnected": event.reason has a string with a disconnect reason
 *
 * @returns unbind function
 */
TangleSerialConnection.prototype.addEventListener = function (event, callback) {
  return this.eventEmitter.on(event, callback);
};

TangleSerialConnection.prototype._close = async function () {
  //console.log("_close()");

  await this.receiver.detach();
  await this.transmitter.detach();

  if (this.serialPort) {
    await this.serialPort.close().catch(() => { });
  }
};

TangleSerialConnection.prototype.reconnect = function () {
  //console.log("reconnect()");

  if (this.serialPort) {
    //console.log("Reconnecting serial port...");
    return this._close().then(() => {
      return this.connect();
    });
  } else {
    return this.scan().then(() => {
      return this.connect();
    });
  }
};

TangleSerialConnection.prototype.disconnect = function () {
  //console.log("disconnect()");

  if (!this.serialPort) {
    //console.log("Serial port is already disconnected");
    return Promise.resolve();
  }

  if (this.serialPort) {
    //console.log("Disconnecting serial port...");
    return this._close().then(() => {
      this.serialPort = null;
    });
  }
};
