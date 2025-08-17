import { PrismaClient } from '@prisma/client';

export async function seedRole(prisma: PrismaClient) {
  console.log('🚀 START: Seeding roles');

  await prisma.role.createMany({
    data: [{ nama_role: 'MAHASISWA' }, { nama_role: 'DOSEN' }],
    skipDuplicates: true,
  });

  console.log('✅ DONE: Seeding roles');
}
