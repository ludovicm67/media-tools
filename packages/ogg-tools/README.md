# OGG tools

## Install this library

```sh
npm install @ludovicm67/ogg-tools
```

The following is exposed:

- `Buffer`: Buffer that works on both Node.js and browsers
- `utils.blobToArrayBuffer`: a function to convert a Blob to an ArrayBuffer
- `fix`: the function to use to fix a chunk by using the previous one

## Command line tool

The `cli` folder contains a command line tool that can be used to fix or merge chunks.

Have a look at the [README of the CLI](./cli/README.md) for more information.
