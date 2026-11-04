import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { AppleSignInButton } from '../../components/AppleSignInButton';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { PressableScale } from '../../components/PressableScale';
import { TAB_BAR_HEIGHT } from '../../components/TabBar';
import { Text } from '../../components/Text';
import { deleteAccount, initials, signOut, updateDisplayName, useAuth } from '../../lib/auth';
import { haptics } from '../../lib/haptics';
import { useNow } from '../../lib/hooks';
import { notify } from '../../lib/notify';
import { syncNow, useSync } from '../../lib/sync';
import { HOUR, startOfDay, withCommas } from '../../lib/time';
import { allTimeMs, useStore } from '../../store';
import { colors, fonts } from '../../theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function ago(t: number, now: number) {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '47%', flexGrow: 1, padding: 14, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 18, gap: 2 }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.6, color: colors.muted }}>{label.toUpperCase()}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function Row({ label, detail, onPress, danger }: { label: string; detail?: string; onPress: () => void; danger?: boolean }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ minHeight: 56, justifyContent: 'center', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: colors.divider }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: danger ? '#B3261E' : colors.ink }}>{label}</Text>
      {detail ? <Text variant="caption">{detail}</Text> : null}
    </PressableScale>
  );
}

export default function Profile() {
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);
  const sync = useSync();
  const data = useStore(useShallow((s) => ({ skills: s.skills, sessions: s.sessions, active: s.active })));
  const now = useNow(30_000);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const signedIn = !!session;
  const displayName = profile?.displayName || (signedIn ? 'Your profile' : 'Not signed in');
  const created = profile?.createdAt ? new Date(profile.createdAt) : null;
  const days = new Set(data.sessions.map((x) => startOfDay(x.end))).size;

  const saveName = async () => {
    setEditing(false);
    if (!name.trim() || name.trim() === profile?.displayName) return;
    const err = await updateDisplayName(name);
    if (err) notify({ kind: 'info', title: "Couldn't save your name", body: err });
  };

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'Your hours stay on this phone and in your account. Sign in again any time to keep syncing.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', onPress: () => signOut().then(() => notify({ kind: 'info', title: 'Signed out' })) },
    ]);

  const confirmDelete = () => {
    haptics.warning();
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and every skill and session saved to it. Hours on this phone stay until you erase them in Settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            const err = await deleteAccount();
            notify(err ? { kind: 'info', title: "Couldn't delete your account", body: err } : { kind: 'info', title: 'Account deleted' });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: TAB_BAR_HEIGHT + 32, gap: 22 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 36 }} accessibilityRole="header">Profile</Text>
          <IconButton kind="settings" onPress={() => router.push('/settings')} />
        </View>

        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.lime, borderWidth: 4, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 36, lineHeight: 40 }} maxFontSizeMultiplier={1}>{initials(profile?.displayName) || '10K'}</Text>
          </View>
          {editing ? (
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={saveName}
              onSubmitEditing={saveName}
              autoFocus
              returnKeyType="done"
              accessibilityLabel="Your name"
              style={{ minWidth: 200, textAlign: 'center', fontFamily: fonts.display, fontSize: 26, color: colors.ink, borderBottomWidth: 3, borderBottomColor: colors.lime, paddingVertical: 4 }}
            />
          ) : signedIn ? (
            <PressableScale
              onPress={() => {
                setName(profile?.displayName ?? '');
                setEditing(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${displayName}. Edit your name`}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30, textAlign: 'center' }}>{displayName}</Text>
            </PressableScale>
          ) : (
            <Text style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30, textAlign: 'center' }}>{displayName}</Text>
          )}
          <Text variant="caption">
            {signedIn
              ? created
                ? `Member since ${MONTHS[created.getMonth()]} ${created.getFullYear()} · tap your name to edit`
                : 'Signed in with Apple'
              : 'Your hours are only on this phone'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Stat label="All-time hours" value={withCommas(Math.floor(allTimeMs(data, now) / HOUR))} />
          <Stat label="Skills" value={withCommas(data.skills.length)} />
          <Stat label="Sessions" value={withCommas(data.sessions.length)} />
          <Stat label="Days practised" value={withCommas(days)} />
        </View>

        {signedIn ? (
          <View style={{ padding: 16, backgroundColor: colors.lime, borderWidth: 3, borderColor: colors.ink, borderRadius: 20, gap: 10 }}>
            <Text variant="label">Backup</Text>
            <Text style={{ fontFamily: fonts.displaySemi, fontSize: 18, lineHeight: 22 }} accessibilityLiveRegion="polite">
              {sync.syncing
                ? 'Syncing…'
                : sync.error
                  ? `Couldn't sync: ${sync.error}`
                  : sync.lastSyncedAt
                    ? `Backed up ${ago(sync.lastSyncedAt, now)}`
                    : 'Not synced yet on this phone'}
            </Text>
            <Button size="sm" label={sync.syncing ? 'Syncing…' : 'Sync now'} disabled={sync.syncing} onPress={() => syncNow()} />
          </View>
        ) : (
          <View style={{ padding: 18, backgroundColor: colors.lime, borderWidth: 3, borderColor: colors.ink, borderRadius: 20, gap: 12 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28 }}>Never lose an hour</Text>
            <Text variant="body">Sign in to back up your skills and sessions, and get them back on a new phone.</Text>
            <AppleSignInButton type="signIn" />
          </View>
        )}

        <View>
          <Row label="Settings" detail="Daily goal, reminders, haptics, backups" onPress={() => router.push('/settings')} />
          {signedIn ? <Row label="Sign out" onPress={confirmSignOut} /> : null}
          {signedIn ? <Row label="Delete account" detail="Removes your account and everything saved to it" onPress={confirmDelete} danger /> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
