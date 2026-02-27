export interface FeedbackSignature {
  assistantReply: string;
  query: string;
  sessionId: string;
  userId: string;
}

export function buildFeedbackDuplicateSelector({
  assistantReply,
  query,
  sessionId,
  userId
}: FeedbackSignature) {
  return {
    assistantReply,
    query,
    sessionId,
    userId
  };
}
