import AsyncStorage from './__mocks__/async-storage';

type HCModule = typeof import('../lib/hiddenContent');

function load(): HCModule {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../lib/hiddenContent') as HCModule;
}

describe('hiddenContent persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('persists hidden drop ids and exposes them on next read', async () => {
    const { hideDrop } = load();
    await hideDrop('drop-1');
    await hideDrop('drop-2');
    const raw = await AsyncStorage.getItem('the-ear-hidden-drops');
    expect(JSON.parse(raw as string).sort()).toEqual(['drop-1', 'drop-2']);
  });

  it('persists hidden answer ids separately from drops', async () => {
    const { hideAnswer, hideDrop } = load();
    await hideDrop('drop-1');
    await hideAnswer('answer-1');
    expect(
      JSON.parse((await AsyncStorage.getItem('the-ear-hidden-answers')) as string),
    ).toEqual(['answer-1']);
    expect(
      JSON.parse((await AsyncStorage.getItem('the-ear-hidden-drops')) as string),
    ).toEqual(['drop-1']);
  });

  it('is idempotent — hiding the same id twice does not duplicate it', async () => {
    const { hideDrop } = load();
    await hideDrop('drop-1');
    await hideDrop('drop-1');
    expect(
      JSON.parse((await AsyncStorage.getItem('the-ear-hidden-drops')) as string),
    ).toEqual(['drop-1']);
  });

  it('hydrates the cache from previously-stored values on first read', async () => {
    await AsyncStorage.setItem(
      'the-ear-hidden-drops',
      JSON.stringify(['prev-1']),
    );
    const { hideDrop } = load();
    await hideDrop('new-1');
    const stored: string[] = JSON.parse(
      (await AsyncStorage.getItem('the-ear-hidden-drops')) as string,
    );
    expect(stored.sort()).toEqual(['new-1', 'prev-1']);
  });

  it('treats malformed JSON in storage as empty', async () => {
    await AsyncStorage.setItem('the-ear-hidden-drops', 'not-json');
    const { hideDrop } = load();
    await hideDrop('only-1');
    expect(
      JSON.parse((await AsyncStorage.getItem('the-ear-hidden-drops')) as string),
    ).toEqual(['only-1']);
  });
});
