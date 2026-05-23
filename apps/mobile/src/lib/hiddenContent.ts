import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DROPS_KEY = 'the-ear-hidden-drops';
const ANSWERS_KEY = 'the-ear-hidden-answers';

type HiddenSnapshot = {
  drops: ReadonlySet<string>;
  answers: ReadonlySet<string>;
};

let cache: HiddenSnapshot = {
  drops: new Set<string>(),
  answers: new Set<string>(),
};
let loaded = false;
let loadPromise: Promise<void> | null = null;

const listeners = new Set<(s: HiddenSnapshot) => void>();

function emit() {
  for (const l of listeners) l(cache);
}

async function readKey(key: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function writeKey(key: string, set: ReadonlySet<string>) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    /* best-effort local persistence */
  }
}

async function loadOnce(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const [drops, answers] = await Promise.all([
      readKey(DROPS_KEY),
      readKey(ANSWERS_KEY),
    ]);
    cache = { drops: new Set(drops), answers: new Set(answers) };
    loaded = true;
    emit();
  })();
  return loadPromise;
}

export async function hideDrop(id: string): Promise<void> {
  await loadOnce();
  if (cache.drops.has(id)) return;
  const next = new Set(cache.drops);
  next.add(id);
  cache = { ...cache, drops: next };
  emit();
  await writeKey(DROPS_KEY, next);
}

export async function hideAnswer(id: string): Promise<void> {
  await loadOnce();
  if (cache.answers.has(id)) return;
  const next = new Set(cache.answers);
  next.add(id);
  cache = { ...cache, answers: next };
  emit();
  await writeKey(ANSWERS_KEY, next);
}

/** Returns hidden ID sets and a ready flag. Re-renders on changes. */
export function useHiddenContent() {
  const [snap, setSnap] = useState<HiddenSnapshot>(cache);
  const [ready, setReady] = useState(loaded);

  useEffect(() => {
    const listener = (s: HiddenSnapshot) => setSnap(s);
    listeners.add(listener);
    if (!loaded) {
      void loadOnce().then(() => setReady(true));
    } else {
      setReady(true);
    }
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    hiddenDropIds: snap.drops,
    hiddenAnswerIds: snap.answers,
    ready,
  };
}
