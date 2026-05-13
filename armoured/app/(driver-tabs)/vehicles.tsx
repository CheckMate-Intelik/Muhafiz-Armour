import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { VehicleCard } from '@/components/VehicleCard';
import { driverGet, ensureDriverSession, isNotAuthenticatedError } from '@/lib/api';

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

export default function DriverVehiclesScreen() {
  const [tab, setTab] = useState<VehicleTab>('Approved');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVehicles = useCallback(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        const s = await ensureDriverSession();
        const data = await driverGet<Vehicle[]>(`/driver/vehicles`, s.driverId);
        if (cancelled) return;
        setVehicles(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled && isNotAuthenticatedError(e)) {
          router.replace('/login' as any);
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
              <Text className="text-[18px] font-semibold text-gray-200">Vehicles</Text>
              <Text className="text-lg font-semibold text-gray-200">Your fleet</Text>
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
                  <View
                    className="items-center justify-center px-1 py-3"
                    style={{
                      backgroundColor: active ? '#C9B37A' : 'transparent',
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
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/register-vehicle')}
          className="absolute bottom-[120px] left-1/2 z-10 w-[170px] -translate-x-1/2 flex-row items-center justify-center rounded-full py-4 shadow-lg"
          style={{
            backgroundColor: '#C9B37A',
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}>
          <FontAwesome name="plus" size={14} color="#0B0F14" />
          <Text className="ml-2 text-xs font-extrabold" style={{ color: '#0B0F14' }}>Add vehicle</Text>
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
                {tab === 'Approved' ? 'Your approved vehicles will appear here.' : 'Your pending vehicles will appear here.'}
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
