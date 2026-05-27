import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateLocationDto } from './update-location.dto';

async function errs(raw: unknown) {
  const e = await validate(plainToInstance(UpdateLocationDto, raw) as object);
  return e.map((x) => x.property);
}

describe('UpdateLocationDto', () => {
  it('accepts in-range coordinates', async () => {
    expect(await errs({ lat: 32.08, lng: 34.78 })).toEqual([]);
  });

  it('rejects out-of-range lat / lng', async () => {
    expect(await errs({ lat: 91, lng: 0 })).toContain('lat');
    expect(await errs({ lat: 0, lng: -181 })).toContain('lng');
  });

  it('rejects missing values', async () => {
    const props = await errs({});
    expect(props).toContain('lat');
    expect(props).toContain('lng');
  });
});
