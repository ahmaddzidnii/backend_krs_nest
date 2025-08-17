import { Prisma, PrismaClient } from '@prisma/client';
import dataMhs from '../seeders/data/angkatan-2023.json';

export const seedMahasiswa = async (prisma: PrismaClient) => {
  console.log('🚀 START: Seeding data Mahasiswa...');

  try {
    const userIds = await prisma.user.findMany({
      where: {
        username: {
          in: dataMhs.map((mhs) => String(mhs.NIM)),
        },
      },
      select: { id_user: true, username: true },
    });

    const prodiIds = await prisma.programStudi.findMany({
      where: {
        kode_prodi: {
          in: dataMhs.map((mhs) => String(mhs.KODE_PRODI)),
        },
      },
      select: { id_prodi: true, kode_prodi: true },
    });

    const dpaIds = await prisma.dosen.findMany({
      where: {
        nip: {
          in: dataMhs.map((mhs) => String(mhs.NIP_DPA)),
        },
      },
      select: { id_dosen: true, nip: true },
    });

    const kurikulumIds = await prisma.kurikulum.findMany({
      where: {
        kode_kurikulum: {
          in: dataMhs.map((mhs) => String(mhs.KODE_KURIKULUM)),
        },
      },
      select: { id_kurikulum: true, kode_kurikulum: true },
    });

    const mahasiswaToCreate = dataMhs.reduce(
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
            `⚠️  Data relasi untuk NIM "${mhs.NIM}" tidak lengkap. Seeding dilewati.`,
          );
        }
        return accumulator;
      },
      [],
    );

    if (mahasiswaToCreate.length === 0) {
      console.log('✅ Tidak ada data mahasiswa baru untuk di-seed.');
      return;
    }

    const result = await prisma.mahasiswa.createMany({
      data: mahasiswaToCreate,
      skipDuplicates: true,
    });

    console.log(`✅ SUCCESS: Seeding ${result.count} data Mahasiswa selesai.`);
  } catch (error) {
    console.error('❌ ERROR: Gagal seeding Mahasiswa.', error);
  } finally {
    console.log('🏁 END: Proses seeding Mahasiswa selesai.');
  }
};
