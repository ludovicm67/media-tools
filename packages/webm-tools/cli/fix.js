// @ts-check

import { writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fix as fixWebMChunk } from '../lib/index.js'

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

  const newFile = await fixWebMChunk(prevChunk, brokenChunk, { debug })

  writeFileSync(outputPath, newFile)
}

export default fix
