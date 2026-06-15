import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { SubTabSelector } from '@/components/SubTabSelector';
import { VehicleCard } from '@/components/VehicleCard';
import { dispatcherGet, ensureDispatcherSession, isNotAuthenticatedError } from '@/lib/api';
import { redirectToLogin } from '@/lib/safeRouter';
import ModalSelector from '@/components/ModalSelector';
import { colors, gradientProps, gradients } from '@/constants/theme';

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
      colors={[...gradients.screen]}
      {...gradientProps.screen}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[20px] font-bold" style={{ color: colors.gold }}>
                My Vehicles
              </Text>
              {/* <Text className="text-lg font-semibold text-gray-200">Your fleet</Text> */}
            </View>
          </View>

          <View className="mt-4 flex-row items-center justify-between gap-2">
            <View className="flex-1">
              <ModalSelector
                tabs={[
                  { key: 'Approved', label: 'Approved', icon: 'check' },
                  { key: 'Pending', label: 'Pending', icon: 'clock-o' },
                ]}
                activeKey={tab}
                onChange={(key) => setTab(key as VehicleTab)}
              />
            </View>
            <Pressable
              onPress={() => router.push('/register-vehicle')}
              // className="absolute bottom-[120px] left-1/2 z-10 -translate-x-1/2"
              className="z-10"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.25,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10,
              }}>
              <View
                className="bg-[#222222]"
                style={{
                  // minWidth: 170,
                  borderRadius: 8,
                  // borderWidth: 1,
                  // borderColor: '#C9B37A',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  backgroundColor: colors.surface,
                }}>
                <View className="flex-row items-center justify-center">
                  <FontAwesome name="plus" size={14} color={colors.gold} />
                  <Text className="ml-2 text-sm font-bold" style={{ color: colors.gold }}>
                    Add vehicle
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>
        </View>

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
                <FontAwesome name="car" size={20} color={colors.textSecondary} />
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
