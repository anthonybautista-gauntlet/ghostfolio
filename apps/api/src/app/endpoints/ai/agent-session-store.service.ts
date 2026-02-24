import { Injectable } from '@nestjs/common';

import {
  AgentSessionMessage,
  AgentSessionStore
} from './interfaces/agent-session-store.interface';

@Injectable()
export class AgentSessionStoreService implements AgentSessionStore {
  private readonly cache = new Map<string, AgentSessionMessage[]>();
  private readonly MAX_MESSAGES = 20;

  public async appendMessage(
    message: AgentSessionMessage & { sessionId: string; userId: string }
  ) {
    const key = this.getKey({
      sessionId: message.sessionId,
      userId: message.userId
    });
    const messages = this.cache.get(key) ?? [];
    messages.push({
      content: message.content,
      createdAt: message.createdAt,
      role: message.role
    });
    this.cache.set(key, messages.slice(-this.MAX_MESSAGES));
  }

  public async getMessages({
    sessionId,
    userId
  }: {
    sessionId: string;
    userId: string;
  }): Promise<AgentSessionMessage[]> {
    const key = this.getKey({ sessionId, userId });
    return this.cache.get(key) ?? [];
  }

  private getKey({ sessionId, userId }: { sessionId: string; userId: string }) {
    return `${userId}:${sessionId}`;
  }
}
