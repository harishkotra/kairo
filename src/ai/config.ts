/**
 * OpenAI-compatible inference config.
 *
 * Set in `.env` (Expo public vars are inlined at bundle time):
 *   EXPO_PUBLIC_AI_MODE=mock | live
 *   EXPO_PUBLIC_AI_BASE_URL=https://openrouter.ai/api/v1
 *   EXPO_PUBLIC_AI_API_KEY=sk-or-...
 *   EXPO_PUBLIC_AI_MODEL=openai/gpt-4o-mini
 *
 * OpenAI:
 *   EXPO_PUBLIC_AI_BASE_URL=https://api.openai.com/v1
 *   EXPO_PUBLIC_AI_MODEL=gpt-4o-mini
 *
 * Note: Metro only inlines static process.env.EXPO_PUBLIC_* access.
 */

export type AiMode = 'mock' | 'live';

export function getDefaultAiMode(): AiMode {
  const mode = (process.env.EXPO_PUBLIC_AI_MODE ?? 'mock').toLowerCase();
  return mode === 'live' ? 'live' : 'mock';
}

export function getAiConfig() {
  const baseUrl = (
    process.env.EXPO_PUBLIC_AI_BASE_URL ?? 'https://openrouter.ai/api/v1'
  ).replace(/\/$/, '');
  const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY ?? '';
  const model = process.env.EXPO_PUBLIC_AI_MODEL ?? 'openai/gpt-4o-mini';
  return { baseUrl, apiKey, model };
}

export function canUseLiveAi(): boolean {
  const { apiKey, baseUrl } = getAiConfig();
  return Boolean(apiKey && baseUrl);
}

/** Rough $ per 1M tokens (input/output) for cost estimate display */
export function modelPricingPerMillion(model: string): {
  input: number;
  output: number;
} {
  const m = model.toLowerCase();
  if (m.includes('gpt-4o-mini') || m.includes('mini')) {
    return { input: 0.15, output: 0.6 };
  }
  if (m.includes('gpt-4o')) {
    return { input: 2.5, output: 10 };
  }
  if (m.includes('claude')) {
    return { input: 3, output: 15 };
  }
  return { input: 0.5, output: 1.5 };
}
