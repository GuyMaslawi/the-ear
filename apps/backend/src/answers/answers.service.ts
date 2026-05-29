import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Answer, AnswerDocument } from './schemas/answer.schema';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { DropsService } from '../drops/drops.service';
import { GeoService } from '../geo/geo.service';
import { AiSummaryService } from '../ai-summary/ai-summary.service';
import { RealtimeService } from '../realtime/realtime.service';
import { UsersService } from '../users/users.service';
import { PushService } from '../notifications/push.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class AnswersService {
  constructor(
    @InjectModel(Answer.name) private answerModel: Model<AnswerDocument>,
    private readonly drops: DropsService,
    private readonly geo: GeoService,
    private readonly ai: AiSummaryService,
    private readonly realtime: RealtimeService,
    private readonly users: UsersService,
    private readonly push: PushService,
    private readonly events: EventsService,
  ) {}

  async create(dropId: string, userId: string, dto: CreateAnswerDto) {
    const drop = await this.drops.getRawDropForAnswer(dropId, userId);
    if (String(drop.createdBy) === String(userId)) {
      throw new ForbiddenException('Cannot answer your own question');
    }
    const dropPoint = drop.location;
    const answerPoint = this.geo.point(dto.lat, dto.lng);
    const distance = this.geo.distanceMeters(dropPoint, answerPoint);
    if (distance > drop.radiusMeters) {
      throw new ForbiddenException(
        'You must be within the drop radius to answer',
      );
    }
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const trustWeight = (user.trustScore ?? 50) / 100;
    const approx = this.geo.approximatePoint(dto.lat, dto.lng);

    const doc = await this.answerModel.create({
      dropId: new Types.ObjectId(dropId),
      userId: new Types.ObjectId(userId),
      text: dto.text,
      quickStatus: dto.quickStatus,
      locationAtAnswer: approx,
      distanceFromDrop: Math.round(distance),
      trustWeight,
    });

    await this.drops.incrementAnswerCount(dropId);
    await this.refreshAiAndNotify(dropId, String(drop.createdBy));
    await this.notifyAsker(String(drop.createdBy), userId, drop.question);

    if (String(drop.createdBy) !== String(userId)) {
      await this.events.track('answer_received_by_asker', String(drop.createdBy), {
        dropId,
        source: 'backend',
      });
    }

    return this.toPublicAnswer(doc, userId);
  }

  async listForDrop(dropId: string, viewerUserId: string) {
    await this.drops.findById(dropId, viewerUserId);
    const rows = await this.answerModel
      .find({ dropId: new Types.ObjectId(dropId) })
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();
    return rows.map((a) => this.toPublicAnswer(a, viewerUserId));
  }

  /** Best-effort: tell the original asker their drop got an answer. Never throws. */
  private async notifyAsker(
    askerUserId: string,
    answerUserId: string,
    question: string,
  ) {
    try {
      if (askerUserId === String(answerUserId)) return;
      const asker = await this.users.findById(askerUserId);
      if (!asker?.pushToken) return;
      await this.push.notifyDropAnswered(asker.pushToken, question);
    } catch {
      /* push must never break answer creation */
    }
  }

  private async refreshAiAndNotify(dropId: string, creatorUserId: string) {
    const answers = await this.answerModel
      .find({ dropId: new Types.ObjectId(dropId) })
      .exec();
    const { text, confidenceScore } = this.ai.summarize(answers);
    await this.drops.updateAiSummary(dropId, text, confidenceScore);
    const fresh = await this.drops.findById(dropId);
    this.realtime.emitDropUpdated(
      dropId,
      {
        drop: fresh,
        latestAnswerCount: answers.length,
      },
      creatorUserId,
    );
  }

  private toPublicAnswer(doc: AnswerDocument, viewerUserId: string) {
    return {
      id: String(doc._id),
      dropId: String(doc.dropId),
      text: doc.text,
      quickStatus: doc.quickStatus,
      distanceFromDrop: doc.distanceFromDrop,
      trustWeight: doc.trustWeight,
      createdAt: doc.createdAt,
      isMine: String(doc.userId) === viewerUserId,
    };
  }
}
