import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { GeoPoint } from '../../geo/geo.types';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class User {
  @Prop({ required: true, unique: true, index: true })
  sessionToken: string;

  @Prop({ required: true })
  anonymousName: string;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: false,
      default: undefined,
    },
    coordinates: { type: [Number], default: undefined },
  })
  currentLocation?: GeoPoint;

  @Prop({ type: Date })
  lastSeenAt?: Date;

  @Prop({ type: Number, default: 50, min: 0, max: 100 })
  trustScore: number;

  @Prop({ type: String })
  pushToken?: string;

  createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ currentLocation: '2dsphere' });
