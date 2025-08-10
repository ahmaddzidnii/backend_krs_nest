import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { KrsRequirementsResponse } from './response-model';

@Injectable()
export class KrsService {
  constructor(private prismaService: PrismaService) {}

  async getKrsRequirementByNIM(nim: string): Promise<KrsRequirementsResponse> {
    const mahasiswaPromise = this.prismaService.mahasiswa.findUnique({
      where: {
        nim,
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

    if (!mahasiswa) {
      throw new HttpException('Student not found.', 401);
    }

    const data_syarat = [
      {
        syarat: `Bayar Biaya Pendidikan ${String(periodeAkademik.jenis_semester).charAt(0).toUpperCase() + String(periodeAkademik.jenis_semester).slice(1).toLowerCase()} Tahun Akademik ${periodeAkademik.tahun_akademik} = Sudah Bayar`,
        isi:
          mahasiswa.status_pembayaran === 'LUNAS'
            ? 'Sudah Bayar'
            : 'Belum Bayar',
        status: mahasiswa.status_pembayaran === 'LUNAS' ? true : false,
      },
      {
        syarat: 'Semester Mahasiswa = 3|4|5|6|7|8|9|10|11|12|13|14',
        isi: String(mahasiswa.semester_berjalan),
        status:
          mahasiswa.semester_berjalan >= 3 && mahasiswa.semester_berjalan <= 14,
      },
      {
        syarat: 'Status Mahasiswa = Aktif',
        isi:
          mahasiswa.status_mahasiswa === 'AKTIF'
            ? 'Aktif'
            : mahasiswa.status_mahasiswa === 'CUTI'
              ? 'Cuti'
              : 'Dispensasi',
        status: mahasiswa.status_mahasiswa === 'AKTIF',
      },
    ];

    return {
      judul: 'Syarat Pengisian',
      data_syarat,
      pengisisan_krs_enabled: data_syarat.every((s) => s.status),
    };
  }
}
