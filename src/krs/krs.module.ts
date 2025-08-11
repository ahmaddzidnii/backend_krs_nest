import { Module } from '@nestjs/common';

import { KrsService } from './krs.service';
import { KrsController } from './krs.controller';

@Module({
  controllers: [KrsController],
  providers: [KrsService],
})
export class KrsModule {}
