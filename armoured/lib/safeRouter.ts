import { router, type Href } from 'expo-router';

const MAX_ATTEMPTS = 40;
const RETRY_MS = 50;

function isNavigationNotReadyError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes('before mounting') || msg.includes('Root Layout');
}

function runWhenNavigationReady(action: () => void, attempt = 0) {
  try {
    action();
  } catch (e) {
    if (isNavigationNotReadyError(e) && attempt < MAX_ATTEMPTS) {
      setTimeout(() => runWhenNavigationReady(action, attempt + 1), RETRY_MS);
      return;
    }
    if (!isNavigationNotReadyError(e)) {
      console.error(e);
    }
  }
}

/** Defer navigation until expo-router root layout is mounted. */
export function safeReplace(href: Href) {
  setTimeout(() => runWhenNavigationReady(() => router.replace(href)), 0);
}

/** Defer navigation until expo-router root layout is mounted. */
export function safePush(href: Href) {
  setTimeout(() => runWhenNavigationReady(() => router.push(href)), 0);
}

export function redirectToLogin() {
  safeReplace('/login' as Href);
}
