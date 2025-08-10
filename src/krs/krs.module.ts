import { Module } from '@nestjs/common';
import { KrsController } from './krs.controller';
import { KrsService } from './krs.service';

@Module({
  controllers: [KrsController],
  providers: [KrsService],
})
export class KrsModule {}
