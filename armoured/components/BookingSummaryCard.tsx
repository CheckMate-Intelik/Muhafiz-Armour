import { TripRouteCard } from '@/components/TripRouteCard';

type Props = {
  pickupLocation: string;
  dropLocation: string;
  payout: number | null;
  status?: string | null;
  onPress: () => void;
};

export function BookingSummaryCard({ pickupLocation, dropLocation, payout, status, onPress }: Props) {
  const payoutLabel = typeof payout === 'number' ? `Rs ${payout.toFixed(2)}` : null;
  return <TripRouteCard from={pickupLocation} to={dropLocation} status={status} rightMetaText={payoutLabel} onPress={onPress} />;
}
