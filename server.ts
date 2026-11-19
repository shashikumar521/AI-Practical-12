import express from 'express';
import { spawn, type ChildProcess } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const FLASK_HOST = process.env.FLASK_HOST || '127.0.0.1';
const FLASK_PORT = Number(process.env.FLASK_PORT || 5000);
const FLASK_BASE_URL = `http://${FLASK_HOST}:${FLASK_PORT}`;

let flaskProcess: ChildProcess | null = null;

async function isFlaskRunning(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 800);
    const res = await fetch(`${FLASK_BASE_URL}/`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureFlaskBackend(): Promise<void> {
  if (await isFlaskRunning()) {
    console.log(`[PreferenceAI] Flask backend already running at ${FLASK_BASE_URL}`);
    return;
  }

  const venvPython = path.join(__dirname, 'backend', '.venv', 'bin', 'python');
  const venvFlask = path.join(__dirname, 'backend', '.venv', 'bin', 'flask');
  const pythonBin = fs.existsSync(venvPython) && fs.existsSync(venvFlask) ? venvPython : 'python3';
  const appPy = path.join(__dirname, 'backend', 'app.py');

  console.log(`[PreferenceAI] Starting Flask backend (${pythonBin} ${appPy})...`);
  flaskProcess = spawn(pythonBin, [appPy], {
    cwd: path.join(__dirname, 'backend'),
    env: {
      ...process.env,
      FLASK_HOST,
      FLASK_PORT: String(FLASK_PORT),
      PYTHONUNBUFFERED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  flaskProcess.stdout?.on('data', (chunk) => {
    process.stdout.write(`[Flask] ${chunk.toString()}`);
  });
  flaskProcess.stderr?.on('data', (chunk) => {
    process.stderr.write(`[Flask] ${chunk.toString()}`);
  });
  flaskProcess.on('exit', (code) => {
    console.log(`[PreferenceAI] Flask process exited with code ${code}`);
    flaskProcess = null;
  });

  // Wait up to 8 seconds for Flask to bind
  for (let i = 0; i < 20; i += 1) {
    if (await isFlaskRunning()) {
      console.log(`[PreferenceAI] Flask backend ready at ${FLASK_BASE_URL}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.warn('[PreferenceAI] Flask backend did not respond in time; continuing with proxy.');
}

async function startServer() {
  await ensureFlaskBackend();

  const app = express();
  app.use(express.json({ limit: '128kb' }));

  // Proxy /api/* to Flask backend on 127.0.0.1:5000
  app.use('/api', async (req, res) => {
    const targetPath = req.originalUrl.replace(/^\/api/, '') || '/';
    const targetUrl = `${FLASK_BASE_URL}${targetPath}`;

    try {
      const hasBody = !['GET', 'HEAD'].includes(req.method.toUpperCase());
      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      });

      const text = await upstream.text();
      res.status(upstream.status);
      const contentType = upstream.headers.get('content-type') || 'application/json';
      res.setHeader('Content-Type', contentType);
      res.send(text);
    } catch {
      res.status(503).json({
        error: 'Unable to reach Python Flask backend on port 5000.',
        code: 'BACKEND_UNAVAILABLE',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PreferenceAI] Frontend server listening on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    if (flaskProcess) {
      flaskProcess.kill('SIGTERM');
    }
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('[PreferenceAI] Fatal startup error:', err);
  process.exit(1);
});
