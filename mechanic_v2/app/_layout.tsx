import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, StyleSheet, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { BakbakOne_400Regular } from '@expo-google-fonts/bakbak-one';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { store } from '@/store/configureStore';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// Make navigation backgrounds transparent so AppBackground shows through
const LightThemeWithTransparentBg = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
    card: 'transparent', // This is what bottom tabs use!
  },
} as const;

const DarkThemeWithTransparentBg = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    card: 'transparent', // This is what bottom tabs use!
  },
} as const;

function AppContent() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  
  // Load Bakbak One font
  const [fontsLoaded] = useFonts({
    'BakbakOne': BakbakOne_400Regular,
  });

  // Don't render until fonts are loaded
  if (!fontsLoaded) {
    return null;
  }

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
    <ThemeProvider value={colorScheme === 'dark' ? DarkThemeWithTransparentBg : LightThemeWithTransparentBg}>
          <Stack 
            screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}>
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
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <AppContent />
      </View>
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