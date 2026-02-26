export interface AgentToolExecutionContext {
  languageCode: string;
  userCurrency: string;
  userId: string;
}

export interface AgentToolContract {
  description: string;
  name: string;
  run(context: AgentToolExecutionContext): Promise<Record<string, unknown>>;
}
