import Pencil from 'lucide-react-native/icons/pencil';
import Settings from 'lucide-react-native/icons/settings';
import { colors } from '../theme';
import { BackIcon, CloseIcon } from './Icons';
import { PressableScale } from './PressableScale';

type Kind = 'back' | 'close' | 'edit' | 'settings';
const LABELS: Record<Kind, string> = { back: 'Back', close: 'Close', edit: 'Edit', settings: 'Settings' };

/** 44×44pt hit target (HIG minimum). Leading icons align left, trailing ones right. */
export function IconButton({ kind, onPress, label }: { kind: Kind; onPress: () => void; label?: string }) {
  const trailing = kind === 'edit' || kind === 'settings';
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label ?? LABELS[kind]}
      style={{ width: 44, height: 44, justifyContent: 'center', alignItems: trailing ? 'flex-end' : 'flex-start' }}
    >
      {kind === 'back' ? <BackIcon /> : kind === 'close' ? <CloseIcon /> : kind === 'edit' ? <Pencil size={22} color={colors.ink} strokeWidth={2.5} /> : <Settings size={24} color={colors.ink} strokeWidth={2.25} />}
    </PressableScale>
  );
}
