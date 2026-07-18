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
    h === '[::1]'
  );
}

function stripProtocol(hostOrUrl: string): string {
  return hostOrUrl
    .replace(/^https?:\/\//i, '')
    .replace(/^exps?:\/\//i, '')
    .replace(/\/$/, '');
}

/** host:port without path */
function normalizeHostPort(raw: string): string | null {
  if (!raw?.trim()) return null;
  let s = stripProtocol(raw.trim());
  // drop path/query
  s = s.split('/')[0] ?? s;
  s = s.split('?')[0] ?? s;
  if (!s || isLoopback(s)) return null;
  return s;
}

/**
 * Collect candidate packager hosts from Expo runtime + browser.
 * Prefer non-loopback LAN / tunnel hosts so Expo Go on a phone can connect.
 */
function collectHostCandidates(): Array<{ host: string; source: string }> {
  const out: Array<{ host: string; source: string }> = [];
  const push = (raw: string | null | undefined, source: string) => {
    if (!raw) return;
    const host = normalizeHostPort(raw);
    if (!host) return;
    if (out.some((c) => c.host === host)) return;
    out.push({ host, source });
  };

  // Explicit override for demos / corporate networks
  push(process.env.EXPO_PUBLIC_DEV_SERVER_HOST, 'EXPO_PUBLIC_DEV_SERVER_HOST');

  const c = Constants as {
    expoConfig?: { hostUri?: string } | null;
    expoGoConfig?: { debuggerHost?: string } | null;
    linkingUri?: string;
    experienceUrl?: string;
    manifest2?: {
      extra?: {
        expoClient?: { hostUri?: string; debuggerHost?: string };
        expoGo?: { debuggerHost?: string };
      };
    } | null;
    manifest?: {
      debuggerHost?: string;
      hostUri?: string;
    } | null;
  };

  push(c.expoConfig?.hostUri, 'expoConfig.hostUri');
  push(c.expoGoConfig?.debuggerHost, 'expoGoConfig.debuggerHost');
  push(c.manifest2?.extra?.expoGo?.debuggerHost, 'manifest2.expoGo');
  push(c.manifest2?.extra?.expoClient?.hostUri, 'manifest2.expoClient.hostUri');
  push(
    c.manifest2?.extra?.expoClient?.debuggerHost,
    'manifest2.expoClient.debuggerHost'
  );
  push(c.manifest?.debuggerHost, 'manifest.debuggerHost');
  push(c.manifest?.hostUri, 'manifest.hostUri');

  // linkingUri often: exp://192.168.x.x:8081/--/ or exp://localhost:8081
  if (c.linkingUri) {
    try {
      const m = c.linkingUri.match(/exps?:\/\/([^/]+)/i);
      if (m?.[1]) push(m[1], 'linkingUri');
    } catch {
      /* ignore */
    }
  }
  if (c.experienceUrl) {
    try {
      const m = c.experienceUrl.match(/exps?:\/\/([^/]+)/i);
      if (m?.[1]) push(m[1], 'experienceUrl');
    } catch {
      /* ignore */
    }
  }

  // Browser: if the page itself is opened via LAN IP / hostname, use that
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const { hostname, port, host } = window.location;
      if (!isLoopback(hostname)) {
        // Metro web often on 8081; if page has a port use it
        push(host || `${hostname}${port ? `:${port}` : ''}`, 'window.location');
      }
    } catch {
      /* ignore */
    }
  }

  return out;
}

/**
 * Build an Expo Go deep link into the /preview route.
 * Format: exp://HOST:PORT/--/preview
 * (Expo Router path after /--/)
 */
function toExpoGoUrl(hostPort: string): string {
  const cleaned = hostPort.replace(/\/$/, '');
  // Tunnel hosts sometimes already include path-like segments — keep host:port only
  const host = cleaned.split('/')[0] ?? cleaned;
  return `exp://${host}/--${PREVIEW_PATH}`;
}

/**
 * URL for scanning with Expo Go / sharing to a phone.
 * Never encodes localhost when a LAN or tunnel host is available.
 */
export function getLivePreviewUrl(): LivePreviewUrlInfo {
  const webPath = PREVIEW_PATH;
  const candidates = collectHostCandidates();
  const best = candidates[0];

  if (best) {
    const url = toExpoGoUrl(best.host);
    return {
      url,
      webPath,
      hostLabel: best.host,
      scheme: 'exp',
      isLanReachable: true,
      source: best.source,
      hint: 'Same Wi‑Fi as this machine · open with Expo Go',
    };
  }

  // Fallbacks when only loopback is known
  let fallback = Linking.createURL(PREVIEW_PATH);
  // createURL on web often yields exp://localhost:8081/--/preview — still not scannable
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
      'This host is not reachable from a phone. Start Expo with LAN or tunnel, or set EXPO_PUBLIC_DEV_SERVER_HOST=YOUR_LAN_IP:8081',
  };
}
