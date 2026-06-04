import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import Toast from '../components/Toast';
import SettingsModal from '../components/SettingsModal';

export default function RootLayout() {
  const toast = useStore((s) => s.toast);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#030810' } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <SettingsModal />
      <Toast message={toast} />
    </SafeAreaProvider>
  );
}
