import BN from "bn.js";

import Address from "../utils/address";
import { bytesToHex } from "../utils/utils";

export class BitString {
  array: Uint8Array;
  cursor: number;
  length: number;
  /**
   * @param length {number}    length of BitString in bits
   */
  constructor(length: number) {
    this.array = Uint8Array.from({ length: Math.ceil(length / 8) }, () => 0);
    this.cursor = 0;
    this.length = length;
  }

  static alloc(length: number) {
    return new BitString(length);
  }

  /**
   * @return {number}
   */
  getFreeBits() {
    return this.length - this.cursor;
  }

  /**
   * @return {number}
   */
  getUsedBits() {
    return this.cursor;
  }

  /**
   * @return {number}
   */
  getUsedBytes() {
    return Math.ceil(this.cursor / 8);
  }

  /**
   * @param n {number}
   * @return {boolean}    bit value at position `n`
   */
  get(n: number) {
    return (this.array[(n / 8) | 0] & (1 << (7 - (n % 8)))) > 0;
  }

  /**
   * @private
   * @param n {number}
   */
  checkRange(n: number) {
    if (n > this.length) {
      throw Error("BitString overflow");
    }
  }

  /**
   * Set bit value to 1 at position `n`
   * @param n {number}
   */
  on(n: number) {
    this.checkRange(n);
    this.array[(n / 8) | 0] |= 1 << (7 - (n % 8));
  }

  /**
   * Set bit value to 0 at position `n`
   * @param n {number}
   */
  off(n: number) {
    this.checkRange(n);
    this.array[(n / 8) | 0] &= ~(1 << (7 - (n % 8)));
  }

  /**
   * Toggle bit value at position `n`
   * @param n {number}
   */
  toggle(n: number) {
    this.checkRange(n);
    this.array[(n / 8) | 0] ^= 1 << (7 - (n % 8));
  }

  /**
   * forEach every bit
   * @param callback  {function(boolean): void}
   */
  forEach(callback: (value: boolean) => void) {
    const max = this.cursor;
    for (let x = 0; x < max; x++) {
      callback(this.get(x));
    }
  }

  /**
   * Write bit and increase cursor
   * @param b  {boolean | number}
   */
  writeBit(b: boolean | number) {
    if (Number(b) > 0) {
      this.on(this.cursor);
    } else {
      this.off(this.cursor);
    }
    this.cursor = this.cursor + 1;
  }

  /**
   * @param ba  {Array<boolean | number>}
   */
  writeBitArray(ba: Array<boolean | number>) {
    for (let i = 0; i < ba.length; i++) {
      this.writeBit(ba[i]);
    }
  }

  /**
   * Write unsigned int
   * @param number  {number | BN}
   * @param bitLength  {number}  size of uint in bits
   */
  writeUint(number: number | BN, bitLength: number) {
    number = new BN(number);
    if (bitLength == 0 || number.toString(2).length > bitLength) {
      if (number.toNumber() == 0) return;
      throw Error(
        "bitLength is too small for number, got number=" +
          number +
          ",bitLength=" +
          bitLength
      );
    }
    const s = number.toString(2, bitLength);
    for (let i = 0; i < bitLength; i++) {
      this.writeBit(s[i] == "1");
    }
  }

  /**
   * Write signed int
   * @param number  {number | BN}
   * @param bitLength  {number}  size of int in bits
   */
  writeInt(number: number | BN, bitLength: number) {
    number = new BN(number);
    if (bitLength == 1) {
      if (number.toNumber() == -1) {
        this.writeBit(true);
        return;
      }
      if (number.toNumber() == 0) {
        this.writeBit(false);
        return;
      }
      throw Error("Bitlength is too small for number");
    } else {
      if (number.isNeg()) {
        this.writeBit(true);
        const b = new BN(2);
        const nb = b.pow(new BN(bitLength - 1));
        this.writeUint(nb.add(number), bitLength - 1);
      } else {
        this.writeBit(false);
        this.writeUint(number, bitLength - 1);
      }
    }
  }

  /**
   * Write unsigned 8-bit int
   * @param ui8 {number}
   */
  writeUint8(ui8: number) {
    this.writeUint(ui8, 8);
  }

  /**
   * Write array of unsigned 8-bit ints
   * @param ui8 {Uint8Array}
   */
  writeBytes(ui8: Uint8Array) {
    for (let i = 0; i < ui8.length; i++) {
      this.writeUint8(ui8[i]);
    }
  }

