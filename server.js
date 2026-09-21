import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const distPath = path.join(__dirname, 'dist');

// Serve static assets with CORS and cache headers
app.use(express.static(distPath));

// SPA fallback for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n===========================================`);
  console.log(`🎮 NovaPlay Games Server Running!`);
  console.log(`👉 Local:   http://localhost:${PORT}`);
  console.log(`👉 Loopback: http://127.0.0.1:${PORT}`);
  console.log(`===========================================\n`);
});
