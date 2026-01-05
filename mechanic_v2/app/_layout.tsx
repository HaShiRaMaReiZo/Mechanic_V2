import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, StyleSheet, Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { store } from '@/store/configureStore';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

function AppContent() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <>
      <View
        style={[
          styles.statusBarBackground,
          {
            height: insets.top,
          },
        ]}
      />
      <Provider store={store}>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
          <StatusBar style="light" />
    </ThemeProvider>
      </Provider>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  statusBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    zIndex: 9999,
  },
});