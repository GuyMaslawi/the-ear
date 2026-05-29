import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EVENT_NAMES, EVENT_PLATFORMS } from '../schemas/event.schema';
import type { EventName, EventPlatform } from '../schemas/event.schema';

export class CreateEventDto {
  @IsIn(EVENT_NAMES as unknown as string[])
  name: EventName;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  dropId?: string;

  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsLongitude()
  lng?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000)
  radiusMeters?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;

  @IsOptional()
  @IsIn(EVENT_PLATFORMS as unknown as string[])
  platform?: EventPlatform;
}
