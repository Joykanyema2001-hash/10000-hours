import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { MilestoneRow } from '../../components/MilestoneRow';
import { PressableScale } from '../../components/PressableScale';
import { TAB_BAR_HEIGHT } from '../../components/TabBar';
import { Text } from '../../components/Text';
import { haptics } from '../../lib/haptics';
import { latestLevel, LEVELS, nextLevel, withArticle } from '../../lib/levels';
import { HOUR, withCommas } from '../../lib/time';
import { skillTotalMs, useStore } from '../../store';
import { colors, fonts } from '../../theme';

export default function Milestones() {
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ skill?: string }>();
  const skills = useStore((s) => s.skills);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);
  const lastSkillId = useStore((s) => s.lastSkillId);
  const [selected, setSelected] = useState(params.skill ?? lastSkillId ?? skills[0]?.id);
  useEffect(() => {
    if (params.skill) setSelected(params.skill);
  }, [params.skill]);

  const skill = skills.find((k) => k.id === selected) ?? skills[0];
  if (!skill) return null;
  const hours = Math.floor(skillTotalMs({ skills, sessions, active }, skill.id) / HOUR);
  const latest = latestLevel(hours);
  const next = nextLevel(hours);

  const share = async () => {
    haptics.select();
    const message = latest
      ? `${withCommas(latest.hours)} hours of ${skill.name}. I'm ${withArticle(latest.name)} on the way to 10,000.`
      : `Started counting my hours of ${skill.name}. Next stop: 10 hours.`;
    await Share.share({ message }).catch(() => {});
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24, gap: 16 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 36 }} accessibilityRole="header">
          {skill.name} milestones
        </Text>

        {skills.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="tablist">
            {skills.map((k) => {
              const on = k.id === skill.id;
              return (
                <PressableScale
                  key={k.id}
                  scaleTo={0.94}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    if (!on) haptics.select();
                    setSelected(k.id);
                  }}
                  style={{ paddingHorizontal: 16, height: 40, justifyContent: 'center', borderRadius: 999, borderWidth: 2, borderColor: colors.ink, backgroundColor: on ? colors.ink : 'transparent' }}
                >
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: on ? colors.lime : colors.ink }}>{k.name}</Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        ) : null}

        <Animated.View
          key={skill.id}
          entering={reduce ? FadeIn : FadeInDown.springify().dampingRatio(0.85).duration(420)}
          style={{ padding: 20, backgroundColor: colors.lime, borderWidth: 5, borderColor: colors.ink, borderRadius: 28, gap: 16 }}
        >
          <View style={{ gap: 4 }}>
            <Text variant="label">{latest ? 'Latest' : 'Next up'}</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 44, lineHeight: 46 }} maxFontSizeMultiplier={1.15}>
              {withCommas((latest ?? next ?? LEVELS[0]).hours)} hours
            </Text>
            <Text variant="bodyMedium">
              {latest
                ? `of ${skill.name}. You're ${withArticle(latest.name)}.`
                : `${withCommas(Math.max(0, (next?.hours ?? 10) - hours))} hours until you're ${withArticle(next?.name ?? 'Starter')}.`}
            </Text>
          </View>
          <Button size="sm" label={latest ? 'Share this card' : 'Share my start'} onPress={share} />
        </Animated.View>

        <View key={`list-${skill.id}`}>
          {LEVELS.map((l, i) => (
            <MilestoneRow key={l.name} index={i} name={l.name} hours={l.hours} reached={hours >= l.hours} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
