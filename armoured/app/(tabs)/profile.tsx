import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useEffect, useMemo } from 'react';
import { useStore } from '@/store/store';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const hydrate = useStore((s) => s.hydrate);
  const logout = useStore((s) => s.logout);
  const switchRole = useStore((s) => s.switchRole);
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
              PROFILE
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
          <View
            className="items-center overflow-hidden rounded-2xl bg-black"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.22,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 10 },
              elevation: 6,
            }}>
            <View className="w-full border-b border-gray-900 bg-black pb-2 pt-4 rounded-t-xl">
              <Text
                className="text-center text-md font-extrabold"
                style={{ color: '#D8DADF', letterSpacing: 0.4 }}>
                ACCOUNT
              </Text>
            </View>
            <View className="items-center py-5 rounded-xl w-full bg-[#3B3E43]">
              <Image
                source={{ uri: 'https://i.pravatar.cc/240?img=12' }}
                style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#515458' }}
              />
              <Text className="mt-4 text-xl font-bold text-gray-100">
                {profile?.name ?? (loading ? 'Loading…' : '—')}
              </Text>
              <Text className="mt-1 text-sm font-semibold" style={{ color: '#B8BBC0' }}>
                Member since {memberSince}
              </Text>
            </View>
          </View>

          <View className="mt-4 overflow-hidden rounded-2xl p-4" style={cardShadow}>
            <DetailRow icon="phone" label="Phone" value={profile?.phone ?? '—'} />
            <Divider />
            <DetailRow icon="envelope" label="Email" value={profile?.email ?? '—'} />
          </View>

          <View className="mt-4 overflow-hidden rounded-2xl p-4" style={cardShadow}>
            <ActionRow icon="credit-card" title="Payment Methods" />
            <Divider />
            <ActionRow icon="history" title="Ride History" />
            <Divider />
            <ActionRow icon="shield" title="Privacy & Security" />
            <Divider />
            <ActionRow
              icon="exchange"
              title="Switch to Driver mode"
              onPress={async () => {
                await switchRole('DRIVER');
                router.replace('/(driver-tabs)' as any);
              }}
            />
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
    </LinearGradient>
  );
}

function Divider() {
  return <View className="my-3 h-[1px] bg-[#55585D]" />;
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
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#2F3135]">
        <FontAwesome name={icon} size={16} color="#B8BBC0" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[10px] font-bold" style={{ color: '#B8BBC0' }}>
          {label}
        </Text>
        <Text className="mt-1 text-sm font-extrabold text-gray-100">{value}</Text>
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
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#2F3135]">
          <FontAwesome name={icon} size={16} color={destructive ? '#F87171' : '#B8BBC0'} />
        </View>
        <Text
          className={`ml-3 text-sm font-extrabold ${destructive ? 'text-red-400' : 'text-gray-100'}`}>
          {title}
        </Text>
      </View>
      <FontAwesome name="angle-right" size={18} color="#B8BBC0" />
    </Pressable>
  );
}

const cardShadow = {
  backgroundColor: '#3B3E43',
  shadowColor: '#000',
  shadowOpacity: 0.22,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};
