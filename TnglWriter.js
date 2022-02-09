export class TnglWriter {
  constructor(buffer_size = 65535) {
    this._buffer = new ArrayBuffer(buffer_size);
    this._dataView = new DataView(this._buffer);
    // this._dataView = dataView;
    this._index = 0;
  }

  writeValue(value, byteCount) {
    if (this._index + byteCount <= this._dataView.byteLength) {
      for (let i = 0; i < byteCount; i++) {
        this._dataView.setUint8(this._index++, value & 0xff);
        value = Math.floor(value / Math.pow(2, 8));
      }
    } else {
      console.warn("End of the data");
      throw "Tried to write out of range";
    }
  }

  writeBytes(bytes, size) {
    if (size === null) {
      size = bytes.byteLength;
    }

    if (this._index + size <= this._dataView.byteLength) {
      for (let i = 0; i < size; i++) {
        if (i < bytes.byteLength) {
          this._dataView.setUint8(this._index++, bytes[i]);
        } else {
          this._dataView.setUint8(this._index++, 0);
        }
      }
    } else {
      console.warn("End of the data");
      throw "Tried to write out of range";
    }
  }

  writeString(string, length) {
    if (length === null) {
      length = string.length;
    }

    if (this._index + length <= this._dataView.byteLength) {
      for (let i = 0; i < length; i++) {
        this._dataView.setUint8(this._index++, string.charCodeAt(i));
      }
    } else {
      console.warn("End of the data");
      throw "Tried to write out of range";
    }
  }

  writeFlag(value) {
    return this.writeValue(value, 1);
  }

  writeUint8(value) {
    return this.writeValue(value, 1);
  }

  writeInt16(value) {
    return this.writeValue(value, 2);
  }

  writeUint16(value) {
    return this.writeValue(value, 2);
  }

  writeInt32(value) {
    return this.writeValue(value, 4);
  }

  writeUint32(value) {
    return this.writeValue(value, 4);
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

  get bytes() {
    return new DataView(this._buffer.slice(0, this._index));
  }

  get written() {
    return this._index;
  }
}
