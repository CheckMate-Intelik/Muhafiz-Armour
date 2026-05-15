import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
  AuthField,
  AuthFooterLink,
  AuthPrimaryButton,
  AuthRoleToggle,
  AuthScreenShell,
} from '@/components/AuthForm';
import { AppRole, loginDispatcher, loginUser, setActiveRole } from '@/lib/api';

export default function LoginScreen() {
  const [role, setRole] = useState<AppRole>('USER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function submit() {
    if (!canSubmit || submitting) return;
    try {
      setSubmitting(true);
      if (role === 'DISPATCHER') {
        await loginDispatcher({ email: email.trim(), password });
        await setActiveRole('DISPATCHER');
        router.replace('/(dispatcher-tabs)' as any);
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
    <AuthScreenShell
      title="Login"
      bandLabel="WELCOME BACK"
      subtitle={`Sign in as ${role === 'USER' ? 'a user' : 'a dispatcher'}`}
      onBack={() => router.back()}>
      <AuthRoleToggle role={role} onChange={setRole} />

      <AuthField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
      />

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
