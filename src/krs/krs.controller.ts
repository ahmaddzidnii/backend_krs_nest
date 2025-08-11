import { Controller, Get, HttpCode, Post } from '@nestjs/common';

import { KrsService } from './krs.service';
import { WebResponse } from '../model/web.model';
import { Auth, SessionObject } from '../auth/auth.decorator';
import { ClassTakenResponse, KrsRequirementsResponse } from './response-model';

@Controller({
  path: 'krs',
  version: '1',
})
export class KrsController {
  constructor(private readonly krsService: KrsService) {}
  @Get('requirements')
  async getKrsRequirements(
    @Auth() session: SessionObject,
  ): Promise<WebResponse<KrsRequirementsResponse>> {
    const data = await this.krsService.getKrsRequirementByNIM(
      session.user.username,
    );
    return {
      data,
    };
  }

  @Post('take')
  @HttpCode(200)
  async takeKrs(id_kelas: string): Promise<void> {
    return null;
  }

  @Get('get-classes-taken')
  async getTakenClasses(
    @Auth() session: SessionObject,
  ): Promise<WebResponse<ClassTakenResponse[]>> {
    const data = await this.krsService.getKrsTakenByNIM(session.user.username);
    return {
      data,
    };
  }

  @Post('remove')
  @HttpCode(200)
  async removeKrs(id_kelas: string): Promise<void> {
    return null;
  }
}
