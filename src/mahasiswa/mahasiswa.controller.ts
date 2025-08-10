import { Controller, Get } from '@nestjs/common';
import { MahasiswaService } from './mahasiswa.service';
import { Auth, SessionObject } from 'src/auth/auth.decorator';
import { StudentCommonInformationsResponse } from './response-model';
import { WebResponse } from 'src/model/web.model';

@Controller({
  path: 'mahasiswa',
  version: '1',
})
export class MahasiswaController {
  constructor(private readonly mahasiswaService: MahasiswaService) {}

  @Get('get-common-information')
  async getCommonStudentInformation(
    @Auth() session: SessionObject,
  ): Promise<WebResponse<StudentCommonInformationsResponse>> {
    const data = await this.mahasiswaService.getCommonStudentInformation(
      session.user.username,
    );

    return {
      data,
    };
  }
}
