import { Redis } from 'ioredis';
import { Mahasiswa } from '@prisma/client';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { HttpException, Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';
import { PeriodService } from 'src/common/period.service';
import { StudentCommonInformationsResponse } from './mahasiswa.response';

@Injectable()
export class MahasiswaService {
  private readonly redis: Redis;
  constructor(
    private readonly prismaService: PrismaService,
    private readonly periodService: PeriodService,
    private readonly redisService: RedisService,
  ) {
    this.redis = redisService.getOrThrow();
  }

  async getMahasiswaByNim(nim: string): Promise<Mahasiswa> {
    const CACHE_KEY = `mahasiswa-${nim}`;
    const CACHE_TTL = 3600;

    const cached = await this.redis.get(CACHE_KEY);

    if (cached) {
      return JSON.parse(cached);
    }

    const mahasiswaWithTotalSks = await this.prismaService.mahasiswa.findUnique(
      {
        where: {
          nim,
        },
      },
    );

    await this.redis.set(
      CACHE_KEY,
      JSON.stringify(mahasiswaWithTotalSks),
      'EX',
      CACHE_TTL,
    );

    return mahasiswaWithTotalSks;
  }

  async getCommonStudentInformation(
    nim: string,
  ): Promise<StudentCommonInformationsResponse> {
    const mahasiswaPromise = this.getMahasiswaByNim(nim);
    const periodeAkademikPromise = this.periodService.getCurrentPeriod();

    const [mahasiswa, periodeAkademik] = await Promise.all([
      mahasiswaPromise,
      periodeAkademikPromise,
    ]);

    const krs = await this.prismaService.krs.findFirst({
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
