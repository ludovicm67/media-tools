# We provide a CLI to run some tools

## Getting Started

Go to the previous directory and install the dependencies:

```sh
# Go to the previous directory
cd ../
# Install the dependencies
npm install
# Go back to this directory
cd -
```

You can see if you are able to run the CLI by running:

```sh
node index.js --help
```

You should get a similar output:

```
Usage: mp4-tools [options] [command]

A set of tools for working with MP4 files

Options:
  -V, --version                                                   output the version number
  -h, --help                                                      display help for command

Commands:
  fix [options] <previous chunk> <broken chunk>                   Fix a MP4 file using the previous chunk
  merge [options] <first chunk> <second chunk> [other chunks...]  Merge MP4 chunks together. The first chunk should
                                                                  be a sane chunk.
  help [command]                                                  display help for command
```

Replace `mp4-tools` with `node index.js` in the `Usage` section to know how to run the commands.

## Fixing the chunks

```
Usage: mp4-tools fix [options] <previous chunk> <broken chunk>

Fix a MP4 file using the previous chunk

Arguments:
  previous chunk           path to the MP4 file (previous sane chunk)
  broken chunk             path to the MP4 file to fix (broken chunk)

Options:
  -o, --out <output path>  path to export the fixed MP4 chunk to
  --debug                  show debug information
  -h, --help               display help for command
```

## Merging chunks

```
Usage: mp4-tools merge [options] <first chunk> <second chunk> [other chunks...]

Merge MP4 chunks together. The first chunk should be a sane chunk.

Arguments:
  first chunk              path to the first chunk of the file
  second chunk             path to the second chunk of the file
  other chunks             other chunks to merge together

Options:
  -o, --out <output path>  path to export the fixed MP4 chunk to
  --debug                  show debug information
  -h, --help               display help for command
```
