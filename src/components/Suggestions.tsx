import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { haptics } from '../lib/haptics';
import { SUGGESTIONS } from '../lib/skillIcons';
import { colors, fonts } from '../theme';
import { PressableScale } from './PressableScale';
import { SkillIcon } from './SkillIcon';
import { Text } from './Text';

/** Starter ideas grouped by area. Tapping one fills in the name and icon. */
export function Suggestions({ selected, taken, onPick }: { selected: string; taken: string[]; onPick: (name: string, icon: string) => void }) {
  const reduce = useReducedMotion();
  return (
    <View style={{ gap: 14 }}>
      {SUGGESTIONS.map((g, gi) => (
        <Animated.View key={g.group} entering={reduce ? undefined : FadeInDown.delay(60 + gi * 50).springify().dampingRatio(1).duration(360)} style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.6, color: colors.muted }}>{g.group.toUpperCase()}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 24 }} style={{ marginHorizontal: -24 }}>
            {g.items.map((it) => {
              const on = selected.trim().toLowerCase() === it.name.toLowerCase();
              const already = taken.includes(it.name.toLowerCase());
              return (
                <PressableScale
                  key={it.name}
                  scaleTo={0.94}
                  disabled={already}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: already }}
                  accessibilityLabel={already ? `${it.name}, already added` : it.name}
                  onPress={() => {
                    haptics.select();
                    onPick(it.name, it.icon);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6, paddingRight: 14, height: 48, borderRadius: 16, borderWidth: 2.5, borderColor: colors.ink, backgroundColor: on ? colors.lime : colors.white }}
                >
                  <SkillIcon icon={it.icon} size={34} tone={on ? 'ink' : 'lime'} />
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15 }}>{it.name}</Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </Animated.View>
      ))}
    </View>
  );
}
