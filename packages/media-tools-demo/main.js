// @ts-check
import { monotonicFactory } from 'ulid/dist/index.js'
import { MediaTypes, fix as mediaToolsChunkFix, utils } from '@ludovicm67/media-tools'

const initSources = async () => {
  await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaDevices = await navigator.mediaDevices.enumerateDevices()
  const audioSources = mediaDevices.filter((device) => device.kind === 'audioinput')
  console.log('audioSources:', audioSources)
  return audioSources
}

const audioSourceSelect = /** @type {HTMLSelectElement} */ (document.getElementById('audioSource'))
const audioSources = await initSources()
// Remove all options from the select
while (audioSourceSelect.firstChild) {
  audioSourceSelect.removeChild(audioSourceSelect.firstChild)
}
// Add the new options
audioSources.forEach(mic => {
  const option = document.createElement('option')
  option.value = mic.deviceId
  option.textContent = mic.label || `Microphone (${mic.deviceId.substring(0, 8)}...)`
  audioSourceSelect.appendChild(option)
})
if (audioSources.length > 0) {
  audioSourceSelect.disabled = false
}

const ulid = monotonicFactory()

const userId = ulid()
console.log(`Current user ID=${userId}`)

// Configurable variables
const audioDetectionLevel = 0.005
const audioDetectionCounter = 5
const audioMinDetectionCounter = 2
const audioRequestDataInterval = 5000

// Internal variables
let audioStream = null
let started = false
let audioLevel = 0.0
let mediaRecorder = null
let recordingInterval = null
let audioChunks = []
let previousChunk = null

// Check if the browser supports WebM format ; else we try to fallback to MP4
const isMp4 = !MediaRecorder.isTypeSupported('audio/webm')
const mimeType = isMp4 ? 'audio/mp4' : 'audio/webm'
const extension = isMp4 ? 'mp4' : 'webm'

// HTML elements from the page
const startBtn = /** @type {HTMLButtonElement} */ (document.getElementById('startBtn'))
const stopBtn = /** @type {HTMLButtonElement} */ (document.getElementById('stopBtn'))
const audioLevelElement = /** @type {HTMLProgressElement} */ (document.getElementById('audioLevel'))
const enableTranscriptionsElement = /** @type {HTMLInputElement} */ (document.getElementById('enableTranscriptions'))

stopBtn.style.display = 'none'

/**
 * Request the audio stream from the user.
 *
 * @returns {Promise<MediaStream>} The audio stream.
 */
const getAudioStream = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: audioSourceSelect.value
    }
  })
  audioStream = stream
  console.log('got audio stream', audioStream)
  return stream
}

const handleSendAudio = async () => {
  if (audioChunks.length < 1) {
    console.warn('no audio chunks to send')
    return
  }

  // Get a Buffer from the audio chunks
  const audioBlob = new Blob(audioChunks, { type: mimeType })
  const audioBuffer = await utils.blobToArrayBuffer(audioBlob)

  if (previousChunk) {
    previousChunk = mediaToolsChunkFix(previousChunk, audioBuffer, {
      mediaType: isMp4 ? MediaTypes.MP4 : MediaTypes.WEBM,
      debug: true
    })
  } else {
    previousChunk = audioBuffer
  }

  const audioToSend = new Blob([previousChunk], { type: mimeType })

  const body = new FormData()
  body.append('audio', audioToSend, `audio.${extension}`)
  const apiCall = enableTranscriptionsElement.checked ? 'transcribe' : 'audio'
  const response = await fetch(`/backend/${apiCall}/${userId}`, {
    method: 'POST',
    body
  })
  const text = await response.text()
  console.log('\nGOT RESPONSE:')
  console.log('response:', response)
  console.log('text:', text)
  console.log('')
  audioChunks = []
}

/**
 * Handle audio level from the audio stream.
 * This will update the global `audioLevel` variable.
 * This will be running on a loop until `started` is set to false.
 *
 * @param {MediaStream} stream The audio stream to analyze.
 */
const handleAudioLevel = (stream) => {
  const audioContext = new AudioContext()
  const mediaStreamAudioSourceNode = audioContext.createMediaStreamSource(stream)
  const analyserNode = audioContext.createAnalyser()
  mediaStreamAudioSourceNode.connect(analyserNode)

  const pcmData = new Float32Array(analyserNode.fftSize)
  const onFrame = () => {
    analyserNode.getFloatTimeDomainData(pcmData)
    const sumSquares = pcmData.reduce((sum, amplitude) => sum + amplitude * amplitude, 0.0)

    if (started) {
      audioLevel = Math.sqrt(sumSquares / pcmData.length)
      audioLevelElement.value = audioLevel
      window.requestAnimationFrame(onFrame)
    }
  }
  window.requestAnimationFrame(onFrame)
}

/**
 * Handle the start button click.
 * This will request the audio stream.
 * This will start the audio level detection loop.
 *
 * @returns {Promise<void>}
 */
const handleStartBtnClick = async () => {
  started = true
  console.log('startBtn clicked')
  stopBtn.style.display = 'block'
  startBtn.style.display = 'none'
  audioSourceSelect.disabled = true
  enableTranscriptionsElement.disabled = true

  const stream = await getAudioStream()
  handleAudioLevel(stream)

  mediaRecorder = new MediaRecorder(stream, {
    mimeType
  })
  mediaRecorder.addEventListener('dataavailable', (e) => {
    audioChunks.push(e.data)
    handleSendAudio()
  })
  mediaRecorder.start()
  recordingInterval = setInterval(() => {
    mediaRecorder.requestData()
  }, audioRequestDataInterval)
}

/**
 * Handle the stop button click.
 * This will stop the audio level detection loop.
 * This will also stop the audio stream.
 *
 * @returns {Promise<void>}
 */
const handleStopBtnClick = async () => {
  started = false
  audioLevel = 0.0
  console.log('stopBtn clicked')
  stopBtn.disabled = true
  stopBtn.innerText = 'Refresh to restart the demo! Recorded files are in the "records" folder.'

  if (mediaRecorder) {
    mediaRecorder.stop()
    mediaRecorder = null
  }

  if (recordingInterval) {
    clearInterval(recordingInterval)
    recordingInterval = null
  }

  audioChunks = []
  previousChunk = null

  audioLevelElement.value = 0.0
}

// Add event listeners to the buttons.
startBtn?.addEventListener('click', handleStartBtnClick)
stopBtn?.addEventListener('click', handleStopBtnClick)

// Inspect the audio level every 100ms.
let sameStateCount = 0
let isSpeaking = false

const audioLevelInterval = setInterval(() => {
  const audible = audioLevel > audioDetectionLevel

  if (audible) {
    if (sameStateCount < audioDetectionCounter) {
      sameStateCount += 1
    }
    if (sameStateCount >= audioMinDetectionCounter) {
      isSpeaking = true
    }
  } else if (sameStateCount > 0) {
    sameStateCount -= 1
  } else {
    isSpeaking = false
  }
  console.log('is speaking:', isSpeaking, sameStateCount)
}, 100)

// Stop the audio level detection after 15 minutes.
setTimeout(() => {
  clearInterval(audioLevelInterval)
}, 60 * 15 * 1000)
