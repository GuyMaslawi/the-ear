import { useEffect } from 'react';
import { I18nManager, Platform, UIManager } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { RootErrorBoundary } from './src/components/RootErrorBoundary';
import { logMobileApiBootstrap } from './src/lib/bootstrapLog';
import { colors } from './src/theme/colors';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

I18nManager.allowRTL(true);
I18nManager.swapLeftAndRightInRTL(true);

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
