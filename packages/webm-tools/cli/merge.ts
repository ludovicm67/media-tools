import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { decode } from "../lib/decoder.js";
import { displayDecodedElements } from "../lib/tools.js";

/**
 * Merge WebM chunks together.
 * The first chunk should be a sane chunk.
 *
 * @param firstChunkPath Path to the first chunk of the file.
 * @param secondChunkPath Path to the second chunk of the file.
 * @param otherChunksPaths Other chunks to merge together.
 * @param options Options from the CLI.
 */
const merge = async (
  firstChunkPath: string,
  secondChunkPath: string,
  otherChunksPaths: string[],
  options: Record<string, unknown>,
): Promise<void> => {
  const debug = options.debug as boolean | undefined;
  const outputPath = options.out as string;

  if (debug) {
    console.info("Debug mode enabled");
    console.log(`> First chunk path: ${firstChunkPath}`);
    console.log(`> Second chunk path: ${secondChunkPath}`);
    console.log(`> Other chunks paths: ${otherChunksPaths}`);
    console.log(`> Output path: ${outputPath}`);
    console.log("");
  }

  const firstChunk = await readFile(firstChunkPath);
  const { decoded } = decode(firstChunk as unknown as Buffer);
  if (debug) {
    console.info("\nDecoded first chunk:");
    displayDecodedElements(decoded);
    console.log("");
  }

  const otherChunks: Buffer[] = [];
  const secondChunk = await readFile(secondChunkPath);
  otherChunks.push(secondChunk as unknown as Buffer);
  for (const otherChunkPath of otherChunksPaths) {
    const otherChunk = await readFile(otherChunkPath);
    otherChunks.push(otherChunk as unknown as Buffer);
  }

  const newFile = Buffer.concat([firstChunk as unknown as Buffer, ...otherChunks]);
  const { decoded: newFileDecoded } = decode(newFile as unknown as Buffer);
  if (debug) {
    console.info(
      "\nDecoded merged chunk (if it looks great, the merge was sucessful):",
    );
    displayDecodedElements(newFileDecoded);
    console.log("");

    console.info(`\nWriting merged chunk to file: '${outputPath}'`);
  }

  writeFileSync(outputPath, newFile);
};

export default merge;
