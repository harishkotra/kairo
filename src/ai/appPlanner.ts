import type { AppPlan, ScreenSpec } from '../agents/types';
import { chatCompletion, parseJsonFromModel } from './client';
import { getAiConfig, modelPricingPerMillion } from './config';

export type PlanResult = {
  plan: AppPlan;
  usedLive: boolean;
  tokenUsage: { prompt: number; completion: number; total: number };
  estimatedCostUsd: number;
  reasoningSummary: string;
};

const ICONS = [
  'home-outline',
  'grid-outline',
  'list-outline',
  'person-outline',
  'settings-outline',
  'flash-outline',
  'calendar-outline',
  'map-outline',
  'heart-outline',
  'wallet-outline',
  'book-outline',
  'fitness-outline',
  'restaurant-outline',
  'airplane-outline',
  'people-outline',
  'time-outline',
  'musical-notes-outline',
  'cart-outline',
] as const;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'screen';
}

function titleCase(s: string): string {
  return s
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

/** Heuristic mock planner — varies screens by prompt keywords (not a fixed 3-tab app). */
export function mockPlanFromPrompt(userPrompt: string): AppPlan {
  const p = userPrompt.toLowerCase();
  let projectName = 'Aurora Mobile';
  let screens: ScreenSpec[] = [];
  let navigation: AppPlan['navigation'] = 'tabs';
  let summary = '';
  let designNotes = 'Dual-theme tokens; shared Card/ListRow/Button primitives.';

  if (/focus|pomodoro|timer|deep work/.test(p)) {
    projectName = 'Focus Timer';
    summary = 'Timed deep-work sessions with streaks and history.';
    screens = [
      feedScreen('today', 'Today', 'Start and track the active focus block', 'time-outline', [
        { type: 'hero', title: 'Ready to focus' },
        { type: 'stats', title: 'Streak', items: [{ title: '7 days', subtitle: 'Current streak' }, { title: '42', subtitle: 'Sessions' }] },
        { type: 'actions', title: 'Quick start', items: [{ title: '25 min' }, { title: '50 min' }, { title: 'Custom' }] },
      ]),
      listScreen('history', 'History', 'Past sessions', 'list-outline', [
        { title: 'Morning deep work', subtitle: '50 min · done' },
        { title: 'Afternoon sprint', subtitle: '25 min · done' },
        { title: 'Evening review', subtitle: '15 min · skipped' },
      ]),
      settingsScreen('settings', 'Settings', 'Session length and notifications', [
        { title: 'Focus length', subtitle: '25 minutes' },
        { title: 'Break length', subtitle: '5 minutes' },
        { title: 'Sound', subtitle: 'Soft chime' },
      ]),
    ];
  } else if (/recipe|cook|kitchen|pantry/.test(p)) {
    projectName = 'Recipe Box';
    summary = 'Saved recipes, cook mode, and pantry checklist.';
    screens = [
      feedScreen('recipes', 'Recipes', 'Saved recipe cards', 'restaurant-outline', [
        {
          type: 'hero',
          title: 'Tonight’s pick',
          items: [{ title: 'Shakshuka', subtitle: 'Warm spices · 28 min · 2 servings' }],
        },
        {
          type: 'cards',
          title: 'Saved recipes',
          items: [
            { title: 'Shakshuka', subtitle: '28 min · Easy' },
            { title: 'Miso ramen', subtitle: '40 min · Medium' },
            { title: 'Citrus salad', subtitle: '12 min · Easy' },
          ],
        },
      ]),
      listScreen('cook', 'Cook', 'Step-by-step cook mode', 'restaurant-outline', [
        { title: 'Heat the pan', subtitle: 'Medium oil until shimmering' },
        { title: 'Soften onions', subtitle: '6–8 min until golden' },
        { title: 'Simmer tomatoes', subtitle: 'Add spices · reduce 10 min' },
        { title: 'Eggs & serve', subtitle: 'Cover until whites set' },
      ]),
      listScreen('pantry', 'Pantry', 'Ingredients to buy', 'cart-outline', [
        { title: 'Eggs', subtitle: 'Need 4' },
        { title: 'Cumin', subtitle: 'In stock' },
        { title: 'Feta', subtitle: 'Need' },
        { title: 'Parsley', subtitle: 'Need' },
      ]),
    ];
  } else if (/habit|garden|streak/.test(p)) {
    projectName = 'Habit Garden';
    summary = 'Daily check-offs with garden progress and weekly review.';
    screens = [
      feedScreen('today', 'Today', 'Check off today’s habits', 'checkbox-outline', [
        { type: 'hero', title: 'Grow today' },
        { type: 'list', title: 'Habits', items: [{ title: 'Morning walk', subtitle: 'Done' }, { title: 'Read 20 min', subtitle: 'Open' }, { title: 'Water plants', subtitle: 'Open' }] },
      ]),
      feedScreen('garden', 'Garden', 'Visual progress', 'planet-outline', [
        { type: 'hero', title: 'Your garden' },
        { type: 'stats', items: [{ title: '12', subtitle: 'Blooms' }, { title: '84%', subtitle: 'Week' }] },
        { type: 'cards', title: 'Patches', items: [{ title: 'Health' }, { title: 'Focus' }, { title: 'Home' }] },
      ]),
      listScreen('review', 'Review', 'Weekly completion', 'calendar-outline', [
        { title: 'Mon–Wed', subtitle: 'Strong start' },
        { title: 'Thu', subtitle: 'Missed walk' },
        { title: 'Fri–Sun', subtitle: 'Recovered' },
      ]),
    ];
  } else if (/market|farmers|vendor/.test(p)) {
    projectName = 'Local Markets';
    summary = 'Discover markets, save favorites, open vendor details.';
    navigation = 'tabs';
    screens = [
      feedScreen('explore', 'Explore', 'Nearby markets', 'map-outline', [
        { type: 'hero', title: 'This weekend' },
        { type: 'cards', items: [{ title: 'Riverfront Market', subtitle: 'Sat 8–1' }, { title: 'Hillside Produce', subtitle: 'Sun 9–2' }] },
      ]),
      listScreen('favorites', 'Saved', 'Favorite markets', 'heart-outline', [
        { title: 'Riverfront Market', subtitle: 'Open Sat' },
        { title: 'Eastside Night Market', subtitle: 'Fri eve' },
      ]),
      feedScreen('market', 'Market', 'Hours and vendors', 'business-outline', [
        { type: 'hero', title: 'Riverfront Market' },
        { type: 'list', title: 'Vendors', items: [{ title: 'Oak Dairy' }, { title: 'Green Loaf Bakery' }, { title: 'Citrus Co-op' }] },
      ]),
    ];
  } else if (/budget|spend|expense|finance|money/.test(p)) {
    projectName = 'Budget Pulse';
    summary = 'Monthly spend dashboard, categories, and quick add.';
    screens = [
      feedScreen('dashboard', 'Dashboard', 'This month at a glance', 'wallet-outline', [
        { type: 'hero', title: 'April spend' },
        { type: 'stats', items: [{ title: '$2,140', subtitle: 'Total' }, { title: '68%', subtitle: 'of budget' }] },
        { type: 'cards', title: 'Categories', items: [{ title: 'Housing' }, { title: 'Food' }, { title: 'Transit' }] },
      ]),
      listScreen('activity', 'Activity', 'Recent transactions', 'list-outline', [
        { title: 'Groceries', subtitle: '−$86.20' },
        { title: 'Metro pass', subtitle: '−$32.00' },
        { title: 'Payroll', subtitle: '+$3,200' },
      ]),
      feedScreen('add', 'Add', 'Log an expense', 'add-circle-outline', [
        { type: 'form', title: 'New expense', items: [{ title: 'Amount' }, { title: 'Category' }, { title: 'Note' }] },
        { type: 'actions', items: [{ title: 'Save expense' }] },
      ]),
    ];
  } else if (/studio|book|photographer|room/.test(p)) {
    projectName = 'Studio Book';
    summary = 'Browse rooms, book slots, manage upcoming sessions.';
    designNotes = 'Dark-first creative studio; high-contrast cards.';
    screens = [
      feedScreen('rooms', 'Rooms', 'Available studios', 'images-outline', [
        { type: 'hero', title: 'Book a room' },
        { type: 'cards', items: [{ title: 'Daylight Loft', subtitle: 'From $90/hr' }, { title: 'Cyclorama', subtitle: 'From $140/hr' }] },
      ]),
      feedScreen('book', 'Book', 'Pick a time slot', 'calendar-outline', [
        { type: 'list', title: 'Open slots', items: [{ title: 'Thu 10:00' }, { title: 'Thu 14:00' }, { title: 'Fri 11:00' }] },
        { type: 'actions', items: [{ title: 'Confirm booking' }] },
      ]),
      listScreen('upcoming', 'Upcoming', 'Your sessions', 'time-outline', [
        { title: 'Daylight Loft', subtitle: 'Thu 10:00 · 2h' },
        { title: 'Cyclorama', subtitle: 'Next week' },
      ]),
    ];
  } else if (/pack|trip|travel|luggage/.test(p)) {
    projectName = 'Trip Pack';
    summary = 'Trips, packing checklists, and reusable templates.';
    screens = [
      listScreen('trips', 'Trips', 'Your travel plans', 'airplane-outline', [
        { title: 'Lisbon · May', subtitle: '12 / 28 packed' },
        { title: 'Denver weekend', subtitle: '0 / 14 packed' },
      ]),
      listScreen('checklist', 'Pack', 'Items for the active trip', 'checkbox-outline', [
        { title: 'Passport', subtitle: 'Done' },
        { title: 'Charger', subtitle: 'Open' },
        { title: 'Jacket', subtitle: 'Open' },
      ]),
      listScreen('templates', 'Templates', 'Reusable packing lists', 'copy-outline', [
        { title: 'Weekend city' },
        { title: 'Beach week' },
        { title: 'Work trip' },
      ]),
    ];
  } else if (/standup|team|async|update/.test(p)) {
    projectName = 'Standups';
    summary = 'Async standups: compose, team feed, member profiles.';
    designNotes = 'Crisp B2B density; clear hierarchy.';
    screens = [
      feedScreen('compose', 'Today', 'Write your update', 'create-outline', [
        { type: 'form', title: 'Standup', items: [{ title: 'Yesterday' }, { title: 'Today' }, { title: 'Blockers' }] },
        { type: 'actions', items: [{ title: 'Post update' }] },
      ]),
      feedScreen('feed', 'Team', 'Team feed', 'people-outline', [
        { type: 'cards', items: [{ title: 'Ava', subtitle: 'Shipped billing fix' }, { title: 'Noah', subtitle: 'API review' }] },
      ]),
      feedScreen('people', 'People', 'Team roster', 'person-outline', [
        { type: 'list', items: [{ title: 'Ava Chen', subtitle: 'Eng' }, { title: 'Noah Park', subtitle: 'Design' }, { title: 'Sam Okonkwo', subtitle: 'PM' }] },
      ]),
    ];
  } else {
    // Generic product from prompt words
    const words = userPrompt
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 4);
    projectName = words[0] ? titleCase(words[0]) : 'Mobile App';
    if (words.length > 1) projectName = `${titleCase(words[0])} ${titleCase(words[1])}`.slice(0, 28);
    summary = userPrompt.slice(0, 140);
    screens = [
      feedScreen('home', 'Home', 'Primary surface for the product', 'home-outline', [
        { type: 'hero', title: projectName },
        { type: 'cards', title: 'Highlights', items: [{ title: 'Get started' }, { title: 'Recent' }, { title: 'Suggested' }] },
        { type: 'actions', items: [{ title: 'Primary action' }] },
      ]),
      listScreen('browse', 'Browse', 'Explore content', 'grid-outline', [
        { title: 'Item one', subtitle: 'Details' },
        { title: 'Item two', subtitle: 'Details' },
        { title: 'Item three', subtitle: 'Details' },
      ]),
      settingsScreen('settings', 'Settings', 'Preferences', [
        { title: 'Notifications', subtitle: 'On' },
        { title: 'Appearance', subtitle: 'System' },
        { title: 'Account', subtitle: 'Signed in' },
      ]),
    ];
    // Sometimes 4 screens for variety
    if (/social|community|chat|message/.test(p)) {
      screens.splice(2, 0, listScreen('messages', 'Messages', 'Conversations', 'chatbubble-outline', [
        { title: 'Alex', subtitle: 'See you tomorrow' },
        { title: 'Team', subtitle: '3 new' },
      ]));
    }
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
    screens.push(settingsScreen('settings', 'Settings', 'Preferences', [{ title: 'General' }]));
  }
  screens = screens.slice(0, 5);

  return {
    projectName,
    summary,
    userPrompt,
    navigation,
    screens,
    designNotes,
    primaryScreenId: screens[0]?.id ?? 'home',
  };
}

