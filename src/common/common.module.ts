import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PeriodService } from './period.service';

@Global()
@Module({
  providers: [PrismaService, PeriodService],
  exports: [PrismaService, PeriodService],
})
export class CommonModule {}
