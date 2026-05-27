import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReportDto } from './create-report.dto';

async function errs(raw: unknown) {
  const e = await validate(plainToInstance(CreateReportDto, raw) as object);
  return e.map((x) => x.property);
}

describe('CreateReportDto', () => {
  it('accepts a valid drop report', async () => {
    expect(
      await errs({ targetType: 'drop', targetId: 'abc', reason: 'spam' }),
    ).toEqual([]);
  });

  it('accepts a valid answer report with details', async () => {
    expect(
      await errs({
        targetType: 'answer',
        targetId: 'abc',
        reason: 'abuse',
        details: 'more info',
      }),
    ).toEqual([]);
  });

  it('rejects unknown targetType', async () => {
    expect(
      await errs({ targetType: 'user', targetId: 'abc', reason: 'spam' }),
    ).toContain('targetType');
  });

  it('rejects empty targetId / reason', async () => {
    const props = await errs({ targetType: 'drop', targetId: '', reason: '' });
    expect(props).toContain('targetId');
    expect(props).toContain('reason');
  });

  it('rejects details longer than 1000 chars', async () => {
    expect(
      await errs({
        targetType: 'drop',
        targetId: 'a',
        reason: 'spam',
        details: 'x'.repeat(1001),
      }),
    ).toContain('details');
  });
});
