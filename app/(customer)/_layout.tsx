import { Stack } from 'expo-router';
import React from 'react';

import { initializeAuthSession, subscribeAuthSession } from '@/lib/auth-api';

export default function CustomerLayout() {
  const [authStatus, setAuthStatus] = React.useState<'checking' | 'authenticated' | 'anonymous'>('checking');
  const canAccessPublicAuth = authStatus !== 'authenticated';
  const canAccessProtectedCustomer = authStatus !== 'anonymous';

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
