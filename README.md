# Kairo

**Observability for multi-agent mobile software engineering.**

Kairo is a collaborative workspace where specialized agents design and ship an Expo mobile app from a product brief, while every step stays inspectable: agents, VMs, events, artifacts, decisions, memory, metrics, live device previews, and backend traces.

Describe the product. Agents plan screens, run in isolation, and compose a shared design system. You watch the build unfold on a Figma-like canvas, scrub time-travel replay, scan Expo Go QR when the primary screen ships, and export telemetry to Laminar without leaving Kairo as the control surface.

#### Video Demo

[https://youtu.be/n5WmgDGZk-U](https://youtu.be/n5WmgDGZk-U)

---

## Why Kairo

Mobile product work is usually a black box: a prompt goes in, a half-working app comes out. Kairo flips that model:

| Problem | Kairo approach |
|---------|----------------|
| Unclear what agents decided | Decision explorer with alternatives + confidence |
| No reuse visibility | Artifact graph (tokens → components → screens) |
| Opaque orchestration | Agent DAG + live status colors |
| “Works on my machine” demos | Expo Go QR + evolving live preview |
| No telemetry trail | Laminar spans/events (SDK) - Kairo stays the UI |
| Shared-everything processes | Optional **agentOS** per-agent VM workspaces |

It’s built for **mobile app development** as a first-class outcome: Expo Router, dual-theme tokens, real device frames, and a generated app you can open in Expo Go while remaining agents are still shipping screens.

---

## Features

### Product entry
- Free-text **product brief**
- Curated **example library** (focus timer, recipes, habits, markets, budget, studio booking, trips, standups)
- Planner (mock heuristics or live LLM) returns **navigation + 2–5 screens** - not a fixed Home/Profile/Settings shell

### Multi-agent pipeline
1. **Architecture** - routes & navigation from the brief  
2. **Design system** - dual-theme tokens + shared primitives  
3. **Primary screen** - unlocks live preview / QR  
4. **Remaining screens** - parallel agents on the same theme  

### Observability surfaces
| Surface | Purpose |
|---------|---------|
| **Canvas** | Figma-like board, agent cards, device frames |
| **DAG** | Execution dependency graph |
| **Timeline** | Full event trace |
| **Artifacts** | File/component reuse graph + inspector |
| **Decisions** | Choices, alternatives, confidence |
| **Memory** | Shared + per-agent memory (mem0 optional) |
| **Metrics** | Parallelism, critical path, reuse, cost, a11y |
| **Replay** | Time-travel scrub across the last run |
| **Preview / QR** | Expo Go deep link + in-app live tabs |

### Integrations
- **Laminar** (`@lmnr-ai/lmnr`) - `Laminar.initialize()` + spans for pipeline, agents, LLM calls  
- **agentOS bridge** - local per-agent VMs under `agentos/` (or simulated when offline)  
- **OpenAI-compatible inference** - OpenAI / OpenRouter / any chat-completions API  
- **mem0** - optional shared agent memory  

---

## Stack

| Layer | Technology |
|-------|------------|
| App shell | Expo SDK 57, Expo Router, React 19, React Native |
| Motion | Reanimated 4, Gesture Handler |
| Device UI | Custom Dynamic Island phone frames, DynamicScreen renderer |
| Graphs | `react-native-svg` |
| QR | `react-native-qrcode-svg` |
| Telemetry | `@lmnr-ai/lmnr` (forceHttp OTLP) |
| VM host | Local Express bridge (`agentos/`) compatible with agentOS concepts |
| Language | TypeScript (strict) |

---

## Quick start

### Prerequisites
- Node 20+
- npm
- Expo Go on a phone (optional, for QR preview)
- Same Wi‑Fi for Expo Go LAN (or tunnel)

### Install & run

```bash
git clone https://github.com/harishkotra/kairo.git
cd kairo
npm install
cp .env.example .env   # add keys as needed
npm run agentos:install
npm run dev            # starts the agentOS bridge + Expo together
```

Press **`w`** for web (best for the workspace UI), or use `npm run dev:web` to open web directly. The agentOS bridge is required for the Expo Go QR to resolve your LAN IP and serve the preview to phones.

1. Pick an example brief or write your own  
2. **Build app**  
3. Watch agents on canvas / DAG / timeline  
4. When the primary screen ships → **Expo Go QR** or **Open here**  
5. Inspect decisions, artifacts, memory, metrics  

### Optional: agentOS VMs

```bash
npm run agentos:install
npm run agentos
# → http://localhost:7420
# Workspaces: agentos/.vms/
```

With the bridge up, each agent boots an isolated workspace. Without it, VMs are **simulated** so the UI still shows lifecycle and files.

### Optional: live AI + Laminar

```bash
# .env
EXPO_PUBLIC_AI_MODE=live
EXPO_PUBLIC_AI_BASE_URL=https://openrouter.ai/api/v1
EXPO_PUBLIC_AI_API_KEY=...
EXPO_PUBLIC_AI_MODEL=openai/gpt-4o-mini

EXPO_PUBLIC_LMNR_PROJECT_API_KEY=...   # Laminar project key
# EXPO_PUBLIC_MEM0_API_KEY=...         # optional memory
# EXPO_PUBLIC_DEV_SERVER_HOST=192.168.x.x:8081  # Expo Go if LAN detect fails
```

Restart Expo after changing `.env`.

Top bar shows **`lmnr`** when Laminar initializes successfully.

---

## Project layout

```
app/
  index.tsx                 # Workspace shell
  preview/                  # Live product preview (dynamic tabs)
src/
  agents/                   # Dynamic agent factory from AppPlan
  ai/                       # Planner + OpenAI-compatible client + inference
  agentos/client.ts         # Per-agent VM client
  artifacts/                # Artifact graph model
  generated/DynamicScreen.tsx
  memory/                   # mem0 + local memory service
  metrics/                  # Run metrics
  prompts/library.ts        # Example product briefs
  telemetry/laminar.ts      # Laminar.initialize() + span facade
  theme/                    # Product tokens + workspace chrome
  components/ui/            # Shared primitives (Button, Card, …)
  workspace/                # Canvas, inspector, observability views
agentos/                    # Local VM bridge server
IMPLEMENTATION_PLAN.md      # Feature phases (1–13)
.env.example                # Env template (no secrets)
```

---

## Architecture (high level)

```
User brief
    ↓
App planner (mock | live LLM)  →  AppPlan { screens, navigation }
    ↓
Agent pipeline
  architecture → designSystem → primary screen → parallel screens
    ↓                    ↓
  Laminar spans     agentOS VM per agent
    ↓
Kairo UI: canvas · DAG · timeline · artifacts · decisions · memory · metrics
    ↓
Live preview (DynamicScreen) + Expo Go exp://HOST/--/preview
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | agentOS bridge + Expo, one terminal |
| `npm run dev:web` | Same, opening the web workspace |
| `npm start` / `npx expo start` | Expo dev server only |
| `npm run web` | Web only |
| `npm run ios` / `android` | Native simulators |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run agentos` | Local agentOS VM bridge |
| `npm run agentos:install` | Install bridge deps |

---

## Configuration reference

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_AI_MODE` | `mock` (default) or `live` |
| `EXPO_PUBLIC_AI_BASE_URL` | OpenAI-compatible API base |
| `EXPO_PUBLIC_AI_API_KEY` | Inference API key |
| `EXPO_PUBLIC_AI_MODEL` | Model id |
| `EXPO_PUBLIC_LMNR_PROJECT_API_KEY` | Laminar project API key |
| `EXPO_PUBLIC_LMNR_BASE_URL` | Default `https://api.lmnr.ai` |
| `EXPO_PUBLIC_MEM0_API_KEY` | Optional mem0 |
| `EXPO_PUBLIC_AGENTOS_URL` | Default `http://localhost:7420` |
| `EXPO_PUBLIC_DEV_SERVER_HOST` | Force Expo Go host `IP:PORT` |

---

## Mobile development value

Kairo is not only an agent demo - it’s a **mobile delivery loop**:

- **Expo-native** from day one (Router, tokens, previews)  
- **Device-accurate frames** for design review on the canvas  
- **Expo Go** for real-device validation mid-pipeline  
- **Shared design system** so screens stay consistent as agents parallelize  
- **Observability** so product and eng can debug agent decisions, not only final UI  

Use it to explore product shapes quickly, then harden the generated structure into production Expo code under the same token system.

---

## License

MIT - see [LICENSE](./LICENSE).

---

## Links

- Repo: https://github.com/harishkotra/kairo  
- Expo docs (SDK 57): https://docs.expo.dev/versions/v57.0.0/  
- Laminar: https://laminar.sh/docs  
- agentOS concepts: https://agentos-sdk.dev/docs/

#### Screenshots

<img width="1955" height="1163" alt="Screenshot at Jul 18 17-36-21" src="https://github.com/user-attachments/assets/c72eabf1-cba8-4293-8ed5-9e3ba400bd61" />
<img width="1953" height="1163" alt="Screenshot at Jul 18 17-36-37" src="https://github.com/user-attachments/assets/513edae7-ff3e-4291-919a-88c290013d74" />
<img width="1958" height="1163" alt="Screenshot at Jul 18 17-36-50" src="https://github.com/user-attachments/assets/452714ea-4803-4352-a35e-7d1e0efa6ed4" />
<img width="1954" height="1162" alt="Screenshot at Jul 18 17-37-23" src="https://github.com/user-attachments/assets/4f52c4c2-1272-40aa-bf1b-27b321021ff6" />
<img width="1956" height="1166" alt="Screenshot at Jul 18 17-37-36" src="https://github.com/user-attachments/assets/da09fedc-9a61-4785-a539-0c12657f807f" />
<img width="1960" height="1165" alt="Screenshot at Jul 18 17-37-46" src="https://github.com/user-attachments/assets/edb71634-73b1-4818-8db2-4445e6e82d90" />
<img width="3920" height="12129" alt="screencapture-localhost-8081-2026-07-18-17_38_02" src="https://github.com/user-attachments/assets/a27c5c66-3ba3-4f79-9307-c464964b0eaf" />

