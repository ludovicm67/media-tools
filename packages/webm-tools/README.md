# WebM tools

## Install this library

```sh
npm install @ludovicm67/webm-tools
```

The following is exposed:

- `Buffer`: Buffer that works on both Node.js and browsers
- `utils.blobToArrayBuffer`: a function to convert a Blob to an ArrayBuffer
- `ebmlSchema`: the EBML schema
- `ebml`: an object with the following methods:
  - `resetDecoder`: reset the decoder state
  - `decode`: decode an EBML element
  - `displayDecodedElements`: display the decoded elements using `console.log`
- `fix`: the function to use to fix a chunk by using the previous one

## How the chunks are fixed

WebM is a media format which has become the standard today.
However, there's an issue while doing audio chunks because they lack crucial metadata.
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

## Command line tool

The `cli` folder contains a command line tool that can be used to fix or merge chunks.

Have a look at the [README of the CLI](./cli/README.md) for more information.
