import { View } from 'react-native';
import { iconFor } from '../lib/skillIcons';
import { colors } from '../theme';

/** A skill's icon in a small rounded tile. `tone` picks the tile colour. */
export function SkillIcon({ icon, size = 44, tone = 'lime' }: { icon?: string; size?: number; tone?: 'lime' | 'white' | 'ink' }) {
  const { Icon } = iconFor(icon);
  const bg = tone === 'lime' ? colors.lime : tone === 'ink' ? colors.ink : colors.white;
  return (
    <View
      accessible={false}
      style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: bg, borderWidth: tone === 'ink' ? 0 : 2.5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon size={size * 0.52} color={tone === 'ink' ? colors.lime : colors.ink} strokeWidth={2.25} />
    </View>
  );
}
