import { Hari, Prisma, PrismaClient } from '@prisma/client';

import dataKelas from '../seeders/data/data-kelas.json';
import { timeStringToMinutes } from '../src/common/utils/time-utils';

type KelasDitawarkan = Prisma.KelasDitawarkanCreateManyInput[];

export async function seedKelasDitawarkan(prisma: PrismaClient) {
  try {
    // Ambil periode akademik yang aktif
    const periodeAkademik = await prisma.periodeAkademik.findFirst({
      where: { is_active: true },
      select: { id_periode: true },
    });

    if (!periodeAkademik) {
      throw new Error('Tidak ada periode akademik yang aktif');
    }

    // Ambil semua mata kuliah berdasarkan kode yang ada di data JSON
    const matakuliah = await prisma.mataKuliah.findMany({
      where: {
        kode_matkul: {
          in: dataKelas.map((kelas) => kelas.kode_matkul),
        },
      },
      select: {
        id_matkul: true,
        kode_matkul: true,
      },
    });

    // Membuat map untuk mempermudah pencarian mata kuliah berdasarkan kode
    const matakuliahMap = new Map(
      matakuliah.map((mk) => [mk.kode_matkul, mk.id_matkul]),
    );

    // Prepare data kelas ditawarkan
    const kelasDitawarkanData: KelasDitawarkan = dataKelas.map((kelas) => {
      const idMatkul = matakuliahMap.get(kelas.kode_matkul);

      if (!idMatkul) {
        throw new Error(
          `Mata kuliah dengan kode ${kelas.kode_matkul} tidak ditemukan`,
        );
      }

      return {
        id_matkul: idMatkul,
        id_periode: periodeAkademik.id_periode,
        nama_kelas: kelas.nama_kelas,
        kuota: kelas.kouta,
      };
    });

    // Insert kelas ditawarkan
    const insertedKelas = await prisma.kelasDitawarkan.createMany({
      data: kelasDitawarkanData,
      skipDuplicates: true,
    });

    console.log(`Berhasil membuat ${insertedKelas.count} kelas ditawarkan`);

    // Ambil data kelas yang baru dibuat untuk mendapatkan ID-nya
    const createdKelas = await prisma.kelasDitawarkan.findMany({
      where: {
        id_periode: periodeAkademik.id_periode,
        id_matkul: {
          in: Array.from(matakuliahMap.values()),
        },
      },
      include: {
        mataKuliah: {
          select: {
            kode_matkul: true,
          },
        },
      },
    });

    // Membuat map untuk kelas yang sudah dibuat
    const kelasMap = new Map(
      createdKelas.map((kelas) => [
        `${kelas.mataKuliah.kode_matkul}-${kelas.nama_kelas}`,
        kelas.id_kelas,
      ]),
    );

    // Prepare data jadwal kelas
    const jadwalKelasData: Prisma.JadwalKelasCreateManyInput[] = [];

    dataKelas.forEach((kelas) => {
      const idKelas = kelasMap.get(`${kelas.kode_matkul}-${kelas.nama_kelas}`);

      if (!idKelas) {
        console.warn(
          `Kelas ${kelas.kode_matkul}-${kelas.nama_kelas} tidak ditemukan`,
        );
        return;
      }

      kelas.jadwal.forEach((jadwal) => {
        // Convert jam ke format menit (HH:MM -> total menit)
        const waktuMulai = timeStringToMinutes(jadwal.jam_mulai);
        const waktuSelesai = timeStringToMinutes(jadwal.jam_selesai);

        jadwalKelasData.push({
          hari: getValueHari(jadwal.hari),
          waktu_mulai: waktuMulai,
          waktu_selesai: waktuSelesai,
          ruang: jadwal.ruang,
          id_kelas: idKelas,
        });
      });
    });

    // Insert jadwal kelas
    const insertedJadwal = await prisma.jadwalKelas.createMany({
      data: jadwalKelasData,
      skipDuplicates: true,
    });

    console.log(`Berhasil membuat ${insertedJadwal.count} jadwal kelas`);

    // Ambil semua NIP dosen dari data JSON
    const allNips = dataKelas.flatMap((kelas) =>
      kelas.dosen.map((dosen) => dosen.nip),
    );

    // Ambil data dosen berdasarkan NIP
    const dosen = await prisma.dosen.findMany({
      select: {
        id_dosen: true,
        nip: true,
      },
      where: {
        nip: {
          in: allNips,
        },
      },
    });

    // Membuat map untuk dosen berdasarkan NIP
    const dosenMap = new Map(dosen.map((d) => [d.nip, d.id_dosen]));

    // Prepare data dosen pengajar kelas
    const dosenPengajarData: Prisma.DosenPengajarKelasCreateManyInput[] = [];

    dataKelas.forEach((kelas) => {
      const idKelas = kelasMap.get(`${kelas.kode_matkul}-${kelas.nama_kelas}`);

      if (!idKelas) {
        console.warn(
          `Kelas ${kelas.kode_matkul}-${kelas.nama_kelas} tidak ditemukan`,
        );
        return;
      }

      kelas.dosen.forEach((dosenData) => {
        const idDosen = dosenMap.get(dosenData.nip);

        if (!idDosen) {
          console.warn(`Dosen dengan NIP ${dosenData.nip} tidak ditemukan`);
          return;
        }

        dosenPengajarData.push({
          id_dosen: idDosen,
          id_kelas: idKelas,
        });
      });
    });

    // Insert dosen pengajar kelas
    const insertedDosenPengajar = await prisma.dosenPengajarKelas.createMany({
      data: dosenPengajarData,
      skipDuplicates: true,
    });

    console.log(
      `Berhasil membuat ${insertedDosenPengajar.count} relasi dosen pengajar`,
    );

    console.log('Seeding kelas ditawarkan selesai!');
  } catch (error) {
    console.error('Error dalam seeding kelas ditawarkan:', error);
    throw error;
  }
}

function getValueHari(hari: string): Hari {
  switch (hari.toUpperCase()) {
    case 'SENIN':
      return Hari.Senin;
    case 'SELASA':
      return Hari.Selasa;
    case 'RABU':
      return Hari.Rabu;
    case 'KAMIS':
      return Hari.Kamis;
    case 'JUMAT':
      return Hari.Jumat;
    case 'SABTU':
      return Hari.Sabtu;
    default:
      throw new Error(`Hari tidak valid: ${hari}`);
  }
}
