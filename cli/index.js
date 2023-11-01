// @ts-check
import { Command } from 'commander';
import info from '../package.json' assert { type: 'json' };
import fix from './fix.js';

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
  .action(fix);

program.parse(process.argv);
