// @ts-check

import { writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { buildFile, parse } from '../index.js'

/**
 * Fix a MP4 file using the previous chunk.
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

  const parsedPrevChunk = parse(prevChunk)
  const prevChunkRest = parsedPrevChunk.rest || Buffer.alloc(0)
  const brokenChunkMerge = Buffer.concat([prevChunkRest, brokenChunk])
  const parsedBrokenChunk = parse(brokenChunkMerge)

  const { filedata, rest } = buildFile(parsedBrokenChunk, parsedPrevChunk)

  if (debug) {
    console.log('Rest:', rest)
    console.info(`\nWriting fixed chunk to file: '${outputPath}'`)
  }

  writeFileSync(outputPath, filedata)
}

export default fix
