import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PeriodService } from './period.service';
import { DistributedLockService } from './distributed-lock.service';

@Global()
@Module({
  providers: [PrismaService, PeriodService, DistributedLockService],
  exports: [PrismaService, PeriodService, DistributedLockService],
})
export class CommonModule {}
