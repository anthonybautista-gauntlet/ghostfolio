export class AiService {
  public async getSession({ sessionId }: { sessionId?: string }) {
    if (sessionId) {
      return {
        messages: [],
        sessionId
      };
    }

    return {
      messages: [],
      sessionId: undefined
    };
  }

  public async getFeedbackForSession({ sessionId }: { sessionId?: string }) {
    if (!sessionId) {
      return { feedback: [] };
    }

    return { feedback: [] };
  }
}
