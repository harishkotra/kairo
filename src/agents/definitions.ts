import { workspace } from '../theme/tokens';
import type {
  AgentDefinition,
  AgentId,
  AgentRuntime,
  AppPlan,
  ScreenSpec,
} from './types';

const SCREEN_COLORS = [
  workspace.agent.home,
  workspace.agent.profile,
  workspace.agent.settings,
  workspace.agent.architecture,
  workspace.agent.designSystem,
];

export function screenAgentId(screenId: string): AgentId {
  return `screen:${screenId}`;
}

export function isScreenAgent(id: AgentId): boolean {
  return id.startsWith('screen:');
}

export function foundationAgents(plan: AppPlan | null): AgentId[] {
  return ['architecture', 'designSystem'];
}

export function agentOrderFromPlan(plan: AppPlan): AgentId[] {
  return [
    'architecture',
    'designSystem',
    ...plan.screens.map((s) => screenAgentId(s.id)),
  ];
}

function architectureDef(plan: AppPlan): AgentDefinition {
  const tabs = plan.screens.map((s) => s.title).join(', ');
  return {
    id: 'architecture',
    name: 'Architecture',
    role: 'Structure & navigation',
    description: `Scaffolds Expo Router (${plan.navigation}) for: ${tabs}.`,
    goal: `Define ${plan.navigation} navigation for ${plan.screens.length} destinations from the product brief.`,
    color: workspace.agent.architecture,
    icon: 'git-branch-outline',
    producesPreview: false,
    parentId: null,
    childIds: ['designSystem'],
    dependsOn: [],
    screens: [],
    steps: [
      { id: 'brief', label: 'Reading product brief', durationMs: 500 },
      { id: 'nav', label: `Choosing ${plan.navigation} navigation`, durationMs: 800 },
      { id: 'routes', label: 'Mapping screen routes', durationMs: 900 },
      { id: 'scaffold', label: 'Writing app layout contracts', durationMs: 1000 },
      { id: 'publish', label: 'Publishing screen slots', durationMs: 500 },
    ],
    files: [
      'app/_layout.tsx',
      `app/(tabs)/_layout.tsx`,
      ...plan.screens.map((s) => `app/(tabs)/${s.id}.tsx`),
    ],
    components: [],
  };
}

function designSystemDef(plan: AppPlan): AgentDefinition {
  return {
    id: 'designSystem',
    name: 'Design System',
    role: 'Tokens & primitives',
    description: plan.designNotes,
    goal: 'Ship dual-theme tokens and shared primitives every screen imports.',
    color: workspace.agent.designSystem,
    icon: 'color-palette-outline',
    producesPreview: false,
    parentId: 'architecture',
    childIds: plan.screens.map((s) => screenAgentId(s.id)),
    dependsOn: ['architecture'],
    screens: [],
    steps: [
      { id: 'palette', label: 'Crafting dual-theme palette', durationMs: 700 },
      { id: 'type', label: 'Setting type scale', durationMs: 550 },
      { id: 'space', label: 'Locking spacing grid', durationMs: 500 },
      { id: 'primitives', label: 'Building shared primitives', durationMs: 1000 },
      { id: 'publish', label: 'Publishing theme package', durationMs: 450 },
    ],
    files: [
      'src/theme/tokens.ts',
      'src/theme/ThemeProvider.tsx',
      'src/components/ui/Button.tsx',
      'src/components/ui/Card.tsx',
      'src/components/ui/ListRow.tsx',
    ],
    components: ['Button', 'Card', 'Avatar', 'ListRow', 'Badge', 'SectionHeader'],
  };
}

