/*
 * A Decimal to ArrayBuffer serialization extension for decimal.js.
 *
 * MIT Licensed <https://opensource.org/licenses/MIT>
 * Copyright (c) 2020, Michael Mclaughlin.
 *
 *
 * Usage example:
 *
 *   import Decimal from 'decimal.js';
 *   import { serialize } from 'decimal.js-extensions-serialize';
 *
 *   serialize.extend(Decimal);
 *
 *   const x = new Decimal('1234567899.54645456456456546213253466');
 *   const buffer = x.toArrayBuffer();
 *   const y = Decimal.fromArrayBuffer(buffer);
 *
 *   console.log(x.eq(y) ? 'Success' : 'Failure');
 *
 */

const BASE = 1e7;
const BYTES_MASK = 0b11111111;
const SIX_LSB_MASK = 0b00111111;
const NEG_SIGN_BIT = 0b10000000;
const NEG_EXPONENT_SIGN_BIT = 0b01000000;
const SMALL_INTEGER_BIT = NEG_EXPONENT_SIGN_BIT;
const ALL_NINES = BASE - 1;
const ALL_ZEROS = 0;
const NINES_SIGNIFIER = BASE + 1;
const ZEROS_SIGNIFIER = BASE;
const INFINITY_BYTE = 0b01111111;
const NEG_INFINITY_BYTE = 0b11111111;
const NAN_BYTE = 0b01000000;
const RADIX = BASE + 2;
const EXPONENT_OFFSET = 7;
const MAX_SMALL_EXPONENT = 30;
const MAX_SMALL_INTEGER = 50;
const MAX_SMALLER_INTEGER = 25;
const SMALL_INTEGER_OFFSET = -25 + 37;    // [26, 50] -> [38, 62] -> [26, 50]
const SMALLER_INTEGER_OFFSET = 38;        // [ 0, 25] -> [38, 63] -> [ 0, 25]

const isArrayBuffer = buffer => buffer instanceof ArrayBuffer ||
    Object.prototype.toString.call(buffer) === "[object ArrayBuffer]";


function toArrayBuffer() {
  let bytes;
  let firstByte;
  let exponent = this.e;
  const digits = this.d;
  const sign = this.s;
  const isSpecialValue = digits === null;

  if (isSpecialValue) {
    firstByte = isNaN(sign) ? NAN_BYTE : (sign < 0 ? NEG_INFINITY_BYTE : INFINITY_BYTE);
    bytes = [firstByte];
  } else {
    const firstDigits = digits[0];

    const isSmallInteger =
      digits.length === 1 &&
      firstDigits <= MAX_SMALL_INTEGER &&
      exponent === (firstDigits < 10 ? 0 : 1);

    if (isSmallInteger) {
      if (firstDigits > MAX_SMALLER_INTEGER) {
        firstByte = firstDigits + SMALL_INTEGER_OFFSET;
        firstByte |= SMALL_INTEGER_BIT;
      } else {
        firstByte = (firstDigits + SMALLER_INTEGER_OFFSET) | 0;
      }

      if (sign < 0) firstByte |= NEG_SIGN_BIT;
      bytes = [firstByte];
    } else {
      firstByte = sign < 0 ? NEG_SIGN_BIT : 0;
      if (exponent < 0) {
        firstByte |= NEG_EXPONENT_SIGN_BIT;
        exponent = -exponent;
      }

      let exponentByteCount;
      if (exponent > MAX_SMALL_EXPONENT) {
        // `Math.floor(Math.log(0x1000000000000 - 1) / Math.log(256) + 1)` = 7
        exponentByteCount =
            exponent < 0x100 ? 1
          : exponent < 0x10000 ? 2
          : exponent < 0x1000000 ? 3
          : exponent < 0x100000000 ? 4
          : exponent < 0x10000000000 ? 5
          : exponent < 0x1000000000000 ? 6
          : 7;

        bytes = [firstByte | exponentByteCount];
        while (exponent) {
          bytes.push(exponent & BYTES_MASK);
          exponent = Math.floor(exponent / 0x100);
        }
      } else {
        if (exponent !== 0) {
          exponent += EXPONENT_OFFSET;
          firstByte |= exponent;
        }

        bytes = [firstByte];
        exponentByteCount = 0;
      }

      const startIndex = exponentByteCount + 1;
      bytes.push(0);

      for (let i = 0, mantissaLength = digits.length; i < mantissaLength; ) {
        let nextDigits = digits[i];

        const zerosOrNinesRepeatMoreThanTwice =
            (nextDigits === ALL_ZEROS || nextDigits === ALL_NINES) &&
            digits[i + 1] === nextDigits &&
            digits[i + 2] === nextDigits;

        if (zerosOrNinesRepeatMoreThanTwice) {
          let repeatCount = 3;
          while (digits[i + repeatCount] === nextDigits) repeatCount += 1;
          nextDigits = nextDigits === ALL_ZEROS ? ZEROS_SIGNIFIER : NINES_SIGNIFIER;
          convert(nextDigits, RADIX, bytes, 0x100, startIndex);
          nextDigits = repeatCount;
          i += repeatCount;
        } else {
          i += 1;
        }

        convert(nextDigits, RADIX, bytes, 0x100, startIndex);
      }
    }
  }

  return new Uint8Array(bytes).buffer;
}


