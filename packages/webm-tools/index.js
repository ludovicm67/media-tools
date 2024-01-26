// @ts-check

// Export some utils
export { Buffer, utils } from '@ludovicm67/media-tools-utils'

// EBML tools
export { default as ebmlSchema } from './lib/ebml-schema.js'
export * as ebml from './lib/ebml.js'

// Export functions that can be used to work with WebM files
export { fix } from './lib/index.js'
