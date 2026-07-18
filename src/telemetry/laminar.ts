/**
 * Laminar for Kairo — official SDK first (platform instruction):
 *
 *   import { Laminar } from '@lmnr-ai/lmnr';
 *   Laminar.initialize();
 *
 * Project API key: EXPO_PUBLIC_LMNR_PROJECT_API_KEY or LMNR_PROJECT_API_KEY
 * Docs: https://laminar.sh/docs/llms.txt
 *
 * Kairo remains the in-app visualization; Laminar is telemetry only.
 */

import type { Span } from '@opentelemetry/api';

export type SpanKind =
  | 'pipeline'
  | 'agent'
  | 'inference'
  | 'artifact'
  | 'memory'
  | 'export'
  | 'preview'
  | 'tool';

export type TelemetryAttributes = Record<
  string,
  string | number | boolean | string[] | null | undefined
>;

type LaminarModule = typeof import('@lmnr-ai/lmnr');

let LaminarRef: LaminarModule['Laminar'] | null = null;
let sdkLoadError: string | null = null;
let initAttempted = false;
let sessionId = `kairo-${Date.now().toString(36)}`;

const openSpans = new Map<string, Span>();
const agentSpanIds = new Map<string, string>();
let rootSpanId: string | null = null;
let spanSeq = 0;

function nextLocalId() {
  spanSeq += 1;
  return `sp-${spanSeq}`;
}

function projectApiKey(): string {
  return (
    process.env.EXPO_PUBLIC_LMNR_PROJECT_API_KEY ??
    process.env.LMNR_PROJECT_API_KEY ??
    ''
  ).trim();
}

function baseUrl(): string {
  return (
    process.env.EXPO_PUBLIC_LMNR_BASE_URL ??
    process.env.LMNR_BASE_URL ??
    'https://api.lmnr.ai'
  ).replace(/\/$/, '');
}

/**
 * Platform instruction: Laminar.initialize()
 * Loads @lmnr-ai/lmnr and initializes with project API key.
 */
export function initLaminar(): boolean {
  // Once init fails permanently, do not retry (avoid repeated crashes)
  if (initAttempted) {
    if (LaminarRef?.initialized()) return true;
    return false;
  }
  initAttempted = true;

  const key = projectApiKey();
  if (!key) {
    sdkLoadError = 'Missing EXPO_PUBLIC_LMNR_PROJECT_API_KEY / LMNR_PROJECT_API_KEY';
    return false;
  }

  try {
    // Lazy-require only when needed and API key is present.
    // On web, @lmnr-ai/lmnr may reference Node APIs — catch gracefully.
    let mod: LaminarModule;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('@lmnr-ai/lmnr') as LaminarModule;
    } catch {
      sdkLoadError = 'Failed to load @lmnr-ai/lmnr module (web environment?)';
      return false;
    }

    if (!mod?.Laminar) {
      sdkLoadError = '@lmnr-ai/lmnr module loaded but Laminar export missing';
      return false;
    }

    LaminarRef = mod.Laminar;

    if (!LaminarRef.initialized()) {
      // Platform default is Laminar.initialize() reading LMNR_PROJECT_API_KEY.
      // We pass the key explicitly so Expo public env works too.
      LaminarRef.initialize({
        projectApiKey: key,
        baseUrl: baseUrl(),
        // Prefer HTTP over gRPC in Expo / web (docs: forceHttp)
        forceHttp: true,
        // Don't auto-instrument node LLM SDKs inside Expo
        instrumentModules: {},
        metadata: {
          product: 'kairo',
          service: 'kairo',
        },
      });
    }

    sdkLoadError = null;
    return LaminarRef.initialized();
  } catch (e) {
    sdkLoadError = e instanceof Error ? e.message : String(e);
    LaminarRef = null;
    if (__DEV__) {
      console.warn('[laminar] SDK init failed:', sdkLoadError);
    }
    return false;
  }
}

function ensureSdk(): LaminarModule['Laminar'] | null {
  if (LaminarRef?.initialized()) return LaminarRef;
  initLaminar();
  return LaminarRef?.initialized() ? LaminarRef : null;
}

function toAttrs(attrs: TelemetryAttributes): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

class LaminarTelemetry {
  isEnabled(): boolean {
    return Boolean(projectApiKey()) && Boolean(ensureSdk());
  }

  getSessionId(): string {
    return sessionId;
  }

