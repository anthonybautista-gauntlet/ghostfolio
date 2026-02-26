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
  public async getSession(): Promise<AiChatSessionResponse> {
    const mostRecentSession = await this.sessionStore.getMostRecentSession({
      userId: this.request.user.id
    });

    return {
      messages: mostRecentSession?.messages ?? [],
      sessionId: mostRecentSession?.sessionId
    };
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
}
