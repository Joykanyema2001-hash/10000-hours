import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDecay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { iconFor } from '../lib/skillIcons';
import { formatDuration } from '../lib/time';
import { layoutTree, ROOT_ID, type Placed } from '../lib/treeLayout';
import { nodeMs, type Session, type Skill, type SkillNode } from '../store';
import { colors, fonts, springs } from '../theme';
import { CheckCircle, OpenCircle, PlusIcon } from './Icons';
import { Text } from './Text';

const MIN = 0.35;
const MAX = 2.2;

function StatusDot({ node }: { node: SkillNode }) {
  if (node.status === 'mastered') return <CheckCircle size={20} />;
  if (node.status === 'learning') {
    return (
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.ink, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, backgroundColor: colors.ink }} />
      </View>
    );
  }
  return <OpenCircle size={20} />;
}

function NodeCard({ p, sessions, onPress, onAdd }: { p: Placed; sessions: Session[]; onPress: () => void; onAdd: () => void }) {
  const n = p.node!;
  const mastered = n.status === 'mastered';
  const learning = n.status === 'learning';
  const ms = nodeMs(sessions, n.id);
  return (
    <View style={{ position: 'absolute', left: p.x, top: p.y, width: p.w, alignItems: 'center' }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${n.title}, ${n.status === 'todo' ? 'not started' : n.status}${ms ? `, ${formatDuration(ms)} practised` : ''}`}
        style={({ pressed }) => [
          styles.card,
          { height: p.h, width: p.w, transform: [{ scale: pressed ? 0.96 : 1 }] },
          mastered && { backgroundColor: colors.ink },
          learning && { backgroundColor: colors.lime, borderWidth: 3 },
        ]}
      >
        {mastered ? <CheckCircleLime /> : <StatusDot node={n} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 17, color: mastered ? colors.lime : colors.ink }} numberOfLines={2}>
            {n.title}
          </Text>
          {ms ? <Text style={{ fontFamily: fonts.body, fontSize: 11, lineHeight: 14, color: mastered ? colors.paper : colors.muted }}>{formatDuration(ms)}</Text> : null}
        </View>
      </Pressable>
      <AddButton onPress={onAdd} label={`Add a step after ${n.title}`} />
    </View>
  );
}

function CheckCircleLime() {
  return (
    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 15, color: colors.ink }}>✓</Text>
    </View>
  );
}

function AddButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.add, pressed && { backgroundColor: colors.lime }]}
    >
      <PlusIcon size={14} />
    </Pressable>
  );
}

type Props = {
  skill: Skill;
  nodes: SkillNode[];
  sessions: Session[];
  onOpenNode: (id: string) => void;
  onAddNode: (parentId: string | null) => void;
  /** Bump to re-fit the view (e.g. after adding the first step). */
  fitKey?: number;
  /** Open at the left edge instead of centred on the skill: plans read left to right from stage 1. */
  startLeft?: boolean;
};

/**
 * Pan / pinch / double-tap canvas for a skill tree. Pan tracks the finger 1:1 and
 * keeps gliding with the flick's velocity; pinch zooms around the fingers; a
 * double-tap springs back to fit the whole tree.
 */
export function TreeCanvas({ skill, nodes, sessions, onOpenNode, onAddNode, fitKey = 0, startLeft = false }: Props) {
  const reduce = useReducedMotion();
  const layout = useMemo(() => layoutTree(nodes), [nodes]);
  const view = useSharedValue({ w: 0, h: 0 });
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const start = useSharedValue({ x: 0, y: 0, s: 1 });

  const rootX = layout.byId.get(ROOT_ID)!.x + layout.byId.get(ROOT_ID)!.w / 2;
  const LW = layout.width;
  const LH = layout.height;

  /** Opening view: readable size (never tiny), centred on the skill at the top. */
  const openAt = (w: number, animate: boolean) => {
    'worklet';
    if (!w) return;
    const s = Math.min(1, Math.max(0.78, (w - 32) / LW));
    const x = startLeft ? 16 - 24 * s : Math.min(16, Math.max(w - LW * s - 16, w / 2 - rootX * s));
    const y = 12;
    if (animate) {
      tx.value = withSpring(x, springs.ui);
      ty.value = withSpring(y, springs.ui);
      scale.value = withSpring(s, springs.ui);
    } else {
      tx.value = x;
      ty.value = y;
      scale.value = s;
    }
  };

  /** Double-tap: zoom out to show the whole tree. */
  const fitTo = (w: number, h: number, animate: boolean) => {
    'worklet';
    if (!w) return;
    const s = Math.min(1, Math.max(MIN, Math.min((w - 32) / LW, (h - 24) / LH)));
    const x = (w - LW * s) / 2;
    const y = Math.max(12, (h - LH * s) / 2);
    if (animate) {
      tx.value = withSpring(x, springs.ui);
      ty.value = withSpring(y, springs.ui);
      scale.value = withSpring(s, springs.ui);
    } else {
      tx.value = x;
      ty.value = y;
      scale.value = s;
    }
  };

  useEffect(() => {
    openAt(view.value.w, !reduce);
  }, [fitKey, layout.width]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const first = view.value.w === 0;
    view.value = { w: width, h: height };
    if (first) openAt(width, false);
  };

  const pan = usePanGesture({
    minDistance: 6,
    onBegin: () => {
      'worklet';
      start.value = { x: tx.value, y: ty.value, s: scale.value };
    },
    onUpdate: (e) => {
      'worklet';
      tx.value = start.value.x + e.translationX;
      ty.value = start.value.y + e.translationY;
    },
    onDeactivate: (e) => {
      'worklet';
      // Glide with the flick, but stop with at least 80pt of the tree still on screen.
      const s = scale.value;
      const { w, h } = view.value;
      tx.value = withDecay({ velocity: e.velocityX, deceleration: 0.995, clamp: [80 - LW * s, w - 80], rubberBandEffect: true });
      ty.value = withDecay({ velocity: e.velocityY, deceleration: 0.995, clamp: [80 - LH * s, h - 80], rubberBandEffect: true });
    },
  });

  const pinch = usePinchGesture({
    onBegin: () => {
      'worklet';
      start.value = { x: tx.value, y: ty.value, s: scale.value };
    },
    onUpdate: (e) => {
      'worklet';
      const s = Math.min(MAX, Math.max(MIN, start.value.s * e.scale));
      // Keep the point between the fingers fixed while zooming.
      const k = s / start.value.s;
      tx.value = e.focalX - (e.focalX - start.value.x) * k;
      ty.value = e.focalY - (e.focalY - start.value.y) * k;
      scale.value = s;
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onDeactivate: (e) => {
      'worklet';
      if (e.canceled) return;
      fitTo(view.value.w, view.value.h, true);
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch, doubleTap);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const root = layout.byId.get(ROOT_ID)!;
  const { Icon } = iconFor(skill.icon);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.viewport} onLayout={onLayout} accessibilityLabel="Skill tree. Drag to move, pinch to zoom, double-tap to fit.">
        <Animated.View style={[{ width: layout.width, height: layout.height, transformOrigin: 'left top' }, style]}>
          <Svg width={layout.width} height={layout.height} style={StyleSheet.absoluteFill}>
            {layout.edges.map(({ from, to }) => {
              const x1 = from.x + from.w / 2;
              const y1 = from.y + from.h + 14; // below the parent's + button
              const x2 = to.x + to.w / 2;
              const y2 = to.y;
              const solid = to.node?.status === 'mastered';
              const midY = (y1 + y2) / 2;
              return (
                <Path
                  key={to.id}
                  d={`M${x1} ${y1} C${x1} ${midY} ${x2} ${midY} ${x2} ${y2}`}
                  stroke={solid ? colors.ink : colors.muted}
                  strokeWidth={solid ? 4 : 2.5}
                  strokeDasharray={solid ? undefined : '6 6'}
                  strokeLinecap="round"
                  fill="none"
                />
              );
            })}
          </Svg>

          {/* The skill is the root of its tree */}
          <View style={{ position: 'absolute', left: root.x, top: root.y, width: root.w, alignItems: 'center' }}>
            <View style={[styles.root, { width: root.w, height: root.h }]}>
              <View style={styles.rootIcon}>
                <Icon size={20} color={colors.ink} strokeWidth={2.25} />
              </View>
              <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: colors.lime }} numberOfLines={2}>
                {skill.name}
              </Text>
            </View>
            <AddButton onPress={() => onAddNode(null)} label={`Add a first step to ${skill.name}`} />
          </View>

          {layout.placed
            .filter((p) => p.node)
            .map((p) => (
              <NodeCard key={p.id} p={p} sessions={sessions} onPress={() => onOpenNode(p.id)} onAdd={() => onAddNode(p.id)} />
            ))}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, overflow: 'hidden' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  root: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 22, backgroundColor: colors.ink },
  rootIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  add: {
    marginTop: -12,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
