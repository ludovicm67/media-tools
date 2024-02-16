// @ts-check

import { Buffer } from '@ludovicm67/media-tools-utils'
import schema from './ebml-schema.js'

// Logic and some parts from: https://github.com/node-ebml/node-ebml

/**
 * read variable length integer per
 * https://www.matroska.org/technical/specs/index.html#EBML_ex
 * @param {import('@ludovicm67/media-tools-utils').Buffer} buffer containing input
 * @param {Number} [start=0] position in buffer
 * @returns {{length: Number, value: number} | null}  value / length object
 */
const readVint = (buffer, start = 0) => {
  const length = 8 - Math.floor(Math.log2(buffer[start]))
  if (length > 8) {
    const number = readHexString(buffer, start, start + length)
    throw new Error(`Unrepresentable length: ${length} ${number}`)
  }

  if (start + length > buffer.length) {
    return null
  }

  let value = buffer[start] & ((1 << (8 - length)) - 1)
  for (let i = 1; i < length; i += 1) {
    if (i === 7) {
      if (value >= 2 ** 8 && buffer[start + 7] > 0) {
        return { length, value: -1 }
      }
    }
    value *= 2 ** 8
    value += buffer[start + i]
  }

  return { length, value }
}

/**
 * get a hex text string from Buff[start,end)
 * @param {import('@ludovicm67/media-tools-utils').Buffer} buff from which to read the string
 * @param {Number} [start=0] starting point (default 0)
 * @param {Number} [end=buff.byteLength] ending point (default the whole buffer)
 * @returns {string} the hex string
 */
const readHexString = (buff, start = 0, end = buff.byteLength) => {
  return Array.from(buff.subarray(start, end))
    .map(q => Number(q).toString(16))
    .reduce((acc, current) => `${acc}${current.padStart(2, '0')}`, '')
}

/**
 * concatenate two arrays of bytes
 * @param {import('@ludovicm67/media-tools-utils').Buffer} a1  First array
 * @param {import('@ludovicm67/media-tools-utils').Buffer} a2  Second array
 * @returns  {import('@ludovicm67/media-tools-utils').Buffer} concatenated arrays
 */
const concatenate = (a1, a2) => {
  // both null or undefined
  if (!a1 && !a2) {
    return Buffer.from([])
  }
  if (!a1 || a1.byteLength === 0) {
    return a2
  }
  if (!a2 || a2.byteLength === 0) {
    return a1
  }

  return Buffer.concat([a1, a2])
}

/**
 * tries to read out a UTF-8 encoded string
 * @param  {import('@ludovicm67/media-tools-utils').Buffer} buff the buffer to attempt to read from
 * @return {string|null}      the decoded text, or null if unable to
 */
const readUtf8 = (buff) => {
  try {
    return Buffer.from(buff).toString('utf8')
  } catch (exception) {
    return null
  }
}

/**
 * get an unsigned number from a buffer
 * @param {import('@ludovicm67/media-tools-utils').Buffer} buff from which to read variable-length unsigned number
 * @returns {number|string} result (in hex for lengths > 6)
 */
const readUnsigned = (buff) => {
  const b = new DataView(buff.buffer, buff.byteOffset, buff.byteLength)
  switch (buff.byteLength) {
    case 1:
      return b.getUint8(0)
    case 2:
      return b.getUint16(0)
    case 4:
      return b.getUint32(0)
    default:
      break
  }
  if (buff.byteLength <= 6) {
    return buff.reduce((acc, current) => acc * 256 + current, 0)
  }

  return readHexString(buff, 0, buff.byteLength)
}

/**
 * get an signed number from a buffer
 * @param {import('@ludovicm67/media-tools-utils').Buffer} buff from which to read variable-length signed number
 * @returns {number} result
 */
const readSigned = (buff) => {
  const b = new DataView(buff.buffer, buff.byteOffset, buff.byteLength)
  switch (buff.byteLength) {
    case 1:
      return b.getInt8(0)
    case 2:
      return b.getInt16(0)
    case 4:
      return b.getInt32(0)
    default:
      return NaN
  }
}

/**
 * get an floating-point number from a buffer
 * @param {import('@ludovicm67/media-tools-utils').Buffer} buff from which to read variable-length floating-point number
 * @returns {number} result
 */
const readFloat = (buff) => {
  const b = new DataView(buff.buffer, buff.byteOffset, buff.byteLength)
  switch (buff.byteLength) {
    case 4:
      return b.getFloat32(0)
    case 8:
      return b.getFloat64(0)
    default:
      return NaN
  }
}

/**
 * get a date from a buffer
 * @param  {import('@ludovicm67/media-tools-utils').Buffer} buff from which to read the date
 * @return {Date}      result
 */
const readDate = (buff) => {
  const b = new DataView(buff.buffer, buff.byteOffset, buff.byteLength)
  switch (buff.byteLength) {
    case 1:
      return new Date(b.getUint8(0))
    case 2:
      return new Date(b.getUint16(0))
    case 4:
      return new Date(b.getUint32(0))
    case 8:
      return new Date(Number.parseInt(readHexString(buff), 16))
    default:
      return new Date(0)
  }
}

