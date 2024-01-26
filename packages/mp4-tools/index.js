// @ts-check

import { readBoxSize, readBoxType } from './lib/base.js'

export { readBoxSize, readBoxType } from './lib/base.js'
export { parseFtypBox, parseMoovBox, parseMoofBox, parseMdatBox } from './lib/boxes.js'

export { Buffer, utils } from '@ludovicm67/media-tools-utils'

/**
 * Internal representation of a MP4 file.
 *
 * @typedef {Object} MP4ParsedFile
 * @property {Buffer} ftyp The ftyp box.
 * @property {Buffer} moov The moov box.
 * @property {Array<{ type: string, data: Buffer }>} chunks The chunks of the file.
 * @property {Buffer} rest The rest of the file.
 */

/**
 * Build a MP4 file from the given data.
 * If the data is not complete, the rest of the file will be returned in the `rest` property.
 * If the data is complete, the rest will be empty.
 *
 * @param {MP4ParsedFile} data The data to build the file from.
 * @param {MP4ParsedFile?} [context={}] The context to use to build the file, usually the previous parsed chunk.
 * @returns {{ filedata: Buffer, rest: Buffer }} The built file and the rest of the file.
 */
export const buildFile = (data, context) => {
  let { ftyp, moov, chunks, rest } = data
  const { ftyp: ftypContext, moov: moovContext } = context || {}
  if (!ftyp) {
    ftyp = ftypContext
  }
  if (!moov) {
    moov = moovContext
  }

  if (!ftyp || !moov || !chunks) {
    throw new Error('Missing required boxes')
  }

  if (!Array.isArray(chunks)) {
    throw new Error('Chunks should be an array')
  }

  const verifiedChunks = []
  const additionalRest = []
  for (let i = 0; i < chunks.length; i += 2) {
    const firstItem = chunks[i]

    // If the first item is not a moof, we need to add it and everything after to the rest
    if (firstItem.type !== 'moof') {
      for (let j = i; j < chunks.length; j++) {
        additionalRest.push(chunks[j].data)
      }
      break
    }

    // Make sure we have a second item, as we need a moof followed by a mdat
    if (i + 1 >= chunks.length) {
      additionalRest.push(firstItem.data)
      break
    }

    // Check if the second item exists within the bounds of the array
    const secondItem = chunks[i + 1]
    if (secondItem.type !== 'mdat') {
      throw new Error('Second item is not a mdat')
    }

    verifiedChunks.push(firstItem.data)
    verifiedChunks.push(secondItem.data)
  }

  const currentRest = rest || Buffer.from([])
  const filedata = Buffer.concat([ftyp, moov, ...verifiedChunks])

  return {
    filedata,
    rest: Buffer.concat([currentRest, ...additionalRest])
  }
}

/**
 * Parse a MP4 file from a Buffer.
 *
 * @param {Buffer} fileBuffer The file to parse as a Buffer.
 * @returns {MP4ParsedFile} The parsed file.
 */
export const parse = (fileBuffer) => {
  let currentIndex = 0

  const data = {
    ftyp: null,
    moov: null,
    chunks: [],
    rest: null
  }

  while (currentIndex < fileBuffer.length) {
    const boxSize = readBoxSize(fileBuffer, currentIndex)
    const boxType = readBoxType(fileBuffer, currentIndex)

    // Prevent the parser from parsing not complete boxes
    if (currentIndex + boxSize > fileBuffer.length) {
      data.rest = fileBuffer.subarray(currentIndex)
      break
    }

    const boxData = fileBuffer.subarray(currentIndex, currentIndex + boxSize)

    // Handle boxes
    switch (boxType) {
      case 'ftyp':
        data.ftyp = boxData
        break
      case 'moov':
        data.moov = boxData
        break
      case 'moof':
        data.chunks.push({
          type: 'moof',
          data: boxData
        })
        break
      case 'mdat':
        data.chunks.push({
          type: 'mdat',
          data: boxData
        })
        break
    }

    currentIndex += boxSize
  }

  return data
}

/**
 * @typedef {Object} LibOptions
 * @property {boolean?} debug Whether to enable debug mode or not.
 */

/**
 * Fix a MP4 file using the previous chunk.
 * The previous chunk should be a sane chunk.
 * It should be the one that is right before the broken chunk.
 *
 * @param {Buffer} prevChunk Content of the previous (sane) chunk.
 * @param {Buffer} brokenChunk Content of the broken chunk.
 * @param {LibOptions?} options Options.
 * @returns {Buffer} The fixed chunk.
 */
export const fix = (prevChunk, brokenChunk, options) => {
  const { debug } = options || {}

  const parsedPrevChunk = parse(prevChunk)
  const prevChunkRest = parsedPrevChunk.rest || Buffer.alloc(0)
  const brokenChunkMerge = Buffer.concat([prevChunkRest, brokenChunk])
  const parsedBrokenChunk = parse(brokenChunkMerge)
  const { filedata, rest } = buildFile(parsedBrokenChunk, parsedPrevChunk)

  if (debug) {
    console.log('Rest:', rest)
  }

  return filedata
}
