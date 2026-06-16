import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  recordSessionNotification,
  syncPushTokensWithServer,
} from '@/lib/notifications';
import { canNavigateFromNotification } from '@/lib/notificationNavigation';
import { safePush } from '@/lib/safeRouter';

export function NotificationBootstrap() {
  useEffect(() => {
    void syncPushTokensWithServer();

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) void recordSessionNotification(response.notification);
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncPushTokensWithServer();
      }
    });

    const removeReceivedListener = addNotificationReceivedListener();

    const removeNavListener = addNotificationResponseListener(({ bookingId, status, role }) => {
      void (async () => {
        if (!bookingId) return;
        const allowed = await canNavigateFromNotification({ bookingId, status, role });
        if (!allowed) return;
        if (status === 'IN_PROGRESS' && role === 'DISPATCHER') {
          safePush('/dispatcher-ongoing-trip');
          return;
        }
        if (status === 'IN_PROGRESS' && role === 'USER') {
          safePush('/ongoing-trip');
          return;
        }
        safePush({ pathname: '/booking-details', params: { id: bookingId } });
      })();
    });

    return () => {
      appStateSub.remove();
      removeReceivedListener();
      removeNavListener();
    };
  }, []);

  return null;
}
