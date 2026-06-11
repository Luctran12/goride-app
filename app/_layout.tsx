import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

import { AppErrorBoundary } from '@/components/app-error-boundary';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeAuthSession } from '@/lib/auth-api';
import { installGlobalErrorReporting } from '@/lib/error-reporting';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  React.useEffect(() => {
    installGlobalErrorReporting();
    void initializeAuthSession().catch(() => undefined);
  }, []);

  return (
    <AppErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(customer)" options={{ headerShown: false }} />
          <Stack.Screen name="(driver)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
