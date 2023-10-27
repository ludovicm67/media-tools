import { createReadStream, writeFileSync } from 'node:fs';

const filePath = './records/01HD64EMBJ0K60HF7R1PH0V75E-01HD6JWC0Y13YTY68AMYJNRWFN.webm';
// const filePath = './records/01HD64A2CXC8GDS8MQJYDHG0QY-01HD64A8C3V712V739THGPW2GP.webm';

const fileContentStream = createReadStream(filePath, {
  highWaterMark: 1024,
});

const data = [];

let nbBytes = 0;
let step = 0;
let stepOffset = 0;

// Steps:
// -1: invalid
// 0: Check Matroska header
// 1: find cluster element

const matroskaHeader = [0x1a, 0x45, 0xdf, 0xa3];
const clusterElement = [0x1F, 0x43, 0xB6, 0x75]; // 0x1F43B675

let header = [];
let cluster = [];


const analyzeByte = (byte) => {
  // Expect to read the Matroska header
  if (step === 0) {
    // step = 1; return;
    // If the current byte is not the one we expect from the Matroska header
    // => we are not reading a Matroska file, so we can stop here
    if (byte !== matroskaHeader[stepOffset]) {
      step = -1;
      console.log("invalid file!")
      return;
    }

    header.push(byte);

    // we managed to read all bytes from the Matroska header
    // => we can move to the next step
    if (stepOffset === matroskaHeader.length - 1) {
      step = 1;
      stepOffset = 0; // reset step offset for next step
      console.log('valid Matroska header read!')
      return;
    }
    stepOffset++;
  } else if (step === 1) {
    header.push(byte);

    if (byte !== clusterElement[stepOffset]) {
      stepOffset = 0;
      return;
    }

    // we managed to read all bytes from the Matroska header
    // => we can move to the next step
    if (stepOffset === clusterElement.length - 1) {
      step = 2;
      stepOffset = 0; // reset step offset for next step
      console.log('valid cluster element read!')
      return;
    }
    stepOffset++;
  } else if (step === 2) {
    cluster.push(byte);
    if (byte === 0xA1) {
      console.log(nbBytes, "block data");
    }
  }
}

const analyzeChunk = async (chunk) => {
  if (step === -1) {
    return;
  }

  for (let i = 0; i < chunk.length; i++) {
    analyzeByte(chunk[i]);
    nbBytes++;
  }
};

fileContentStream.on('data', async (chunk) => {
  // first chunk
  // if (data.length === 0) {
  //   console.log("first chunk");
  // console.log(chunk[0]);
  data.push(chunk);
  // console.log(chunk);
  await analyzeChunk(chunk);
  //   return;
  // }

  // console.log(chunk);
  data.push(chunk);
});

fileContentStream.on('end', async () => {
  console.log("end");

  console.log("nbBytes", nbBytes);
  console.log("step", step);
  console.log("header", header);
  console.log("cluster", cluster);

  const uHeader = new Uint8Array(header);
  const uCluster = new Uint8Array(cluster);

  const fullBlob = new Blob([uHeader]);
  const arrayBuffer = await fullBlob.arrayBuffer();
  writeFileSync('header2.webm', Buffer.from(arrayBuffer));
});

fileContentStream.on('error', () => {
  console.error('something went wrong');
});
