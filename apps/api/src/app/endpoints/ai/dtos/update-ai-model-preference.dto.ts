import { IsString, MaxLength } from 'class-validator';

export class UpdateAiModelPreferenceDto {
  @IsString()
  @MaxLength(128)
  public selectedModel: string;
}
