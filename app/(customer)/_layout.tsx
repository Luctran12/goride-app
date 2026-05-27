import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { initializeAuthSession, subscribeAuthSession } from '@/lib/auth-api';

export default function CustomerLayout() {
  const [authStatus, setAuthStatus] = React.useState<'checking' | 'authenticated' | 'anonymous'>('checking');
  const canAccessPublicAuth = authStatus === 'anonymous';
  const canAccessProtectedCustomer = authStatus === 'authenticated';

  React.useEffect(() => {
    return subscribeAuthSession((session) => {
      setAuthStatus(session?.accessToken ? 'authenticated' : 'anonymous');
    });
  }, []);

  React.useEffect(() => {
    let isCurrent = true;

    initializeAuthSession()
      .then((session) => {
        if (isCurrent) {
          setAuthStatus(session?.accessToken ? 'authenticated' : 'anonymous');
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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={canAccessPublicAuth}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={canAccessProtectedCustomer}>
        <Stack.Screen name="index" />
        <Stack.Screen name="booking" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="billing" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  authGate: {
    flex: 1,
    backgroundColor: '#fcf8ff',
  },
});
