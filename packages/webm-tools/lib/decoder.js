// @ts-check

import { Buffer } from "@ludovicm67/media-tools-utils";
import schema from "./ebml-schema.js";
import {
  readDate,
  readFloat,
  readHexString,
  readSigned,
  readUnsigned,
  readUtf8,
  readVint,
  writeSigned,
  writeUnsigned,
} from "./utils.js";

// Define some states
const STATE_TAG = 0;
const STATE_SIZE = 1;
const STATE_CONTENT = 2;

// Define some constants
const DEFAULT_TIMESTAMP_DELTA = 60;

/**
 * Decode a WebM file.
 *
 * @param {import('@ludovicm67/media-tools-utils').Buffer} buffer Buffer to decode
 */
export const decode = (buffer, options = {}) => {
  const internalBuffer = Buffer.from(buffer);
  let fixTimestamps = false;
  let debug = false;

  if (options) {
    if (options.fixTimestamps) {
      fixTimestamps = true;
    }
    if (options.debug) {
      debug = true;
    }
  }

  const ctx = new Map();

  // Options
  ctx.set("debug", debug);
  ctx.set("fixTimestamps", fixTimestamps);

  // Internal state for the parser
  ctx.set("buffer", internalBuffer); // Buffer to decode
  ctx.set("cursor", 0); // Cursor in the buffer
  ctx.set("state", STATE_TAG); // Current state
  ctx.set("tagStack", []); // Stack of tags
  ctx.set("decoded", []); // Decoded elements

  // Used for fixing timestamps
  ctx.set("isFirstBlock", true); // Is it the first block?
  ctx.set("lastTimeCodeValue", 0); // Last value of the timecode
  ctx.set("lastTimestampValue", 0); // Last value of the timestamp
  ctx.set("firstBlockDelay", 0); // Delay of the first block
  ctx.set("timestampDelta", DEFAULT_TIMESTAMP_DELTA); // Delta of the timestamp in ms ; 60 is a good default value (will be updated)

  // Used for fixing chunks
  ctx.set("lastStart", 0); // Last start of a tag
  ctx.set("isHeader", false); // Is it the header?
  ctx.set("endOfHeader", 0); // End of the header

  while (ctx.get("cursor") < buffer.length) {
    let isValid = false;

    switch (ctx.get("state")) {
      case STATE_TAG:
        isValid = readTag(ctx);
        break;
      case STATE_SIZE:
        isValid = readSize(ctx);
        break;
      case STATE_CONTENT:
        isValid = readContent(ctx);
        break;
    }

    if (!isValid) {
      break;
    }
  }

  const headerBuffer = internalBuffer.slice(0, ctx.get("endOfHeader"));
  const lastStartBuffer = internalBuffer.slice(ctx.get("lastStart"));
  const decoded = ctx.get("decoded");

  ctx.clear();

  return {
    decoded,
    headerBuffer,
    lastStartBuffer,
    buffer: internalBuffer,
  };
};

/**
 * Read a tag from the buffer.
 *
 * @param {Map} ctx Context.
 * @returns {boolean} Are we in a valid state?
 */
const readTag = (ctx) => {
  // Check if we are at the end of the buffer
  if (ctx.get("cursor") >= ctx.get("buffer").length) {
    return false;
  }

  ctx.set("lastStart", ctx.get("cursor"));
  const tag = readVint(ctx.get("buffer"), ctx.get("cursor"));
  if (tag === null) {
    return false;
  }

  const { value, length } = tag;

  const tagStr = readHexString(
    ctx.get("buffer"),
    ctx.get("cursor"),
    ctx.get("cursor") + length,
  );
  const tagNum = Number.parseInt(tagStr, 16);
  ctx.set("cursor", ctx.get("cursor") + length);
  ctx.set("state", STATE_SIZE);

  const schemaInfo = getSchemaInfo(tagNum);

  const tagObj = {
    tag: value,
    tagStr,
    type: schemaInfo.type,
    name: schemaInfo.name,
    start: ctx.get("lastStart"),
    end: ctx.get("lastStart") + length,
  };

  ctx.get("tagStack").push(tagObj);

  return true;
};

/**
 * Read a size from the buffer.
 *
 * @param {Map} ctx Context.
 * @returns {boolean} Are we in a valid state?
 */
const readSize = (ctx) => {
  // Check if we are at the end of the buffer
  if (ctx.get("cursor") >= ctx.get("buffer").length) {
    return false;
  }

  const tagStack = ctx.get("tagStack");
  const buffer = ctx.get("buffer");
  const cursor = ctx.get("cursor");

  const tagObj = tagStack[tagStack.length - 1];
  const size = readVint(buffer, cursor);
  if (size === null) {
    return false;
  }

  ctx.set("cursor", cursor + size.length);
  ctx.set("state", STATE_CONTENT);
  tagObj.dataSize = size.value;

  if (size.value === -1) {
    tagObj.end = -1;
  } else {
    tagObj.end += size.value + size.length;
  }

  return true;
};

