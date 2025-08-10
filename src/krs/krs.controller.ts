import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { KrsService } from './krs.service';
import { KrsRequirementsResponse } from './response-model';
import { WebResponse } from '../model/web.model';
import { Auth, SessionObject } from '../auth/auth.decorator';

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

  @Get('history')
  async getKrsHistory(): Promise<any> {
    return null;
  }

  @Post('remove')
  @HttpCode(200)
  async removeKrs(id_kelas: string): Promise<void> {
    return null;
  }
}
