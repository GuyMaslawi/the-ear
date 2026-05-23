import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateReportDto {
  @IsIn(['drop', 'answer'])
  targetType: 'drop' | 'answer';

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  targetId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
