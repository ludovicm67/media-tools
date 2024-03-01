import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdir, unlink } from 'node:fs/promises'
import { exec } from 'node:child_process'
import { chromium } from 'playwright'

const config = {
  removeFiles: true
}

const currentDir = dirname(fileURLToPath(import.meta.url))

const waitSeconds = async (seconds) => {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

export const browsers = [
  {
    name: 'Chromium',
    browser: chromium,
    options: {
      headless: false,
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream'
      ]
    },
    permissions: ['camera', 'microphone']
  }
]

const browser = browsers[0]

const runTests = async () => {
  const instance = await browser.browser.launch(browser.options)

  await waitSeconds(3)

  try {
    const context = await instance.newContext({ ignoreHTTPSErrors: true })
    const page = await context.newPage({ permissions: browser.permissions })
    const url = 'https://localhost:5173/'
    await page.goto(url)
    await waitSeconds(3)

    await page.click('text=Start')

    await waitSeconds(15)

    await page.click('text=Stop')
    // eslint-disable-next-line no-useless-catch
  } catch (error) {
    throw error
  } finally {
    console.log('Closing the browser')
    await instance.close()
  }
}

const getFiles = async (directory) => {
  const files = await readdir(directory)
  return files
}

const arrayDifference = (array1, array2) => {
  return array2.filter(element => !array1.includes(element))
}

const main = async () => {
  const errors = []
  const app = exec('npm run start')

  const recordsPath = join(currentDir, 'records')
  const filesBefore = await getFiles(recordsPath)

  await waitSeconds(3)

  let exitCode = 0

  try {
    // Run tests
    await runTests()
    console.log('Browser run was successful!')
  } catch (error) {
    console.log('Some errors during browser run…')
    errors.push(error.message)
    exitCode = 1
  } finally {
    // Stop the app
    app.kill()
  }

  const filesAfter = await getFiles(recordsPath)

  const newFiles = arrayDifference(filesBefore, filesAfter)
  const nbNewFiles = newFiles.length
  console.log(`New files: ${nbNewFiles}`)

  if (nbNewFiles === 0) {
    errors.push('No new files were created')
  }

  // Remove files if configured
  if (config.removeFiles) {
    console.debug('\nRemoving files...')
    for (const file of newFiles) {
      const filePath = join(recordsPath, file)
      console.debug(` - Removing file: ${filePath.split('/').pop()}`)
      await unlink(filePath)
    }
  }

  // Display test results
  if (errors.length > 0) {
    console.error('\nFinished with errors! 🚨')
    errors.forEach(error => console.error(` - ${error}`))
    exitCode = 1
  } else {
    console.log('\nAll tests passed! 🎉')
  }

  process.exit(exitCode)
}

await main()
