import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReportDocument = HydratedDocument<Report>;

export type ReportTargetType = 'drop' | 'answer';
export type ReportStatus = 'open' | 'reviewed' | 'dismissed';

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class Report {
  @Prop({ type: String, enum: ['drop', 'answer'], required: true, index: true })
  targetType: ReportTargetType;

  @Prop({ type: String, required: true, index: true })
  targetId: string;

  @Prop({ type: String, required: true, maxlength: 80 })
  reason: string;

  @Prop({ type: String, maxlength: 1000 })
  details?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  reporterUserId: Types.ObjectId;

  @Prop({ type: String, enum: ['open', 'reviewed', 'dismissed'], default: 'open' })
  status: ReportStatus;

  createdAt: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
