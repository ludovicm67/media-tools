// @ts-check

import { Buffer, utils } from '@ludovicm67/media-tools-utils'

const OGG_FIXED_HEADER_SIZE = 27 // Fixed part of the OGG page header

/**
 * OGG page type.
 *
 * @typedef {"Unknown" | "Opus Head" | "Opus Tags" | "Vorbis Identification Header" | "Vorbis Comment Header" | "Vorbis Setup Header" | "Theora Identification Header" | "Theora Comment Header" | "Theora Setup Header" | "Speex Audio"} OGGPageType
 */

/**
 * Internal representation of a OGG page.
 *
 * @typedef {Object} OGGPage
 * @property {OGGPageType} type The type of the page.
 * @property {boolean} isMetadata Whether the page is a metadata page or not.
 * @property {import('@ludovicm67/media-tools-utils').Buffer} content The content of the page.
 */

/**
 * Internal representation of a OGG file.
 *
 * @typedef {Object} OGGParsedFile
 * @property {Array<OGGPage>} pages The pages of the file.
 * @property {import('@ludovicm67/media-tools-utils').Buffer} rest The rest of the file.
 * @property {boolean} isIncomplete Whether the file is incomplete or not.
 */

/**
 * Build a OGG file from the given data.
 * If the data is not complete, the rest of the file will be returned in the `rest` property.
 * If the data is complete, the rest will be empty.
 *
 * @param {OGGParsedFile} data The data to build the file from.
 * @param {OGGParsedFile?} [context] The context to use to build the file, usually the previous parsed chunk.
 * @returns {{ filedata: import('@ludovicm67/media-tools-utils').Buffer, rest: import('@ludovicm67/media-tools-utils').Buffer }} The built file and the rest of the file.
 */
export const buildFile = (data, context) => {
  const { pages: currentPages, rest } = data
  const { pages: firstPages, rest: firstRest } = context || { pages: [], rest: Buffer.from([]) }
  const currentMetadataPages = currentPages.filter((page) => page.isMetadata).map((page) => page.content)
  const currentDataPages = currentPages.filter((page) => !page.isMetadata).map((page) => page.content)
  const firstMetadataPages = firstPages.filter((page) => page.isMetadata).map((page) => page.content)

  const metadataPages = Buffer.concat([...firstMetadataPages, ...currentMetadataPages])

  if (metadataPages.length === 0) {
    throw new Error('Missing metadata pages')
  }

  const filedata = Buffer.concat([metadataPages, firstRest, ...currentDataPages])

  return {
    filedata,
    rest
  }
}

/**
 * Parse a OGG file from a Buffer.
 *
 * @param {import('@ludovicm67/media-tools-utils').Buffer} fileBuffer The file to parse as a Buffer.
 * @returns {OGGParsedFile} The parsed file.
 */
export const parse = (fileBuffer) => {
  let position = 0
  let isIncomplete = false
  const oggPages = []

  while (position + OGG_FIXED_HEADER_SIZE < fileBuffer.length) {
    // Check if the current position is the start of an OGG page
    if (fileBuffer.slice(position, position + 4).toString() !== 'OggS') {
      console.debug('Invalid OGG page header')
      break
    }

    // Last byte of the fixed header indicates the number of segments in the page
    const pageSegments = fileBuffer[position + OGG_FIXED_HEADER_SIZE - 1]
    const headerSize = OGG_FIXED_HEADER_SIZE + pageSegments
    let pageSize = headerSize

    // Calculate the total size of the OGG page.
    // Each entry in the segment table (immediately following the fixed header) indicates the length of a segment in the page.
    // This loop sums up the lengths of all segments to determine the full size of the page.
    for (let i = 0; i < pageSegments; i++) {
      pageSize += fileBuffer[position + OGG_FIXED_HEADER_SIZE + i]
    }

    // Check if the calculated end of the page exceeds the length of the file buffer.
    // If it does, it means the page is incomplete or the file is truncated, so we break out of the loop.
    if (position + pageSize > fileBuffer.length) {
      isIncomplete = true
      break
    }

    const pageData = fileBuffer.slice(position, position + pageSize)

    // Check the first few bytes of the first packet for a known type
    let type = (/** @type {OGGPageType} */ ('Unknown'))
    if (pageData.length > headerSize + 8) {
      const packetStart = headerSize
      const packetSignature = pageData.slice(packetStart, packetStart + 8).toString()

      // Support for Opus, Vorbis, Theora, and Speex
      if (packetSignature.startsWith('OpusHead')) {
        type = 'Opus Head'
      } else if (packetSignature.startsWith('OpusTags')) {
        type = 'Opus Tags'
      } else if (packetSignature.startsWith('\x01vorbis')) {
        type = 'Vorbis Identification Header'
      } else if (packetSignature.startsWith('\x03vorbis')) {
        type = 'Vorbis Comment Header'
      } else if (packetSignature.startsWith('\x05vorbis')) {
        type = 'Vorbis Setup Header'
      } else if (packetSignature.startsWith('\x01theora')) {
        type = 'Theora Identification Header'
      } else if (packetSignature.startsWith('\x03theora')) {
        type = 'Theora Comment Header'
      } else if (packetSignature.startsWith('\x05theora')) {
        type = 'Theora Setup Header'
      } else if (packetSignature.startsWith('Speex ')) {
        type = 'Speex Audio'
      }
    }

    oggPages.push({
      type,
      isMetadata: type !== 'Unknown',
      content: pageData,
      length: pageSize
    })

    position += pageSize
  }

  return {
    pages: oggPages,
    rest: fileBuffer.slice(position),
    isIncomplete
  }
}

/**
 * @typedef {Object} LibOptions
 * @property {boolean?} debug Whether to enable debug mode or not.
 */

/**
 * Fix a OGG file using the previous chunk.
 * The previous chunk should be a sane chunk.
 * It should be the one that is right before the broken chunk.
 *
 * @param {import('@ludovicm67/media-tools-utils').Buffer} prevChunk Content of the previous (sane) chunk.
 * @param {import('@ludovicm67/media-tools-utils').Buffer} brokenChunk Content of the broken chunk.
 * @param {LibOptions?} options Options.
 * @returns {import('@ludovicm67/media-tools-utils').Buffer} The fixed chunk.
 */
export const fix = (prevChunk, brokenChunk, options) => {
  const { debug } = options || {}

  const parsedPrevChunk = parse(prevChunk)
  const prevChunkRest = parsedPrevChunk.rest || Buffer.from([])
  const brokenChunkMerge = Buffer.concat([prevChunkRest, brokenChunk])
  const parsedBrokenChunk = parse(brokenChunkMerge)
  const { filedata, rest } = buildFile(parsedBrokenChunk, parsedPrevChunk)

  if (debug) {
    console.log('Rest:', rest)
  }

  return filedata
}

export {
  utils,
  Buffer
}
