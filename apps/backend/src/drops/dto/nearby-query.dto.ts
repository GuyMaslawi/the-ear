import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class NearbyQueryDto {
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @Min(-180)
  @Max(180)
  @IsNumber()
  lng: number;

  /** meters */
  @Type(() => Number)
  @Min(50)
  @Max(10000)
  @IsNumber()
  radius: number;
}
