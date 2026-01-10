import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomTabBar } from '@/components/CustomTabBar';

export default function TabLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
    <Tabs
        initialRouteName="home"
          tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
            tabBarStyle: { backgroundColor: 'transparent', elevation: 0 },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Search',
        }}
      />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
          }}
        />
        <Tabs.Screen
          name="setting"
          options={{
            title: 'Setting',
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
      </View>
    </SafeAreaView>
  );
}
