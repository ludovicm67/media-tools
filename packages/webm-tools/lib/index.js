// @ts-check

import { resetDecoder, decode, displayDecodedElements } from './ebml.js'
import { Buffer } from '@ludovicm67/media-tools-utils'

/**
 * @typedef {Object} LibOptions
 * @property {boolean} [debug] Whether to enable debug mode or not.
 */

/**
 * Fix a WebM file using the previous chunk.
 * The previous chunk should be a sane chunk.
 * It should be the one that is right before the broken chunk.
 *
 * @param {import('@ludovicm67/media-tools-utils').Buffer} prevChunk Content of the previous (sane) chunk.
 * @param {import('@ludovicm67/media-tools-utils').Buffer} brokenChunk Content of the broken chunk.
 * @param {LibOptions} [options={}] Options.
 * @returns {import('@ludovicm67/media-tools-utils').Buffer} The fixed chunk.
 */
export const fix = (prevChunk, brokenChunk, options) => {
  const { debug } = options || {}

  resetDecoder({
    debug: false,
    fixTimestamps: true
  })
  const { decoded, headerBuffer, lastStartBuffer } = decode(prevChunk)
  if (debug) {
    console.info('\nDecoded previous chunk:')
    displayDecodedElements(decoded)
    console.log('')
  }

  const newFile = Buffer.concat([headerBuffer, lastStartBuffer, brokenChunk])
  resetDecoder({
    debug: false,
    fixTimestamps: true
  })
  const { decoded: newFileDecoded } = decode(newFile)
  if (debug) {
    console.info('\nDecoded fixed chunk:')
    displayDecodedElements(newFileDecoded)
    console.log('')
  }

  return newFile
}

/**
 * Display information of a WebM file.
 *
 * @param {import('@ludovicm67/media-tools-utils').Buffer} fileBuffer Content of the file to display.
 * @returns {void}
 */
export const display = (fileBuffer) => {
  resetDecoder({
    debug: false,
    fixTimestamps: false
  })
  const { decoded } = decode(fileBuffer)
  displayDecodedElements(decoded)
}
