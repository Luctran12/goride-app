import { Stack } from 'expo-router';
import React from 'react';

export default function DriverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#eaf7ef' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="activity" />
    </Stack>
  );
}
