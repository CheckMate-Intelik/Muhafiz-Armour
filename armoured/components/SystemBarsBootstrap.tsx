import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { colors } from '@/constants/theme';

const APP_BACKGROUND = colors.background;

/** Hide Android software navigation bar; no-op if native module missing (rebuild dev client). */
async function configureAndroidSystemBars() {
  try {
    const SystemUI = await import('expo-system-ui');
    await SystemUI.setBackgroundColorAsync(APP_BACKGROUND);
  } catch {
    // Native module unavailable in this build.
  }

  try {
    const NavigationBar = await import('expo-navigation-bar');
    await NavigationBar.setPositionAsync('absolute');
    await NavigationBar.setBackgroundColorAsync('#02061700');
    await NavigationBar.setButtonStyleAsync('light');
    await NavigationBar.setVisibilityAsync('hidden');
    await NavigationBar.setBehaviorAsync('overlay-swipe');
  } catch {
    if (__DEV__) {
      console.warn(
        '[SystemBars] expo-navigation-bar not in this dev build. Rebuild with: eas build --profile development --platform android',
      );
    }
  }
}

export function SystemBarsBootstrap() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    void configureAndroidSystemBars();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void configureAndroidSystemBars();
    });

    return () => sub.remove();
  }, []);

  return null;
}
