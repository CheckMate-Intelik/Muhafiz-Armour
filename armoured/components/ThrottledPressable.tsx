import { Pressable, PressableProps } from 'react-native';
import { useThrottledAsyncPress } from '@/hooks/useThrottledPress';

type ThrottledPressableProps = PressableProps & {
  throttleMs?: number;
};

export function ThrottledPressable({
  onPress,
  throttleMs,
  disabled,
  ...rest
}: ThrottledPressableProps) {
  const throttledPress = useThrottledAsyncPress(() => {
    if (typeof onPress === 'function') onPress({} as never);
  }, throttleMs);

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPress={onPress ? throttledPress : undefined}
    />
  );
}
