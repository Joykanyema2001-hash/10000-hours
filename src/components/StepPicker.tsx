import { ScrollView } from 'react-native';
import { haptics } from '../lib/haptics';
import type { SkillNode } from '../store';
import { colors, fonts } from '../theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** Pick which tree step a session was spent on. Steps in progress come first. */
export function StepPicker({ nodes, value, onChange }: { nodes: SkillNode[]; value: string | null; onChange: (id: string | null) => void }) {
  const order = { learning: 0, todo: 1, mastered: 2 } as const;
  const sorted = [...nodes].sort((a, b) => order[a.status] - order[b.status] || b.updatedAt - a.updatedAt);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 24 }} style={{ marginHorizontal: -24 }} accessibilityRole="radiogroup">
      {sorted.map((n) => {
        const on = n.id === value;
        return (
          <PressableScale
            key={n.id}
            scaleTo={0.94}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              haptics.select();
              onChange(on ? null : n.id);
            }}
            style={{ paddingHorizontal: 14, height: 44, justifyContent: 'center', borderRadius: 14, borderWidth: 2.5, borderColor: colors.ink, backgroundColor: on ? colors.lime : colors.white }}
          >
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15 }}>
              {n.status === 'learning' ? '◐ ' : n.status === 'mastered' ? '✓ ' : ''}
              {n.title}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}