function feedScreen(
  id: string,
  title: string,
  role: string,
  icon: string,
  sections: ScreenSpec['sections']
): ScreenSpec {
  return {
    id: slugify(id),
    title,
    role,
    icon: icon as ScreenSpec['icon'],
    layout: 'feed',
    sections,
  };
}

function listScreen(
  id: string,
  title: string,
  role: string,
  icon: string,
  items: Array<{ title: string; subtitle?: string }>
): ScreenSpec {
  return {
    id: slugify(id),
    title,
    role,
    icon: icon as ScreenSpec['icon'],
    layout: 'list',
    sections: [{ type: 'list', title, items }],
  };
}

function settingsScreen(
  id: string,
  title: string,
  role: string,
  items: Array<{ title: string; subtitle?: string }>
): ScreenSpec {
  return {
    id: slugify(id),
    title,
    role,
    icon: 'settings-outline',
    layout: 'settings',
    sections: [{ type: 'list', title: 'Preferences', items }],
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
      sections:
        Array.isArray(s.sections) && s.sections.length
          ? s.sections
          : [{ type: 'hero', title: String(s.title || id) }],
    };
  });

  if (screens.length < 2) {
    return fallback;
  }

  return {
    projectName: String(raw.projectName || fallback.projectName).slice(0, 40),
    summary: String(raw.summary || fallback.summary).slice(0, 200),
    userPrompt,
    navigation:
      raw.navigation === 'stack' || raw.navigation === 'drawer'
        ? raw.navigation
        : 'tabs',
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
 * Live: OpenAI-compatible JSON. Mock: keyword heuristics with varied screens.
 */
export async function planAppFromPrompt(
  userPrompt: string,
  useMock: boolean
): Promise<PlanResult> {
  const trimmed = userPrompt.trim();
  if (!trimmed) {
    const plan = mockPlanFromPrompt('a simple mobile productivity app');
    return {
      plan,
      usedLive: false,
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      estimatedCostUsd: 0,
      reasoningSummary: 'Empty prompt — used default productivity plan.',
    };
  }

  if (useMock) {
    const plan = mockPlanFromPrompt(trimmed);
    const promptT = Math.ceil(trimmed.length / 4) + 200;
    const completionT = 400 + plan.screens.length * 80;
    return {
      plan,
      usedLive: false,
      tokenUsage: {
        prompt: promptT,
        completion: completionT,
        total: promptT + completionT,
      },
      estimatedCostUsd: cost(promptT, completionT),
      reasoningSummary: `Planned ${plan.screens.length} screens for “${plan.projectName}”: ${plan.screens.map((s) => s.title).join(', ')}.`,
    };
  }

  const system = `You are the product architect for Kairo, a multi-agent Expo app builder.
Given a user product brief, return ONLY JSON:
{
  "projectName": string,
  "summary": string,
  "navigation": "tabs" | "stack" | "drawer",
  "designNotes": string,
  "screens": [
    {
      "id": "slug",
      "title": "Tab label",
      "role": "one line",
      "icon": "ionicons-outline name e.g. home-outline",
      "layout": "feed" | "dashboard" | "list" | "profile" | "settings" | "detail" | "form",
      "sections": [
        { "type": "hero"|"stats"|"cards"|"list"|"actions"|"form", "title"?: string,
          "items"?: [{ "title": string, "subtitle"?: string, "badge"?: string }] }
      ]
    }
  ]
}
Rules: 2-5 screens max. First screen is primary. Match the brief — do NOT always use Home/Profile/Settings.
No markdown.`;

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: trimmed },
      ],
      { temperature: 0.4, maxTokens: 1200, agentId: 'planner' }
    );
    const parsed = parseJsonFromModel<Partial<AppPlan>>(result.content);
    const plan = normalizePlan(parsed ?? {}, trimmed);
    return {
      plan,
      usedLive: true,
      tokenUsage: {
        prompt: result.promptTokens,
        completion: result.completionTokens,
        total: result.totalTokens,
      },
      estimatedCostUsd: result.estimatedCostUsd,
      reasoningSummary: `Live plan: ${plan.projectName} with screens ${plan.screens.map((s) => s.title).join(', ')}.`,
    };
  } catch (e) {
    const plan = mockPlanFromPrompt(trimmed);
    const msg = e instanceof Error ? e.message : 'plan failed';
    return {
      plan,
      usedLive: false,
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      estimatedCostUsd: 0,
      reasoningSummary: `Fell back to heuristic plan: ${msg}`,
    };
  }
}
