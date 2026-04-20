import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#1D2DD9',
        tabBarInactiveTintColor: '#111827',
        tabBarStyle: {
          position: 'absolute',
          // left: 16,
          // right: 16,
          bottom: 40,
          // paddingHorizontal: 10,
          // paddingVertical: 10,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          height: 64,
          paddingTop: 10,
          paddingBottom: 10,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        },
        tabBarItemStyle: {
          height: 52,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                // paddingHorizontal: focused ? 14 : 0,
                // paddingVertical: 10,
                borderRadius: 100,
                backgroundColor: focused ? '#1D2DD9' : 'transparent',
                height: 52,
                width: 52,
              }}>
              <FontAwesome name="home" size={24} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
          tabBarButton: (props) => <Pressable {...(props as any)} />,
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                // paddingHorizontal: focused ? 14 : 0,
                // paddingVertical: 10,
                borderRadius: 100,
                backgroundColor: focused ? '#1D2DD9' : 'transparent',
                height: 52,
                width: 52,
              }}>
              <FontAwesome name="list-alt" size={24} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
          tabBarButton: (props) => <Pressable {...(props as any)} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                // paddingHorizontal: focused ? 14 : 0,
                // paddingVertical: 10,
                borderRadius: 100,
                backgroundColor: focused ? '#1D2DD9' : 'transparent',
                height: 52,
                width: 52,
              }}>
              <FontAwesome name="user" size={24} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
          tabBarButton: (props) => <Pressable {...(props as any)} />,
        }}
      />
    </Tabs>
  );
}
