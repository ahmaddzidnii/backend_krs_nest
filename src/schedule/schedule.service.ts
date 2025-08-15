import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';
import { ClassOfferingList, ClassStatusBatch } from './schedule.response';
import { minutesToTimeString } from 'src/common/utils/time-utils';

@Injectable()
export class ScheduleService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Mengambil jadwal kelas yang ditawarkan untuk kurikulum tertentu pada periode aktif,
   * lalu mengelompokkannya berdasarkan semester paket.
   * @param idKurikulum ID dari kurikulum yang ingin ditampilkan.
   * @param semesterPaket (Opsional) Filter untuk semester paket tertentu.
   */
  async getClassScheduleOffered(
    idKurikulum: string,
    semesterPaket?: number,
  ): Promise<ClassOfferingList> {
    const whereClause: Prisma.KelasDitawarkanWhereInput = {
      periodeAkademik: {
        is_active: true,
      },
      mataKuliah: {
        detailKurikulum: {
          some: {
            id_kurikulum: idKurikulum,
          },
        },
      },
    };

    if (semesterPaket) {
      whereClause.mataKuliah.detailKurikulum.some.semester_paket =
        semesterPaket;
    }

    const kelasDitawarkan = await this.prismaService.kelasDitawarkan.findMany({
      where: whereClause,
      include: {
        mataKuliah: {
          include: {
            detailKurikulum: {
              include: {
                kurikulum: true,
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
        jadwalKelas: {
          select: {
            hari: true,
            waktu_mulai: true,
            waktu_selesai: true,
            ruang: true,
          },
        },
      },
    });

    const groupedBySemester = kelasDitawarkan.reduce((acc, kelas) => {
      const detailKurikulum = kelas.mataKuliah.detailKurikulum.find(
        (detail) => detail.id_kurikulum === idKurikulum,
      );

      if (!detailKurikulum) {
        return acc;
      }

      const semester = detailKurikulum.semester_paket;
      const semesterKey = String(semester);

      const kelasBaru = {
        id_kelas: kelas.id_kelas,
        kode_mata_kuliah: kelas.mataKuliah.kode_matkul,
        kode_kurikulum: detailKurikulum.kurikulum.kode_kurikulum,
        nama_mata_kuliah: kelas.mataKuliah.nama,
        jenis_mata_kuliah: detailKurikulum.jenis_matkul,
        sks: kelas.mataKuliah.sks,
        semester_paket: semester,
        nama_kelas: kelas.nama_kelas,
        dosen_pengajar: kelas.dosenPengajarKelas.map((pengajar) => ({
          nip_dosen: pengajar.dosen.nip,
          nama_dosen: pengajar.dosen.nama,
        })),
        jadwal: kelas.jadwalKelas.map((jadwal) => ({
          hari: jadwal.hari,
          waktu_mulai: minutesToTimeString(jadwal.waktu_mulai || 0),
          waktu_selesai: minutesToTimeString(jadwal.waktu_selesai || 0),
          ruangan: jadwal.ruang,
        })),
      };

      if (!acc[semesterKey]) {
        acc[semesterKey] = [];
      }
      acc[semesterKey].push(kelasBaru);

      return acc;
    }, {});

    return {
      semester_paket: groupedBySemester,
    };
  }

  /**
   * Mengambil status kelas berdasarkan ID kelas yang diberikan.
   * @param classIds Daftar ID kelas yang ingin diperiksa statusnya.
   * @param nim NIM mahasiswa untuk memeriksa apakah sudah terdaftar di kelas.
   */
  async getClassStatusBatch(
    classIds: string[],
    nim: string,
  ): Promise<ClassStatusBatch> {
    const classesWithStatus = await this.prismaService.kelasDitawarkan.findMany(
      {
        where: {
          id_kelas: {
            in: classIds,
          },
        },
        select: {
          id_kelas: true,
          kuota: true,
          terisi: true,
          // Mengecek apakah MAHASISWA INI sudah terdaftar di kelas untuk 'is_joined'
          detailKrs: {
            where: {
              krs: {
                mahasiswa: {
                  nim: nim,
                },
              },
            },
            // Kita hanya butuh tahu apakah relasinya ada, jadi select satu field saja sudah cukup
            select: {
              id_krs: true,
            },
          },
        },
      },
    );
    // const classesWithStatus = await this.prismaService.kelasDitawarkan.findMany(
    //   {
    //     where: {
    //       id_kelas: {
    //         in: classIds,
    //       },
    //     },
    //     select: {
    //       id_kelas: true,
    //       kuota: true,

    //       // Menghitung jumlah mahasiswa terdaftar untuk mendapatkan nilai 'terisi'
    //       _count: {
    //         select: {
    //           detailKrs: true,
    //         },
    //       },

    //       // Mengecek apakah MAHASISWA INI sudah terdaftar di kelas untuk 'is_joined'
    //       detailKrs: {
    //         where: {
    //           krs: {
    //             mahasiswa: {
    //               nim: nim,
    //             },
    //           },
    //         },
    //         // Kita hanya butuh tahu apakah relasinya ada, jadi select satu field saja sudah cukup
    //         select: {
    //           id_krs: true,
    //         },
    //       },
    //     },
    //   },
    // );

    const result = classesWithStatus.reduce((acc, kelas) => {
      const terisi = kelas.terisi;
      const kuota = kelas.kuota;
      acc[kelas.id_kelas] = {
        id_kelas: kelas.id_kelas,
        is_full: terisi >= kuota,
        is_joined: kelas.detailKrs.length > 0,
        kuota: kuota,
        terisi: terisi,
      };

      return acc;
    }, {} as ClassStatusBatch);

    return result;
  }
}
