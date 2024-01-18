// @ts-check
import { Command } from 'commander'
import fix from './fix.js'
import merge from './merge.js'

const program = new Command()

program
  .name('mp4-tools')
  .description('A set of tools for working with MP4 files')

program.command('fix')
  .description('Fix a MP4 file using the previous chunk')
  .argument('<previous chunk>', 'path to the MP4 file (previous sane chunk)')
  .argument('<broken chunk>', 'path to the MP4 file to fix (broken chunk)')
  .requiredOption('-o, --out <output path>', 'path to export the fixed MP4 chunk to')
  .option('--debug', 'show debug information')
  .action(fix)

program.command('merge')
  .description('Merge MP4 chunks together. The first chunk should be a sane chunk.')
  .argument('<first chunk>', 'path to the first chunk of the file')
  .argument('<second chunk>', 'path to the second chunk of the file')
  .argument('[other chunks...]', 'other chunks to merge together')
  .requiredOption('-o, --out <output path>', 'path to export the fixed MP4 chunk to')
  .option('--debug', 'show debug information')
  .action(merge)

program.parse(process.argv)
