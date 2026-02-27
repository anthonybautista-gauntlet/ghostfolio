import { buildFeedbackDuplicateSelector } from './feedback-lifecycle';

describe('feedback lifecycle', () => {
  it('builds duplicate selector from feedback signature', () => {
    expect(
      buildFeedbackDuplicateSelector({
        assistantReply: 'answer',
        query: 'what is btc price',
        sessionId: 'session-id',
        userId: 'user-id'
      })
    ).toEqual({
      assistantReply: 'answer',
      query: 'what is btc price',
      sessionId: 'session-id',
      userId: 'user-id'
    });
  });
});
