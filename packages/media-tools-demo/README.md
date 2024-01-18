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

The audio format currently in use are WebM and MP4, which has become the standard today.
However, there's an issue with these audio chunks because they lack crucial metadata.
This essential metadata is stored in the first chunk, so we need to replicate it in the other chunks.
The challenge here is that we can't simply extract the header bytes and append them to all other chunks, as each chunk is not an independent "block".
They are interconnected, which can confuse the audio player.

### WebM

WebM is supported on Firefox and Chrome-based browsers.

Since WebM is based on Matroska, we can use Matroska tools, available at [this link](https://www.bunkus.org/videotools/mkvtoolnix/), to examine the chunks and ensure they are structured correctly.
Specifically, the [`mkvinfo` tool](https://mkvtoolnix.download/doc/mkvinfo.html) is employed to inspect these chunks.

Matroska employs the EBML (Extensible Binary Meta Language) format, which is a binary format consisting of elements.
To address the issue, we must parse the EBML format to identify the specific elements that need to be transferred from the first chunk to the subsequent ones.
These elements include the header, which contains essential metadata such as the codec, sampling frequency, and track type.
Additionally, we need to transfer the last block of the first chunk, even if it's incomplete, as we will get the end of the block in the next chunk.

The proposed solution is to concatenate the header and the last block of the first chunk with the next chunk.
This operation ensures that the structural integrity of the audio file is maintained, making it playable without causing confusion for the audio player.

### MP4

MP4 is supported on Safari.

MP4 is based on the ISO Base Media File Format (ISOBMFF), which is a binary format consisting of boxes.

For recordings, Safari is creating MP4 files with the following boxes:

- **`ftyp` (File Type Box):** The first box in the file, declaring file type, compatibility, and specifications.
- **`moov` (Movie Box):** Contains all metadata about the media, like tracks, duration, etc. It includes sub-boxes:
  - `mvhd` (Movie Header Box): Global information about the movie.
  - `trak` (Track Box): A container for a single track (audio, video, etc.), with sub-boxes like `tkhd` (Track Header) and `mdia` (Media).
- **`moof` (Movie Fragment Box):** Contains all metadata about a single fragment of the movie, with sub-boxes like `mfhd` (Movie Fragment Header) and `traf` (Track Fragment).
- **`mdat` (Media Data Box):** Contains the actual media data, such as video frames and audio samples.

And this is the structure of a file: `ftyp` `moov` `moof` `mdat` `moof` `mdat` `moof` `mdat` ...

You can see the `moof` and `mdat` boxes are repeated, and each `moof` box contains the metadata for the following `mdat` box.

The library is able to fix the next chunk by copying the `ftyp` and `moov` boxes from the first chunk to the next chunk.

It is also able to fix the `moof` and `mdat` boxes in case they are cut in the middle, but our tests showed that Safari is not cutting them in the middle, so this should not be needed.
