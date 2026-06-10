import { Buffer } from "buffer";

/**
 * Convert a Blob to a Buffer.
 *
 * @param blob The blob to convert.
 * @returns The blob as a Buffer.
 */
export const blobToArrayBuffer = async (blob: Blob): Promise<Buffer> => {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer;
};

export const utils = {
  blobToArrayBuffer,
};

export { Buffer };
