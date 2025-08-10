import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { DaftarPenawaranKelas } from './response-model';
import { PrismaService } from '../common/prisma.service';

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
  ): Promise<DaftarPenawaranKelas> {
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
      where: whereClause, // Gunakan objek where yang sudah dibangun
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
          waktu_mulai: new Date(jadwal.waktu_mulai).toLocaleTimeString(
            'id-ID',
            { hour: '2-digit', minute: '2-digit', hour12: false },
          ),
          waktu_selesai: new Date(jadwal.waktu_selesai).toLocaleTimeString(
            'id-ID',
            { hour: '2-digit', minute: '2-digit', hour12: false },
          ),
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
}
