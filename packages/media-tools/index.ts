import * as mp4 from "@ludovicm67/mp4-tools";
import * as ogg from "@ludovicm67/ogg-tools";
import * as webm from "@ludovicm67/webm-tools";

// Export some utils
import { Buffer, utils } from "@ludovicm67/media-tools-utils";

/**
 * Enum for supported MediaTypes.
 * @readonly
 */
export const MediaTypes = {
  MP4: "mp4",
  OGG: "ogg",
  WEBM: "webm",
} as const;

export type MediaTypeValue = typeof MediaTypes[keyof typeof MediaTypes];

export interface MediaToolsOptions {
  /** Whether to enable debug mode or not. */
  debug?: boolean;
  /** The media type to use. */
  mediaType?: MediaTypeValue;
}

/**
 * Fix a media file using the previous chunk.
 * The previous chunk should be a sane chunk.
 * It should be the one that is right before the broken chunk.
 *
 * @param prevChunk Content of the previous (sane) chunk.
 * @param brokenChunk Content of the broken chunk.
 * @param options Options.
 * @returns The fixed chunk.
 */
export const fix = (prevChunk: Buffer, brokenChunk: Buffer, options?: MediaToolsOptions): Buffer => {
  const { debug, mediaType } = options || {};

  switch (mediaType) {
    case MediaTypes.MP4:
      return mp4.fix(prevChunk, brokenChunk, { debug });
    case MediaTypes.OGG:
      return ogg.fix(prevChunk, brokenChunk, { debug });
    case MediaTypes.WEBM:
      return webm.fix(prevChunk, brokenChunk, { debug });
    default:
      throw new Error(`Unsupported media type: '${mediaType}'`);
  }
};

export { mp4, ogg, webm, Buffer, utils };
