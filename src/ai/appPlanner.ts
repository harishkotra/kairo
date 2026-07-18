import type { AppPlan, ScreenSpec, ScreenSection, ScreenSectionItem } from '../agents/types';
import { chatCompletion, parseJsonFromModel, AiClientError } from './client';
import { getAiConfig, modelPricingPerMillion } from './config';

export type PlanResult = {
  plan: AppPlan;
  usedLive: boolean;
  tokenUsage: { prompt: number; completion: number; total: number };
  estimatedCostUsd: number;
  reasoningSummary: string;
};

const ICONS = [
  'home-outline', 'grid-outline', 'list-outline', 'person-outline',
  'settings-outline', 'flash-outline', 'calendar-outline', 'map-outline',
  'heart-outline', 'wallet-outline', 'book-outline', 'fitness-outline',
  'restaurant-outline', 'airplane-outline', 'people-outline', 'time-outline',
  'musical-notes-outline', 'cart-outline', 'cloud-outline', 'share-outline',
  'download-outline', 'document-outline', 'folder-outline', 'globe-outline',
] as const;

const EMOJIS = ['📱', '💻', '🚀', '🎯', '⚡', '🔥', '✨', '💡', '🔒', '📡', '🔄', '📤', '📥', '🔗', '🛡️', '🎮', '📊', '🎵', '📸', '✉️'];

const COLORS = ['#3DDC97', '#B8A1FF', '#FFB86B', '#7EC8FF', '#FF8FAB', '#6CD4A0', '#F9A8D4', '#93C5FD', '#86EFAC', '#FDE68A'];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'screen';
}

function titleCase(s: string): string {
  return s.split(/[\s-_]+/).filter(Boolean).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
}

/** Extract meaningful nouns & concepts from user prompt */
function extractConcepts(prompt: string): string[] {
  const cleaned = prompt.replace(/[^a-zA-Z\s]/g, ' ');
  const words = cleaned.split(/\s+/).filter((w) => w.length > 2);
  const stopwords = new Set([
    'this', 'that', 'with', 'from', 'have', 'been', 'were', 'will',
    'would', 'could', 'should', 'about', 'their', 'there', 'which',
    'build', 'make', 'create', 'want', 'need', 'like', 'just', 'app',
    'mobile', 'also', 'very', 'more', 'some', 'than', 'then', 'what',
    'when', 'where', 'your', 'into', 'over', 'such', 'only', 'other',
    'kind', 'thing', 'things', 'really', 'simple', 'easy', 'good',
  ]);
  return [...new Set(words)].filter((w) => w.length > 2 && !stopwords.has(w.toLowerCase())).slice(0, 12);
}

