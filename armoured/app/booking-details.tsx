import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/store/store';
import { driverGet, driverPatch, ensureDriverSession } from '@/lib/api';
import { useState } from 'react';


export default function BookingDetailsScreen() {
  const params = useLocalSearchParams<BookingParams>();
  const [requests, setRequests] = useState<Booking[]>([]);
  const [history, setHistory] = useState<Booking[]>([]);
  const [active, setActive] = useState<Booking[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const activeRole = useStore((s) => s.activeRole);
  const isDriverMode = activeRole === 'DRIVER';
  const payout = Number(params.totalPrice ?? '');
  const payoutLabel = Number.isFinite(payout) ? `$${payout.toFixed(2)}` : '—';
  const personLabel = isDriverMode ? 'Customer' : 'Driver';
  const personName = isDriverMode ? params.customerName ?? '—' : params.driverName ?? '—';
  const statusLabel = params.status ?? '—';

  type Booking = {
    id: string;
    pickupLocation: string;
    dropLocation: string;
    status: string;
    startTime: string;
    endTime: string;
    totalPrice: number | null;
    user?: { name: string } | null;
    vehicle?: {
      armourLevel: string;
      vehicleType: string;
      baseRatePerHour: number;
      location: string;
      manufacturer?: string | null;
      carModel?: string | null;
    } | null;
  };
  
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
  
  async function refresh() {
    const s = await ensureDriverSession();
    const [req, done, act] = await Promise.all([
      driverGet<Booking[]>(`/driver/requests`, s.driverId),
      driverGet<Booking[]>(`/driver/bookings/completed`, s.driverId),
      driverGet<Booking[]>(`/driver/bookings/active`, s.driverId),
    ]);
    setRequests(Array.isArray(req) ? req : []);
    setHistory(Array.isArray(done) ? done : []);
    setActive(Array.isArray(act) ? act : []);
  }
  
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
            await refresh();
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
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="arrow-left" size={16} color="#111827" />
          </Pressable>
          <Text className="text-base font-extrabold text-gray-900">Booking details</Text>
          <View className="h-10 w-10" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-5 pt-4">
        <View className="flex-row items-stretch gap-2">
          <View className="flex-1 rounded-3xl bg-white p-3" style={cardShadow}>
            <Text className="text-[11px] font-bold text-gray-400">{personLabel}</Text>
            <View className="mt-2 flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <FontAwesome name="user" size={14} color="#111827" />
              </View>
              <Text className="ml-2 flex-1 text-sm font-extrabold text-gray-900" numberOfLines={1}>
                {personName}
              </Text>
            </View>
          </View>
          <View className="w-[30%] rounded-3xl bg-white p-3" style={cardShadow}>
            <Text className="text-[11px] font-bold text-gray-400">Status</Text>
            <Text className="mt-2 text-xs font-extrabold text-gray-900" numberOfLines={2}>
              {statusLabel}
            </Text>
          </View>
          <View className="w-[30%] rounded-3xl bg-white p-3" style={cardShadow}>
            <Text className="text-[11px] font-bold text-gray-400">Payout</Text>
            <Text className="mt-2 text-sm font-extrabold text-[#1D2DD9]" numberOfLines={2}>
              {payoutLabel}
            </Text>
          </View>
        </View>

        <View className="mt-3 rounded-3xl bg-white p-4" style={cardShadow}>
          <Text className="text-[11px] font-bold text-gray-400">Car details</Text>
          <View className="mt-2">
            <Text className="text-[11px] font-bold text-gray-400">Car name</Text>
            <Text className="mt-1 text-sm font-extrabold text-gray-900">{params.vehicleName ?? '—'}</Text>
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <View className="rounded-full bg-gray-100 px-3 py-1">
              <Text className="text-[10px] font-extrabold text-gray-800">{params.vehicleArmour ?? '—'}</Text>
            </View>
            <View className="rounded-full bg-gray-100 px-3 py-1">
              <Text className="text-[10px] font-extrabold text-gray-800">{params.vehicleType ?? '—'}</Text>
            </View>
          </View>
          <View className="mt-3">
            <Text className="text-[11px] font-bold text-gray-400">Booking ID</Text>
            <Text className="mt-1 text-sm font-extrabold text-gray-900">{params.id ?? '—'}</Text>
          </View>
        </View>

        <View className="mt-3 rounded-3xl bg-white p-4" style={cardShadow}>
          <Text className="text-[11px] font-bold text-gray-400">Trip details</Text>
          <DetailRow label="Pickup" value={params.pickupLocation ?? '—'} />
          <DetailRow label="Destination" value={params.dropLocation ?? '—'} />
          <DetailRow label="Start time" value={formatDate(params.startTime)} />
          <DetailRow label="End time" value={formatDate(params.endTime)} />
        </View>

        {statusLabel === 'CONFIRMED' ? (
          <View className="flex-row gap-3 mt-4" >
            <Pressable
              disabled={busyId === params.id}
              onPress={() => void cancelTrip(params.id)}
              className={`flex-1 items-center justify-center rounded-2xl py-4 ${
                busyId === params.id ? 'bg-gray-200' : 'bg-red-600'
              }`}>
              <Text className={`text-xs font-extrabold ${busyId === params.id ? 'text-gray-500' : 'text-white'}`}>
                {busyId === params.id ? 'Please wait...' : 'Cancel trip'}
              </Text>
            </Pressable>
            {activeRole === 'DRIVER' ? (
            <Pressable
              disabled={busyId === params.id}
              onPress={() => void startTrip(params.id)}
              className={`flex-1 items-center justify-center rounded-2xl py-3 ${
                busyId === params.id ? 'bg-gray-300' : 'bg-[#111827]'
              }`}>
              <Text className="text-xs font-extrabold text-white">
                {busyId === params.id ? 'Please wait...' : 'Start trip'}
              </Text>
            </Pressable> ) : null}
          </View>
        ) : (
          <Pressable
            disabled={busyId === params.id}
            onPress={() =>
              router.push({ pathname: '/driver-ongoing-trip' as any, params: { bookingId: params.id } })
            }
            className={`mt-4 items-center justify-center rounded-2xl py-3 ${
              busyId === params.id ? 'bg-gray-300' : 'bg-[#111827]'
            }`}>
            <Text className="text-xs font-extrabold text-white">
              {busyId === params.id ? 'Please wait...' : 'Open ongoing trip'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mt-3">
      <Text className="text-[11px] font-bold text-gray-400">{label}</Text>
      <Text className="mt-1 text-sm font-extrabold text-gray-900">{value}</Text>
    </View>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};
