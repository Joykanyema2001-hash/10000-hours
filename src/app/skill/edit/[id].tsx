import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/Button';
import { Field } from '../../../components/Field';
import { IconButton } from '../../../components/IconButton';
import { IconPicker } from '../../../components/IconPicker';
import { SkillIcon } from '../../../components/SkillIcon';
import { Text } from '../../../components/Text';
import { haptics } from '../../../lib/haptics';
import { notify } from '../../../lib/notify';
import { replanNudge } from '../../../lib/session';
import { DEFAULT_ICON } from '../../../lib/skillIcons';
import { HOUR, withCommas } from '../../../lib/time';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../../store';
import { colors, fonts } from '../../../theme';

/** Rename a skill, change its icon or starting hours, or delete it. */
export default function EditSkill() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const skill = useStore((s) => s.skills.find((k) => k.id === id));
  const others = useStore(useShallow((s) => s.skills.filter((k) => k.id !== id).map((k) => k.name.toLowerCase())));
  const sessionCount = useStore((s) => s.sessions.filter((x) => x.skillId === id).length);
  const isActive = useStore((s) => s.active?.skillId === id);
  const updateSkill = useStore((s) => s.updateSkill);
  const deleteSkill = useStore((s) => s.deleteSkill);

  const [name, setName] = useState(skill?.name ?? '');
  const [icon, setIcon] = useState(skill?.icon ?? DEFAULT_ICON);
  const [prior, setPrior] = useState(skill ? withCommas(Math.round(skill.priorMs / HOUR)) : '0');

  if (!skill) return null;
  const priorHours = Number(prior.replace(/[^0-9.]/g, '')) || 0;
  const duplicate = others.includes(name.trim().toLowerCase());
  const canSave = name.trim().length > 0 && !duplicate;

  const save = () => {
    if (!canSave) return;
    updateSkill(skill.id, { name, icon, priorMs: priorHours * HOUR });
    notify({ kind: 'info', title: 'Saved', body: `${name.trim()} is up to date.` });
    router.back();
  };

  const remove = () => {
    if (isActive) {
      haptics.warning();
      Alert.alert('Session running', `Finish or discard your ${skill.name} session before deleting it.`);
      return;
    }
    haptics.warning();
    Alert.alert(
      `Delete ${skill.name}?`,
      `This removes ${skill.name}, its ${sessionCount} session${sessionCount === 1 ? '' : 's'} and all its hours. It can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const name = skill.name;
            if (!deleteSkill(skill.id)) return;
            replanNudge();
            notify({ kind: 'info', title: `${name} deleted` });
            router.dismissAll();
            router.replace(useStore.getState().skills.length ? '/(tabs)' : '/welcome');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 16, gap: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton kind="close" label="Cancel" onPress={() => router.back()} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18 }} accessibilityRole="header">Edit skill</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" returnKeyType="done" />
            </View>
            <SkillIcon icon={icon} size={56} tone="lime" />
          </View>
          {duplicate ? <Text variant="caption" style={{ color: colors.ink, marginTop: -12 }}>You already have a skill called {name.trim()}.</Text> : null}

          <View style={{ gap: 10 }}>
            <Text variant="label">Icon</Text>
            <IconPicker value={icon} onChange={setIcon} />
          </View>

          <Field
            label="Hours before you started using the app"
            helper="Change this if your first guess was off. Logged sessions aren't affected."
            value={prior}
            onChangeText={setPrior}
            onBlur={() => setPrior(withCommas(Math.round(priorHours)))}
            keyboardType="number-pad"
          />

          <Button label="Save changes" onPress={save} disabled={!canSave} />

          <View style={{ gap: 8, marginTop: 8 }}>
            <Button variant="outline" size="md" label={`Delete ${skill.name}`} onPress={remove} accessibilityHint="Asks you to confirm first" />
            <Text variant="caption" style={{ textAlign: 'center' }}>Deleting removes its sessions too.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
