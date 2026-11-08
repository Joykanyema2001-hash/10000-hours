import { Platform, ScrollView, View } from 'react-native';
import type { DiagramFrame } from '../../lib/coach';
import { colors, fonts } from '../../theme';
import { Text } from '../Text';

export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
export const PANEL = '#1A1942';
export const FAINT = 'rgba(248,250,238,0.22)';
export const DIM = 'rgba(248,250,238,0.55)';

export type DiagramProps = { frames: DiagramFrame[]; frame: number; meta: string[] };

/** A row of every frame's label, the current one lit: a progression, combo or sequence at a glance. */
export function FrameStrip({ frames, frame }: { frames: DiagramFrame[]; frame: number }) {
  if (frames.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {frames.map((f, i) => (
        <View key={i} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 2, borderColor: i === frame ? colors.lime : FAINT, backgroundColor: i === frame ? colors.lime : 'transparent' }}>
          <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: i === frame ? colors.ink : colors.paper }}>{f.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

/** Panel every diagram sits in. */
export function Panel({ children, padding = 12 }: { children: React.ReactNode; padding?: number }) {
  return <View style={{ borderRadius: 18, backgroundColor: PANEL, borderWidth: 2, borderColor: FAINT, padding, gap: 10 }}>{children}</View>;
}
