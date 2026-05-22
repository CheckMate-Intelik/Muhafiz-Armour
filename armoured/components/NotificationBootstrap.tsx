import { useEffect } from 'react';
import { AppState } from 'react-native';

import { addNotificationResponseListener, syncPushTokensWithServer } from '@/lib/notifications';
import { safePush } from '@/lib/safeRouter';

export function NotificationBootstrap() {
  useEffect(() => {
    void syncPushTokensWithServer();

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncPushTokensWithServer();
      }
    });

    const removeNavListener = addNotificationResponseListener(({ bookingId, status, role }) => {
      if (!bookingId) return;
      if (status === 'IN_PROGRESS' && role === 'DISPATCHER') {
        safePush('/dispatcher-ongoing-trip');
        return;
      }
      if (status === 'IN_PROGRESS' && role === 'USER') {
        safePush('/ongoing-trip');
        return;
      }
      safePush({ pathname: '/booking-details', params: { id: bookingId } });
    });

    return () => {
      appStateSub.remove();
      removeNavListener();
    };
  }, []);

  return null;
}
