import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EventDocument = HydratedDocument<Event>;

export const EVENT_NAMES = [
  'app_opened',
  'location_selected',
  'question_started',
  'question_submitted',
  'question_shared',
  'answer_submitted',
  'answer_received_by_asker',
  'drop_details_opened',
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

export const EVENT_PLATFORMS = ['ios', 'android', 'web'] as const;
export type EventPlatform = (typeof EVENT_PLATFORMS)[number];

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class Event {
  @Prop({ type: String, enum: EVENT_NAMES, required: true, index: true })
  name: EventName;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, maxlength: 64 })
  dropId?: string;

  /** Coarse [lng, lat] rounded server-side to ~1.1km. Never high precision. */
  @Prop({ type: [Number] })
  coarseLocation?: [number, number];

  @Prop({ type: Number })
  radiusMeters?: number;

  @Prop({ type: String, maxlength: 40 })
  source?: string;

  @Prop({ type: String, enum: EVENT_PLATFORMS })
  platform?: EventPlatform;

  createdAt: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);

EventSchema.index({ name: 1, createdAt: -1 });
