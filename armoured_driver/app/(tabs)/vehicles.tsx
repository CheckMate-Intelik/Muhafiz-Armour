import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { driverGet, ensureDriverSession } from '@/lib/api';

type VehicleTab = 'Approved' | 'Pending';

type Vehicle = {
  id: string;
  type: string;
  baseRatePerHour: number;
  location: string;
  isApproved: boolean;
};

export default function VehiclesScreen() {
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
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-center">
          <Text className="text-base font-extrabold text-gray-900">Vehicles</Text>
        </View>


        <View className="mt-4 flex-row rounded-2xl bg-gray-100 p-1">
          {(['Approved', 'Pending'] as const).map((t) => {
            const activeTab = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                className={`flex-1 items-center justify-center rounded-2xl py-3 ${activeTab ? 'bg-[#1D2DD9]' : ''}`}>
                <Text className={`text-xs font-extrabold ${activeTab ? 'text-white' : 'text-gray-500'}`}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/register-vehicle')}
        className="mt-4 mx-5 flex-row items-center justify-center rounded-2xl bg-[#1D2DD9] py-5">
        <FontAwesome name="plus" size={14} color="#FFFFFF" />
        <Text className="ml-2 text-xs font-extrabold text-white">Register vehicle</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
        {loading ? (
          <View className="mt-10 items-center">
            <Text className="text-sm font-semibold text-gray-500">Loading…</Text>
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

        {list.map((v) => (
          <View key={v.id} className="mb-4 rounded-3xl bg-white p-4" style={cardShadow}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-400">Type</Text>
                <Text className="mt-1 text-base font-extrabold text-gray-900">{v.type}</Text>
                <Text className="mt-2 text-xs font-semibold text-gray-500">
                  {v.location} • ${v.baseRatePerHour}/hr
                </Text>
              </View>
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
                <FontAwesome name="car" size={16} color="#111827" />
              </View>
            </View>

            <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <Text className="text-xs font-extrabold text-gray-900">Status</Text>
              <Text className={`text-xs font-extrabold ${v.isApproved ? 'text-green-600' : 'text-amber-600'}`}>
                {v.isApproved ? 'Approved' : 'Pending'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

