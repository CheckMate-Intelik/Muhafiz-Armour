import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, Text, View } from 'react-native';

type Props = {
  pickupLocation: string;
  dropLocation: string;
  payout: number | null;
  onPress: () => void;
};

export function BookingSummaryCard({ pickupLocation, dropLocation, payout, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="mb-4 rounded-3xl bg-white p-4" style={cardShadow}>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold text-gray-400">Pickup</Text>
        <Text className="text-base font-extrabold text-[#1D2DD9]">{typeof payout === 'number' ? `$${payout.toFixed(2)}` : '—'}</Text>
      </View>
      <Text className="mt-1 text-sm font-extrabold text-gray-900">{pickupLocation}</Text>

      <View className="my-3 h-[1px] bg-gray-100" />

      <Text className="text-xs font-bold text-gray-400">Destination</Text>
      <Text className="mt-1 text-sm font-extrabold text-gray-900">{dropLocation}</Text>

      <View className="mt-4 flex-row items-center justify-end">
        <FontAwesome name="angle-right" size={16} color="#6B7280" />
      </View>
    </Pressable>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};
