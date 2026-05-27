type Store = Map<string, string>;

const g = globalThis as unknown as { __asyncStorageStore?: Store };
if (!g.__asyncStorageStore) g.__asyncStorageStore = new Map<string, string>();
const store: Store = g.__asyncStorageStore;

const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return store.has(key) ? (store.get(key) as string) : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
  async clear(): Promise<void> {
    store.clear();
  },
  __store: store,
};

export default AsyncStorage;