function fromArrayBuffer(Decimal, buffer) {
  let digits;
  let exponent;
  let sign;
  if (!isArrayBuffer(buffer)) throw Error("Not an ArrayBuffer: " + buffer);
  const bytes = new Uint8Array(buffer);
  if (!bytes.length) return null;

  const firstByte = bytes[0];
  sign = firstByte & NEG_SIGN_BIT ? -1 : 1;
  const isSmallIntegerOrSpecialValue = bytes.length === 1;

  if (isSmallIntegerOrSpecialValue) {
    if (firstByte === NAN_BYTE || firstByte === INFINITY_BYTE || firstByte === NEG_INFINITY_BYTE) {
      digits = null;
      exponent = NaN;
      if (firstByte === NAN_BYTE) sign = NaN;
    } else {
      let integer = firstByte & SIX_LSB_MASK;
      if ((firstByte & SMALL_INTEGER_BIT) !== 0) {
        integer -= SMALL_INTEGER_OFFSET;
        digits = [integer];
      } else {
        integer -= SMALLER_INTEGER_OFFSET;
        digits = [integer];
      }
      exponent = integer < 10 ? 0 : 1;
    }
  } else {
    let indexOfLastMantissaByte = 1;
    exponent = firstByte & SIX_LSB_MASK;
    if (exponent > EXPONENT_OFFSET) {
      // [8, 37] => [1, 30]
      exponent -= EXPONENT_OFFSET;
    } else if (exponent !== 0) {
      const exponentByteCount = exponent;
      exponent = 0;
      for (let i = 0; i < exponentByteCount; ) {
        const leftShift = 0x100 ** i;
        exponent += bytes[++i] * leftShift;
      }

      indexOfLastMantissaByte += exponentByteCount;
    }

    if ((firstByte & NEG_EXPONENT_SIGN_BIT) !== 0) exponent = -exponent;

    const digitsInReverse = [0];
    for (let i = bytes.length, startIndex = 0; i > indexOfLastMantissaByte; ) {
      convert(bytes[--i], 0x100, digitsInReverse, RADIX, startIndex);
    }

    digits = [];
    for (let i = digitsInReverse.length; i; ) {
      const nextDigits = digitsInReverse[--i];
      if (nextDigits === ZEROS_SIGNIFIER) {
        for (let repeats = digitsInReverse[--i]; repeats--; digits.push(ALL_ZEROS));
      } else if (nextDigits === NINES_SIGNIFIER) {
        for (let repeats = digitsInReverse[--i]; repeats--; digits.push(ALL_NINES));
      } else {
        digits.push(nextDigits);
      }
    }
  }

  if (exponent > Decimal.maxE || exponent < Decimal.minE) {
    exponent = NaN;
    digits = null;
  }

  return Object.create(Decimal.prototype, {
    constructor: { value: Decimal },
    d: { value: digits },
    e: { value: exponent },
    s: { value: sign },
  });
}


function convert(val, valBase, res, resBase, ri) {
  for (let i = res.length; i > ri; ) res[--i] *= valBase;
  res[ri] += val;
  for (let i = ri; i < res.length; i++) {
    if (res[i] > resBase - 1) {
      if (res[i + 1] === undefined) res[i + 1] = 0;
      res[i + 1] += (res[i] / resBase) | 0;
      res[i] %= resBase;
    }
  }
}

export const serialize = {
  extend(Decimal) {
    Decimal.prototype.toArrayBuffer = toArrayBuffer;
    Decimal.fromArrayBuffer = buffer => fromArrayBuffer(Decimal, buffer);
    return Decimal;
  }
};



/*
 * ArrayBuffer format:
 *
 *   Bit-packed first byte:
 *     X0000000  1 bit to represent the sign
 *     0X000000  1 bit to represent the sign of the exponent
 *     00XXXXXX  6 bits (64 values) representing, depending on its value:
 *       [0]      Either an exponent magnitude of 0, or, if the exponent sign bit is set, NaN
 *       [1, 7]   The number of following bytes needed to represent the exponent magnitude
 *       [8, 37]  An exponent magnitude in the range [1, 30]
 *       [38, 63] A Decimal value in the range [0, 25] if exponent sign bit is not set, or
 *       [38, 62] A Decimal value in the range [26, 50] if exponent sign bit is set, and
 *       [63]     Infinity if exponent sign bit is set
 *
 *     01000000 = NaN
 *     01111111 = Infinity
 *     11111111 = -Infinity
 *     00100110 = 0
 *     10100110 = -0
 *     00100111 = 1
 *     10100111 = -1
 *
 *  If a Decimal value cannot be represented by a single byte then the bytes following the first
 *  byte represent the exponent magnitude if it is too large to be stored in the first byte, and
 *  then the mantissa.
 *
 *  Repeating zeros and nines:
 *    If the array of base 1e7 values representing the mantissa of a Decimal value contains
 *    elements with the value 0 (representing 0000000) or 9999999 more than twice in succession,
 *    then these values are substituted by a signifier and a repeat count before conversion to bytes.
 *    Examples:
 *    [..., 0, 0, 0, ...] => [..., , ZEROS_SIGNIFIER, 3, ...]
 *    meaning one fewer base 1e7 value has to be converted to bytes.
 *    [..., 9999999, 9999999, 9999999, 9999999, 9999999 ...] => [..., , NINES_SIGNIFIER, 5, ...]
 *    meaning three fewer base 1e7 values have to be converted to bytes.
 *    [..., 0, 0, 0, 0, ..., 0, 0, 0, 0, 0, 0, 0, 0, ...] => [..., ZEROS_SIGNIFIER, 4, ..., ZEROS_SIGNIFIER, 8, ...]
 *    meaning eight fewer base 1e7 values have to be converted to bytes.
 *
 * The maximum exponent magnitude of a Decimal value is
 * 0b00011111_11111001_01110011_11001010_11111010_10000000_00000000 = 9e15
 * so up to 7 bytes may be required to represent it.
 *
 * The highest signed 32-bit integer is 0b01111111_11111111_11111111_11111111 | 0 =  2147483647
 * The lowest  signed 32-bit integer is 0b10000000_00000000_00000000_00000001 | 0 = -2147483647
 *
 */
