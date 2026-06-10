import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationBellButton } from '@/components/NotificationBellButton';
import { useStore, userAvatarUrl } from '@/store/store';
import { LinearGradient } from 'expo-linear-gradient';
import { cardShadow, colors, gradientProps, gradients } from '@/constants/theme';

export default function ProfileScreen() {
  const hydrate = useStore((s) => s.hydrate);
  const uploadUserProfilePhoto = useStore((s) => s.uploadUserProfilePhoto);
  const logout = useStore((s) => s.logout);
  const switchRole = useStore((s) => s.switchRole);
  const profile = useStore((s) => s.profile);
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

  const avatarLarge = userAvatarUrl(profile, 'lg');
  const avatarSmall = userAvatarUrl(profile, 'sm');

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
      await uploadUserProfilePhoto(uri);
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim().length > 0
          ? e.message
          : 'Could not update profile photo';
      Alert.alert('Upload failed', msg);
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <LinearGradient colors={[...gradients.screen]} {...gradientProps.screen} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-semibold" style={{ color: colors.gold }}>
                Profile
              </Text>
              {/* <Text className="text-lg font-semibold text-gray-200">
                {profile?.name ?? (loading ? 'Loading…' : 'User')}
              </Text> */}
            </View>
            <View className="flex-row items-center gap-2">
              <NotificationBellButton />
              <Image
                source={{ uri: avatarSmall }}
                style={{ width: 36, height: 36, borderRadius: 18 }}
              />
            </View>
          </View>

          <View className="mt-4">
            <View
              className="items-center overflow-hidden rounded-2xl"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.22,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 10 },
                elevation: 6,
              }}>
              <View
                className="w-full items-center rounded-b-xl py-5"
                style={{ backgroundColor: colors.surface }}>
                <Text
                  className="text-md font- mb-4 w-[90%] border-b border-[#4d4d4d] pb-2 text-center"
                  style={{ color: colors.gold, letterSpacing: 0.4 }}>
                  ACCOUNT
                </Text>
                <Pressable
                  onPress={() => void pickProfilePhoto()}
                  disabled={avatarBusy}
                  className="relative items-center justify-center">
                  <Image
                    source={{ uri: avatarLarge }}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      borderWidth: 2,
                      borderColor: '#515458',
                    }}
                  />
                  {avatarBusy ? (
                    <View className="absolute inset-0 items-center justify-center rounded-[60px] bg-black/50">
                      <ActivityIndicator color={colors.gold} />
                    </View>
                  ) : (
                    <View
                      className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: colors.gold }}>
                      <FontAwesome name="camera" size={14} color={colors.textOnGold} />
                    </View>
                  )}
                </Pressable>
                <Text className="mt-4 text-xl" style={{ color: colors.gold }}>
                  {profile?.name ?? (loading ? 'Loading…' : '—')}
                </Text>
                <Text className="mt-1 text-sm font-semibold" style={{ color: colors.textMuted }}>
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
                title="Switch to Dispatcher mode"
                onPress={async () => {
                  await switchRole('DISPATCHER');
                  router.replace('/(dispatcher-tabs)' as any);
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
        <FontAwesome name={icon} size={16} color={colors.textMuted} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[10px] font-bold" style={{ color: colors.textMuted }}>
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
          <FontAwesome name={icon} size={16} color={destructive ? '#F87171' : colors.textMuted} />
        </View>
        <Text
          className={`ml-3 text-sm font-extrabold ${destructive ? 'text-red-400' : 'text-gray-100'}`}>
          {title}
        </Text>
      </View>
      <FontAwesome name="angle-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}
