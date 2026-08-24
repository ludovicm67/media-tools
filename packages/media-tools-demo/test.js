import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, readdir, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import net from "node:net";
import { chromium } from "playwright";

import { webm } from "@ludovicm67/media-tools";

const config = {
  removeFiles: true,
};

const currentDir = dirname(fileURLToPath(import.meta.url));

const waitSeconds = async (seconds) => {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

/**
 * Ask the OS for a currently-free TCP port.
 *
 * @returns {Promise<number>} An available port number.
 */
const getFreePort = () =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

/**
 * Navigate to the dev server, retrying until it is up, then wait until the app
 * has finished initializing (the `data-app-ready` marker set by main.js).
 * This replaces fixed sleeps and removes the cold-start race.
 *
 * @param {import("playwright").Page} page
 * @param {string} url
 * @param {number} timeoutMs
 */
const gotoWhenReady = async (page, url, timeoutMs = 60000) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await page.goto(url, { waitUntil: "load" });
      break;
    } catch (error) {
      if (Date.now() > deadline) {
        throw error;
      }
      await waitSeconds(0.5);
    }
  }
  await page.waitForSelector("html[data-app-ready='true']", {
    timeout: Math.max(1000, deadline - Date.now()),
  });
};

/**
 * Terminate the whole `npm run start` process tree (npm -> run-p -> vite/node),
 * not just the top-level npm process. Relies on the child being spawned as a
 * process-group leader (`detached: true`).
 *
 * @param {import("node:child_process").ChildProcess} app
 */
const stopApp = (app) => {
  if (app.pid === undefined) {
    return;
  }
  try {
    process.kill(-app.pid, "SIGTERM");
  } catch {
    try {
      app.kill("SIGTERM");
    } catch {
      // Process already gone.
    }
  }
};

export const browsers = [
  {
    name: "Chromium",
    browser: chromium,
    options: {
      headless: true,
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
    permissions: ["camera", "microphone"],
  },
];

const browser = browsers[0];

const runTests = async (url) => {
  console.log("Launching the browser…");
  const instance = await browser.browser.launch(browser.options);

  try {
    const context = await instance.newContext({
      ignoreHTTPSErrors: true,
      permissions: browser.permissions,
    });
    const page = await context.newPage();

    await gotoWhenReady(page, url);

    await page.click("text=Start");

    await waitSeconds(30);

    await page.click("text=Stop");
    await waitSeconds(2);
  } finally {
    console.log("Closing the browser");
    await instance.close();
  }
};

const getFiles = async (directory) => {
  const files = await readdir(directory);
  return files;
};

const arrayDifference = (array1, array2) => {
  return array2.filter((element) => !array1.includes(element));
};

const main = async () => {
  const errors = [];

  // Pin dedicated, collision-free ports for both the dev server and backend so
  // the test never clashes with other processes on the default 5173 / 3000.
  const vitePort = await getFreePort();
  const backendPort = await getFreePort();
  const url = `https://localhost:${vitePort}/`;

  const app = spawn("npm", ["run", "start"], {
    cwd: currentDir,
    env: { ...process.env, VITE_PORT: String(vitePort), BACKEND_PORT: String(backendPort) },
    detached: true, // own process group, so stopApp() can kill the whole tree
    stdio: ["ignore", "inherit", "inherit"],
  });

  const recordsPath = join(currentDir, "records");
  const filesBefore = await getFiles(recordsPath);

  let exitCode = 0;

  try {
    // Run tests
    await runTests(url);
    console.log("Browser run was successful!");
  } catch (error) {
    console.log("Some errors during browser run…");
    errors.push(error.message);
    exitCode = 1;
  } finally {
    // Stop the whole app process tree
    stopApp(app);
  }

  const filesAfter = await getFiles(recordsPath);

  const newFiles = arrayDifference(filesBefore, filesAfter);
  const nbNewFiles = newFiles.length;
  console.log(`New files: ${nbNewFiles}`);
  if (nbNewFiles === 0) {
    errors.push("No new files were created");
  }

  const webMFiles = newFiles.filter((file) => file.endsWith(".webm"));
  if (webMFiles.length === 0) {
    errors.push("No WebM files were created");
  }

  // const debugFiles = newFiles.filter((file) => file.includes('debug'))
  const fixedFiles = webMFiles.filter((file) => !file.includes("debug"));

  // Read the content of all the files
  const filesContent = await Promise.all(
    fixedFiles.map(async (file) => {
      const filePath = join(recordsPath, file);
      const fileContent = await readFile(filePath);
      const { decoded } = webm.decode(fileContent);

      const timeElements = [];
      for (const decodedElement of decoded) {
        const element = decodedElement[1];
        switch (element.name) {
          case "SimpleBlock":
          case "Block":
          case "Timecode":
            timeElements.push({
              name: element.name,
              timecode: element.value,
            });
            break;
          default:
            break;
        }
      }

      return { file, decoded, timeElements };
    }),
  );

  if (filesContent.length === 0) {
    errors.push("No content in the files");
  }

  for (const fileContent of filesContent) {
    const { file, timeElements } = fileContent;
    if (timeElements.length === 0) {
      errors.push(`No time elements in the file: ${file}`);
    }
    console.log(`File: ${file}`);
    let lastTime = 0;
    for (const timeElement of timeElements) {
      const { name, timecode } = timeElement;
      const difference = timecode - lastTime;
      console.log(` - ${name}: ${timecode} (${difference})`);
      lastTime = timecode;

      if (difference >= 100) {
        errors.push(
          `Too big time code difference.\n   File: ${file}\n   ${name}: ${timecode} (difference ${difference})`,
        );
      }
    }
  }

  // Remove files if configured
  if (config.removeFiles) {
    console.debug("\nRemoving files...");
    for (const file of newFiles) {
      const filePath = join(recordsPath, file);
      console.debug(` - Removing file: ${filePath.split("/").pop()}`);
      await unlink(filePath);
    }
  }

  // Display test results
  if (errors.length > 0) {
    console.error("\nFinished with errors! 🚨");
    errors.forEach((error) => console.error(` - ${error}`));
    exitCode = 1;
  } else {
    console.log("\nAll tests passed! 🎉");
  }

  process.exit(exitCode);
};

await main();
