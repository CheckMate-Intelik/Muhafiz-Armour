import type { ViewStyle } from 'react-native';

/** Shared brand palette — import from here instead of hardcoding hex/rgb. */
export const colors = {
  gold: '#C9B37A',
  goldBright: '#D4AF37',
  goldDark: 'rgb(204, 155, 31)',
  goldLight: 'rgb(201, 179, 122)',

  background: '#020617',
  card: '#0B0F14',
  surface: 'rgb(34, 34, 34)',
  surfaceMuted: '#2F3135',
  surfaceInput: 'rgba(255,255,255,0.04)',

  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.08)',
  borderGold: 'rgba(201, 179, 122, 0.25)',
  borderDivider: '#4d4d4d',

  textPrimary: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#B8BBC0',
  textOnGold: '#0B0F14',
  textDark: '#111827',
  textSupport: '#E0E0E0',
  textDisabled: '#6B7280',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.55)',
  disabled: 'rgba(255,255,255,0.08)',
  disabledStrong: 'rgba(255,255,255,0.12)',

  tabBar: 'rgb(193, 155, 59)',
  tabActive: '#C9B37A',
  tabInactive: '#111827',

  success: '#22C55E',
  warning: '#F59E0B',
  activeBlue: 'rgb(25,95,235)',
} as const;

/** LinearGradient color stops. Spread into `colors={[...gradients.screen]}`. */
export const gradients = {
  /** Default app screen (home, bookings, profile, etc.). */
  screen: ['rgb(31, 68, 149)', 'rgb(24, 49, 97)', colors.background] as const,
  /** Booking details main view. */
  screenBooking: ['rgb(23, 45, 92)', 'rgb(22, 37, 68)', colors.background] as const,
  /** Booking details loading / empty live states. */
  screenBookingMuted: ['#1a2744', '#0f172a', colors.background] as const,
  /** Missing booking error state. */
  screenBookingError: ['rgb(26, 68, 160)', 'rgb(22, 34, 63)', colors.background] as const,
  /** Cards, list rows, mission panels. */
  cardDark: ['rgb(37, 37, 37)', 'rgb(0, 0, 0)'] as const,
  /** Sub-tab active pill. */
  gold: [colors.goldDark, colors.goldLight] as const,
  inactive: ['transparent', 'transparent'] as const,
} as const;

export const gradientProps = {
  screen: {
    start: { x: 0.5, y: 0 } as const,
    end: { x: 0.5, y: 1 } as const,
    locations: [0, 0.5, 1] as const,
  },
  screenBooking: {
    start: { x: 0.5, y: 0 } as const,
    end: { x: 0.5, y: 1 } as const,
    locations: [0, 0.3, 1] as const,
  },
  screenBookingMuted: {
    start: { x: 0.5, y: 0 } as const,
    end: { x: 0.5, y: 1 } as const,
    locations: [0, 0.45, 1] as const,
  },
  cardVertical: {
    start: { x: 1, y: 0 } as const,
    end: { x: 1, y: 1 } as const,
  },
} as const;

/** @deprecated Use `colors.gold` */
export const AUTH_GOLD = colors.gold;
/** @deprecated Use `colors.card` */
export const AUTH_CARD = colors.card;
/** @deprecated Use `gradients.screen` */
export const APP_GRADIENT = gradients.screen;

export const cardShadow: ViewStyle = {
  backgroundColor: colors.card,
  borderColor: colors.border,
  borderWidth: 1,
  shadowColor: colors.black,
  shadowOpacity: 0.22,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

export const listCardShadow: ViewStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.13)',
  borderColor: colors.border,
  borderWidth: 1,
  shadowColor: colors.black,
  shadowOpacity: 0.28,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 14 },
  elevation: 8,
};

export const missionCardOuter: ViewStyle = {
  borderColor: colors.border,
  borderWidth: 1,
  shadowColor: colors.black,
  shadowOpacity: 0.22,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};

export const quickActionCard = {
  radius: 14,
  bg: colors.card,
  border: colors.gold,
  height: 100,
} as const;
