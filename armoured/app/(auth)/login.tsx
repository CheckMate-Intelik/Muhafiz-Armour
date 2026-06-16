import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';

import {
  AuthField,
  AuthFooterLink,
  AuthPrimaryButton,
  AuthRoleToggle,
  AuthScreenShell,
  AUTH_GOLD,
} from '@/components/AuthForm';
import { emailValidationMessage } from '@/lib/emailValidation';
import { AppRole, loginDispatcher, loginUser } from '@/lib/api';
import { useStore } from '@/store/store';

export default function LoginScreen() {
  const completeAuth = useStore((s) => s.completeAuth);
  const [role, setRole] = useState<AppRole>('USER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length >= 8 && !emailError;

  async function submit() {
    const validationError = emailValidationMessage(email);
    setEmailError(validationError);
    if (validationError || !canSubmit || submitting) return;

    try {
      setSubmitting(true);
      if (role === 'DISPATCHER') {
        await loginDispatcher({ email: email.trim(), password });
        await completeAuth('DISPATCHER');
        router.replace('/(dispatcher-tabs)' as any);
      } else {
        await loginUser({ email: email.trim(), password });
        await completeAuth('USER');
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
    <AuthScreenShell
      title="Login"
      bandLabel="WELCOME BACK"
      subtitle={`Sign in as ${role === 'USER' ? 'a user' : 'a dispatcher'}`}
      onBack={() => router.back()}>
      <AuthRoleToggle role={role} onChange={setRole} />

      <AuthField
        label="Email"
        value={email}
        onChangeText={(next) => {
          setEmail(next);
          if (emailError) setEmailError(emailValidationMessage(next));
        }}
        onBlur={() => setEmailError(emailValidationMessage(email))}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={emailError}
      />
      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
      />

      <Pressable
        onPress={() =>
          router.push({
            pathname: '/forgot-password',
            params: { role, email: email.trim() },
          } as any)
        }
        className="mt-3 self-end">
        <Text className="text-sm font-bold" style={{ color: AUTH_GOLD }}>
          Forgot password?
        </Text>
      </Pressable>

      <AuthPrimaryButton
        label="Login"
        loadingLabel="Logging in…"
        busy={submitting}
        disabled={!canSubmit}
        onPress={() => void submit()}
      />

      <AuthFooterLink
        prompt="Don't have an account?"
        action="Sign up"
        onPress={() => router.replace('/signup' as any)}
      />
    </AuthScreenShell>
  );
}
