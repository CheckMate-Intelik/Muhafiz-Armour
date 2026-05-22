import { useRootNavigationState } from 'expo-router';

export function useNavigationReady() {
  const state = useRootNavigationState();
  return state?.key != null;
}
