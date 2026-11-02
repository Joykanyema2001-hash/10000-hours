import { Redirect } from 'expo-router';
import { useStore } from '../store';

export default function Index() {
  const hasSkills = useStore((s) => s.skills.length > 0);
  return <Redirect href={hasSkills ? '/(tabs)' : '/welcome'} />;
}
