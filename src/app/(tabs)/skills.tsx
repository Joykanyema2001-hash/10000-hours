import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlusIcon } from '../../components/Icons';
import { PressableScale } from '../../components/PressableScale';
import { ProgressBar } from '../../components/ProgressBar';
import { SkillIcon } from '../../components/SkillIcon';
import { TAB_BAR_HEIGHT } from '../../components/TabBar';
import { Text } from '../../components/Text';
import { useNow } from '../../lib/hooks';
import { HOUR, withCommas } from '../../lib/time';
import { skillTotalMs, useStore } from '../../store';
import { colors, fonts } from '../../theme';

/** Every skill with its hours and how far its tree has come. */
export default function Skills() {
  const reduce = useReducedMotion();
  const skills = useStore((s) => s.skills);
  const sessions = useStore((s) => s.sessions);
  const nodes = useStore((s) => s.nodes);
  const active = useStore((s) => s.active);
  const now = useNow(60_000);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: TAB_BAR_HEIGHT + 32, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 36 }} accessibilityRole="header">Skills</Text>
          <PressableScale
            onPress={() => router.push('/add-skill')}
            accessibilityRole="button"
            accessibilityLabel="Add a skill"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}
          >
            <PlusIcon color={colors.lime} />
          </PressableScale>
        </View>

        {skills.map((k, i) => {
          const hours = Math.floor(skillTotalMs({ skills, sessions, active }, k.id, now) / HOUR);
          const mine = nodes.filter((n) => n.skillId === k.id);
          const mastered = mine.filter((n) => n.status === 'mastered').length;
          const learning = mine.filter((n) => n.status === 'learning');
          return (
            <Animated.View key={k.id} entering={reduce ? undefined : FadeInDown.delay(40 + i * 50).springify().dampingRatio(1).duration(360)}>
              <PressableScale
                onPress={() => router.push(`/skill/${k.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${k.name}, ${withCommas(hours)} hours, ${mastered} of ${mine.length} tree steps mastered`}
                style={{ padding: 16, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 20, gap: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <SkillIcon icon={k.icon} size={44} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18 }} numberOfLines={1}>{k.name}</Text>
                    <Text variant="caption">{withCommas(hours)} hours</Text>
                  </View>
                  <PressableScale
                    onPress={() => router.push({ pathname: '/tree/[id]', params: { id: k.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${k.name} tree`}
                    style={{ paddingHorizontal: 14, height: 40, borderRadius: 999, backgroundColor: colors.ink, justifyContent: 'center' }}
                  >
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.lime }}>Tree</Text>
                  </PressableScale>
                </View>
                {mine.length ? (
                  <View style={{ gap: 6 }}>
                    <ProgressBar fraction={mastered / mine.length} height={10} delay={120 + i * 50} />
                    <Text variant="caption">
                      {mastered} of {mine.length} steps mastered
                      {learning.length ? ` · learning ${learning.slice(0, 2).map((n) => n.title).join(', ')}${learning.length > 2 ? '…' : ''}` : ''}
                    </Text>
                  </View>
                ) : (
                  <Text variant="caption">No tree yet. Tap Tree to map what you are learning.</Text>
                )}
              </PressableScale>
            </Animated.View>
          );
        })}

        {skills.length === 0 ? (
          <Text variant="body" style={{ color: colors.muted }}>No skills yet. Tap + to add your first.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
