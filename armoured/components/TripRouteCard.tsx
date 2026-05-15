import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, Text, View } from 'react-native';

type StatusMeta = {
  label: string;
  bgClass: string;
  textClass: string;
};

function getStatusMeta(status?: string | null): StatusMeta | null {
  if (!status) return null;

  switch (status) {
    case 'IN_PROGRESS':
      return { label: 'Ongoing', bgClass: 'bg-emerald-100', textClass: 'text-emerald-800' };
    case 'CONFIRMED':
      return { label: 'Confirmed', bgClass: 'bg-blue-100', textClass: 'text-blue-800' };
    case 'PENDING_DISPATCHER':
      return { label: 'Pending', bgClass: 'bg-amber-100', textClass: 'text-amber-800' };
    case 'REQUESTED':
      return { label: 'Requested', bgClass: 'bg-amber-100', textClass: 'text-amber-800' };
    case 'COMPLETED':
      return { label: 'Completed', bgClass: 'bg-gray-100', textClass: 'text-gray-800' };
    case 'REJECTED':
      return { label: 'Cancelled', bgClass: 'bg-red-100', textClass: 'text-red-800' };
    case 'EXPIRED':
      return { label: 'Expired', bgClass: 'bg-gray-100', textClass: 'text-gray-800' };
    default:
      return { label: status.replaceAll('_', ' '), bgClass: 'bg-gray-100', textClass: 'text-gray-800' };
  }
}

type Props = {
  from: string;
  to: string;
  status?: string | null;
  onPress?: () => void;
  rightMetaText?: string | null;
  testID?: string;
  /** Matches user Activities list cards (dark header + route). */
  variant?: 'default' | 'mission';
  /** First line in mission header, e.g. "ACTIVE MISSION - Customer • vehicle". */
  missionHeaderLine?: string | null;
  /** Shown in mission variant COST column when set. */
  missionCostLabel?: string | null;
};

export function TripRouteCard({
  from,
  to,
  status,
  onPress,
  rightMetaText,
  testID,
  variant = 'default',
  missionHeaderLine,
  missionCostLabel,
}: Props) {
  const meta = getStatusMeta(status);
  const Root: any = onPress ? Pressable : View;

  if (variant === 'mission') {
    return (
      <Root
        testID={testID}
        onPress={onPress}
        className="mb-4 overflow-hidden rounded-2xl"
        style={missionCardOuter}>
        <View
          className="border-b px-4 pb-3 pt-3.5"
          style={{ backgroundColor: '#000000', borderBottomColor: 'rgba(255,255,255,0.06)' }}>
          <View className="flex-row items-center justify-between">
            <Text
              numberOfLines={2}
              className="flex-1 pr-2 text-[14px] font-extrabold"
              style={{ color: '#C9B37A', letterSpacing: 0.5 }}>
              {missionHeaderLine || meta?.label || '—'}
            </Text>
            <FontAwesome name="car" size={22} color="#C9B37A" />
          </View>
        </View>

        <View className="px-4 py-4" style={{ backgroundColor: '#222222' }}>
          <View className="flex-row">
            <View className="mr-3 w-5 items-center">
              <View
                className="h-3 w-3 rounded-full"
                style={{ borderWidth: 2, borderColor: '#F59E0B', backgroundColor: 'transparent' }}
              />
              <View className="my-2 w-[2px] flex-1" style={{ backgroundColor: 'rgba(34,197,94,0.7)' }} />
              <View className="h-3 w-3 rounded-full" style={{ borderWidth: 2, borderColor: '#E5E7EB' }} />
            </View>

            <View className="flex-1">
              <View className="flex-row">
                <View className="flex-1 pr-3">
                  <Text className="text-[12px] font-bold" style={{ color: '#9CA3AF' }}>
                    FROM:
                  </Text>
                  <Text numberOfLines={2} className="mt-1 text-[18px] font-extrabold text-gray-100">
                    {from || '—'}
                  </Text>
                </View>

                {missionCostLabel ? (
                  <View className="w-[90px] items-end">
                    <Text className="text-[12px] font-bold" style={{ color: '#9CA3AF' }}>
                      COST:
                    </Text>
                    <Text numberOfLines={1} className="mt-1 text-[14px] font-extrabold text-gray-100">
                      {missionCostLabel}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className="mt-3 border-t" style={{ borderTopColor: 'rgba(255,255,255,0.06)' }} />

              <View className="mt-3 flex-row items-start justify-between">
                <View className="min-w-0 flex-1 pr-2">
                  <Text className="text-[12px] font-bold" style={{ color: '#9CA3AF' }}>
                    TO:
                  </Text>
                  <Text numberOfLines={2} className="mt-1 text-[18px] font-extrabold text-gray-100">
                    {to || '—'}
                  </Text>
                </View>
                {rightMetaText && !missionCostLabel ? (
                  <Text numberOfLines={2} className="max-w-[40%] text-[11px] font-semibold text-gray-300">
                    {rightMetaText}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </Root>
    );
  }

  return (
    <Root
      testID={testID}
      onPress={onPress}
      className="mb-4 overflow-hidden rounded-3xl bg-emerald-50"
      style={cardShadow}>
      <View className="flex-row items-center px-4 py-4">
        <View className="mr-3 w-5 items-center">
          <View className="h-4 w-4 items-center justify-center rounded-full bg-emerald-200">
            <View className="h-2 w-2 rounded-full bg-emerald-500" />
          </View>
          <View className="my-1 w-[3px] flex-1 bg-emerald-200" />
          <View className="h-4 w-4 items-center justify-center rounded-full bg-emerald-200">
            <View className="h-2 w-2 rounded-full bg-emerald-500" />
          </View>
        </View>

        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-sm font-semibold text-gray-500">From</Text>
              <Text numberOfLines={1} className="mt-0.5 text-md font-bold text-gray-900">
                {from || '—'}
              </Text>
            </View>

            {meta ? (
              <View className={`rounded-full px-3 py-1 ${meta.bgClass}`}>
                <Text className={`text-[10px] font-extrabold ${meta.textClass}`}>{meta.label}</Text>
              </View>
            ) : null}
          </View>
          <View className="mt-2 h-[2px] bg-emerald-200" />
          <View className="mt-2 flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-sm font-semibold text-gray-500">To</Text>
              <Text numberOfLines={1} className="mt-0.5 text-md font-bold text-gray-900">
                {to || '—'}
              </Text>
            </View>

            {rightMetaText ? (
              <Text numberOfLines={1} className="mt-3 text-[11px] font-semibold text-gray-500">
                {rightMetaText}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Root>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
};

const missionCardOuter = {
  backgroundColor: '#0B0F14',
  borderColor: 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 14 },
  elevation: 8,
};

