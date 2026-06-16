'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { clearSession } from '@/lib/session';

const IDLE_MS = 30 * 60 * 1000;

export function useSessionIdleTimeout() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const reset = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        clearSession();
        router.replace('/login');
      }, IDLE_MS);
    };

    const events: Array<keyof WindowEventMap> = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    for (const event of events) {
      window.addEventListener(event, reset, { passive: true });
    }
    reset();

    return () => {
      if (timer) clearTimeout(timer);
      for (const event of events) {
        window.removeEventListener(event, reset);
      }
    };
  }, [router]);
}
