import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Drop, DropDocument } from './schemas/drop.schema';
import { CreateDropDto } from './dto/create-drop.dto';
import { DropStatus } from '../common/enums';
import { GeoService } from '../geo/geo.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class DropsService {
  private readonly log = new Logger(DropsService.name);

  constructor(
    @InjectModel(Drop.name) private dropModel: Model<DropDocument>,
    private readonly geo: GeoService,
    private readonly realtime: RealtimeService,
  ) {}

  private ensureActive(drop: DropDocument) {
    if (drop.status !== DropStatus.ACTIVE) return;
    if (drop.expiresAt <= new Date()) {
      drop.status = DropStatus.EXPIRED;
      void drop.save();
    }
  }

  async create(userId: string, dto: CreateDropDto) {
    const ttlMs = (dto.ttlHours ?? 24) * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);
    const location = this.geo.point(dto.lat, dto.lng);
    const doc = await this.dropModel.create({
      question: dto.question,
      category: dto.category,
      location,
      radiusMeters: dto.radiusMeters,
      status: DropStatus.ACTIVE,
      createdBy: new Types.ObjectId(userId),
      expiresAt,
      answerCount: 0,
      aiSummary: '',
      confidenceScore: 0,
    });
    this.realtime.emitNewDropNearby({
      dropId: String(doc._id),
      question: doc.question,
      category: doc.category,
      lat: dto.lat,
      lng: dto.lng,
      radiusMeters: doc.radiusMeters,
    });
    this.log.log(`Drop created id=${String(doc._id)} → socket new_drop_nearby`);
    return this.toPublicDrop(doc, userId);
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusMeters: number,
    viewerUserId?: string,
  ) {
    const now = new Date();
    const rows = await this.dropModel
      .find({
        status: DropStatus.ACTIVE,
        expiresAt: { $gt: now },
        location: {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: radiusMeters,
          },
        },
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
    return rows.map((d) => this.toPublicDrop(d, viewerUserId));
  }

  async findMine(userId: string) {
    const rows = await this.dropModel
      .find({ createdBy: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
    return rows.map((d) => this.toPublicDrop(d, userId));
  }

  async findById(id: string, viewerUserId?: string) {
    const doc = await this.dropModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Drop not found');
    this.ensureActive(doc);
    return this.toPublicDrop(doc, viewerUserId);
  }

  async incrementAnswerCount(dropId: string) {
    await this.dropModel
      .updateOne({ _id: new Types.ObjectId(dropId) }, { $inc: { answerCount: 1 } })
      .exec();
  }

  async updateAiSummary(
    dropId: string,
    summary: string,
    confidenceScore: number,
  ) {
    await this.dropModel
      .updateOne(
        { _id: new Types.ObjectId(dropId) },
        { aiSummary: summary, confidenceScore },
      )
      .exec();
  }

  async getRawDropForAnswer(dropId: string, userId: string) {
    const doc = await this.dropModel.findById(dropId).exec();
    if (!doc) throw new NotFoundException('Drop not found');
    this.ensureActive(doc);
    if (doc.status !== DropStatus.ACTIVE) {
      throw new ForbiddenException('Drop is not active');
    }
    return doc;
  }

  toPublicDrop(doc: DropDocument, viewerUserId?: string) {
    const mine =
      viewerUserId &&
      String(doc.createdBy) === String(viewerUserId);
    return {
      id: String(doc._id),
      question: doc.question,
      category: doc.category,
      location: doc.location,
      radiusMeters: doc.radiusMeters,
      status: doc.status,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
      answerCount: doc.answerCount,
      aiSummary: doc.aiSummary,
      confidenceScore: doc.confidenceScore,
      isMine: !!mine,
    };
  }
}
