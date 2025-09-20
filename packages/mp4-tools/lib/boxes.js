// @ts-check

import { readBoxSize, readBoxType } from "./base.js";

/**
 * @typedef {Object} FtypBox
 * @property {string} majorBrand The major brand of the file.
 * @property {number} minorVersion The minor version of the file.
 * @property {Array<string>} compatibleBrands The compatible brands of the file.
 */

/**
 * Parse a 'ftyp' box.
 *
 * @param {import('@ludovicm67/media-tools-utils').Buffer} buffer The buffer to read from.
 * @param {number} index The index at which to start reading.
 * @param {number} size The size of the box.
 * @returns {FtypBox} The parsed box.
 */
export const parseFtypBox = (buffer, index, size) => {
  // The 'ftyp' box has the following fields:
  // - majorBrand: a 4-byte string
  // - minorVersion: a 4-byte integer
  // - compatibleBrands: a series of 4-byte strings, until the end of the box

  let offset = index + 8; // Skip the size and type fields

  const majorBrand = buffer.toString("ascii", offset, offset + 4);
  offset += 4;

  const minorVersion = buffer.readUInt32BE(offset);
  offset += 4;

  const compatibleBrands = [];
  while (offset < index + size) {
    const brand = buffer.toString("ascii", offset, offset + 4);
    compatibleBrands.push(brand);
    offset += 4;
  }

  return {
    majorBrand,
    minorVersion,
    compatibleBrands,
  };
};

/**
 * @typedef {Object} MoovBox
 * @property {string} type The type of the box.
 * @property {Array<{type: string, size: number}>} subBoxes The sub boxes of the box.
 */

/**
 * Pase a 'moov' box.
 *
 * @param {import('@ludovicm67/media-tools-utils').Buffer} buffer The buffer to read from.
 * @param {number} index The index at which to start reading.
 * @param {number} size The size of the box.
 * @returns {MoovBox} The parsed box.
 */
export const parseMoovBox = (buffer, index, size) => {
  let offset = index + 8; // Skip the size and type fields

  const subBoxes = [];
  while (offset < index + size) {
    const subBoxSize = readBoxSize(buffer, offset);
    const subBoxType = readBoxType(buffer, offset);
    subBoxes.push({ type: subBoxType, size: subBoxSize });
    offset += subBoxSize;
  }

  return {
    type: "moov",
    subBoxes,
  };
};

/**
 * @typedef {Object} MdatBox
 * @property {string} type The type of the box.
 * @property {number} dataStart The index at which the actual data starts.
 * @property {number} dataSize The size of the data.
 */

/**
 * Parse a 'mdat' box.
 *
 * @param {import('@ludovicm67/media-tools-utils').Buffer} _buffer The buffer to read from.
 * @param {number} index The index at which to start reading.
 * @param {number} size The size of the box.
 * @returns {MdatBox} The parsed box.
 */
export const parseMdatBox = (_buffer, index, size) => {
  const dataStart = index + 8; // The actual data starts after the size (4 bytes) and type (4 bytes)

  return {
    type: "mdat",
    dataStart,
    dataSize: size - 8, // Subtracting the header size (8 bytes)
  };
};

/**
 * @typedef {Object} MoofBox
 * @property {string} type The type of the box.
 * @property {Array<{type: string, size: number}>} subBoxes The sub boxes of the box.
 */

/**
 * Parse a 'moof' box.
 *
 * @param {import('@ludovicm67/media-tools-utils').Buffer} buffer The buffer to read from.
 * @param {number} index The index at which to start reading.
 * @param {number} size The size of the box.
 * @returns {MoofBox} The parsed box.
 */
export const parseMoofBox = (buffer, index, size) => {
  let offset = index + 8; // Skip the size and type fields

  const subBoxes = [];
  while (offset < index + size) {
    const subBoxSize = readBoxSize(buffer, offset);
    const subBoxType = readBoxType(buffer, offset);
    subBoxes.push({ type: subBoxType, size: subBoxSize });
    offset += subBoxSize;
  }

  return {
    type: "moof",
    subBoxes,
  };
};
