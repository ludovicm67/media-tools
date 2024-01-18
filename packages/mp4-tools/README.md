# MP4 tools

## Install this library

```sh
npm install @ludovicm67/mp4-tools
```

The following is exposed:

- `Buffer`: Buffer that works on both Node.js and browsers
- `utils.blobToArrayBuffer`: a function to convert a Blob to an ArrayBuffer

## MP4 structure

MP4 files are structured into several different box types, each serving a specific purpose:

- **`ftyp` (File Type Box):** The first box in the file, declaring file type, compatibility, and specifications.
- **`moov` (Movie Box):** Contains all metadata about the video, like tracks, duration, etc. It includes sub-boxes:
  - `mvhd` (Movie Header Box): Global information about the movie.
  - `trak` (Track Box): A container for a single track (audio, video, etc.), with sub-boxes like `tkhd` (Track Header) and `mdia` (Media).
- **`mdat` (Media Data Box):** Contains the actual media data, such as video frames and audio samples.
- **`mdia` (Media Box):** Located within the `trak` box, it includes media-specific information with sub-boxes like `mdhd` (Media Header), `hdlr` (Handler Reference), and `minf` (Media Information).
- **`minf` (Media Information Box):** Provides detailed information about the media data with sub-boxes like `vmhd`, `smhd`, `hmhd`, `nmhd` for headers, and `dinf` (Data Information) pointing to the media data.
- **`stbl` (Sample Table Box):** A sub-box of `minf`, it contains time and data indexing of the media. Key sub-boxes include `stsd` (Sample Description), `stts` (Decoding Time to Sample), `stsc` (Sample to Chunk), `stsz` (Sample Size), and `stco` (Chunk Offset).
- **`udta` (User Data Box):** An optional box containing user-defined data such as metadata tags.
- **`stsd` (Sample Descriptions Box):** Found within `stbl`, it provides detailed information about each sample in the media stream.

## Command line tool

The `cli` folder contains a command line tool that can be used to fix or merge chunks.

Have a look at the [README of the CLI](./cli/README.md) for more information.
