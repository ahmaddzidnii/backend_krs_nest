import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  ValidationPipe,
} from '@nestjs/common';

import { WebResponse } from '../model/web.model';
import { ScheduleService } from './schedule.service';
import { ClassStatusDto } from './dto/class-status.dto';
import { Auth, SessionObject } from '../auth/auth.decorator';
import { MahasiswaService } from '../mahasiswa/mahasiswa.service';
import { ClassOfferingList, ClassStatusBatch } from './schedule.response';

@Controller({
  path: 'schedules',
  version: '1',
})
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly mahasiswaService: MahasiswaService,
  ) {}

  @Get('get-class-schedule-offered')
  async getClassScheduleOffered(
    @Auth() session: SessionObject,
  ): Promise<WebResponse<ClassOfferingList>> {
    const mahasiswa = await this.mahasiswaService.getStudentAndCuriculumByNim(
      session.user.username,
    );

    const data = await this.scheduleService.getClassScheduleOffered(
      mahasiswa.id_kurikulum,
      mahasiswa.semester_berjalan,
    );

    return {
      data,
    };
  }

  @Post('get-class-status-batch')
  @HttpCode(200)
  async getClassStatusBatch(
    @Auth() session: SessionObject,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    classStatusDto: ClassStatusDto,
  ): Promise<WebResponse<ClassStatusBatch>> {
    const data = await this.scheduleService.getClassStatusBatch(
      classStatusDto.classIds,
      session.user.username,
    );
    return {
      data,
    };
  }
}
