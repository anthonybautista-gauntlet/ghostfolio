import {
  buildGhostAgentModelCatalog,
  DEFAULT_GHOSTAGENT_MODELS,
  resolveGhostAgentModel
} from './model-catalog';

describe('ghostagent model catalog', () => {
  it('builds a de-duplicated catalog with defaults first', () => {
    const catalog = buildGhostAgentModelCatalog({
      additionalModels: ['minimax/minimax-m2.5', 'custom/model-x']
    });

    expect(catalog).toEqual([...DEFAULT_GHOSTAGENT_MODELS, 'custom/model-x']);
  });

  it('prefers requested model when provided', () => {
    const catalog = buildGhostAgentModelCatalog({});

    expect(
      resolveGhostAgentModel({
        catalog,
        requestedModel: 'custom/model-y'
      })
    ).toBe('custom/model-y');
  });

  it('falls back to first catalog model when request is empty', () => {
    const catalog = buildGhostAgentModelCatalog({});

    expect(
      resolveGhostAgentModel({
        catalog,
        requestedModel: '   '
      })
    ).toBe(DEFAULT_GHOSTAGENT_MODELS[0]);
  });
});
