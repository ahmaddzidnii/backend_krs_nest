import { PrismaClient } from '@prisma/client';
import kurikulumjson from '../seeders/data/kurikulum_master.json';

export const seedKurikulum = async (prisma: PrismaClient) => {
  console.log('🚀 START: Seeding data kurikulum...');

  try {
    const prodiIds = await prisma.programStudi.findMany({
      where: {
        kode_prodi: {
          in: kurikulumjson.map((kurikulum) => kurikulum.kode_prodi.toString()),
        },
      },
      select: {
        id_prodi: true,
        kode_prodi: true,
      },
    });

    const kurikulums = kurikulumjson.map((kurikulum) => ({
      kode_kurikulum: kurikulum.kode_kurikulum,
      nama: kurikulum.nama_kurikulum,
      id_prodi: prodiIds.find(
        (prodi) => prodi.kode_prodi == kurikulum.kode_prodi,
      )?.id_prodi as string,
      is_active: false,
      // is_active: kurikulum.tahun == 2024,
    }));

    // Filter hanya yang punya relasi prodi valid
    const validKurikulums = kurikulums.filter((k) => k.id_prodi);

    if (validKurikulums.length === 0) {
      console.log(
        '🟡 INFO: Tidak ada data kurikulum baru yang valid untuk dimasukkan.',
      );
      return;
    }

    await prisma.kurikulum.createMany({
      data: validKurikulums,
      skipDuplicates: true,
    });

    console.log(
      `✅ Berhasil menambahkan ${validKurikulums.length} kurikulum baru.`,
    );
  } catch (error) {
    console.error('❌ ERROR: Terjadi kegagalan saat seeding.', error);
  } finally {
    console.log('🏁 END: Proses seeding kurikulum selesai.');
  }
};

// contoh pemanggilan langsung
if (require.main === module) {
  const prisma = new PrismaClient();
  seedKurikulum(prisma)
    .then(() => console.log('✅ Seeding kurikulum selesai.'))
    .catch((err) => console.error('❌ Error seeding kurikulum:', err))
    .finally(() => prisma.$disconnect());
}
