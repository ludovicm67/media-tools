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
Usage: webm-tools [options] [command]

A set of tools for working with WebM files

Options:
  -V, --version                                                   output the version number
  -h, --help                                                      display help for command

Commands:
  fix [options] <previous chunk> <broken chunk>                   Fix a WebM file using the previous chunk
  merge [options] <first chunk> <second chunk> [other chunks...]  Merge WebM chunks together. The first chunk should
                                                                  be a sane chunk.
  help [command]                                                  display help for command
```

Replace `webm-tools` with `node index.js` in the `Usage` section to know how to run the commands.

## Fixing the chunks

```
Usage: webm-tools fix [options] <previous chunk> <broken chunk>

Fix a WebM file using the previous chunk

Arguments:
  previous chunk           path to the WebM file (previous sane chunk)
  broken chunk             path to the WebM file to fix (broken chunk)

Options:
  -o, --out <output path>  path to export the fixed WebM chunk to
  --debug                  show debug information
  -h, --help               display help for command
```

## Merging chunks

```
Usage: webm-tools merge [options] <first chunk> <second chunk> [other chunks...]

Merge WebM chunks together. The first chunk should be a sane chunk.

Arguments:
  first chunk              path to the first chunk of the file
  second chunk             path to the second chunk of the file
  other chunks             other chunks to merge together

Options:
  -o, --out <output path>  path to export the fixed WebM chunk to
  --debug                  show debug information
  -h, --help               display help for command
```
