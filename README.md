# Expo Machines

**AI-native mobile design workspace** for Expo. Not a prompt-to-app generator — a collaborative canvas where specialized agents design the same Expo project together.

## Agents

| Agent | Role |
|-------|------|
| **Architecture** | Expo Router layout, tab navigation, app structure |
| **Design System** | Colors, typography, spacing, radius, shadows, primitives |
| **Home Screen** | Primary surface (runs first after foundation) |
| **Profile Screen** | Identity surface (parallel with Settings) |
| **Settings Screen** | Preferences & dark mode (parallel with Profile) |

## Pipeline

1. Press **Generate**
2. Architecture → Design System → **Home**
3. **Profile** and **Settings** run in parallel
4. Each completed screen agent mounts a **draggable phone preview** on the canvas
5. **Live Preview** opens the full tabbed Expo app
6. **Export to Expo** surfaces the runnable project paths

## Stack

- Expo SDK 57
- Expo Router
- TypeScript
- React Native (native components only)
- Shared design tokens + dark mode

## Run

```bash
npm install --cache /tmp/npm-cache-shk   # if default npm cache has permission issues
npx expo start
```

Then press `w` for web (best for the desktop workspace), or `i` / `a` for simulators.

## Layout

```
app/
  index.tsx              # Collaborative workspace
  preview/               # Live generated Expo app (tabs)
src/
  agents/                # Agent definitions + mock orchestration
  workspace/             # Canvas, sidebars, agent cards, phone previews
  theme/tokens.ts        # Shared design tokens (all screens)
  components/ui/         # Shared primitives
  generated/screens/     # Home, Profile, Settings
```

## Interaction

- **Left sidebar** — Agents, Screens, Components, Assets
- **Center** — Infinite canvas with agent cards + phone previews
- **Right sidebar** — Selected agent, task, progress, files, components
- **Top bar** — Project name, Generate, Live Preview, Export
- Drag agent cards and phone frames; two-finger pan; pinch to zoom
