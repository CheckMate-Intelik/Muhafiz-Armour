import '../global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Stack } from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(driver-tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="select-vehicle" options={{ headerShown: false }} />
        <Stack.Screen name="car-details" options={{ headerShown: false }} />
        <Stack.Screen name="book-vehicle" options={{ headerShown: false }} />
        <Stack.Screen name="book-vehicle-schedule" options={{ headerShown: false }} />
        <Stack.Screen name="payment" options={{ headerShown: false }} />
        <Stack.Screen name="ongoing-trip" options={{ headerShown: false }} />
        <Stack.Screen name="driver-ongoing-trip" options={{ headerShown: false }} />
        <Stack.Screen name="register-vehicle" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="booking-details" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
