// @ts-check

import { readFile } from 'node:fs/promises'
import { display as displayWebM } from '../lib/index.js'

/**
 * Display information about a WebM file.
 *
 * @param {string} fileName The path to the previous (sane) chunk.
 * @param {Record<string, any>} options Options from the CLI.
 */
const display = async (fileName, options) => {
  const { debug } = options

  if (debug) {
    console.info('Debug mode enabled')
    console.log(`> File path: ${fileName}`)
    console.log('')
  }

  const fileBuffer = /** @type {import('@ludovicm67/media-tools-utils').Buffer} */ (/** @type {unknown} */ (await readFile(fileName)))

  displayWebM(fileBuffer)
}

export default display
