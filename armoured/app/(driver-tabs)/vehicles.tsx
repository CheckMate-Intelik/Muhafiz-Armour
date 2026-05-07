import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { VehicleCard } from '@/components/VehicleCard';
import { driverGet, ensureDriverSession } from '@/lib/api';

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
      } catch {
        if (!cancelled) router.replace('/login' as any);
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
    <SafeAreaView className="flex-1 bg-[#F4F5F7]">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-center">
          <Text className="text-base font-extrabold text-gray-900">Vehicles</Text>
        </View>

        <View className="mt-4 flex-row rounded-2xl bg-gray-200 p-1">
          {(['Approved', 'Pending'] as const).map((t) => {
            const activeTab = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                className={`flex-1 items-center justify-center rounded-2xl py-3 ${activeTab ? 'bg-gray-800' : ''}`}>
                <Text className={`text-xs font-extrabold ${activeTab ? 'text-white' : 'text-gray-500'}`}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/register-vehicle')}
        className="absolute bottom-[120px] left-1/2 z-10 w-[150px] -translate-x-1/2 flex-row items-center justify-center rounded-full bg-gray-800 py-5">
        <FontAwesome name="plus" size={14} color="#FFFFFF" />
        <Text className="ml-2 text-xs font-bold text-white">Add vehicle</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: 180 }} className="px-5 pt-4">
        {loading ? (
          <View className="mt-10 items-center">
            <Text className="text-sm font-semibold text-gray-500">Loading...</Text>
          </View>
        ) : null}

        {!loading && list.length === 0 ? (
          <View className="mt-10 items-center">
            <View className="h-14 w-14 items-center justify-center rounded-3xl bg-gray-100">
              <FontAwesome name="car" size={20} color="#111827" />
            </View>
            <Text className="mt-4 text-base font-extrabold text-gray-900">No vehicles</Text>
            <Text className="mt-1 text-xs font-semibold text-gray-500">
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
              // className="mb-3 w-[48.5%] rounded-2xl bg-white p-2.5"
              showStatus
              showDriverHeader={false}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
