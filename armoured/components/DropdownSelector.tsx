import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { ComponentProps, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
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
  onChange: (key: string) => void;
  className?: string;
};

const DropdownComponent = ({ tabs, activeKey, label, onChange, className }: Props) => {
  const [value, setValue] = useState(null);
  const [isFocus, setIsFocus] = useState(false);

  const renderLabel = () => {
    return (
      <View className="z-99 rounded-t-lg px-4" style={{ backgroundColor: colors.surface }}>
        <View className="border-b border-[#4d4d4d] py-2">
          <Text className="text-md text-gray-100">{label}</Text>
        </View>
      </View>
    );
  };

  return (
    <View>
      {label ? renderLabel() : null}
      <Dropdown
        style={[
          styles.dropdown,
          isFocus && { borderColor: 'blue' },
          !label ? { borderRadius: 8 } : {},
        ]}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        inputSearchStyle={styles.inputSearchStyle}
        iconStyle={styles.iconStyle}
        containerStyle={styles.containerStyle}
        itemContainerStyle={{
          borderBottomWidth: 1,
          borderBottomColor: '#343434',
        }}
        itemTextStyle={styles.itemTextStyle}
        activeColor={colors.surface}
        data={tabs}
        search={false}
        maxHeight={300}
        labelField="label"
        valueField="key"
        placeholder={activeKey}
        searchPlaceholder="Search..."
        value={value}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onChange={(item) => {
          setValue(item.key);
          onChange(item.key);
          setIsFocus(false);
        }}
      />
    </View>
  );
};

export default DropdownComponent;

const styles = StyleSheet.create({
  dropdown: {
    height: 50,
    // borderColor: 'gray',
    backgroundColor: colors.surface,
    color: colors.gold,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 8,
    paddingLeft: 16,
  },
  containerStyle: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 8,
    borderWidth: 0.5,
    borderColor: '#4d4d4d',
    marginTop: 5,
  },
  itemTextStyle: {
    color: colors.gold,
  },
  icon: {
    marginRight: 5,
  },
  placeholderStyle: {
    fontSize: 16,
    color: colors.gold,
  },
  selectedTextStyle: {
    fontSize: 16,
    color: colors.gold,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
});
