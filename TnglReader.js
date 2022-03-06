export class TnglReader {
  constructor(dataView) {
    this._dataView = dataView;
    this._index = 0;
  }

  peekValue(byteCount, unsigned) {
    if (this._index + byteCount <= this._dataView.byteLength) {
      let value = 0;

      for (let i = byteCount - 1; i >= 0; i--) {
        value <<= 8;
        value |= this._dataView.getUint8(this._index + i);
      }

      return unsigned ? value >>> 0 : value;
    } else {
      console.warn("End of the data");
      throw "Peeked out of range";
    }
  }

  readValue(byteCount, unsigned) {
    try {
      const val = this.peekValue(byteCount, unsigned);
      this.foward(byteCount);
      return val;
    } catch {
      throw "Read out of range";
    }
  }

  readBytes(byteCount) {
    if (this._index + byteCount <= this._dataView.byteLength) {
      let bytes = [];

      for (let i = 0; i < byteCount; i++) {
        bytes.push(this._dataView.getUint8(this._index + i));
      }

      this.foward(byteCount);

      return bytes;
    } else {
      console.warn("End of the data");
      throw "Bytes read out of range";
    }
  }

  readString(bufferLength) {
    if (this._index + bufferLength <= this._dataView.byteLength) {
      let string = "";

      for (let i = 0; i < bufferLength; i++) {
        string += String.fromCharCode(this._dataView.getUint8(this._index + i));
      }

      return string;
    } else {
      console.warn("End of the data");
      throw "Bytes read out of range";
    }
  }

  peekFlag() {
    return this.peekValue(1, true);
  }

  readFlag() {
    return this.readValue(1, true);
  }

  readUint8() {
    return this.readValue(1, true);
  }

  readInt32() {
    return this.readValue(4, false);
  }

  readUint32() {
    return this.readValue(4, true);
  }

  get available() {
    return this._dataView.byteLength - this._index;
  }

  foward(byteCount) {
    if (this._index + byteCount <= this._dataView.byteLength) {
      this._index += byteCount;
    } else {
      this._index = this._dataView.byteLength;
    }
  }

  back(byteCount) {
    if (this._index >= byteCount) {
      this._index -= byteCount;
    } else {
      this._index = 0;
    }
  }
}