  startPipeline(attrs: TelemetryAttributes = {}): string {
    const L = ensureSdk();
    sessionId = `kairo-${Date.now().toString(36)}`;
    // Close previous root if any
    if (rootSpanId) {
      this.endPipeline(true);
    }

    if (!L) return nextLocalId();

    const span = L.startActiveSpan({
      name: 'kairo.pipeline',
      spanType: 'DEFAULT',
      sessionId,
      tags: ['kairo', 'multi-agent'],
      metadata: {
        product: 'kairo',
        ...Object.fromEntries(
          Object.entries(attrs).filter(([, v]) => v != null)
        ),
      },
      input: attrs,
    });

    const id = nextLocalId();
    openSpans.set(id, span as Span);
    rootSpanId = id;
    return id;
  }

  endPipeline(ok = true, attrs: TelemetryAttributes = {}): void {
    if (!rootSpanId) return;
    const span = openSpans.get(rootSpanId);
    if (span) {
      try {
        if (attrs && Object.keys(attrs).length) {
          span.setAttributes(toAttrs(attrs));
        }
        if (!ok) {
          span.setStatus?.({ code: 2, message: 'pipeline failed' });
        }
        span.end();
      } catch {
        /* ignore */
      }
      openSpans.delete(rootSpanId);
    }
    // end dangling agent spans
    for (const [agentId, sid] of [...agentSpanIds.entries()]) {
      this.endAgent(agentId, true);
    }
    rootSpanId = null;
    void this.flush();
  }

  startAgent(agentId: string, attrs: TelemetryAttributes = {}): string {
    const L = ensureSdk();
    if (!L) return nextLocalId();

    const span = L.startActiveSpan({
      name: `agent.${agentId}`,
      spanType: 'DEFAULT',
      sessionId,
      tags: ['kairo', 'agent', agentId],
      metadata: { agentId, ...Object.fromEntries(Object.entries(attrs).filter(([, v]) => v != null)) },
      input: { agentId, ...attrs },
    });

    const id = nextLocalId();
    openSpans.set(id, span as Span);
    agentSpanIds.set(agentId, id);
    return id;
  }

  endAgent(
    agentId: string,
    ok = true,
    attrs: TelemetryAttributes = {}
  ): void {
    const id = agentSpanIds.get(agentId);
    if (!id) return;
    const span = openSpans.get(id);
    if (span) {
      try {
        if (Object.keys(attrs).length) span.setAttributes(toAttrs(attrs));
        if (!ok) span.setStatus?.({ code: 2 });
        span.end();
      } catch {
        /* ignore */
      }
      openSpans.delete(id);
    }
    agentSpanIds.delete(agentId);
  }

  startChild(
    name: string,
    kind: SpanKind,
    parentAgentId?: string,
    attrs: TelemetryAttributes = {}
  ): string {
    const L = ensureSdk();
    if (!L) return nextLocalId();

    const spanType =
      kind === 'inference' ? 'LLM' : kind === 'tool' || kind === 'artifact' ? 'TOOL' : 'DEFAULT';

    const span = L.startActiveSpan({
      name,
      spanType: spanType as 'DEFAULT' | 'LLM' | 'TOOL',
      sessionId,
      tags: ['kairo', kind],
      metadata: attrs as Record<string, unknown>,
      input: attrs,
    });

    const id = nextLocalId();
    openSpans.set(id, span as Span);
    return id;
  }

  endChild(
    spanId: string,
    ok = true,
    attrs: TelemetryAttributes = {}
  ): void {
    const span = openSpans.get(spanId);
    if (!span) return;
    try {
      if (Object.keys(attrs).length) span.setAttributes(toAttrs(attrs));
      if (!ok) span.setStatus?.({ code: 2 });
      span.end();
    } catch {
      /* ignore */
    }
    openSpans.delete(spanId);
  }

  recordEvent(
    name: string,
    attrs: TelemetryAttributes = {},
    agentId?: string
  ): void {
    const L = ensureSdk();
    if (!L) return;

    // Prefer active agent span; else root; else fire-and-forget event span
    let span: Span | undefined;
    if (agentId && agentSpanIds.has(agentId)) {
      span = openSpans.get(agentSpanIds.get(agentId)!);
    } else if (rootSpanId) {
      span = openSpans.get(rootSpanId);
    }

    if (span && typeof (span as { addEvent?: Function }).addEvent === 'function') {
      try {
        (span as { addEvent: (n: string, a?: object) => void }).addEvent(
          name,
          toAttrs(attrs)
        );
        return;
      } catch {
        /* fall through */
      }
    }

    // Short TOOL span for the event
    try {
      const s = L.startSpan({
        name: `event.${name}`,
        spanType: 'TOOL',
        sessionId,
        input: attrs,
        metadata: { event: name, agentId },
      });
      s.end();
    } catch {
      /* ignore */
    }
  }

