import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { BookingDetailsBody } from '@/components/BookingDetailsBody';
import { driverPatch, ensureDriverSession } from '@/lib/api';
import { useStore } from '@/store/store';
import { LinearGradient } from 'expo-linear-gradient';

type BookingParams = {
  id?: string;
  pickupLocation?: string;
  dropLocation?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  totalPrice?: string;
  driverName?: string;
  customerName?: string;
  vehicleArmour?: string;
  vehicleType?: string;
  vehicleName?: string;
};

export default function BookingDetailsScreen() {
  const params = useLocalSearchParams<BookingParams>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const activeRole = useStore((s) => s.activeRole);
  const isDriverMode = activeRole === 'DRIVER';
  const payout = Number(params.totalPrice ?? '');
  const payoutLabel = Number.isFinite(payout) ? `Rs ${payout.toFixed(2)}` : '—';
  const personLabel = isDriverMode ? 'Customer' : 'Driver';
  const personName = isDriverMode ? params.customerName ?? '—' : params.driverName ?? '—';
  const statusLabel = params.status ?? '—';

  async function startTrip(bookingId: string) {
    try {
      setBusyId(bookingId);
      const s = await ensureDriverSession();
      await driverPatch(`/driver/bookings/${bookingId}/start`, s.driverId);
      router.push({ pathname: '/driver-ongoing-trip' as any, params: { bookingId } });
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Start trip failed');
    } finally {
      setBusyId(null);
    }
  }

  async function cancelTrip(bookingId: string) {
    Alert.alert('Cancel trip?', 'This will cancel the selected trip.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusyId(bookingId);
            const s = await ensureDriverSession();
            await driverPatch(`/driver/bookings/${bookingId}/cancel`, s.driverId);
            router.back();
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Cancel trip failed');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  return (        
    <LinearGradient 
      colors={['rgb(77, 76, 76)', 'rgb(165, 165, 165)','rgb(235, 235, 235)','rgb(247, 248, 255)']} 
      start={{ x: 1, y: 0 }} 
      end={{ x: 1, y: 1 }}
      locations={[0, 0.3, 0.5, 1]}
      style={{ flex: 1 }}>
    <SafeAreaView className="flex-1">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="arrow-left" size={16} color="#111827" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-200">Booking details</Text>
          <View className="h-10 w-10" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-5 pt-4">
        <BookingDetailsBody
          personLabel={personLabel}
          personName={personName}
          statusLabel={statusLabel}
          payoutLabel={payoutLabel}
          vehicleName={params.vehicleName ?? '—'}
          vehicleType={params.vehicleType ?? '—'}
          vehicleArmour={params.vehicleArmour ?? '—'}
          bookingId={params.id ?? '—'}
          pickupLocation={params.pickupLocation ?? '—'}
          dropLocation={params.dropLocation ?? '—'}
          startTime={params.startTime ?? ''}
          endTime={params.endTime ?? ''}
        />

        {statusLabel === 'CONFIRMED' ? (
          <View className="mt-4 flex-row gap-3">
            <Pressable
              disabled={busyId === params.id}
              onPress={() => {
                const id = params.id;
                if (id) void cancelTrip(id);
              }}
              className={`flex-1 items-center justify-center rounded-full py-4 ${
                busyId === params.id ? 'bg-gray-200' : 'bg-red-600'
              }`}>
              <Text className={`text-sm font-bold ${busyId === params.id ? 'text-gray-500' : 'text-white'}`}>
                {busyId === params.id ? 'Please wait...' : 'Cancel trip'}
              </Text>
            </Pressable>
            {activeRole === 'DRIVER' ? (
              <Pressable
                disabled={busyId === params.id}
                onPress={() => {
                  const id = params.id;
                  if (id) void startTrip(id);
                }}
                className={`flex-1 items-center justify-center rounded-full py-3 ${
                  busyId === params.id ? 'bg-gray-300' : 'bg-gray-800'
                }`}>
                <Text className="text-sm font-bold text-white">
                  {busyId === params.id ? 'Please wait...' : 'Start trip'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : statusLabel === 'IN_PROGRESS' ? (
          <Pressable
            disabled={busyId === params.id}
            onPress={() => {
              const id = params.id;
              if (!id) return;
              router.push({
                pathname: (isDriverMode ? '/driver-ongoing-trip' : '/ongoing-trip') as any,
                params: { bookingId: id },
              });
            }}
            className={`mt-4 rounded-2xl bg-white px-4 py-3 border-2 border-green-500 ${
              busyId === params.id ? 'opacity-50' : ''
            }`}>
            <Text className="text-sm font-extrabold text-green-600">Ongoing trip</Text>
            <Text className="mt-1 text-[12px] font-semibold text-gray-600">
              {params.pickupLocation ?? '—'}
              {' -> '}
              {params.dropLocation ?? '—'}
            </Text>
            <Text className="text-[12px] font-semibold text-gray-500">
              {personName} • {params.vehicleType || params.vehicleArmour || '—'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
}
