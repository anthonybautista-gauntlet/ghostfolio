import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  buildGhostAgentModelCatalog,
  resolveGhostAgentModel
} from '@ghostfolio/ghostagent/backend/model-catalog';
import type {
  GhostAgentModelConfigAdapter,
  GhostAgentModelConfigOptions,
  GhostAgentResolvedModelConfig
} from '@ghostfolio/ghostagent/contracts/model-config.interface';

import { HttpException, Injectable } from '@nestjs/common';
import { StatusCodes } from 'http-status-codes';

@Injectable()
export class GhostfolioModelConfigAdapter implements GhostAgentModelConfigAdapter {
  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  public getModelCatalog() {
    const additionalModelsRaw =
      this.configurationService.get('AI_MODEL_CATALOG');
    const additionalModels = additionalModelsRaw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    return buildGhostAgentModelCatalog({
      additionalModels
    });
  }

  public async getModelConfig(
    options?: GhostAgentModelConfigOptions
  ): Promise<GhostAgentResolvedModelConfig> {
    const envApiKey = this.configurationService.get('OPENROUTER_API_KEY');
    const envModel = this.configurationService.get('OPENROUTER_MODEL');
    const modelCatalog = this.getModelCatalog();

    if (!envApiKey) {
      throw new HttpException(
        'OPENROUTER_API_KEY is required for Ghost Agent runtime.',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const model = resolveGhostAgentModel({
      catalog: modelCatalog,
      requestedModel: options?.requestedModel || envModel
    });

    return {
      apiKey: envApiKey,
      baseUrl: 'https://openrouter.ai/api/v1',
      model
    };
  }
}
