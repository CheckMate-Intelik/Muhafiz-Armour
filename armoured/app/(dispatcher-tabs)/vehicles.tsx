import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { VehicleCard } from '@/components/VehicleCard';
import { dispatcherGet, ensureDispatcherSession, isNotAuthenticatedError } from '@/lib/api';
import { redirectToLogin } from '@/lib/safeRouter';

type VehicleTab = 'Approved' | 'Pending';

type Vehicle = {
  id: string;
  armourLevel: string;
  vehicleType: string;
  carModel?: string | null;
  manufacturer?: string | null;
  generation?: string | null;
  year?: number | null;
  color?: string | null;
  numberPlate?: string | null;
  registrationNumber?: string | null;
  imageUrls?: string[];
  baseRatePerHour: number;
  location: string;
  isApproved: boolean;
};

export default function DispatcherVehiclesScreen() {
  const [tab, setTab] = useState<VehicleTab>('Approved');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVehicles = useCallback(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        const s = await ensureDispatcherSession();
        const data = await dispatcherGet<Vehicle[]>(`/dispatcher/vehicles`, s.dispatcherId);
        if (cancelled) return;
        setVehicles(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled && isNotAuthenticatedError(e)) {
          redirectToLogin();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(loadVehicles);

  const approved = useMemo(() => vehicles.filter((v) => v.isApproved), [vehicles]);
  const pending = useMemo(() => vehicles.filter((v) => !v.isApproved), [vehicles]);
  const list = tab === 'Approved' ? approved : pending;

  return (
    <LinearGradient
      colors={['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[20px] font-bold text-[#C9B37A]">My Vehicles</Text>
              {/* <Text className="text-lg font-semibold text-gray-200">Your fleet</Text> */}
            </View>
          </View>

          <View
            className="mt-4 flex-row overflow-hidden rounded-xl"
            style={{ backgroundColor: '#2F3135' }}>
            {(['Approved', 'Pending'] as const).map((t, idx) => {
              const active = tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  className="flex-1"
                  style={{
                    borderLeftWidth: idx === 0 ? 0 : 1,
                    borderLeftColor: 'rgba(255,255,255,0.08)',
                  }}>
                  <LinearGradient
                    colors={
                      active
                        ? ['rgb(204, 155, 31)', 'rgb(201, 179, 122)']
                        : ['rgb(37, 37, 37)', 'rgb(0, 0, 0)']
                    }
                    start={{ x: 1, y: 0 }}
                    end={{ x: 1, y: 1 }}>
                    <View
                      className="items-center justify-center px-1 py-3"
                      style={{
                        height: 70,
                      }}>
                      <FontAwesome
                        name={t === 'Approved' ? 'check' : 'clock-o'}
                        size={22}
                        color={active ? '#0B0F14' : '#B8BBC0'}
                      />
                      <Text
                        className="mt-1 text-sm font-extrabold"
                        style={{ color: active ? '#0B0F14' : '#B8BBC0' }}>
                        {t.toUpperCase()}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/register-vehicle')}
          className="absolute bottom-[120px] left-1/2 z-10 -translate-x-1/2"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}>
          <LinearGradient
            colors={['rgb(37, 37, 37)', 'rgb(0, 0, 0)']}
            start={{ x: 1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              minWidth: 170,
              borderRadius: 9999,
              borderWidth: 1,
              borderColor: '#C9B37A',
              paddingVertical: 16,
              paddingHorizontal: 20,
            }}>
            <View className="flex-row items-center justify-center">
              <FontAwesome name="plus" size={14} color="#0B0F14" />
              <Text className="ml-2 text-sm font-bold" style={{ color: '#C9B37A' }}>
                Add vehicle
              </Text>
            </View>
          </LinearGradient>
        </Pressable>

        <ScrollView contentContainerStyle={{ paddingBottom: 180 }} className="px-5 pt-4">
          {loading ? (
            <View className="mt-10 items-center">
              <Text className="text-sm font-semibold text-gray-300">Loading…</Text>
            </View>
          ) : null}

          {!loading && list.length === 0 ? (
            <View className="mt-10 items-center">
              <View
                className="h-14 w-14 items-center justify-center rounded-3xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <FontAwesome name="car" size={20} color="#9CA3AF" />
              </View>
              <Text className="mt-4 text-lg font-extrabold text-gray-200">No vehicles</Text>
              <Text className="mt-1 text-sm font-semibold text-gray-300">
                {tab === 'Approved'
                  ? 'Your approved vehicles will appear here.'
                  : 'Your pending vehicles will appear here.'}
              </Text>
            </View>
          ) : null}

          <View className="flex-row flex-wrap justify-between">
            {list.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                onPress={() =>
                  router.push({
                    pathname: '/car-details' as any,
                    params: { vehicleId: v.id, readonly: '1' },
                  })
                }
                appearance="dark"
                showStatus
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
