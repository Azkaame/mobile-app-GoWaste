import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F9FAFB' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="article/[id]" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="transaction/create" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="transaction/[id]" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="pilih-lokasi" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
      </Stack>
    </AuthProvider>
  );
}
