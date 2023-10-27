import { createReadStream } from 'node:fs';
import { Decoder, Encoder } from 'ebml';

const url = "good.webm";

const header = [];
const cluster = [];


const encoder = new Encoder();

const displayItems = (items) => {
  let indent = 0;
  for (const item of items) {
    const [kind, element] = item;

    if (kind === 'end') {
      indent--;
    }

    const indentString = '  '.repeat(indent);
    console.log(`${indentString}${kind}: ${element.name}`);

    if (kind === 'start') {
      indent++;
    }
  }
}

const processItems = (items) => {
  let indent = 0;
  let isHeader = false;
  for (const item of items) {
    const [kind, element] = item;
    if (kind === 'start' && element.name === 'EBML') {
      isHeader = true;
    }

    if (isHeader) {
      header.push(item);
    } else {
      for (const headerItem of header) {
        console.log(headerItem)
        encoder.write(headerItem);
      }
      return;
    }

    if (kind === 'end') {
      indent--;
    }

    const indentString = '  '.repeat(indent);
    console.log(`${indentString}${kind}: ${element.name}`, element);

    if (kind === 'start') {
      indent++;
    }

    if (kind === 'end' && element.name === 'Cluster') {
      isHeader = false;
    }
  }
}


// Specify the Matroska file you want to parse
const matroskaFile = 'good.webm';

// Create a readable stream from the Matroska file
const fileStream = createReadStream(matroskaFile);

// Create an EBML decoder
const decoder = new Decoder();

const elements = [];

// Event handler for when an element is parsed
decoder.on('data', (element) => {
  console.log(element);
  elements.push(element);
});

// Event handler for when the Matroska file has been completely parsed
decoder.on('finish', () => {
  console.log('Matroska file parsing complete');
  displayItems(elements);
  processItems(elements);
});

// Pipe the file stream to the EBML decoder
fileStream.pipe(decoder);

// const data = await readFile(url);
// let offset = 0;

// const readVariableLengthValue = () => {

// }

// while (offset < data.length) {
//   const id = data.readUInt32BE(offset);
//   offset += 4;

//   let length = 1;
//   while ((data[offset] & (0x80 >> length)) === 0) {
//     length++;
//   }
//   const bytes = data.subarray(offset, offset + length);
//   offset += length;
//   const value = data.toString('hex') //bytes.readUIntBE(0, length);

//   console.log(`Element ID: 0x${id.toString(16)}`);
//   console.log(`Data Size: ${value}`);

//   offset = data.length
// }

// console.log(data);




// const parseEBMLFile = async () => {

// }
// const url = "./records/01HD64EMBJ0K60HF7R1PH0V75E-01HD6JWC0Y13YTY68AMYJNRWFN.webm";
// const url = './records/01HD64A2CXC8GDS8MQJYDHG0QY-01HD64A8C3V712V739THGPW2GP.webm';
// const url = "merge.webm"

// const decoder = new Decoder();

// decoder.on('data', (chunk) => console.log(chunk));

// readFile(url, (err, data) => {
//   if (err) {
//     throw err;
//   }
//   decoder.write(data);
// });


// // Define your EBML structure (ID-to-Name mapping).
// const ebmlStructure = {
//   0x1A45DFA3: 'EBML',
//   0x18538067: 'Segment',
//   // Add more elements as needed.
// };

// function parseEBML (buffer, offset) {
//   while (offset < buffer.length) {
//     // Read the EBML ID.
//     const id = buffer.readUInt32BE(offset);
//     offset += 4;

//     // Read the EBML data size.
//     let dataSize = 1;
//     while ((buffer[offset] & 0x80) === 0) {
//       dataSize++;
//       offset++;
//     }
//     const sizeData = buffer.slice(offset, offset + dataSize);
//     dataSize = parseInt(sizeData.toString('hex'), 16);
//     offset += dataSize;

//     // Interpret the data based on the element ID.
//     if (ebmlStructure[id]) {
//       const elementName = ebmlStructure[id];
//       console.log(`Found Element: ${elementName}`);

//       if (elementName === 'EBML') {
//         // For a container like "Segment," recursively parse its sub-elements.
//         parseEBML(buffer, offset);
//       } else if (elementName === 'Segment') {
//         // For a container like "Segment," recursively parse its sub-elements.
//         parseEBML(buffer, offset);
//       } else {
//         parseEBML(buffer, offset);
//         // Handle other elements.
//         // You can add more cases for different elements and their data handling.
//       }
//     } else {
//       parseEBML(buffer, offset);
//       console.log(`Unknown Element: ${id.toString(16)}`);
//     }
//   }
// }

// readFile(url, (err, data) => {
//   if (err) {
//     console.error(err);
//   } else {
//     parseEBML(data, 0);
//   }
// });


// async function readVariableLengthValue (buffer, offset) {
//   let length = 1;
//   while ((buffer[offset] & (0x80 >> length)) === 0) {
//     length++;
//   }
//   const bytes = buffer.slice(offset, offset + length);
//   offset += length;
//   const value = bytes.readUIntBE(0, length);
//   return { value, length };
// }

// async function parseEBMLElement (buffer, offset) {
//   const idInfo = await readVariableLengthValue(buffer, offset);
//   offset += idInfo.length;

//   const sizeInfo = await readVariableLengthValue(buffer, offset);
//   offset += sizeInfo.length;

//   const dataSize = sizeInfo.value;
//   const data = buffer.slice(offset, offset + dataSize);

//   // Print the element's ID, data size, and data
//   console.log(`Element ID: 0x${idInfo.value.toString(16)}`);
//   console.log(`Data Size: ${dataSize}`);
//   // console.log(`Data: 0x${data.toString('hex')}`);

//   offset += dataSize;

//   // If this is a container element (e.g., "Segment"), recursively parse its nested elements
//   // if (idInfo.value === YOUR_CONTAINER_ELEMENT_ID) {
//   while (offset < offset + dataSize) {
//     offset = await parseEBMLElement(buffer, offset);
//   }
//   // }

//   return offset;
// }


// async function parseEBMLFile (filename) {
//   const data = await readFile(filename);
//   let offset = 0;

//   while (offset < data.length) {
//     offset = await parseEBMLElement(data, offset);
//   }
// }

// // Replace 'your_ebml_file.mkv' with the path to your EBML file.
// parseEBMLFile(url).catch(console.error);
