import type { AppPlan } from '../agents/types';
export const plan: AppPlan = {
  "projectName": "Trip Packing",
  "summary": "Build a trip packing app. Home lists trips, a trip detail checklist of items to pack, and a simple templates screen for reuse. Friendly trav",
  "userPrompt": "Build a trip packing app. Home lists trips, a trip detail checklist of items to pack, and a simple templates screen for reuse. Friendly travel UI.",
  "navigation": "tabs",
  "screens": [
    {
      "id": "main",
      "title": "Trip",
      "role": "Trip overview",
      "icon": "home-outline",
      "layout": "dashboard",
      "sections": [
        {
          "type": "hero",
          "title": "Trip",
          "description": "Build a trip packing app. Home lists trips, a trip detail checklist of items to pack, and a simple templates screen for reuse. Friendly trav",
          "cta": "Open Trip",
          "color": "#6CD4A0"
        },
        {
          "type": "stats",
          "items": [
            {
              "title": "trip",
              "subtitle": "Total items",
              "icon": "📥",
              "value": "36",
              "color": "#FDE68A"
            },
            {
              "title": "packing",
              "subtitle": "Active now",
              "icon": "📤",
              "value": "5",
              "color": "#FFB86B"
            },
            {
              "title": "Home",
              "subtitle": "Completed",
              "icon": "📊",
              "value": "130",
              "color": "#86EFAC"
            }
          ]
        },
        {
          "type": "cards",
          "title": "Packing",
          "items": [
            {
              "title": "Packing One",
              "subtitle": "Home feature · Popular",
              "badge": "Trending",
              "icon": "📱",
              "color": "#FF8FAB"
            },
            {
              "title": "Packing Two",
              "subtitle": "New Home release",
              "icon": "🎮",
              "color": "#6CD4A0"
            },
            {
              "title": "Packing Three",
              "subtitle": "Top Home choice",
              "badge": "Best",
              "icon": "🚀",
              "color": "#86EFAC"
            }
          ]
        }
      ]
    },
    {
      "id": "explore",
      "title": "Packing",
      "role": "Explore Packing",
      "icon": "grid-outline",
      "layout": "feed",
      "sections": [
        {
          "type": "list",
          "title": "Packing items",
          "items": [
            {
              "title": "Packing Alpha",
              "subtitle": "Home category",
              "icon": "📥",
              "color": "#FFB86B"
            },
            {
              "title": "Packing Beta",
              "subtitle": "Lists related",
              "badge": "New",
              "icon": "🔥",
              "color": "#B8A1FF"
            },
            {
              "title": "Packing Gamma",
              "subtitle": "trip integration",
              "icon": "🛡️",
              "color": "#6CD4A0"
            },
            {
              "title": "Packing Delta",
              "subtitle": "Coming Home",
              "badge": "Soon",
              "icon": "🔄",
              "color": "#3DDC97"
            }
          ]
        },
        {
          "type": "actions",
          "items": [
            {
              "title": "Discover Packing",
              "icon": "🔍",
              "color": "#86EFAC"
            }
          ]
        }
      ]
    },
    {
      "id": "manage",
      "title": "Home",
      "role": "Manage Home",
      "icon": "settings-outline",
      "layout": "feed",
      "sections": [
        {
          "type": "list",
          "title": "Manage your Home",
          "items": [
            {
              "title": "Home settings",
              "subtitle": "Configure preferences",
              "icon": "⚙️",
              "color": "#3DDC97"
            },
            {
              "title": "Home history",
              "subtitle": "Past activity log",
              "icon": "📋",
              "color": "#86EFAC"
            },
            {
              "title": "Home notifications",
              "subtitle": "Updates and alerts",
              "icon": "🔔",
              "color": "#F9A8D4"
            },
            {
              "title": "Home backups",
              "subtitle": "Data and storage",
              "icon": "💾",
              "color": "#F9A8D4"
            }
          ]
        }
      ]
    }
  ],
  "designNotes": "Dual-theme tokens; shared Card/ListRow/Button primitives.",
  "primaryScreenId": "main"
};
