import { BookingExtensionRequest, ExtensionRequestStatus } from '@prisma/client';

export type BookingWithExtensionRequests = {
  extensionRequests?: BookingExtensionRequest[];
};

export function pickRelevantExtensionRequest(
  requests: BookingExtensionRequest[] | undefined,
): BookingExtensionRequest | null {
  if (!requests?.length) return null;
  const pending = requests.find((r) => r.status === ExtensionRequestStatus.PENDING);
  if (pending) return pending;
  const approved = requests
    .filter((r) => r.status === ExtensionRequestStatus.APPROVED)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return approved[0] ?? null;
}

export function serializeBookingWithExtension<T extends BookingWithExtensionRequests>(booking: T) {
  const { extensionRequests, ...rest } = booking;
  return {
    ...rest,
    extensionRequest: pickRelevantExtensionRequest(extensionRequests),
  };
}

export const extensionRequestsInclude = {
  extensionRequests: {
    where: { status: { in: ['PENDING' as const, 'APPROVED' as const] } },
    orderBy: { createdAt: 'desc' as const },
  },
};
