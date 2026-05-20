import { IsNumber, Max, Min } from 'class-validator';

export class UpdateLocationDto {
  @Min(-90)
  @Max(90)
  @IsNumber()
  lat: number;

  @Min(-180)
  @Max(180)
  @IsNumber()
  lng: number;
}
