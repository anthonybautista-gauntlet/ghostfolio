import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { HttpException } from '@nestjs/common';

import { GhostfolioModelConfigAdapter } from './ghostfolio-model-config.adapter';

describe('GhostfolioModelConfigAdapter', () => {
  it('builds model catalog from defaults and env extension', () => {
    const configurationService = {
      get: jest.fn((key: string) => {
        if (key === 'AI_MODEL_CATALOG') {
          return 'custom/model-a, custom/model-b';
        }

        if (key === 'OPENROUTER_API_KEY') {
          return 'test-key';
        }

        if (key === 'OPENROUTER_MODEL') {
          return '';
        }

        return '';
      })
    } as unknown as ConfigurationService;
    const adapter = new GhostfolioModelConfigAdapter(configurationService);

    const catalog = adapter.getModelCatalog();

    expect(catalog).toContain('custom/model-a');
    expect(catalog).toContain('custom/model-b');
  });

  it('prefers request model over env default', async () => {
    const configurationService = {
      get: jest.fn((key: string) => {
        if (key === 'AI_MODEL_CATALOG') {
          return '';
        }

        if (key === 'OPENROUTER_API_KEY') {
          return 'test-key';
        }

        if (key === 'OPENROUTER_MODEL') {
          return 'minimax/minimax-m2.5';
        }

        return '';
      })
    } as unknown as ConfigurationService;
    const adapter = new GhostfolioModelConfigAdapter(configurationService);

    const result = await adapter.getModelConfig({
      requestedModel: 'anthropic/claude-sonnet-4.5'
    });

    expect(result.model).toBe('anthropic/claude-sonnet-4.5');
    expect(result.apiKey).toBe('test-key');
  });

  it('throws when OPENROUTER_API_KEY is missing', async () => {
    const configurationService = {
      get: jest.fn((key: string) => {
        if (key === 'AI_MODEL_CATALOG') {
          return '';
        }

        if (key === 'OPENROUTER_API_KEY') {
          return '';
        }

        if (key === 'OPENROUTER_MODEL') {
          return '';
        }

        return '';
      })
    } as unknown as ConfigurationService;
    const adapter = new GhostfolioModelConfigAdapter(configurationService);

    await expect(adapter.getModelConfig()).rejects.toBeInstanceOf(
      HttpException
    );
  });
});
