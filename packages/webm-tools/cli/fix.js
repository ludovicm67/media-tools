// @ts-check
import { writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { decode, resetDecoder, displayDecodedElements } from '../lib/ebml.js'

/**
 * Fix a WebM file using the previous chunk.
 * The previous chunk should be a sane chunk.
 * It should be the one that is right before the broken chunk.
 *
 * @param {string} prevChunkPath The path to the previous (sane) chunk.
 * @param {string} brokenChunkPath The path to the broken chunk.
 * @param {Record<string, any>} options Options from the CLI.
 */
const fix = async (prevChunkPath, brokenChunkPath, options) => {
  const { debug } = options
  const outputPath = options.out

  if (debug) {
    console.info('Debug mode enabled')
    console.log(`> Previous chunk path: ${prevChunkPath}`)
    console.log(`> Broken chunk path: ${brokenChunkPath}`)
    console.log(`> Output path: ${outputPath}`)
    console.log('')
  }

  const prevChunk = await readFile(prevChunkPath)
  const brokenChunk = await readFile(brokenChunkPath)

  resetDecoder({
    debug: false
  })
  const { decoded, headerBuffer, lastStartBuffer } = decode(prevChunk)
  if (debug) {
    console.info('\nDecoded previous chunk:')
    displayDecodedElements(decoded)
    console.log('')
  }

  const newFile = Buffer.concat([headerBuffer, lastStartBuffer, brokenChunk])
  resetDecoder({
    debug: false
  })
  const { decoded: newFileDecoded } = decode(newFile)
  if (debug) {
    console.info('\nDecoded fixed chunk:')
    displayDecodedElements(newFileDecoded)
    console.log('')

    console.info(`\nWriting fixed chunk to file: '${outputPath}'`)
  }

  writeFileSync(outputPath, newFile)
}

export default fix
