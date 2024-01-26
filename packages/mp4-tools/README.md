# MP4 tools

## Install this library

```sh
npm install @ludovicm67/mp4-tools
```

The following is exposed:

- `Buffer`: Buffer that works on both Node.js and browsers
- `utils.blobToArrayBuffer`: a function to convert a Blob to an ArrayBuffer
- `fix`: the function to use to fix a chunk by using the previous one

## MP4 structure

MP4 files are structured into several different box types, each serving a specific purpose:

- **`ftyp` (File Type Box):** The first box in the file, declaring file type, compatibility, and specifications.
- **`moov` (Movie Box):** Contains all metadata about the video, like tracks, duration, etc. It includes sub-boxes:
  - `mvhd` (Movie Header Box): Global information about the movie.
  - `trak` (Track Box): A container for a single track (audio, video, etc.), with sub-boxes like `tkhd` (Track Header) and `mdia` (Media).
- **`moof` (Movie Fragment Box):** Contains all metadata about a single fragment of the movie, with sub-boxes like `mfhd` (Movie Fragment Header) and `traf` (Track Fragment).
- **`mdat` (Media Data Box):** Contains the actual media data, such as video frames and audio samples.

## Command line tool

The `cli` folder contains a command line tool that can be used to fix or merge chunks.

Have a look at the [README of the CLI](./cli/README.md) for more information.
