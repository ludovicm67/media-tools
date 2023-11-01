import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { monotonicFactory } from 'ulid';
import { readFile } from 'node:fs/promises';

const ulid = monotonicFactory();

const server = fastify({
  logger: true,
});

await server.register(fastifyCors, {});
await server.register(fastifyMultipart, {
  limits: {
    files: 1,
  },
});

// Health check route
server.get('/healthz', async (request, reply) => {
  reply.send('OK');
});

server.post('/transcribe/:userId', async (request, reply) => {
  const userId = request.params.userId;
  const data = await request.file();
  const filename = `records/${userId}-${ulid()}.webm`;
  await pipeline(data.file, createWriteStream(filename));

  const fileContent = await readFile(filename);
  const blob = new Blob([fileContent], { type: 'audio/webm' });

  const body = new FormData();
  body.append('audio_file', blob, 'audio.webm');

  const transcriptionRequest = await fetch('http://localhost:9000/asr?task=transcribe&encode=true&output=txt', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
    },
    body,
  });
  const transcriptionResponse = await transcriptionRequest.text();
  console.log('transcriptionResponse:', transcriptionResponse);

  return reply.send(transcriptionResponse);
});

server.post('/audio/:userId', async (request, reply) => {
  const userId = request.params.userId;
  const data = await request.file();
  const filename = `records/${userId}-${ulid()}.webm`;
  await pipeline(data.file, createWriteStream(filename));
  return reply.send('OK');
});

// Run the server!
server.listen({ port: 3000 }, function (err, address) {
  if (err) {
    // @ts-ignore
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
});
