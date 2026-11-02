import { BackIcon, CloseIcon } from './Icons';
import { PressableScale } from './PressableScale';

/** 44×44pt hit target (HIG minimum), icon aligned to the leading edge like the design. */
export function IconButton({ kind, onPress, label }: { kind: 'back' | 'close'; onPress: () => void; label?: string }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label ?? (kind === 'back' ? 'Back' : 'Close')}
      style={{ width: 44, height: 44, justifyContent: 'center' }}
    >
      {kind === 'back' ? <BackIcon /> : <CloseIcon />}
    </PressableScale>
  );
}
