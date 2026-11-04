import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '../../components/Button';
import { SkillIcon } from '../../components/SkillIcon';
import { StepPicker } from '../../components/StepPicker';
import { Text } from '../../components/Text';
import { formatDuration } from '../../lib/time';
import { useStore } from '../../store';
import { colors, fonts } from '../../theme';

/** Right after finishing: which step was this, and anything worth remembering? */
export default function SessionNote() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const session = useStore((s) => s.sessions.find((x) => x.id === id));
  const skill = useStore((s) => s.skills.find((k) => k.id === session?.skillId));
  const nodes = useStore(useShallow((s) => s.nodes.filter((n) => n.skillId === session?.skillId)));
  const updateSession = useStore((s) => s.updateSession);
  const [nodeId, setNodeId] = useState<string | null>(session?.nodeId ?? null);
  const [note, setNote] = useState(session?.note ?? '');

  const done = () => router.replace({ pathname: '/skill/[id]', params: { id: skill?.id ?? '', from: from ?? '' } });
  if (!session || !skill) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 10, marginTop: 12 }}>
            <SkillIcon icon={skill.icon} size={64} />
            <Text style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 34, textAlign: 'center' }} accessibilityRole="header">
              {formatDuration(session.ms)} of {skill.name}
            </Text>
            <Text variant="body" style={{ color: colors.muted, textAlign: 'center' }}>Logged. Want to note what it was?</Text>
          </View>

          {nodes.length ? (
            <View style={{ gap: 10 }}>
              <Text variant="label">What did you work on?</Text>
              <StepPicker nodes={nodes} value={nodeId} onChange={setNodeId} />
            </View>
          ) : (
            <Text variant="caption" style={{ textAlign: 'center' }}>
              Tip: add steps to your {skill.name} tree to track what each session was for.
            </Text>
          )}

          <View style={{ gap: 8 }}>
            <Text variant="label">Note</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="What went well, what to fix next time…"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Session note"
              style={{ minHeight: 100, padding: 14, borderWidth: 3, borderColor: colors.ink, borderRadius: 16, backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.body, fontSize: 16, textAlignVertical: 'top' }}
            />
          </View>

          <View style={{ flex: 1 }} />
          <Button
            label="Save"
            onPress={() => {
              if (nodeId !== (session.nodeId ?? null) || note.trim() !== (session.note ?? '')) {
                updateSession(session.id, { nodeId, note: note.trim() || null });
              }
              done();
            }}
          />
          <Button variant="outline" size="md" label="Skip" onPress={done} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
