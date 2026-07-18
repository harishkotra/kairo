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
 *   EXPO_PUBLIC_AGENTOS_URL=http://localhost:6420
 */

import type { AgentId, AgentVmState } from '../agents/types';

export type VmBootResult = AgentVmState & {
  ok: boolean;
};

function endpoint(): string {
  return (
    process.env.EXPO_PUBLIC_AGENTOS_URL ?? 'http://localhost:6420'
  ).replace(/\/$/, '');
}

export function agentosEndpoint(): string {
  return endpoint();
}

/** Probe whether the local agentOS registry is up. */
export async function pingAgentOs(): Promise<boolean> {
  try {
    const res = await fetch(`${endpoint()}/health`, {
      method: 'GET',
    });
    return res.ok;
  } catch {
    try {
      // Some setups only expose the actor HTTP root
      const res = await fetch(endpoint(), { method: 'GET' });
      return res.ok || res.status === 404;
    } catch {
      return false;
    }
  }
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

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
