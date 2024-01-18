// @ts-check

/**
 * Read the size of a box from the given buffer.
 *
 * @param {Buffer} buffer The buffer to read from.
 * @param {number} index The index at which to start reading.
 * @returns {number} The size of the box.
 */
export const readBoxSize = (buffer, index) => {
  let size = buffer.readUInt32BE(index)

  if (size === 1) {
    // If the size is 1, the actual size is stored in the next 8 bytes.
    // JavaScript bitwise operators treat their operands as a sequence of 32 bits,
    // so we need to use readUInt32BE twice.
    const highBits = buffer.readUInt32BE(index + 4)
    const lowBits = buffer.readUInt32BE(index + 8)
    size = (highBits * 0x100000000) + lowBits
  }

  return size
}

/**
 * Read the type of a box from the given buffer.
 *
 * @param {Buffer} buffer The buffer to read from.
 * @param {number} index The index at which to start reading.
 * @returns {string} The type of the box.
 */
export const readBoxType = (buffer, index) => {
  // The type is the 4 bytes following the size.
  return buffer.toString('ascii', index + 4, index + 8)
}
