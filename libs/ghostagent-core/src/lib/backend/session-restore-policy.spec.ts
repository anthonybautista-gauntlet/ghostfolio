import { resolveSessionRestoreResult } from './session-restore-policy';

describe('session restore policy', () => {
  it('returns requested session when it contains messages', () => {
    const result = resolveSessionRestoreResult({
      requestedSessionId: 'session-a',
      requestedSessionMessages: [
        { content: 'hi', createdAt: '2026-02-27T00:00:00.000Z', role: 'user' }
      ]
    });

    expect(result).toEqual({
      messages: [
        { content: 'hi', createdAt: '2026-02-27T00:00:00.000Z', role: 'user' }
      ],
      sessionId: 'session-a'
    });
  });

  it('falls back to most recent when requested session is empty', () => {
    const result = resolveSessionRestoreResult({
      mostRecent: {
        messages: [
          {
            content: 'latest',
            createdAt: '2026-02-27T01:00:00.000Z',
            role: 'assistant'
          }
        ],
        sessionId: 'session-b'
      },
      requestedSessionId: 'session-a',
      requestedSessionMessages: []
    });

    expect(result).toEqual({
      messages: [
        {
          content: 'latest',
          createdAt: '2026-02-27T01:00:00.000Z',
          role: 'assistant'
        }
      ],
      sessionId: 'session-b'
    });
  });
});
