// @ts-check

import { writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { decode, resetDecoder, displayDecodedElements } from '../lib/ebml.js'

/**
 * Merge WebM chunks together.
 * The first chunk should be a sane chunk.
 *
 * @param {string} firstChunkPath Path to the first chunk of the file.
 * @param {string} secondChunkPath Path to the second chunk of the file.
 * @param {string[]} otherChunksPaths Other chunks to merge together.
 * @param {Record<string, any>} options Options from the CLI.
 */
const merge = async (firstChunkPath, secondChunkPath, otherChunksPaths, options) => {
  const debug = options.debug
  const outputPath = options.out

  if (debug) {
    console.info('Debug mode enabled')
    console.log(`> First chunk path: ${firstChunkPath}`)
    console.log(`> Second chunk path: ${secondChunkPath}`)
    console.log(`> Other chunks paths: ${otherChunksPaths}`)
    console.log(`> Output path: ${outputPath}`)
    console.log('')
  }

  const firstChunk = await readFile(firstChunkPath)
  resetDecoder({
    debug: false
  })
  const { decoded } = decode(firstChunk)
  if (debug) {
    console.info('\nDecoded first chunk:')
    displayDecodedElements(decoded)
    console.log('')
  }

  const otherChunks = []
  const secondChunk = await readFile(secondChunkPath)
  otherChunks.push(secondChunk)
  for (const otherChunkPath of otherChunksPaths) {
    const otherChunk = await readFile(otherChunkPath)
    otherChunks.push(otherChunk)
  }

  const newFile = Buffer.concat([firstChunk, ...otherChunks])
  resetDecoder({
    debug: false
  })
  const { decoded: newFileDecoded } = decode(newFile)
  if (debug) {
    console.info('\nDecoded merged chunk (if it looks great, the merge was sucessful):')
    displayDecodedElements(newFileDecoded)
    console.log('')

    console.info(`\nWriting merged chunk to file: '${outputPath}'`)
  }

  writeFileSync(outputPath, newFile)
}

export default merge
