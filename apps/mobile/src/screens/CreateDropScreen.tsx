import { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MapStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme/colors';
import { palette } from '../theme/theme';
import { PressableScale } from '../components/ui/PressableScale';
import { Button } from '../components/ui/Button';
import { tapLight, notifySuccess, notifyError } from '../lib/haptics';
import type { DropCategory } from '../types/api';
import { createDrop, ensureAnonymousSession } from '../lib/api';
import { apiUserMessageHeAuto } from '../lib/apiErrors';
import { validateQuestion } from '../lib/questionValidation';
import { suggestedQuestionsHe } from '../lib/suggestedQuestionsHe';
import { categoryMarkerIcon } from '../lib/categories';

type Props = NativeStackScreenProps<MapStackParamList, 'CreateDrop'>;

const CATEGORIES: { id: DropCategory; label: string }[] = [
  { id: 'PARKING', label: 'חניה' },
  { id: 'QUEUE', label: 'תור' },
  { id: 'CROWD', label: 'עומס' },
  { id: 'INCIDENT', label: 'אירוע' },
  { id: 'PRODUCT', label: 'מוצר' },
  { id: 'SAFETY', label: 'בטיחות' },
  { id: 'OTHER', label: 'אחר' },
];

const R_MIN = 40;
const R_MAX = 2000;

function clampRadius(raw: number) {
  if (!Number.isFinite(raw)) return 220;
  return Math.min(R_MAX, Math.max(R_MIN, Math.round(raw)));
}

export function CreateDropScreen({ navigation, route }: Props) {
  const { lat, lng } = route.params;
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<DropCategory | null>(null);
  const [radius, setRadius] = useState('220');
  const [busy, setBusy] = useState(false);

  const parsedRadiusRaw = Number(radius.replace(',', '.'));

  const radiusMeters = useMemo(
    () => clampRadius(Number.isFinite(parsedRadiusRaw) ? parsedRadiusRaw : 220),
    [parsedRadiusRaw],
  );

  const radiusInputOk = Number.isFinite(parsedRadiusRaw) && parsedRadiusRaw >= R_MIN && parsedRadiusRaw <= R_MAX;

  const trimmedQ = question.trim();
  const charLenOk = trimmedQ.length >= 5;
  const shapeOk =
    trimmedQ.length === 0 ? true : validateQuestion(trimmedQ).ok;

  const locationOk =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const categoryOk = category !== null;

  const validation = useMemo(() => validateQuestion(question), [question]);
  const submitShapeOk = validation.ok;

  const canSubmit =
    charLenOk && submitShapeOk && categoryOk && radiusInputOk && locationOk && !busy;

  const disabledReasonHe = useMemo(() => {
    const parts: string[] = [];
    if (!categoryOk) parts.push('בחרו קטגוריה מהרשימה למטה');
    if (!charLenOk) parts.push(`הוסיפו לפחות 5 תווים לשאלה (כרגע ${trimmedQ.length})`);
    else if (!submitShapeOk && !validation.ok) parts.push(validation.messageHe);
    if (!radiusInputOk || !Number.isFinite(parsedRadiusRaw)) {
      parts.push(`שימו רדיוס בין ${R_MIN} ל‑${R_MAX} מטר`);
    }
    if (!locationOk) parts.push('חסר מיקום מהמפה — חזרו למפה ובחרו נקודה או מרכז תצוגה לפני שליחה');
    return parts.join(' · ');
  }, [
    categoryOk,
    charLenOk,
    submitShapeOk,
    trimmedQ.length,
    validation,
    radiusInputOk,
    parsedRadiusRaw,
    locationOk,
  ]);

  const suggestions = category ? suggestedQuestionsHe[category] ?? [] : [];

  const submit = async () => {
    if (!canSubmit || !category) return;
    const v = validateQuestion(question);
    if (!v.ok) {
      Alert.alert('שאלה לא מוכנה', v.messageHe);
      return;
    }
    const q = question.trim();
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
        ttlHours: 24,
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

    notifySuccess();
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
    <ScrollView
      contentContainerStyle={styles.scroll}
      style={{ backgroundColor: colors.navy }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.callout}>
        <Text style={styles.calloutLine}>אתה שואל אנשים שנמצאים כאן עכשיו</Text>
        <Text style={styles.calloutMuted}>
          תשובות מגיעות מהשטח ומתעדכנות בזמן אמת
        </Text>
        <Text style={styles.calloutMuted}>
          המיקום נקבע בדיוק לפי הנקודה שבחרת במפה (כל מקום בעולם).
        </Text>
      </View>

      {!locationOk ? (
        <View style={styles.warnCard}>
          <Text style={styles.warnText}>לא הצלחנו לקבל מיקום מהמפה. חזור למפה, הקש על נקודה או השתמש במרכז המפה.</Text>
        </View>
      ) : null}

      <Text style={styles.label}>השאלה שלך</Text>
      <TextInput
        style={[
          styles.input,
          !shapeOk && question.trim().length > 0 ? styles.inputWarn : null,
        ]}
        placeholder="כתוב כאן בקצרה מה תרצה לדעת מהשטח…"
        placeholderTextColor="rgba(255,255,255,0.42)"
        value={question}
        onChangeText={setQuestion}
        multiline
        textAlignVertical="top"
        textAlign="right"
        editable={!busy}
      />

      <Text style={styles.label}>קטגוריה</Text>
      <View style={styles.chips}>
        {CATEGORIES.map((c) => {
          const on = c.id === category;
          const icon = categoryMarkerIcon[c.id];
          return (
            <PressableScale
              key={c.id}
              haptic="none"
              onPress={() => {
                tapLight();
                setCategory(c.id);
              }}
              style={[styles.chip, on && styles.chipOn]}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={c.label}
              accessibilityState={{ selected: on }}
            >
              <Text style={styles.chipIcon}>{icon}</Text>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
            </PressableScale>
          );
        })}
      </View>

      {suggestions.length > 0 ? (
        <>
          <Text style={styles.suggestLabel}>רעיונות לשאלה לפי הקטגוריה</Text>
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
        </>
      ) : !category ? (
        <Text style={styles.needCatHint}>אחרי שתבחרו קטגוריה נציע משפטים מוכנים ללחיצה.</Text>
      ) : null}

      <Text style={styles.label}>רדיוס כיסוי (מטרים)</Text>
      <TextInput
        style={[styles.inputSingle, !radiusInputOk && radius.trim().length > 0 ? styles.inputWarn : null]}
        keyboardType="number-pad"
        value={radius}
        onChangeText={setRadius}
        textAlign="right"
        editable={!busy}
      />
      <Text style={styles.hint}>
        רק מי שנמצא בערך {radiusMeters} מ׳ מהנקודה יקבל את השאלה כדי לענות מהשטח.
      </Text>

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
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 44 },
  callout: {
    backgroundColor: colors.navyMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.35)',
    padding: 14,
    marginBottom: 16,
    gap: 6,
    alignItems: 'stretch',
  },
  calloutLine: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  calloutMuted: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  warnCard: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    padding: 12,
    marginBottom: 14,
  },
  warnText: {
    color: '#FECACA',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  label: {
    color: colors.textMuted,
    marginBottom: 8,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 4,
    fontSize: 13,
  },
  suggestLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  needCatHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 12,
    lineHeight: 17,
    writingDirection: 'rtl',
    fontWeight: '600',
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
    minHeight: 104,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    padding: 14,
    color: colors.white,
    backgroundColor: colors.navyMuted,
    marginBottom: 14,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  inputWarn: { borderColor: 'rgba(249, 115, 22, 0.65)' },
  hint: {
    color: colors.textMuted,
    marginBottom: 22,
    fontSize: 12,
    textAlign: 'right',
    fontWeight: '600',
    lineHeight: 17,
    writingDirection: 'rtl',
  },
  inputSingle: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    padding: 14,
    color: colors.white,
    backgroundColor: colors.navyMuted,
    marginBottom: 8,
    fontSize: 17,
  },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: {
    flexDirection: 'row-reverse',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  chipOn: {
    borderColor: colors.electricBright,
    backgroundColor: colors.bubble,
  },
  chipIcon: { fontSize: 13 },
  chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  chipTextOn: { color: colors.white },
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
