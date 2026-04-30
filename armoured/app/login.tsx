import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppRole, loginDriver, loginUser, setActiveRole } from '@/lib/api';

export default function LoginScreen() {
  const [role, setRole] = useState<AppRole>('USER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function submit() {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      if (role === 'DRIVER') {
        await loginDriver({ email: email.trim(), password });
        await setActiveRole('DRIVER');
        router.replace('/(driver-tabs)');
      } else {
        await loginUser({ email: email.trim(), password });
        await setActiveRole('USER');
        router.replace('/(tabs)');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Login failed';
      Alert.alert('Failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="arrow-left" size={16} color="#111827" />
          </Pressable>
          <Text className="text-lg font-extrabold text-gray-900">Login</Text>
          <View className="h-10 w-10" />
        </View>
      </View>

      <View className="px-5 pt-6">
        <View className="rounded-3xl bg-white p-4" style={cardShadow}>
          <Text className="text-md font-extrabold text-gray-900">Welcome back</Text>
          <Text className="mt-1 text-sm font-semibold text-gray-500">Login as {role === 'USER' ? 'user' : 'driver'}</Text>

          <View className="mt-4 flex-row rounded-2xl bg-gray-100 p-1">
            {(['USER', 'DRIVER'] as const).map((r) => {
              const active = r === role;
              return (
                <Pressable
                  key={r}
                  onPress={() => setRole(r)}
                  className={`flex-1 items-center justify-center rounded-2xl py-3 ${active ? 'bg-[#1D2DD9]' : ''}`}>
                  <Text className={`text-sm font-extrabold ${active ? 'text-white' : 'text-gray-500'}`}>
                    {r === 'USER' ? 'User' : 'Driver'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-4">
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry autoCapitalize="none" />
          </View>

          <Pressable
            onPress={submit}
            className={`mt-4 items-center justify-center rounded-2xl py-3 ${
              canSubmit && !submitting ? 'bg-[#1D2DD9]' : 'bg-gray-200'
            }`}>
            <Text className={`text-sm font-extrabold ${canSubmit && !submitting ? 'text-white' : 'text-gray-500'}`}>
              {submitting ? 'Logging in…' : 'Login'}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.replace('/signup' as any)} className="mt-4 items-center">
            <Text className="text-sm font-bold text-gray-500">
              Don’t have an account? <Text className="text-[#1D2DD9]">Sign up</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Field({
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
    <View className="mb-3 rounded-2xl bg-gray-50 px-4 py-3">
      <Text className="text-[14px] font-bold text-gray-400">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'none'}
        className="mt-1 text-md font-extrabold text-gray-900"
      />
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

