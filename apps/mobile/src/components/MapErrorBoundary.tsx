import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = { children: ReactNode; fallback: ReactNode };

type State = { hasError: boolean };

/**
 * Catches JavaScript errors from map subtree so the app can show a list fallback.
 */
export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[MapErrorBoundary]', error.message, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function MapFallbackNotice() {
  return (
    <View style={fallbackStyles.banner} accessibilityRole="alert">
      <Text style={fallbackStyles.title}>המפה לא זמינה כרגע</Text>
      <Text style={fallbackStyles.sub}>
        מציגים רשימה חיה של שאלות — אפשר לפתוח כל שאלה ולענות מהרשימה למטה.
      </Text>
    </View>
  );
}

const fallbackStyles = StyleSheet.create({
  banner: {
    backgroundColor: colors.navyMuted,
    padding: 14,
    borderBottomWidth: 1,
    borderColor: colors.bubbleBorder,
  },
  title: { color: colors.white, fontWeight: '800', marginBottom: 6, textAlign: 'right' },
  sub: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, textAlign: 'right' },
});
