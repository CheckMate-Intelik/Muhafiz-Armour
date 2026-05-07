import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { driverGet, ensureDriverSession } from '@/lib/api';
import { useStore } from '@/store/store';

type ActiveBooking = { id: string; status: string };
type Snooze = { untilMs: number };

const SNOOZE_KEY = 'armoured_driver:ongoing-trip-snooze:v1';
const IN_MEMORY_SNOOZE_KEY = '__armouredDriverOngoingTripSnoozeUntilMs';

export default function DriverTabLayout() {
  const pathname = usePathname();
  const activeRole = useStore((s) => s.activeRole);
  const hydrate = useStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (activeRole === 'USER') {
      router.replace('/(tabs)' as any);
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
      if (activeRole !== 'DRIVER') return;
      if (pathname === '/login' || pathname === '/signup' || pathname === '/driver-ongoing-trip') return;
      try {
        snooze = await readSnooze();
        if (snooze) return;

        const s = await ensureDriverSession();
        const rows = await driverGet<ActiveBooking[]>(`/driver/bookings/active`, s.driverId);
        const ongoing = Array.isArray(rows) ? rows.find((b) => b.status === 'IN_PROGRESS') : undefined;
        if (cancelled) return;
        if (!ongoing?.id) {
          if (snooze) {
            snooze = null;
            await clearSnooze();
          }
          return;
        }
        router.replace({ pathname: '/driver-ongoing-trip' as any, params: { bookingId: ongoing.id } });
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
          bottom: 40,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgb(31, 41, 55)',
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          height: 58,
          width: '95%',
          marginLeft: '2.5%',
          paddingTop: 10,
          paddingBottom: 10,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        },
        tabBarItemStyle: {
          height: 52,
        },
      }}>
        <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 100,
                backgroundColor: focused ? 'white' : 'transparent',
                height: 46,
                width: focused ? 120 : 52,
                marginLeft: focused ? 30 : 0,
              }}>
              <FontAwesome name="bar-chart" size={20} color={focused ? 'rgb(31, 41, 55)' : 'white'} />
              {focused && (
                <Text
                  style={{
                    color: 'rgb(31, 41, 55)',
                    marginLeft: 8,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  Dashboard
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
                backgroundColor: focused ? 'white' : 'transparent',
                height: 46,
                // marginLeft: focused ? 20 : 0,
                width: focused ? 110 : 52,
              }}>
              <FontAwesome name="list-alt" size={20} color={focused ? 'rgb(31, 41, 55)' : 'white'} />
              {focused && (
                <Text
                  style={{
                    color: 'rgb(31, 41, 55)',
                    marginLeft: 8,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
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
                backgroundColor: focused ? 'white' : 'transparent',
                height: 46,
                width: focused ? 110 : 52,
              }}>
              <FontAwesome name="car" size={20} color={focused ? 'rgb(31, 41, 55)' : 'white'} />
              {focused && (
                <Text
                  style={{
                    color: 'rgb(31, 41, 55)',
                    marginLeft: 8,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  Vehicles
                </Text>
              )}
            </View>
          ),
          tabBarButton: (props) => <Pressable {...(props as any)} />,
        }}
      />
      <Tabs.Screen
        name="driver"
        options={{
          title: 'Driver',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 100,
                backgroundColor: focused ? 'white' : 'transparent',
                height: 46,
                width: focused ? 90 : 52,
              }}>
              <FontAwesome name="user" size={20} color={focused ? 'rgb(31, 41, 55)' : 'white'} />
              {focused && (
                <Text
                  style={{
                    color: 'rgb(31, 41, 55)',
                    marginLeft: 8,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  Driver
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
