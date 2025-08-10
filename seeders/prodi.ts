import { JenjangStudi, PrismaClient } from '@prisma/client';
import dataProdi from '../seeders/data/mentahan.json';
import dotenv from 'dotenv';

const prisma = new PrismaClient();

export const seedProgramStudi = async () => {
  dotenv.config();
  console.log('🚀 START: Seeding data Program Studi...');

  try {
    // 1. & 2. Kumpulkan kode dan ambil data fakultas (tetap sama)
    const uniqueFacultyCodes = [
      ...new Set(dataProdi.map((prodi) => prodi.KODE_FAKULTAS)),
    ];
    console.log(
      `🔍 Menemukan ${uniqueFacultyCodes.length} kode fakultas unik di JSON.`,
    );

    const facultiesFromDb = await prisma.fakultas.findMany({
      where: { kode_fakultas: { in: uniqueFacultyCodes } },
      select: { id_fakultas: true, kode_fakultas: true },
    });

    // 3. Buat Peta (lookup map) untuk pencarian cepat (tetap sama)
    const facultyMap = new Map(
      facultiesFromDb.map((f) => [f.kode_fakultas, f.id_fakultas]),
    );
    console.log(
      `🗺️ Berhasil memetakan ${facultyMap.size} fakultas dari database.`,
    );

    // ==================== PERBAIKAN UTAMA DI SINI ====================
    // 4. Gunakan .reduce() untuk memfilter dan memetakan dalam satu langkah.
    //    Ini lebih aman secara tipe data karena tidak pernah menghasilkan 'undefined'.
    const prodiToCreate = dataProdi.reduce<
      {
        kode_prodi: string;
        nama: string;
        jenjang_studi: JenjangStudi;
        id_fakultas: string;
      }[]
    >((accumulator, prodiFromJson) => {
      const facultyId = facultyMap.get(prodiFromJson.KODE_FAKULTAS);

      // Cek jika data valid. Jika tidak, cukup kembalikan akumulator tanpa perubahan.
      if (prodiFromJson.KODE_PRODI && facultyId) {
        const jenjangValue = prodiFromJson.JENJANG;

        // Jika valid, tambahkan objek baru ke dalam array akumulator
        accumulator.push({
          kode_prodi: prodiFromJson.KODE_PRODI.toString(),
          nama: prodiFromJson.NAMA_PRODI,
          jenjang_studi:
            jenjangValue == 'Sarjana (S1)'
              ? JenjangStudi.S1
              : jenjangValue == 'Magister (S2)'
                ? JenjangStudi.S2
                : JenjangStudi.S3,
          id_fakultas: facultyId,
        });
      } else if (!facultyId) {
        // Opsi: Tetap berikan warning untuk fakultas yang tidak ditemukan
        console.warn(
          `⚠️  Fakultas dengan kode "${prodiFromJson.KODE_FAKULTAS}" untuk prodi "${prodiFromJson.NAMA_PRODI}" tidak ditemukan di database. Data dilewati.`,
        );
      }

      return accumulator;
    }, []); // Mulai dengan array kosong sebagai nilai awal akumulator

    if (prodiToCreate.length === 0) {
      console.log(
        '🟡 INFO: Tidak ada data prodi baru yang valid untuk dimasukkan.',
      );
      return;
    }

    // ==================== PENYEDERHANAAN DI SINI ====================
    // 5. Masukkan data ke DB. Tidak perlu .map() lagi karena prodiToCreate sudah benar.
    console.log(
      `💾 Menyiapkan untuk memasukkan ${prodiToCreate.length} data prodi yang valid...`,
    );

    const result = await prisma.programStudi.createMany({
      data: prodiToCreate, // Langsung gunakan prodiToCreate
    });

    console.log(
      `✅ SUCCESS: Berhasil membuat ${result.count} data Program Studi baru.`,
    );
  } catch (error) {
    console.error(
      '❌ ERROR: Terjadi kegagalan saat seeding Program Studi.',
      error,
    );
  } finally {
    console.log('🏁 END: Proses seeding Program Studi selesai.');
    await prisma.$disconnect();
  }
};

seedProgramStudi();
