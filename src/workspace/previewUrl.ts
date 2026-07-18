import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

export type LivePreviewUrlInfo = {
  /** Prefer this for Expo Go QR / Share */
  url: string;
  /** Same-origin path for in-app "Open preview" (web) */
  webPath: string;
  hostLabel: string;
  scheme: string;
  /** true when URL is phone-reachable (not localhost / 127.0.0.1) */
  isLanReachable: boolean;
  /** How the host was resolved */
  source: string;
  hint?: string;
};

const PREVIEW_PATH = '/preview';

function isLoopback(host: string): boolean {
  const h = host.toLowerCase().split(':')[0] ?? '';
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h === '[::1]' ||
    h.startsWith('169.254.') // link-local: never phone-reachable
  );
}

/** Higher = more likely reachable from a phone on the same Wi‑Fi. */
function hostScore(hostPort: string): number {
  const h = hostPort.split(':')[0] ?? '';
  if (/^192\.168\./.test(h) || /^10\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) {
    return 3;
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return 2;
  return 1; // hostname such as my-mac.local
}

function stripProtocol(hostOrUrl: string): string {
  return hostOrUrl
    .replace(/^https?:\/\//i, '')
    .replace(/^exps?:\/\//i, '')
    .replace(/\/$/, '');
}

function normalizeHostPort(raw: string): string | null {
  if (!raw?.trim()) return null;
  let s = stripProtocol(raw.trim());
  s = s.split('/')[0] ?? s;
  s = s.split('?')[0] ?? s;
  if (!s || isLoopback(s)) return null;
  return s;
}

function collectHostCandidates(): Array<{ host: string; source: string }> {
  const out: Array<{ host: string; source: string }> = [];
  const push = (raw: string | null | undefined, source: string) => {
    if (!raw) return;
    const host = normalizeHostPort(raw);
    if (!host) return;
    if (out.some((c) => c.host === host)) return;
    out.push({ host, source });
  };

  push(process.env.EXPO_PUBLIC_DEV_SERVER_HOST, 'EXPO_PUBLIC_DEV_SERVER_HOST');

  const c = Constants as Record<string, any>;

  push(c?.expoConfig?.hostUri, 'expoConfig.hostUri');
  push(c?.expoGoConfig?.debuggerHost, 'expoGoConfig.debuggerHost');
  push(c?.manifest2?.extra?.expoGo?.debuggerHost, 'manifest2.expoGo');
  push(c?.manifest2?.extra?.expoClient?.hostUri, 'manifest2.expoClient.hostUri');
  push(c?.manifest2?.extra?.expoClient?.debuggerHost, 'manifest2.expoClient.debuggerHost');
  push(c?.manifest?.debuggerHost, 'manifest.debuggerHost');
  push(c?.manifest?.hostUri, 'manifest.hostUri');

  if (c?.linkingUri) {
    try {
      const m = c.linkingUri.match(/exps?:\/\/([^/]+)/i);
      if (m?.[1]) push(m[1], 'linkingUri');
    } catch { /* ignore */ }
  }
  if (c?.experienceUrl) {
    try {
      const m = c.experienceUrl.match(/exps?:\/\/([^/]+)/i);
      if (m?.[1]) push(m[1], 'experienceUrl');
    } catch { /* ignore */ }
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const { hostname, port, host } = window.location;
      if (!isLoopback(hostname)) {
        push(host || `${hostname}${port ? `:${port}` : ''}`, 'window.location');
      }
    } catch { /* ignore */ }
  }

  // Stable sort: private LAN IPs first, then other IPs, then hostnames
  return out
    .map((c, i) => ({ c, i, s: hostScore(c.host) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.c);
}

function toExpoGoUrl(hostPort: string): string {
  const cleaned = hostPort.replace(/\/$/, '');
  const host = cleaned.split('/')[0] ?? cleaned;
  return `exp://${host}/--${PREVIEW_PATH}`;
}

/**
 * Build initial preview URL from static sources.
 */
export function getLivePreviewUrl(): LivePreviewUrlInfo {
  const webPath = PREVIEW_PATH;
  const candidates = collectHostCandidates();
  const best = candidates[0];

  if (best) {
    const url = toExpoGoUrl(best.host);
    return {
      url, webPath,
      hostLabel: best.host,
      scheme: 'exp',
      isLanReachable: true,
      source: best.source,
      hint: 'Same Wi‑Fi as this machine · open with Expo Go',
    };
  }

  let fallback = Linking.createURL(PREVIEW_PATH);
  const loopbackHost =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.hostname}${window.location.port ? `:${window.location.port}` : ':8081'}`
      : 'localhost:8081';

  if (fallback.includes('localhost') || fallback.includes('127.0.0.1')) {
    fallback = toExpoGoUrl(loopbackHost);
  }

  return {
    url: fallback,
    webPath,
    hostLabel: loopbackHost,
    scheme: fallback.split(':')[0] ?? 'exp',
    isLanReachable: false,
    source: 'loopback',
    hint:
      'QR points at localhost — a phone cannot reach it. Run `npm run agentos` so Kairo can detect your LAN IP, or set EXPO_PUBLIC_DEV_SERVER_HOST=YOUR_LAN_IP:8081 and restart Expo.',
  };
}

/**
 * Async version that also queries the agentOS server for the LAN IP.
 * Use this to get a better QR URL when the static sources only know localhost.
 */
export async function resolveLivePreviewUrl(): Promise<LivePreviewUrlInfo> {
  // Try static sources first
  const staticInfo = getLivePreviewUrl();
  if (staticInfo.isLanReachable) return staticInfo;

  // Fallback: ask the agentOS server for our LAN IP
  try {
    const { getLanIp } = await import('../agentos/client');
    const lanIp = await getLanIp();
    if (lanIp) {
      const port = staticInfo.hostLabel.split(':')[1] ?? '8081';
      const hostPort = `${lanIp}:${port}`;
      const url = toExpoGoUrl(hostPort);
      return {
        url, webPath: PREVIEW_PATH,
        hostLabel: hostPort,
        scheme: 'exp',
        isLanReachable: true,
        source: 'agentos-lan-ip',
        hint: 'Detected LAN IP from server. Same Wi‑Fi required.',
      };
    }
  } catch { /* agentOS server may be down */ }

  return staticInfo;
}

