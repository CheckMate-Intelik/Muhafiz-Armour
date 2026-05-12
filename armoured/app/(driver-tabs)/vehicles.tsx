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
      colors={['rgb(51, 47, 56)', 'rgb(88, 88, 90)', 'rgb(112, 112, 112)', 'rgb(202, 202, 202)', 'rgb(247, 248, 255)']}
      start={{ x: 1, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.4, 0.7, 0.9, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4">
          <View className="flex-row items-center">
            <Text className="text-2xl font-extrabold text-gray-100" style={{ letterSpacing: 0.8 }}>
              VEHICLES
            </Text>
          </View>

          <View className="mt-4 flex-row overflow-hidden rounded-xl bg-[#2F3135]">
            {(['Approved', 'Pending'] as const).map((t, idx) => {
              const active = tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  className="flex-1"
                  style={{
                    borderLeftWidth: idx === 0 ? 0 : 1,
                    borderLeftColor: '#515458',
                  }}>
                  <View
                    className="items-center justify-center px-1 py-3"
                    style={{
                      borderWidth: active ? 2 : 0,
                      borderColor: active ? 'black' : 'transparent',
                      borderRadius: 10,
                      margin: 6,
                    }}>
                    <FontAwesome
                      name={t === 'Approved' ? 'check' : 'clock-o'}
                      size={18}
                      color={active ? '#E5E7EB' : '#B8BBC0'}
                    />
                    <Text
                      className="mt-1 text-[10px] font-extrabold"
                      style={{ color: active ? '#E5E7EB' : '#B8BBC0' }}>
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
          className="absolute bottom-[120px] left-1/2 z-10 w-[160px] -translate-x-1/2 flex-row items-center justify-center rounded-full bg-[#1D2DD9] py-4 shadow-lg"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}>
          <FontAwesome name="plus" size={14} color="#FFFFFF" />
          <Text className="ml-2 text-xs font-extrabold text-white">Add vehicle</Text>
        </Pressable>

        <ScrollView contentContainerStyle={{ paddingBottom: 180 }} className="px-5 pt-4">
          {loading ? (
            <View className="mt-10 items-center">
              <Text className="text-sm font-semibold text-gray-400">Loading…</Text>
            </View>
          ) : null}

          {!loading && list.length === 0 ? (
            <View className="mt-10 items-center">
              <View className="h-14 w-14 items-center justify-center rounded-3xl bg-[#2F3135]">
                <FontAwesome name="car" size={20} color="#B8BBC0" />
              </View>
              <Text className="mt-4 text-lg font-extrabold text-gray-200">No vehicles</Text>
              <Text className="mt-1 text-sm font-semibold text-gray-200">
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
