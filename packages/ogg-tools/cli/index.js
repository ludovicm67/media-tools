// @ts-check

import { Command } from "commander";
import fix from "./fix.js";
import merge from "./merge.js";

const program = new Command();

program
  .name("ogg-tools")
  .description("A set of tools for working with OGG files");

program
  .command("fix")
  .description("Fix a OGG file using the previous chunk")
  .argument("<previous chunk>", "path to the OGG file (previous sane chunk)")
  .argument("<broken chunk>", "path to the OGG file to fix (broken chunk)")
  .requiredOption(
    "-o, --out <output path>",
    "path to export the fixed OGG chunk to",
  )
  .option("--debug", "show debug information")
  .action(fix);

program
  .command("merge")
  .description(
    "Merge OGG chunks together. The first chunk should be a sane chunk.",
  )
  .argument("<first chunk>", "path to the first chunk of the file")
  .argument("<second chunk>", "path to the second chunk of the file")
  .argument("[other chunks...]", "other chunks to merge together")
  .requiredOption(
    "-o, --out <output path>",
    "path to export the fixed OGG chunk to",
  )
  .option("--debug", "show debug information")
  .action(merge);

program.parse(process.argv);
