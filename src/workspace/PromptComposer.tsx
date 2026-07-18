import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PROMPT_LIBRARY } from '../prompts/library';
import { workspace, spacing, typography } from '../theme/tokens';
import { useWorkspace } from './WorkspaceContext';

/**
 * Product entry: user brief + curated examples.
 */
export function PromptComposer() {
  const {
    userPrompt,
    setUserPrompt,
    generate,
    isGenerating,
    useMockAi,
    phase,
  } = useWorkspace();
  const [local, setLocal] = useState(userPrompt);
  const busy = isGenerating || phase === 'planning';

  const apply = (prompt: string) => {
    setLocal(prompt);
    setUserPrompt(prompt);
  };

  const run = () => {
    const p = local.trim();
    if (!p) return;
    setUserPrompt(p);
    generate(p);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>NEW PROJECT</Text>
      <Text style={styles.title}>Describe the mobile app</Text>
      <Text style={styles.body}>
        Kairo plans navigation and screens from your brief, then runs specialized
        agents on a shared design system. Screens are not fixed — they follow
        the product you describe.
      </Text>

      <TextInput
        value={local}
        onChangeText={setLocal}
        placeholder="e.g. A focus timer with streaks, session history, and settings…"
        placeholderTextColor={workspace.textDim}
        multiline
        style={styles.input}
        editable={!busy}
      />

      <Text style={styles.libraryLabel}>Example briefs</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {PROMPT_LIBRARY.map((ex) => (
          <Pressable
            key={ex.id}
            onPress={() => apply(ex.prompt)}
            disabled={busy}
            style={({ pressed }) => [
              styles.chip,
              pressed && { opacity: 0.85 },
              local === ex.prompt && styles.chipOn,
            ]}
          >
            <Text style={styles.chipCat}>{ex.category}</Text>
            <Text style={styles.chipLabel}>{ex.label}</Text>
            <Text style={styles.chipBlurb} numberOfLines={2}>
              {ex.blurb}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        onPress={run}
        disabled={busy || !local.trim()}
        style={({ pressed }) => [
          styles.cta,
          {
            opacity: busy || !local.trim() ? 0.5 : pressed ? 0.88 : 1,
          },
        ]}
      >
        <Text style={styles.ctaLabel}>
          {busy ? 'Planning & building…' : 'Build app'}
        </Text>
      </Pressable>
      <Text style={styles.hint}>
        Inference: {useMockAi ? 'Mock planner' : 'Live model'} · drag canvas ·
        pan · pinch
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    maxWidth: 520,
    width: '100%',
    backgroundColor: workspace.panelElevated,
    borderWidth: 1,
    borderColor: workspace.border,
    padding: spacing[6],
  },
  eyebrow: {
    color: workspace.accent,
    fontSize: 10,
    fontFamily: workspace.mono,
    letterSpacing: 1.6,
    fontWeight: typography.weight.bold,
    marginBottom: spacing[2],
  },
  title: {
    color: workspace.text,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.4,
    marginBottom: spacing[2],
  },
  body: {
    color: workspace.textMuted,
    fontSize: typography.size.sm,
    lineHeight: 20,
    marginBottom: spacing[4],
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: workspace.border,
    backgroundColor: workspace.bg,
    color: workspace.text,
    padding: spacing[3],
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
    marginBottom: spacing[4],
  },
  libraryLabel: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
    letterSpacing: 1,
    fontWeight: typography.weight.bold,
    marginBottom: spacing[2],
  },
  chips: {
    gap: 10,
    paddingBottom: spacing[4],
  },
  chip: {
    width: 160,
    borderWidth: 1,
    borderColor: workspace.border,
    backgroundColor: workspace.panel,
    padding: spacing[3],
    marginRight: 10,
  },
  chipOn: {
    borderColor: workspace.accent,
    backgroundColor: workspace.accentSoft,
  },
  chipCat: {
    color: workspace.accent,
    fontSize: 9,
    fontFamily: workspace.mono,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  chipLabel: {
    color: workspace.text,
    fontSize: 14,
    fontWeight: typography.weight.semibold,
    marginBottom: 4,
  },
  chipBlurb: {
    color: workspace.textDim,
    fontSize: 11,
    lineHeight: 15,
  },
  cta: {
    backgroundColor: workspace.accent,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaLabel: {
    color: workspace.bg,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.md,
  },
  hint: {
    marginTop: spacing[3],
    color: workspace.textDim,
    fontSize: 11,
    textAlign: 'center',
    fontFamily: workspace.mono,
  },
});
