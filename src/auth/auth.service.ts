import Redis from 'ioredis';
import { Logger } from 'winston';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { HttpException, Inject, Injectable } from '@nestjs/common';

import { LoginDto } from './dto/login.dto';
import { SessionObject } from './auth.decorator';
import { LoginResponse } from './response-model';
import { PrismaService } from '../common/prisma.service';
import { generateSessionId } from '../common/utils/generate-random-string';

@Injectable()
export class AuthService {
  private readonly redis: Redis | null;
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.redis = this.redisService.getOrThrow();
  }
  async login(request: LoginDto): Promise<LoginResponse> {
    this.logger.info(`Attempting to login, ${JSON.stringify(request)}`);

    const user = await this.prismaService.user.findUnique({
      where: {
        username: request.username,
      },
      select: {
        id_user: true,
        id_role: true,
        username: true,
        password: true,
        mahasiswa: {
          select: {
            nama: true,
          },
        },
      },
    });

    if (!user) {
      throw new HttpException('Invalid username or password', 401);
    }

    this.logger.info(`user found in database, ${JSON.stringify(user.id_user)}`);

    const match = await bcrypt.compare(request.password, user.password);

    if (!match) {
      throw new HttpException('Invalid username or password', 401);
    }

    const role = await this.prismaService.role.findUnique({
      where: {
        id_role: user.id_role,
      },
    });

    const sessionId = `session-${generateSessionId()}`;
    const sessionExpInMiutes = this.configService.get(
      'SESSION_EXP_IN_MINUTES',
      60,
    );
    await this.redis.set(
      sessionId,
      JSON.stringify({
        id: user.id_user,
        username: user.username,
        name: user.mahasiswa.nama,
        role: role.nama_role,
      }),
      'EX',
      sessionExpInMiutes * 60,
    );
    this.logger.info(`User logged in successfully, user: ${user.username}`);

    return {
      username: user.username,
      name: user.mahasiswa?.nama || 'Unknown',
      session_id: sessionId,
      role: role.nama_role,
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.redis?.del(sessionId);
    this.logger.info(`User logged out successfully, sessionId: ${sessionId}`);
  }

  async getMe(session: SessionObject): Promise<SessionObject> {
    return session;
  }
}
