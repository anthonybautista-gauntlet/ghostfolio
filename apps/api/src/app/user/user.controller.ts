import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { HEADER_KEY_IMPERSONATION } from '@ghostfolio/common/config';
import {
  DeleteOwnUserDto,
  UpdateOwnAccessTokenDto,
  UpdateUserSettingDto
} from '@ghostfolio/common/dtos';
import {
  AccessTokenResponse,
  User,
  UserItem,
  UserSettings
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
  Logger
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { User as UserModel } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { merge, size } from 'lodash';

import { UserService } from './user.service';

@Controller('user')
export class UserController {
  private static readonly logger = new Logger(UserController.name);

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly impersonationService: ImpersonationService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService,
    private readonly redisCacheService: RedisCacheService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly userService: UserService
  ) {}

  @Delete()
  @HasPermission(permissions.deleteOwnUser)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteOwnUser(
    @Body() data: DeleteOwnUserDto
  ): Promise<UserModel> {
    const user = await this.validateAccessToken(
      data.accessToken,
      this.request.user.id
    );

    return this.userService.deleteUser({
      id: user.id
    });
  }

  @Delete(':id')
  @HasPermission(permissions.deleteUser)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteUser(@Param('id') id: string): Promise<UserModel> {
    if (id === this.request.user.id) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.userService.deleteUser({
      id
    });
  }

  @HasPermission(permissions.accessAdminControl)
  @Post(':id/access-token')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateUserAccessToken(
    @Param('id') id: string
  ): Promise<AccessTokenResponse> {
    return this.rotateUserAccessToken(id);
  }

  @HasPermission(permissions.updateOwnAccessToken)
  @Post('access-token')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateOwnAccessToken(
    @Body() data: UpdateOwnAccessTokenDto
  ): Promise<AccessTokenResponse> {
    const user = await this.validateAccessToken(
      data.accessToken,
      this.request.user.id
    );

    return this.rotateUserAccessToken(user.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  public async getUser(
    @Headers('accept-language') acceptLanguage: string,
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string
  ): Promise<User> {
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(impersonationId);

    return this.userService.getUser({
      impersonationUserId,
      locale: acceptLanguage?.split(',')?.[0],
      user: this.request.user
    });
  }

  @Post()
  public async signupUser(): Promise<UserItem> {
    const signupRateLimit = await this.consumeSignupRateLimit();

    if (!signupRateLimit.allowed) {
      UserController.logger.warn(
        `Signup throttled (ip=${signupRateLimit.ip}, source=${signupRateLimit.ipSource}, count=${signupRateLimit.count}, limit=${signupRateLimit.limit}, retryAfterSeconds=${signupRateLimit.retryAfterSeconds})`
      );
      throw new HttpException(
        `Too many signup attempts. Please try again in ${signupRateLimit.retryAfterSeconds} seconds.`,
        StatusCodes.TOO_MANY_REQUESTS
      );
    }

    const isUserSignupEnabled =
      await this.propertyService.isUserSignupEnabled();

    if (!isUserSignupEnabled) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const { accessToken, id, role } = await this.userService.createUser();

    return {
      accessToken,
      role,
      authToken: this.jwtService.sign({
        id
      })
    };
  }

  @Put('setting')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateUserSetting(@Body() data: UpdateUserSettingDto) {
    if (
      size(data) === 1 &&
      (data.benchmark || data.dateRange) &&
      this.request.user.role === 'DEMO'
    ) {
      // Allow benchmark or date range change for demo user
    } else if (
      !hasPermission(
        this.request.user.permissions,
        permissions.updateUserSettings
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const emitPortfolioChangedEvent = 'baseCurrency' in data;

    const userSettings: UserSettings = merge(
      {},
      this.request.user.settings.settings as UserSettings,
      data
    );

    for (const key in userSettings) {
      if (userSettings[key] === false || userSettings[key] === null) {
        delete userSettings[key];
      }
    }

    return this.userService.updateUserSetting({
      emitPortfolioChangedEvent,
      userSettings,
      userId: this.request.user.id
    });
  }

  private async rotateUserAccessToken(
    userId: string
  ): Promise<AccessTokenResponse> {
    const { accessToken, hashedAccessToken } =
      this.userService.generateAccessToken({
        userId
      });

    await this.prismaService.user.update({
      data: { accessToken: hashedAccessToken },
      where: { id: userId }
    });

    return { accessToken };
  }

  private async validateAccessToken(
    accessToken: string,
    userId: string
  ): Promise<UserModel> {
    const hashedAccessToken = this.userService.createAccessToken({
      password: accessToken,
      salt: this.configurationService.get('ACCESS_TOKEN_SALT')
    });

    const [user] = await this.userService.users({
      where: { accessToken: hashedAccessToken, id: userId }
    });

    if (!user) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return user;
  }

  private async consumeSignupRateLimit() {
    const limit = this.configurationService.get('AI_SIGNUP_RATE_LIMIT_MAX');
    const windowMs = this.configurationService.get(
      'AI_SIGNUP_RATE_LIMIT_WINDOW_MS'
    );
    const { ip, source } = this.getClientIp();
    const redisKey = `signup:throttle:${ip}`;
    const nextCount = await this.redisCacheService.incrementCounter({
      key: redisKey,
      ttl: windowMs
    });

    if (nextCount > limit) {
      return {
        allowed: false,
        count: nextCount,
        ip,
        ipSource: source,
        limit,
        retryAfterSeconds: Math.ceil(windowMs / 1000)
      };
    }

    return {
      allowed: true,
      count: nextCount,
      ip,
      ipSource: source,
      limit,
      retryAfterSeconds: Math.ceil(windowMs / 1000)
    };
  }

  private getClientIp() {
    const forwardedFor = this.request?.headers?.['x-forwarded-for'];
    const realIp = this.request?.headers?.['x-real-ip'];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;
    const parsedForwardedIp = String(forwardedIp ?? '')
      .split(',')
      .map((ip) => ip.trim())
      .find(Boolean);

    if (parsedForwardedIp) {
      return { ip: parsedForwardedIp, source: 'x-forwarded-for' as const };
    }

    if (typeof realIp === 'string' && realIp.trim().length > 0) {
      return { ip: realIp.trim(), source: 'x-real-ip' as const };
    }

    const requestIp = this.request?.ip || this.request?.socket?.remoteAddress;

    if (requestIp) {
      return { ip: requestIp, source: 'request-ip' as const };
    }

    return { ip: 'unknown', source: 'fallback' as const };
  }
}
