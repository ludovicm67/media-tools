// @ts-check

// Configurable variables
const audioDetectionLevel = 0.01;

// Internal variables
let audioStream = null;
let started = false;
let audioLevel = 0.0;

// HTML elements from the page
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const audioLevelElement = document.getElementById('audioLevel');

/**
 * Request the audio stream from the user.
 *
 * @returns {Promise<MediaStream>} The audio stream.
 */
const getAudioStream = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: false, audio: true,
  });
  audioStream = stream;
  console.log("got audio stream", audioStream);
  return stream;
}

/**
 * Handle audio level from the audio stream.
 * This will update the global `audioLevel` variable.
 * This will be running on a loop until `started` is set to false.
 *
 * @param {MediaStream} stream The audio stream to analyze.
 */
const handleAudioLevel = (stream) => {
  const audioContext = new AudioContext();
  const mediaStreamAudioSourceNode = audioContext.createMediaStreamSource(stream);
  const analyserNode = audioContext.createAnalyser();
  mediaStreamAudioSourceNode.connect(analyserNode);

  const pcmData = new Float32Array(analyserNode.fftSize);
  const onFrame = () => {
    analyserNode.getFloatTimeDomainData(pcmData);
    let sumSquares = 0.0;
    for (const amplitude of pcmData) { sumSquares += amplitude * amplitude; }
    audioLevel = Math.sqrt(sumSquares / pcmData.length);
    // @ts-ignore
    audioLevelElement.value = audioLevel;
    if (started) {
      window.requestAnimationFrame(onFrame);
    }
  };
  window.requestAnimationFrame(onFrame);
}

/**
 * Handle the start button click.
 * This will request the audio stream.
 * This will start the audio level detection loop.
 *
 * @returns {Promise<void>}
 */
const handleStartBtnClick = async () => {
  started = true;
  console.log('startBtn clicked');
  const stream = await getAudioStream();
  handleAudioLevel(stream);
}

/**
 * Handle the stop button click.
 * This will stop the audio level detection loop.
 * This will also stop the audio stream.
 *
 * @returns {Promise<void>}
 */
const handleStopBtnClick = async () => {
  started = false;
  audioLevel = 0.0;
  console.log('stopBtn clicked');

  // @ts-ignore
  audioLevelElement.value = 0.0;
}

// Add event listeners to the buttons.
startBtn?.addEventListener('click', handleStartBtnClick);
stopBtn?.addEventListener('click', handleStopBtnClick);

// Inspect the audio level every 100ms.
let wasAudioMuted = null;
let sameStateCount = 0;
let isSpeaking = false;
const audioLevelInterval = setInterval(() => {
  const audible = audioLevel > audioDetectionLevel;

  if (audible) {
    if (sameStateCount < 10) {
      sameStateCount += 1;
    } else {
      isSpeaking = true;
      console.log('is speaking:', isSpeaking);
    }
  } else {
    if (sameStateCount > 0) {
      sameStateCount -= 1;
    } else {
      isSpeaking = false;
      console.log('is speaking:', isSpeaking);
    }
  }
}, 100);
