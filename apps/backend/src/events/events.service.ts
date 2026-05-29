import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument, EventName } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  private readonly log = new Logger(EventsService.name);

  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
  ) {}

  async record(userId: string, dto: CreateEventDto) {
    const coarseLocation =
      typeof dto.lat === 'number' && typeof dto.lng === 'number'
        ? ([this.coarse(dto.lng), this.coarse(dto.lat)] as [number, number])
        : undefined;

    await this.eventModel.create({
      name: dto.name,
      userId: new Types.ObjectId(userId),
      dropId: dto.dropId,
      coarseLocation,
      radiusMeters: dto.radiusMeters,
      source: dto.source,
      platform: dto.platform,
    });
    return { ok: true };
  }

  /** Best-effort server-side event. Never throws — analytics must not break flows. */
  async track(
    name: EventName,
    userId: string,
    extra: { dropId?: string; source?: string } = {},
  ): Promise<void> {
    try {
      await this.eventModel.create({
        name,
        userId: new Types.ObjectId(userId),
        dropId: extra.dropId,
        source: extra.source,
      });
    } catch (err) {
      this.log.warn(`event ${name} dropped: ${(err as Error)?.message}`);
    }
  }

  /** Round to ~1.1km (2 dp) so analytics never holds precise coordinates. */
  private coarse(v: number): number {
    return Math.round(v * 100) / 100;
  }
}
