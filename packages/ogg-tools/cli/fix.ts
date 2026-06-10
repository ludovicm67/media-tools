import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fix as fixOggChunk } from "../index.js";

/**
 * Fix a OGG file using the previous chunk.
 * The previous chunk should be a sane chunk.
 * It should be the one that is right before the broken chunk.
 *
 * @param prevChunkPath The path to the previous (sane) chunk.
 * @param brokenChunkPath The path to the broken chunk.
 * @param options Options from the CLI.
 */
const fix = async (prevChunkPath: string, brokenChunkPath: string, options: Record<string, unknown>): Promise<void> => {
  const debug = options.debug as boolean | undefined;
  const outputPath = options.out as string;

  if (debug) {
    console.info("Debug mode enabled");
    console.log(`> Previous chunk path: ${prevChunkPath}`);
    console.log(`> Broken chunk path: ${brokenChunkPath}`);
    console.log(`> Output path: ${outputPath}`);
    console.log("");
  }

  const prevChunk = (await readFile(prevChunkPath)) as unknown as Buffer;
  const brokenChunk = (await readFile(brokenChunkPath)) as unknown as Buffer;

  const filedata = fixOggChunk(prevChunk, brokenChunk, { debug });

  if (debug) {
    console.info(`\nWriting fixed chunk to file: '${outputPath}'`);
  }

  writeFileSync(outputPath, filedata);
};

export default fix;
