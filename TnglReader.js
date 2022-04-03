export class TnglReader {
  constructor(dataView) {
    this._dataView = dataView;
    this._index = 0;
  }

  peekValue(byteCount, unsigned) {
    const masks = [0x00, 0x80, 0x8000, 0x800000, 0x80000000];
    const offsets = [0x00, 0x100, 0x10000, 0x1000000, 0x100000000];

    if (this._index + byteCount > this._dataView.byteLength) {
      console.error("End of the data");
      throw "PeekOutOfRange";
    }

    let value = 0;

    // if (byteCount == 1) {
    //   if (unsigned) {
    //     value = this._dataView.getUint8(this._index);
    //   } else {
    //     value = this._dataView.getInt8(this._index);
    //   }
    // }
    // else {
    for (let i = byteCount; i > 0; i--) {
      value <<= 8;
      value |= this._dataView.getUint8(this._index + i - 1);
    }
    // }
    // return unsigned ? value >>> 0 : value;

    value = value >>> 0;

    if (unsigned) {
      return value;
    } else {
      if ((value & masks[byteCount]) != 0) {
        return value - offsets[byteCount];
      }
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
      console.error("End of the data");
      throw "Bytes read out of range";
    }
  }

  readString(bufferLength) {
    if (this._index + bufferLength <= this._dataView.byteLength) {
      let string = "";
      let endOfTheString = false;

      for (let i = 0; i < bufferLength; i++) {
        let charCode = this._dataView.getUint8(this._index + i);
        if (charCode === 0) {
          endOfTheString = true;
        }
        if (!endOfTheString) {
          string += String.fromCharCode(charCode);
        }
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

  readInt8() {
    return this.readValue(1, false);
  }

  readUint8() {
    return this.readValue(1, true);
  }

  readInt16() {
    return this.readValue(2, false);
  }

  readUint16() {
    return this.readValue(2, true);
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
