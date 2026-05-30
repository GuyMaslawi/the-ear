import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useHeaderHeight } from '@react-navigation/elements';
import type { MapStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme/colors';
import { PressableScale } from '../components/ui/PressableScale';
import { Button } from '../components/ui/Button';
import { notifySuccess, notifyError } from '../lib/haptics';
import { createDrop, ensureAnonymousSession } from '../lib/api';
import { track } from '../lib/analytics';
import { registerForPushNotifications } from '../lib/push';
import { apiUserMessageHeAuto } from '../lib/apiErrors';
import { validateQuestion } from '../lib/questionValidation';
import { suggestedQuestionsHe, starterSuggestionsHe } from '../lib/suggestedQuestionsHe';
import { inferCategory } from '../lib/inferCategory';
import { evaluateCreateDropForm } from '../lib/createDropForm';

type Props = NativeStackScreenProps<MapStackParamList, 'CreateDrop'>;

export function CreateDropScreen({ navigation, route }: Props) {
  const { lat, lng } = route.params;
  const headerHeight = useHeaderHeight();
  const [question, setQuestion] = useState('');
  const [radius, setRadius] = useState('220');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    track('question_started', { lat, lng, source: 'CreateDrop' });
  }, [lat, lng]);

  const inferredCategory = useMemo(() => inferCategory(question), [question]);

  const form = useMemo(
    () =>
      evaluateCreateDropForm({
        question,
        radiusInput: radius,
        lat,
        lng,
        busy,
      }),
    [question, radius, lat, lng, busy],
  );

  const radiusMeters = form.radius.meters;
  const radiusInputOk = form.radius.inputOk;
  const shapeOk = question.trim().length === 0 ? true : form.shapeOk;
  const locationOk = form.locationOk;
  const canSubmit = form.canSubmit;
  const disabledReasonHe = form.disabledReasonHe;

  const trimmedQ = question.trim();

  const suggestions = useMemo(() => {
    if (trimmedQ.length === 0) return starterSuggestionsHe;
    if (inferredCategory === 'OTHER') return starterSuggestionsHe;
    return suggestedQuestionsHe[inferredCategory] ?? starterSuggestionsHe;
  }, [trimmedQ.length, inferredCategory]);

  const submit = async () => {
    if (!canSubmit) return;
    const v = validateQuestion(question);
    if (!v.ok) {
      Alert.alert('שאלה לא מוכנה', v.messageHe);
      return;
    }
    const q = question.trim();
    const category = inferCategory(q);
    setBusy(true);
    let drop = null as Awaited<ReturnType<typeof createDrop>> | null;
    try {
      await ensureAnonymousSession();
      drop = await createDrop({
        question: q,
        category,
        lat,
        lng,
        radiusMeters,
        ttlHours: 6,
      });
    } catch (e) {
      notifyError();
      Alert.alert('לא נשלח', apiUserMessageHeAuto(e));
      setBusy(false);
      return;
    } finally {
      setBusy(false);
    }

    if (!drop) return;

    track('question_submitted', {
      dropId: drop.id,
      lat,
      lng,
      radiusMeters,
      source: 'CreateDrop',
    });
    notifySuccess();
    // Now that the user has a question, ask for push permission so they hear about answers.
    void registerForPushNotifications();
    navigation.navigate({
      name: 'Map',
      params: {
        newDrop: drop,
        submittedQuestionSheet: drop,
      },
      merge: true,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
    <ScrollView
      contentContainerStyle={styles.scroll}
      style={{ backgroundColor: colors.navy }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <Text style={styles.questionLabel}>מה תרצה לדעת מהשטח?</Text>
      <TextInput
        style={[
          styles.input,
          !shapeOk && question.trim().length > 0 ? styles.inputWarn : null,
        ]}
        placeholder="כתוב כאן את השאלה שלך…"
        placeholderTextColor="rgba(255,255,255,0.42)"
        value={question}
        onChangeText={setQuestion}
        multiline
        textAlignVertical="top"
        textAlign="right"
        editable={!busy}
        autoFocus
      />

      {suggestions.length > 0 ? (
        <View style={styles.suggestWrap}>
          {suggestions.map((text) => (
            <PressableScale
              key={text}
              style={styles.suggestionChip}
              onPress={() => setQuestion(text)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`השתמש בשאלה: ${text}`}
            >
              <Text style={styles.suggestionText}>{text}</Text>
            </PressableScale>
          ))}
        </View>
      ) : null}

      {locationOk ? (
        <View style={styles.locChip}>
          <Text style={styles.locChipLabel}>הנקודה שבחרת במפה</Text>
          <Text style={styles.locChipSub}>השאלה תישלח לאנשים באזור הזה</Text>
        </View>
      ) : (
        <View style={styles.warnCard}>
          <Text style={styles.warnText}>
            לא הצלחנו לקבל מיקום מהמפה. חזרו למפה, השתמשו בכפתור המיקום שלי או בחרו נקודה בלחיצה ארוכה.
          </Text>
          <Button
            label="חזור למפה"
            icon="map"
            variant="ghost"
            size="md"
            fullWidth={false}
            onPress={() => navigation.goBack()}
            style={styles.warnBack}
          />
        </View>
      )}

      <View style={styles.radiusRow}>
        <Text style={styles.radiusLabel}>רדיוס (מ׳)</Text>
        <TextInput
          style={[styles.radiusInput, !radiusInputOk && radius.trim().length > 0 ? styles.inputWarn : null]}
          keyboardType="number-pad"
          value={radius}
          onChangeText={setRadius}
          textAlign="center"
          editable={!busy}
        />
        <Text style={styles.radiusHint}>≈ {radiusMeters} מ׳ סביב הנקודה</Text>
      </View>

      <Text style={styles.safetyHint}>
        אל תפרסם מידע אישי, תוכן פוגעני, מידע מסוכן או דברים שאינך בטוח בהם.
      </Text>

      <Button
        label="שלח לאנשים באזור"
        icon="paper-plane"
        onPress={submit}
        loading={busy}
        disabled={!canSubmit}
      />

      {!canSubmit && !busy ? (
        <Text style={styles.blocked}>{disabledReasonHe}</Text>
      ) : null}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.navy },
  scroll: { padding: 16, paddingBottom: 96 },
  warnCard: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    padding: 12,
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  warnText: {
    color: '#FECACA',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  warnBack: {
    marginTop: 10,
  },
  locChip: {
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  locChipLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  locChipSub: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  questionLabel: {
    color: colors.white,
    marginBottom: 10,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 18,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    maxWidth: '100%',
    alignSelf: 'flex-end',
  },
  suggestionText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  suggestWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
    alignItems: 'flex-end',
  },
  input: {
    minHeight: 132,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    padding: 14,
    color: colors.white,
    backgroundColor: colors.navyMuted,
    marginBottom: 12,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
  },
  inputWarn: { borderColor: 'rgba(249, 115, 22, 0.65)' },
  radiusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  radiusLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  radiusInput: {
    width: 78,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: colors.white,
    backgroundColor: colors.navyMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  radiusHint: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    writingDirection: 'rtl',
    flexShrink: 1,
  },
  safetyHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  blocked: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 12,
    lineHeight: 17,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '700',
    paddingHorizontal: 2,
    marginBottom: 8,
  },
});
