export const buildFile = (data, context = {}) => {
  let { ftyp, moov, chunks, rest } = data
  const { ftyp: ftypContext, moov: moovContext } = context
  if (!ftyp) {
    ftyp = ftypContext
  }
  if (!moov) {
    moov = moovContext
  }

  if (!ftyp || !moov || !chunks) {
    throw new Error('Missing required boxes')
  }

  if (!Array.isArray(chunks)) {
    throw new Error('Chunks should be an array')
  }

  const verifiedChunks = []
  const additionalRest = []
  for (let i = 0; i < chunks.length; i += 2) {
    const firstItem = chunks[i]

    if (firstItem.type !== 'moof') {
      console.log('First item is not a moof, adding everything to rest')
      for (let j = i; j < chunks.length; j++) {
        additionalRest.push(chunks[j])
      }
      break
    }

    // Make sure we have a second item, as we need a moof followed by a mdat
    if (i + 1 >= chunks.length) {
      additionalRest.push(firstItem)
      break
    }

    // Check if the second item exists within the bounds of the array
    const secondItem = chunks[i + 1]
    if (secondItem.type !== 'mdat') {
      console.log('Second item is not a mdat, something went wrong…')
      throw new Error('Second item is not a mdat')
    }

    verifiedChunks.push(firstItem.data)
    verifiedChunks.push(secondItem.data)
  }

  const currentRest = rest || Buffer.from([])
  const filedata = Buffer.concat([ftyp, moov, ...verifiedChunks])

  return {
    filedata,
    rest: Buffer.concat([currentRest, ...additionalRest])
  }
}

export const parse = (fileBuffer) => {
  let currentIndex = 0

  const data = {
    ftyp: null,
    moov: null,
    chunks: [],
    rest: null
  }

  while (currentIndex < fileBuffer.length) {
    const boxSize = readBoxSize(fileBuffer, currentIndex)
    const boxType = readBoxType(fileBuffer, currentIndex)

    console.log(`\n=> Box type: ${boxType}, Size: ${boxSize}`)

    // Prevent the parser from parsing not complete boxes
    if (currentIndex + boxSize > fileBuffer.length) {
      console.log('Reached end of file while parsing box:', boxType)
      data.rest = fileBuffer.slice(currentIndex)
      break
    }

    const boxData = fileBuffer.slice(currentIndex, currentIndex + boxSize)

    switch (boxType) {
      case 'ftyp':
        console.log('Parsed ftyp:', parseFtypBox(fileBuffer, currentIndex, boxSize))
        data.ftyp = boxData
        break
      case 'moov':
        console.log('Parsed moov:', parseMoovBox(fileBuffer, currentIndex, boxSize))
        data.moov = boxData
        break
      case 'moof':
        console.log('Parsed moof:', parseMoofBox(fileBuffer, currentIndex, boxSize))
        data.chunks.push({
          type: 'moof',
          data: boxData
        })
        break
      case 'mdat':
        console.log('Parsed mdat:', parseMdatBox(fileBuffer, currentIndex, boxSize))
        data.chunks.push({
          type: 'mdat',
          data: boxData
        })
        break

      default:
        console.debug(`Unknown box type: ${boxType}`)
    }

    currentIndex += boxSize
  }

  return data
}

const readBoxSize = (buffer, index) => {
  let size = buffer.readUInt32BE(index)

  if (size === 1) {
    // If the size is 1, the actual size is stored in the next 8 bytes.
    // JavaScript bitwise operators treat their operands as a sequence of 32 bits,
    // so we need to use readUInt32BE twice.
    const highBits = buffer.readUInt32BE(index + 4)
    const lowBits = buffer.readUInt32BE(index + 8)
    size = (highBits * 0x100000000) + lowBits
  }

  return size
}

const readBoxType = (buffer, index) => {
  // The type is the 4 bytes following the size.
  return buffer.toString('ascii', index + 4, index + 8)
}

const parseFtypBox = (buffer, index, size) => {
  // The 'ftyp' box has the following fields:
  // - majorBrand: a 4-byte string
  // - minorVersion: a 4-byte integer
  // - compatibleBrands: a series of 4-byte strings, until the end of the box

  let offset = index + 8 // Skip the size and type fields

  const majorBrand = buffer.toString('ascii', offset, offset + 4)
  offset += 4

  const minorVersion = buffer.readUInt32BE(offset)
  offset += 4

  const compatibleBrands = []
  while (offset < index + size) {
    const brand = buffer.toString('ascii', offset, offset + 4)
    compatibleBrands.push(brand)
    offset += 4
  }

  return {
    majorBrand,
    minorVersion,
    compatibleBrands
  }
}

const parseMoovBox = (buffer, index, size) => {
  let offset = index + 8 // Skip the size and type fields

  const subBoxes = []
  while (offset < index + size) {
    const subBoxSize = readBoxSize(buffer, offset)
    const subBoxType = readBoxType(buffer, offset)
    subBoxes.push({ type: subBoxType, size: subBoxSize })
    offset += subBoxSize
  }

  return {
    type: 'moov',
    subBoxes
  }
}

const parseMdatBox = (_buffer, index, size) => {
  const dataStart = index + 8 // The actual data starts after the size (4 bytes) and type (4 bytes)

  return {
    type: 'mdat',
    dataStart,
    dataSize: size - 8 // Subtracting the header size (8 bytes)
  }
}

const parseMoofBox = (buffer, index, size) => {
  let offset = index + 8 // Skip the size and type fields

  const subBoxes = []
  while (offset < index + size) {
    const subBoxSize = readBoxSize(buffer, offset)
    const subBoxType = readBoxType(buffer, offset)
    subBoxes.push({ type: subBoxType, size: subBoxSize })
    offset += subBoxSize
  }

  return {
    type: 'moof',
    subBoxes
  }
}
