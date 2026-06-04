import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';

export type BackButtonVariant = 'dark' | 'light' | 'auth' | 'gold';

type VariantStyle = {
  container: ViewStyle;
  icon: 'arrow-left' | 'angle-left';
  iconSize: number;
  iconColor: string;
};

/** Gold chevron on dark circle — matches car-details; used on all gradient screens. */
const GOLD_CONTAINER: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#222222',
};

const VARIANTS: Record<BackButtonVariant, VariantStyle> = {
  dark: {
    container: GOLD_CONTAINER,
    icon: 'angle-left',
    iconSize: 22,
    iconColor: '#C9B37A',
  },
  gold: {
    container: GOLD_CONTAINER,
    icon: 'angle-left',
    iconSize: 22,
    iconColor: '#C9B37A',
  },
  light: {
    container: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F3F4F6',
    },
    icon: 'angle-left',
    iconSize: 20,
    iconColor: '#111827',
  },
  auth: {
    container: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    icon: 'angle-left',
    iconSize: 20,
    iconColor: '#111827',
  },
};

type Props = Omit<PressableProps, 'children' | 'onPress'> & {
  variant?: BackButtonVariant;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function BackButton({
  variant = 'dark',
  onPress,
  accessibilityLabel = 'Go back',
  disabled,
  style,
  ...rest
}: Props) {
  const v = VARIANTS[variant];
  const handlePress = onPress ?? (() => router.back());

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={[v.container, disabled ? { opacity: 0.5 } : undefined, style]}
      {...rest}>
      <FontAwesome name={v.icon} size={v.iconSize} color={v.iconColor} />
    </Pressable>
  );
}
