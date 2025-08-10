import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { MahasiswaModule } from 'src/mahasiswa/mahasiswa.module';

@Module({
  imports: [MahasiswaModule],
  providers: [ScheduleService],
  controllers: [ScheduleController],
})
export class ScheduleModule {}
