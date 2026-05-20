import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Drop } from '../types/api';
import { colors } from '../theme/colors';

type Props = {
  visible: boolean;
  drop: Drop | null;
  onDismiss: () => void;
  onOpenQuestion: (drop: Drop) => void;
  onBackToMap: () => void;
};

function StatusRow({ done, label }: { done: boolean; label: string }) {
  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusDot, done && styles.statusDotDone]} />
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
}

export function QuestionSubmittedSheet({
  visible,
  drop,
  onDismiss,
  onOpenQuestion,
  onBackToMap,
}: Props) {
  const insets = useSafeAreaInsets();

  const minutesLeft = useMemo(() => {
    if (!drop) return 0;
    const end = new Date(drop.expiresAt).getTime();
    const left = Math.max(0, end - Date.now());
    return Math.max(1, Math.ceil(left / (60 * 1000)));
  }, [drop]);

  if (!drop) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.backdrop}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="סגור"
        />

        <View
          pointerEvents="box-none"
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) }]}
        >
          <View style={styles.handle} />

          <Text style={styles.title}>השאלה נשלחה לאנשים באזור</Text>
          <Text style={styles.subtitle}>
            אנחנו מחפשים אנשים שיכולים לענות מהשטח.
          </Text>

          <View style={styles.statusCard}>
            <StatusRow done={true} label="נשלח לאנשים באזור" />
            <StatusRow done={true} label="ממתין לתשובות" />
            <StatusRow
              done={false}
              label={`השאלה פעילה לעוד ${minutesLeft} דקות`}
            />
          </View>

          <Pressable
            style={styles.ctaPrimary}
            onPress={() => onOpenQuestion(drop)}
            accessibilityRole="button"
            accessibilityLabel="פתח את השאלה"
          >
            <Text style={styles.ctaPrimaryText}>פתח את השאלה</Text>
          </Pressable>

          <Pressable
            style={styles.ctaSecondary}
            onPress={onBackToMap}
            accessibilityRole="button"
          >
            <Text style={styles.ctaSecondaryText}>חזור למפה</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.navy,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 6,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    borderBottomWidth: 0,
    alignItems: 'stretch',
    maxHeight: '78%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginBottom: 14,
  },
  title: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 8,
    marginBottom: 18,
  },
  statusCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.navyMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(148,163,184,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  statusDotDone: {
    backgroundColor: '#22C55E',
    borderColor: 'rgba(34,197,94,0.55)',
  },
  statusLabel: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ctaPrimary: {
    alignSelf: 'stretch',
    backgroundColor: colors.electric,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    marginBottom: 10,
  },
  ctaPrimaryText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  ctaSecondary: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ctaSecondaryText: { color: colors.textMuted, fontWeight: '800', fontSize: 15 },
});
