import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetAiFeedbackQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @Min(0)
  @Max(5000)
  public skip?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @Min(1)
  @Max(200)
  public take?: number;

  @IsOptional()
  @IsString()
  @IsIn(['down', 'up'])
  public rating?: 'down' | 'up';
}
