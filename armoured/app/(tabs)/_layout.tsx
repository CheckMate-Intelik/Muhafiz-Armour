import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useStore } from '@/store/store';
import { useBookingsStore } from '@/store/bookingsStore';

const SNOOZE_KEY = 'armoured:ongoing-trip-snooze:v1';
const IN_MEMORY_SNOOZE_KEY = '__armouredOngoingTripSnoozeUntilMs';

type Snooze = { untilMs: number };

export default function TabLayout() {
  const pathname = usePathname();
  const activeRole = useStore((s) => s.activeRole);
  const hydrate = useStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (activeRole === 'DISPATCHER') {
      router.replace('/(dispatcher-tabs)' as any);
    }
  }, [activeRole]);

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
      if (activeRole !== 'USER') return;
      if (pathname === '/login' || pathname === '/signup' || pathname === '/booking-details') return;
      try {
        // Re-read snooze each time because this layout stays mounted
        // when the user dismisses the ongoing trip screen.
        snooze = await readSnooze();
        if (snooze) return;

        await useBookingsStore.getState().refreshUserBookings();
        const rows = useBookingsStore.getState().userBookings;
        const ongoing = Array.isArray(rows) ? rows.find((b) => b.status === 'IN_PROGRESS') : undefined;
        if (cancelled) return;
        if (!ongoing?.id) {
          if (snooze) {
            snooze = null;
            await clearSnooze();
          }
          return;
        }

        router.replace({ pathname: '/booking-details' as any, params: { id: ongoing.id, live: '1' } });
      } catch {
        // Ignore: screens already handle login redirects.
      }
    }

    let sub: any = null;
    void (async () => {
      snooze = await readSnooze();
      await checkOngoing();

      // If user dismissed the ongoing trip screen, do not start polling/redirecting.
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
  }, [pathname, activeRole]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#1D2DD9',
        tabBarInactiveTintColor: '#111827',
        tabBarStyle: {
          position: 'absolute',
          // left: 16,
          // right: 16,
          width: '90%',
          marginLeft: '5%',
          bottom: 40,
          // paddingHorizontal: 10,
          // paddingVertical: 10,
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
                // paddingHorizontal: focused ? 14 : 0,
                // paddingVertical: 10,
                borderRadius: 100,
                backgroundColor: focused ? 'black' : 'transparent',
                height: 46,
                width: focused ? '350%' : 52,
              }}>
              <FontAwesome name="home" size={focused ? 24 : 28} color={focused ? '#C9B37A' : 'black'} />
              {focused && (
                <Text
                  style={{
                    color: '#C9B37A',
                    marginLeft: 8,
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  Home
                </Text>
              )}
            </View>
          ),
          tabBarButton: (props) => <Pressable {...(props as any)} />,
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 100,
                backgroundColor: focused ? 'black' : 'transparent',
                height: 46,
                width: focused ? '350%' : 52,
              }}>
              <FontAwesome name="history" size={focused ? 24 : 28} color={focused ? '#C9B37A' : 'black'} />
              {focused && (
                <Text
                  style={{
                    color: '#C9B37A',
                    marginLeft: 8,
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  History
                </Text>
              )}
            </View>
          ),
          tabBarButton: (props) => <Pressable {...(props as any)} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                // paddingHorizontal: focused ? 14 : 0,
                // paddingVertical: 10,
                borderRadius: 100,
                backgroundColor: focused ? 'black' : 'transparent',
                height: 46,
                width: focused ? '350%' : 52,
              }}>
              <FontAwesome name="user" size={focused ? 24 : 28} color={focused ? '#C9B37A' : 'black'}/>
              {focused && (
                <Text
                  style={{
                    color: '#C9B37A',
                    marginLeft: 8,
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
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
