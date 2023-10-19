// @ts-check
import fastify from 'fastify';

const server = fastify({
  logger: true,
});

// Health check route
server.get('/healthz', function (request, reply) {
  reply.send('OK');
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
