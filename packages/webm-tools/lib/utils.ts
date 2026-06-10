const INT8_MIN = -128;
const INT8_MAX = 127;
const INT16_MIN = -32768;
const INT16_MAX = 32767;
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

/**
 * Read variable length integer per:
 * https://www.matroska.org/technical/specs/index.html#EBML_ex
 *
 * @param buffer containing input
 * @param start position in buffer
 * @returns value / length object
 */
export const readVint = (buffer: Buffer, start = 0): { length: number; value: number } | null => {
  const length = 8 - Math.floor(Math.log2(buffer[start]));
  if (length > 8) {
    const number = readHexString(buffer, start, start + length);
    throw new Error(`Unrepresentable length: ${length} ${number}`);
  }

  if (start + length > buffer.length) {
    return null;
  }

  let value = buffer[start] & ((1 << (8 - length)) - 1);
  for (let i = 1; i < length; i += 1) {
    if (i === 7) {
      if (value >= 2 ** 8 && buffer[start + 7] > 0) {
        return { length, value: -1 };
      }
    }
    value *= 2 ** 8;
    value += buffer[start + i];
  }

  return { length, value };
};

/**
 * Get a hex text string from Buff[start,end).
 *
 * @param buff from which to read the string
 * @param start starting point (default 0)
 * @param end ending point (default the whole buffer)
 * @returns the hex string
 */
export const readHexString = (buff: Buffer, start = 0, end = buff.byteLength): string => {
  return Array.from(buff.subarray(start, end))
    .map((q) => Number(q).toString(16))
    .reduce((acc, current) => `${acc}${current.padStart(2, "0")}`, "");
};

/**
 * Concatenate two arrays of bytes.
 *
 * @param a1 First array
 * @param a2 Second array
 * @returns concatenated arrays
 */
export const concatenate = (a1: Buffer | null | undefined, a2: Buffer | null | undefined): Buffer => {
  // both null or undefined
  if (!a1 && !a2) {
    return Buffer.from([]);
  }
  if (!a1 || a1.byteLength === 0) {
    return a2!;
  }
  if (!a2 || a2.byteLength === 0) {
    return a1;
  }

  return Buffer.concat([a1, a2]);
};

/**
 * Tries to read out a UTF-8 encoded string.
 *
 * @param buff the buffer to attempt to read from
 * @returns the decoded text, or null if unable to
 */
export const readUtf8 = (buff: Buffer): string | null => {
  try {
    return Buffer.from(buff).toString("utf8");
  } catch {
    return null;
  }
};

/**
 * Get an unsigned number from a buffer.
 *
 * @param buff from which to read variable-length unsigned number
 * @returns result (in hex for lengths > 6)
 */
export const readUnsigned = (buff: Buffer): number | string => {
  const b = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
  switch (buff.byteLength) {
    case 1:
      return b.getUint8(0);
    case 2:
      return b.getUint16(0);
    case 4:
      return b.getUint32(0);
    default:
      break;
  }
  if (buff.byteLength <= 6) {
    return buff.reduce((acc, current) => acc * 256 + current, 0);
  }

  return readHexString(buff, 0, buff.byteLength);
};

/**
 * Write an unsigned number to a buffer at a given offset.
 *
 * @param buff The buffer to write to.
 * @param offset The offset in the buffer to start writing.
 * @param num The unsigned number to write.
 */
export const writeUnsigned = (buff: Buffer, offset: number, num: number): void => {
  if (num < 0 || !Number.isInteger(num)) {
    throw new Error("Number must be a non-negative integer");
  }

  if (num <= 0xff) {
    // Fits in 1 byte
    buff.writeUInt8(num, offset);
  } else if (num <= 0xffff) {
    // Fits in 2 bytes
    buff.writeUInt16BE(num, offset);
  } else if (num <= 0xffffffff) {
    // Fits in 4 bytes
    buff.writeUInt32BE(num, offset);
  } else {
    // For numbers larger than can fit in 4 bytes
    let tempNum = num;
    for (let i = offset + 5; i >= offset; i--) {
      buff.writeUInt8(tempNum & 0xff, i);
      tempNum = tempNum >> 8;
    }
  }
};

/**
 * Get a signed number from a buffer.
 *
 * @param buff from which to read variable-length signed number
 * @returns result
 */
export const readSigned = (buff: Buffer): number => {
  const b = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
  switch (buff.byteLength) {
    case 1:
      return b.getInt8(0);
    case 2:
      return b.getInt16(0);
    case 4:
      return b.getInt32(0);
    default:
      return NaN;
  }
};

/**
 * Write a signed number to a buffer at a given offset.
 *
 * @param buff The buffer to write to.
 * @param offset The offset in the buffer to start writing.
 * @param size The size in bytes to write (1, 2, or 4).
 * @param num The number to write.
 */
export const writeSigned = (buff: Buffer, offset: number, size: number, num: number): void => {
  switch (size) {
    case 1:
      if (num < INT8_MIN || num > INT8_MAX) {
        throw new Error("Number does not fit in 1 byte");
      }
      buff.writeInt8(num, offset);
      break;
    case 2:
      if (num < INT16_MIN || num > INT16_MAX) {
        throw new Error("Number does not fit in 2 bytes");
      }
      buff.writeInt16BE(num, offset);
      break;
    case 4:
      if (num < INT32_MIN || num > INT32_MAX) {
        throw new Error("Number does not fit in 4 bytes");
      }
      buff.writeInt32BE(num, offset);
      break;
    default:
      throw new Error("Invalid size; must be 1, 2, or 4 bytes");
  }
};

/**
 * Get a floating-point number from a buffer.
 *
 * @param buff from which to read variable-length floating-point number
 * @returns result
 */
export const readFloat = (buff: Buffer): number => {
  const b = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
  switch (buff.byteLength) {
    case 4:
      return b.getFloat32(0);
    case 8:
      return b.getFloat64(0);
    default:
      return NaN;
  }
};

/**
 * Get a date from a buffer.
 *
 * @param buff from which to read the date
 * @returns result
 */
export const readDate = (buff: Buffer): Date => {
  const b = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
  switch (buff.byteLength) {
    case 1:
      return new Date(b.getUint8(0));
    case 2:
      return new Date(b.getUint16(0));
    case 4:
      return new Date(b.getUint32(0));
    case 8:
      return new Date(Number.parseInt(readHexString(buff), 16));
    default:
      return new Date(0);
  }
};
