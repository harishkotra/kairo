import {
  canUseLiveAi,
  getAiConfig,
  modelPricingPerMillion,
} from './config';
import { laminar } from '../telemetry/laminar';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatResult = {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  model: string;
};

export class AiClientError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'AiClientError';
  }
}

/**
 * OpenAI-compatible chat completions (OpenAI, OpenRouter, etc.).
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    /** For Laminar parent association */
    agentId?: string;
  }
): Promise<ChatResult> {
  if (!canUseLiveAi()) {
    throw new AiClientError(
      'Live AI requires EXPO_PUBLIC_AI_API_KEY (and base URL). Switch to mock or set .env.'
    );
  }

  const { baseUrl, apiKey, model } = getAiConfig();
  const url = `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  // OpenRouter optional headers (ignored by OpenAI)
  if (baseUrl.includes('openrouter')) {
    headers['HTTP-Referer'] = 'https://kairo.local';
    headers['X-Title'] = 'Kairo';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.4,
      max_tokens: options?.maxTokens ?? 600,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AiClientError(
      `AI request failed (${res.status}): ${body.slice(0, 240)}`,
      res.status
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
    model?: string;
  };

  const content = data.choices?.[0]?.message?.content?.trim() ?? '';
  const promptTokens = data.usage?.prompt_tokens ?? estimateTokens(messages);
  const completionTokens =
    data.usage?.completion_tokens ?? Math.ceil(content.length / 4);
  const totalTokens =
    data.usage?.total_tokens ?? promptTokens + completionTokens;

  const price = modelPricingPerMillion(model);
  const estimatedCostUsd =
    (promptTokens / 1_000_000) * price.input +
    (completionTokens / 1_000_000) * price.output;

  const resolvedModel = data.model ?? model;
  const provider = baseUrl.includes('openrouter')
    ? 'openrouter'
    : baseUrl.includes('anthropic')
      ? 'anthropic'
      : 'openai';

  // Laminar LLM span (official gen_ai + lmnr.span.type=LLM wire format)
  laminar.recordLlmCall({
    agentId: options?.agentId,
    name: 'llm.chat.completions',
    provider,
    requestModel: model,
    responseModel: resolvedModel,
    messages,
    responseContent: content,
    promptTokens,
    completionTokens,
    costUsd: estimatedCostUsd,
  });

  return {
    content,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd,
    model: resolvedModel,
  };
}

function estimateTokens(messages: ChatMessage[]): number {
  const chars = messages.reduce((s, m) => s + m.content.length, 0);
  return Math.ceil(chars / 4);
}

export function parseJsonFromModel<T>(raw: string): T | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? raw).trim();
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
