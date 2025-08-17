import { JenjangStudi, PrismaClient } from '@prisma/client';
import dataProdi from '../seeders/data/mentahan.json';

export const seedProgramStudi = async (prisma: PrismaClient) => {
  console.log('🚀 START: Seeding data Program Studi...');

  try {
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

    const facultyMap = new Map(
      facultiesFromDb.map((f) => [f.kode_fakultas, f.id_fakultas]),
    );
    console.log(
      `🗺️ Berhasil memetakan ${facultyMap.size} fakultas dari database.`,
    );

    const prodiToCreate = dataProdi.reduce<
      {
        kode_prodi: string;
        nama: string;
        jenjang_studi: JenjangStudi;
        id_fakultas: string;
      }[]
    >((acc, prodiFromJson) => {
      const facultyId = facultyMap.get(prodiFromJson.KODE_FAKULTAS);

      if (prodiFromJson.KODE_PRODI && facultyId) {
        const jenjangValue = prodiFromJson.JENJANG;

        acc.push({
          kode_prodi: prodiFromJson.KODE_PRODI.toString(),
          nama: prodiFromJson.NAMA_PRODI,
          jenjang_studi:
            jenjangValue === 'Sarjana (S1)'
              ? JenjangStudi.S1
              : jenjangValue === 'Magister (S2)'
                ? JenjangStudi.S2
                : JenjangStudi.S3,
          id_fakultas: facultyId,
        });
      } else if (!facultyId) {
        console.warn(
          `⚠️ Fakultas dengan kode "${prodiFromJson.KODE_FAKULTAS}" untuk prodi "${prodiFromJson.NAMA_PRODI}" tidak ditemukan di database. Data dilewati.`,
        );
      }

      return acc;
    }, []);

    if (prodiToCreate.length === 0) {
      console.log(
        '🟡 INFO: Tidak ada data prodi baru yang valid untuk dimasukkan.',
      );
      return;
    }

    console.log(
      `💾 Menyiapkan untuk memasukkan ${prodiToCreate.length} data prodi...`,
    );

    const result = await prisma.programStudi.createMany({
      data: prodiToCreate,
      skipDuplicates: true,
    });

    console.log(
      `✅ SUCCESS: Berhasil membuat ${result.count} data Program Studi.`,
    );
  } catch (error) {
    console.error(
      '❌ ERROR: Terjadi kegagalan saat seeding Program Studi.',
      error,
    );
  } finally {
    console.log('🏁 END: Proses seeding Program Studi selesai.');
  }
};
