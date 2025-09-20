// @ts-check

// Export some utils
export { Buffer, utils } from "@ludovicm67/media-tools-utils";

// EBML tools
export { default as ebmlSchema } from "./lib/ebml-schema.js";
export { displayDecodedElements } from "./lib/tools.js";
export { decode } from "./lib/decoder.js";

// Export functions that can be used to work with WebM files
export { fix } from "./lib/index.js";
