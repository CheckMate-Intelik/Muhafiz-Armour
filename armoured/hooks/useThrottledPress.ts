import { useCallback, useRef } from 'react';

const DEFAULT_COOLDOWN_MS = 800;

export function useThrottledPress(onPress: () => void, cooldownMs = DEFAULT_COOLDOWN_MS) {
  const lockedRef = useRef(false);

  return useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    onPress();
    setTimeout(() => {
      lockedRef.current = false;
    }, cooldownMs);
  }, [onPress, cooldownMs]);
}

export function useThrottledAsyncPress(onPress: () => void | Promise<void>, cooldownMs = DEFAULT_COOLDOWN_MS) {
  const lockedRef = useRef(false);

  return useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    void Promise.resolve(onPress()).finally(() => {
      setTimeout(() => {
        lockedRef.current = false;
      }, cooldownMs);
    });
  }, [onPress, cooldownMs]);
}
