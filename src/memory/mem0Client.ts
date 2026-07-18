/**
 * mem0 Platform REST client (OpenAI-compatible agent memory).
 *
 * Docs: https://docs.mem0.ai
 *
 * Env:
 *   EXPO_PUBLIC_MEM0_API_KEY=...
 *   EXPO_PUBLIC_MEM0_BASE_URL=https://api.mem0.ai  (optional)
 *   EXPO_PUBLIC_MEM0_ENABLED=true|false           (optional, default: key present)
 */

function env(key: string, fallback = ''): string {
  // static access for Metro inlining where possible
  if (key === 'EXPO_PUBLIC_MEM0_API_KEY') {
    return process.env.EXPO_PUBLIC_MEM0_API_KEY ?? fallback;
  }
  if (key === 'EXPO_PUBLIC_MEM0_BASE_URL') {
    return process.env.EXPO_PUBLIC_MEM0_BASE_URL ?? fallback;
  }
  if (key === 'EXPO_PUBLIC_MEM0_ENABLED') {
    return process.env.EXPO_PUBLIC_MEM0_ENABLED ?? fallback;
  }
  return fallback;
}

export function getMem0Config() {
  const apiKey = env('EXPO_PUBLIC_MEM0_API_KEY', '').trim();
  const baseUrl = env(
    'EXPO_PUBLIC_MEM0_BASE_URL',
    'https://api.mem0.ai'
  ).replace(/\/$/, '');
  const enabledFlag = env('EXPO_PUBLIC_MEM0_ENABLED', '').toLowerCase();
  const enabled =
    enabledFlag === 'true' ||
    (enabledFlag !== 'false' && Boolean(apiKey));
  return { apiKey, baseUrl, enabled: enabled && Boolean(apiKey) };
}

export function canUseMem0(): boolean {
  return getMem0Config().enabled;
}

export type Mem0AddResult = {
  id?: string;
  ok: boolean;
  error?: string;
};

export type Mem0SearchResult = {
  id: string;
  memory: string;
  score?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Add a memory for a user_id (we use kairo:shared or kairo:agent:<id>).
 */
export async function mem0AddMemory(args: {
  userId: string;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<Mem0AddResult> {
  const { apiKey, baseUrl, enabled } = getMem0Config();
  if (!enabled) {
    return { ok: false, error: 'mem0 disabled' };
  }

  try {
    const res = await fetch(`${baseUrl}/v1/memories/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: args.content }],
        user_id: args.userId,
        metadata: args.metadata ?? {},
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        ok: false,
        error: `mem0 add ${res.status}: ${body.slice(0, 160)}`,
      };
    }

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      results?: Array<{ id?: string }>;
    };
    const id = data.id ?? data.results?.[0]?.id;
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'mem0 add failed',
    };
  }
}

export async function mem0SearchMemories(args: {
  userId: string;
  query: string;
  limit?: number;
}): Promise<{ hits: Mem0SearchResult[]; error?: string }> {
  const { apiKey, baseUrl, enabled } = getMem0Config();
  if (!enabled) {
    return { hits: [], error: 'mem0 disabled' };
  }

  try {
    const res = await fetch(`${baseUrl}/v1/memories/search/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: args.query,
        user_id: args.userId,
        limit: args.limit ?? 8,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        hits: [],
        error: `mem0 search ${res.status}: ${body.slice(0, 160)}`,
      };
    }

    const data = (await res.json()) as
      | Mem0SearchResult[]
      | { results?: Mem0SearchResult[] };

    const list = Array.isArray(data) ? data : (data.results ?? []);
    return {
      hits: list.map((h, i) => ({
        id: h.id ?? `mem0-${i}`,
        memory: h.memory ?? String((h as { text?: string }).text ?? ''),
        score: h.score,
        metadata: h.metadata,
      })),
    };
  } catch (e) {
    return {
      hits: [],
      error: e instanceof Error ? e.message : 'mem0 search failed',
    };
  }
}

export function mem0UserId(scope: 'shared' | string): string {
  if (scope === 'shared') return 'kairo:shared';
  return `kairo:agent:${scope}`;
}
