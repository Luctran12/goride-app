import React from 'react';
import { Stack } from 'expo-router';

export default function BookingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="pickup" />
      <Stack.Screen name="destination" />
      <Stack.Screen name="select-vehicle" />
      <Stack.Screen name="waiting-driver" />
    </Stack>
  );
}