const readDataFromTag = (tagObj, data) => {
  const { type, name } = tagObj
  let { track } = tagObj
  let discardable = tagObj.discardable || false
  let keyframe = tagObj.keyframe || false
  let payload = null
  let value

  switch (type) {
    case 'u':
      value = readUnsigned(data)
      break
    case 'f':
      value = readFloat(data)
      break
    case 'i':
      value = readSigned(data)
      break
    case 's':
      value = String.fromCharCode(...data)
      break
    case '8':
      value = readUtf8(data)
      break
    case 'd':
      value = readDate(data)
      break
    default:
      break
  }

  if (name === 'SimpleBlock' || name === 'Block') {
    let p = 0
    const { length, value: trak } = readVint(data, p) || { length: 0, value: null }
    p += length
    track = trak
    value = readSigned(data.subarray(p, p + 2))
    p += 2
    if (name === 'SimpleBlock') {
      keyframe = Boolean(data[length + 2] & 0x80)
      discardable = Boolean(data[length + 2] & 0x01)
    }
    p += 1
    payload = data.subarray(p)
  }

  return {
    ...tagObj,
    data,
    discardable,
    keyframe,
    payload,
    track,
    value
  }
}

const STATE_TAG = 1
const STATE_SIZE = 2
const STATE_CONTENT = 3

let mBuffer = null
let mTagStack = []
let mState = STATE_TAG
let mCursor = 0
let mTotal = 0

let decoded = []
let isHeader = false
let decodedHeader = []
let debug = false
let initialBuffer = null
let headerBuffer = null
let lastStart = 0
let fixTimestamps = false
let lastTimeCodeValue = 0
let lastTimestampValue = 0
let isFirstBlock = true
let firstBlockDelay = 0
let timestampDelta = 60 // 60ms ; a good default value, but will be recalculated

export const resetDecoder = (options = {}) => {
  mBuffer = null
  mTagStack = []
  mState = STATE_TAG
  mCursor = 0
  mTotal = 0

  fixTimestamps = false

  if (options) {
    if (options.debug) {
      debug = options.debug
    }
    if (options.fixTimestamps) {
      fixTimestamps = options.fixTimestamps
    }
  }

  decoded = []
  isHeader = false
  decodedHeader = []
  initialBuffer = null
  headerBuffer = null
  lastStart = 0
  lastTimeCodeValue = 0
  lastTimestampValue = 0
  isFirstBlock = true
  firstBlockDelay = 0
  timestampDelta = 60
}

/**
 * Log to display if debug is enabled.
 *
 * @param {any[]} args Log to display if debug is enabled.
 */
const debugLog = (...args) => {
  if (debug) {
    console.log(...args)
  }
}

const fixElementTimestamp = (element) => {
  if (!fixTimestamps) {
    return element
  }

  if (element.name === 'Block' || element.name === 'SimpleBlock') {
    if (isFirstBlock) {
      isFirstBlock = false
      firstBlockDelay = element.value - lastTimeCodeValue
    }
    element.value = element.value - firstBlockDelay
    timestampDelta = element.value - lastTimestampValue
    lastTimestampValue = element.value
  }

  if (element.name === 'Timecode') {
    element.value = isFirstBlock ? lastTimestampValue : (lastTimestampValue + timestampDelta)
    lastTimeCodeValue = element.value
    lastTimestampValue = element.value
    firstBlockDelay = 0
  }

  return element
}

/**
 * Handle EBML element.
 *
 * @param {any} element EBML element.
 */
const handleEBMLElement = (element) => {
  const [kind, unfixedElement] = element
  const e = fixElementTimestamp(unfixedElement)
  const fixedElement = [kind, e]
  if (kind === 'start' && e.name === 'EBML') {
    isHeader = true
  }
  debugLog(fixedElement)
  decoded.push(fixedElement)
  if (isHeader) {
    decodedHeader.push(fixedElement)
  }
  if (isHeader && kind === 'end' && e.name === 'Cluster') {
    isHeader = false

    const endOfHeader = getTotal()
    debugLog(`got end of header at byte ${endOfHeader}`)
    headerBuffer = initialBuffer.subarray(0, endOfHeader)
  }
}

const getBuffer = () => {
  return mBuffer
}

const getCursor = () => {
  return mCursor
}

const getState = () => {
  return mState
}

const getTagStack = () => {
  return mTagStack
}

const getTotal = () => {
  return mTotal
}

const setBuffer = (buffer) => {
  mBuffer = buffer
}

const setCursor = (cursor) => {
  mCursor = cursor
}

const setState = (state) => {
  mState = state
}

const setTotal = (total) => {
  mTotal = total
}

