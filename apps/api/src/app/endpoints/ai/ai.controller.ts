import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import {
  AiModelPreferenceResponse,
  AiChatSessionResponse,
  AiPromptResponse
} from '@ghostfolio/common/interfaces';
import { hasRole, permissions } from '@ghostfolio/common/permissions';
import type { AiPromptMode, RequestWithUser } from '@ghostfolio/common/types';
import { resolveSessionRestoreResult } from '@ghostfolio/ghostagent/backend/session-restore-policy';

import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

import { AiService } from './ai.service';
import { AiChatRequestDto } from './dtos/ai-chat-request.dto';
import { CreateAiFeedbackDto } from './dtos/create-ai-feedback.dto';
import { GetAiFeedbackQueryDto } from './dtos/get-ai-feedback-query.dto';
import { UpdateAiModelPreferenceDto } from './dtos/update-ai-model-preference.dto';
import { PrismaSessionStoreService } from './prisma-session-store.service';

@Controller('ai')
export class AiController {
  public constructor(
    private readonly aiService: AiService,
    private readonly apiService: ApiService,
    private readonly sessionStore: PrismaSessionStoreService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get('prompt/:mode')
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPrompt(
    @Param('mode') mode: AiPromptMode,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('dataSource') filterByDataSource?: string,
    @Query('symbol') filterBySymbol?: string,
    @Query('tags') filterByTags?: string
  ): Promise<AiPromptResponse> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByDataSource,
      filterBySymbol,
      filterByTags
    });

    const prompt = await this.aiService.getPrompt({
      filters,
      mode,
      impersonationId: undefined,
      languageCode: this.request.user.settings.settings.language,
      userCurrency: this.request.user.settings.settings.baseCurrency,
      userId: this.request.user.id
    });

    return { prompt };
  }

  @Post('chat')
  @HasPermission(permissions.accessAssistant)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async chat(
    @Body() { filters, message, selectedModel, sessionId }: AiChatRequestDto
  ) {
    return this.aiService.chat({
      bypassDailyLimit: hasRole(this.request.user, Role.ADMIN),
      filters,
      languageCode: this.request.user.settings.settings.language,
      message,
      selectedModel,
      sessionId,
      userCurrency: this.request.user.settings.settings.baseCurrency,
      userId: this.request.user.id
    });
  }

  @Get('chat/session')
  @HasPermission(permissions.accessAssistant)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getSession(
    @Query('sessionId') sessionId?: string
  ): Promise<AiChatSessionResponse> {
    let requestedSessionMessages:
      | { content: string; createdAt: string; role: 'assistant' | 'user' }[]
      | undefined;

    if (sessionId) {
      requestedSessionMessages = await this.sessionStore.getMessages({
        sessionId,
        userId: this.request.user.id
      });
    }

    const mostRecentSession = await this.sessionStore.getMostRecentSession({
      userId: this.request.user.id
    });

    return resolveSessionRestoreResult({
      mostRecent: mostRecentSession,
      requestedSessionId: sessionId,
      requestedSessionMessages
    });
  }

  @Get('model')
  @HasPermission(permissions.accessAssistant)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getModelPreference(): Promise<AiModelPreferenceResponse> {
    return this.aiService.getModelPreference({
      userId: this.request.user.id
    });
  }

  @Put('model')
  @HasPermission(permissions.accessAssistant)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateModelPreference(
    @Body() { selectedModel }: UpdateAiModelPreferenceDto
  ): Promise<AiModelPreferenceResponse> {
    return this.aiService.updateModelPreference({
      selectedModel,
      userId: this.request.user.id
    });
  }

  @Post('feedback')
  @HasPermission(permissions.accessAssistant)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createFeedback(
    @Body()
    {
      assistantReply,
      comment,
      model,
      query,
      rating,
      sessionId,
      toolInvocations,
      verification
    }: CreateAiFeedbackDto
  ) {
    return this.aiService.createFeedback({
      assistantReply,
      comment,
      model,
      query,
      rating,
      sessionId,
      toolInvocations,
      userId: this.request.user.id,
      verification
    });
  }

  @Get('feedback/session')
  @HasPermission(permissions.accessAssistant)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getSessionFeedback(@Query('sessionId') sessionId?: string) {
    if (!sessionId) {
      return {
        feedback: []
      };
    }

    return this.aiService.getFeedbackForSession({
      sessionId,
      userId: this.request.user.id
    });
  }

  @Get('admin/feedback')
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getAdminFeedback(
    @Query() { rating, skip, take }: GetAiFeedbackQueryDto
  ) {
    return this.aiService.getFeedbackForAdmin({
      rating,
      skip,
      take
    });
  }
}
