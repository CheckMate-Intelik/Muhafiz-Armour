import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  sheetStyle?: ViewStyle;
};

export function BottomSheetModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  sheetStyle,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[styles.overlay, StyleSheet.absoluteFillObject]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />

        <View
          onStartShouldSetResponder={() => true}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }, sheetStyle]}>
          <View className="items-center pb-3">
            <View style={styles.handle} />
          </View>

          <Text
            className="text-[13px] font-extrabold"
            style={{ letterSpacing: 2, color: colors.gold }}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-sm font-semibold text-gray-300">{subtitle}</Text>
          ) : null}

          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    backgroundColor: 'rgba(2,6,23,0.7)',
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    maxHeight: '92%',
  },
  handle: {
    height: 4,
    width: 48,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  content: {
    flexGrow: 1,
    minHeight: 0,
  },
});
