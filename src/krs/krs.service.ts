import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { ClassTakenResponse, KrsRequirementsResponse } from './response-model';

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

  async getKrsTakenByNIM(nim: string): Promise<ClassTakenResponse[]> {
    const krsRecords = await this.prismaService.kRS.findMany({
      where: {
        mahasiswa: {
          nim,
        },
      },
      include: {
        detailKrs: {
          include: {
            kelas: {
              include: {
                mataKuliah: {
                  include: {
                    detailKurikulum: {
                      include: {
                        kurikulum: {
                          select: {
                            kode_kurikulum: true,
                          },
                        },
                      },
                    },
                  },
                },
                dosenPengajarKelas: {
                  include: {
                    dosen: {
                      select: { nip: true, nama: true },
                    },
                  },
                },
                jadwalKelas: true,
              },
            },
          },
        },
      },
    });

    const formattedClasses = krsRecords.flatMap((krs) =>
      krs.detailKrs.map((detail) => {
        const kelas = detail.kelas;
        const mataKuliah = kelas?.mataKuliah;
        const detailKurikulum = mataKuliah?.detailKurikulum?.[0];

        return {
          id_kelas: kelas?.id_kelas || '',
          kode_mata_kuliah: mataKuliah?.kode_matkul || '',
          kode_kurikulum: detailKurikulum?.kurikulum?.kode_kurikulum || '',
          nama_mata_kuliah: mataKuliah?.nama || '',
          jenis_mata_kuliah: detailKurikulum?.jenis_matkul || 'Umum',
          sks: mataKuliah?.sks || 0,
          semester_paket: detailKurikulum?.semester_paket || 0,
          nama_kelas: kelas?.nama_kelas || '',
          dosen_pengajar:
            kelas?.dosenPengajarKelas.map((p) => ({
              nip_dosen: p.dosen.nip,
              nama_dosen: p.dosen.nama,
            })) || [],
          jadwal:
            kelas?.jadwalKelas.map((j) => ({
              hari: j.hari,
              waktu_mulai: new Date(j.waktu_mulai).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }),
              waktu_selesai: new Date(j.waktu_selesai).toLocaleTimeString(
                'id-ID',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                },
              ),
              ruangan: j.ruang,
            })) || [],
        };
      }),
    );

    return formattedClasses;
  }
}
