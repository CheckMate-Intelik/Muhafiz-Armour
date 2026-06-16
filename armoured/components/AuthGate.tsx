import { useRootNavigationState, useSegments } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  getActiveRole,
  getStoredDispatcherSession,
  getStoredUserSession,
} from '@/lib/api';
import { redirectToLogin } from '@/lib/safeRouter';

function isPublicRoute(segments: string[]) {
  if (segments[0] === '(auth)') return true;
  return (
    segments.includes('login') ||
    segments.includes('signup') ||
    segments.includes('forgot-password') ||
    segments.includes('reset-password')
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const segmentKey = useMemo(() => segments.join('/'), [segments]);
  const [ready, setReady] = useState(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (!navigationState?.key) return;

    let cancelled = false;
    redirectingRef.current = false;

    async function verify() {
      if (isPublicRoute(segments as string[])) {
        if (!cancelled) setReady(true);
        return;
      }

      const role = await getActiveRole();
      const session =
        role === 'DISPATCHER' ? await getStoredDispatcherSession() : await getStoredUserSession();

      if (cancelled) return;

      if (!session) {
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          redirectToLogin();
        }
        if (!cancelled) setReady(true);
        return;
      }

      if (!cancelled) setReady(true);
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [segmentKey, navigationState?.key]);

  if (!navigationState?.key || !ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return <>{children}</>;
}
