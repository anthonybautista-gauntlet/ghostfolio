export interface AgentSessionMessage {
  content: string;
  createdAt: string;
  role: 'assistant' | 'user';
}

export interface AgentSessionStore {
  appendMessage(
    message: AgentSessionMessage & { sessionId: string; userId: string }
  ): Promise<void>;
  getMessages({
    sessionId,
    userId
  }: {
    sessionId: string;
    userId: string;
  }): Promise<AgentSessionMessage[]>;
}
