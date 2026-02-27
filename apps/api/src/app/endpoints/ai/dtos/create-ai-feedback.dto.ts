import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAiFeedbackDto {
  @IsString()
  @MaxLength(6000)
  public assistantReply: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public comment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  public model?: string;

  @IsString()
  @MaxLength(2000)
  public query: string;

  @IsString()
  @IsIn(['down', 'up'])
  public rating: 'down' | 'up';

  @IsString()
  @MaxLength(128)
  public sessionId: string;

  @IsOptional()
  public toolInvocations?: unknown[];

  @IsOptional()
  public verification?: unknown;
}