function screenDef(
  screen: ScreenSpec,
  index: number,
  plan: AppPlan,
  primaryFirst: boolean
): AgentDefinition {
  const id = screenAgentId(screen.id);
  const isPrimary = screen.id === plan.primaryScreenId || index === 0;
  return {
    id,
    name: `${screen.title} Screen`,
    role: screen.role,
    description: `Composes the ${screen.title} surface (${screen.layout}) from shared tokens.`,
    goal: `Ship ${screen.title} for “${plan.projectName}” using design system primitives only.`,
    color: SCREEN_COLORS[index % SCREEN_COLORS.length],
    icon: screen.icon || 'phone-portrait-outline',
    producesPreview: true,
    screenSpec: screen,
    parentId: 'designSystem',
    childIds: [],
    // Primary depends only on design; others depend on design + primary for sequential wow then parallel
    dependsOn: primaryFirst && !isPrimary
      ? ['designSystem', screenAgentId(plan.primaryScreenId)]
      : ['designSystem'],
    screens: [screen.title],
    steps: [
      { id: 'brief', label: 'Ingesting plan + tokens', durationMs: 450 },
      { id: 'layout', label: `Composing ${screen.layout} layout`, durationMs: 800 },
      { id: 'sections', label: 'Building sections', durationMs: 900 },
      { id: 'bind', label: 'Binding shared primitives', durationMs: 700 },
      { id: 'ship', label: 'Mounting live preview', durationMs: 450 },
    ],
    files: [
      `app/(tabs)/${screen.id}.tsx`,
      `src/generated/screens/${screen.title.replace(/\s+/g, '')}Screen.tsx`,
    ],
    components: screen.sections.map((s, i) => `${screen.title}Section${i + 1}`),
  };
}

export function buildDefinitions(plan: AppPlan): Record<AgentId, AgentDefinition> {
  const defs: Record<AgentId, AgentDefinition> = {
    architecture: architectureDef(plan),
    designSystem: designSystemDef(plan),
  };
  plan.screens.forEach((s, i) => {
    defs[screenAgentId(s.id)] = screenDef(s, i, plan, true);
  });
  return defs;
}

const EMPTY_POSITION = { x: 80, y: 80 };

export function layoutAgentPositions(
  order: AgentId[]
): Record<AgentId, { x: number; y: number }> {
  const pos: Record<AgentId, { x: number; y: number }> = {};
  let screenCol = 0;
  for (const id of order) {
    if (id === 'architecture') pos[id] = { x: 80, y: 80 };
    else if (id === 'designSystem') pos[id] = { x: 380, y: 80 };
    else {
      pos[id] = { x: 80 + screenCol * 300, y: 300 };
      screenCol += 1;
    }
  }
  return pos;
}

export function layoutPreviewPositions(
  plan: AppPlan
): Record<AgentId, { x: number; y: number }> {
  const pos: Record<AgentId, { x: number; y: number }> = {};
  plan.screens.forEach((s, i) => {
    pos[screenAgentId(s.id)] = { x: 80 + (i % 3) * 320, y: 560 + Math.floor(i / 3) * 200 };
  });
  return pos;
}

export function createInitialAgents(plan: AppPlan | null): {
  agents: Record<AgentId, AgentRuntime>;
  order: AgentId[];
} {
  if (!plan) {
    return { agents: {}, order: [] };
  }
  const defs = buildDefinitions(plan);
  const order = agentOrderFromPlan(plan);
  const positions = layoutAgentPositions(order);
  const previews = layoutPreviewPositions(plan);
  const agents = {} as Record<AgentId, AgentRuntime>;
  for (const id of order) {
    const def = defs[id];
    agents[id] = {
      ...def,
      status: 'idle',
      progress: 0,
      currentStepIndex: -1,
      currentTask: 'Waiting for run',
      retryCount: 0,
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      estimatedCostUsd: 0,
      confidence: 0,
      reasoningSummary: '',
      warnings: [],
      nextHandoff: def.childIds.length
        ? `Hand off to ${def.childIds.map((c) => defs[c]?.name ?? c).join(', ')}`
        : 'No further handoff',
      position: positions[id] ?? { ...EMPTY_POSITION },
      previewPosition: previews[id] ?? { x: 0, y: 0 },
      vm: {
        key: `kairo-${id}`,
        status: 'idle',
        mode: 'simulated',
        filesWritten: [],
      },
    };
  }
  return { agents, order };
}

export function agentName(
  id: AgentId,
  agents?: Record<AgentId, AgentRuntime>
): string {
  if (agents?.[id]?.name) return agents[id].name;
  if (id === 'architecture') return 'Architecture';
  if (id === 'designSystem') return 'Design System';
  if (isScreenAgent(id)) return id.replace('screen:', '');
  return id;
}

/** @deprecated use agentOrderFromPlan — kept for imports during migration */
export const AGENT_ORDER: AgentId[] = ['architecture', 'designSystem'];
