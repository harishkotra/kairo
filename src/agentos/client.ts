/**
 * agentOS client for Kairo.
 *
 * Talks to a local agentOS server (see /agentos) when available.
 * Falls back to a high-fidelity simulation so the product works without
 * native sidecars — each agent still gets an isolated "VM" identity,
 * filesystem log, and lifecycle for the canvas showcase.
 *
 * Real server (from https://agentos-sdk.dev/docs/quickstart):
 *   cd agentos && npm install && npm run dev
 *   EXPO_PUBLIC_AGENTOS_URL=http://localhost:7420
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { AgentId, AgentVmState } from '../agents/types';

export type VmBootResult = AgentVmState & {
  ok: boolean;
};

/**
 * On a physical device (Expo Go via QR), "localhost" is the phone itself.
 * Derive the dev machine's host from Metro's debug host so the agentOS
 * server (port 7420) on the dev machine is reachable.
 */
function devMachineHost(): string | null {
  const c = Constants as Record<string, any>;
  const raw: string | undefined =
    c?.expoConfig?.hostUri ??
    c?.expoGoConfig?.debuggerHost ??
    c?.manifest2?.extra?.expoGo?.debuggerHost ??
    c?.manifest?.debuggerHost;
  const host = raw?.split(':')[0];
  return host && host !== 'localhost' && host !== '127.0.0.1' ? host : null;
}

/** Ports the bridge may listen on (server auto-increments when 7420 is busy).
 * 6420 kept last for older setups; note rivet-engine also squats 642x. */
const AGENTOS_PORTS = [7420, 7421, 7422, 6420];

let resolvedEndpoint: string | null = null;

function agentosHost(): string {
  if (Platform.OS !== 'web') {
    return devMachineHost() ?? 'localhost';
  }
  return 'localhost';
}

function endpoint(): string {
  if (resolvedEndpoint) return resolvedEndpoint;
  const env = process.env.EXPO_PUBLIC_AGENTOS_URL;
  if (env) return env.replace(/\/$/, '');
  return `http://${agentosHost()}:${AGENTOS_PORTS[0]}`;
}

export function agentosEndpoint(): string {
  return endpoint();
}

/** True only when the responder is actually the Kairo bridge (another
 * service may squat the default port — e.g. a rivet engine). */
async function isKairoBridge(base: string): Promise<boolean> {
  try {
    const res = await fetch(`${base}/health`);
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as { service?: string } | null;
    return data?.service === 'kairo-agentos';
  } catch {
    return false;
  }
}

/**
 * Find the Kairo agentOS bridge: env override first, then default ports.
 * Caches the first verified endpoint for subsequent calls.
 */
export async function resolveAgentOsEndpoint(): Promise<string | null> {
  if (resolvedEndpoint) return resolvedEndpoint;
  const env = process.env.EXPO_PUBLIC_AGENTOS_URL?.replace(/\/$/, '');
  const host = agentosHost();
  const bases = [
    ...(env ? [env] : []),
    ...AGENTOS_PORTS.map((p) => `http://${host}:${p}`),
  ];
  for (const base of bases) {
    if (await isKairoBridge(base)) {
      resolvedEndpoint = base;
      return base;
    }
  }
  return null;
}

/** Probe whether the local agentOS registry is up. */
export async function pingAgentOs(): Promise<boolean> {
  return (await resolveAgentOsEndpoint()) !== null;
}

/**
 * Boot (or reuse) a VM for one Kairo agent.
 * Tries agentOS HTTP API; otherwise simulates lifecycle.
 */
