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
 *   # listens on http://localhost:7420
 */

import cors from 'cors';
import express from 'express';
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '.vms');
const PORT = Number(process.env.AGENTOS_PORT ?? 7420);

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

/** Cross-session preview state: set by Kairo pipeline, read by Expo Go preview route */
let kairoPreviewState: Record<string, unknown> | null = null;

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

/**
 * Kairo preview state — written by the pipeline in the browser/Expo context,
 * read by the `/preview` route when opened fresh (e.g. via Expo Go QR scan).
 * This lets a phone scanning the QR code see the actual built app content.
 */
app.post('/api/kairo/state', (req, res) => {
  const { appPlan, projectName } = req.body as {
    appPlan?: Record<string, unknown>;
    projectName?: string;
  };
  if (!appPlan) {
    res.status(400).json({ error: 'appPlan required' });
    return;
  }
  kairoPreviewState = { appPlan, projectName, updatedAt: Date.now() };
  res.json({ ok: true });
});

app.get('/api/kairo/state', (_req, res) => {
  if (!kairoPreviewState) {
    res.status(404).json({ error: 'no preview state' });
    return;
  }
  res.json(kairoPreviewState);
});

/**
 * Detect the machine's LAN IP address using network interfaces.
 * Prefers the first non-internal IPv4 address (e.g. 192.168.x.x).
 */
