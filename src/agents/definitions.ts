import { workspace } from '../theme/tokens';
import type { AgentDefinition, AgentId, AgentRuntime } from './types';

export const AGENT_ORDER: AgentId[] = [
  'architecture',
  'designSystem',
  'home',
  'profile',
  'settings',
];

export const agentDefinitions: Record<AgentId, AgentDefinition> = {
  architecture: {
    id: 'architecture',
    name: 'Architecture',
    role: 'Structure & navigation',
    description:
      'Scaffolds Expo Router, tab layout, and app entry contracts shared by every screen agent.',
    color: workspace.agent.architecture,
    icon: 'git-branch-outline',
    producesPreview: false,
    steps: [
      { id: 'scan', label: 'Reading project constraints', durationMs: 700 },
      { id: 'router', label: 'Choosing Expo Router file layout', durationMs: 900 },
      { id: 'tabs', label: 'Defining tab navigation graph', durationMs: 800 },
      { id: 'scaffold', label: 'Writing app/_layout.tsx + (tabs)', durationMs: 1100 },
      { id: 'contracts', label: 'Publishing screen slot contracts', durationMs: 600 },
    ],
    files: [
      'app/_layout.tsx',
      'app/(tabs)/_layout.tsx',
      'app/(tabs)/index.tsx',
      'app/(tabs)/profile.tsx',
      'app/(tabs)/settings.tsx',
    ],
    components: [],
  },
  designSystem: {
    id: 'designSystem',
    name: 'Design System',
    role: 'Tokens & visual language',
    description:
      'Defines color, type, spacing, radius, and shadows. Every screen agent imports these tokens.',
    color: workspace.agent.designSystem,
    icon: 'color-palette-outline',
    producesPreview: false,
    steps: [
      { id: 'palette', label: 'Crafting dual-theme palette', durationMs: 900 },
      { id: 'type', label: 'Setting type scale & weights', durationMs: 700 },
      { id: 'space', label: 'Locking spacing & radius grid', durationMs: 650 },
      { id: 'shadows', label: 'Authoring elevation tokens', durationMs: 550 },
      { id: 'primitives', label: 'Building shared primitives', durationMs: 1200 },
      { id: 'publish', label: 'Publishing theme package', durationMs: 500 },
    ],
    files: [
      'src/theme/tokens.ts',
      'src/theme/ThemeProvider.tsx',
      'src/components/ui/Button.tsx',
      'src/components/ui/Card.tsx',
      'src/components/ui/Avatar.tsx',
      'src/components/ui/ListRow.tsx',
    ],
    components: ['Button', 'Card', 'Avatar', 'ListRow', 'Badge', 'SectionHeader'],
  },
  home: {
    id: 'home',
    name: 'Home Screen',
    role: 'Primary surface',
    description:
      'Composes greeting, activity feed, and quick actions using shared design tokens only.',
    color: workspace.agent.home,
    icon: 'home-outline',
    producesPreview: true,
    screenKey: 'home',
    steps: [
      { id: 'brief', label: 'Ingesting architecture + tokens', durationMs: 600 },
      { id: 'hero', label: 'Composing greeting hero', durationMs: 900 },
      { id: 'feed', label: 'Building activity cards', durationMs: 1100 },
      { id: 'actions', label: 'Wiring quick-action row', durationMs: 800 },
      { id: 'polish', label: 'Aligning spacing to tokens', durationMs: 700 },
      { id: 'ship', label: 'Mounting live phone preview', durationMs: 500 },
    ],
    files: ['app/(tabs)/index.tsx', 'src/generated/screens/HomeScreen.tsx'],
    components: ['GreetingHeader', 'ActivityCard', 'QuickAction'],
  },
  profile: {
    id: 'profile',
    name: 'Profile Screen',
    role: 'Identity surface',
    description:
      'Avatar, stats strip, and preference previews — reuses Avatar, Card, ListRow tokens.',
    color: workspace.agent.profile,
    icon: 'person-outline',
    producesPreview: true,
    screenKey: 'profile',
    steps: [
      { id: 'brief', label: 'Loading shared theme package', durationMs: 550 },
      { id: 'identity', label: 'Laying out identity header', durationMs: 950 },
      { id: 'stats', label: 'Rendering stats strip', durationMs: 750 },
      { id: 'sections', label: 'Assembling profile sections', durationMs: 1000 },
      { id: 'a11y', label: 'Checking contrast on tokens', durationMs: 600 },
      { id: 'ship', label: 'Mounting live phone preview', durationMs: 450 },
    ],
    files: ['app/(tabs)/profile.tsx', 'src/generated/screens/ProfileScreen.tsx'],
    components: ['ProfileHeader', 'StatPill', 'ProfileSection'],
  },
  settings: {
    id: 'settings',
    name: 'Settings Screen',
    role: 'Control surface',
    description:
      'Toggles, preference groups, and theme switch — pure token-driven list UI.',
    color: workspace.agent.settings,
    icon: 'settings-outline',
    producesPreview: true,
    screenKey: 'settings',
    steps: [
      { id: 'brief', label: 'Loading shared theme package', durationMs: 500 },
      { id: 'groups', label: 'Grouping preference sections', durationMs: 850 },
      { id: 'toggles', label: 'Binding switch controls', durationMs: 900 },
      { id: 'theme', label: 'Wiring appearance control', durationMs: 700 },
      { id: 'polish', label: 'Normalizing list density', durationMs: 650 },
      { id: 'ship', label: 'Mounting live phone preview', durationMs: 450 },
    ],
    files: [
      'app/(tabs)/settings.tsx',
      'src/generated/screens/SettingsScreen.tsx',
    ],
    components: ['SettingsGroup', 'ToggleRow', 'NavRow'],
  },
};

const POSITIONS: Record<AgentId, { x: number; y: number }> = {
  architecture: { x: 80, y: 80 },
  designSystem: { x: 380, y: 80 },
  home: { x: 80, y: 320 },
  profile: { x: 380, y: 320 },
  settings: { x: 680, y: 320 },
};

const PREVIEW_POSITIONS: Record<AgentId, { x: number; y: number }> = {
  architecture: { x: 0, y: 0 },
  designSystem: { x: 0, y: 0 },
  home: { x: 80, y: 560 },
  profile: { x: 400, y: 560 },
  settings: { x: 720, y: 560 },
};

export function createInitialAgents(): Record<AgentId, AgentRuntime> {
  const result = {} as Record<AgentId, AgentRuntime>;
  for (const id of AGENT_ORDER) {
    const def = agentDefinitions[id];
    result[id] = {
      ...def,
      status: 'idle',
      progress: 0,
      currentStepIndex: -1,
      currentTask: 'Waiting for generate',
      position: { ...POSITIONS[id] },
      previewPosition: { ...PREVIEW_POSITIONS[id] },
    };
  }
  return result;
}
