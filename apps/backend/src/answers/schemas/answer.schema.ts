import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { QuickStatus } from '../../common/enums';
import type { GeoPoint } from '../../geo/geo.types';

export type AnswerDocument = HydratedDocument<Answer>;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class Answer {
  @Prop({ type: Types.ObjectId, ref: 'Drop', required: true, index: true })
  dropId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, maxlength: 2000 })
  text: string;

  @Prop({ type: String, enum: QuickStatus, default: QuickStatus.UNKNOWN })
  quickStatus: QuickStatus;

  @Prop({
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true },
  })
  locationAtAnswer: GeoPoint;

  @Prop({ type: Number, required: true })
  distanceFromDrop: number;

  @Prop({ type: Number, required: true })
  trustWeight: number;

  createdAt: Date;
}

export const AnswerSchema = SchemaFactory.createForClass(Answer);

AnswerSchema.index({ dropId: 1, createdAt: -1 });
AnswerSchema.index({ locationAtAnswer: '2dsphere' });
