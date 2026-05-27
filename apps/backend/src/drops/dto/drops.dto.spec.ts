import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDropDto } from './create-drop.dto';
import { NearbyQueryDto } from './nearby-query.dto';
import { DropCategory } from '../../common/enums';

async function errs<T extends object>(cls: new () => T, raw: unknown) {
  const inst = plainToInstance(cls, raw);
  const e = await validate(inst as object);
  return e.map((x) => x.property);
}

describe('CreateDropDto', () => {
  const good = {
    question: 'יש תור בקופה?',
    category: DropCategory.QUEUE,
    lat: 32.0853,
    lng: 34.7818,
    radiusMeters: 500,
    ttlHours: 4,
  };

  it('passes for a valid payload', async () => {
    expect(await errs(CreateDropDto, good)).toEqual([]);
  });

  it('rejects question shorter than 3 chars', async () => {
    expect(await errs(CreateDropDto, { ...good, question: 'no' })).toContain(
      'question',
    );
  });

  it('rejects unknown category', async () => {
    expect(await errs(CreateDropDto, { ...good, category: 'BOGUS' })).toContain(
      'category',
    );
  });

  it('rejects lat outside [-90, 90]', async () => {
    expect(await errs(CreateDropDto, { ...good, lat: 91 })).toContain('lat');
    expect(await errs(CreateDropDto, { ...good, lat: -91 })).toContain('lat');
  });

  it('rejects lng outside [-180, 180]', async () => {
    expect(await errs(CreateDropDto, { ...good, lng: 181 })).toContain('lng');
  });

  it('rejects radiusMeters outside [10, 5000]', async () => {
    expect(await errs(CreateDropDto, { ...good, radiusMeters: 9 })).toContain(
      'radiusMeters',
    );
    expect(
      await errs(CreateDropDto, { ...good, radiusMeters: 6000 }),
    ).toContain('radiusMeters');
  });

  it('rejects ttlHours below 15 minutes or above 168h', async () => {
    expect(await errs(CreateDropDto, { ...good, ttlHours: 0.1 })).toContain(
      'ttlHours',
    );
    expect(await errs(CreateDropDto, { ...good, ttlHours: 200 })).toContain(
      'ttlHours',
    );
  });
});

describe('NearbyQueryDto', () => {
  it('transforms string query params into numbers and accepts valid values', async () => {
    const inst = plainToInstance(NearbyQueryDto, {
      lat: '32.08',
      lng: '34.78',
      radius: '500',
    });
    expect(typeof inst.lat).toBe('number');
    expect(typeof inst.radius).toBe('number');
    expect(await validate(inst as object)).toEqual([]);
  });

  it('rejects radius below 50m or above 10km', async () => {
    expect(
      await errs(NearbyQueryDto, { lat: '0', lng: '0', radius: '10' }),
    ).toContain('radius');
    expect(
      await errs(NearbyQueryDto, { lat: '0', lng: '0', radius: '99999' }),
    ).toContain('radius');
  });
});
