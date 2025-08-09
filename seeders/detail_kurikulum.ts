import { JenisMatkul, PrismaClient } from '../generated/prisma';
import kurikulumjson from '../seeders/data/detail_kurikulum_penghubung.json';

import dotenv from 'dotenv';

const prisma = new PrismaClient();

export const seedDetailKurikulum = async () => {
  dotenv.config();
  console.log('🚀 START: Seeding data detail kurikulum...');

  try {
    const mataKuliahIds = await prisma.mataKuliah.findMany({
      where: {
        kode_matkul: {
          in: kurikulumjson.map((kurikulum) => kurikulum.kode_matkul),
        },
      },
      select: {
        id_matkul: true,
        kode_matkul: true,
      },
    });

    const kurikulumIds = await prisma.kurikulum.findMany({
      where: {
        kode_kurikulum: {
          in: kurikulumjson.map((kurikulum) => kurikulum.kode_kurikulum),
        },
      },
      select: {
        id_kurikulum: true,
        kode_kurikulum: true,
      },
    });

    const detailKurikulums = kurikulumjson.map((kurikulum) => ({
      id_kurikulum: kurikulumIds.find(
        (k) => k.kode_kurikulum === kurikulum.kode_kurikulum,
      )?.id_kurikulum as string,
      id_matkul: mataKuliahIds.find(
        (m) => m.kode_matkul === kurikulum.kode_matkul,
      )?.id_matkul as string,
      jenis_matkul:
        kurikulum.jenis_mk === 'WAJIB'
          ? JenisMatkul.WAJIB
          : JenisMatkul.PILIHAN,
      semester_paket: parseInt(String(kurikulum.semester), 10),
    }));

    await prisma.detailKurikulum.createMany({
      data: detailKurikulums,
      skipDuplicates: false,
    });
  } catch (error) {
    console.error('❌ ERROR: Terjadi kegagalan saat seedingi.', error);
  } finally {
    console.log('🏁 END: Proses seeding kurikulum selesai.');
    await prisma.$disconnect();
  }
};

seedDetailKurikulum()
  .then(() => {
    console.log('✅ Seeding kurikulum selesai.');
  })
  .catch((err) => {
    console.error('❌ Terjadi kesalahan saat seeding kurikulum:', err.message);
  })
  .finally(() => {
    prisma.$disconnect();
  });
