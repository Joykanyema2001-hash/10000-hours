import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { Text } from '../../components/Text';
import { TreeCanvas } from '../../components/TreeCanvas';
import { useStore } from '../../store';
import { colors, fonts } from '../../theme';
import { RouteError } from '../../components/RouteError';

/** Full-screen, zoomable skill tree. */
export default function TreeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const skill = useStore((s) => s.skills.find((k) => k.id === id));
  const nodes = useStore(useShallow((s) => s.nodes.filter((n) => n.skillId === id)));
  const sessions = useStore(useShallow((s) => s.sessions.filter((x) => x.skillId === id)));
  if (!skill) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper, padding: 24, gap: 16, justifyContent: 'center' }}>
        <Text variant="title" accessibilityRole="header">Tree not found</Text>
        <Text variant="body" style={{ color: colors.muted }}>This skill may have been deleted or not finished saving.</Text>
        <Button label="Go to my skills" onPress={() => router.replace('/(tabs)/skills')} />
      </SafeAreaView>
    );
  }

  const mastered = nodes.filter((n) => n.status === 'mastered').length;
  const learning = nodes.filter((n) => n.status === 'learning').length;
  const add = (parentId: string | null) =>
    router.push({ pathname: '/step/[id]', params: { id: 'new', skill: skill.id, parent: parentId ?? '' } });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconButton kind="back" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 26 }} accessibilityRole="header" numberOfLines={1}>
            {skill.name} tree
          </Text>
          <Text variant="caption">
            {nodes.length === 0 ? 'Map what you learn, step by step' : `${mastered} of ${nodes.length} mastered${learning ? ` · ${learning} in progress` : ''}`}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, borderTopWidth: 2, borderBottomWidth: 2, borderColor: colors.divider }}>
        <TreeCanvas
          skill={skill}
          nodes={nodes}
          sessions={sessions}
          fitKey={nodes.length === 0 ? 0 : 1}
          onOpenNode={(nid) => router.push({ pathname: '/step/[id]', params: { id: nid } })}
          onAddNode={add}
        />
        {nodes.length === 0 ? (
          <View pointerEvents="box-none" style={{ position: 'absolute', left: 24, right: 24, bottom: 24 }}>
            <View style={{ padding: 18, backgroundColor: colors.lime, borderWidth: 3, borderColor: colors.ink, borderRadius: 20, gap: 8 }}>
              <Text style={{ fontFamily: fonts.displaySemi, fontSize: 19, lineHeight: 23 }}>Start your {skill.name} tree</Text>
              <Text variant="body">
                Add the first thing you're learning, like a chord, a grammar topic or a move. Then branch off it as you build on it.
              </Text>
              <Button size="sm" label="Add first step" onPress={() => add(null)} />
            </View>
          </View>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
        <Text variant="caption">Drag to move · pinch to zoom · double-tap for overview</Text>
      </View>
    </SafeAreaView>
  );
}

export { RouteError as ErrorBoundary };