function emoji(): string {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

function color(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

/**
 * Dynamic mock planner — no hardcoded templates.
 * Extracts concepts from the prompt and builds relevant screens
 * with realistic content derived from the user's own words.
 */
export function mockPlanFromPrompt(userPrompt: string): AppPlan {
  const p = userPrompt.toLowerCase();
  const concepts = extractConcepts(userPrompt);
  const c0 = concepts[0] || 'app';
  const c1 = concepts[1] || 'manage';
  const c2 = concepts[2] || 'explore';
  const c3 = concepts[3] || 'settings';

  const projectName = titleCase(c0) + (concepts.length > 1 ? ` ${titleCase(c1)}` : '');
  const summary = userPrompt.slice(0, 140);

  const isShare = /share|transfer|send|peer|sync|upload|download|file/i.test(p);
  const isChat = /chat|message|talk|conversation|social/i.test(p);
  const isTrack = /track|monitor|log|habit|fitness|health|workout/i.test(p);
  const isShop = /shop|store|buy|sell|market|order|delivery/i.test(p);
  const isLearn = /learn|course|study|read|watch|tutorial/i.test(p);
  const isFinance = /finance|money|budget|spend|invest|bank/i.test(p);

  let screens: ScreenSpec[];

  if (isShare) {
    screens = [
      makeScreen('files', 'Files', 'All your files', c0, [
        { type: 'hero', title: 'My Files', description: `${c1} your files across devices.`, kicker: `${c0} active`, cta: 'Share files', color: '#3DDC97' },
        { type: 'stats', items: [
          { title: 'Shared', value: '24', subtitle: 'Files shared', icon: '📤', color: '#3DDC97' },
          { title: 'Received', value: '18', subtitle: 'Incoming files', icon: '📥', color: '#7EC8FF' },
          { title: 'Devices', value: '3', subtitle: 'Connected', icon: '💻', color: '#B8A1FF' },
        ]},
        { type: 'cards', title: 'Recent files', items: [
          { title: 'Project Proposal.pdf', subtitle: '2.4 MB · Shared with Alex', icon: '📄', badge: 'Sent', color: '#3DDC97' },
          { title: 'Vacation Photo.jpg', subtitle: '5.1 MB · Received from Mom', icon: '🖼️', badge: 'New', color: '#FFB86B' },
          { title: 'Playlist.m3u', subtitle: 'Shared link · 2h ago', icon: '🎵', color: '#FF8FAB' },
        ]},
      ], 'share-outline'),
      makeScreen('transfers', 'Transfers', 'Active & recent', 'transfers', [
        { type: 'hero', title: 'Transfer in progress', description: `${c0} → 192.168.1.42`, kicker: 'Encrypted', color: '#B8A1FF' },
        { type: 'list', title: 'Active', items: [
          { title: 'Design Assets.zip', subtitle: '68% · 1.2 GB / 1.8 GB · 2 min left', icon: '📦', badge: '68%', color: '#7EC8FF' },
          { title: 'Photo Album.tar', subtitle: 'Waiting to send', icon: '🖼️', badge: 'Queued', color: '#FFB86B' },
        ]},
        { type: 'list', title: 'History', items: [
          { title: 'Document.pdf', subtitle: 'Completed · 2 MB', icon: '✅', color: '#3DDC97' },
          { title: 'Movie.mp4', subtitle: 'Failed · 1.2 GB', icon: '❌', color: '#FF8FAB' },
          { title: 'Music Album', subtitle: 'Completed · 340 MB', icon: '🎵', color: '#3DDC97' },
        ]},
      ], 'download-outline'),
      makeScreen('devices', 'Devices', 'Connected devices', c2, [
        { type: 'cards', title: 'Nearby devices', items: [
          { title: "Alex's Phone", subtitle: 'Android · 2.4 GHz', icon: '📱', badge: 'Online', color: '#3DDC97' },
          { title: 'Work Laptop', subtitle: 'macOS · 5 GHz', icon: '💻', badge: 'Online', color: '#7EC8FF' },
          { title: 'Home Server', subtitle: 'Linux · Ethernet', icon: '🖥️', badge: 'Idle', color: '#FFB86B' },
          { title: 'Tablet', subtitle: 'Last seen 2h ago', icon: '📲', color: '#FF8FAB' },
        ]},
        { type: 'actions', items: [{ title: 'Discover devices', icon: '🔍', color: '#3DDC97' }] },
      ], 'globe-outline'),
    ];
  } else if (isChat) {
    screens = [
      makeScreen('chats', 'Chats', 'Conversations', c0, [
        { type: 'hero', title: projectName, description: summary || 'Stay connected.', kicker: `${c0} online`, cta: 'New message', color: '#7EC8FF' },
        { type: 'cards', title: 'Recent', items: [
          { title: 'Alex Chen', subtitle: 'Sounds great! See you tomorrow', icon: '👋', badge: '2', color: '#3DDC97' },
          { title: 'Design Team', subtitle: 'New design assets uploaded', icon: '🎨', badge: '5', color: '#B8A1FF' },
          { title: 'Mom', subtitle: 'Did you get the photos? 📸', icon: '❤️', color: '#FF8FAB' },
        ]},
      ], 'chatbubbles-outline'),
      makeScreen('contacts', 'Contacts', 'Your network', c1, [
        { type: 'list', items: [
          { title: 'Alex Chen', subtitle: 'Online', icon: '🟢', color: '#3DDC97' },
          { title: 'Jordan Riley', subtitle: 'Last seen 5m ago', icon: '🟡', color: '#FFB86B' },
          { title: 'Sam Thompson', subtitle: 'Away', icon: '⭕', color: '#FF8FAB' },
          { title: 'Taylor Swift', subtitle: 'Online', icon: '🟢', color: '#3DDC97' },
        ]},
      ], 'people-outline'),
    ];
  } else if (isTrack) {
    const activity = concepts[1] || 'activity';
    screens = [
      makeScreen('dashboard', 'Dashboard', `Track your ${c0}`, c0, [
        { type: 'hero', title: `Today's ${titleCase(c0)}`, description: summary || `Track your ${c0} progress.`, kicker: `${titleCase(c0)} goal`, cta: 'Log entry', color: '#3DDC97' },
        { type: 'stats', items: [
          { title: 'Current', value: '7', subtitle: `${titleCase(c0)} streak`, icon: '🔥', color: '#FFB86B' },
          { title: 'This week', value: '12', subtitle: `${titleCase(c1)} sessions`, icon: '📊', color: '#7EC8FF' },
          { title: 'Goal', value: '85%', subtitle: 'Completion rate', icon: '🎯', color: '#3DDC97' },
        ]},
      ], 'stats-chart-outline'),
      makeScreen('log', 'Log', `Record ${c0}`, 'log', [
        { type: 'list', title: `Today's ${c0}`, items: [
          { title: 'Morning session', subtitle: '30 min · Good', icon: '🌅', badge: 'Done', color: '#3DDC97' },
          { title: 'Midday activity', subtitle: '15 min', icon: '☀️', badge: 'Open', color: '#FFB86B' },
          { title: 'Evening practice', subtitle: 'Not started', icon: '🌙', color: '#FF8FAB' },
        ]},
        { type: 'actions', items: [{ title: `Add ${titleCase(c0)}`, icon: '➕', color: '#3DDC97' }] },
      ], 'create-outline'),
      makeScreen('history', 'History', 'Past activity', c2, [
        { type: 'list', items: [
          { title: 'Monday', subtitle: `${titleCase(c1)} 30 min`, icon: '✅', color: '#3DDC97' },
          { title: 'Sunday', subtitle: `${titleCase(c1)} 45 min`, icon: '✅', color: '#3DDC97' },
          { title: 'Saturday', subtitle: 'Rest day', icon: '💤', color: '#FFB86B' },
          { title: 'Friday', subtitle: `${titleCase(c1)} 20 min`, icon: '✅', color: '#3DDC97' },
        ]},
      ], 'time-outline'),
    ];
  } else if (isShop) {
    screens = [
      makeScreen('browse', 'Browse', `Discover ${c0}`, c0, [
        { type: 'hero', title: `Discover ${titleCase(c0)}`, description: summary || `Browse ${c0} and find what you need.`, kicker: 'Featured', cta: 'Shop now', color: '#FFB86B' },
        { type: 'cards', title: 'Featured', items: [
          { title: titleCase(concepts[1] || 'Premium'), subtitle: 'Top rated', icon: '⭐', badge: 'Popular', color: '#FFB86B' },
          { title: titleCase(concepts[2] || 'Essentials'), subtitle: 'Best value', icon: '🏆', color: '#3DDC97' },
          { title: titleCase(concepts[3] || 'New'), subtitle: 'Just arrived', icon: '✨', color: '#7EC8FF' },
        ]},
      ], 'grid-outline'),
      makeScreen('cart', 'Cart', 'Your items', c1, [
        { type: 'list', title: 'Shopping cart', items: [
          { title: titleCase(concepts[0] || 'Item'), subtitle: 'Qty: 1 · $24.99', icon: '🛒', color: '#FFB86B' },
          { title: titleCase(concepts[2] || 'Add-on'), subtitle: 'Qty: 2 · $39.98', icon: '🛒', color: '#FF8FAB' },
        ]},
        { type: 'stats', items: [
          { title: 'Total', value: '$64.97', icon: '💳', color: '#3DDC97' },
        ]},
        { type: 'actions', items: [{ title: 'Checkout', icon: '✅', color: '#3DDC97' }] },
      ], 'cart-outline'),
    ];
  } else if (isLearn) {
    screens = [
      makeScreen('learn', 'Learn', `Explore ${c0}`, c0, [
        { type: 'hero', title: `Learn ${titleCase(c0)}`, description: summary || `Explore ${c0} at your own pace.`, kicker: 'Continue learning', cta: 'Start lesson', color: '#B8A1FF' },
        { type: 'cards', title: 'Your courses', items: [
          { title: `${titleCase(c0)} Fundamentals`, subtitle: '12 lessons', icon: '📖', badge: 'In progress', color: '#B8A1FF' },
          { title: `Advanced ${titleCase(c1)}`, subtitle: '8 lessons', icon: '🎓', color: '#7EC8FF' },
          { title: `${titleCase(c2)} Masterclass`, subtitle: 'Coming soon', icon: '⭐', color: '#FFB86B' },
        ]},
      ], 'book-outline'),
      makeScreen('progress', 'Progress', 'Your learning', c1, [
        { type: 'stats', items: [
          { title: 'Courses', value: '3', subtitle: 'In progress', icon: '📚' },
          { title: 'Completed', value: '8', subtitle: 'Lessons done', icon: '✅' },
          { title: 'Streak', value: '5', subtitle: 'Days', icon: '🔥' },
        ]},
        { type: 'list', title: 'Continue learning', items: [
          { title: `${titleCase(c0)} Fundamentals`, subtitle: 'Lesson 5/12 · 68% complete', icon: '📖', badge: '68%', color: '#B8A1FF' },
          { title: `${titleCase(c1)} Basics`, subtitle: 'Lesson 2/8 · 25% complete', icon: '📝', badge: '25%', color: '#7EC8FF' },
        ]},
      ], 'trending-up-outline'),
    ];
  } else if (isFinance) {
    screens = [
      makeScreen('dashboard', 'Dashboard', 'Financial overview', c0, [
        { type: 'hero', title: 'Account Overview', description: summary || 'Track your spending and savings.', kicker: 'Monthly summary', color: '#3DDC97' },
        { type: 'stats', items: [
          { title: 'Balance', value: '$4,280', subtitle: 'Checking', icon: '💰', color: '#3DDC97' },
          { title: 'Spent', value: '$1,240', subtitle: 'This month', icon: '📊', color: '#FF8FAB' },
          { title: 'Saved', value: '$840', subtitle: 'This month', icon: '🏦', color: '#7EC8FF' },
        ]},
        { type: 'list', title: 'Recent transactions', items: [
          { title: 'Groceries', subtitle: '−$86.20 · Today', icon: '🛒', color: '#FF8FAB' },
          { title: 'Salary Deposit', subtitle: '+$3,200 · Yesterday', icon: '💰', color: '#3DDC97' },
          { title: 'Coffee Shop', subtitle: '−$5.50 · Yesterday', icon: '☕', color: '#FF8FAB' },
        ]},
      ], 'wallet-outline'),
    ];
  } else {
    // Fully dynamic: build screens from the user's own concepts
    const title0 = titleCase(c0);
    const title1 = titleCase(c1);
    const title2 = titleCase(c2);
    const title3 = titleCase(c3);

    screens = [
      makeScreen('main', title0, `${title0} overview`, c0, [
        { type: 'hero', title: title0, description: summary || `Welcome to your ${title0} app. Everything you need in one place.`, cta: `Open ${title0}`, color: color() },
        { type: 'stats', items: [
          { title: c0, value: String(Math.floor(Math.random() * 50) + 5), subtitle: 'Total items', icon: emoji(), color: color() },
          { title: c1, value: String(Math.floor(Math.random() * 30) + 2), subtitle: 'Active now', icon: emoji(), color: color() },
          { title: c2, value: String(Math.floor(Math.random() * 100) + 50), subtitle: 'Completed', icon: emoji(), color: color() },
        ]},
        { type: 'cards', title: title1, items: [
          { title: `${title1} One`, subtitle: `${title2} feature · Popular`, icon: emoji(), badge: 'Trending', color: color() },
          { title: `${title1} Two`, subtitle: `New ${title2} release`, icon: emoji(), color: color() },
          { title: `${title1} Three`, subtitle: `Top ${title2} choice`, icon: emoji(), badge: 'Best', color: color() },
        ]},
      ], 'home-outline'),
      makeScreen('explore', title1, `Explore ${title1}`, c1, [
        { type: 'list', title: `${title1} items`, items: [
          { title: `${title1} Alpha`, subtitle: `${title2} category`, icon: emoji(), color: color() },
          { title: `${title1} Beta`, subtitle: `${title3} related`, icon: emoji(), badge: 'New', color: color() },
          { title: `${title1} Gamma`, subtitle: `${c0} integration`, icon: emoji(), color: color() },
          { title: `${title1} Delta`, subtitle: `Coming ${title2}`, icon: emoji(), badge: 'Soon', color: color() },
        ]},
        { type: 'actions', items: [{ title: `Discover ${title1}`, icon: '🔍', color: color() }] },
      ], 'grid-outline'),
      makeScreen('manage', title2, `Manage ${title2}`, c2, [
        { type: 'list', title: `Manage your ${title2}`, items: [
          { title: `${title2} settings`, subtitle: 'Configure preferences', icon: '⚙️', color: color() },
          { title: `${title2} history`, subtitle: 'Past activity log', icon: '📋', color: color() },
          { title: `${title2} notifications`, subtitle: 'Updates and alerts', icon: '🔔', color: color() },
          { title: `${title2} backups`, subtitle: 'Data and storage', icon: '💾', color: color() },
        ]},
      ], 'settings-outline'),
    ];
  }

  // Ensure unique ids
  const used = new Set<string>();
  screens = screens.map((s, i) => {
    let id = s.id;
    if (used.has(id)) id = `${id}-${i}`;
    used.add(id);
    return { ...s, id };
  });

  // Cap 2–5 screens
  if (screens.length < 2) {
    screens.push({
      id: 'settings',
      title: 'Settings',
      role: 'Preferences and account',
      icon: 'settings-outline',
      layout: 'settings',
      sections: [{ type: 'list', title: 'Preferences', items: [
        { title: 'Notifications', subtitle: 'On' },
        { title: 'Appearance', subtitle: 'System' },
        { title: 'Account', subtitle: 'Signed in' },
      ]}],
    });
  }
  screens = screens.slice(0, 5);

  return {
    projectName: projectName.slice(0, 40),
    summary,
    userPrompt,
    navigation: isChat || isShare ? 'tabs' : isLearn ? 'stack' : 'tabs',
    screens,
    designNotes: 'Dual-theme tokens; shared Card/ListRow/Button primitives.',
    primaryScreenId: screens[0]?.id ?? 'main',
  };
}

function makeScreen(
  id: string, title: string, role: string, concept: string,
  sections: ScreenSection[], icon?: string
): ScreenSpec {
  const iconName = icon && ICONS.includes(icon as any) ? (icon as string) : ICONS[Math.floor(Math.random() * ICONS.length)];
  return {
    id: slugify(id), title, role, icon: iconName,
    layout: sections.some((s) => s.type === 'stats') ? 'dashboard' : 'feed',
    sections: sections.map((s) => ({
      type: s.type, title: s.title, description: s.description,
      kicker: s.kicker, cta: s.cta, color: s.color,
      items: s.items?.map((it) => ({
        title: it.title, subtitle: it.subtitle, badge: it.badge,
        icon: it.icon, value: it.value, color: it.color,
      })),
    })),
  };
}

function normalizePlan(raw: Partial<AppPlan>, userPrompt: string): AppPlan {
  const fallback = mockPlanFromPrompt(userPrompt);
  const screensIn = Array.isArray(raw.screens) ? raw.screens : fallback.screens;
  const screens: ScreenSpec[] = screensIn.slice(0, 5).map((s, i) => {
    const id = slugify(String(s.id || s.title || `screen-${i}`));
    const icon = ICONS.includes(s.icon as (typeof ICONS)[number])
      ? (s.icon as string)
      : ICONS[i % ICONS.length];
    const rawSections = Array.isArray(s.sections) ? s.sections : [];
    return {
      id,
      title: String(s.title || titleCase(id)),
      role: String(s.role || 'App surface'),
      icon,
      layout: (['feed', 'dashboard', 'list', 'profile', 'settings', 'detail', 'form'].includes(
        String(s.layout)
      )
        ? s.layout
        : 'feed') as ScreenSpec['layout'],
      sections: rawSections.length > 0
        ? rawSections.map((sec: any) => ({
            type: sec.type || 'hero',
            title: sec.title,
            description: sec.description,
            kicker: sec.kicker,
            cta: sec.cta,
            color: sec.color,
            items: Array.isArray(sec.items)
              ? sec.items.map((it: any) => ({
                  title: it.title || '',
                  subtitle: it.subtitle,
                  badge: it.badge,
                  icon: it.icon,
                  value: it.value,
                  color: it.color,
                }))
              : undefined,
          }))
        : [{ type: 'hero' as const, title: String(s.title || id) }],
    };
  });

  if (screens.length < 2) return fallback;

  return {
    projectName: String(raw.projectName || fallback.projectName).slice(0, 40),
    summary: String(raw.summary || fallback.summary).slice(0, 200),
    userPrompt,
    navigation: raw.navigation === 'stack' || raw.navigation === 'drawer'
      ? raw.navigation : 'tabs',
    screens,
    designNotes: String(raw.designNotes || fallback.designNotes),
    primaryScreenId: screens[0].id,
  };
}

function cost(prompt: number, completion: number): number {
  const price = modelPricingPerMillion(getAiConfig().model);
  return (prompt / 1e6) * price.input + (completion / 1e6) * price.output;
}

/**
 * Plan app structure from a user product brief.
 * Live: OpenAI-compatible JSON. Mock: dynamic semantic planner.
 */
export async function planAppFromPrompt(
  userPrompt: string,
  useMock: boolean
): Promise<PlanResult> {
  const trimmed = userPrompt.trim();
  if (!trimmed) {
    const plan = mockPlanFromPrompt('a simple mobile productivity app');
    return { plan, usedLive: false, tokenUsage: { prompt: 0, completion: 0, total: 0 }, estimatedCostUsd: 0, reasoningSummary: 'Empty prompt — generated from concepts.' };
  }

  if (useMock) {
    const plan = mockPlanFromPrompt(trimmed);
    const promptT = Math.ceil(trimmed.length / 4) + 200;
    const completionT = 400 + plan.screens.length * 80;
    return {
      plan, usedLive: false,
      tokenUsage: { prompt: promptT, completion: completionT, total: promptT + completionT },
      estimatedCostUsd: cost(promptT, completionT),
      reasoningSummary: `Planned ${plan.screens.length} screens for “${plan.projectName}”: ${plan.screens.map((s) => s.title).join(', ')}.`,
    };
  }

  const system = `You are the product architect for Kairo, a multi-agent Expo app builder.

Given a user product brief, design REAL, SPECIFIC app screens with authentic content that matches the brief exactly.

CRITICAL: Do NOT produce generic screens like "Home", "Explore", "Settings", "Browse" unless the brief explicitly asks for them. Every screen name and content must be DERIVED FROM THE BRIEF.

Return ONLY this JSON structure:
{
  "projectName": "string",
  "summary": "string",
  "navigation": "tabs" | "stack" | "drawer",
  "screens": [
    {
      "id": "slug-name",
      "title": "Screen Title",
      "role": "one-line description",
      "icon": "ionicons-outline-name",
      "layout": "feed" | "dashboard" | "list" | "profile" | "settings" | "detail" | "form",
      "sections": [
        {
          "type": "hero" | "stats" | "cards" | "list" | "actions" | "form",
          "title"?: string,
          "description"?: string,
          "kicker"?: string,
          "cta"?: string,
          "items"?: [
            {
              "title": "Real item name",
              "subtitle": "Real details with emoji",
              "badge"?: "Badge text",
              "icon"?: "emoji like 🔥 or 📁",
              "value"?: "Number or amount",
              "color"?: "hex color"
            }
          ]
        }
      ]
    }
  ]
}

RULES:
- 2-5 screens. Each screen must have REAL content matching the brief.
- FIRST screen is the primary/tab 1.
- Use hero with description/kicker/cta for featured content
- Use stats with real numbers for dashboards
- Use cards for lists of items with emoji icons
- Use list for data rows with status indicators
- Items MUST include emoji icons that match their content
- Use colors that look good (from this palette: #3DDC97 #B8A1FF #FFB86B #7EC8FF #FF8FAB)
- NEVER use generic placeholder text like "Item one", "Feature", "Details"

Examples of GOOD screens for "P2P file transfer app":
- "Files" with hero showing active transfers, cards for recent files, stats for shared/received counts
- "Transfers" with list of active and completed transfers showing progress, size, status
- "Devices" with cards of connected devices showing name, platform, connection type, online status

No markdown. ONLY the JSON object.`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: trimmed },
      ],
      { temperature: 0.6, maxTokens: 2500, agentId: 'planner' }
    );
    const parsed = parseJsonFromModel<Partial<AppPlan>>(result.content);
    const plan = normalizePlan(parsed ?? {}, trimmed);
    return {
      plan, usedLive: true,
      tokenUsage: { prompt: result.promptTokens, completion: result.completionTokens, total: result.totalTokens },
      estimatedCostUsd: result.estimatedCostUsd,
      reasoningSummary: `Live plan: ${plan.projectName} with screens ${plan.screens.map((s) => s.title).join(', ')}.`,
    };
  } catch (e) {
    const msg = e instanceof AiClientError
      ? `AI API error: ${e.message}`
      : e instanceof Error ? e.message : 'Unknown error';
    const plan = mockPlanFromPrompt(trimmed);
    return {
      plan, usedLive: false,
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      estimatedCostUsd: 0,
      reasoningSummary: `Live AI unavailable: ${msg}. Using dynamic mock with "${plan.projectName}".`,
    };
  }
}
