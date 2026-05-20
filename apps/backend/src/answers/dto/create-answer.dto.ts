import { IsEnum, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';
import { QuickStatus } from '../../common/enums';

export class CreateAnswerDto {
  @IsString()
  @MaxLength(2000)
  text: string;

  @IsEnum(QuickStatus)
  quickStatus: QuickStatus;

  @Min(-90)
  @Max(90)
  @IsNumber()
  lat: number;

  @Min(-180)
  @Max(180)
  @IsNumber()
  lng: number;
}
