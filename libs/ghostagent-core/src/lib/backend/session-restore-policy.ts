export interface SessionMessage {
  content: string;
  createdAt?: string;
  role: 'assistant' | 'user';
}

export function resolveSessionRestoreResult({
  requestedSessionId,
  requestedSessionMessages,
  mostRecent
}: {
  mostRecent?: { messages: SessionMessage[]; sessionId: string };
  requestedSessionId?: string;
  requestedSessionMessages?: SessionMessage[];
}) {
  if (
    requestedSessionId &&
    requestedSessionMessages &&
    requestedSessionMessages.length > 0
  ) {
    return {
      messages: requestedSessionMessages,
      sessionId: requestedSessionId
    };
  }

  return {
    messages: mostRecent?.messages ?? [],
    sessionId: mostRecent?.sessionId
  };
}
