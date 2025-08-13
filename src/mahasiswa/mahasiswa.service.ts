import { HttpException, Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';
import { PeriodService } from 'src/common/period.service';
import { StudentCommonInformationsResponse } from './response-model';

@Injectable()
export class MahasiswaService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly periodService: PeriodService,
  ) {}

  async getCommonStudentInformation(
    nim: string,
  ): Promise<StudentCommonInformationsResponse> {
    const mahasiswaPromise = this.prismaService.mahasiswa.findUnique({
      where: {
        nim,
      },
      include: {
        krs: {
          where: {
            periodeAkademik: {
              is_active: true,
            },
          },
          select: {
            total_sks_diambil: true,
          },
        },
      },
    });

    const periodeAkademikPromise = this.periodService.getCurrentPeriod();

    const [mahasiswa, periodeAkademik] = await Promise.all([
      mahasiswaPromise,
      periodeAkademikPromise,
    ]);

    const krs = await this.prismaService.kRS.findFirst({
      where: {
        AND: [
          {
            id_mahasiswa: mahasiswa.id_mahasiswa,
          },
          {
            id_periode: periodeAkademik.id_periode,
          },
        ],
      },
    });

    const { ipk, ips_lalu, jatah_sks, semester_berjalan, sks_kumulatif } =
      mahasiswa;

    const krsDiambil = krs ? krs.total_sks_diambil : 0;

    return {
      ipk,
      ips_lalu,
      jatah_sks,
      semester: semester_berjalan.toString(),
      sisa_sks: jatah_sks - krsDiambil,
      sks_ambil: krsDiambil,
      sks_kumulatif,
      tahun_akademik: periodeAkademik.tahun_akademik,
    };
  }

  async getStudentAndCuriculumByNim(nim: string) {
    const mahasiswa = await this.prismaService.mahasiswa.findUnique({
      where: {
        nim,
      },
      include: {
        kurikulum: true,
      },
    });

    if (!mahasiswa) {
      throw new HttpException('Mahasiswa not found', 400);
    }

    return mahasiswa;
  }
}
