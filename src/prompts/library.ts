/**
 * Curated product briefs for local testing.
 * Short enough to run quickly; distinctive enough to show planning variance.
 */

export type PromptExample = {
  id: string;
  label: string;
  category: string;
  /** One-line product pitch shown in the picker */
  blurb: string;
  /** Full brief sent to the planner */
  prompt: string;
};

export const PROMPT_LIBRARY: PromptExample[] = [
  {
    id: 'focus-timer',
    label: 'Focus Timer',
    category: 'Productivity',
    blurb: 'Pomodoro sessions with streaks and a calm home surface.',
    prompt:
      'Build a focus timer app for deep work. Users start timed sessions, track daily streaks, browse a short session history, and tweak focus length in settings. Tone: calm, minimal, professional.',
  },
  {
    id: 'recipe-box',
    label: 'Recipe Box',
    category: 'Lifestyle',
    blurb: 'Save recipes, cook mode, and a pantry checklist.',
    prompt:
      'Build a personal recipe box. Home shows saved recipes as cards, a cook mode screen walks steps one at a time, and a pantry list tracks ingredients to buy. Clean culinary aesthetic, light-friendly.',
  },
  {
    id: 'habit-garden',
    label: 'Habit Garden',
    category: 'Health',
    blurb: 'Daily habits with a garden metaphor and weekly review.',
    prompt:
      'Build a habit tracker called Habit Garden. Today view for check-offs, a garden overview of progress, and a weekly review of completion. Soft, encouraging UI — not clinical.',
  },
  {
    id: 'local-markets',
    label: 'Local Markets',
    category: 'Discovery',
    blurb: 'Find weekend markets, favorites, and vendor details.',
    prompt:
      'Build an app to discover local farmers markets. Map-or-list browse nearby markets, a favorites list, and a market detail view with hours and vendors. Practical city-guide feel.',
  },
  {
    id: 'budget-pulse',
    label: 'Budget Pulse',
    category: 'Finance',
    blurb: 'Spending snapshot, categories, and add-expense flow.',
    prompt:
      'Build a simple personal budget app. Dashboard with this month’s spend, category breakdown, recent transactions list, and a quick add-expense screen. Clear numbers, trustworthy fintech UI.',
  },
  {
    id: 'studio-book',
    label: 'Studio Book',
    category: 'Booking',
    blurb: 'Book creative studio slots and manage upcoming sessions.',
    prompt:
      'Build a studio booking app for photographers. Browse available rooms, book a time slot, and see upcoming bookings. Dark-friendly creative studio aesthetic.',
  },
  {
    id: 'pack-list',
    label: 'Trip Pack',
    category: 'Travel',
    blurb: 'Trip packing lists with checklist progress.',
    prompt:
      'Build a trip packing app. Home lists trips, a trip detail checklist of items to pack, and a simple templates screen for reuse. Friendly travel UI.',
  },
  {
    id: 'team-standups',
    label: 'Standups',
    category: 'Work',
    blurb: 'Async standups: today, history, team roster.',
    prompt:
      'Build an async standup tool for small teams. Compose today’s update, see the team feed, and open member profiles. Crisp B2B product design.',
  },
];

export function getPromptById(id: string): PromptExample | undefined {
  return PROMPT_LIBRARY.find((p) => p.id === id);
}
