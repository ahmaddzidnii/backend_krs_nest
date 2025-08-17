import { PrismaClient } from '@prisma/client';

export async function seedFakultas(prisma: PrismaClient) {
  await prisma.fakultas.createMany({
    data: [
      {
        kode_fakultas: 'F01',
        nama: 'ADAB DAN ILMU BUDAYA',
        singkatan: 'FADIB',
      },
      {
        kode_fakultas: 'F02',
        nama: 'DAKWAH DAN KOMUNIKASI',
        singkatan: 'FD',
      },
      {
        kode_fakultas: 'F03',
        nama: 'EKONOMI DAN BISNIS ISLAM',
        singkatan: 'FEBI',
      },
      {
        kode_fakultas: 'F04',
        nama: 'ILMU SOSIAL DAN HUMANIORA',
        singkatan: 'FISHUM',
      },
      {
        kode_fakultas: 'F05',
        nama: 'ILMU TARBIYAH DAN KEGURUAN',
        singkatan: 'TARBIYAH',
      },
      {
        kode_fakultas: 'F06',
        nama: 'SAINS DAN TEKNOLOGI',
        singkatan: 'FST',
      },
      {
        kode_fakultas: 'F07',
        nama: 'SYARIAH DAN HUKUM',
        singkatan: 'FSH',
      },
      {
        kode_fakultas: 'F08',
        nama: 'USHULUDDIN DAN PEMIKIRAN ISLAM',
        singkatan: 'FUPI',
      },
      {
        kode_fakultas: 'F09',
        nama: 'PASCASARJANA',
        singkatan: 'PASCA',
      },
      {
        kode_fakultas: 'F10',
        nama: 'Kedokteran dan Ilmu Kesehatan',
        singkatan: 'FK',
      },
    ],
    skipDuplicates: true, // biar aman kalau sudah pernah diinsert
  });

  console.log('✅ Fakultas seeded successfully');
}

// kalau dijalankan langsung via ts-node / node
if (require.main === module) {
  const prisma = new PrismaClient();
  seedFakultas(prisma)
    .catch((err) => console.error('❌ Error seeding fakultas:', err))
    .finally(() => prisma.$disconnect());
}
