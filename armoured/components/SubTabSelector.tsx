import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, gradientProps, gradients } from '@/constants/theme';

export type SubTabItem = {
  key: string;
  label: string;
  icon: ComponentProps<typeof FontAwesome>['name'];
};

type Props = {
  tabs: readonly SubTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
};

/** Gold pill sub-tabs — matches dispatcher Bookings (REQUESTS / HISTORY). */
export function SubTabSelector({ tabs, activeKey, onChange, className }: Props) {
  return (
    <View
      className={`mb-2 flex-row overflow-hidden rounded-xl ${className ?? 'mt-4'}`}
      style={{ backgroundColor: colors.surface }}>
      {tabs.map((t, idx) => {
        const active = activeKey === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            className="flex-1"
            style={{
              backgroundColor: colors.surface,
              padding: 5,
            }}>
            <LinearGradient
              colors={active ? [...gradients.gold] : [...gradients.inactive]}
              {...gradientProps.cardVertical}
              style={{ borderRadius: 5 }}>
              <View
                className="flex-row items-center justify-center gap-2 rounded-xl px-1"
                style={{ height: 40 }}>
                {/* <FontAwesome name={t.icon} size={22} color={active ? '#0B0F14' : '#B8BBC0'} /> */}
                <Text
                  numberOfLines={1}
                  className="text-sm font-extrabold"
                  style={{ color: active ? colors.textOnGold : colors.textMuted }}>
                  {t.label}
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
        );
      })}
    </View>
  );
}