  setAttributes(attrs: TelemetryAttributes, agentId?: string): void {
    let span: Span | undefined;
    if (agentId && agentSpanIds.has(agentId)) {
      span = openSpans.get(agentSpanIds.get(agentId)!);
    } else if (rootSpanId) {
      span = openSpans.get(rootSpanId);
    }
    span?.setAttributes?.(toAttrs(attrs));
  }

  recordRetry(agentId: string, retryCount: number, reason?: string): void {
    this.recordEvent(
      'agent.retry',
      { retryCount, reason: reason ?? 'unspecified' },
      agentId
    );
  }

  recordArtifact(args: {
    agentId: string;
    artifactId: string;
    name: string;
    path: string;
    type: string;
    version?: number;
  }): void {
    const L = ensureSdk();
    if (!L) return;
    try {
      const span = L.startSpan({
        name: `artifact.${args.name}`,
        spanType: 'TOOL',
        sessionId,
        input: args,
        metadata: {
          artifactId: args.artifactId,
          path: args.path,
          type: args.type,
        },
        tags: ['kairo', 'artifact'],
      });
      span.setAttributes({
        'artifact.id': args.artifactId,
        'artifact.path': args.path,
        'artifact.type': args.type,
        'artifact.version': args.version ?? 1,
      });
      span.end();
    } catch {
      /* ignore */
    }
  }

  recordLlmCall(args: {
    agentId?: string;
    name?: string;
    system?: string;
    requestModel: string;
    responseModel?: string;
    messages: Array<{ role: string; content: string }>;
    responseContent: string;
    promptTokens: number;
    completionTokens: number;
    costUsd?: number;
    provider?: string;
  }): void {
    const L = ensureSdk();
    if (!L) return;

    const provider =
      args.provider ??
      (args.requestModel.includes('/') ? 'openrouter' : 'openai');

    try {
      const span = L.startSpan({
        name: args.name ?? 'llm.chat.completions',
        spanType: 'LLM',
        sessionId,
        input: { messages: args.messages },
        metadata: {
          agentId: args.agentId,
          model: args.requestModel,
        },
        tags: ['kairo', 'llm'],
      });

      // GenAI attributes Laminar uses for cost + transcript
      // https://laminar.sh/docs/tracing/structure/span-attribute-reference
      span.setAttributes({
        'gen_ai.system': provider,
        'gen_ai.request.model': args.requestModel,
        'gen_ai.response.model': args.responseModel ?? args.requestModel,
        'gen_ai.usage.input_tokens': args.promptTokens,
        'gen_ai.usage.output_tokens': args.completionTokens,
        'llm.usage.total_tokens': args.promptTokens + args.completionTokens,
        ...(args.costUsd != null ? { 'gen_ai.usage.cost': args.costUsd } : {}),
        'gen_ai.input.messages': JSON.stringify(
          args.messages.map((m) => ({
            role: m.role,
            parts: [{ type: 'text', content: m.content }],
          }))
        ),
        'gen_ai.output.messages': JSON.stringify([
          {
            role: 'assistant',
            parts: [{ type: 'text', content: args.responseContent }],
          },
        ]),
      });

      span.end();
    } catch (e) {
      if (__DEV__) {
        console.warn('[laminar] recordLlmCall', e);
      }
    }
  }

  async flush(): Promise<void> {
    const L = ensureSdk();
    if (!L) return;
    try {
      await L.flush();
    } catch (e) {
      if (__DEV__) {
        console.warn('[laminar] flush', e);
      }
    }
  }
}

/** Singleton used by the workspace pipeline */
export const laminar = new LaminarTelemetry();

/** Call once at app boot — platform: Laminar.initialize() */
export function initializeLaminarSdk(): boolean {
  return initLaminar();
}

export function laminarStatus(): {
  enabled: boolean;
  baseUrl: string;
  hasKey: boolean;
  sdk: boolean;
  initialized: boolean;
  error: string | null;
} {
  const hasKey = Boolean(projectApiKey());
  const L = LaminarRef;
  return {
    enabled: hasKey && Boolean(L?.initialized()),
    baseUrl: baseUrl(),
    hasKey,
    sdk: Boolean(L),
    initialized: Boolean(L?.initialized()),
    error: sdkLoadError,
  };
}
