import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ScreenSpec, ScreenSection } from '../agents/types';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, typography } from '../theme/tokens';

/**
 * Product-quality mobile screen renderer for device frames.
 * Designed to read like a real app mock (Figma / FlutterFlow style).
 */
export function DynamicScreen({
  spec,
  projectName,
}: {
  spec: ScreenSpec;
  projectName?: string;
}) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* iOS status bar chrome */}
      <View style={[styles.statusBar, { backgroundColor: colors.background }]}>
        <Text style={[styles.statusTime, { color: colors.text }]}>9:41</Text>
        <View style={styles.statusIcons}>
          <Ionicons name="wifi" size={13} color={colors.text} />
          <Ionicons name="battery-half" size={15} color={colors.text} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.largeTitle, { color: colors.text }]}>
              {spec.title}
            </Text>
            {spec.role ? (
              <Text
                style={[styles.navSub, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {spec.role}
              </Text>
            ) : null}
          </View>
          <View
            style={[
              styles.avatarBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.05)',
              },
            ]}
          >
            <Ionicons
              name={
                (spec.icon as keyof typeof Ionicons.glyphMap) || 'person-circle'
              }
              size={22}
              color={colors.primary}
            />
          </View>
        </View>

        {spec.sections.map((section, i) => (
          <SectionBlock
            key={`${section.type}-${i}`}
            section={section}
            index={i}
            accent={colors.primary}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const CARD_TONES = [
  ['#1A3A2F', '#3DDC97'],
  ['#2A2440', '#B8A1FF'],
  ['#3A2418', '#FFB86B'],
  ['#1A2A3A', '#7EC8FF'],
  ['#3A1A28', '#FF8FAB'],
];

function SectionBlock({
  section,
  index,
  accent,
}: {
  section: ScreenSection;
  index: number;
  accent: string;
}) {
  const { colors, isDark } = useTheme();
  const items = section.items ?? [];

  if (section.type === 'hero') {
    const tone = CARD_TONES[index % CARD_TONES.length];
    return (
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: isDark ? tone[0] : colors.primaryMuted,
          },
        ]}
      >
        <Text
          style={[
            styles.heroKicker,
            { color: isDark ? tone[1] : colors.primary },
          ]}
        >
          FEATURED
        </Text>
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          {section.title ?? 'Welcome'}
        </Text>
        <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
          {items[0]?.subtitle ||
            items[0]?.title ||
            'Start here — tailored to your product brief.'}
        </Text>
        <View
          style={[
            styles.heroCta,
            { backgroundColor: isDark ? tone[1] : colors.primary },
          ]}
        >
          <Text
            style={[
              styles.heroCtaText,
              { color: isDark ? '#0A0A0C' : '#FFFFFF' },
            ]}
          >
            Continue
          </Text>
        </View>
      </View>
    );
  }

  if (section.type === 'stats') {
    return (
      <View style={styles.section}>
        {section.title ? (
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {section.title}
          </Text>
        ) : null}
        <View style={styles.statsRow}>
          {items.map((it) => (
            <View
              key={it.title}
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.statVal, { color: colors.text }]}>
                {it.title}
              </Text>
              {it.subtitle ? (
                <Text
                  style={[styles.statSub, { color: colors.textTertiary }]}
                >
                  {it.subtitle}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (section.type === 'cards') {
    return (
      <View style={styles.section}>
        {section.title ? (
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {section.title}
          </Text>
        ) : null}
        {items.map((it, i) => {
          const tone = CARD_TONES[i % CARD_TONES.length];
          return (
            <View
              key={it.title}
              style={[
                styles.mediaCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.mediaThumb,
                  { backgroundColor: isDark ? tone[0] : colors.primaryMuted },
                ]}
              >
                <Text
                  style={[
                    styles.mediaThumbText,
                    { color: isDark ? tone[1] : colors.primary },
                  ]}
                >
                  {it.title.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.mediaBody}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>
                  {it.title}
                </Text>
                {it.subtitle ? (
                  <Text
                    style={[styles.itemSub, { color: colors.textSecondary }]}
                  >
                    {it.subtitle}
                  </Text>
                ) : null}
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textTertiary}
              />
            </View>
          );
        })}
      </View>
    );
  }

  if (section.type === 'list' || section.type === 'form') {
    // Avoid repeating the screen title as a section header
    const showLabel =
      section.title &&
      section.title.length > 0 &&
      section.title.toLowerCase() !== 'preferences';
    return (
      <View style={styles.section}>
        {showLabel ? (
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {section.title}
          </Text>
        ) : null}
        <View
          style={[
            styles.listGroup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {items.map((it, i) => {
            const done =
              /done|stock|complete|ready/i.test(it.subtitle ?? '') ||
              /done/i.test(it.title);
            const need = /need|open|skip/i.test(it.subtitle ?? '');
            return (
              <View
                key={`${it.title}-${i}`}
                style={[
                  styles.listRow,
                  i < items.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                {section.type === 'list' &&
                (done || need || /step/i.test(it.title)) ? (
                  <View
                    style={[
                      styles.check,
                      {
                        borderColor: done ? accent : colors.borderStrong,
                        backgroundColor: done ? accent : 'transparent',
                      },
                    ]}
                  >
                    {done ? (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    ) : (
                      <Text style={[styles.stepNum, { color: colors.textTertiary }]}>
                        {String(i + 1)}
                      </Text>
                    )}
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>
                    {it.title}
                  </Text>
                  {it.subtitle ? (
                    <Text
                      style={[styles.itemSub, { color: colors.textSecondary }]}
                    >
                      {it.subtitle}
                    </Text>
                  ) : null}
                </View>
                {it.badge ? (
                  <View
                    style={[
                      styles.pill,
                      { backgroundColor: colors.primaryMuted },
                    ]}
                  >
                    <Text style={[styles.pillText, { color: colors.primary }]}>
                      {it.badge}
                    </Text>
                  </View>
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textTertiary}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  if (section.type === 'actions') {
    return (
      <View style={styles.section}>
        {items.map((it) => (
          <Pressable
            key={it.title}
            style={[styles.primaryBtn, { backgroundColor: accent }]}
          >
            <Text style={styles.primaryBtnText}>{it.title}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  statusBar: {
    height: 44,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  statusTime: {
    fontSize: 14,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.2,
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 36,
    gap: 18,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  largeTitle: {
    fontSize: 28,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.6,
  },
  navSub: {
    fontSize: 13,
    marginTop: 2,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.1,
    marginLeft: 2,
  },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    minHeight: 150,
    justifyContent: 'flex-end',
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.4,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 14,
  },
  heroCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 980,
  },
  heroCtaText: {
    fontSize: 14,
    fontWeight: typography.weight.bold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  statVal: {
    fontSize: 20,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.3,
  },
  statSub: {
    fontSize: 12,
    marginTop: 4,
  },
  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    paddingRight: 12,
  },
  mediaThumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaThumbText: {
    fontSize: 15,
    fontWeight: typography.weight.bold,
  },
  mediaBody: { flex: 1 },
  listGroup: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.2,
  },
  itemSub: {
    fontSize: 13,
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: typography.weight.bold,
  },
});
