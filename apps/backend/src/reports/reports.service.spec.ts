import { Types } from 'mongoose';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('creates a report with reporter ObjectId and open status', async () => {
    const create = jest.fn().mockResolvedValue({ _id: new Types.ObjectId() });
    const service = new ReportsService({ create } as never);
    const reporterId = new Types.ObjectId().toString();

    const out = await service.create(reporterId, {
      targetType: 'drop',
      targetId: 'abc123',
      reason: 'spam',
      details: 'looks fake',
    });

    expect(out).toEqual({ ok: true });
    const persisted = create.mock.calls[0][0];
    expect(persisted.targetType).toBe('drop');
    expect(persisted.targetId).toBe('abc123');
    expect(persisted.reason).toBe('spam');
    expect(persisted.status).toBe('open');
    expect(persisted.reporterUserId).toBeInstanceOf(Types.ObjectId);
    expect(persisted.reporterUserId.toString()).toBe(reporterId);
  });
});
