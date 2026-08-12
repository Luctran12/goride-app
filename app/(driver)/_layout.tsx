import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { initializeAuthSession, subscribeAuthSession } from '@/lib/auth-api';

export default function DriverLayout() {
  const [authStatus, setAuthStatus] = React.useState<'checking' | 'authenticated' | 'anonymous'>('checking');
  const canAccessPublicAuth = authStatus === 'anonymous';
  const canAccessProtectedDriver = authStatus === 'authenticated';

  React.useEffect(() => {
    return subscribeAuthSession((session) => {
      const isDriver = Boolean(session?.accessToken && session.roles.includes('DRIVER'));
      setAuthStatus(isDriver ? 'authenticated' : 'anonymous');
    });
  }, []);

  React.useEffect(() => {
    let isCurrent = true;

    initializeAuthSession()
      .then((session) => {
        if (isCurrent) {
          const isDriver = Boolean(session?.accessToken && session.roles.includes('DRIVER'));
          setAuthStatus(isDriver ? 'authenticated' : 'anonymous');
        }
      })
      .catch(() => {
        if (isCurrent) {
          setAuthStatus('anonymous');
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  if (authStatus === 'checking') {
    return <View style={styles.authGate} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#eaf7ef' } }}>
      <Stack.Protected guard={canAccessPublicAuth}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={canAccessProtectedDriver}>
        <Stack.Screen name="index" />
        <Stack.Screen name="earnings" />
        <Stack.Screen name="activity" />
        <Stack.Screen name="account" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="chat" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  authGate: {
    flex: 1,
    backgroundColor: '#eaf7ef',
  },
});

