import { Controller, Get } from '@nestjs/common';

import { WebResponse } from 'src/model/web.model';
import { ScheduleService } from './schedule.service';
import { DaftarPenawaranKelas } from './response-model';
import { Auth, SessionObject } from '../auth/auth.decorator';
import { MahasiswaService } from '../mahasiswa/mahasiswa.service';

@Controller({
  path: 'schedule',
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
  ): Promise<WebResponse<DaftarPenawaranKelas>> {
    const mahasiswa = await this.mahasiswaService.getCommonStudentInformation(
      session.user.username,
    );

    const { id_kurikulum } =
      await this.mahasiswaService.getCuriculumStudentByNim(
        session.user.username,
      );

    const data = await this.scheduleService.getClassScheduleOffered(
      id_kurikulum,
      Number(mahasiswa.semester),
    );
    return {
      data,
    };
  }
}
