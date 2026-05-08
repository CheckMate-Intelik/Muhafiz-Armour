export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function normalizeCity(city: string | null | undefined): string {
  return (city ?? '').trim().toLowerCase();
}

export function isIntercity(pickupCity: string | null | undefined, dropCity: string | null | undefined): boolean {
  const a = normalizeCity(pickupCity);
  const b = normalizeCity(dropCity);
  if (!a || !b) return true;
  return a !== b;
}

/** Buffer applied on each side of the service window for scheduling (hours). */
export function bufferHoursForTrip(pickupCity: string | null | undefined, dropCity: string | null | undefined): number {
  return isIntercity(pickupCity, dropCity) ? 5 : 2;
}

export function bufferMinutesForTrip(pickupCity: string | null | undefined, dropCity: string | null | undefined): number {
  return Math.round(bufferHoursForTrip(pickupCity, dropCity) * 60);
}

/** Minimum whole hours implied by route distance (for first-step duration hint). */
export function distanceMinHours(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 1;
  return Math.max(1, Math.ceil(distanceKm / 45));
}

/** Second screen: at least 10h or distance-based minimum, whichever is higher. */
export function effectiveMinDurationHours(distanceKm: number): number {
  return Math.max(10, distanceMinHours(distanceKm));
}

export function distanceKmFromCoords(
  pickupLat?: number | null,
  pickupLng?: number | null,
  dropLat?: number | null,
  dropLng?: number | null,
): number | null {
  if (
    pickupLat == null ||
    pickupLng == null ||
    dropLat == null ||
    dropLng == null ||
    !Number.isFinite(pickupLat) ||
    !Number.isFinite(pickupLng) ||
    !Number.isFinite(dropLat) ||
    !Number.isFinite(dropLng)
  ) {
    return null;
  }
  return haversineKm(pickupLat, pickupLng, dropLat, dropLng);
}
