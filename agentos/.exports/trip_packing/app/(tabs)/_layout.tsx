import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import Main from './main';
import Explore from './explore';
import Manage from './manage';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="main" options={{ title: "Trip", tabBarIcon: ({ color }) => <Ionicons name={"home-outline"} size={20} color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: "Packing", tabBarIcon: ({ color }) => <Ionicons name={"grid-outline"} size={20} color={color} /> }} />
      <Tabs.Screen name="manage" options={{ title: "Home", tabBarIcon: ({ color }) => <Ionicons name={"settings-outline"} size={20} color={color} /> }} />
    </Tabs>
  );
}
