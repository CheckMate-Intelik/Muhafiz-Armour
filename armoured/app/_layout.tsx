import '../global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthGate } from '@/components/AuthGate';
import { NotificationBootstrap } from '@/components/NotificationBootstrap';
import { SystemBarsBootstrap } from '@/components/SystemBarsBootstrap';
import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthGate>
        <NotificationBootstrap />
        <SystemBarsBootstrap />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGate>
    </SafeAreaProvider>
  );
}
