import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { dispatcherAvatarUrl, useStore } from '@/store/store';
import { LinearGradient } from 'expo-linear-gradient';

export default function DispatcherProfileScreen() {
  const hydrate = useStore((s) => s.hydrate);
  const uploadDispatcherProfilePhoto = useStore((s) => s.uploadDispatcherProfilePhoto);
  const refreshProfile = useStore((s) => s.refreshProfile);
  const logout = useStore((s) => s.logout);
  const switchRole = useStore((s) => s.switchRole);
  const profile = useStore((s) => s.dispatcherProfile);
  const loading = useStore((s) => s.loading);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const memberSince = useMemo(() => {
    if (!profile?.createdAt) return '—';
    const d = new Date(profile.createdAt);
    if (Number.isNaN(d.getTime())) return '—';
    return `${d.getFullYear()}`;
  }, [profile?.createdAt]);

  const avatarLarge = dispatcherAvatarUrl(profile, 'lg');
  const avatarSmall = dispatcherAvatarUrl(profile, 'sm');

  async function pickProfilePhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to set your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri?.trim();
    if (!uri) return;
    setAvatarBusy(true);
    try {
      await uploadDispatcherProfilePhoto(uri);
    } catch (e) {
      const msg = e instanceof Error && e.message.trim().length > 0 ? e.message : 'Could not update profile photo';
      Alert.alert('Upload failed', msg);
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <LinearGradient
      colors={['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-semibold text-[#C9B37A]">Profile</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white">
                <FontAwesome name="bell-o" size={16} color="#111827" />
              </Pressable>
              <Image source={{ uri: avatarSmall }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            </View>
          </View>

          <View className="mt-4">
            <View
              className="items-center overflow-hidden rounded-2xl bg-black"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.22,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 10 },
                elevation: 6,
              }}>
              <View className="w-full rounded-t-xl border-b border-gray-900 bg-black pb-2 pt-4">
                <Text
                  className="text-center text-md font-extrabold"
                  style={{ color: '#C9B37A', letterSpacing: 0.4 }}>
                  DISPATCHER ACCOUNT
                </Text>
              </View>
              <View className="w-full items-center rounded-xl bg-[#0B0F14] py-5">
                <Pressable
                  onPress={() => void pickProfilePhoto()}
                  disabled={avatarBusy}
                  className="relative items-center justify-center">
                  <Image
                    source={{ uri: avatarLarge }}
                    style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#515458' }}
                  />
                  {avatarBusy ? (
                    <View className="absolute inset-0 items-center justify-center rounded-[60px] bg-black/50">
                      <ActivityIndicator color="#C9B37A" />
                    </View>
                  ) : (
                    <View className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full bg-[#C9B37A]">
                      <FontAwesome name="camera" size={14} color="#0B0F14" />
                    </View>
                  )}
                </Pressable>
                <Text className="mt-4 text-xl font-bold text-[#C9B37A]">
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
              <Divider />
              <DetailRow
                icon="check"
                label="Approval"
                value={profile ? (profile.isApproved ? 'Approved' : 'Pending') : '—'}
              />
            </View>

            <View className="mt-4 overflow-hidden rounded-2xl p-4" style={cardShadow}>
              <ActionRow icon="refresh" title="Refresh profile" onPress={() => void refreshProfile()} />
              <Divider />
              <ActionRow icon="car" title="Vehicle management" onPress={() => router.push('/(dispatcher-tabs)/vehicles' as any)} />
              <Divider />
              <ActionRow
                icon="exchange"
                title="Switch to User mode"
                onPress={() => void switchRole('USER').then(() => router.replace('/(tabs)' as any))}
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
  backgroundColor: '#0B0F14',
  shadowColor: '#000',
  shadowOpacity: 0.22,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};
