export const DEFAULT_GHOSTAGENT_MODELS = [
  'anthropic/claude-sonnet-4.5',
  'minimax/minimax-m2.5',
  'openai/gpt-5.1',
  'google/gemini-2.5-flash-lite-preview-09-2025',
  'qwen/qwen3.5-flash-02-23'
] as const;

export function buildGhostAgentModelCatalog({
  additionalModels
}: {
  additionalModels?: string[];
}) {
  return Array.from(
    new Set([
      ...(DEFAULT_GHOSTAGENT_MODELS as readonly string[]),
      ...(additionalModels ?? [])
    ])
  );
}

export function resolveGhostAgentModel({
  catalog,
  requestedModel
}: {
  catalog: string[];
  requestedModel?: string;
}) {
  if (requestedModel && requestedModel.trim().length > 0) {
    return requestedModel.trim();
  }

  return catalog[0] ?? DEFAULT_GHOSTAGENT_MODELS[0];
}
