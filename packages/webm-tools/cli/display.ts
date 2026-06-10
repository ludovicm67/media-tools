import { readFile } from "node:fs/promises";
import { display as displayWebM } from "../lib/index.js";

/**
 * Display information about a WebM file.
 *
 * @param fileName The path to the WebM file.
 * @param options Options from the CLI.
 */
const display = async (fileName: string, options: Record<string, unknown>): Promise<void> => {
  const debug = options.debug as boolean | undefined;

  if (debug) {
    console.info("Debug mode enabled");
    console.log(`> File path: ${fileName}`);
    console.log("");
  }

  const fileBuffer = (await readFile(fileName)) as unknown as Buffer;

  displayWebM(fileBuffer);
};

export default display;
