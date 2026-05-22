import '../global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationBootstrap } from '@/components/NotificationBootstrap';
import { Stack } from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <NotificationBootstrap />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(dispatcher-tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="select-vehicle" options={{ headerShown: false }} />
        <Stack.Screen name="car-details" options={{ headerShown: false }} />
        <Stack.Screen name="book-vehicle" options={{ headerShown: false }} />
        <Stack.Screen name="book-confirm" options={{ headerShown: false }} />
        <Stack.Screen name="trip-setup" options={{ headerShown: false }} />
        <Stack.Screen name="trip-schedule" options={{ headerShown: false }} />
        <Stack.Screen name="vehicle-select" options={{ headerShown: false }} />
        <Stack.Screen name="payment" options={{ headerShown: false }} />
        <Stack.Screen name="ongoing-trip" options={{ headerShown: false }} />
        <Stack.Screen name="dispatcher-ongoing-trip" options={{ headerShown: false }} />
        <Stack.Screen name="register-vehicle" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="booking-details" options={{ headerShown: false }} />
        <Stack.Screen name="pick-location" options={{ headerShown: false }} />
        <Stack.Screen name="new-booking" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
