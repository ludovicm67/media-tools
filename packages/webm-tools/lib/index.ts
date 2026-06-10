import { displayDecodedElements } from "./tools.js";
import { decode } from "./decoder.js";
import { Buffer } from "@ludovicm67/media-tools-utils";

export interface LibOptions {
  /** Whether to enable debug mode or not. */
  debug?: boolean;
}

/**
 * Fix a WebM file using the previous chunk.
 * The previous chunk should be a sane chunk.
 * It should be the one that is right before the broken chunk.
 *
 * @param prevChunk Content of the previous (sane) chunk.
 * @param brokenChunk Content of the broken chunk.
 * @param options Options.
 * @returns The fixed chunk.
 */
export const fix = (prevChunk: Buffer, brokenChunk: Buffer, options?: LibOptions): Buffer => {
  const { debug } = options || {};

  const { decoded, headerBuffer, lastStartBuffer } = decode(prevChunk);
  if (debug) {
    console.info("\nDecoded previous chunk:");
    displayDecodedElements(decoded);
    console.log("");
  }

  const newFile = Buffer.concat([headerBuffer, lastStartBuffer, brokenChunk]);
  const { decoded: newFileDecoded, buffer: newFileBuffer } = decode(newFile, {
    fixTimestamps: true,
  });
  if (debug) {
    console.info("\nDecoded fixed chunk:");
    displayDecodedElements(newFileDecoded);
    console.log("");
  }

  return newFileBuffer;
};

/**
 * Display information of a WebM file.
 *
 * @param fileBuffer Content of the file to display.
 */
export const display = (fileBuffer: Buffer): void => {
  const { decoded } = decode(fileBuffer);
  displayDecodedElements(decoded);
};