export async function bootAgentVm(args: {
  agentId: AgentId;
  agentName: string;
  goal: string;
  projectName: string;
  brief: string;
}): Promise<VmBootResult> {
  const key = `kairo-${args.agentId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const live = await pingAgentOs();

  if (live) {
    try {
      // REST-shaped bridge used by agentos/server (see package)
      const res = await fetch(`${endpoint()}/api/vm/boot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          agentId: args.agentId,
          agentName: args.agentName,
          goal: args.goal,
          projectName: args.projectName,
          brief: args.brief,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          key?: string;
          sessionId?: string;
          files?: string[];
        };
        return {
          ok: true,
          key: data.key ?? key,
          status: 'running',
          mode: 'agentos',
          sessionId: data.sessionId,
          filesWritten: data.files ?? [
            '/workspace/BRIEF.md',
            '/workspace/task.json',
          ],
          lastLog: 'VM ready · agentOS',
          endpoint: endpoint(),
        };
      }
    } catch {
      // fall through to simulation
    }
  }

  // Simulated isolated workspace (always works in Expo)
  await delay(180 + Math.random() * 220);
  const files = [
    `/workspace/agents/${args.agentId}/BRIEF.md`,
    `/workspace/agents/${args.agentId}/task.json`,
    `/workspace/agents/${args.agentId}/out/notes.md`,
  ];
  return {
    ok: true,
    key,
    status: 'running',
    mode: 'simulated',
    sessionId: `sim-${Date.now().toString(36)}`,
    filesWritten: files,
    lastLog: 'VM simulated · start agentos server for real isolation',
    endpoint: endpoint(),
  };
}

export async function writeAgentWorkspace(args: {
  key: string;
  path: string;
  content: string;
  mode: 'agentos' | 'simulated';
}): Promise<boolean> {
  if (args.mode === 'agentos') {
    try {
      const res = await fetch(`${endpoint()}/api/vm/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: args.key,
          path: args.path,
          content: args.content,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
  await delay(40);
  return true;
}

export async function stopAgentVm(args: {
  key: string;
  mode: 'agentos' | 'simulated';
}): Promise<void> {
  if (args.mode === 'agentos') {
    try {
      await fetch(`${endpoint()}/api/vm/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: args.key }),
      });
    } catch {
      /* ignore */
    }
  }
}

/**
 * Share the pipeline's app plan with the agentOS server so the /preview
 * route can render the built app when opened fresh (e.g. via Expo Go QR scan).
 */
export async function sharePreviewState(
  appPlan: unknown,
  projectName: string
): Promise<boolean> {
  try {
    const base = (await resolveAgentOsEndpoint()) ?? endpoint();
    const res = await fetch(`${base}/api/kairo/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appPlan, projectName }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get the LAN IP address from the agentOS server.
 * Returns null if the server is unreachable or no LAN IP found.
 */
export async function getLanIp(): Promise<string | null> {
  try {
    const base = await resolveAgentOsEndpoint();
    if (!base) return null;
    const res = await fetch(`${base}/api/lan-ip`);
    if (!res.ok) return null;
    const data = (await res.json()) as { ip: string | null; candidates: string[] };
    return data.ip;
  } catch {
    return null;
  }
}

export type PreviewState = {
  appPlan: unknown;
  projectName?: string;
  updatedAt: number;
};

/**
 * Fetch the pipeline's shared app plan (used by /preview when opened
 * fresh on a phone via the Expo Go QR).
 */
export async function fetchPreviewState(): Promise<PreviewState | null> {
  const base = await resolveAgentOsEndpoint();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/kairo/state`);
    if (!res.ok) return null;
    return (await res.json()) as PreviewState;
  } catch {
    return null;
  }
}

export type ExportResult = {
  ok: boolean;
  path?: string;
  projectName?: string;
  screens?: number;
  message?: string;
  error?: string;
};

/**
 * Send the current app plan to the agentOS server to generate
 * a standalone Expo project on disk.
 */
export async function exportProjectToServer(
  appPlan: unknown,
  projectName: string
): Promise<ExportResult> {
  try {
    const res = await fetch(`${endpoint()}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appPlan, projectName }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => 'unknown error');
      return { ok: false, error: err };
    }
    return (await res.json()) as ExportResult;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
