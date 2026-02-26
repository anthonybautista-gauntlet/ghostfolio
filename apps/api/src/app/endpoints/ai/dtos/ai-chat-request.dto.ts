import { Filter } from '@ghostfolio/common/interfaces';

import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from 'class-validator';

export class AiChatRequestDto {
  @IsArray()
  @IsOptional()
  public filters?: Filter[];

  @IsString()
  @MaxLength(2000)
  @MinLength(1)
  public message: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  public selectedModel?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  public sessionId?: string;
}
