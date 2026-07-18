import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ScreenSpec, ScreenSection, ScreenSectionItem } from '../agents/types';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing, typography } from '../theme/tokens';

function pickColor(index: number): string {
  const palette = ['#3DDC97', '#B8A1FF', '#FFB86B', '#7EC8FF', '#FF8FAB', '#6CD4A0', '#F9A8D4', '#93C5FD'];
  return palette[index % palette.length];
}

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
            colors={colors}
            isDark={isDark}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function SectionBlock({
  section,
  index,
  colors,
  isDark,
}: {
  section: ScreenSection;
  index: number;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  const items = section.items ?? [];
  const accent = section.color || pickColor(index);

  if (section.type === 'hero') {
    return (
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: isDark
              ? (accent + '30') as any
              : (accent + '18') as any,
            borderLeftColor: accent,
          },
        ]}
      >
        {section.kicker ? (
          <Text style={[styles.heroKicker, { color: accent }]}>
            {section.kicker.toUpperCase()}
          </Text>
        ) : null}
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          {section.title ?? 'Welcome'}
        </Text>
        {section.description ? (
          <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
            {section.description}
          </Text>
        ) : null}
        {items[0]?.subtitle ? (
          <Text style={[styles.heroMeta, { color: colors.textTertiary }]}>
            {items[0].icon ? `${items[0].icon} ` : ''}{items[0].subtitle}
          </Text>
        ) : null}
        {section.cta ? (
          <View style={[styles.heroCta, { backgroundColor: accent }]}>
            <Text style={styles.heroCtaText}>{section.cta}</Text>
          </View>
        ) : null}
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
                  borderTopColor: it.color || accent,
                  borderTopWidth: 2,
                },
              ]}
            >
              <Text style={[styles.statVal, { color: colors.text }]}>
                {it.icon ? `${it.icon} ` : ''}{it.value || it.title}
              </Text>
              {it.subtitle ? (
                <Text style={[styles.statSub, { color: colors.textTertiary }]}>
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
          const cardAccent = it.color || pickColor(i);
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
                  { backgroundColor: isDark ? (cardAccent + '30') as any : (cardAccent + '18') as any },
                ]}
              >
                <Text style={[styles.mediaThumbText, { color: cardAccent }]}>
                  {it.icon || it.title.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.mediaBody}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>
                  {it.title}
                </Text>
                {it.subtitle ? (
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                    {it.subtitle}
                  </Text>
                ) : null}
                {it.badge ? (
                  <View style={[styles.pill, { backgroundColor: (cardAccent + '20') as any, alignSelf: 'flex-start', marginTop: 4 }]}>
                    <Text style={[styles.pillText, { color: cardAccent }]}>
                      {it.badge}
                    </Text>
                  </View>
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
            const rowAccent = it.color || accent;
            const done = /done|stock|complete|ready/i.test(it.subtitle ?? '');
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
                {it.icon ? (
                  <Text style={{ fontSize: 20, width: 28, textAlign: 'center' }}>
                    {it.icon}
                  </Text>
                ) : (section.type === 'list' && (done || need)) ? (
                  <View
                    style={[
                      styles.check,
                      {
                        borderColor: done ? rowAccent : colors.borderStrong,
                        backgroundColor: done ? rowAccent : 'transparent',
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
                    <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                      {it.subtitle}
                    </Text>
                  ) : null}
                </View>
                {it.badge ? (
                  <View style={[styles.pill, { backgroundColor: (rowAccent + '20') as any }]}>
                    <Text style={[styles.pillText, { color: rowAccent }]}>
                      {it.badge}
                    </Text>
                  </View>
                ) : null}
                {!it.badge ? (
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textTertiary}
                  />
                ) : null}
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
        {items.map((it, i) => (
          <Pressable
            key={it.title}
            style={[
              styles.primaryBtn,
              { backgroundColor: it.color || accent },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {it.icon ? `${it.icon} ` : ''}{it.title}
            </Text>
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
    borderLeftWidth: 3,
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
    marginBottom: 6,
  },
  heroMeta: {
    fontSize: 12,
    marginBottom: 8,
  },
  heroCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 980,
  },
  heroCtaText: {
    color: '#FFFFFF',
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
    fontSize: 18,
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
