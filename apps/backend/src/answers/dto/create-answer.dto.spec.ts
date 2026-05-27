import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAnswerDto } from './create-answer.dto';
import { QuickStatus } from '../../common/enums';

async function errs(raw: unknown) {
  const e = await validate(plainToInstance(CreateAnswerDto, raw) as object);
  return e.map((x) => x.property);
}

describe('CreateAnswerDto', () => {
  const good = {
    text: 'ריק לגמרי',
    quickStatus: QuickStatus.EMPTY,
    lat: 32.08,
    lng: 34.78,
  };

  it('accepts a valid payload', async () => {
    expect(await errs(good)).toEqual([]);
  });

  it('rejects when text exceeds 2000 chars', async () => {
    expect(await errs({ ...good, text: 'x'.repeat(2001) })).toContain('text');
  });

  it('rejects unknown quickStatus values', async () => {
    expect(await errs({ ...good, quickStatus: 'WHATEVER' })).toContain(
      'quickStatus',
    );
  });

  it('rejects out-of-range lat / lng', async () => {
    expect(await errs({ ...good, lat: 100 })).toContain('lat');
    expect(await errs({ ...good, lng: -181 })).toContain('lng');
  });
});
