import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  AgentSessionMessage,
  AgentSessionStore
} from './interfaces/agent-session-store.interface';

@Injectable()
export class PrismaSessionStoreService implements AgentSessionStore {
  private readonly MAX_MESSAGES = 20;

  public constructor(private readonly prismaService: PrismaService) {}

  public async appendMessage(
    message: AgentSessionMessage & { sessionId: string; userId: string }
  ): Promise<void> {
    const existingSession = await this.prismaService.chatSession.findFirst({
      where: {
        id: message.sessionId,
        userId: message.userId
      }
    });
    const existingMessages = this.normalizeMessages(existingSession?.messages);
    const nextMessages = [
      ...existingMessages,
      {
        content: message.content,
        createdAt: message.createdAt,
        role: message.role
      }
    ].slice(-this.MAX_MESSAGES);

    if (existingSession) {
      await this.prismaService.chatSession.update({
        data: {
          messages: nextMessages as unknown as Prisma.JsonArray
        },
        where: {
          id: message.sessionId
        }
      });
      return;
    }

    await this.prismaService.chatSession.create({
      data: {
        id: message.sessionId,
        messages: nextMessages as unknown as Prisma.JsonArray,
        userId: message.userId
      }
    });
  }

  public async getMessages({
    sessionId,
    userId
  }: {
    sessionId: string;
    userId: string;
  }): Promise<AgentSessionMessage[]> {
    const session = await this.prismaService.chatSession.findFirst({
      where: {
        id: sessionId,
        userId
      }
    });

    return this.normalizeMessages(session?.messages);
  }

  public async getMostRecentSession({
    userId
  }: {
    userId: string;
  }): Promise<
    { messages: AgentSessionMessage[]; sessionId: string } | undefined
  > {
    const session = await this.prismaService.chatSession.findFirst({
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        messages: true
      },
      where: {
        userId
      }
    });

    if (!session) {
      return undefined;
    }

    return {
      messages: this.normalizeMessages(session.messages),
      sessionId: session.id
    };
  }

  private normalizeMessages(rawMessages: unknown): AgentSessionMessage[] {
    if (!Array.isArray(rawMessages)) {
      return [];
    }

    return rawMessages.flatMap((item) => {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof (item as { content?: unknown }).content !== 'string' ||
        typeof (item as { createdAt?: unknown }).createdAt !== 'string' ||
        ((item as { role?: unknown }).role !== 'assistant' &&
          (item as { role?: unknown }).role !== 'user')
      ) {
        return [];
      }

      return [
        {
          content: (item as { content: string }).content,
          createdAt: (item as { createdAt: string }).createdAt,
          role: (item as { role: 'assistant' | 'user' }).role
        }
      ];
    });
  }
}
