import { router } from 'expo-router';
import type { ReactNode } from 'react';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from '../../components/PressableScale';
import { TAB_BAR_HEIGHT } from '../../components/TabBar';
import { Text } from '../../components/Text';
import { useNow } from '../../lib/hooks';
import { buildInsights, type Insight } from '../../lib/insights';
import { startSession } from '../../lib/session';
import { useStore } from '../../store';
import { colors, fonts } from '../../theme';


/** Tappable card when it leads somewhere, plain card when it doesn't. */
function Wrap({ onPress, style, children }: { onPress?: () => void; style: object; children: ReactNode }) {
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" style={style}>
      {children}
    </PressableScale>
  );
}

export default function Coach() {
  const reduce = useReducedMotion();
  const skills = useStore((s) => s.skills);
  const sessions = useStore((s) => s.sessions);
  const nodes = useStore((s) => s.nodes);
  const goal = useStore((s) => s.dailyGoalMin);
  const now = useNow(60_000);
  const insights = buildInsights(skills, sessions, nodes, goal, now);

  const act = (i: Insight) => {
    if (!i.skillId) return;
    if (i.action === 'tree') router.push({ pathname: '/tree/[id]', params: { id: i.skillId } });
    else if (i.action === 'start') startSession(i.skillId);
    else router.push(`/skill/${i.skillId}`);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: TAB_BAR_HEIGHT + 32, gap: 16 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 36 }} accessibilityRole="header">Coach</Text>

        <Animated.View entering={reduce ? undefined : FadeInDown.springify().dampingRatio(1).duration(360)}>
          <PressableScale
            onPress={() => router.push('/coach/new')}
            accessibilityRole="button"
            accessibilityLabel="Plan a new skill with the coach"
            style={{ padding: 18, backgroundColor: colors.ink, borderRadius: 24, gap: 12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} color={colors.ink} strokeWidth={2.25} />
              </View>
              <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, color: colors.lime }}>Learn something new</Text>
            </View>
            <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.paper }}>
              Say what you want to learn. The coach maps the path to mastery as a skill tree, with a short lesson for every step.
            </Text>
            <View style={{ alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.lime }}>
              <Text style={{ fontFamily: fonts.displaySemi, fontSize: 16, color: colors.ink }}>Make a plan →</Text>
            </View>
          </PressableScale>
        </Animated.View>

        {insights.length === 0 ? (
          <Text variant="body" style={{ color: colors.muted }}>Log a few sessions and your coach will start noticing patterns.</Text>
        ) : (
          insights.map((i, idx) => (
            <Animated.View key={i.id} entering={reduce ? undefined : FadeInDown.delay(100 + idx * 60).springify().dampingRatio(1).duration(360)}>
              <Wrap
                onPress={i.skillId ? () => act(i) : undefined}
                style={{ padding: 16, backgroundColor: idx === 0 ? colors.lime : colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 20, gap: 6 }}
              >
                <Text style={{ fontFamily: fonts.displaySemi, fontSize: 19, lineHeight: 23 }}>{i.title}</Text>
                <Text variant="body" style={{ color: colors.ink }}>{i.body}</Text>
                {i.skillId ? (
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, marginTop: 4 }}>
                    {i.action === 'start' ? 'Start a session →' : i.action === 'tree' ? 'Open the tree →' : 'Open →'}
                  </Text>
                ) : null}
              </Wrap>
            </Animated.View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
