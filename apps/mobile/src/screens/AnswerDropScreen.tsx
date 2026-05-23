import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DropFlowParamList } from '../navigation/RootNavigator';
import { colors } from '../theme/colors';
import { palette } from '../theme/theme';
import { PressableScale } from '../components/ui/PressableScale';
import { Button } from '../components/ui/Button';
import { tapLight, notifySuccess, notifyError } from '../lib/haptics';
import type { AnswerOption, Drop, QuickStatus } from '../types/api';
import { fetchDrop, postAnswer, ensureAnonymousSession } from '../lib/api';
import { apiUserMessageHeAuto, LOCATION_PERMISSION_MESSAGE_HE } from '../lib/apiErrors';
import { getAnswerOptions } from '../lib/answerOptions';
import { canUserAnswerDrop, blockedReasonHe } from '../lib/answerEligibility';

type Props = NativeStackScreenProps<DropFlowParamList, 'AnswerDrop'>;

export function AnswerDropScreen({ navigation, route }: Props) {
  const { dropId, cachedDrop } = route.params;
  const [text, setText] = useState('');
  const [selectedKey, setSelectedKey] = useState<QuickStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [drop, setDrop] = useState<Drop | null>(cachedDrop ?? null);
  const [loadingDrop, setLoadingDrop] = useState(!cachedDrop);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadFromApi = useCallback(async () => {
    setLoadingDrop(true);
    setLoadError(null);
    try {
      await ensureAnonymousSession();
      const d = await fetchDrop(dropId);
      setDrop(d);
    } catch (e) {
      setLoadError(apiUserMessageHeAuto(e));
      setDrop(null);
    } finally {
      setLoadingDrop(false);
    }
  }, [dropId]);

  useEffect(() => {
    if (cachedDrop) {
      setDrop(cachedDrop);
      setLoadingDrop(false);
      setLoadError(null);
      return;
    }
    void loadFromApi();
  }, [cachedDrop, loadFromApi]);

  const options: AnswerOption[] = useMemo(() => {
    if (!drop) return [];
    return getAnswerOptions(drop.category, drop.question);
  }, [drop]);

  const submit = async () => {
    if (!drop) return;
    if (!selectedKey) {
      Alert.alert('בחר תשובה', 'בחר אחת מהאפשרויות לפני שליחה.');
      return;
    }
    setBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        notifyError();
        Alert.alert('מיקום', LOCATION_PERMISSION_MESSAGE_HE);
        return;
      }
      let pos: Location.LocationObject;
      try {
        pos = await Location.getCurrentPositionAsync({});
      } catch {
        notifyError();
        Alert.alert(
          'מיקום',
          'לא הצלחנו לקרוא מיקום מהשטח. בדוק ש-GPS פעיל ונסה שוב.',
        );
        return;
      }
      const elig = canUserAnswerDrop({
        drop,
        userCoords: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: 'gps',
        },
      });
      if (!elig.canAnswer) {
        notifyError();
        Alert.alert('לא ניתן לענות', blockedReasonHe(elig.reason, elig.distanceMeters));
        return;
      }
      try {
        await ensureAnonymousSession();
        await postAnswer(dropId, {
          text: text.trim() || '—',
          quickStatus: selectedKey,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      } catch (e) {
        notifyError();
        Alert.alert('לא נשלח', apiUserMessageHeAuto(e));
        return;
      }
      notifySuccess();
      navigation.goBack();
    } finally {
      setBusy(false);
    }
  };

  if (loadingDrop && !drop) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.electricBright} />
        <Text style={styles.centerMuted}>טוען את השאלה…</Text>
      </View>
    );
  }

  if (!drop) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerTitle}>לא הצלחנו לטעון את השאלה</Text>
        <Text style={styles.centerMuted}>{loadError ?? 'נסה שוב בעוד רגע.'}</Text>
        <Button
          label="נסה שוב"
          icon="refresh"
          onPress={() => void loadFromApi()}
          fullWidth={false}
        />
        <Button
          label="חזור"
          variant="ghost"
          onPress={() => navigation.goBack()}
          fullWidth={false}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.navy }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.questionPreview}>
        <Text style={styles.questionPreviewText} numberOfLines={2}>
          {drop.question}
        </Text>
      </View>

      <Text style={styles.lead}>בחר תשובה מהירה — או הוסף פרטים מהשטח.</Text>

      <View style={styles.quickColumn}>
        {options.map((opt) => {
          const on = opt.key === selectedKey;
          return (
            <PressableScale
              key={opt.key}
              haptic="none"
              scaleTo={0.98}
              onPress={() => {
                tapLight();
                setSelectedKey(opt.key);
              }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected: on, disabled: busy }}
              style={[
                styles.quickBtn,
                on && [styles.quickBtnOn, { borderColor: opt.color }],
              ]}
            >
              <Text style={styles.quickIcon}>{opt.icon}</Text>
              <Text style={[styles.quickBtnText, on && styles.quickBtnTextOn]}>
                {opt.label}
              </Text>
              <Ionicons
                name={on ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={on ? opt.color : palette.textMuted}
              />
            </PressableScale>
          );
        })}
      </View>

      {options.length === 0 ? (
        <Text style={styles.noOptionsMuted}>
          לא נטענו אפשרויות תשובה לשאלה הזו — חזור ונסה שוב או רענן את השאלה.
        </Text>
      ) : null}

      <Text style={styles.label}>פרטים (אופציונלי)</Text>
      <TextInput
        style={styles.input}
        placeholder="משפט קצר על מה שאתה רואה…"
        placeholderTextColor="rgba(255,255,255,0.35)"
        value={text}
        onChangeText={setText}
        multiline
        textAlignVertical="top"
        textAlign="right"
        editable={!busy}
      />

      <Text style={styles.privacy}>
        המיקום נשמר בקירוב בלבד לאימות, ולא מוצג למשתמשים אחרים.
      </Text>

      <Button
        label="שלח תשובה"
        icon="send"
        variant="success"
        onPress={submit}
        loading={busy}
        disabled={!selectedKey || options.length === 0}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  centerTitle: {
    color: '#FECACA',
    fontWeight: '900',
    fontSize: 17,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  centerMuted: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 20,
    fontWeight: '600',
  },
  noOptionsMuted: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 16,
    lineHeight: 19,
    fontWeight: '600',
  },
  scroll: { padding: 16, paddingBottom: 40 },
  questionPreview: {
    backgroundColor: colors.bubble,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
  },
  questionPreviewText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'right',
  },
  lead: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'right',
    fontWeight: '600',
  },
  quickColumn: { gap: 10, marginBottom: 20 },
  quickBtn: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: colors.navyMuted,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  quickBtnOn: {
    backgroundColor: 'rgba(37, 99, 235, 0.28)',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  quickIcon: { fontSize: 22 },
  quickBtnText: { color: colors.textSecondary, fontWeight: '800', fontSize: 17, flex: 1, textAlign: 'right' },
  quickBtnTextOn: { color: colors.white },
  label: { color: colors.textSecondary, marginBottom: 8, fontWeight: '700', textAlign: 'right' },
  input: {
    minHeight: 96,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    padding: 14,
    color: colors.white,
    backgroundColor: colors.navyMuted,
    marginBottom: 12,
    fontSize: 16,
  },
  privacy: { color: colors.textSecondary, fontSize: 12, marginBottom: 18, textAlign: 'right' },
});
