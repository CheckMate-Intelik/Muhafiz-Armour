'use client';

import { useCallback, useRef } from 'react';

const DEFAULT_COOLDOWN_MS = 800;

export function useThrottledAction<T extends (...args: never[]) => void | Promise<void>>(
  action: T,
  cooldownMs = DEFAULT_COOLDOWN_MS,
) {
  const lockedRef = useRef(false);

  return useCallback(
    (...args: Parameters<T>) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      void Promise.resolve(action(...args)).finally(() => {
        setTimeout(() => {
          lockedRef.current = false;
        }, cooldownMs);
      });
    },
    [action, cooldownMs],
  ) as T;
}
