import { Logger } from 'winston';
import { Redis } from 'ioredis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';

import { SessionObject } from './auth.decorator';
import { extractBearerToken } from '../common/utils/extract-bearer-token';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly redis: Redis | null;
  @Inject(WINSTON_MODULE_PROVIDER) logger: Logger;
  constructor(private redisService: RedisService) {
    this.redis = this.redisService.getOrThrow();
  }
  async use(req: any, res: any, next: () => void) {
    const sessionId = req.cookies?.session_id || extractBearerToken(req);
    this.logger.debug(`Session ID from cookie: ${sessionId}`);
    if (sessionId) {
      const key = `session-${sessionId}`;
      const sessionData = await this.redis.get(key);
      this.logger.debug(`Session data from Redis: ${sessionData}`);

      if (sessionData) {
        req.session = {
          session: {
            session_id: sessionId,
          },
          user: JSON.parse(sessionData),
        } as SessionObject;

        this.logger.debug(
          'Session information attached to request:',
          req.session,
        );
      }
    }
    next();
  }
}
