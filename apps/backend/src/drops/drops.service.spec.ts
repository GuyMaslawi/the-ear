import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DropsService } from './drops.service';
import { GeoService } from '../geo/geo.service';
import { DropStatus, DropCategory } from '../common/enums';
import type { RealtimeService } from '../realtime/realtime.service';

function makeDropDoc(overrides: Partial<Record<string, unknown>> = {}) {
  const _id = new Types.ObjectId();
  return {
    _id,
    question: 'יש תור?',
    category: DropCategory.QUEUE,
    location: { type: 'Point', coordinates: [34.78, 32.08] },
    radiusMeters: 500,
    status: DropStatus.ACTIVE,
    createdBy: new Types.ObjectId(),
    expiresAt: new Date(Date.now() + 60_000),
    closedAt: undefined as Date | undefined,
    purgeAt: undefined as Date | undefined,
    answerCount: 0,
    aiSummary: '',
    confidenceScore: 0,
    createdAt: new Date(),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('DropsService', () => {
  const geo = new GeoService();
  let realtime: jest.Mocked<RealtimeService>;
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    updateOne: jest.Mock;
  };
  let service: DropsService;

  beforeEach(() => {
    realtime = {
      emitNewDropNearby: jest.fn(),
      emitDropUpdated: jest.fn(),
    } as unknown as jest.Mocked<RealtimeService>;
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      updateOne: jest.fn(),
    };
    service = new DropsService(model as never, geo, realtime);
  });

  describe('create', () => {
    it('persists with expiresAt = now + ttlHours, emits realtime, returns isMine=true', async () => {
      const userId = new Types.ObjectId().toString();
      const doc = makeDropDoc({ createdBy: new Types.ObjectId(userId) });
      model.create.mockResolvedValue(doc);

      const before = Date.now();
      const result = await service.create(userId, {
        question: 'יש תור?',
        category: DropCategory.QUEUE,
        lat: 32.08,
        lng: 34.78,
        radiusMeters: 500,
        ttlHours: 2,
      });
      const after = Date.now();

      const persisted = model.create.mock.calls[0][0];
      expect(persisted.location).toEqual({
        type: 'Point',
        coordinates: [34.78, 32.08],
      });
      const expMs = persisted.expiresAt.getTime();
      expect(expMs).toBeGreaterThanOrEqual(before + 2 * 3600_000);
      expect(expMs).toBeLessThanOrEqual(after + 2 * 3600_000);

      expect(realtime.emitNewDropNearby).toHaveBeenCalledWith(
        expect.objectContaining({
          dropId: String(doc._id),
          category: DropCategory.QUEUE,
          radiusMeters: 500,
        }),
      );
      expect(result.isMine).toBe(true);
    });

    it('defaults ttlHours to 6 hours when omitted', async () => {
      model.create.mockResolvedValue(makeDropDoc());
      const before = Date.now();
      await service.create(new Types.ObjectId().toString(), {
        question: 'a question',
        category: DropCategory.OTHER,
        lat: 0,
        lng: 0,
        radiusMeters: 500,
      } as never);
      const after = Date.now();
      const persisted = model.create.mock.calls[0][0];
      const ttlMs = 6 * 3600_000;
      expect(persisted.expiresAt.getTime()).toBeGreaterThanOrEqual(before + ttlMs);
      expect(persisted.expiresAt.getTime()).toBeLessThanOrEqual(after + ttlMs);
    });

    it('sets purgeAt to expiresAt + 30 day retention window', async () => {
      model.create.mockResolvedValue(makeDropDoc());
      await service.create(new Types.ObjectId().toString(), {
        question: 'a question',
        category: DropCategory.OTHER,
        lat: 0,
        lng: 0,
        radiusMeters: 500,
        ttlHours: 2,
      });
      const persisted = model.create.mock.calls[0][0];
      const retentionMs = 30 * 24 * 3600_000;
      expect(persisted.purgeAt.getTime()).toBe(
        persisted.expiresAt.getTime() + retentionMs,
      );
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when drop not found', async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.findById('any')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('flips status to EXPIRED when active drop is past expiresAt', async () => {
      const expiredDoc = makeDropDoc({
        status: DropStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 1000),
      });
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(expiredDoc),
      });
      const result = await service.findById('id');
      expect(expiredDoc.status).toBe(DropStatus.EXPIRED);
      expect(expiredDoc.save).toHaveBeenCalled();
      expect(result.status).toBe(DropStatus.EXPIRED);
    });

    it('returns isMine=true when viewer matches creator', async () => {
      const userId = new Types.ObjectId();
      const doc = makeDropDoc({ createdBy: userId });
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
      const out = await service.findById('id', userId.toString());
      expect(out.isMine).toBe(true);
    });
  });

  describe('closeOwn', () => {
    it('throws ForbiddenException when caller is not the owner', async () => {
      const doc = makeDropDoc();
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
      await expect(
        service.closeOwn('id', new Types.ObjectId().toString()),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(doc.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when drop missing', async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.closeOwn('x', 'u')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('sets status=CLOSED and saves when caller owns the drop', async () => {
      const userId = new Types.ObjectId();
      const doc = makeDropDoc({ createdBy: userId });
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
      const out = await service.closeOwn('id', userId.toString());
      expect(doc.status).toBe(DropStatus.CLOSED);
      expect(doc.closedAt).toBeInstanceOf(Date);
      expect(doc.save).toHaveBeenCalled();
      expect(out.status).toBe(DropStatus.CLOSED);
    });

    it('is idempotent for already-CLOSED drops (no extra save)', async () => {
      const userId = new Types.ObjectId();
      const doc = makeDropDoc({ createdBy: userId, status: DropStatus.CLOSED });
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
      await service.closeOwn('id', userId.toString());
      expect(doc.save).not.toHaveBeenCalled();
    });
  });

  describe('getRawDropForAnswer', () => {
    it('throws Forbidden when drop is not ACTIVE', async () => {
      const doc = makeDropDoc({ status: DropStatus.CLOSED });
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
      await expect(
        service.getRawDropForAnswer('id', 'u'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns raw document when drop is ACTIVE', async () => {
      const doc = makeDropDoc({ status: DropStatus.ACTIVE });
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
      const out = await service.getRawDropForAnswer('id', 'u');
      expect(out).toBe(doc);
    });
  });

  describe('findNearby', () => {
    it('queries active+unexpired drops via $nearSphere with provided radius', async () => {
      const exec = jest.fn().mockResolvedValue([]);
      const limit = jest.fn().mockReturnValue({ exec });
      const sort = jest.fn().mockReturnValue({ limit });
      model.find.mockReturnValue({ sort });
      await service.findNearby(32, 34, 1000);
      const filter = model.find.mock.calls[0][0];
      expect(filter.status).toBe(DropStatus.ACTIVE);
      expect(filter.location.$nearSphere.$geometry.coordinates).toEqual([34, 32]);
      expect(filter.location.$nearSphere.$maxDistance).toBe(1000);
    });
  });
});
