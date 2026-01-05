import { Tabs } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
    <Tabs
        initialRouteName="home"
      screenOptions={{
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: '#423491',
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <IconSymbol size={30} name="house.fill" color={color} />,
        }}
      />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color }) => <IconSymbol size={30} name="clock.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="setting"
          options={{
            title: 'Setting',
            tabBarIcon: ({ color }) => <IconSymbol size={30} name="gearshape.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="maintenance-data"
          options={{
            href: null, // Hide from tab bar
            title: 'Maintenance Data',
          }}
        />
        <Tabs.Screen
          name="services"
          options={{
            href: null, // Hide from tab bar
            title: 'Services',
          }}
        />
    </Tabs>
    </SafeAreaView>
  );
}
