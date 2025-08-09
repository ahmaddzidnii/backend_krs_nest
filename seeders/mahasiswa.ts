import dataMhs from '../seeders/data/angkatan-2023.json';

import { Prisma, PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const seedUsers = async () => {
  console.log('🚀 START: Seeding data user mahasiswa');

  const { id_role } = await prisma.role.findFirst({
    where: {
      nama_role: 'MAHASISWA',
    },
    select: {
      id_role: true,
    },
  });

  const usersToCreate = dataMhs.map((mhs) => ({
    username: String(mhs.NIM),
    password: bcrypt.hashSync(String(mhs.PASSWORD), 10),
    id_role,
  }));

  await prisma.user.createMany({
    data: usersToCreate,
    skipDuplicates: true,
  });
};

export const seedMahasiswa = async () => {
  console.log('🚀 START: Seeding data mhs');

  // ... (kode untuk mengambil userIds, prodiIds, dpaIds, kurikulumIds tetap sama) ...
  const userIds = await prisma.user.findMany({
    where: {
      username: {
        in: dataMhs.map((mhs) => String(mhs.NIM)),
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
        in: dataMhs.map((mhs) => String(mhs.KODE_PRODI)),
      },
    },
    select: {
      id_prodi: true,
      kode_prodi: true,
    },
  });
  const dpaIds = await prisma.dosen.findMany({
    where: {
      nip: {
        in: dataMhs.map((mhs) => String(mhs.NIP_DPA)),
      },
    },
    select: {
      id_dosen: true,
      nip: true,
    },
  });
  const kurikulumIds = await prisma.kurikulum.findMany({
    where: {
      kode_kurikulum: {
        in: dataMhs.map((mhs) => String(mhs.KODE_KURIKULUM)),
      },
    },
    select: {
      id_kurikulum: true,
      kode_kurikulum: true,
    },
  });

  const mahasiswaToCreate = dataMhs.reduce(
    // 2. Beri tipe pada parameter 'accumulator'
    (accumulator: Prisma.MahasiswaCreateManyInput[], mhs) => {
      const user = userIds.find((u) => u.username === String(mhs.NIM));
      const prodi = prodiIds.find(
        (p) => p.kode_prodi === String(mhs.KODE_PRODI),
      );
      const dpa = dpaIds.find((d) => d.nip === String(mhs.NIP_DPA));
      const kurikulum = kurikulumIds.find(
        (k) => k.kode_kurikulum === String(mhs.KODE_KURIKULUM),
      );

      if (user && prodi && dpa && kurikulum) {
        // Sekarang TypeScript tahu bahwa objek ini cocok dengan tipe accumulator
        accumulator.push({
          id_user: user.id_user,
          id_prodi: prodi.id_prodi,
          id_dpa: dpa.id_dosen,
          id_kurikulum: kurikulum.id_kurikulum,
          nim: String(mhs.NIM),
          nama: mhs.FORMATED_NAMA,
          ipk: 4.0,
          ips_lalu: 4.0,
          jatah_sks: 24,
          semester_berjalan: 5,
          sks_kumulatif: 88,
          status_mahasiswa: 'AKTIF',
          status_pembayaran: 'LUNAS',
        });
      } else {
        console.warn(
          `⚠️  Data relasi untuk NIM "${mhs.NIM}" tidak lengkap. Seeding untuk mhs ini dilewati.`,
        );
      }
      return accumulator;
    },
    [],
  );

  // Cek jika tidak ada data valid untuk dibuat
  if (mahasiswaToCreate.length === 0) {
    console.log('✅ Tidak ada data mahasiswa baru untuk di-seed.');
    return;
  }

  await prisma.mahasiswa.createMany({
    data: mahasiswaToCreate,
    skipDuplicates: true,
  });

  console.log(
    `✅ SUCCESS: Seeding ${mahasiswaToCreate.length} data mhs selesai.`,
  );
};

// seedUsers()
//   .then(() => {
//     console.log('✅ Seeding data mahasiswa selesai.');
//   })
//   .catch((error) => {
//     console.error('❌ Terjadi kesalahan saat seeding data mahasiswa:', error);
//   })
//   .finally(() => {
//     prisma.$disconnect();
//   });

seedMahasiswa()
  .then(() => {
    console.log('✅ Seeding mahasiswa selesai.');
  })
  .catch((error) => {
    console.error('❌ Terjadi kesalahan saat seeding mahasiswa:', error);
  })
  .finally(() => {
    prisma.$disconnect();
  });
