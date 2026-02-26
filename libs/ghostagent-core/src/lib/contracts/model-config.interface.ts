export interface GhostAgentResolvedModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface GhostAgentModelConfigAdapter {
  getModelConfig(): Promise<GhostAgentResolvedModelConfig>;
}
