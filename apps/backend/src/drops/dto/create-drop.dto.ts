import {
  IsEnum,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DropCategory } from '../../common/enums';

export class CreateDropDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  question: string;

  @IsEnum(DropCategory)
  category: DropCategory;

  @Min(-90)
  @Max(90)
  @IsNumber()
  lat: number;

  @Min(-180)
  @Max(180)
  @IsNumber()
  lng: number;

  @Min(10)
  @Max(5000)
  @IsNumber()
  radiusMeters: number;

  /** Hours until expiry (MVP). */
  @Min(0.25)
  @Max(168)
  @IsNumber()
  ttlHours?: number;
}
