// @ts-check

/**
 * Format a number of milliseconds to a string.
 *
 * @param {number} milliseconds Milliseconds to format
 * @returns {string} Formatted string
 */
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
