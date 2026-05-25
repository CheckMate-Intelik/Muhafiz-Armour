import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useNavigationReady } from '@/hooks/useNavigationReady';
import { safeReplace } from '@/lib/safeRouter';
import { useStore } from '@/store/store';
import { useBookingsStore } from '@/store/bookingsStore';

type Snooze = { untilMs: number };

const SNOOZE_KEY = 'armoured_dispatcher:ongoing-trip-snooze:v1';
const IN_MEMORY_SNOOZE_KEY = '__armouredDispatcherOngoingTripSnoozeUntilMs';

export default function DispatcherTabLayout() {
  const pathname = usePathname();
  const activeRole = useStore((s) => s.activeRole);
  const hydrate = useStore((s) => s.hydrate);
  const navigationReady = useNavigationReady();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!navigationReady) return;
    if (activeRole === 'USER') {
      safeReplace('/(tabs)' as any);
    }
  }, [activeRole, navigationReady]);

  useEffect(() => {
    let cancelled = false;
    let interval: any = null;
    let snooze: Snooze | null = null;

    async function readSnooze() {
      const inMemoryUntil = Number((globalThis as any)[IN_MEMORY_SNOOZE_KEY] ?? 0);
      if (Number.isFinite(inMemoryUntil) && inMemoryUntil > Date.now()) {
        return { untilMs: inMemoryUntil };
      }
      try {
        const raw = await AsyncStorage.getItem(SNOOZE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<Snooze>;
        if (typeof parsed.untilMs !== 'number') return null;
        if (Date.now() > parsed.untilMs) return null;
        return { untilMs: parsed.untilMs };
      } catch {
        return null;
      }
    }

    async function clearSnooze() {
      (globalThis as any)[IN_MEMORY_SNOOZE_KEY] = 0;
      try {
        await AsyncStorage.removeItem(SNOOZE_KEY);
      } catch {
        // ignore
      }
    }

    async function checkOngoing() {
      if (!navigationReady) return;
      if (activeRole !== 'DISPATCHER') return;
      if (pathname === '/login' || pathname === '/signup' || pathname === '/booking-details')
        return;
      try {
        snooze = await readSnooze();
        if (snooze) return;

        await useBookingsStore.getState().refreshDispatcherBookings();
        const rows = useBookingsStore.getState().dispatcherActive;
        const ongoing = Array.isArray(rows)
          ? rows.find((b) => b.status === 'IN_PROGRESS')
          : undefined;
        if (cancelled) return;
        if (!ongoing?.id) {
          if (snooze) {
            snooze = null;
            await clearSnooze();
          }
          return;
        }
        safeReplace({ pathname: '/booking-details' as any, params: { id: ongoing.id, live: '1' } });
      } catch {
        // Ignore: screens already handle login redirects.
      }
    }

    let sub: any = null;
    void (async () => {
      snooze = await readSnooze();
      await checkOngoing();
      if (snooze) return;

      sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') void checkOngoing();
      });
      interval = setInterval(() => {
        void checkOngoing();
      }, 5000);
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (sub) sub.remove();
    };
  }, [pathname, activeRole, navigationReady]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#1D2DD9',
        tabBarInactiveTintColor: '#111827',
        tabBarStyle: {
          position: 'absolute',
          width: '90%',
          marginLeft: '5%',
          bottom: 40,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgb(193, 155, 59)',
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          height: 58,
          paddingTop: 10,
          paddingBottom: 10,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        },
        tabBarItemStyle: {
          height: 52,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 100,
                backgroundColor: focused ? 'black' : 'transparent',
                height: 46,
                width: focused ? '300%' : '100%',
                marginLeft: '50%',
              }}>
              <FontAwesome
                name="home"
                size={focused ? 24 : 28}
                color={focused ? '#C9B37A' : 'black'}
              />
              {focused && (
                <Text
                  style={{
                    color: '#C9B37A',
                    marginLeft: 8,
                    fontSize: 15,
                    fontWeight: '600',
                  }}>
                  Home
                </Text>
              )}
            </View>
          ),
          tabBarButton: (props) => <Pressable {...(props as any)} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 100,
                backgroundColor: focused ? 'black' : 'transparent',
                height: 46,
                width: focused ? '370%' : '100%',
              }}>
              <FontAwesome
                name="list-alt"
                size={focused ? 24 : 28}
                color={focused ? '#C9B37A' : 'black'}
              />
              {focused && (
                <Text
                  style={{
                    color: '#C9B37A',
                    marginLeft: 8,
                    fontSize: 15,
                    fontWeight: '600',
                  }}>
                  Bookings
                </Text>
              )}
            </View>
          ),
          tabBarButton: (props) => <Pressable {...(props as any)} />,
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Vehicles',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 100,
                backgroundColor: focused ? 'black' : 'transparent',
                height: 46,
                width: focused ? '350%' : '100%',
              }}>
              <FontAwesome
                name="car"
                size={focused ? 24 : 28}
                color={focused ? '#C9B37A' : 'black'}
              />
              {focused && (
                <Text
                  style={{
                    color: '#C9B37A',
                    marginLeft: 8,
                    fontSize: 15,
                    fontWeight: '600',
                  }}>
                  Vehicles
                </Text>
              )}
            </View>
          ),
          tabBarButton: (props) => <Pressable {...(props as any)} />,
        }}
      />
      <Tabs.Screen
        name="dispatcher"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 100,
                backgroundColor: focused ? 'black' : 'transparent',
                height: 46,
                width: focused ? '300%' : '100%',
                marginRight: '50%',
              }}>
              <FontAwesome
                name="user"
                size={focused ? 24 : 28}
                color={focused ? '#C9B37A' : 'black'}
              />
              {focused && (
                <Text
                  style={{
                    color: '#C9B37A',
                    marginLeft: 8,
                    fontSize: 15,
                    fontWeight: '600',
                  }}>
                  Profile
                </Text>
              )}
            </View>
          ),
          tabBarButton: (props) => <Pressable {...(props as any)} />,
        }}
      />
    </Tabs>
  );
}
