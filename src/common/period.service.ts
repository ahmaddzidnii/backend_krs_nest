import { Redis } from 'ioredis';
import { Injectable } from '@nestjs/common';
import { RedisService } from '@liaoliaots/nestjs-redis';

import { PrismaService } from './prisma.service';

@Injectable()
export class PeriodService {
  private readonly redis: Redis;
  private readonly CACHE_KEY = 'current_period';
  private readonly CACHE_TTL = 3600;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {
    this.redis = this.redisService.getOrThrow();
  }

  async getCurrentPeriod() {
    // Cek cache di Redis
    const cached = await this.redis.get(this.CACHE_KEY);

    if (cached) {
      return JSON.parse(cached);
    }

    // Query ke database jika cache kosong
    const period = await this.prismaService.periodeAkademik.findFirst({
      where: { is_active: true },
    });

    // Simpan hasil ke Redis
    if (period) {
      await this.redis.set(
        this.CACHE_KEY,
        JSON.stringify(period),
        'EX',
        this.CACHE_TTL,
      );
    }

    return period;
  }
}
