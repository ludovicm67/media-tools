# Media Tools

This package contains various tools to work with media files of different format.

## Install this library

```sh
npm install @ludovicm67/media-tools
```

The following is also exposed:

- `Buffer`: Buffer that works on both Node.js and browsers
- `utils.blobToArrayBuffer`: a function to convert a Blob to an ArrayBuffer
- `mp4`: MP4 tools
- `ogg`: OGG tools
- `webm`: WebM tools
- `fix`: the function to use to fix a chunk by using the previous one
- `MediaTypes`: an enum with the different media types

## Angular

If you are using Angular, you might need to add `buffer` as an `allowedCommonJsDependencies` in your `angular.json` file, like this:

```json
{
  "projects": {
    "YOUR_PROJECT": {
      "architect": {
        "build": {
          "options": {
            "allowedCommonJsDependencies": ["buffer"]
          }
        }
      }
    }
  }
}
```

by replacing `YOUR_PROJECT` with the name of your project.

This will prevent the display of some warnings when building your project.
