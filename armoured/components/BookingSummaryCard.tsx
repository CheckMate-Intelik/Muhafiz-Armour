import { TripRouteCard } from '@/components/TripRouteCard';

type Props = {
  pickupLocation: string;
  dropLocation: string;
  payout: number | null;
  status?: string | null;
  pendingExpiresAt?: string | null;
  createdAt?: string | null;
  onPress: () => void;
  variant?: 'default' | 'mission';
  missionHeaderLine?: string | null;
};

export function BookingSummaryCard({
  pickupLocation,
  dropLocation,
  payout,
  status,
  pendingExpiresAt,
  createdAt,
  onPress,
  variant = 'default',
  missionHeaderLine,
}: Props) {
  const payoutLabel = typeof payout === 'number' ? `Rs ${payout.toFixed(2)}` : '—';
  return (
    <TripRouteCard
      from={pickupLocation}
      to={dropLocation}
      status={status}
      pendingExpiresAt={pendingExpiresAt}
      createdAt={createdAt}
      onPress={onPress}
      variant={variant}
      missionHeaderLine={missionHeaderLine ?? undefined}
      missionCostLabel={variant === 'mission' ? payoutLabel : undefined}
      rightMetaText={variant === 'mission' ? undefined : payoutLabel}
    />
  );
}
