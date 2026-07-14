import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import {
  AuthField,
  AuthFooterLink,
  AuthPrimaryButton,
  AuthRoleToggle,
  AuthScreenShell,
} from '@/components/AuthForm';
import { emailValidationMessage } from '@/lib/emailValidation';
import { AppRole, requestPasswordReset } from '@/lib/api';
import { paramString } from '@/lib/routeParams';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string | string[]; role?: string | string[] }>();
  const initialRole = useMemo(() => {
    const raw = paramString(params.role);
    return raw === 'DISPATCHER' ? 'DISPATCHER' : 'USER';
  }, [params.role]) as AppRole;
  const initialEmail = useMemo(() => paramString(params.email), [params.email]);

  const [role, setRole] = useState<AppRole>(initialRole);
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  const canSubmit = email.trim().length > 0 && !emailError;

  async function submit() {
    const validationError = emailValidationMessage(email);
    setEmailError(validationError);
    if (validationError || submitting) return;

    try {
      setSubmitting(true);
      const result = await requestPasswordReset({ email, role });
      Alert.alert('Check your email', result.message);
      router.push({
        pathname: '/reset-password',
        params: { email: email.trim().toLowerCase(), role },
      } as any);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not send verification code';
      const notFound =
        message.includes('No user account exists') || message.includes('No dispatcher account exists');
      Alert.alert(
        notFound ? (role === 'DISPATCHER' ? 'Dispatcher not found' : 'User not found') : 'Failed',
        message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreenShell
      title="Forgot password"
      bandLabel="RESET ACCESS"
      subtitle="We will email you a verification code"
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

      <AuthPrimaryButton
        label="Send verification code"
        loadingLabel="Sending…"
        busy={submitting}
        disabled={!canSubmit}
        onPress={() => void submit()}
      />

      <AuthFooterLink prompt="Remembered your password?" action="Back to login" onPress={() => router.replace('/login' as any)} />
    </AuthScreenShell>
  );
}
