import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AnswersService } from './answers.service';
import { GeoService } from '../geo/geo.service';
import { AiSummaryService } from '../ai-summary/ai-summary.service';
import { DropStatus, DropCategory, QuickStatus } from '../common/enums';

function makeRawDrop(over: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    question: 'q',
    category: DropCategory.QUEUE,
    location: { type: 'Point', coordinates: [34.78, 32.08] },
    radiusMeters: 500,
    status: DropStatus.ACTIVE,
    createdBy: new Types.ObjectId(),
    expiresAt: new Date(Date.now() + 60_000),
    ...over,
  };
}

describe('AnswersService', () => {
  const geo = new GeoService();
  const ai = new AiSummaryService();
  let answerModel: { create: jest.Mock; find: jest.Mock };
  let drops: {
    getRawDropForAnswer: jest.Mock;
    incrementAnswerCount: jest.Mock;
    updateAiSummary: jest.Mock;
    findById: jest.Mock;
  };
  let realtime: { emitDropUpdated: jest.Mock };
  let users: { findById: jest.Mock };
  let push: { notifyDropAnswered: jest.Mock };
  let events: { track: jest.Mock };
  let service: AnswersService;

  beforeEach(() => {
    answerModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    };
    drops = {
      getRawDropForAnswer: jest.fn(),
      incrementAnswerCount: jest.fn().mockResolvedValue(undefined),
      updateAiSummary: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue({ id: 'd1' }),
    };
    realtime = { emitDropUpdated: jest.fn() };
    users = { findById: jest.fn() };
    push = { notifyDropAnswered: jest.fn().mockResolvedValue(undefined) };
    events = { track: jest.fn().mockResolvedValue(undefined) };
    service = new AnswersService(
      answerModel as never,
      drops as never,
      geo,
      ai,
      realtime as never,
      users as never,
      push as never,
      events as never,
    );
  });

  it('forbids answering your own drop', async () => {
    const userId = new Types.ObjectId();
    drops.getRawDropForAnswer.mockResolvedValue(
      makeRawDrop({ createdBy: userId }),
    );
    await expect(
      service.create('d1', userId.toString(), {
        text: 'x',
        quickStatus: QuickStatus.YES,
        lat: 32.08,
        lng: 34.78,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(answerModel.create).not.toHaveBeenCalled();
  });

  it('forbids answers outside the drop radius', async () => {
    drops.getRawDropForAnswer.mockResolvedValue(makeRawDrop({ radiusMeters: 100 }));
    users.findById.mockResolvedValue({ trustScore: 50 });
    // ~1km off in latitude => well beyond 100m
    await expect(
      service.create('d1', new Types.ObjectId().toString(), {
        text: 'x',
        quickStatus: QuickStatus.YES,
        lat: 32.09,
        lng: 34.78,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFound when answering user record is gone', async () => {
    drops.getRawDropForAnswer.mockResolvedValue(makeRawDrop());
    users.findById.mockResolvedValue(null);
    await expect(
      service.create('d1', new Types.ObjectId().toString(), {
        text: 'x',
        quickStatus: QuickStatus.YES,
        lat: 32.08,
        lng: 34.78,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('persists rounded distance, approximate location, and trustWeight from user.trustScore', async () => {
    drops.getRawDropForAnswer.mockResolvedValue(makeRawDrop());
    users.findById.mockResolvedValue({ trustScore: 75 });
    answerModel.create.mockResolvedValue({
      _id: new Types.ObjectId(),
      dropId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      text: 'all good',
      quickStatus: QuickStatus.EMPTY,
      distanceFromDrop: 0,
      trustWeight: 0.75,
      createdAt: new Date(),
    });

    const dropId = new Types.ObjectId().toString();
    await service.create(dropId, new Types.ObjectId().toString(), {
      text: 'all good',
      quickStatus: QuickStatus.EMPTY,
      lat: 32.08,
      lng: 34.78,
    });

    const persisted = answerModel.create.mock.calls[0][0];
    expect(persisted.trustWeight).toBeCloseTo(0.75, 5);
    expect(persisted.locationAtAnswer.type).toBe('Point');
    expect(typeof persisted.distanceFromDrop).toBe('number');
    expect(Number.isInteger(persisted.distanceFromDrop)).toBe(true);

    expect(drops.incrementAnswerCount).toHaveBeenCalledWith(dropId);
    expect(drops.updateAiSummary).toHaveBeenCalled();
    expect(realtime.emitDropUpdated).toHaveBeenCalled();
  });

  it('notifies the asker (not the answerer) with their drop question', async () => {
    const askerId = new Types.ObjectId();
    drops.getRawDropForAnswer.mockResolvedValue(
      makeRawDrop({ createdBy: askerId, question: 'יש תור בסניף?' }),
    );
    // 1st findById = answering user (trustScore), 2nd = asker (pushToken)
    users.findById
      .mockResolvedValueOnce({ trustScore: 50 })
      .mockResolvedValueOnce({ pushToken: 'ExponentPushToken[abc]' });
    answerModel.create.mockResolvedValue({
      _id: new Types.ObjectId(),
      dropId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      text: 'כן',
      quickStatus: QuickStatus.YES,
      distanceFromDrop: 0,
      trustWeight: 0.5,
      createdAt: new Date(),
    });

    await service.create(
      new Types.ObjectId().toString(),
      new Types.ObjectId().toString(),
      { text: 'כן', quickStatus: QuickStatus.YES, lat: 32.08, lng: 34.78 },
    );

    expect(push.notifyDropAnswered).toHaveBeenCalledWith(
      'ExponentPushToken[abc]',
      'יש תור בסניף?',
    );
  });

  it('does not notify when the asker has no push token', async () => {
    drops.getRawDropForAnswer.mockResolvedValue(makeRawDrop());
    users.findById
      .mockResolvedValueOnce({ trustScore: 50 })
      .mockResolvedValueOnce({ trustScore: 50 });
    answerModel.create.mockResolvedValue({
      _id: new Types.ObjectId(),
      dropId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      text: 't',
      quickStatus: QuickStatus.YES,
      distanceFromDrop: 0,
      trustWeight: 0.5,
      createdAt: new Date(),
    });

    await service.create(
      new Types.ObjectId().toString(),
      new Types.ObjectId().toString(),
      { text: 't', quickStatus: QuickStatus.YES, lat: 32.08, lng: 34.78 },
    );

    expect(push.notifyDropAnswered).not.toHaveBeenCalled();
  });

  it('defaults trustWeight to 0.5 when user has no trustScore', async () => {
    drops.getRawDropForAnswer.mockResolvedValue(makeRawDrop());
    users.findById.mockResolvedValue({ trustScore: undefined });
    answerModel.create.mockResolvedValue({
      _id: new Types.ObjectId(),
      dropId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      text: 't',
      quickStatus: QuickStatus.YES,
      distanceFromDrop: 0,
      trustWeight: 0.5,
      createdAt: new Date(),
    });
    await service.create(
      new Types.ObjectId().toString(),
      new Types.ObjectId().toString(),
      {
        text: 't',
        quickStatus: QuickStatus.YES,
        lat: 32.08,
        lng: 34.78,
      },
    );
    expect(answerModel.create.mock.calls[0][0].trustWeight).toBeCloseTo(0.5, 5);
  });
});