  /**
   * Write UTF-8 string
   *
   * @param value {string}
   */
  writeString(value: string) {
    this.writeBytes(new TextEncoder().encode(value));
  }

  /**
   * @param amount  {number | BN} in nanograms
   */
  writeGrams(amount: number | BN) {
    if (amount == 0) {
      this.writeUint(0, 4);
    } else {
      amount = new BN(amount);
      const l = Math.ceil(amount.toString(16).length / 2);
      this.writeUint(l, 4);
      this.writeUint(amount, l * 8);
    }
  }

  /**
   * @param amount  {number | BN} in nanotons
   */
  writeCoins(amount: number | BN) {
    this.writeGrams(amount);
  }

  //addr_none$00 = MsgAddressExt;
  //addr_std$10 anycast:(Maybe Anycast)
  // workchain_id:int8 address:uint256 = MsgAddressInt;
  /**
   * @param address {Address | null}
   */
  writeAddress(address: Address | null) {
    if (address == null) {
      this.writeUint(0, 2);
    } else {
      this.writeUint(2, 2);
      this.writeUint(0, 1); // TODO split addresses (anycast)
      this.writeInt(address.wc, 8);
      this.writeBytes(address.hashPart);
    }
  }

  /**
   * write another BitString to this BitString
   * @param anotherBitString  {BitString}
   */
  writeBitString(anotherBitString: BitString) {
    anotherBitString.forEach((x) => {
      this.writeBit(x);
    });
  }

  writeVarUInt(value: BN | number, headerBits: number) {
    let v = new BN(value);
    if (v.eq(new BN(0))) {
      this.writeUint(0, headerBits);
    } else {
      let h = v.toString("hex");
      while (h.length % 2 !== 0) {
        h = "0" + h;
      }
      const l = Math.ceil(h.length / 2);
      this.writeUint(l, headerBits);
      this.writeBuffer(Buffer.from(h, "hex"));
    }
  }

  writeBuffer = (buffer: Buffer) => {
    for (let i = 0; i < buffer.length; i++) {
      this.writeUint8(buffer[i]);
    }
  };

  clone() {
    const result = new BitString(0);
    result.array = this.array.slice(0);
    result.length = this.length;
    result.cursor = this.cursor;
    return result;
  }

  /**
   * @return {string} hex
   */
  toString() {
    return this.toHex();
  }

  /**
   * @return {Uint8Array}
   */
  getTopUppedArray() {
    const ret = this.clone();

    let tu = Math.ceil(ret.cursor / 8) * 8 - ret.cursor;
    if (tu > 0) {
      tu = tu - 1;
      ret.writeBit(true);
      while (tu > 0) {
        tu = tu - 1;
        ret.writeBit(false);
      }
    }
    ret.array = ret.array.slice(0, Math.ceil(ret.cursor / 8));
    return ret.array;
  }

  /**
   * like Fift
   * @return {string}
   */
  toHex(): string {
    if (this.cursor % 4 === 0) {
      const s = bytesToHex(
        this.array.slice(0, Math.ceil(this.cursor / 8))
      ).toUpperCase();
      if (this.cursor % 8 === 0) {
        return s;
      } else {
        return s.substr(0, s.length - 1);
      }
    } else {
      const temp = this.clone();
      temp.writeBit(1);
      while (temp.cursor % 4 !== 0) {
        temp.writeBit(0);
      }
      const hex = temp.toHex().toUpperCase();
      return hex + "_";
    }
  }

  /**
   * set this cell data to match provided topUppedArray
   * @param array  {Uint8Array}
   * @param fullfilledBytes  {boolean}
   */
  setTopUppedArray(array: Uint8Array, fullfilledBytes = true) {
    this.length = array.length * 8;
    this.array = array;
    this.cursor = this.length;
    if (fullfilledBytes || !this.length) {
      return;
    } else {
      let foundEndBit = false;
      for (let c = 0; c < 7; c++) {
        this.cursor -= 1;
        if (this.get(this.cursor)) {
          foundEndBit = true;
          this.off(this.cursor);
          break;
        }
      }
      if (!foundEndBit) {
        console.log(array, fullfilledBytes);
        throw new Error("Incorrect TopUppedArray");
      }
    }
  }
}
