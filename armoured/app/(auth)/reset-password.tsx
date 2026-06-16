import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import {
  AuthField,
  AuthFooterLink,
  AuthPrimaryButton,
  AuthScreenShell,
} from '@/components/AuthForm';
import { emailValidationMessage } from '@/lib/emailValidation';
import { AppRole, resetPasswordWithCode } from '@/lib/api';
import { paramString } from '@/lib/routeParams';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string | string[]; role?: string | string[] }>();
  const email = useMemo(() => paramString(params.email), [params.email]);
  const role = useMemo(() => {
    const raw = paramString(params.role);
    return raw === 'DISPATCHER' ? 'DISPATCHER' : 'USER';
  }, [params.role]) as AppRole;

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    email.length > 0 &&
    code.trim().length === 6 &&
    password.length >= 8 &&
    password === confirmPassword &&
    !emailError;

  async function submit() {
    const validationError = emailValidationMessage(email);
    setEmailError(validationError);
    if (validationError || submitting) return;
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please re-enter your new password.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await resetPasswordWithCode({ email, role, code: code.trim(), password });
      Alert.alert('Password updated', result.message, [
        { text: 'Login', onPress: () => router.replace('/login' as any) },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not reset password';
      Alert.alert('Failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreenShell
      title="Reset password"
      bandLabel="VERIFY EMAIL"
      subtitle="Enter the code from your email and choose a new password"
      onBack={() => router.back()}>
      <AuthField
        label="Email"
        value={email}
        onChangeText={() => undefined}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={false}
        error={emailError}
      />

      <AuthField
        label="Verification code"
        value={code}
        onChangeText={(next) => setCode(next.replace(/\D/g, '').slice(0, 6))}
        placeholder="123456"
        keyboardType="number-pad"
        autoCapitalize="none"
      />

      <AuthField
        label="New password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
      />

      <AuthField
        label="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
      />

      <AuthPrimaryButton
        label="Update password"
        loadingLabel="Updating…"
        busy={submitting}
        disabled={!canSubmit}
        onPress={() => void submit()}
      />

      <AuthFooterLink
        prompt="Didn't get a code?"
        action="Resend"
        onPress={() =>
          router.replace({
            pathname: '/forgot-password',
            params: { email, role },
          } as any)
        }
      />
    </AuthScreenShell>
  );
}
