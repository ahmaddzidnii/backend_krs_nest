import { Prisma } from '@prisma/client';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';
import { ClassTakenResponse, KrsRequirementsResponse } from './response-model';

@Injectable()
export class KrsService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Method untuk mahasiswa mengambil mata kuliah ke KRS.
   *
   * @param nim Nomor Induk Mahasiswa
   * @param classId ID unik dari kelas yang ditawarkan
   */
  async takeKrs(nim: string, classId: string): Promise<void> {
    const periodeAkademik = await this.prismaService.periodeAkademik.findFirst({
      where: { is_active: true },
    });

    if (!periodeAkademik) {
      throw new HttpException(
        'MAAF, TIDAK ADA PERIODE AKADEMIK YANG AKTIF.',
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      await this.prismaService.$transaction(
        async ($tx) => {
          // --- LANGKAH A: PENGAMBILAN DATA (DI DALAM TRANSAKSI) ---

          const mahasiswa = await $tx.mahasiswa.findUnique({
            where: { nim },
            include: {
              krs: {
                where: { id_periode: periodeAkademik.id_periode },
                include: {
                  detailKrs: {
                    include: {
                      kelas: {
                        include: {
                          mataKuliah: true,
                          jadwalKelas: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          const kelasBaru = await $tx.kelasDitawarkan.findUnique({
            where: { id_kelas: classId },
            include: {
              mataKuliah: true,
              jadwalKelas: true,
              _count: {
                select: { detailKrs: true },
              },
            },
          });

          // --- LANGKAH B: VALIDASI DATA (DI DALAM TRANSAKSI) ---

          if (!mahasiswa) {
            throw new HttpException(
              'MAAF, DATA MAHASISWA TIDAK DITEMUKAN.',
              HttpStatus.NOT_FOUND,
            );
          }
          if (!kelasBaru) {
            throw new HttpException(
              'MAAF, DATA KELAS TIDAK DITEMUKAN.',
              HttpStatus.NOT_FOUND,
            );
          }

          const { pengisisan_krs_enabled } = await this.getKrsRequirementByNIM(
            mahasiswa.nim,
          );
          if (!pengisisan_krs_enabled) {
            throw new HttpException(
              'MAAF, ANDA TIDAK MEMENUHI SYARAT UNTUK MENGISI KRS.',
              HttpStatus.FORBIDDEN,
            );
          }

          const krsMahasiswa = mahasiswa.krs[0];
          const sksKelasBaru = kelasBaru.mataKuliah.sks;
          const namaKelasFormatted = `{${kelasBaru.mataKuliah.nama} - ${kelasBaru.nama_kelas}}`;

          // Validasi #1: Cek apakah mata kuliah sudah diambil.
          const isAlreadyTaken = krsMahasiswa?.detailKrs.some(
            (detail) => detail.id_kelas === classId,
          );
          if (isAlreadyTaken) {
            throw new HttpException(
              `MAAF, KELAS ${namaKelasFormatted} SUDAH ADA DI KRS ANDA.`,
              HttpStatus.BAD_REQUEST,
            );
          }

          // Validasi #2: Cek kuota kelas.
          const jumlahPendaftar = kelasBaru._count.detailKrs;
          if (jumlahPendaftar >= kelasBaru.kuota) {
            throw new HttpException(
              `MAAF, KUOTA UNTUK KELAS ${namaKelasFormatted} SUDAH PENUH.`,
              HttpStatus.BAD_REQUEST,
            );
          }

          // Validasi #3: Cek batas SKS mahasiswa.
          const totalSksSaatIni = krsMahasiswa?.total_sks_diambil || 0;
          if (totalSksSaatIni + sksKelasBaru > mahasiswa.jatah_sks) {
            throw new HttpException(
              `MAAF, PENAMBAHAN SKS AKAN MELEBIHI BATAS SKS ANDA. SKS SAAT INI: {${totalSksSaatIni}}, JATAH SKS: {${mahasiswa.jatah_sks}}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          // Validasi #4: Cek jadwal bentrok.
          const jadwalKelasBaru = kelasBaru.jadwalKelas;
          const kelasSudahAda =
            krsMahasiswa?.detailKrs.map((detail) => detail.kelas) || [];

          for (const jadwalBaru of jadwalKelasBaru) {
            for (const kelasLama of kelasSudahAda) {
              for (const jadwalLama of kelasLama.jadwalKelas) {
                if (jadwalBaru.hari === jadwalLama.hari) {
                  const mulaiBaru = new Date(jadwalBaru.waktu_mulai);
                  const selesaiBaru = new Date(jadwalBaru.waktu_selesai);
                  const mulaiLama = new Date(jadwalLama.waktu_mulai);
                  const selesaiLama = new Date(jadwalLama.waktu_selesai);

                  const mulaiBaruInMinutes =
                    mulaiBaru.getHours() * 60 + mulaiBaru.getMinutes();
                  const selesaiBaruInMinutes =
                    selesaiBaru.getHours() * 60 + selesaiBaru.getMinutes();
                  const mulaiLamaInMinutes =
                    mulaiLama.getHours() * 60 + mulaiLama.getMinutes();
                  const selesaiLamaInMinutes =
                    selesaiLama.getHours() * 60 + selesaiLama.getMinutes();

                  // Cek tumpang tindih waktu: (StartA < EndB) and (StartB < EndA)
                  if (
                    mulaiBaruInMinutes < selesaiLamaInMinutes &&
                    mulaiLamaInMinutes < selesaiBaruInMinutes
                  ) {
                    const namaKelasLamaFormatted = `{${kelasLama.mataKuliah.nama} - ${kelasLama.nama_kelas}}`;
                    throw new HttpException(
                      `MAAF, JADWAL BENTROK DENGAN KELAS ${namaKelasLamaFormatted}.`,
                      HttpStatus.CONFLICT,
                    );
                  }
                }
              }
            }
          }

          // --- LANGKAH C: PENULISAN DATA (DI DALAM TRANSAKSI) ---

          const krsRecord = await $tx.kRS.upsert({
            where: {
              id_mahasiswa_id_periode: {
                id_mahasiswa: mahasiswa.id_mahasiswa,
                id_periode: periodeAkademik.id_periode,
              },
            },
            create: {
              id_mahasiswa: mahasiswa.id_mahasiswa,
              id_periode: periodeAkademik.id_periode,
              total_sks_diambil: sksKelasBaru,
            },
            update: {
              total_sks_diambil: {
                increment: sksKelasBaru,
              },
            },
          });

          await $tx.detailKrs.create({
            data: {
              id_krs: krsRecord.id_krs,
              id_kelas: classId,
            },
          });
        },
        {
          isolationLevel: 'Serializable',
          maxWait: 5000,
          timeout: 10000,
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Error ini terjadi jika unique constraint gagal, misal mencoba insert duplikat.
          // Kita tidak punya akses ke `namaKelasFormatted` di sini, jadi pesannya lebih umum.
          throw new HttpException(
            'MAAF, KELAS YANG DIPILIH SUDAH ADA DI KRS ANDA (DB).',
            HttpStatus.CONFLICT,
          );
        }
      }

      console.error(
        'An unexpected error occurred during takeKrs transaction:',
        error,
      );
      throw new HttpException(
        'MAAF, TERJADI KESALAHAN PADA SERVER.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Method untuk mahasiswa menghapus mata kuliah dalam KRS.
   *
   * @param nim Nomor Induk Mahasiswa
   * @param classId ID unik dari kelas yang ditawarkan
   */
  async deleteKrs(nim: string, classId: string): Promise<void> {
    const mahasiswaPromise = this.prismaService.mahasiswa.findUnique({
      where: { nim },
      select: {
        id_mahasiswa: true,
        nim: true,
      },
    });

    const periodeAkademikPromise = this.prismaService.periodeAkademik.findFirst(
      {
        where: {
          is_active: true,
        },
        select: {
          id_periode: true,
        },
      },
    );

    const [mahasiswa, periodeAkademik] = await Promise.all([
      mahasiswaPromise,
      periodeAkademikPromise,
    ]);

    if (!mahasiswa) {
      throw new HttpException('Unauthorized', 401);
    }

    const { pengisisan_krs_enabled } = await this.getKrsRequirementByNIM(
      mahasiswa.nim,
    );

    if (!pengisisan_krs_enabled) {
      throw new HttpException('You are not eligible to fill out the KRS.', 403);
    }

    const krs = await this.prismaService.kRS.findFirst({
      where: {
        AND: [
          {
            id_mahasiswa: mahasiswa.id_mahasiswa,
            id_periode: periodeAkademik.id_periode,
          },
        ],
      },
    });

    if (!krs) {
      throw new HttpException('Krs Not found', 404);
    }

    const existingRecord = await this.prismaService.detailKrs.findUnique({
      where: {
        id_krs_id_kelas: {
          id_kelas: classId,
          id_krs: krs.id_krs,
        },
      },
    });

    if (!existingRecord) {
      throw new HttpException('Record not exist.', 400);
    }

    await this.prismaService.detailKrs.delete({
      where: {
        id_krs_id_kelas: {
          id_kelas: classId,
          id_krs: krs.id_krs,
        },
      },
    });
  }

  /**
   * Method untuk mendapatkan syarat krs.
   *
   * @param nim Nomor Induk Mahasiswa
   */
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

  /**
   * Method untuk mendapatkan krs yang diambil oleh mahasiawa by nim.
   *
   * @param nim Nomor Induk Mahasiswa
   */
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
