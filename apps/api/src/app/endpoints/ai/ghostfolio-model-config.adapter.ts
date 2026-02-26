import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';
import {
  buildGhostAgentModelCatalog,
  resolveGhostAgentModel
} from '@ghostfolio/ghostagent/backend/model-catalog';
import type {
  GhostAgentModelConfigAdapter,
  GhostAgentResolvedModelConfig
} from '@ghostfolio/ghostagent/contracts/model-config.interface';

import { Injectable } from '@nestjs/common';

@Injectable()
export class GhostfolioModelConfigAdapter implements GhostAgentModelConfigAdapter {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly propertyService: PropertyService
  ) {}

  public async getModelConfig(): Promise<GhostAgentResolvedModelConfig> {
    const envApiKey = this.configurationService.get('OPENROUTER_API_KEY');
    const envModel = this.configurationService.get('OPENROUTER_MODEL');
    const additionalModelsRaw =
      this.configurationService.get('AI_MODEL_CATALOG');
    const additionalModels = additionalModelsRaw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const modelCatalog = buildGhostAgentModelCatalog({
      additionalModels
    });
    const dbApiKey = await this.propertyService.getByKey<string>(
      PROPERTY_API_KEY_OPENROUTER
    );
    const dbModel = await this.propertyService.getByKey<string>(
      PROPERTY_OPENROUTER_MODEL
    );
    const model = resolveGhostAgentModel({
      catalog: modelCatalog,
      requestedModel: envModel || dbModel
    });
    const apiKey = envApiKey || dbApiKey;

    return {
      apiKey,
      baseUrl: 'https://openrouter.ai/api/v1',
      model
    };
  }
}