app.get('/api/lan-ip', (_req, res) => {
  try {
    const nets = networkInterfaces();
    // Skip virtual/VPN interfaces that phones on the LAN cannot reach
    const badIface = /^(utun|tun|tap|awdl|llw|bridge|vmnet|docker|veth|zt|tailscale)/i;
    const scored: Array<{ ip: string; score: number }> = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        if (net.family !== 'IPv4' || net.internal) continue;
        const ip = net.address;
        if (ip.startsWith('169.254.')) continue; // link-local, unreachable
        let score = 1;
        if (/^192\.168\./.test(ip) || /^10\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) {
          score = 3;
        }
        if (badIface.test(name)) score = 0;
        scored.push({ ip, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    const candidates = scored.map((c) => c.ip);
    const ip = candidates[0] ?? null;
    res.json({ ip, candidates, count: candidates.length });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/**
 * Export a generated Kairo app plan as a standalone Expo project.
 * Writes the project to agentos/.exports/<project-name>/.
 */
app.post('/api/export', (req, res) => {
  const { appPlan, projectName } = req.body as {
    appPlan?: Record<string, unknown>;
    projectName?: string;
  };

  if (!appPlan || !projectName) {
    res.status(400).json({ error: 'appPlan and projectName required' });
    return;
  }

  const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase().slice(0, 40) || 'kairo-export';
  const exportDir = join(ROOT, '..', '.exports', sanitizedName);
  ensureDir(exportDir);
  ensureDir(join(exportDir, 'app', '(tabs)'));
  ensureDir(join(exportDir, 'src', 'generated'));
  ensureDir(join(exportDir, 'src', 'theme'));
  ensureDir(join(exportDir, 'src', 'agents'));

  const planJson = JSON.stringify(appPlan, null, 2);
  const tokensJson = JSON.stringify({
    primary: '#3DDC97',
    accent: '#B8A1FF',
    background: '#0A101C',
    surface: '#141B26',
    text: '#E8EDF5',
    textSecondary: '#8896A8',
    textTertiary: '#5B6B7E',
    border: '#1E293B',
    success: '#3DDC97',
    danger: '#FF6B6B',
    warning: '#FFB86B',
    radius: { sm: 8, md: 12, lg: 16, xl: 20 },
  }, null, 2);

  // package.json
  writeFileSync(join(exportDir, 'package.json'), JSON.stringify({
    name: sanitizedName,
    version: '1.0.0',
    main: 'node_modules/expo/AppEntry.js',
    scripts: {
      start: 'expo start',
      android: 'expo start --android',
      ios: 'expo start --ios',
      web: 'expo start --web',
    },
    dependencies: {
      expo: '~57.0.7',
      'expo-router': '~4.0.0',
      'expo-status-bar': '~2.2.0',
      react: '18.3.1',
      'react-native': '0.76.5',
      'react-native-screens': '~4.5.0',
      'react-native-safe-area-context': '~5.1.0',
      '@expo/vector-icons': '^14.0.0',
    },
    devDependencies: {
      '@types/react': '~18.3.0',
      typescript: '~5.3.3',
    },
    private: true,
  }, null, 2), 'utf8');

  // app.json
  writeFileSync(join(exportDir, 'app.json'), JSON.stringify({
    expo: {
      name: projectName,
      slug: sanitizedName,
      version: '1.0.0',
      scheme: sanitizedName,
      platforms: ['ios', 'android', 'web'],
      plugins: ['expo-router'],
    },
  }, null, 2), 'utf8');

  // tsconfig.json
  writeFileSync(join(exportDir, 'tsconfig.json'), JSON.stringify({
    extends: 'expo/tsconfig.base',
    compilerOptions: { strict: true, jsx: 'react-jsx' },
  }, null, 2), 'utf8');

  // babel.config.js
  writeFileSync(join(exportDir, 'babel.config.js'), `module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
`, 'utf8');

  // app/_layout.tsx
  writeFileSync(join(exportDir, 'app', '_layout.tsx'), `import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
`, 'utf8');

  // app/(tabs)/_layout.tsx
  const screens = (appPlan.screens as Array<{ id: string; title: string; icon?: string }>) ?? [];
  const tabImports = screens.map((s) =>
    `import ${pascalCase(s.id)} from './${s.id}';`
  ).join('\n');
  const tabScreens = screens.map((s, i) =>
    `      <Tabs.Screen name="${s.id}" options={{ title: ${JSON.stringify(s.title)}, tabBarIcon: ({ color }) => <Ionicons name={${JSON.stringify(s.icon || 'ellipse-outline')}} size={20} color={color} /> }} />`
  ).join('\n');

  writeFileSync(join(exportDir, 'app', '(tabs)', '_layout.tsx'), `import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

${tabImports}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
${tabScreens}
    </Tabs>
  );
}
`, 'utf8');

  // One screen file per generated screen
  for (const screen of screens) {
    const safeId = screen.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    writeFileSync(join(exportDir, 'app', '(tabs)', `${safeId}.tsx`), `import React from 'react';
import { DynamicScreen } from '../../src/generated/DynamicScreen';
import { plan } from '../../src/generated/plan';

export default function ${pascalCase(safeId)}Screen() {
  const spec = plan.screens.find((s) => s.id === ${JSON.stringify(screen.id)});
  if (!spec) return null;
  return <DynamicScreen spec={spec} projectName={plan.projectName} />;
}
`, 'utf8');
  }

  // src/generated/plan.ts - the serialized app plan
  writeFileSync(join(exportDir, 'src', 'generated', 'plan.ts'), `import type { AppPlan } from '../agents/types';
export const plan: AppPlan = ${planJson};
`, 'utf8');

  // src/generated/DynamicScreen.tsx - copy from source
  const dynamicScreenSource = join(__dirname, '..', 'src', 'generated', 'DynamicScreen.tsx');
  let dynamicScreenContent = '';
  try {
    dynamicScreenContent = readFileSync(dynamicScreenSource, 'utf8');
  } catch {
    dynamicScreenContent = `import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { ScreenSpec } from '../agents/types';

export function DynamicScreen({ spec, projectName }: { spec: ScreenSpec; projectName?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0A101C' }}>
      <ScrollView>
        <Text style={{ color: '#E8EDF5', fontSize: 24, padding: 20 }}>{spec.title}</Text>
        {spec.sections.map((s, i) => (
          <Text key={i} style={{ color: '#8896A8', padding: 10 }}>{s.type}: {s.title || ''}</Text>
        ))}
      </ScrollView>
    </View>
  );
}`;
  }
  // Fix import path for the exported project
  dynamicScreenContent = dynamicScreenContent.replace(
    /from ['"]\.\.\/(\.\.\/)*agents\/types['"]/g,
    `from '../agents/types'`
  ).replace(
    /from ['"]\.\.\/(\.\.\/)*theme\//g,
    `from '../theme/`
  );
  writeFileSync(join(exportDir, 'src', 'generated', 'DynamicScreen.tsx'), dynamicScreenContent, 'utf8');

  // src/agents/types.ts (minimal - just the types needed)
  const typesSource = join(__dirname, '..', 'src', 'agents', 'types.ts');
  let typesContent = '';
  try {
    typesContent = readFileSync(typesSource, 'utf8');
  } catch {
    typesContent = `export interface AppPlan { projectName: string; screens: ScreenSpec[]; [key: string]: any; }
export interface ScreenSpec { id: string; title: string; icon?: string; layout?: string; sections: ScreenSection[]; [key: string]: any; }
export interface ScreenSection { type: string; title?: string; description?: string; kicker?: string; cta?: string; color?: string; items?: ScreenSectionItem[]; }
export interface ScreenSectionItem { title: string; subtitle?: string; icon?: string; value?: string; badge?: string; color?: string; }`;
  }
  writeFileSync(join(exportDir, 'src', 'agents', 'types.ts'), typesContent, 'utf8');

  // src/theme/ (minimal: tokens + ThemeProvider)
  const themeTokensSource = join(__dirname, '..', 'src', 'theme', 'tokens.ts');
  try {
    const t = readFileSync(themeTokensSource, 'utf8');
    writeFileSync(join(exportDir, 'src', 'theme', 'tokens.ts'), t, 'utf8');
  } catch {
    writeFileSync(join(exportDir, 'src', 'theme', 'tokens.ts'), `export const spacing = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];
export const typography = { size: { sm: 13, md: 15, lg: 20, xl: 28 }, weight: { medium: '500', semibold: '600', bold: '700' } };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20 };
export const workspace = { bg: '#0A101C', text: '#E8EDF5', border: '#1E293B', accent: '#3DDC97' };
`, 'utf8');
  }

  const themeProviderSource = join(__dirname, '..', 'src', 'theme', 'ThemeProvider.tsx');
  try {
    const t = readFileSync(themeProviderSource, 'utf8');
    writeFileSync(join(exportDir, 'src', 'theme', 'ThemeProvider.tsx'), t, 'utf8');
  } catch {
    writeFileSync(join(exportDir, 'src', 'theme', 'ThemeProvider.tsx'), `import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
const ThemeContext = createContext({ isDark: true, toggle: () => {}, colors: { background: '#0A101C', text: '#E8EDF5', surface: '#141B26', border: '#1E293B', primary: '#3DDC97', textSecondary: '#8896A8', textTertiary: '#5B6B7E', tabBar: '#0D131E', tabInactive: '#5B6B7E' } });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const toggle = () => setIsDark((p) => !p);
  const colors = { background: '#0A101C', text: '#E8EDF5', surface: '#141B26', border: '#1E293B', primary: '#3DDC97', textSecondary: '#8896A8', textTertiary: '#5B6B7E', tabBar: '#0D131E', tabInactive: '#5B6B7E', borderStrong: '#334155' };
  return <ThemeContext.Provider value={{ isDark, toggle, colors }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
`, 'utf8');
  }

  const fileCount = existsSync(exportDir)
    ? readdirSync(exportDir).length
    : 0;

  res.json({
    ok: true,
    path: exportDir,
    projectName: sanitizedName,
    screens: screens.length,
    files: fileCount,
    message: `Exported to ${exportDir}\n\ncd ${exportDir}\nnpm install\nnpx expo start`,
  });
});

function pascalCase(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, ' ').split(' ').filter(Boolean).map((w) => w[0]?.toUpperCase() + w.slice(1)).join('');
}

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
function listen(port: number, attempt = 0) {
  const srv = app.listen(port, '0.0.0.0', () => {
    console.log(`Kairo agentOS bridge on http://0.0.0.0:${port}`);
    console.log(`VM root: ${ROOT}`);
    if (port !== 7420) {
      console.log(`NOTE: default port was busy — clients auto-probe ${port}, or set EXPO_PUBLIC_AGENTOS_URL=http://localhost:${port}`);
    }
    console.log('Preview state API: POST/GET /api/kairo/state');
  });
  srv.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE' && attempt < 2) {
      console.warn(`Port ${port} is in use (another service?) — trying ${port + 1}`);
      listen(port + 1, attempt + 1);
    } else {
      throw e;
    }
  });
}
listen(PORT);
