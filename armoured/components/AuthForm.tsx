import { BackButton } from '@/components/BackButton';
import { useThrottledPress } from '@/hooks/useThrottledPress';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useState } from 'react';
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

import {
  APP_GRADIENT,
  AUTH_CARD,
  AUTH_GOLD,
  cardShadow as CARD_SHADOW,
  colors,
  gradientProps,
  gradients,
} from '@/constants/theme';
import type { AppRole } from '@/lib/api';

export { APP_GRADIENT, AUTH_CARD, AUTH_GOLD } from '@/constants/theme';

const GRADIENT = gradients.screen;

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
      {...gradientProps.screen}
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
              style={{ color: active ? AUTH_CARD : colors.textSecondary }}>
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
  error,
  onBlur,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string | null;
  onBlur?: () => void;
  editable?: boolean;
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View
      className="mt-6 rounded-2xl border px-4 py-3"
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: error ? '#F87171' : 'rgba(255,255,255,0.08)',
      }}>
      <Text className="text-md font-bold" style={{ color: '#9CA3AF' }}>
        {label}
      </Text>
      <View className="mt-1 flex-row items-center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#6B7280"
          keyboardType={keyboardType}
          secureTextEntry={isPassword && !passwordVisible}
          autoCapitalize={autoCapitalize ?? 'none'}
          editable={editable}
          onBlur={onBlur}
          className="flex-1 text-md font-extrabold text-gray-100"
          style={isPassword ? { paddingRight: 8 } : undefined}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setPasswordVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            hitSlop={8}
            className="px-1 py-1">
            <FontAwesome name={passwordVisible ? 'eye-slash' : 'eye'} size={18} color="#9CA3AF" />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="mt-1 text-xs font-semibold" style={{ color: '#FCA5A5' }}>
          {error}
        </Text>
      ) : null}
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
  const throttledPress = useThrottledPress(onPress);
  return (
    <Pressable
      onPress={throttledPress}
      disabled={inactive}
      className="mt-4 items-center justify-center rounded-2xl py-3.5"
      style={{ backgroundColor: inactive ? colors.disabledStrong : AUTH_GOLD }}>
      <Text className="text-sm font-extrabold" style={{ color: inactive ? colors.textDisabled : AUTH_CARD }}>
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
  const throttledPress = useThrottledPress(onPress);
  return (
    <Pressable onPress={throttledPress} className="items-center py-2">
      <Text className="text-sm font-semibold" style={{ color: '#B8BBC0' }}>
        {prompt}{' '}
        <Text className="font-extrabold" style={{ color: AUTH_GOLD }}>
          {action}
        </Text>
      </Text>
    </Pressable>
  );
}
