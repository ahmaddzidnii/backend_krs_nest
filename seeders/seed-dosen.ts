import { JenisDosen, Prisma, PrismaClient } from '@prisma/client';
import dosenData from './data/gabungan_dosen.json';

export const seedDosen = async (prisma: PrismaClient) => {
  console.log('🚀 START: Seeding data dosen');

  const userIds = await prisma.user.findMany({
    where: {
      username: { in: dosenData.data.map((d) => String(d.nip)) },
    },
    select: { id_user: true, username: true },
  });

  const prodiIds = await prisma.programStudi.findMany({
    where: {
      kode_prodi: { in: dosenData.data.map((d) => String(d.kode_prodi)) },
    },
    select: { id_prodi: true, kode_prodi: true },
  });

  const getIdJenisDosen = (nama: string): JenisDosen => {
    if (!nama) throw new Error('Nama jenis dosen tidak boleh kosong');

    switch (nama) {
      case 'Dosen Tetap PNS':
        return JenisDosen.DOSEN_TETAP_PNS;
      case 'Dosen Tetap Bukan PNS':
        return JenisDosen.DOSEN_TETAP_BUKAN_PNS;
      case 'Dosen Luar Biasa':
      default:
        return JenisDosen.DOSEN_LUAR_BIASA;
    }
  };

  const dosenToCreate = dosenData.data.reduce(
    (acc: Prisma.DosenCreateManyInput[], d) => {
      const user = userIds.find((u) => u.username === String(d.nip));
      const prodi = prodiIds.find((p) => p.kode_prodi === String(d.kode_prodi));

      if (user && prodi) {
        acc.push({
          nip: String(d.nip),
          id_user: user.id_user,
          nama: String(d.nama_dosen),
          id_prodi: prodi.id_prodi,
          aktif_mengajar: d.aktif_mengajar,
          jenis_dosen: getIdJenisDosen(d.jenis_dosen),
        });
      } else {
        console.warn(
          `⚠️  Data relasi untuk NIP "${d.nip}" tidak lengkap. Seeding untuk dosen ini dilewati.`,
        );
      }
      return acc;
    },
    [],
  );

  if (dosenToCreate.length === 0) {
    console.log('ℹ️ Tidak ada data dosen baru untuk di-seed.');
    return;
  }

  await prisma.dosen.createMany({
    data: dosenToCreate,
    skipDuplicates: true,
  });

  console.log(
    `✅ SUCCESS: Seeding ${dosenToCreate.length} data dosen selesai.`,
  );
};
