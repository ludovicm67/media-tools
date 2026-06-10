import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

/**
 * Merge MP4 chunks together.
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

  const otherChunks: Buffer[] = [];
  const secondChunk = await readFile(secondChunkPath);
  otherChunks.push(secondChunk as unknown as Buffer);
  for (const otherChunkPath of otherChunksPaths) {
    const otherChunk = await readFile(otherChunkPath);
    otherChunks.push(otherChunk as unknown as Buffer);
  }

  const newFile = Buffer.concat([firstChunk as unknown as Buffer, ...otherChunks]);

  writeFileSync(outputPath, newFile);
};

export default merge;
