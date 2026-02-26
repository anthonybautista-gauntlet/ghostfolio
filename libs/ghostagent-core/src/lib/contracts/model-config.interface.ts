export interface GhostAgentResolvedModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface GhostAgentModelConfigOptions {
  requestedModel?: string;
}

export interface GhostAgentModelConfigAdapter {
  getModelCatalog(): string[];
  getModelConfig(
    options?: GhostAgentModelConfigOptions
  ): Promise<GhostAgentResolvedModelConfig>;
}
