import { PrismaClient } from '@prisma/client';
import matakuliahJson from '../seeders/data/matakuliah_master.json';

export const seedMataKuliah = async (prisma: PrismaClient) => {
  console.log('🚀 START: Seeding data Mata Kuliah...');

  try {
    const matakuliahs = matakuliahJson.map((m) => ({
      kode_matkul: m.kode_matkul,
      nama: m.nama_matkul,
      sks: m.sks,
    }));

    const result = await prisma.mataKuliah.createMany({
      data: matakuliahs,
      skipDuplicates: true,
    });

    console.log(
      `✅ SUCCESS: Berhasil menambahkan ${result.count} mata kuliah baru.`,
    );
  } catch (error) {
    console.error(
      '❌ ERROR: Terjadi kegagalan saat seeding mata kuliah.',
      error,
    );
  } finally {
    console.log('🏁 END: Proses seeding Mata Kuliah selesai.');
  }
};
