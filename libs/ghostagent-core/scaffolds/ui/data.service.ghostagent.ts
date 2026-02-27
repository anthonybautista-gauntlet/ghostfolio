export function ghostAgentDataServiceScaffold() {
  return `
public getAiChatSession({ sessionId }: { sessionId?: string } = {}) {
  let params = new HttpParams();
  if (sessionId) {
    params = params.append('sessionId', sessionId);
  }
  return this.http.get('/api/v1/ai/chat/session', { params });
}

public getAiSessionFeedback({ sessionId }: { sessionId: string }) {
  const params = new HttpParams().append('sessionId', sessionId);
  return this.http.get('/api/v1/ai/feedback/session', { params });
}
`;
}
