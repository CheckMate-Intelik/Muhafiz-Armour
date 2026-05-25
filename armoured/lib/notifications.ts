import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  apiDelete,
  apiPost,
  dispatcherDelete,
  dispatcherPost,
  getActiveRole,
  getStoredDispatcherSession,
  getStoredUserSession,
} from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, unknown>;
    const targetRole = typeof data.role === 'string' ? data.role : null;
    const activeRole = await getActiveRole();
    const show =
      !targetRole || targetRole === activeRole || (targetRole !== 'USER' && targetRole !== 'DISPATCHER');

    return {
      shouldShowAlert: show,
      shouldPlaySound: show,
      shouldSetBadge: false,
      shouldShowBanner: show,
      shouldShowList: show,
    };
  },
});

export type PushRegistrationResult = {
  expoPushToken: string;
  platform: 'ios' | 'android';
};

export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult | null> {
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Bookings',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  if (!projectId) {
    console.warn('EAS projectId missing; cannot register for push notifications.');
    return null;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenResponse.data?.trim();
  if (!expoPushToken) return null;

  return {
    expoPushToken,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  };
}

export async function syncPushTokensWithServer(): Promise<void> {
  const registration = await registerForPushNotificationsAsync();
  if (!registration) return;

  const body = {
    expoPushToken: registration.expoPushToken,
    platform: registration.platform,
  };

  const activeRole = await getActiveRole();
  if (activeRole === 'DISPATCHER') {
    const dispatcher = await getStoredDispatcherSession();
    if (dispatcher?.dispatcherId) {
      await dispatcherPost('/notifications/register', dispatcher.dispatcherId, body).catch(() => null);
    }
    return;
  }

  const user = await getStoredUserSession();
  if (user?.userId) {
    await apiPost('/notifications/register', user.userId, body).catch(() => null);
  }
}

export async function unregisterPushTokensFromServer(): Promise<void> {
  const registration = await registerForPushNotificationsAsync();
  if (!registration) return;

  const body = {
    expoPushToken: registration.expoPushToken,
    platform: registration.platform,
  };

  const [user, dispatcher] = await Promise.all([getStoredUserSession(), getStoredDispatcherSession()]);

  const tasks: Promise<unknown>[] = [];
  if (user?.userId) {
    tasks.push(apiDelete('/notifications/register', user.userId, body).catch(() => null));
  }
  if (dispatcher?.dispatcherId) {
    tasks.push(dispatcherDelete('/notifications/register', dispatcher.dispatcherId, body).catch(() => null));
  }
  await Promise.all(tasks);
}

export function addNotificationResponseListener(
  onNavigate: (data: { bookingId?: string; status?: string; role?: string }) => void,
) {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    onNavigate({
      bookingId: typeof data.bookingId === 'string' ? data.bookingId : undefined,
      status: typeof data.status === 'string' ? data.status : undefined,
      role: typeof data.role === 'string' ? data.role : undefined,
    });
  });
  return () => sub.remove();
}
