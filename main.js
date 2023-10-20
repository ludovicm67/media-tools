// @ts-check

import { monotonicFactory } from 'ulid';

const ulid = monotonicFactory();

const userId = ulid();
console.log(`Current user ID=${userId}`);

// Configurable variables
const audioDetectionLevel = 0.01;
const audioDetectionCounter = 5;
const audioMinDetectionCounter = 2;
const audioRequestDataInterval = 2000;

// Internal variables
let audioStream = null;
let started = false;
let audioLevel = 0.0;
let mediaRecorder = null;
let recordingInterval = null;
let audioChunks = [];
let firstChunk = null;

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

const handleSendAudio = async () => {
  if (audioChunks.length < 1) {
    console.log("no audio chunks to send");
    return;
  }

  const body = new FormData();
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  body.append('audio', audioBlob, 'audio.webm');
  const response = await fetch(`http://localhost:3000/audio/${userId}`, {
    method: 'POST',
    body,
  });
  console.log('response:', response);
  audioChunks = [];
};

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
    for (const amplitude of pcmData) {
      sumSquares += amplitude * amplitude;
    }

    if (started) {
      audioLevel = Math.sqrt(sumSquares / pcmData.length);
      // @ts-ignore
      audioLevelElement.value = audioLevel;
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

  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.addEventListener('dataavailable', (e) => {
    // if (!firstChunk) {
    //   console.log("FIRST CHUNK", e.data);
    //   firstChunk = e.data;
    //   return;
    // }
    audioChunks.push(e.data);
    handleSendAudio();
  });
  mediaRecorder.start();
  // mediaRecorder.requestData();
  recordingInterval = setInterval(() => {
    mediaRecorder.requestData();
  }, audioRequestDataInterval);
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

  if (mediaRecorder) {
    mediaRecorder.stop();
    mediaRecorder = null;
  }

  if (recordingInterval) {
    clearInterval(recordingInterval);
    recordingInterval = null;
  }

  audioChunks = [];
  firstChunk = null;

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
    if (sameStateCount < audioDetectionCounter) {
      sameStateCount += 1;
    }
    if (sameStateCount >= audioMinDetectionCounter) {
      isSpeaking = true;
    }
  } else {
    if (sameStateCount > 0) {
      sameStateCount -= 1;
    } else {
      isSpeaking = false;
    }
  }
  console.log('is speaking:', isSpeaking, sameStateCount);
}, 100);
