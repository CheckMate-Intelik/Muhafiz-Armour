import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import {
  formatExpiresInLabel,
  isPendingAwaitingDispatcher,
  resolvePendingExpiresAt,
} from '@/lib/bookingPendingExpiry';

type Props = {
  status?: string | null;
  pendingExpiresAt?: string | null;
  createdAt?: string | null;
  variant?: 'light' | 'dark' | 'mission';
  className?: string;
};

export function PendingExpiryCountdown({
  status,
  pendingExpiresAt,
  createdAt,
  variant = 'dark',
  className,
}: Props) {
  const expiresAt = useMemo(
    () => resolvePendingExpiresAt(status, pendingExpiresAt, createdAt),
    [status, pendingExpiresAt, createdAt]
  );

  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setLabel(null);
      return;
    }
    const tick = () => setLabel(formatExpiresInLabel(expiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!isPendingAwaitingDispatcher(status) || !label) return null;

  const isExpired = label === 'Expired';
  const textColor =
    variant === 'light'
      ? isExpired
        ? '#B91C1C'
        : '#B45309'
      : variant === 'mission'
        ? isExpired
          ? '#FCA5A5'
          : '#FCD34D'
        : isExpired
          ? '#FCA5A5'
          : '#FCD34D';

  return (
    <View className={className}>
      <Text className="text-md font-extrabold" style={{ color: textColor }}>
        {isExpired ? 'Request expired' : `Expires in ${label}`}
      </Text>
    </View>
  );
}
