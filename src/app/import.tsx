import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { Text } from '../components/Text';
import { parseBackup, planMerge } from '../lib/backup';
import { haptics } from '../lib/haptics';
import { notify } from '../lib/notify';
import { replanNudge } from '../lib/session';
import { useStore } from '../store';
import { colors, fonts } from '../theme';

/** Restore a backup exported from Settings (e.g. from Expo Go into the installed app). */
export default function ImportBackup() {
  const current = useStore(useShallow((s) => ({ skills: s.skills, sessions: s.sessions })));
  const applyImport = useStore((s) => s.applyImport);
  const [text, setText] = useState('');

  const parsed = useMemo(() => (text.trim() ? parseBackup(text) : null), [text]);
  const plan = useMemo(() => (parsed?.ok ? planMerge(current, parsed.backup) : null), [parsed, current]);
  const nothingNew = !!plan && plan.addedSkills.length === 0 && plan.addedSessions === 0;

  const run = () => {
    if (!parsed?.ok || !plan || nothingNew) return;
    const wasEmpty = current.skills.length === 0;
    applyImport(plan.skills, plan.sessions, parsed.backup.dailyGoalMin);
    replanNudge();
    notify({
      kind: 'logged',
      title: 'Backup imported',
      body: `${plan.addedSkills.length} new skill${plan.addedSkills.length === 1 ? '' : 's'}, ${plan.addedSessions} session${plan.addedSessions === 1 ? '' : 's'} added.`,
    });
    if (wasEmpty) {
      router.dismissAll();
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 16, gap: 18 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton kind="close" label="Cancel" onPress={() => router.back()} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18 }} accessibilityRole="header">Import a backup</Text>
            <View style={{ width: 44 }} />
          </View>

          <Text variant="body" style={{ color: colors.muted }}>
            In the app you're moving from, go to Settings → Export a backup and copy the text. Paste it below. Skills with the same name are merged, and importing twice never duplicates sessions.
          </Text>

          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
            placeholder="Paste your backup here"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Backup text"
            style={{ minHeight: 160, maxHeight: 260, padding: 14, borderWidth: 3, borderColor: colors.ink, borderRadius: 16, backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.body, fontSize: 13, textAlignVertical: 'top' }}
          />

          {parsed && !parsed.ok ? (
            <Text variant="caption" style={{ color: colors.ink }} accessibilityLiveRegion="polite">{parsed.error}</Text>
          ) : null}

          {plan ? (
            <View accessibilityLiveRegion="polite" style={{ padding: 16, backgroundColor: colors.lime, borderWidth: 3, borderColor: colors.ink, borderRadius: 20, gap: 6 }}>
              <Text variant="label">This will add</Text>
              <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 24 }}>
                {plan.addedSkills.length} new skill{plan.addedSkills.length === 1 ? '' : 's'} and {plan.addedSessions} session{plan.addedSessions === 1 ? '' : 's'}
              </Text>
              {plan.addedSkills.length ? <Text variant="caption" style={{ color: colors.ink }}>New: {plan.addedSkills.join(', ')}</Text> : null}
              {plan.matchedSkills.length ? <Text variant="caption" style={{ color: colors.ink }}>Merged into existing: {plan.matchedSkills.join(', ')}</Text> : null}
              {plan.skippedSessions ? <Text variant="caption" style={{ color: colors.ink }}>{plan.skippedSessions} session{plan.skippedSessions === 1 ? ' is' : 's are'} already here and will be skipped.</Text> : null}
            </View>
          ) : null}

          <View style={{ flex: 1 }} />
          <Button
            label={nothingNew ? 'Nothing new to import' : 'Import'}
            disabled={!plan || nothingNew}
            onPress={() => {
              haptics.commit();
              run();
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
