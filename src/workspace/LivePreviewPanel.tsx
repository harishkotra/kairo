import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { workspace, spacing, typography } from '../theme/tokens';
import { useWorkspace } from './WorkspaceContext';
import { getLivePreviewUrl, type LivePreviewUrlInfo } from './previewUrl';

/**
 * QR + deep link for Expo Go once the primary screen ships.
 * QR always targets exp://LAN-or-tunnel (never localhost when avoidable).
 */
export function LivePreviewPanel({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const { phase, previewReady, agents, agentOrder, appPlan } = useWorkspace();

  const screenAgents = agentOrder.filter((id) => id.startsWith('screen:'));
  const stillBuilding =
    phase === 'running' &&
    screenAgents.some((id) => agents[id]?.status !== 'complete');

  const [info, setInfo] = useState<LivePreviewUrlInfo>(() =>
    getLivePreviewUrl()
  );

  // Re-resolve host (Constants may populate after mount on web)
  useEffect(() => {
    setInfo(getLivePreviewUrl());
    const t = setInterval(() => {
      setInfo(getLivePreviewUrl());
    }, 2000);
    return () => clearInterval(t);
  }, []);

  if (!previewReady) return null;

  const { url, webPath, hostLabel, isLanReachable, hint } = info;

  const openPreview = () => {
    router.push(webPath as '/preview');
  };

  const shareUrl = async () => {
    try {
      if (
        Platform.OS === 'web' &&
        typeof navigator !== 'undefined' &&
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(url);
        return;
      }
      await Share.share({ message: url, url });
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.panel, compact && styles.panelCompact]}>
      <View style={styles.top}>
        <View style={styles.livePill}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: stillBuilding
                  ? workspace.accentHot
                  : workspace.success,
              },
            ]}
          />
          <Text style={styles.liveText}>
            {stillBuilding ? 'EVOLVING' : 'LIVE'}
          </Text>
        </View>
        <Text style={styles.title}>Expo Go preview</Text>
        <Text style={styles.body}>
          Scan with Expo Go on a phone
          {stillBuilding
            ? ' while remaining screens keep building.'
            : ' — same Wi‑Fi (or tunnel) as this machine.'}
        </Text>
      </View>

      <View style={styles.qrWrap}>
        <View
          style={[
            styles.qrInner,
            !isLanReachable && styles.qrWarn,
          ]}
        >
          <QRCode
            value={url}
            size={compact ? 100 : 132}
            backgroundColor="#F4F6FA"
            color="#0A101C"
          />
        </View>
      </View>

      <Text style={styles.url} numberOfLines={3} selectable>
        {url}
      </Text>
      <Text
        style={[
          styles.host,
          !isLanReachable && { color: workspace.danger },
        ]}
      >
        {isLanReachable ? 'Expo Go · ' : 'Not phone-reachable · '}
        {hostLabel}
      </Text>
      {hint ? (
        <Text style={styles.hint} numberOfLines={compact ? 3 : 4}>
          {hint}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={openPreview} style={styles.primary}>
          <Ionicons
            name="phone-portrait-outline"
            size={15}
            color={workspace.bg}
          />
          <Text style={styles.primaryLabel}>Open here</Text>
        </Pressable>
        <Pressable onPress={shareUrl} style={styles.secondary}>
          <Ionicons
            name={Platform.OS === 'web' ? 'copy-outline' : 'share-outline'}
            size={15}
            color={workspace.accentCool}
          />
          <Text style={styles.secondaryLabel}>
            {Platform.OS === 'web' ? 'Copy link' : 'Share'}
          </Text>
        </Pressable>
      </View>

      {(stillBuilding || appPlan) && (
        <View style={styles.progressRow}>
          {(appPlan?.screens ?? []).slice(0, 4).map((s) => {
            const id = `screen:${s.id}`;
            return (
              <AgentDot
                key={s.id}
                label={s.title}
                done={agents[id]?.status === 'complete'}
                active={agents[id]?.status === 'running'}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

function AgentDot({
  label,
  done,
  active,
}: {
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <View style={styles.agentDot}>
      <View
        style={[
          styles.miniDot,
          {
            backgroundColor: done
              ? workspace.success
              : active
                ? workspace.accentHot
                : workspace.textDim,
          },
        ]}
      />
      <Text style={styles.agentDotLabel}>{label}</Text>
    </View>
  );
}

export function LivePreviewFab() {
  const { previewReady, phase } = useWorkspace();
  if (!previewReady || phase === 'idle') return null;

  return (
    <View style={styles.fab}>
      <LivePreviewPanel compact />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: workspace.border,
    backgroundColor: workspace.panelElevated,
    padding: spacing[4],
  },
  panelCompact: {
    padding: spacing[3],
    maxWidth: 300,
  },
  top: { marginBottom: spacing[3] },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: workspace.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  dot: { width: 6, height: 6 },
  liveText: {
    color: workspace.accentHot,
    fontSize: 10,
    fontFamily: workspace.mono,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
  },
  title: {
    color: workspace.text,
    fontSize: 15,
    fontWeight: typography.weight.semibold,
  },
  body: {
    color: workspace.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  qrWrap: {
    alignItems: 'center',
    marginVertical: spacing[3],
  },
  qrInner: {
    padding: 10,
    backgroundColor: '#F4F6FA',
  },
  qrWarn: {
    borderWidth: 1,
    borderColor: workspace.danger + '66',
  },
  url: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
    textAlign: 'center',
  },
  host: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
    textAlign: 'center',
    marginTop: 4,
  },
  hint: {
    color: workspace.amber,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: spacing[2],
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing[2],
  },
  primary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: workspace.accent,
    paddingVertical: 10,
  },
  primaryLabel: {
    color: workspace.bg,
    fontWeight: typography.weight.bold,
    fontSize: 12,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: workspace.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryLabel: {
    color: workspace.accentCool,
    fontSize: 12,
    fontWeight: typography.weight.semibold,
  },
  progressRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: workspace.border,
  },
  agentDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  miniDot: { width: 6, height: 6 },
  agentDotLabel: {
    color: workspace.textMuted,
    fontSize: 10,
    fontFamily: workspace.mono,
  },
  fab: {
    position: 'absolute',
    right: spacing[3],
    top: spacing[3],
    zIndex: 30,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
});
