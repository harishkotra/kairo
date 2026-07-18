import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';

const C = {
  bg: '#1A1A1E',
  panel: '#222228',
  panelElevated: '#2A2A32',
  border: '#3A3A44',
  text: '#F2F2F4',
  textMuted: '#9B9BA8',
  textDim: '#6B6B78',
  accent: '#0A84FF',
  accentHot: '#64D2FF',
  signal: '#D4A574',
  success: '#30D158',
  danger: '#FF453A',
  amber: '#FFD60A',
  violet: '#BF5AF2',
  mint: '#5EEAD4',
  coral: '#FF6961',
  dotMin: 'rgba(255,255,255,0.035)',
  dotMaj: 'rgba(255,255,255,0.06)',
};

const FONT_MONO = Platform.select({
  web: "'SF Mono','Fira Code','Cascadia Code',Menlo,Consolas,monospace",
  default: 'monospace',
}) as string;

function DotGrid() {
  return (
    <View
      style={styles.dotGrid}
      pointerEvents="none"
    />
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});

  const markSection = (id: string) =>
    (e: { nativeEvent: { layout: { y: number } } }) => {
      sectionY.current[id] = e.nativeEvent.layout.y;
    };
  const scrollToSection = (id: string) => {
    const y = sectionY.current[id];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 70), animated: true });
  };

  const heroFade2 = useRef(new Animated.Value(0)).current;
  const heroFade3 = useRef(new Animated.Value(0)).current;
  const heroFade4 = useRef(new Animated.Value(0)).current;
  const scrollInd = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(heroFade2, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(heroFade3, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(heroFade4, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(scrollInd, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <DotGrid />

      <View style={styles.nav}>
        <View style={styles.navLogo}>
          <Text style={styles.navLogoIcon}>⎔</Text>
          <Text style={styles.navLogoText}>Kairo<Text style={styles.navLogoAcc}>.</Text></Text>
        </View>
        <View style={styles.navLinks}>
          <Text style={styles.navLink} onPress={() => scrollToSection('features')}>Features</Text>
          <Text style={styles.navLink} onPress={() => scrollToSection('pipeline')}>Pipeline</Text>
          <Text style={styles.navLink} onPress={() => scrollToSection('surfaces')}>Observability</Text>
          <Text style={styles.navLink} onPress={() => scrollToSection('integrations')}>Integrations</Text>
          <Link href="/workspace" asChild>
            <Pressable style={styles.navCta}>
              <Text style={styles.navCtaText}>Get Started</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={({ nativeEvent: { contentOffset } }) => setScrolled(contentOffset.y)}
      >
        {/* ─── Hero ─── */}
        <View style={styles.hero}>
          <Animated.Text style={[styles.heroTitle, { opacity: heroFade2, transform: [{ translateY: heroFade2.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
            Observability for{'\n'}
            <Text style={styles.heroSignal}>multi-agent</Text> mobile{'\n'}
            <Text style={styles.heroAccent}>software engineering</Text>
          </Animated.Text>

          <Animated.Text style={[styles.heroSub, { opacity: heroFade3, transform: [{ translateY: heroFade3.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
            A collaborative workspace where <Text style={styles.heroSubStrong}>specialized AI agents</Text> design and ship an
            Expo mobile app from a product brief, and <Text style={styles.heroSubStrong}>every step stays inspectable</Text>:
            agents, events, artifacts, decisions, memory, metrics, live previews, and backend traces.
          </Animated.Text>

          <Animated.View style={[styles.heroActions, { opacity: heroFade4, transform: [{ translateY: heroFade4.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
            <Link href="/workspace" asChild>
              <Pressable style={styles.btnPrimary}>
                <Text style={styles.btnPrimaryText}>⎇ Get Started</Text>
              </Pressable>
            </Link>
            <Pressable style={styles.btnSecondary} onPress={() => Linking.openURL('https://github.com/harishkotra/kairo')}>
              <Text style={styles.btnSecondaryText}>⟨⟩ GitHub</Text>
            </Pressable>
          </Animated.View>



          <Animated.View style={[styles.scrollIndicator, { opacity: scrollInd }]}>
            <Text style={styles.scrollIndText}>Scroll</Text>
            <View style={styles.scrollIndLine} />
          </Animated.View>
        </View>

        {/* ─── Features ─── */}
        <View style={styles.section} onLayout={markSection('features')}>
          <SectionLabel text="Capabilities" />
          <SectionTitle text="Workspace as control surface" />
          <SectionDesc>
            Kairo is the <SectionStrong>instrument bay</SectionStrong> for your agent pipeline. Every dial, trace, and decision surfaces in real time.
          </SectionDesc>
          <View style={styles.featureGrid}>
            {[
              { icon: '⎈', color: C.accentHot, title: 'Product Entry', desc: 'Free-text brief or curated example library. The planner returns navigation plus 2 to 5 domain-specific screens, not a generic shell.' },
              { icon: '◈', color: C.violet, title: 'Multi-Agent Pipeline', desc: 'Architecture, design system, primary screen, then parallel screens. Each agent runs in isolation with its own workspace.' },
              { icon: '⌗', color: C.success, title: 'Observability Surfaces', desc: 'Canvas, DAG, timeline, artifacts, decisions, memory, metrics, replay, and preview. Every surface exposes agent internals.' },
              { icon: '⌘', color: C.accentHot, title: 'Time-Travel Replay', desc: 'Scrub the full event log of the last run. Watch agents think, decide, and generate in sequence or in parallel.' },
              { icon: '◉', color: C.signal, title: 'Live Preview + QR', desc: 'A phone-ready QR appears the moment the primary screen ships. Live tabs update as parallel agents complete.' },
              { icon: '⊞', color: C.accent, title: 'Laminar Telemetry', desc: 'Full OTLP export to Laminar: pipeline spans, agent traces, LLM calls. Kairo stays the UI, Laminar stores the history.' },
              { icon: '⊡', color: C.mint, title: 'agentOS VMs', desc: 'Optional per-agent VM workspaces via a local bridge. Files and outputs stay isolated to each agent.' },
              { icon: '⌾', color: C.coral, title: 'Shared Design System', desc: 'Dual-theme tokens and primitives composed into screens. Every agent contributes to a shared artifact graph.' },
            ].map((f, i) => (
              <FeatureCard key={i} icon={f.icon} color={f.color} title={f.title} desc={f.desc} delay={i * 100} scrolled={scrolled} base={i * 80 + 500} />
            ))}
          </View>
        </View>

        {/* ─── Pipeline ─── */}
        <View style={styles.section} onLayout={markSection('pipeline')}>
          <SectionLabel text="Pipeline" />
          <SectionTitle text="Agent orchestration" />
          <SectionDesc>A <SectionStrong>sequential DAG</SectionStrong> that builds state. Each agent receives the outputs of its predecessors and produces the next layer.</SectionDesc>
          <View style={styles.pipelineContainer}>
            <PipelineStep icon="⎈" color={C.accentHot} num="STEP 01" title="Architecture" desc="Routes and navigation from the brief. Chooses stack, tabs, or drawer." />
            <PipelineStep icon="◈" color={C.violet} num="STEP 02" title="Design System" desc="Dual-theme tokens and shared primitives used by every screen." />
            <PipelineStep icon="⌗" color={C.success} num="STEP 03" title="Primary Screen" desc="The first screen unlocks the live preview and QR for real device validation." />
            <PipelineStep icon="⌗" color={C.amber} num="STEP 04" title="Parallel Screens" desc="Remaining screens built concurrently on the same theme and tokens." />
          </View>
        </View>

        {/* ─── Surfaces ─── */}
        <View style={styles.section} onLayout={markSection('surfaces')}>
          <SectionLabel text="Observability" />
          <SectionTitle text="Every surface exposed" />
          <SectionDesc>Nine surfaces that turn the agent pipeline from a <SectionStrong>black box</SectionStrong> into a <SectionStrong>glass cockpit</SectionStrong>.</SectionDesc>
          <View style={styles.surfaceGrid}>
            {[
              { icon: '⊞', color: C.accentHot, title: 'Canvas', desc: 'Figma-like board with agent cards, device frames, dot grid' },
              { icon: '◈', color: C.violet, title: 'DAG', desc: 'Execution dependency graph with live status colors' },
              { icon: '⌗', color: C.success, title: 'Timeline', desc: 'Full event trace with type filters' },
              { icon: '⌘', color: C.amber, title: 'Artifacts', desc: 'File/component reuse graph + inspector' },
              { icon: '◉', color: C.signal, title: 'Decisions', desc: 'Choices, alternatives, confidence scores' },
              { icon: '⎇', color: C.accent, title: 'Memory', desc: 'Shared + per-agent memory (mem0 optional)' },
              { icon: '⊡', color: C.mint, title: 'Metrics', desc: 'Parallelism, critical path, reuse, cost, a11y' },
              { icon: '⌾', color: C.coral, title: 'Replay', desc: 'Time-travel scrub across the last run' },
              { icon: '◉', color: C.success, title: 'Preview + QR', desc: 'Phone preview link plus in-app live tabs' },
            ].map((s, i) => (
              <SurfaceItem key={i} icon={s.icon} color={s.color} title={s.title} desc={s.desc} />
            ))}
          </View>
        </View>

        {/* ─── Architecture ─── */}
        <View style={styles.section}>
          <SectionLabel text="Architecture" />
          <SectionTitle text="How it works" />
          <SectionDesc>A <SectionStrong>dataflow pipeline</SectionStrong> from brief to shipping app, and every node is observable.</SectionDesc>
          <View style={styles.flow}>
            {[
              { n: '1', color: C.accentHot, title: 'Brief goes to the planner', tag: 'MOCK OR LIVE LLM', desc: 'Your product brief becomes an app plan: navigation, screens, and layout, ready for the agents to build against.' },
              { n: '2', color: C.violet, title: 'Architecture and design system', tag: null, desc: 'The architecture agent lays down routes and navigation. The design agent produces tokens, primitives, and colors shared by every screen.' },
              { n: '3', color: C.success, title: 'Primary screen unlocks the preview', tag: 'QR GOES LIVE', desc: 'As soon as the first screen ships, the QR appears. You watch the app on your phone while the remaining agents keep building.' },
              { n: '4', color: C.amber, title: 'Parallel screens', tag: null, desc: 'Remaining screens build concurrently on the shared theme, each agent isolated with its own workspace and trace.' },
              { n: '5', color: C.signal, title: 'Output', tag: 'EXPORT + TRACES', desc: 'Live preview, a standalone exported Expo project, and full telemetry spans in Laminar.' },
            ].map((step, i, arr) => (
              <View key={step.n} style={styles.flowStep}>
                <View style={styles.flowRail}>
                  <View style={[styles.flowDot, { borderColor: step.color + '66' }]}>
                    <Text style={[styles.flowDotText, { color: step.color }]}>{step.n}</Text>
                  </View>
                  {i < arr.length - 1 ? <View style={styles.flowLine} /> : null}
                </View>
                <View style={styles.flowBody}>
                  <View style={styles.flowTitleRow}>
                    <Text style={styles.flowTitle}>{step.title}</Text>
                    {step.tag ? (
                      <View style={[styles.flowTag, { backgroundColor: step.color + '1F' }]}>
                        <Text style={[styles.flowTagText, { color: step.color }]}>{step.tag}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.flowDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Integrations ─── */}
        <View style={styles.section} onLayout={markSection('integrations')}>
          <SectionLabel text="Integrations" />
          <SectionTitle text="Ecosystem" />
          <SectionDesc>Kairo composes with <SectionStrong>battle-tested tools</SectionStrong>, each one plugged in at the right layer.</SectionDesc>
          <View style={styles.integrationGrid}>
            <IntegrationCard logoUrl={LOGOS.laminar} title="Laminar" desc="Telemetry and observability backend. Pipeline spans, agent traces, and LLM call records via OTLP." badge="@lmnr-ai/lmnr" badgeColor={C.mint} />
            <IntegrationCard logoUrl={LOGOS.agentos} title="agentOS Bridge" desc="Local server providing per-agent VM workspaces. Falls back to simulation when offline." badge="agentos/" badgeColor={C.accentHot} />
            <IntegrationCard logoUrl={LOGOS.openai} title="OpenAI / OpenRouter" desc="Planner and inference via any chat-completions API. Model-agnostic with cost tracking." badge="Live AI" badgeColor={C.success} />
            <IntegrationCard logoUrl={LOGOS.mem0} title="mem0" desc="Optional shared agent memory. Agents persist and recall knowledge across runs." badge="Memory" badgeColor={C.signal} />
          </View>
        </View>

        {/* ─── Stack ─── */}
        <View style={styles.section}>
          <SectionLabel text="Technology" />
          <SectionTitle text="Stack" />
          <SectionDesc>Built on <SectionStrong>Expo SDK 57</SectionStrong> with React 19, React Native 0.86, and Reanimated 4.</SectionDesc>
          <View style={styles.stackGrid}>
            {[
              ['Expo SDK', '57'], ['Expo Router', '~57.0.7'], ['React', '19.2.3'],
              ['React Native', '0.86.0'], ['Reanimated', '4.5.0'], ['Gesture Handler', '~2.32.0'],
              ['react-native-svg', '15.15.4'], ['react-native-web', '0.21.2'],
              ['react-native-qrcode-svg', '^6.3.21'], ['expo-linear-gradient', '~57.0.1'],
              ['Ionicons', '^15.0.2'], ['TypeScript', '~5.9.2'],
            ].map(([name, ver], i) => (
              <View key={i} style={styles.stackItem}>
                <Text style={styles.stackName}>{name}</Text>
                <Text style={styles.stackVer}>{ver}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Quick Start ─── */}
        <View style={styles.section}>
          <SectionLabel text="Get Started" />
          <SectionTitle text="Ship in minutes" />
          <SectionDesc>Clone, install, and run. One command starts the workspace and the agentOS bridge together.</SectionDesc>
          <View style={styles.qsGrid}>
            <View style={styles.qsCard}>
              <Text style={styles.qsCardTitle}>Install and run</Text>
              {[
                'git clone https://github.com/harishkotra/kairo.git',
                'cd kairo',
                'npm install',
                'cp .env.example .env',
                'npm run agentos:install',
                'npm run dev',
              ].map((cmd) => (
                <View key={cmd} style={styles.qsCmd}>
                  <Text style={styles.qsCmdText} numberOfLines={1}>{cmd}</Text>
                </View>
              ))}
            </View>
            <View style={styles.qsCard}>
              <Text style={styles.qsCardTitle}>Then, in the workspace</Text>
              {[
                'Pick an example brief or write your own',
                'Press Build and watch agents on the canvas, DAG, and timeline',
                'When the primary screen ships, scan the QR on your phone',
                'Inspect decisions, artifacts, memory, and metrics',
                'Replay the run, then export the finished Expo project',
              ].map((step, i) => (
                <View key={step} style={styles.qsStepRow}>
                  <View style={styles.qsStepNum}>
                    <Text style={styles.qsStepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.qsStepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ─── Footer ─── */}
        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink} onPress={() => Linking.openURL('https://github.com/harishkotra/kairo')}>GitHub</Text>
            <Text style={styles.footerLink} onPress={() => Linking.openURL('https://docs.expo.dev/versions/v57.0.0/')}>Expo Docs</Text>
            <Text style={styles.footerLink} onPress={() => Linking.openURL('https://laminar.sh/docs')}>Laminar</Text>
            <Text style={styles.footerLink} onPress={() => Linking.openURL('https://agentos-sdk.dev/docs/')}>agentOS</Text>
          </View>
          <Text style={styles.footerAttribution}>Built by <Text style={styles.footerAttributionLink} onPress={() => Linking.openURL('https://harishkotra.me')}>Harish Kotra</Text> · <Text style={styles.footerAttributionLink} onPress={() => Linking.openURL('https://dailybuild.xyz')}>check out my other builds</Text></Text>
          <Text style={styles.footerMono}>Kairo · MIT License</Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Subcomponents ─── */

function SectionLabel({ text }: { text: string }) {
  return (
    <View style={s.sectionLabelRow}>
      <View style={s.sectionLabelLine} />
      <Text style={s.sectionLabel}>{text}</Text>
    </View>
  );
}
function SectionTitle({ text }: { text: string }) {
  return <Text style={s.sectionTitle}>{text}</Text>;
}
function SectionDesc({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionDesc}>{children}</Text>;
}
function SectionStrong({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionStrong}>{children}</Text>;
}

function FeatureCard({ icon, color, title, desc, scrolled, base, delay }: {
  icon: string; color: string; title: string; desc: string;
  scrolled: number; base: number; delay: number;
}) {
  const progress = Math.max(0, Math.min(1, (scrolled - base + 160) / 160));
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 600, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[s.featureCard, { opacity, transform: [{ translateY }], borderColor: C.border }]}>
      <View style={[s.featureIcon, { backgroundColor: `${color}1F` }]}>
        <Text style={[s.featureIconText, { color }]}>{icon}</Text>
      </View>
      <Text style={s.featureTitle}>{title}</Text>
      <Text style={s.featureDesc}>{desc}</Text>
    </Animated.View>
  );
}

function PipelineStep({ icon, color, num, title, desc }: {
  icon: string; color: string; num: string; title: string; desc: string;
}) {
  return (
    <View style={[s.pipelineStep, { borderTopColor: color, borderTopWidth: 2 }]}>
      <Text style={[s.pipelineIcon, { color }]}>{icon}</Text>
      <Text style={s.pipelineNum}>{num}</Text>
      <Text style={s.pipelineTitle}>{title}</Text>
      <Text style={s.pipelineDesc}>{desc}</Text>
    </View>
  );
}

function SurfaceItem({ icon, color, title, desc }: {
  icon: string; color: string; title: string; desc: string;
}) {
  return (
    <View style={s.surfaceItem}>
      <View style={[s.surfaceIconBox, { backgroundColor: `${color}1F` }]}>
        <Text style={[s.surfaceIcon, { color }]}>{icon}</Text>
      </View>
      <View style={s.surfaceInfo}>
        <Text style={s.surfaceTitle}>{title}</Text>
        <Text style={s.surfaceDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const LOGOS = {
  laminar: 'https://laminar.sh/_next/static/media/laminar-wordmark.1w75cuyeeet99.svg' as const,
  agentos: 'https://agentos-sdk.dev/images/agent-os/agentos-hero-logo.svg' as const,
  openai: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg' as const,
  mem0: 'https://mintcdn.com/mem0/jmnLaiutcXgYmrAY/logo/light.svg?fit=max&auto=format&n=jmnLaiutcXgYmrAY&q=85&s=262e6e63930c20446217323d7f850a7a' as const,
};

function IntegrationCard({ logoUrl, title, desc, badge, badgeColor }: {
  logoUrl: string; title: string; desc: string; badge: string; badgeColor: string;
}) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <View style={s.integrationCard}>
      <View style={s.integrationLogoWrap}>
        {!loaded ? <Text style={[s.integrationLogoFallback, { color: badgeColor }]}>{title[0]}</Text> : null}
        <Image
          source={{ uri: logoUrl }}
          style={[s.integrationLogoImg, { opacity: loaded ? 1 : 0 }]}
          resizeMode="contain"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      </View>
      <Text style={s.integrationTitle}>{title}</Text>
      <Text style={s.integrationDesc}>{desc}</Text>
      <View style={[s.integrationBadge, { backgroundColor: `${badgeColor}1A` }]}>
        <Text style={[s.integrationBadgeText, { color: badgeColor }]}>{badge}</Text>
      </View>
    </View>
  );
}

/* ─── StyleSheets ─── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  dotGrid: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
    ...Platform.select({
      web: {
        backgroundImage: `radial-gradient(circle, ${C.dotMin} 1px, transparent 1px), radial-gradient(circle, ${C.dotMaj} 1px, transparent 1px)`,
        backgroundSize: '28px 28px, 140px 140px',
        backgroundPosition: '0',
      } as any,
      default: {},
    }),
  },
  scroll: { flex: 1, zIndex: 1 },
  scrollContent: { paddingBottom: 40 },

  nav: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: C.border,
    ...Platform.select({ web: { backdropFilter: 'blur(12px)' } as any }),
    backgroundColor: 'rgba(26,26,30,0.8)',
  },
  navLogo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navLogoIcon: { fontSize: 17, color: C.signal },
  navLogoText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4, color: C.text },
  navLogoAcc: { fontStyle: 'normal', color: C.accentHot },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  navLink: { color: C.textMuted, fontSize: 13, fontWeight: '500', cursor: 'pointer' },
  navCta: { backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
  navCtaText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  hero: { minHeight: 800, paddingTop: 120, paddingHorizontal: 24, paddingBottom: 60, alignItems: 'center' },
  heroTitle: { fontSize: 48, fontWeight: '800', letterSpacing: -2, lineHeight: 52, textAlign: 'center', color: C.text },
  heroSignal: { color: C.signal },
  heroAccent: { color: C.accentHot },
  heroSub: { fontSize: 16, color: C.textMuted, maxWidth: 640, marginVertical: 20, lineHeight: 26, textAlign: 'center' },
  heroSubStrong: { color: C.text, fontWeight: '600' },
  heroActions: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.panel, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
  },
  btnSecondaryText: { color: C.text, fontSize: 15, fontWeight: '600' },

  scrollIndicator: { position: 'absolute', bottom: 32, alignItems: 'center', gap: 6 },
  scrollIndText: { fontFamily: FONT_MONO, fontSize: 10, color: C.textDim, letterSpacing: 1, textTransform: 'uppercase' },
  scrollIndLine: { width: 1, height: 32, backgroundColor: C.textDim },

  section: { paddingHorizontal: 24, paddingVertical: 80, maxWidth: 1000, alignSelf: 'center', width: '100%' },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionLabelLine: { width: 24, height: 1, backgroundColor: C.signal, opacity: 0.4 },
  sectionLabel: { fontFamily: FONT_MONO, fontSize: 11, color: C.signal, letterSpacing: 2, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 36, fontWeight: '800', letterSpacing: -1, marginBottom: 16, color: C.text },
  sectionDesc: { fontSize: 16, color: C.textMuted, maxWidth: 560, lineHeight: 26 },
  sectionStrong: { color: C.text, fontWeight: '600' },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 48 },
  featureCard: {
    width: 280, backgroundColor: C.panel, borderWidth: 1, borderRadius: 10, padding: 24,
  },
  featureIcon: {
    width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  featureIconText: { fontSize: 18 },
  featureTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6, color: C.text },
  featureDesc: { fontSize: 13, color: C.textMuted, lineHeight: 20 },

  pipelineContainer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', marginTop: 48, width: '100%', gap: 12 },
  pipelineStep: {
    width: 220, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border,
    padding: 24, alignItems: 'center',
  },
  pipelineIcon: { fontSize: 24, marginBottom: 10 },
  pipelineNum: { fontFamily: FONT_MONO, fontSize: 11, color: C.textDim, marginBottom: 8 },
  pipelineTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4, color: C.text },
  pipelineDesc: { fontSize: 12, color: C.textMuted, lineHeight: 18, textAlign: 'center' },
  pipelineArrow: { color: C.textDim, fontSize: 20, alignSelf: 'center', paddingHorizontal: 8 },

  surfaceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 48 },
  surfaceItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 8,
    padding: 16, width: 300,
  },
  surfaceIconBox: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  surfaceIcon: { fontSize: 16 },
  surfaceInfo: { flex: 1 },
  surfaceTitle: { fontSize: 13, fontWeight: '600', color: C.text },
  surfaceDesc: { fontSize: 12, color: C.textMuted },

  integrationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 48 },
  integrationCard: {
    backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 8,
    padding: 20, alignItems: 'center', width: 220,
  },
  integrationLogo: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  integrationTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4, color: C.text },
  integrationDesc: { fontSize: 12, color: C.textMuted, lineHeight: 18, textAlign: 'center' },
  integrationBadge: { marginTop: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3 },
  integrationBadgeText: { fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 0.5 },

  stackGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 48 },
  stackItem: {
    backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 6,
    padding: 14, alignItems: 'center', width: 150,
  },
  stackName: { fontSize: 13, fontWeight: '600', color: C.text },
  stackVer: { fontFamily: FONT_MONO, fontSize: 10, color: C.textDim, marginTop: 2 },

  flow: { marginTop: 48, maxWidth: 720, width: '100%' },
  flowStep: { flexDirection: 'row', gap: 18 },
  flowRail: { alignItems: 'center', width: 40 },
  flowDot: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.panelElevated, borderWidth: 1,
  },
  flowDotText: { fontSize: 16, fontWeight: '700' },
  flowLine: { width: 1, flex: 1, backgroundColor: C.border, minHeight: 16 },
  flowBody: { flex: 1, paddingTop: 8, paddingBottom: 32 },
  flowTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 5 },
  flowTitle: { fontSize: 16, fontWeight: '600', color: C.text },
  flowTag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  flowTagText: { fontFamily: FONT_MONO, fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  flowDesc: { fontSize: 14, color: C.textMuted, lineHeight: 22, maxWidth: 560 },

  qsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 48 },
  qsCard: {
    flexGrow: 1, flexBasis: 320,
    backgroundColor: C.panel, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 24,
  },
  qsCardTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 16 },
  qsCmd: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8,
  },
  qsCmdText: { fontFamily: FONT_MONO, fontSize: 12.5, color: C.accentHot },
  qsStepRow: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  qsStepNum: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  qsStepNumText: { fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: '700', color: C.signal },
  qsStepText: { flex: 1, color: C.textMuted, fontSize: 13.5, lineHeight: 21 },

  footer: { padding: 40, alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, gap: 12 },
  footerLinks: { flexDirection: 'row', gap: 20 },
  footerLink: { color: C.textMuted, fontSize: 13, cursor: 'pointer' },
  footerAttribution: { fontSize: 12, color: C.textDim, textAlign: 'center' },
  footerAttributionLink: { color: C.accentHot, textDecorationLine: 'underline', cursor: 'pointer' },
  footerMono: { fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1, color: C.textDim },
});

const s = StyleSheet.create({
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionLabelLine: { width: 24, height: 1, backgroundColor: C.signal, opacity: 0.4 },
  sectionLabel: { fontFamily: FONT_MONO, fontSize: 11, color: C.signal, letterSpacing: 2, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 36, fontWeight: '800', letterSpacing: -1, marginBottom: 16, color: C.text },
  sectionDesc: { fontSize: 16, color: C.textMuted, maxWidth: 560, lineHeight: 26 },
  sectionStrong: { color: C.text, fontWeight: '600' },
  featureCard: {
    flexGrow: 1, flexBasis: 220, maxWidth: 480,
    backgroundColor: C.panel,
    borderWidth: 1, borderRadius: 10, padding: 24,
  },
  featureIcon: {
    width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  featureIconText: { fontSize: 18 },
  featureTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6, color: C.text },
  featureDesc: { fontSize: 13, color: C.textMuted, lineHeight: 20 },
  surfaceItem: {
    flexGrow: 1, flexBasis: 280, maxWidth: 480,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.panel,
    borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 16,
  },
  surfaceIconBox: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  surfaceIcon: { fontSize: 16 },
  surfaceInfo: { flex: 1 },
  surfaceTitle: { fontSize: 13, fontWeight: '600', color: C.text },
  surfaceDesc: { fontSize: 12, color: C.textMuted },
  pipelineStep: {
    flexGrow: 1, flexBasis: 200,
    backgroundColor: C.panel,
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    padding: 24, alignItems: 'center',
  },
  pipelineIcon: { fontSize: 24, marginBottom: 10 },
  pipelineNum: { fontFamily: FONT_MONO, fontSize: 11, color: C.textDim, marginBottom: 8 },
  pipelineTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4, color: C.text },
  pipelineDesc: { fontSize: 12, color: C.textMuted, lineHeight: 18, textAlign: 'center' },
  integrationCard: {
    flexGrow: 1, flexBasis: 210, maxWidth: 340,
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    padding: 20, alignItems: 'center',
    backgroundColor: C.panel,
  },
  integrationLogoWrap: {
    alignSelf: 'stretch', height: 60, marginBottom: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5F6F8', borderRadius: 8, paddingHorizontal: 12,
  },
  integrationLogoImg: { width: 150, height: 34 },
  integrationLogoFallback: { position: 'absolute', fontSize: 24, fontWeight: '800' },
  integrationTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4, color: C.text },
  integrationDesc: { fontSize: 12, color: C.textMuted, lineHeight: 18, textAlign: 'center' },
  integrationBadge: { marginTop: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3 },
  integrationBadgeText: { fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 0.5 },
  stackItem: {
    flexGrow: 1, flexBasis: 150, maxWidth: 240,
    backgroundColor: C.panel,
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    padding: 14, alignItems: 'center',
  },
  stackName: { fontSize: 13, fontWeight: '600', color: C.text },
  stackVer: { fontFamily: FONT_MONO, fontSize: 10, color: C.textDim, marginTop: 2 },
});
