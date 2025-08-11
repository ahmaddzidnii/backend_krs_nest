import { HttpException, Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';
import { StudentCommonInformationsResponse } from './response-model';

@Injectable()
export class MahasiswaService {
  constructor(private readonly prismaService: PrismaService) {}

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

    const periodeAkademikPromise = this.prismaService.periodeAkademik.findFirst(
      {
        where: {
          is_active: true,
        },
      },
    );

    const [mahasiswa, periodeAkademik] = await Promise.all([
      mahasiswaPromise,
      periodeAkademikPromise,
    ]);

    const { ipk, ips_lalu, jatah_sks, semester_berjalan, sks_kumulatif } =
      mahasiswa;

    return {
      ipk,
      ips_lalu,
      jatah_sks,
      semester: semester_berjalan.toString(),
      sisa_sks: jatah_sks - mahasiswa.krs[0].total_sks_diambil,
      sks_ambil: mahasiswa.krs[0].total_sks_diambil,
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
