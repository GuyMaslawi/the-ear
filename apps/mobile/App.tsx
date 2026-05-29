import { useEffect } from 'react';
import { I18nManager, Platform, UIManager } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { RootErrorBoundary } from './src/components/RootErrorBoundary';
import { logMobileApiBootstrap } from './src/lib/bootstrapLog';
import { track } from './src/lib/analytics';
import { colors } from './src/theme/colors';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

I18nManager.allowRTL(true);
I18nManager.swapLeftAndRightInRTL(true);
// Force RTL so Hebrew layout is correct on Android devices whose system language is English.
// Guarded: only flipped once (when current state differs), so we don't loop-restart on every launch.
// NOTE: On first install (or first run after this change), Android will restart the app once
// to apply the new layout direction. This is expected, not a crash.
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.navy,
    card: colors.navy,
    text: colors.white,
    border: colors.navyMuted,
    primary: colors.electric,
  },
};

export default function App() {
  useEffect(() => {
    void logMobileApiBootstrap();
    track('app_opened', { source: 'App' });
  }, []);

  return (
    <RootErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </RootErrorBoundary>
  );
}
