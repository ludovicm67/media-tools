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

export interface DecodeOptions {
  fixTimestamps?: boolean;
  debug?: boolean;
}

export interface SchemaInfo {
  type: string | null;
  name: string;
  description?: string;
  level?: number;
  minver?: number;
  multiple?: boolean;
  webm?: boolean;
}

export interface TagObject {
  tag: number;
  tagStr: string;
  type: string | null;
  name: string;
  start: number;
  end: number;
  dataSize?: number;
  data?: Buffer;
  discardable?: boolean;
  keyframe?: boolean;
  payload?: Buffer | null;
  track?: number | null;
  value?: number | string | Date | null;
}

export type EBMLEvent = ["start" | "end" | "tag", TagObject];

export interface DecodeResult {
  decoded: EBMLEvent[];
  headerBuffer: Buffer;
  lastStartBuffer: Buffer;
  buffer: Buffer;
}

/**
 * Decode a WebM file.
 *
 * @param buffer Buffer to decode
 * @param options Decode options
 * @returns Decoded result
 */
export const decode = (buffer: Buffer, options: DecodeOptions = {}): DecodeResult => {
  const internalBuffer = Buffer.from(buffer);
  let fixTimestamps = false;
  let debug = false;

  if (options) {
    if (options.fixTimestamps) fixTimestamps = true;
    if (options.debug) debug = true;
  }

  const ctx = new Map<string, unknown>();

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

  while ((ctx.get("cursor") as number) < buffer.length) {
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

  const headerBuffer = internalBuffer.slice(0, ctx.get("endOfHeader") as number);
  const lastStartBuffer = internalBuffer.slice(ctx.get("lastStart") as number);
  const decoded = ctx.get("decoded") as EBMLEvent[];

  ctx.clear();

  return { decoded, headerBuffer, lastStartBuffer, buffer: internalBuffer };
};

/**
 * Read a tag from the buffer.
 *
 * @param ctx Context.
 * @returns Are we in a valid state?
 */
const readTag = (ctx: Map<string, unknown>): boolean => {
  const cursor = ctx.get("cursor") as number;
  const buf = ctx.get("buffer") as Buffer;

  // Check if we are at the end of the buffer
  if (cursor >= buf.length) return false;

  ctx.set("lastStart", cursor);
  const tag = readVint(buf, cursor);
  if (tag === null) return false;

  const { value, length } = tag;

  const tagStr = readHexString(buf, cursor, cursor + length);
  const tagNum = Number.parseInt(tagStr, 16);
  ctx.set("cursor", cursor + length);
  ctx.set("state", STATE_SIZE);

  const schemaInfo = getSchemaInfo(tagNum);

  const tagObj: TagObject = {
    tag: value,
    tagStr,
    type: schemaInfo.type,
    name: schemaInfo.name,
    start: ctx.get("lastStart") as number,
    end: (ctx.get("lastStart") as number) + length,
  };

  (ctx.get("tagStack") as TagObject[]).push(tagObj);

  return true;
};

/**
 * Read a size from the buffer.
 *
 * @param ctx Context.
 * @returns Are we in a valid state?
 */
const readSize = (ctx: Map<string, unknown>): boolean => {
  const cursor = ctx.get("cursor") as number;
  const buf = ctx.get("buffer") as Buffer;

  // Check if we are at the end of the buffer
  if (cursor >= buf.length) return false;

  const tagStack = ctx.get("tagStack") as TagObject[];
  const tagObj = tagStack[tagStack.length - 1];
  const size = readVint(buf, cursor);
  if (size === null) return false;

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
 * @param ctx Context.
 * @returns Are we in a valid state?
 */
const readContent = (ctx: Map<string, unknown>): boolean => {
  const tagStack = ctx.get("tagStack") as TagObject[];
  const currentElement = tagStack[tagStack.length - 1];
  const { type, dataSize } = currentElement;

  if (type === "m") {
    handleEBMLElement(ctx, ["start", currentElement]);
    ctx.set("state", STATE_TAG);
    return true;
  }

  const cursor = ctx.get("cursor") as number;
  const buf = ctx.get("buffer") as Buffer;

  // Check if we are at the end of the buffer
  if (buf.length < cursor + (dataSize ?? 0)) return false;

  const data = buf.slice(cursor, cursor + (dataSize ?? 0));
  handleEBMLElement(ctx, ["tag", readDataFromTag(ctx, currentElement, data)]);
  tagStack.pop();

  ctx.set("cursor", (ctx.get("cursor") as number) + (dataSize ?? 0));
  ctx.set("state", STATE_TAG);

  while (tagStack.length > 0) {
    const topElement = tagStack[tagStack.length - 1];
    if ((ctx.get("total") as number) < topElement.end) break;
    handleEBMLElement(ctx, ["end", topElement]);
    tagStack.pop();
  }

  return true;
};

/**
 * Get the schema information from a tag.
 *
 * @param tag Tag to get the schema information from
 * @returns Schema information
 */
const getSchemaInfo = (tag: number): SchemaInfo => {
  if (Number.isInteger(tag) && schema.has(tag)) {
    return schema.get(tag) as SchemaInfo;
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
 * @param ctx Context.
 * @param element EBML element.
 */
const handleEBMLElement = (ctx: Map<string, unknown>, element: EBMLEvent): void => {
  const debug = ctx.get("debug") as boolean;
  const [kind, e] = element;
  if (kind === "start" && e.name === "EBML") {
    ctx.set("isHeader", true);
  }
  if (debug) {
    console.debug(element);
  }
  (ctx.get("decoded") as EBMLEvent[]).push(element);

  const isHeader = ctx.get("isHeader") as boolean;
  if (isHeader && kind === "end" && e.name === "Cluster") {
    ctx.set("isHeader", false);
    ctx.set("endOfHeader", ctx.get("cursor") as number);
    if (debug) {
      console.debug(`got end of header at byte ${ctx.get("endOfHeader")}`);
    }
  }
};

const readDataFromTag = (ctx: Map<string, unknown>, tagObj: TagObject, data: Buffer): TagObject => {
  const { type, name } = tagObj;
  let track = tagObj.track;
  let discardable = tagObj.discardable ?? false;
  let keyframe = tagObj.keyframe ?? false;
  let payload: Buffer | null = null;
  let value: number | string | Date | null | undefined;

  switch (type) {
    case "u":
      value = readUnsigned(data) as number;
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

  const fixTimestamps = ctx.get("fixTimestamps") as boolean;
  const isFirstBlock = ctx.get("isFirstBlock") as boolean;

  if (fixTimestamps && name === "Timecode") {
    const lastTimestampValue = ctx.get("lastTimestampValue") as number;
    value = isFirstBlock
      ? lastTimestampValue
      : lastTimestampValue + (ctx.get("timestampDelta") as number);
    writeUnsigned(data, 0, value as number);
    ctx.set("lastTimeCodeValue", value);
    ctx.set("lastTimestampValue", value);
    ctx.set("firstBlockDelay", 0);
  }

  if (name === "SimpleBlock" || name === "Block") {
    let p = 0;
    const vintResult = readVint(data, p);
    const { length, value: trak } = vintResult ?? { length: 0, value: null };
    p += length;
    track = trak;
    value = readSigned(data.slice(p, p + 2));

    if (fixTimestamps) {
      if (isFirstBlock) {
        ctx.set("isFirstBlock", false);
        ctx.set("firstBlockDelay", (value as number) - (ctx.get("lastTimeCodeValue") as number));
      }
      value = (value as number) - (ctx.get("firstBlockDelay") as number);
      if ((value as number) - (ctx.get("lastTimestampValue") as number) > DEFAULT_TIMESTAMP_DELTA * 2) {
        value = (ctx.get("lastTimestampValue") as number) + DEFAULT_TIMESTAMP_DELTA;
      }
      writeSigned(data, p, 2, value as number);
      ctx.set("timestampDelta", (value as number) - (ctx.get("lastTimestampValue") as number));
      ctx.set("lastTimestampValue", value);
    }

    p += 2;
    if (name === "SimpleBlock") {
      keyframe = Boolean(data[length + 2] & 0x80);
      discardable = Boolean(data[length + 2] & 0x01);
    }
    p += 1;
    payload = data.subarray(p) as Buffer;
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
