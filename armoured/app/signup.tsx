import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signupUser } from '@/lib/api';
import { Alert } from 'react-native';

export default function SignupScreen() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function submit() {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      await signupUser({
        phone: phone.trim() || undefined,
        name: name.trim() || undefined,
        email: email.trim(),
        password,
      });
      Alert.alert('Success', 'Account created successfully.');
      router.replace('/(tabs)');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not create account.';
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
          <Text className="text-base font-extrabold text-gray-900">Sign up</Text>
          <View className="h-10 w-10" />
        </View>
      </View>

      <View className="px-5 pt-6">
        <View className="rounded-3xl bg-white p-4" style={cardShadow}>
          <Text className="text-sm font-extrabold text-gray-900">Create your account</Text>
          <Text className="mt-1 text-xs font-semibold text-gray-500">Sign up with your details</Text>

          <View className="mt-4">
            <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="+63 900 000 0000" keyboardType="phone-pad" />
            <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry autoCapitalize="none" />
          </View>

          <Pressable
            onPress={submit}
            className={`mt-4 items-center justify-center rounded-2xl py-3 ${
              canSubmit && !submitting ? 'bg-[#1D2DD9]' : 'bg-gray-200'
            }`}>
            <Text className={`text-xs font-extrabold ${canSubmit && !submitting ? 'text-white' : 'text-gray-500'}`}>
              {submitting ? 'Creating…' : 'Create account'}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.replace('/login' as any)} className="mt-4 items-center">
            <Text className="text-xs font-bold text-gray-500">
              Already have an account? <Text className="text-[#1D2DD9]">Login</Text>
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
      <Text className="text-[10px] font-bold text-gray-400">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'none'}
        className="mt-1 text-sm font-extrabold text-gray-900"
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

