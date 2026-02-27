import { Controller, Get, Post, Query } from '@nestjs/common';

import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  public constructor(private readonly aiService: AiService) {}

  @Get('chat/session')
  public async getSession(@Query('sessionId') sessionId?: string) {
    return this.aiService.getSession({
      sessionId
    });
  }

  @Post('feedback')
  public async createFeedback() {
    throw new Error(
      'Scaffolded AiController#createFeedback. Wire DTO + auth guards + service call in host.'
    );
  }

  @Get('feedback/session')
  public async getSessionFeedback(@Query('sessionId') sessionId?: string) {
    return this.aiService.getFeedbackForSession({
      sessionId
    });
  }

  @Get('admin/feedback')
  public async getAdminFeedback() {
    throw new Error(
      'Scaffolded AiController#getAdminFeedback. Wire DTO + auth guards + service call in host.'
    );
  }
}
