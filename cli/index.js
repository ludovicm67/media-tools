// @ts-check
import { writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { Command } from 'commander';
import { decode, resetDecoder, displayDecodedElements } from '../lib/ebml.js';
import info from '../package.json' assert { type: 'json' };

const program = new Command();

program
  .name('webm-tools')
  .description('A set of tools for working with WebM files')
  .version(info.version);

program.command('fix')
  .description('Fix a WebM file using the previous chunk')
  .argument('<previous chunk>', 'path to the WebM file (previous sane chunk)')
  .argument('<broken chunk>', 'path to the WebM file to fix (broken chunk)')
  .argument('<output path>', 'path to export the fixed WebM chunk to')
  .option('--debug', 'show debug information')
  .action(async (prevChunkPath, brokenChunkPath, outputPath, options) => {
    const debug = options.debug;
    if (debug) {
      console.info('Debug mode enabled');
      console.log(`> Previous chunk path: ${prevChunkPath}`);
      console.log(`> Broken chunk path: ${brokenChunkPath}`);
      console.log(`> Output path: ${outputPath}`);
      console.log('');
    }

    const prevChunk = await readFile(prevChunkPath);
    const brokenChunk = await readFile(brokenChunkPath);

    resetDecoder({
      debug: false,
    });
    const { decoded, headerBuffer, lastStartBuffer } = decode(prevChunk);
    if (debug) {
      console.info("\nDecoded previous chunk:");
      displayDecodedElements(decoded);
      console.log('');
    }

    const newFile = Buffer.concat([headerBuffer, lastStartBuffer, brokenChunk]);
    resetDecoder({
      debug: false,
    });
    const { decoded: newFileDecoded } = decode(newFile);
    if (debug) {
      console.info("\nDecoded fixed chunk:");
      displayDecodedElements(newFileDecoded);
      console.log('');

      console.info(`\nWriting fixed chunk to file: '${outputPath}'`);
    }

    writeFileSync(outputPath, newFile)
  });

program.parse(process.argv);
