import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useEffect, useMemo } from 'react';
import { useStore } from '@/store/store';

export default function DriverScreen() {
  const hydrate = useStore((s) => s.hydrate);
  const refreshProfile = useStore((s) => s.refreshProfile);
  const logout = useStore((s) => s.logout);
  const profile = useStore((s) => s.profile);
  const loading = useStore((s) => s.loading);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const memberSince = useMemo(() => {
    if (!profile?.createdAt) return '—';
    const d = new Date(profile.createdAt);
    if (Number.isNaN(d.getTime())) return '—';
    return `${d.getFullYear()}`;
  }, [profile?.createdAt]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4 items-center justify-center">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-extrabold text-gray-900">Driver</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-6">
        <View className="items-center">
          <Image
            source={{ uri: 'https://i.pravatar.cc/240?img=12' }}
            style={{ width: 120, height: 120, borderRadius: 60 }}
          />
          <Text className="mt-4 text-lg font-extrabold text-gray-900">
            {profile?.name ?? (loading ? 'Loading…' : '—')}
          </Text>
          <Text className="mt-1 text-xs font-semibold text-gray-500">Member since {memberSince}</Text>
        </View>

        <View className="mt-6 rounded-3xl bg-white p-4" style={cardShadow}>
          <DetailRow icon="phone" label="Phone" value={profile?.phone ?? '—'} />
          <Divider />
          <DetailRow icon="envelope" label="Email" value={profile?.email ?? '—'} />
          <Divider />
          <DetailRow icon="check" label="Approval" value={profile ? (profile.isApproved ? 'Approved' : 'Pending') : '—'} />
        </View>

        <View className="mt-5 rounded-3xl bg-white p-4" style={cardShadow}>
          <ActionRow icon="refresh" title="Refresh profile" onPress={() => void refreshProfile()} />
          <Divider />
          <ActionRow icon="car" title="Vehicle management" onPress={() => router.push('/(tabs)/vehicles' as any)} />
          <Divider />
          <ActionRow icon="bar-chart" title="Dashboard" onPress={() => router.push('/(tabs)/dashboard' as any)} />
          <Divider />
          <ActionRow
            icon="sign-out"
            title="Logout"
            destructive
            onPress={async () => {
              await logout();
              router.replace('/login' as any);
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Divider() {
  return <View className="my-3 h-[1px] bg-gray-100" />;
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
        <FontAwesome name={icon} size={16} color="#111827" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[10px] font-bold text-gray-400">{label}</Text>
        <Text className="mt-1 text-sm font-extrabold text-gray-900">{value}</Text>
      </View>
    </View>
  );
}

function ActionRow({
  icon,
  title,
  destructive,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  title: string;
  destructive?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between">
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
          <FontAwesome name={icon} size={16} color={destructive ? '#DC2626' : '#111827'} />
        </View>
        <Text className={`ml-3 text-sm font-extrabold ${destructive ? 'text-red-600' : 'text-gray-900'}`}>
          {title}
        </Text>
      </View>
      <FontAwesome name="angle-right" size={18} color="#9CA3AF" />
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

