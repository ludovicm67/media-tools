// @ts-check
import { Buffer } from 'buffer/index.js'

/**
 * Convert a Blob to a Buffer.
 *
 * @param {Blob} blob The blob to convert.
 * @returns {Promise<Buffer>} The blob as a Buffer.
 */
export const blobToArrayBuffer = async (blob) => {
  const arrayBuffer = await blob.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return buffer
}
