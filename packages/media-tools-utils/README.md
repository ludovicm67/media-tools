# Media Tools Utils

This package contains utilities that are used in other packages.

## Install this library

```sh
npm install @ludovicm67/media-tools-utils
```

The following is exposed:

- `Buffer`: Buffer that works on both Node.js and browsers
- `utils.blobToArrayBuffer`: a function to convert a Blob to an ArrayBuffer

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
