// @ts-check

import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fix as fixMP4Chunk } from "../index.js";

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
  const { debug } = options;
  const outputPath = options.out;

  if (debug) {
    console.info("Debug mode enabled");
    console.log(`> Previous chunk path: ${prevChunkPath}`);
    console.log(`> Broken chunk path: ${brokenChunkPath}`);
    console.log(`> Output path: ${outputPath}`);
    console.log("");
  }

  const prevChunk =
    /** @type {import('@ludovicm67/media-tools-utils').Buffer} */ (
      /** @type {unknown} */ (await readFile(prevChunkPath))
    );
  const brokenChunk =
    /** @type {import('@ludovicm67/media-tools-utils').Buffer} */ (
      /** @type {unknown} */ (await readFile(brokenChunkPath))
    );

  const filedata = fixMP4Chunk(prevChunk, brokenChunk, { debug });

  if (debug) {
    console.info(`\nWriting fixed chunk to file: '${outputPath}'`);
  }

  writeFileSync(outputPath, filedata);
};

export default fix;
