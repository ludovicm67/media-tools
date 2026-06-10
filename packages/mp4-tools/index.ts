import { readBoxSize, readBoxType } from "./lib/base.js";

import { Buffer, utils } from "@ludovicm67/media-tools-utils";

export { readBoxSize, readBoxType } from "./lib/base.js";
export {
  parseFtypBox,
  parseMoovBox,
  parseMoofBox,
  parseMdatBox,
} from "./lib/boxes.js";

export interface Chunk {
  type: string;
  data: Buffer;
}

/** Internal representation of a MP4 file. */
export interface MP4ParsedFile {
  /** The ftyp box. */
  ftyp: Buffer | null;
  /** The moov box. */
  moov: Buffer | null;
  /** The chunks of the file. */
  chunks: Chunk[];
  /** The rest of the file. */
  rest: Buffer | null;
}

export interface BuildFileResult {
  filedata: Buffer;
  rest: Buffer;
}

/**
 * Build a MP4 file from the given data.
 * If the data is not complete, the rest of the file will be returned in the `rest` property.
 * If the data is complete, the rest will be empty.
 *
 * @param data The data to build the file from.
 * @param context The context to use to build the file, usually the previous parsed chunk.
 * @returns The built file and the rest of the file.
 */
export const buildFile = (data: MP4ParsedFile, context?: Partial<MP4ParsedFile>): BuildFileResult => {
  let { ftyp, moov, chunks, rest } = data;
  const { ftyp: ftypContext, moov: moovContext } = context || {};
  if (!ftyp) ftyp = ftypContext ?? null;
  if (!moov) moov = moovContext ?? null;

  if (!ftyp || !moov || !chunks) {
    throw new Error("Missing required boxes");
  }

  if (!Array.isArray(chunks)) {
    throw new Error("Chunks should be an array");
  }

  const verifiedChunks: Buffer[] = [];
  const additionalRest: Buffer[] = [];
  for (let i = 0; i < chunks.length; i += 2) {
    const firstItem = chunks[i];

    // If the first item is not a moof, we need to add it and everything after to the rest
    if (firstItem.type !== "moof") {
      for (let j = i; j < chunks.length; j++) {
        additionalRest.push(chunks[j].data);
      }
      break;
    }

    // Make sure we have a second item, as we need a moof followed by a mdat
    if (i + 1 >= chunks.length) {
      additionalRest.push(firstItem.data);
      break;
    }

    // Check if the second item exists within the bounds of the array
    const secondItem = chunks[i + 1];
    if (secondItem.type !== "mdat") {
      throw new Error("Second item is not a mdat");
    }

    verifiedChunks.push(firstItem.data);
    verifiedChunks.push(secondItem.data);
  }

  const currentRest = rest || Buffer.from([]);
  const filedata = Buffer.concat([ftyp, moov, ...verifiedChunks]);

  return {
    filedata,
    rest: Buffer.concat([currentRest, ...additionalRest]),
  };
};

/**
 * Parse a MP4 file from a Buffer.
 *
 * @param fileBuffer The file to parse as a Buffer.
 * @returns The parsed file.
 */
export const parse = (fileBuffer: Buffer): MP4ParsedFile => {
  let currentIndex = 0;

  const data: MP4ParsedFile = {
    ftyp: null,
    moov: null,
    chunks: [],
    rest: null,
  };

  while (currentIndex < fileBuffer.length) {
    const boxSize = readBoxSize(fileBuffer, currentIndex);
    const boxType = readBoxType(fileBuffer, currentIndex);

    // Prevent the parser from parsing not complete boxes
    if (currentIndex + boxSize > fileBuffer.length) {
      data.rest = fileBuffer.subarray(currentIndex) as Buffer;
      break;
    }

    const boxData = fileBuffer.subarray(currentIndex, currentIndex + boxSize) as Buffer;

    // Handle boxes
    switch (boxType) {
      case "ftyp":
        data.ftyp = boxData;
        break;
      case "moov":
        data.moov = boxData;
        break;
      case "moof":
        data.chunks.push({ type: "moof", data: boxData });
        break;
      case "mdat":
        data.chunks.push({ type: "mdat", data: boxData });
        break;
    }

    currentIndex += boxSize;
  }

  return data;
};

export interface LibOptions {
  /** Whether to enable debug mode or not. */
  debug?: boolean;
}

/**
 * Fix a MP4 file using the previous chunk.
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

  const parsedPrevChunk = parse(prevChunk);
  const prevChunkRest = parsedPrevChunk.rest || Buffer.from([]);
  const brokenChunkMerge = Buffer.concat([prevChunkRest, brokenChunk]);
  const parsedBrokenChunk = parse(brokenChunkMerge);
  const { filedata, rest } = buildFile(parsedBrokenChunk, parsedPrevChunk);

  if (debug) {
    console.log("Rest:", rest);
  }

  return filedata;
};

export { utils, Buffer };
