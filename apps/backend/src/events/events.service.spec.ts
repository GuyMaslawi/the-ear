import { Types } from 'mongoose';
import { EventsService } from './events.service';

describe('EventsService', () => {
  it('records an event with userId ObjectId and coarse location (~1.1km)', async () => {
    const create = jest.fn().mockResolvedValue({ _id: new Types.ObjectId() });
    const service = new EventsService({ create } as never);
    const userId = new Types.ObjectId().toString();

    const out = await service.record(userId, {
      name: 'question_submitted',
      dropId: 'abc123',
      lat: 32.085312,
      lng: 34.781812,
      radiusMeters: 220,
      source: 'CreateDrop',
      platform: 'ios',
    });

    expect(out).toEqual({ ok: true });
    const persisted = create.mock.calls[0][0];
    expect(persisted.name).toBe('question_submitted');
    expect(persisted.dropId).toBe('abc123');
    expect(persisted.userId).toBeInstanceOf(Types.ObjectId);
    // [lng, lat] rounded to 2dp — never stores precise coordinates
    expect(persisted.coarseLocation).toEqual([34.78, 32.09]);
  });

  it('omits coarseLocation when no coordinates are provided', async () => {
    const create = jest.fn().mockResolvedValue({ _id: new Types.ObjectId() });
    const service = new EventsService({ create } as never);

    await service.record(new Types.ObjectId().toString(), {
      name: 'app_opened',
      platform: 'android',
    });

    expect(create.mock.calls[0][0].coarseLocation).toBeUndefined();
  });

  it('track() never throws when the model write fails', async () => {
    const create = jest.fn().mockRejectedValue(new Error('db down'));
    const service = new EventsService({ create } as never);

    await expect(
      service.track('answer_received_by_asker', new Types.ObjectId().toString(), {
        dropId: 'd1',
      }),
    ).resolves.toBeUndefined();
  });
});
