import { router, useLocalSearchParams } from 'expo-router';
import Play from 'lucide-react-native/icons/play';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Field } from '../../components/Field';
import { IconButton } from '../../components/IconButton';
import { Text } from '../../components/Text';
import { haptics } from '../../lib/haptics';
import { notify } from '../../lib/notify';
import { formatDuration } from '../../lib/time';
import { nodeMs, subtreeIds, useStore, type NodeStatus } from '../../store';
import { colors, fonts } from '../../theme';

const STATUSES: { key: NodeStatus; label: string }[] = [
  { key: 'todo', label: 'To learn' },
  { key: 'learning', label: 'Learning' },
  { key: 'mastered', label: 'Mastered' },
];

/** Create or edit one step of a skill tree. id = 'new' creates (params: skill, parent). */
export default function StepScreen() {
  const params = useLocalSearchParams<{ id: string; skill?: string; parent?: string }>();
  const isNew = params.id === 'new';
  const node = useStore((s) => (isNew ? undefined : s.nodes.find((n) => n.id === params.id)));
  const skillId = node?.skillId ?? params.skill ?? '';
  const parentId = isNew ? params.parent || null : (node?.parentId ?? null);
  const skill = useStore((s) => s.skills.find((k) => k.id === skillId));
  const parent = useStore((s) => (parentId ? s.nodes.find((n) => n.id === parentId) : undefined));
  const sessions = useStore(useShallow((s) => s.sessions.filter((x) => !isNew && x.nodeId === params.id)));
  const allNodes = useStore((s) => s.nodes);
  const { addNode, updateNode, deleteNode } = useStore(useShallow((s) => ({ addNode: s.addNode, updateNode: s.updateNode, deleteNode: s.deleteNode })));

  const [title, setTitle] = useState(node?.title ?? '');
  const [notes, setNotes] = useState(node?.notes ?? '');
  const [status, setStatus] = useState<NodeStatus>(node?.status ?? 'todo');

  if (!skill || (!isNew && !node)) return null;
  const canSave = title.trim().length > 0;
  const below = node ? subtreeIds(allNodes, node.id).length - 1 : 0;

  const save = () => {
    if (!canSave) return;
    if (isNew) {
      const id = addNode(skill.id, parentId, title);
      if (status !== 'todo' || notes.trim()) updateNode(id, { status, notes: notes.trim() || undefined });
    } else {
      updateNode(node!.id, { title, status, notes: notes.trim() || undefined });
    }
    if (status === 'mastered' && node?.status !== 'mastered') {
      haptics.success();
      notify({ kind: 'goal', title: `Mastered: ${title.trim()}`, body: `Another branch of your ${skill.name} tree, done.` });
    }
    router.back();
  };

  const remove = () => {
    haptics.warning();
    Alert.alert(
      `Delete "${node!.title}"?`,
      below ? `This also deletes the ${below} step${below === 1 ? '' : 's'} below it. Hours you logged stay counted.` : 'Hours you logged stay counted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteNode(node!.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 16, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton kind="close" label="Cancel" onPress={() => router.back()} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18 }} accessibilityRole="header">{isNew ? 'New step' : 'Step'}</Text>
            <View style={{ width: 44 }} />
          </View>

          <Text variant="caption">
            {skill.name}
            {parent ? ` › ${parent.title}` : ''}
          </Text>

          {!isNew ? (
            <Button
              variant="lime"
              size="md"
              label="Watch the lesson"
              icon={<Play size={18} color={colors.ink} fill={colors.ink} />}
              accessibilityHint="Opens a short swipeable lesson for this step"
              onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: node!.id } })}
            />
          ) : null}

          <Field label="What are you learning?" value={title} onChangeText={setTitle} placeholder="e.g. G major chord" autoFocus={isNew} returnKeyType="done" />

          <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Status">
            <Text variant="label">Status</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {STATUSES.map((st) => (
                <Chip
                  key={st.key}
                  label={st.label}
                  selected={status === st.key}
                  onPress={() => {
                    if (status !== st.key) haptics.select();
                    setStatus(st.key);
                  }}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text variant="label">Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Tips, what clicked, what to work on next…"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Notes"
              style={{ minHeight: 110, padding: 14, borderWidth: 3, borderColor: colors.ink, borderRadius: 16, backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.body, fontSize: 16, textAlignVertical: 'top' }}
            />
          </View>

          {!isNew && sessions.length ? (
            <View style={{ gap: 6 }}>
              <Text variant="label">Practised: {formatDuration(nodeMs(sessions, node!.id))}</Text>
              {sessions
                .slice()
                .sort((a, b) => b.end - a.end)
                .slice(0, 5)
                .map((x) => (
                  <View key={x.id} style={{ paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: colors.divider }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14 }}>
                      {new Date(x.end).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {formatDuration(x.ms)}
                    </Text>
                    {x.note ? <Text variant="caption" style={{ color: colors.ink }}>{x.note}</Text> : null}
                  </View>
                ))}
            </View>
          ) : null}

          <Button label={isNew ? 'Add step' : 'Save'} onPress={save} disabled={!canSave} />

          {!isNew ? (
            <View style={{ gap: 10 }}>
              <Button
                variant="outline"
                size="md"
                label="Add a step below this"
                onPress={() => router.replace({ pathname: '/step/[id]', params: { id: 'new', skill: skill.id, parent: node!.id } })}
              />
              <Button variant="outline" size="sm" label="Delete step" onPress={remove} />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
