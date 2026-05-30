import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { DropCategory, DropStatus } from '../../common/enums';
import type { GeoPoint } from '../../geo/geo.types';

export type DropDocument = HydratedDocument<Drop>;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class Drop {
  @Prop({ required: true })
  question: string;

  @Prop({ type: String, enum: DropCategory, required: true })
  category: DropCategory;

  @Prop({
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true },
  })
  location: GeoPoint;

  @Prop({ type: Number, required: true, min: 10, max: 5000 })
  radiusMeters: number;

  @Prop({ type: String, enum: DropStatus, default: DropStatus.ACTIVE })
  status: DropStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Date })
  closedAt?: Date;

  /** When the doc may be hard-deleted (expiry + retention window). */
  @Prop({ type: Date })
  purgeAt?: Date;

  @Prop({ type: Number, default: 0 })
  answerCount: number;

  @Prop({ type: String, default: '' })
  aiSummary: string;

  @Prop({ type: Number, default: 0, min: 0, max: 1 })
  confidenceScore: number;

  createdAt: Date;
}

export const DropSchema = SchemaFactory.createForClass(Drop);

DropSchema.index({ location: '2dsphere' });
DropSchema.index({ status: 1, expiresAt: 1 });
// Retention: only docs with a `purgeAt` date are removed, and only once it passes.
// Open/active drops have no purgeAt, so they are never auto-deleted.
DropSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
