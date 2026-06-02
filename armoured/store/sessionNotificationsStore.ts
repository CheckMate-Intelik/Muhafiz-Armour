import { create } from 'zustand';

export type SessionNotification = {
  id: string;
  title: string;
  body: string;
  receivedAt: number;
  bookingId?: string;
  status?: string;
  kind?: string;
  role?: string;
};

type SessionNotificationsState = {
  items: SessionNotification[];
  add: (item: SessionNotification) => void;
  clear: () => void;
};

export const useSessionNotificationsStore = create<SessionNotificationsState>((set) => ({
  items: [],
  add: (item) =>
    set((state) => {
      if (state.items.some((x) => x.id === item.id)) return state;
      return { items: [item, ...state.items] };
    }),
  clear: () => set({ items: [] }),
}));
