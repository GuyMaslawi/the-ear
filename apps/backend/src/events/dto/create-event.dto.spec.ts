import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEventDto } from './create-event.dto';

async function errs(raw: unknown) {
  const e = await validate(plainToInstance(CreateEventDto, raw) as object);
  return e.map((x) => x.property);
}

describe('CreateEventDto', () => {
  it('accepts a bare event name', async () => {
    expect(await errs({ name: 'app_opened' })).toEqual([]);
  });

  it('accepts full safe metadata', async () => {
    expect(
      await errs({
        name: 'question_submitted',
        dropId: 'abc',
        lat: 32.08,
        lng: 34.78,
        radiusMeters: 220,
        source: 'CreateDrop',
        platform: 'ios',
      }),
    ).toEqual([]);
  });

  it('rejects an unknown event name', async () => {
    expect(await errs({ name: 'totally_made_up' })).toContain('name');
  });

  it('rejects out-of-range coordinates', async () => {
    const props = await errs({ name: 'location_selected', lat: 999, lng: 999 });
    expect(props).toContain('lat');
    expect(props).toContain('lng');
  });

  it('rejects an unknown platform', async () => {
    expect(await errs({ name: 'app_opened', platform: 'windows' })).toContain(
      'platform',
    );
  });
});
