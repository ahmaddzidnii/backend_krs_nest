import { Module } from '@nestjs/common';
import { MahasiswaService } from './mahasiswa.service';
import { MahasiswaController } from './mahasiswa.controller';

@Module({
  providers: [MahasiswaService],
  controllers: [MahasiswaController],
  exports: [MahasiswaService],
})
export class MahasiswaModule {}