export const decode = (chunk) => {
  if (!initialBuffer) {
    initialBuffer = Buffer.from(chunk)
  } else {
    initialBuffer = concatenate(initialBuffer, Buffer.from(chunk))
  }

  if (!getBuffer()) {
    setBuffer(Buffer.from(chunk))
  } else {
    setBuffer(concatenate(getBuffer(), Buffer.from(chunk)))
  }

  while (getCursor() < getBuffer().length) {
    if (getState() === STATE_TAG && !readTag()) {
      break
    }
    if (getState() === STATE_SIZE && !readSize()) {
      break
    }
    if (getState() === STATE_CONTENT && !readContent()) {
      break
    }
  }

  const lastStartBuffer = initialBuffer.subarray(lastStart)
  return {
    decoded,
    decodedHeader,
    headerBuffer,
    lastStartBuffer,
    lastTimestampValue
  }
}

const getSchemaInfo = (tag) => {
  if (Number.isInteger(tag) && schema.has(tag)) {
    return schema.get(tag)
  }
  return {
    type: null,
    name: 'unknown',
    description: '',
    level: -1,
    minver: -1,
    multiple: false,
    webm: false
  }
}

const readTag = () => {
  if (getCursor() >= getBuffer().length) {
    return false
  }

  const start = getTotal()
  lastStart = start
  const tag = readVint(getBuffer(), getCursor())

  if (tag == null) {
    return false
  }

  const tagStr = readHexString(
    getBuffer(),
    getCursor(),
    getCursor() + tag.length
  )
  const tagNum = Number.parseInt(tagStr, 16)
  setCursor(getCursor() + tag.length)
  setTotal(getTotal() + tag.length)
  setState(STATE_SIZE)

  const tagObj = {
    tag: tag.value,
    tagStr,
    // @ts-ignore
    type: getSchemaInfo(tagNum).type,
    // @ts-ignore
    name: getSchemaInfo(tagNum).name,
    start,
    end: start + tag.length
  }

  getTagStack().push(tagObj)

  return true
}

const readSize = () => {
  const tagObj = getTagStack()[getTagStack().length - 1]

  if (getCursor() >= getBuffer().length) {
    return false
  }

  const size = readVint(getBuffer(), getCursor())

  if (size == null) {
    return false
  }

  setCursor(getCursor() + size.length)
  setTotal(getTotal() + size.length)
  setState(STATE_CONTENT)
  tagObj.dataSize = size.value

  if (size.value === -1) {
    tagObj.end = -1
  } else {
    tagObj.end += size.value + size.length
  }

  return true
}

const readContent = () => {
  const { tagStr, type, dataSize, ...rest } = getTagStack()[
    getTagStack().length - 1
  ]

  if (type === 'm') {
    handleEBMLElement(['start', { tagStr, type, dataSize, ...rest }])
    setState(STATE_TAG)
    return true
  }

  if (getBuffer().length < getCursor() + dataSize) {
    return false
  }

  const data = getBuffer().subarray(getCursor(), getCursor() + dataSize)
  setTotal(getTotal() + dataSize)
  setState(STATE_TAG)
  setBuffer(getBuffer().subarray(getCursor() + dataSize))
  setCursor(0)

  getTagStack().pop()

  handleEBMLElement([
    'tag',
    readDataFromTag(
      { tagStr, type, dataSize, ...rest },
      Buffer.from(data)
    )
  ])

  while (getTagStack().length > 0) {
    const topEle = getTagStack()[getTagStack().length - 1]
    if (getTotal() < topEle.end) {
      break
    }
    handleEBMLElement(['end', topEle])
    getTagStack().pop()
  }

  return true
}

const formatMilliseconds = (milliseconds) => {
  const hours = Math.floor(milliseconds / 3600000) // 1 hour = 3600000 milliseconds
  milliseconds = milliseconds % 3600000

  const minutes = Math.floor(milliseconds / 60000) // 1 minute = 60000 milliseconds
  milliseconds = milliseconds % 60000

  const seconds = Math.floor(milliseconds / 1000)
  const nanoseconds = (milliseconds % 1000) * 1000000 // 1 millisecond = 1000000 nanoseconds

  // Pad the hours, minutes, seconds to be always two digits and nanoseconds to be nine digits
  const hoursString = String(hours).padStart(2, '0')
  const minutesString = String(minutes).padStart(2, '0')
  const secondsString = String(seconds).padStart(2, '0')
  const nanosecondsString = String(nanoseconds).padStart(9, '0')

  return `${hoursString}:${minutesString}:${secondsString}.${nanosecondsString}`
}

export const displayDecodedElements = (decodedElements) => {
  let indent = 0
  let lastTimecodeValue = 0
  for (const item of decodedElements) {
    const [kind, element] = item

    if (kind === 'end') {
      indent--
    }

    const indentString = '  '.repeat(indent)

    let additionalInfo = ''

    switch (element.name) {
      case 'Timecode':
        additionalInfo = `timestamp ${formatMilliseconds(element.value)}`
        lastTimecodeValue = element.value
        break
      case 'SimpleBlock':
      case 'Block':
        additionalInfo = `track number ${element.track}, timestamp ${formatMilliseconds(lastTimecodeValue + element.value)}`
        break
      default:
        break
    }

    console.log(`${indentString}${kind}: ${element.name}${additionalInfo ? ` - ${additionalInfo}` : ''}`)

    if (kind === 'start') {
      indent++
    }
  }
}
