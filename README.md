# Audio recorder

## About the Proof of Concept

This is a proof of concept for a simple audio recorder using current web technologies.

It consists of two parts:

- **Client** (`main.js`): The web page that records audio using a [`MediaRecorder`](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) when manually initiated by the user. The recorded audio data is then sent to the backend in POST requests, transmitted in chunks.
- **Server** (`server.js`): A basic NodeJS server that receives audio data and saves it to multiple files.

To ensure a consistent flow of audio data to the backend, the client periodically sends small audio chunks.
However, this segmentation creates an issue where the first chunk is playable, but subsequent ones are not.

Here are some potential solutions to address this issue:

1. The client sends audio data as one large chunk, but this approach risks data loss if the client disconnects or encounters data size issues.

2. The client sends audio data in chunks, and the backend combines them into a single file. While this approach works, it may require waiting for the recording to finish for "live" audio data operations like transcription.

3. Similarly, the backend can "fix" the chunked files, enabling individual playability. However, this method may consume substantial backend resources when handling large data volumes.

4. Alternatively, the client can "fix" the chunked files directly, resulting in slightly higher resource usage on the client side but allowing for individual playability and functionality.

These options offer different trade-offs in terms of data management and resource utilization for the audio recording proof of concept.

## Start the demo

```sh
# Install required dependencies
npm install
# Start the demo: client and server
npm start
```

Then open http://localhost:5173/ in your browser.

Once you start the recording, the audio data will be sent to the backend, and you will be able to get the files in the `records` folder.
They are named in a way that will allow you to play them in the correct order by sorting them.

## How the chunks are fixed

The audio format currently in use is WebM, which has become the standard today.
However, there's an issue with these audio chunks because they lack crucial metadata.
This essential metadata is stored in the first chunk, so we need to replicate it in the other chunks.
The challenge here is that we can't simply extract the header bytes and append them to all other chunks, as each chunk is not an independent "block".
They are interconnected, which can confuse the audio player.

Since WebM is based on Matroska, we can use Matroska tools, available at [this link](https://www.bunkus.org/videotools/mkvtoolnix/), to examine the chunks and ensure they are structured correctly.
Specifically, the [`mkvinfo` tool](https://mkvtoolnix.download/doc/mkvinfo.html) is employed to inspect these chunks.

Matroska employs the EBML (Extensible Binary Meta Language) format, which is a binary format consisting of elements.
To address the issue, we must parse the EBML format to identify the specific elements that need to be transferred from the first chunk to the subsequent ones.
These elements include the header, which contains essential metadata such as the codec, sampling frequency, and track type.
Additionally, we need to transfer the last block of the first chunk, even if it's incomplete, as we will get the end of the block in the next chunk.

The proposed solution is to concatenate the header and the last block of the first chunk with the next chunk.
This operation ensures that the structural integrity of the audio file is maintained, making it playable without causing confusion for the audio player.

## Future Improvements

In order to enhance the functionality of the audio recorder and accommodate a wider range of browsers and network/system restrictions, the following future improvements are proposed:

- **Utilize Websockets:** Replace the current POST requests with Websockets. Websockets provide real-time, bidirectional communication and can significantly improve the recording process. However, it's essential to implement graceful fallback mechanisms for browsers that do not support Websockets or users on restricted networks/systems.
- **Implement WebRTC:** Integrate WebRTC to enable the direct streaming of audio data to the backend. WebRTC offers efficient real-time communication capabilities. Similar to the Websockets approach, it's crucial to have robust fallback solutions for browsers that lack WebRTC support or for users facing network or system limitations.

These improvements aim to leverage advanced web technologies for enhanced performance while ensuring compatibility and usability for a broad user base, including those with older browsers or restricted network/system environments.
