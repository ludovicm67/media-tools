// @ts-check

import { Command } from "commander";
import fix from "./fix.js";
import merge from "./merge.js";
import display from "./display.js";

const program = new Command();

program
  .name("webm-tools")
  .description("A set of tools for working with WebM files");

program
  .command("fix")
  .description("Fix a WebM file using the previous chunk")
  .argument("<previous chunk>", "path to the WebM file (previous sane chunk)")
  .argument("<broken chunk>", "path to the WebM file to fix (broken chunk)")
  .requiredOption(
    "-o, --out <output path>",
    "path to export the fixed WebM chunk to",
  )
  .option("--debug", "show debug information")
  .action(fix);

program
  .command("merge")
  .description(
    "Merge WebM chunks together. The first chunk should be a sane chunk.",
  )
  .argument("<first chunk>", "path to the first chunk of the file")
  .argument("<second chunk>", "path to the second chunk of the file")
  .argument("[other chunks...]", "other chunks to merge together")
  .requiredOption(
    "-o, --out <output path>",
    "path to export the fixed WebM chunk to",
  )
  .option("--debug", "show debug information")
  .action(merge);

program
  .command("display")
  .description("Display information about a WebM file")
  .argument("<file name>", "path to the WebM file")
  .option("--debug", "show debug information")
  .action(display);

program.parse(process.argv);
