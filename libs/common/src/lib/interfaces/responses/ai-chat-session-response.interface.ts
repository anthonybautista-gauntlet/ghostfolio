export interface AiSessionMessage {
  content: string;
  createdAt: string;
  role: 'assistant' | 'user';
}

export interface AiChatSessionResponse {
  messages: AiSessionMessage[];
  sessionId?: string;
}
