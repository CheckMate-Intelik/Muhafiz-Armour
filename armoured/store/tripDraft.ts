import { create } from 'zustand';

type TripDraftState = {
  /** City chosen on home screen — map pickers centre here by default. */
  serviceCity: string;
  serviceCityLat: number | null;
  serviceCityLng: number | null;
  pickupCity: string;
  dropCity: string;
  pickupAddress: string;
  dropAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropLat: number | null;
  dropLng: number | null;
  startTimeIso: string | null;
  baseDurationHours: number | null;
  reset: () => void;
  setServiceCity: (name: string, lat: number, lng: number) => void;
  setPickupCity: (city: string) => void;
  setDropCity: (city: string) => void;
  setPickupMap: (address: string, lat: number, lng: number) => void;
  setDropMap: (address: string, lat: number, lng: number) => void;
  setSchedule: (startIso: string, baseDurationHours: number) => void;
};

const empty: Omit<
  TripDraftState,
  'reset' | 'setServiceCity' | 'setPickupCity' | 'setDropCity' | 'setPickupMap' | 'setDropMap' | 'setSchedule'
> = {
  serviceCity: '',
  serviceCityLat: null,
  serviceCityLng: null,
  pickupCity: '',
  dropCity: '',
  pickupAddress: '',
  dropAddress: '',
  pickupLat: null,
  pickupLng: null,
  dropLat: null,
  dropLng: null,
  startTimeIso: null,
  baseDurationHours: null,
};

export const useTripDraftStore = create<TripDraftState>((set) => ({
  ...empty,
  reset: () => set({ ...empty }),
  setServiceCity: (serviceCity, serviceCityLat, serviceCityLng) => set({ serviceCity, serviceCityLat, serviceCityLng }),
  setPickupCity: (pickupCity) => set({ pickupCity }),
  setDropCity: (dropCity) => set({ dropCity }),
  setPickupMap: (pickupAddress, pickupLat, pickupLng) => set({ pickupAddress, pickupLat, pickupLng }),
  setDropMap: (dropAddress, dropLat, dropLng) => set({ dropAddress, dropLat, dropLng }),
  setSchedule: (startTimeIso, baseDurationHours) => set({ startTimeIso, baseDurationHours }),
}));
