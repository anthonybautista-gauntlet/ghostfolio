export interface AiCitedFigure {
  factId?: string;
  path?: string;
  tool?: string;
  value: number;
}

export interface AiToolInvocation {
  durationMs: number;
  error?: string;
  ok: boolean;
  tool: string;
}

export interface AiVerificationResult {
  failedCitations: string[];
  passed: boolean;
}

export interface AiTimings {
  llmMs: number;
  toolsMs: number;
  totalMs: number;
}

export interface AiChatResponse {
  confidence: 'high' | 'low' | 'medium';
  disclaimer: string;
  message: string;
  sessionId: string;
  citedFigures: AiCitedFigure[];
  timings: AiTimings;
  toolInvocations: AiToolInvocation[];
  verification: AiVerificationResult;
}
