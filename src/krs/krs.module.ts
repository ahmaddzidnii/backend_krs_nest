import { Module } from '@nestjs/common';

import { KrsService } from './krs.service';
import { KrsController } from './krs.controller';
import { MahasiswaModule } from 'mahasiswa/mahasiswa.module';

@Module({
  imports: [MahasiswaModule],
  controllers: [KrsController],
  providers: [KrsService],
})
export class KrsModule {}
