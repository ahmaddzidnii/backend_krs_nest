import { PrismaClient } from '../generated/prisma';
import matakuliahJson from '../seeders/data/matakuliah_master.json';
import dotenv from 'dotenv';

const prisma = new PrismaClient();

export const seedMataKuliah = async () => {
  dotenv.config();
  console.log('🚀 START: Seeding data Program Studi...');

  try {
    const matakuliahs = matakuliahJson.map((m) => ({
      kode_matkul: m.kode_matkul,
      nama: m.nama_matkul,
      sks: m.sks,
    }));

    await prisma.mataKuliah.createMany({
      data: matakuliahs,
      skipDuplicates: true,
    });
    console.log(
      `✅ Berhasil menambahkan ${matakuliahs.length} kurikulum baru.`,
    );
  } catch (error) {
    console.error('❌ ERROR: Terjadi kegagalan saat seedingi.', error);
  } finally {
    console.log('🏁 END: Proses seeding kurikulum selesai.');
    await prisma.$disconnect();
  }
};

seedMataKuliah()
  .then(() => {
    console.log('✅ Seeding kurikulum selesai.');
  })
  .catch((error) => {
    console.error('❌ Terjadi kesalahan saat seeding kurikulum:', error);
  })
  .finally(() => {
    prisma.$disconnect();
  });
