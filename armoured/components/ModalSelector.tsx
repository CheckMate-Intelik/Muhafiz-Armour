import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';

import { BottomSheetModal } from '@/components/BottomSheetModal';
import { colors } from '@/constants/theme';

export type SubTabItem = {
  key: string;
  label: string;
  icon: ComponentProps<typeof FontAwesome>['name'];
};

type Props = {
  tabs: SubTabItem[];
  activeKey: string;
  label?: string;
  title?: string;
  onChange: (key: string) => void;
  className?: string;
};

export function ModalSelector({ tabs, activeKey, label, title, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const activeTab = tabs.find((t) => t.key === activeKey);
  const displayLabel = activeTab?.label ?? activeKey;
  const sheetTitle = (title ?? label ?? 'Select option').toUpperCase();
  const sheetSubtitle = title && label ? label : undefined;

  const select = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <View className={className}>
      {label ? (
        <View className="z-99 rounded-t-lg px-4" style={{ backgroundColor: colors.surface }}>
          <View className="border-b border-[#4d4d4d] py-2">
            <Text className="text-md text-gray-100">{label}</Text>
          </View>
        </View>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, !label ? { borderRadius: 25 } : undefined]}
        accessibilityRole="button"
        accessibilityLabel={`${displayLabel}. Opens selection.`}>
        <View className="min-w-0 flex-1 flex-row items-center">
          {activeTab ? (
            <FontAwesome
              name={activeTab.icon}
              size={14}
              color={colors.gold}
              style={{ marginRight: 10 }}
            />
          ) : null}
          <Text
            numberOfLines={1}
            className="flex-1 text-base font-semibold"
            style={{ color: colors.gold }}>
            {displayLabel}
          </Text>
        </View>
        <FontAwesome name="chevron-down" size={14} color={colors.gold} />
      </Pressable>

      <BottomSheetModal
        visible={open}
        onClose={() => setOpen(false)}
        title={sheetTitle}
        subtitle={sheetSubtitle}
        sheetStyle={{ minHeight: '40%' }}>
        <ScrollView
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}>
          {tabs.map((tab) => {
            const active = tab.key === activeKey;
            return (
              <Pressable
                key={tab.key}
                onPress={() => select(tab.key)}
                className="flex-row items-center justify-between px-1 py-3">
                <View className="min-w-0 flex-1 flex-row items-center">
                  <View
                    className="h-9 w-9 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: active ? 'rgba(201,179,122,0.12)' : 'rgba(255,255,255,0.04)',
                    }}>
                    <FontAwesome
                      name={tab.icon}
                      size={14}
                      color={active ? colors.gold : colors.textSecondary}
                    />
                  </View>
                  <Text
                    className="ml-3 text-sm font-bold"
                    style={{ color: active ? colors.gold : colors.textPrimary }}>
                    {tab.label}
                  </Text>
                </View>
                {active ? <FontAwesome name="check" size={14} color={colors.gold} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 50,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    borderTopRightRadius: 25,
    borderTopLeftRadius: 25,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default ModalSelector;
