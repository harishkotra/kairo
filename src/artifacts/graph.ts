import type {
  AgentId,
  ArtifactEdge,
  ArtifactGraph,
  ProjectArtifact,
  AppPlan,
} from '../agents/types';
import { isScreenAgent, screenAgentId } from '../agents/definitions';

export function emptyArtifactGraph(): ArtifactGraph {
  return { nodes: [], edges: [] };
}

/** Build foundation + screen artifacts when an agent completes. */
export function mergeAgentArtifacts(
  graph: ArtifactGraph,
  agentId: AgentId,
  createdAt: number,
  plan: AppPlan | null
): { graph: ArtifactGraph; created: ProjectArtifact[] } {
  const specs = specsForAgent(agentId, plan);
  const existing = new Set(graph.nodes.map((n) => n.id));
  const created: ProjectArtifact[] = [];
  const nodes = [...graph.nodes];
  const edges = [...graph.edges];
  const edgeKeys = new Set(edges.map((e) => e.id));

  for (const spec of specs) {
    if (existing.has(spec.id)) continue;
    const node: ProjectArtifact = {
      id: spec.id,
      type: spec.type,
      name: spec.name,
      path: spec.path,
      agentId: spec.agentId,
      createdAt,
      usedBy: spec.usedBy,
      dependsOn: spec.dependsOn,
      version: 1,
      lastModifiedBy: agentId,
      lastModifiedAt: createdAt,
    };
    nodes.push(node);
    created.push(node);
    existing.add(spec.id);

    for (const dep of spec.dependsOn) {
      const edgeId = `${dep}->${spec.id}`;
      if (edgeKeys.has(edgeId)) continue;
      if (existing.has(dep) || specs.some((s) => s.id === dep)) {
        edges.push({
          id: edgeId,
          from: dep,
          to: spec.id,
          kind: spec.type === 'screen' ? 'renders' : 'imports',
        });
        edgeKeys.add(edgeId);
      }
    }
  }

  for (const node of created) {
    for (const consumer of node.usedBy) {
      if (!existing.has(consumer)) continue;
      const edgeId = `${node.id}->${consumer}:uses`;
      if (edgeKeys.has(edgeId)) continue;
      edges.push({
        id: edgeId,
        from: node.id,
        to: consumer,
        kind: 'uses',
      });
      edgeKeys.add(edgeId);
    }
  }

  return { graph: { nodes, edges }, created };
}

type Spec = {
  id: string;
  type: ProjectArtifact['type'];
  name: string;
  path: string;
  agentId: AgentId;
  dependsOn: string[];
  usedBy: string[];
};

function specsForAgent(agentId: AgentId, plan: AppPlan | null): Spec[] {
  if (agentId === 'architecture') {
    return [
      {
        id: 'art-layout-root',
        type: 'layout',
        name: '_layout.tsx',
        path: 'app/_layout.tsx',
        agentId: 'architecture',
        dependsOn: [],
        usedBy: ['art-tabs-layout'],
      },
      {
        id: 'art-tabs-layout',
        type: 'layout',
        name: '(tabs)/_layout.tsx',
        path: 'app/(tabs)/_layout.tsx',
        agentId: 'architecture',
        dependsOn: ['art-layout-root'],
        usedBy: plan
          ? plan.screens.map((s) => `art-screen-file-${s.id}`)
          : [],
      },
    ];
  }

  if (agentId === 'designSystem') {
    const screenArt = plan
      ? plan.screens.map((s) => `art-screen-${s.id}`)
      : [];
    return [
      {
        id: 'art-tokens',
        type: 'token',
        name: 'tokens.ts',
        path: 'src/theme/tokens.ts',
        agentId: 'designSystem',
        dependsOn: [],
        usedBy: [
          'art-theme-provider',
          'art-btn',
          'art-card',
          'art-listrow',
          ...screenArt,
        ],
      },
      {
        id: 'art-theme-provider',
        type: 'file',
        name: 'ThemeProvider.tsx',
        path: 'src/theme/ThemeProvider.tsx',
        agentId: 'designSystem',
        dependsOn: ['art-tokens'],
        usedBy: screenArt,
      },
      {
        id: 'art-btn',
        type: 'component',
        name: 'Button.tsx',
        path: 'src/components/ui/Button.tsx',
        agentId: 'designSystem',
        dependsOn: ['art-tokens'],
        usedBy: screenArt,
      },
      {
        id: 'art-card',
        type: 'component',
        name: 'Card.tsx',
        path: 'src/components/ui/Card.tsx',
        agentId: 'designSystem',
        dependsOn: ['art-tokens'],
        usedBy: screenArt,
      },
      {
        id: 'art-listrow',
        type: 'component',
        name: 'ListRow.tsx',
        path: 'src/components/ui/ListRow.tsx',
        agentId: 'designSystem',
        dependsOn: ['art-tokens'],
        usedBy: screenArt,
      },
    ];
  }

  if (isScreenAgent(agentId) && plan) {
    const slug = agentId.replace('screen:', '');
    const screen = plan.screens.find((s) => s.id === slug);
    if (!screen) return [];
    return [
      {
        id: `art-screen-${slug}`,
        type: 'screen',
        name: `${screen.title.replace(/\s+/g, '')}Screen.tsx`,
        path: `src/generated/screens/${screen.title.replace(/\s+/g, '')}Screen.tsx`,
        agentId,
        dependsOn: [
          'art-tokens',
          'art-theme-provider',
          'art-card',
          'art-listrow',
          'art-tabs-layout',
        ],
        usedBy: [`art-screen-file-${slug}`],
      },
      {
        id: `art-screen-file-${slug}`,
        type: 'file',
        name: `${slug}.tsx`,
        path: `app/(tabs)/${slug}.tsx`,
        agentId,
        dependsOn: [`art-screen-${slug}`, 'art-tabs-layout'],
        usedBy: [],
      },
    ];
  }

  return [];
}

export function layoutArtifactPositions(
  nodes: ProjectArtifact[]
): Record<string, { x: number; y: number }> {
  const layers: string[][] = [
    ['art-layout-root', 'art-tokens'],
    ['art-tabs-layout', 'art-theme-provider'],
    ['art-btn', 'art-card', 'art-listrow'],
  ];
  const screenNodes = nodes.filter((n) => n.type === 'screen').map((n) => n.id);
  const fileNodes = nodes
    .filter((n) => n.id.startsWith('art-screen-file-'))
    .map((n) => n.id);
  layers.push(screenNodes);
  layers.push(fileNodes);

  const pos: Record<string, { x: number; y: number }> = {};
  const present = new Set(nodes.map((n) => n.id));

  layers.forEach((layer, col) => {
    const visible = layer.filter((id) => present.has(id));
    visible.forEach((id, row) => {
      pos[id] = { x: 40 + col * 200, y: 40 + row * 88 };
    });
  });

  let orphanRow = 0;
  for (const n of nodes) {
    if (!pos[n.id]) {
      pos[n.id] = { x: 40, y: 480 + orphanRow * 72 };
      orphanRow += 1;
    }
  }
  return pos;
}

export function artifactsForAgent() {
  return [];
}
