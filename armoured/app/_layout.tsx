import '../global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationBootstrap } from '@/components/NotificationBootstrap';
import { SystemBarsBootstrap } from '@/components/SystemBarsBootstrap';
import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <NotificationBootstrap />
      <SystemBarsBootstrap />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(dispatcher-tabs)" />
        <Stack.Screen name="(shared)/modal" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
