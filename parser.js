// @ts-check
import { readFile } from 'fs/promises';
import { decode, resetDecoder, displayDecodedElements } from './lib/ebml.js';
import { writeFileSync } from 'node:fs';


const data = await readFile("new1.webm");
const dataBad = await readFile("new2.webm");
const dataBad3 = await readFile("new3.webm");

const parseEBMLFile = async () => {
  resetDecoder({
    debug: true,
  });
  const { decoded, decodedHeader, headerBuffer, lastStartBuffer } = decode(data);
  // displayDecodedElements(decodedHeader);
  // displayDecodedElements(decoded);

  const newFile = Buffer.concat([headerBuffer, lastStartBuffer, dataBad]);
  // console.log(newFile);
  writeFileSync('bad-fixed-1.webm', newFile)


  resetDecoder({
    debug: false,
  });
  const { decoded: decoded2, decodedHeader: decodedHeader2, headerBuffer: headerBuffer2, lastStartBuffer: lastStartBuffer2 } = decode(newFile);
  displayDecodedElements(decoded2);

  const newFile2 = Buffer.concat([headerBuffer2, lastStartBuffer2, dataBad3]);
  // console.log(newFile2);
  writeFileSync('bad-fixed-2.webm', newFile2)
}

parseEBMLFile();