/**
 * Read content from the buffer.
 *
 * @param {Map} ctx Context.
 * @returns {boolean} Are we in a valid state?
 */
const readContent = (ctx) => {
  const tagStack = ctx.get("tagStack");

  const currentElement = tagStack[tagStack.length - 1];
  const { type, dataSize } = currentElement;

  if (type === "m") {
    handleEBMLElement(ctx, ["start", currentElement]);
    ctx.set("state", STATE_TAG);
    return true;
  }

  const cursor = ctx.get("cursor");

  // Check if we are at the end of the buffer
  if (ctx.get("buffer").length < cursor + dataSize) {
    return false;
  }

  const data = ctx.get("buffer").slice(cursor, cursor + dataSize);
  handleEBMLElement(ctx, ["tag", readDataFromTag(ctx, currentElement, data)]);
  tagStack.pop();

  ctx.set("cursor", ctx.get("cursor") + dataSize);
  ctx.set("state", STATE_TAG);

  while (tagStack.length > 0) {
    const topElement = tagStack[tagStack.length - 1];
    if (ctx.get("total") < topElement.end) {
      break;
    }
    handleEBMLElement(ctx, ["end", topElement]);
    tagStack.pop();
  }

  return true;
};

/**
 * Get the schema information from a tag.
 *
 * @param {number} tag Tag to get the schema information from
 * @returns {*} Schema information
 */
const getSchemaInfo = (tag) => {
  if (Number.isInteger(tag) && schema.has(tag)) {
    return schema.get(tag);
  }

  return {
    type: null,
    name: "unknown",
    description: "",
    level: -1,
    minver: -1,
    multiple: false,
    webm: false,
  };
};

/**
 * Handle EBML element.
 *
 * @param {any} element EBML element.
 */
const handleEBMLElement = (ctx, element) => {
  const debug = ctx.get("debug");
  const [kind, e] = element;
  if (kind === "start" && e.name === "EBML") {
    ctx.set("isHeader", true);
  }
  if (debug) {
    console.debug(element);
  }
  ctx.get("decoded").push(element);

  const isHeader = ctx.get("isHeader");
  if (isHeader && kind === "end" && e.name === "Cluster") {
    ctx.set("isHeader", false);
    ctx.set("endOfHeader", ctx.get("cursor"));
    if (debug) {
      console.debug(`got end of header at byte ${ctx.get("endOfHeader")}`);
    }
  }
};

const readDataFromTag = (ctx, tagObj, data) => {
  const { type, name } = tagObj;
  let { track } = tagObj;
  let discardable = tagObj.discardable || false;
  let keyframe = tagObj.keyframe || false;
  let payload = null;
  let value;

  switch (type) {
    case "u":
      value = readUnsigned(data);
      break;
    case "f":
      value = readFloat(data);
      break;
    case "i":
      value = readSigned(data);
      break;
    case "s":
      value = String.fromCharCode(...data);
      break;
    case "8":
      value = readUtf8(data);
      break;
    case "d":
      value = readDate(data);
      break;
    default:
      break;
  }

  const fixTimestamps = ctx.get("fixTimestamps");
  const isFirstBlock = ctx.get("isFirstBlock");

  if (fixTimestamps && name === "Timecode") {
    const lastTimestampValue = ctx.get("lastTimestampValue");
    value = isFirstBlock
      ? lastTimestampValue
      : lastTimestampValue + ctx.get("timestampDelta");
    writeUnsigned(data, 0, value);
    ctx.set("lastTimeCodeValue", value);
    ctx.set("lastTimestampValue", value);
    ctx.set("firstBlockDelay", 0);
  }

  if (name === "SimpleBlock" || name === "Block") {
    let p = 0;
    const { length, value: trak } = readVint(data, p) || {
      length: 0,
      value: null,
    };
    p += length;
    track = trak;
    value = readSigned(data.slice(p, p + 2));

    if (fixTimestamps) {
      if (isFirstBlock) {
        ctx.set("isFirstBlock", false);
        ctx.set("firstBlockDelay", value - ctx.get("lastTimeCodeValue"));
      }
      value = value - ctx.get("firstBlockDelay");
      if (value - ctx.get("lastTimestampValue") > DEFAULT_TIMESTAMP_DELTA * 2) {
        value = ctx.get("lastTimestampValue") + DEFAULT_TIMESTAMP_DELTA;
      }
      writeSigned(data, p, 2, value);
      ctx.set("timestampDelta", value - ctx.get("lastTimestampValue"));
      ctx.set("lastTimestampValue", value);
    }

    p += 2;
    if (name === "SimpleBlock") {
      keyframe = Boolean(data[length + 2] & 0x80);
      discardable = Boolean(data[length + 2] & 0x01);
    }
    p += 1;
    payload = data.subarray(p);
  }

  return {
    ...tagObj,
    data,
    discardable,
    keyframe,
    payload,
    track,
    value,
  };
};
