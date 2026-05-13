import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function TripSetupScreen() {
  useEffect(() => {
    router.replace('/new-booking' as any);
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#020617' }} />;
}
