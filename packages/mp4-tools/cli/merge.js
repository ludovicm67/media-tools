// @ts-check
import { writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

/**
 * Merge MP4 chunks together.
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

  const otherChunks = []
  const secondChunk = await readFile(secondChunkPath)
  otherChunks.push(secondChunk)
  for (const otherChunkPath of otherChunksPaths) {
    const otherChunk = await readFile(otherChunkPath)
    otherChunks.push(otherChunk)
  }

  const newFile = Buffer.concat([firstChunk, ...otherChunks])

  writeFileSync(outputPath, newFile)
}

export default merge
