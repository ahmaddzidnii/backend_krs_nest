import { JenisDosen, Prisma, PrismaClient } from '../generated/prisma';
import dosenData from '../seeders/data/gabungan_dosen.json';
import dotenv from 'dotenv';

import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const seedUsersDosen = async () => {
  dotenv.config();
  const { id_role } = await prisma.role.findFirst({
    where: {
      nama_role: 'DOSEN',
    },
    select: {
      id_role: true,
    },
  });

  console.log('perpare data..');
  const usersToCreate = dosenData.data.map((d) => ({
    username: String(d.nip),
    password: bcrypt.hashSync(String(d.default_password), 10),
    id_role,
  }));

  console.log('🚀 START: Seeding data');

  await prisma.user.createMany({
    data: usersToCreate,
    skipDuplicates: true,
  });
};

export const seedDosen = async () => {
  console.log('🚀 START: Seeding data dosen');

  const userIds = await prisma.user.findMany({
    where: {
      username: {
        in: dosenData.data.map((d) => String(d.nip)),
      },
    },
    select: {
      id_user: true,
      username: true,
    },
  });
  const prodiIds = await prisma.programStudi.findMany({
    where: {
      kode_prodi: {
        in: dosenData.data.map((d) => String(d.kode_prodi)),
      },
    },
    select: {
      id_prodi: true,
      kode_prodi: true,
    },
  });

  const getIdJenisDosen = (nama: string) => {
    if (!nama) {
      throw new Error('Nama jenis dosen tidak boleh kosong');
    }

    if (nama === 'Dosen Tetap PNS') {
      return JenisDosen.DOSEN_TETAP_PNS;
    } else if (nama == 'Dosen Luar Biasa') {
      return JenisDosen.DOSEN_LUAR_BIASA;
    } else if (nama === 'Dosen Tetap Bukan PNS') {
      return JenisDosen.DOSEN_TETAP_BUKAN_PNS;
    } else {
      return JenisDosen.DOSEN_LUAR_BIASA;
    }
  };

  const dosenToCreate = dosenData.data.reduce(
    // 2. Beri tipe pada parameter 'accumulator'
    (accumulator: Prisma.DosenCreateManyInput[], d) => {
      const user = userIds.find((u) => u.username === String(d.nip));
      const prodi = prodiIds.find((p) => p.kode_prodi === String(d.kode_prodi));

      if (user && prodi) {
        // Sekarang TypeScript tahu bahwa objek ini cocok dengan tipe accumulator
        accumulator.push({
          nip: String(d.nip),
          id_user: user.id_user,
          nama: String(d.nama_dosen),
          id_prodi: prodi.id_prodi,
          aktif_mengajar: d.aktif_mengajar,
          jenis_dosen: getIdJenisDosen(d.jenis_dosen),
        });
      } else {
        console.warn(
          `⚠️  Data relasi untuk NIP "${d.nip}" tidak lengkap. Seeding untuk mhs ini dilewati.`,
        );
      }
      return accumulator;
    },
    [],
  );

  // Cek jika tidak ada data valid untuk dibuat
  if (dosenToCreate.length === 0) {
    console.log('✅ Tidak ada data mahasiswa baru untuk di-seed.');
    return;
  }

  await prisma.dosen.createMany({
    data: dosenToCreate,
    skipDuplicates: true,
  });

  console.log(`✅ SUCCESS: Seeding ${dosenToCreate.length} data mhs selesai.`);
};

// seedUsersDosen()
//   .then(() => {
//     console.log('✅ Seeding completed successfully');
//   })
//   .catch((error) => {
//     console.error('❌ Error during seeding:', error);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

seedDosen()
  .then(() => {
    console.log('✅ Seeding completed successfully');
  })
  .catch((error) => {
    console.error('❌ Error during seeding:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
