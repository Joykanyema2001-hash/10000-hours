import { View } from 'react-native';
import { haptics } from '../lib/haptics';
import { SKILL_ICONS } from '../lib/skillIcons';
import { PressableScale } from './PressableScale';
import { SkillIcon } from './SkillIcon';

/** Grid of skill icons; the chosen one is filled navy. */
export function IconPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Icon" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {Object.entries(SKILL_ICONS).map(([key, { label }]) => {
        const on = key === value;
        return (
          <PressableScale
            key={key}
            scaleTo={0.88}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
            onPress={() => {
              if (!on) haptics.select();
              onChange(key);
            }}
          >
            <SkillIcon icon={key} size={48} tone={on ? 'ink' : 'white'} />
          </PressableScale>
        );
      })}
    </View>
  );
}
