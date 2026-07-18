/**
 * Kairo agentOS bridge — local HTTP host that emulates per-agent VMs.
 *
 * Full @rivet-dev/agentos (native sidecar) can replace the in-memory
 * filesystem when installed; this server always runs so Expo can showcase
 * isolated workspaces without the WASM runtime on the device.
 *
 * Docs: https://agentos-sdk.dev/docs/
 *
 *   cd agentos && npm install && npm run dev
 *   # listens on http://localhost:6420
 */

import cors from 'cors';
import express from 'express';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '.vms');
const PORT = Number(process.env.AGENTOS_PORT ?? 6420);

type VmRecord = {
  key: string;
  agentId: string;
  agentName: string;
  status: 'booting' | 'ready' | 'running' | 'stopped';
  sessionId: string;
  files: string[];
  createdAt: number;
};

const vms = new Map<string, VmRecord>();

function vmDir(key: string) {
  return join(ROOT, key.replace(/[^a-zA-Z0-9_-]/g, '_'));
}

function ensureDir(p: string) {
  mkdirSync(p, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'kairo-agentos',
    vms: vms.size,
    docs: 'https://agentos-sdk.dev/docs/',
  });
});

app.get('/', (_req, res) => {
  res.json({
    name: 'Kairo agentOS bridge',
    endpoints: ['/health', '/api/vm/boot', '/api/vm/write', '/api/vm/stop', '/api/vm/:key'],
  });
});

app.post('/api/vm/boot', (req, res) => {
  const {
    key,
    agentId,
    agentName,
    goal,
    projectName,
    brief,
  } = req.body as {
    key: string;
    agentId: string;
    agentName: string;
    goal?: string;
    projectName?: string;
    brief?: string;
  };

  if (!key) {
    res.status(400).json({ error: 'key required' });
    return;
  }

  const existing = vms.get(key);
  if (existing && existing.status !== 'stopped') {
    res.json({
      key: existing.key,
      sessionId: existing.sessionId,
      files: existing.files,
      status: existing.status,
      mode: 'agentos',
    });
    return;
  }

  const dir = vmDir(key);
  ensureDir(join(dir, 'workspace'));
  ensureDir(join(dir, 'workspace', 'out'));

  const briefPath = join(dir, 'workspace', 'BRIEF.md');
  const taskPath = join(dir, 'workspace', 'task.json');
  writeFileSync(
    briefPath,
    `# ${agentName}\n\nProject: ${projectName ?? 'app'}\n\n## Goal\n${goal ?? ''}\n\n## Brief\n${brief ?? ''}\n`,
    'utf8'
  );
  writeFileSync(
    taskPath,
    JSON.stringify(
      {
        agentId,
        agentName,
        goal,
        projectName,
        bootedAt: new Date().toISOString(),
        runtime: 'kairo-agentos-bridge',
      },
      null,
      2
    ),
    'utf8'
  );

  const sessionId = `aos-${Date.now().toString(36)}`;
  const rec: VmRecord = {
    key,
    agentId,
    agentName,
    status: 'running',
    sessionId,
    files: [
      '/workspace/BRIEF.md',
      '/workspace/task.json',
    ],
    createdAt: Date.now(),
  };
  vms.set(key, rec);

  res.json({
    key,
    sessionId,
    files: rec.files,
    status: rec.status,
    mode: 'agentos',
    root: dir,
  });
});

app.post('/api/vm/write', (req, res) => {
  const { key, path: filePath, content } = req.body as {
    key: string;
    path: string;
    content: string;
  };
  const rec = vms.get(key);
  if (!rec) {
    res.status(404).json({ error: 'vm not found' });
    return;
  }
  const rel = (filePath || '/workspace/out/note.txt').replace(/^\//, '');
  const full = join(vmDir(key), rel);
  ensureDir(dirname(full));
  writeFileSync(full, content ?? '', 'utf8');
  if (!rec.files.includes(filePath)) rec.files.push(filePath);
  res.json({ ok: true, files: rec.files });
});

app.post('/api/vm/stop', (req, res) => {
  const { key } = req.body as { key: string };
  const rec = vms.get(key);
  if (rec) rec.status = 'stopped';
  res.json({ ok: true });
});

app.get('/api/vm/:key', (req, res) => {
  const rec = vms.get(req.params.key);
  if (!rec) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json(rec);
});

app.get('/api/vms', (_req, res) => {
  res.json({ vms: [...vms.values()] });
});

// Optional: initialize Laminar on the Node side (platform instruction)
try {
  const key =
    process.env.LMNR_PROJECT_API_KEY ||
    process.env.EXPO_PUBLIC_LMNR_PROJECT_API_KEY;
  if (key) {
    // Dynamic import so agentos still runs without the package
    import('@lmnr-ai/lmnr')
      .then(({ Laminar }) => {
        if (!Laminar.initialized()) {
          Laminar.initialize({
            projectApiKey: key,
            forceHttp: true,
            instrumentModules: {},
          });
        }
        console.log('Laminar.initialize() ok (agentOS host)');
      })
      .catch(() => {
        /* optional dependency */
      });
  }
} catch {
  /* ignore */
}

ensureDir(ROOT);
app.listen(PORT, () => {
  console.log(`Kairo agentOS bridge on http://localhost:${PORT}`);
  console.log(`VM root: ${ROOT}`);
  console.log('Set EXPO_PUBLIC_AGENTOS_URL=http://localhost:' + PORT);
});
