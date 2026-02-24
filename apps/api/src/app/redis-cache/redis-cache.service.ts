import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier, Filter } from '@ghostfolio/common/interfaces';

import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import Keyv from 'keyv';
import ms from 'ms';
import { createHash } from 'node:crypto';

@Injectable()
export class RedisCacheService {
  private client: Keyv;

  public constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configurationService: ConfigurationService
  ) {
    this.client = cache.stores[0];

    this.client.deserialize = (value) => {
      try {
        return JSON.parse(value);
      } catch {}

      return value;
    };

    this.client.on('error', (error) => {
      Logger.error(error, 'RedisCacheService');
    });
  }

  public async get(key: string): Promise<string> {
    return this.cache.get(key);
  }

  public async getKeys(aPrefix?: string): Promise<string[]> {
    const keys: string[] = [];
    const prefix = aPrefix;

    try {
      for await (const [key] of this.client.iterator({})) {
        if ((prefix && key.startsWith(prefix)) || !prefix) {
          keys.push(key);
        }
      }
    } catch {}

    return keys;
  }

  public getPortfolioSnapshotKey({
    filters,
    userId
  }: {
    filters?: Filter[];
    userId: string;
  }) {
    let portfolioSnapshotKey = `portfolio-snapshot-${userId}`;

    if (filters?.length > 0) {
      const filtersHash = createHash('sha256')
        .update(JSON.stringify(filters))
        .digest('hex');

      portfolioSnapshotKey = `${portfolioSnapshotKey}-${filtersHash}`;
    }

    return portfolioSnapshotKey;
  }

  public getQuoteKey({ dataSource, symbol }: AssetProfileIdentifier) {
    return `quote-${getAssetProfileIdentifier({ dataSource, symbol })}`;
  }

  public async isHealthy() {
    const testKey = '__health_check__';
    const testValue = Date.now().toString();

    try {
      await Promise.race([
        (async () => {
          await this.set(testKey, testValue, ms('1 second'));
          const result = await this.get(testKey);

          if (result !== testValue) {
            throw new Error('Redis health check failed: value mismatch');
          }
        })(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Redis health check failed: timeout')),
            ms('2 seconds')
          )
        )
      ]);

      return true;
    } catch (error) {
      Logger.error(error?.message, 'RedisCacheService');

      return false;
    } finally {
      try {
        await this.remove(testKey);
      } catch {}
    }
  }

  public async remove(key: string) {
    return this.cache.del(key);
  }

  public async removePortfolioSnapshotsByUserId({
    userId
  }: {
    userId: string;
  }) {
    const keys = await this.getKeys(
      `${this.getPortfolioSnapshotKey({ userId })}`
    );

    return this.cache.mdel(keys);
  }

  public async reset() {
    return this.cache.clear();
  }

  public async set(key: string, value: string, ttl?: number) {
    return this.cache.set(
      key,
      value,
      ttl ?? this.configurationService.get('CACHE_TTL')
    );
  }

  public async incrementCounter({
    key,
    ttl
  }: {
    key: string;
    ttl: number;
  }): Promise<number> {
    const keyvStore = this.client.store as unknown as {
      client?: {
        expire?: (aKey: string, seconds: number) => Promise<number>;
        incr?: (aKey: string) => Promise<number>;
      };
      expire?: (aKey: string, seconds: number) => Promise<number>;
      incr?: (aKey: string) => Promise<number>;
    };
    const ttlSeconds = Math.max(1, Math.ceil(ttl / 1000));
    const incr =
      keyvStore?.incr?.bind(keyvStore) ??
      keyvStore?.client?.incr?.bind(keyvStore.client);
    const expire =
      keyvStore?.expire?.bind(keyvStore) ??
      keyvStore?.client?.expire?.bind(keyvStore.client);

    if (incr) {
      const count = await incr(key);

      if (count === 1 && expire) {
        await expire(key, ttlSeconds);
      }

      return count;
    }

    const currentRaw = await this.get(key);
    const current = Number.parseInt(String(currentRaw ?? '0'), 10) || 0;
    const next = current + 1;
    await this.set(key, String(next), ttl);

    return next;
  }
}
