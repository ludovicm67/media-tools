import { readBoxSize, readBoxType } from "./base.js";

export interface FtypBox {
  majorBrand: string;
  minorVersion: number;
  compatibleBrands: string[];
}

/**
 * Parse a 'ftyp' box.
 *
 * @param buffer The buffer to read from.
 * @param index The index at which to start reading.
 * @param size The size of the box.
 * @returns The parsed box.
 */
export const parseFtypBox = (buffer: Buffer, index: number, size: number): FtypBox => {
  // The 'ftyp' box has the following fields:
  // - majorBrand: a 4-byte string
  // - minorVersion: a 4-byte integer
  // - compatibleBrands: a series of 4-byte strings, until the end of the box

  let offset = index + 8; // Skip the size and type fields

  const majorBrand = buffer.toString("ascii", offset, offset + 4);
  offset += 4;

  const minorVersion = buffer.readUInt32BE(offset);
  offset += 4;

  const compatibleBrands: string[] = [];
  while (offset < index + size) {
    const brand = buffer.toString("ascii", offset, offset + 4);
    compatibleBrands.push(brand);
    offset += 4;
  }

  return { majorBrand, minorVersion, compatibleBrands };
};

export interface SubBox {
  type: string;
  size: number;
}

export interface MoovBox {
  type: string;
  subBoxes: SubBox[];
}

/**
 * Parse a 'moov' box.
 *
 * @param buffer The buffer to read from.
 * @param index The index at which to start reading.
 * @param size The size of the box.
 * @returns The parsed box.
 */
export const parseMoovBox = (buffer: Buffer, index: number, size: number): MoovBox => {
  let offset = index + 8; // Skip the size and type fields

  const subBoxes: SubBox[] = [];
  while (offset < index + size) {
    const subBoxSize = readBoxSize(buffer, offset);
    const subBoxType = readBoxType(buffer, offset);
    subBoxes.push({ type: subBoxType, size: subBoxSize });
    offset += subBoxSize;
  }

  return { type: "moov", subBoxes };
};

export interface MdatBox {
  type: string;
  dataStart: number;
  dataSize: number;
}

/**
 * Parse a 'mdat' box.
 *
 * @param _buffer The buffer to read from.
 * @param index The index at which to start reading.
 * @param size The size of the box.
 * @returns The parsed box.
 */
export const parseMdatBox = (_buffer: Buffer, index: number, size: number): MdatBox => {
  const dataStart = index + 8; // The actual data starts after the size (4 bytes) and type (4 bytes)

  return {
    type: "mdat",
    dataStart,
    dataSize: size - 8, // Subtracting the header size (8 bytes)
  };
};

export interface MoofBox {
  type: string;
  subBoxes: SubBox[];
}

/**
 * Parse a 'moof' box.
 *
 * @param buffer The buffer to read from.
 * @param index The index at which to start reading.
 * @param size The size of the box.
 * @returns The parsed box.
 */
export const parseMoofBox = (buffer: Buffer, index: number, size: number): MoofBox => {
  let offset = index + 8; // Skip the size and type fields

  const subBoxes: SubBox[] = [];
  while (offset < index + size) {
    const subBoxSize = readBoxSize(buffer, offset);
    const subBoxType = readBoxType(buffer, offset);
    subBoxes.push({ type: subBoxType, size: subBoxSize });
    offset += subBoxSize;
  }

  return { type: "moof", subBoxes };
};
