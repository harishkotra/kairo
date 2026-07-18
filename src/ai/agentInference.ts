import type { AgentDefinition, AgentId, DecisionRecord } from '../agents/types';
import { chatCompletion, parseJsonFromModel } from './client';
import { modelPricingPerMillion, getAiConfig } from './config';

export type DecisionDraft = Omit<DecisionRecord, 'id' | 'ts' | 'agentId'>;

export type AgentInferenceResult = {
  reasoningSummary: string;
  confidence: number;
  warnings: string[];
  nextHandoff: string;
  tokenUsage: { prompt: number; completion: number; total: number };
  estimatedCostUsd: number;
  usedLive: boolean;
  decisions: DecisionDraft[];
};

function mockCost(prompt: number, completion: number): number {
  const price = modelPricingPerMillion(getAiConfig().model);
  return (
    (prompt / 1_000_000) * price.input +
    (completion / 1_000_000) * price.output
  );
}

function withJitter(
  base: Omit<AgentInferenceResult, 'decisions' | 'usedLive'>,
  decisions: DecisionDraft[]
): AgentInferenceResult {
  const j = (n: number, pct = 0.08) =>
    Math.max(0, Math.round(n * (1 + (Math.random() * 2 - 1) * pct)));
  const prompt = j(base.tokenUsage.prompt);
  const completion = j(base.tokenUsage.completion);
  const conf =
    Math.round(
      Math.min(
        0.99,
        Math.max(0.72, base.confidence + (Math.random() - 0.5) * 0.06)
      ) * 100
    ) / 100;
  return {
    ...base,
    confidence: conf,
    tokenUsage: {
      prompt,
      completion,
      total: prompt + completion,
    },
    estimatedCostUsd: mockCost(prompt, completion),
    usedLive: false,
    decisions: decisions.map((d) => ({
      ...d,
      confidence: Math.min(
        0.99,
        Math.max(0.7, d.confidence + (Math.random() - 0.5) * 0.04)
      ),
    })),
  };
}

function mockForDef(def: AgentDefinition): AgentInferenceResult {
  const isScreen = def.id.startsWith('screen:');
  if (def.id === 'architecture') {
    return withJitter(
      {
        reasoningSummary: def.goal,
        confidence: 0.93,
        warnings: [],
        nextHandoff: 'Design System can publish tokens against route contracts.',
        tokenUsage: { prompt: 820, completion: 240, total: 1060 },
        estimatedCostUsd: 0,
      },
      [
        {
          title: 'Navigation shell',
          decision: def.goal.includes('drawer')
            ? 'Drawer'
            : def.goal.includes('stack')
              ? 'Stack'
              : 'Bottom Tabs',
          reason: `Destinations derived from the product brief: ${def.files.filter((f) => f.includes('(tabs)')).length || 'multiple'} routes.`,
          alternatives: ['Drawer', 'Stack only', 'Top tabs'],
          confidence: 0.93,
          category: 'navigation',
        },
      ]
    );
  }
  if (def.id === 'designSystem') {
    return withJitter(
      {
        reasoningSummary: def.description,
        confidence: 0.91,
        warnings: [],
        nextHandoff: 'Screen agents can compose from primitives.',
        tokenUsage: { prompt: 900, completion: 280, total: 1180 },
        estimatedCostUsd: 0,
      },
      [
        {
          title: 'Theme strategy',
          decision: 'Dual-theme token package',
          reason: 'Screens must not hard-code colors; shared primitives enforce reuse.',
          alternatives: ['Single theme', 'Per-screen styles'],
          confidence: 0.91,
          category: 'design',
        },
      ]
    );
  }
  if (isScreen) {
    const title = def.screenSpec?.title ?? def.name;
    return withJitter(
      {
        reasoningSummary: `Composed ${title} as a ${def.screenSpec?.layout ?? 'feed'} surface using shared tokens and sections from the plan.`,
        confidence: 0.88,
        warnings: [],
        nextHandoff: 'Sibling screens can run in parallel on the same theme.',
        tokenUsage: { prompt: 700, completion: 260, total: 960 },
        estimatedCostUsd: 0,
      },
      [
        {
          title: `${title} composition`,
          decision: `${def.screenSpec?.layout ?? 'feed'} layout`,
          reason: def.goal,
          alternatives: ['Dense list', 'Dashboard grid', 'Minimal empty state'],
          confidence: 0.87,
          category: 'ux',
        },
      ]
    );
  }
  return withJitter(
    {
      reasoningSummary: def.goal,
      confidence: 0.85,
      warnings: [],
      nextHandoff: 'Continue pipeline.',
      tokenUsage: { prompt: 500, completion: 200, total: 700 },
      estimatedCostUsd: 0,
    },
    []
  );
}

