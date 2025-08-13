import Redis from 'ioredis';
import { Logger } from 'winston';
import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

export interface LockResult {
  success: boolean;
  lockId?: string;
}

@Injectable()
export class DistributedLockService {
  private readonly redis: Redis;
  @Inject(WINSTON_MODULE_PROVIDER) logger: Logger;

  constructor(private readonly redisService: RedisService) {
    this.redis = redisService.getOrThrow();
  }

  /**
   * Acquire a distributed lock with ownership tracking
   * @param lockKey - The key for the lock
   * @param ttl - Time to live in milliseconds
   * @param retryAttempts - Number of retry attempts (default: 3)
   * @param retryDelay - Delay between retries in ms (default: 100)
   */
  async acquire(
    lockKey: string,
    ttl: number,
    retryAttempts: number = 3,
    retryDelay: number = 100,
  ): Promise<LockResult> {
    const lockId = randomUUID();

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const result = await this.redis.set(lockKey, lockId, 'PX', ttl, 'NX');

        if (result === 'OK') {
          this.logger.debug(`Lock acquired: ${lockKey} with ID: ${lockId}`);
          return { success: true, lockId };
        }

        if (attempt < retryAttempts) {
          await this.sleep(retryDelay);
          // Exponential backoff
          retryDelay *= 1.5;
        }
      } catch (error) {
        this.logger.error(`Error acquiring lock ${lockKey}:`, error);
        if (attempt === retryAttempts) {
          return { success: false };
        }
      }
    }

    this.logger.warn(
      `Failed to acquire lock: ${lockKey} after ${retryAttempts + 1} attempts`,
    );
    return { success: false };
  }

  /**
   * Release a lock with ownership verification using Lua script
   * @param lockKey - The key for the lock
   * @param lockId - The unique lock identifier
   */
  async release(lockKey: string, lockId: string): Promise<boolean> {
    const luaScript = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = (await this.redis.eval(
        luaScript,
        1,
        lockKey,
        lockId,
      )) as number;
      const released = result === 1;

      if (released) {
        this.logger.debug(`Lock released: ${lockKey} with ID: ${lockId}`);
      } else {
        this.logger.warn(
          `Failed to release lock: ${lockKey}. Lock not owned or expired.`,
        );
      }

      return released;
    } catch (error) {
      this.logger.error(`Error releasing lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Extend the TTL of an existing lock
   * @param lockKey - The key for the lock
   * @param lockId - The unique lock identifier
   * @param ttl - New TTL in milliseconds
   */
  async extend(lockKey: string, lockId: string, ttl: number): Promise<boolean> {
    const luaScript = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("PEXPIRE", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    try {
      const result = (await this.redis.eval(
        luaScript,
        1,
        lockKey,
        lockId,
        ttl,
      )) as number;
      const extended = result === 1;

      if (extended) {
        this.logger.debug(`Lock extended: ${lockKey} for ${ttl}ms`);
      }

      return extended;
    } catch (error) {
      this.logger.error(`Error extending lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Check if a lock exists and get its remaining TTL
   * @param lockKey - The key for the lock
   */
  async getLockInfo(lockKey: string): Promise<{
    exists: boolean;
    ttl?: number;
    owner?: string;
  }> {
    try {
      const [owner, ttl] = await Promise.all([
        this.redis.get(lockKey),
        this.redis.pttl(lockKey),
      ]);

      return {
        exists: owner !== null,
        ttl: ttl > 0 ? ttl : undefined,
        owner: owner || undefined,
      };
    } catch (error) {
      this.logger.error(`Error getting lock info for ${lockKey}:`, error);
      return { exists: false };
    }
  }

  /**
   * Execute a function with automatic lock management
   * @param lockKey - The key for the lock
   * @param ttl - Time to live in milliseconds
   * @param fn - Function to execute while holding the lock
   * @param autoExtend - Whether to auto-extend the lock (default: false)
   */
  async withLock<T>(
    lockKey: string,
    ttl: number,
    fn: () => Promise<T>,
    autoExtend: boolean = false,
  ): Promise<T> {
    const lockResult = await this.acquire(lockKey, ttl);

    if (!lockResult.success || !lockResult.lockId) {
      throw new Error(`Failed to acquire lock: ${lockKey}`);
    }

    let extendInterval: NodeJS.Timeout | undefined;

    try {
      // Auto-extend lock if requested
      if (autoExtend) {
        const extendEvery = Math.floor(ttl * 0.7); // Extend at 70% of TTL
        extendInterval = setInterval(async () => {
          const extended = await this.extend(lockKey, lockResult.lockId!, ttl);
          if (!extended) {
            this.logger.warn(
              `Failed to extend lock: ${lockKey}. Lock may have been lost.`,
            );
          }
        }, extendEvery);
      }

      return await fn();
    } finally {
      if (extendInterval) {
        clearInterval(extendInterval);
      }
      await this.release(lockKey, lockResult.lockId);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
