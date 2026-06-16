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
import { emailValidationMessage } from '@/lib/emailValidation';
import { AppRole, signupDispatcher, signupUser } from '@/lib/api';
import { useStore } from '@/store/store';

export default function SignupScreen() {
  const completeAuth = useStore((s) => s.completeAuth);
  const [role, setRole] = useState<AppRole>('USER');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = phone.trim().length > 0 && email.trim().length > 0 && password.length >= 8 && !emailError;

  async function submit() {
    const validationError = emailValidationMessage(email);
    setEmailError(validationError);
    if (validationError || !canSubmit || submitting) return;

    try {
      setSubmitting(true);
      if (role === 'DISPATCHER') {
        await signupDispatcher({
          phone: phone.trim() || undefined,
          name: name.trim() || undefined,
          email: email.trim(),
          password,
        });
        await completeAuth('DISPATCHER');
      } else {
        await signupUser({
          phone: phone.trim() || undefined,
          name: name.trim() || undefined,
          email: email.trim(),
          password,
        });
        await completeAuth('USER');
      }
      Alert.alert('Success', 'Account created successfully.');
      router.replace((role === 'DISPATCHER' ? '/(dispatcher-tabs)' : '/(tabs)') as any);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not create account.';
      Alert.alert('Failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreenShell
      title="Sign up"
      bandLabel="CREATE ACCOUNT"
      subtitle={`Register as ${role === 'USER' ? 'a user' : 'a dispatcher'}`}
      onBack={() => router.back()}>
      <AuthRoleToggle role={role} onChange={setRole} />

      <AuthField
        label="Phone number"
        value={phone}
        onChangeText={setPhone}
        placeholder="+63 900 000 0000"
        keyboardType="phone-pad"
      />
      <AuthField label="Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
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

      <AuthPrimaryButton
        label="Create account"
        loadingLabel="Creating…"
        busy={submitting}
        disabled={!canSubmit}
        onPress={() => void submit()}
      />

      <AuthFooterLink
        prompt="Already have an account?"
        action="Login"
        onPress={() => router.replace('/login' as any)}
      />
    </AuthScreenShell>
  );
}