export async function inferAgentInsights(
  def: AgentDefinition,
  useMock: boolean,
  productBrief?: string
): Promise<AgentInferenceResult> {
  if (useMock) {
    return mockForDef(def);
  }

  const system = `You are the ${def.name} agent in Kairo.
Return ONLY compact JSON:
reasoningSummary (string), confidence (0-1), warnings (string[]), nextHandoff (string),
decisions (array of { title, decision, reason, alternatives: string[], confidence, category }).
1-2 decisions. No markdown.`;

  const user = `Product brief: ${productBrief ?? 'mobile app'}
Goal: ${def.goal}
Role: ${def.role}
Files: ${def.files.join(', ') || 'none'}
Components: ${def.components.join(', ') || 'none'}
Screen: ${def.screenSpec ? JSON.stringify(def.screenSpec) : 'n/a'}`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.4, maxTokens: 1000, agentId: def.id }
    );

    type Parsed = {
      reasoningSummary?: string;
      confidence?: number;
      warnings?: string[];
      nextHandoff?: string;
      decisions?: Array<{
        title?: string;
        decision?: string;
        reason?: string;
        alternatives?: string[];
        confidence?: number;
        category?: string;
      }>;
    };

    const parsed = parseJsonFromModel<Parsed>(result.content);
    const fallback = mockForDef(def);

    const decisions: DecisionDraft[] =
      Array.isArray(parsed?.decisions) && parsed.decisions.length > 0
        ? parsed.decisions.map((d) => ({
            title: d.title?.trim() || 'Decision',
            decision: d.decision?.trim() || 'Unspecified',
            reason: d.reason?.trim() || fallback.reasoningSummary,
            alternatives: Array.isArray(d.alternatives)
              ? d.alternatives.map(String)
              : [],
            confidence:
              typeof d.confidence === 'number'
                ? Math.min(1, Math.max(0, d.confidence))
                : fallback.confidence,
            category: d.category?.trim() || 'general',
          }))
        : fallback.decisions;

    return {
      reasoningSummary:
        parsed?.reasoningSummary?.trim() ||
        result.content.slice(0, 280) ||
        fallback.reasoningSummary,
      confidence:
        typeof parsed?.confidence === 'number'
          ? Math.min(1, Math.max(0, parsed.confidence))
          : fallback.confidence,
      warnings: Array.isArray(parsed?.warnings)
        ? parsed.warnings.map(String)
        : fallback.warnings,
      nextHandoff: parsed?.nextHandoff?.trim() || fallback.nextHandoff,
      tokenUsage: {
        prompt: result.promptTokens,
        completion: result.completionTokens,
        total: result.totalTokens,
      },
      estimatedCostUsd: result.estimatedCostUsd,
      usedLive: true,
      decisions,
    };
  } catch (e) {
    const fallback = mockForDef(def);
    const msg = e instanceof Error ? e.message : 'Live AI failed';
    return {
      ...fallback,
      warnings: [...fallback.warnings, `Fell back to mock: ${msg}`],
      usedLive: false,
    };
  }
}
