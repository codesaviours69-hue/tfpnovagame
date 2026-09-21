import { createServer } from 'vite';

async function start() {
  const server = await createServer({
    configFile: './vite.config.ts',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  });
  await server.listen();
  console.log('--- NOVA DEV SERVER READY AT http://localhost:3000/ ---');
  server.printUrls();
}

start().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
