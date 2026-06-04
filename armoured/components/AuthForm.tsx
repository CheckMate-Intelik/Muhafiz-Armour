import { BackButton } from '@/components/BackButton';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppRole } from '@/lib/api';

export const AUTH_GOLD = '#C9B37A';
export const AUTH_CARD = '#0B0F14';
export const APP_GRADIENT = ['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617'] as const;
const GRADIENT = APP_GRADIENT;

const CARD_SHADOW: ViewStyle = {
  backgroundColor: AUTH_CARD,
  borderColor: 'rgba(255,255,255,0.06)',
  shadowColor: '#000',
  shadowOpacity: 0.22,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

type AuthScreenShellProps = {
  title: string;
  bandLabel: string;
  subtitle: string;
  onBack: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthScreenShell({
  title,
  bandLabel,
  subtitle,
  onBack,
  children,
  footer,
}: AuthScreenShellProps) {
  return (
    <LinearGradient
      colors={[...GRADIENT]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <View className="px-5 pt-2">
            <View className="flex-row items-center justify-between">
              <BackButton variant="auth" onPress={onBack} />
              <Text className="text-2xl font-semibold" style={{ color: AUTH_GOLD }}>
                {title}
              </Text>
              <View className="h-10 w-10" />
            </View>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}>
            <View className="overflow-hidden rounded-2xl border" style={CARD_SHADOW}>
              <View className="border-b border-gray-900 bg-black px-4 py-3">
                <Text
                  className="text-center text-sm font-extrabold"
                  style={{ color: AUTH_GOLD, letterSpacing: 0.6 }}>
                  {bandLabel}
                </Text>
              </View>
              <View className="p-4">
                <Text className="text-base font-extrabold text-gray-100">{subtitle}</Text>
                {children}
              </View>
            </View>
            {footer ? <View className="mt-5">{footer}</View> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

export function AuthRoleToggle({
  role,
  onChange,
}: {
  role: AppRole;
  onChange: (role: AppRole) => void;
}) {
  return (
    <View
      className="mt-4 flex-row rounded-2xl p-1"
      style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
      {(['USER', 'DISPATCHER'] as const).map((r) => {
        const active = r === role;
        return (
          <Pressable
            key={r}
            onPress={() => onChange(r)}
            className="flex-1 items-center justify-center rounded-xl py-3"
            style={active ? { backgroundColor: AUTH_GOLD } : undefined}>
            <Text
              className="text-sm font-extrabold"
              style={{ color: active ? AUTH_CARD : '#9CA3AF' }}>
              {r === 'USER' ? 'User' : 'Dispatcher'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View
      className="mt-6 rounded-2xl border px-4 py-3"
      style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
      <Text className="text-md font-bold" style={{ color: '#9CA3AF' }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'none'}
        className="mt-1 text-md font-extrabold text-gray-100"
      />
    </View>
  );
}

export function AuthPrimaryButton({
  label,
  loadingLabel,
  busy,
  disabled,
  onPress,
}: {
  label: string;
  loadingLabel?: string;
  busy?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const inactive = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      className="mt-4 items-center justify-center rounded-2xl py-3.5"
      style={{ backgroundColor: inactive ? 'rgba(255,255,255,0.1)' : AUTH_GOLD }}>
      <Text className="text-sm font-extrabold" style={{ color: inactive ? '#6B7280' : AUTH_CARD }}>
        {busy && loadingLabel ? loadingLabel : label}
      </Text>
    </Pressable>
  );
}

export function AuthFooterLink({
  prompt,
  action,
  onPress,
}: {
  prompt: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="items-center py-2">
      <Text className="text-sm font-semibold" style={{ color: '#B8BBC0' }}>
        {prompt}{' '}
        <Text className="font-extrabold" style={{ color: AUTH_GOLD }}>
          {action}
        </Text>
      </Text>
    </Pressable>
  );
}
