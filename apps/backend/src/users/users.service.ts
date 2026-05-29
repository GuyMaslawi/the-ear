import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { GeoService } from '../geo/geo.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly geo: GeoService,
    private readonly realtime: RealtimeService,
  ) {}

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findBySessionToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ sessionToken: token }).exec();
  }

  async createAnonymous(sessionToken: string, anonymousName: string) {
    const doc = await this.userModel.create({
      sessionToken,
      anonymousName,
      trustScore: 50,
    });
    return doc;
  }

  async setPushToken(userId: string, pushToken: string) {
    await this.userModel
      .findByIdAndUpdate(userId, { pushToken })
      .exec();
  }

  async updateLocation(userId: string, lat: number, lng: number) {
    const point = this.geo.point(lat, lng);
    const doc = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          currentLocation: point,
          lastSeenAt: new Date(),
        },
        { new: true },
      )
      .exec();
    this.realtime.setUserLocation(userId, lat, lng);
    return doc;
  }

  /**
   * Users whose last known coordinates fall inside the circle (for MVP targeting).
   */
  async findUserIdsNear(lat: number, lng: number, radiusMeters: number) {
    const rows = await this.userModel
      .find({
        currentLocation: {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusMeters / 6378100],
          },
        },
      })
      .select('_id')
      .lean()
      .exec();
    return rows.map((r) => String(r._id));
  }
}
