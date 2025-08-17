import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

import dataMhs from '../seeders/data/angkatan-2023.json';
import dosenData from '../seeders/data/gabungan_dosen.json';

export const seedUsersMahasiswa = async (prisma: PrismaClient) => {
  console.log('🚀 START: Seeding user mahasiswa');

  const role = await prisma.role.findFirst({
    where: { nama_role: 'MAHASISWA' },
    select: { id_role: true },
  });

  if (!role) {
    console.error('❌ Role MAHASISWA tidak ditemukan');
    return;
  }

  const userPromises = dataMhs.map(async (mhs) => {
    const hashedPassword = await bcrypt.hash(String(mhs.PASSWORD), 10);
    return {
      username: String(mhs.NIM),
      password: hashedPassword,
      id_role: role.id_role,
    };
  });

  const usersToCreate = await Promise.all(userPromises);
  await prisma.user.createMany({
    data: usersToCreate,
    skipDuplicates: true,
  });

  console.log('✅ DONE: Seeding user mahasiswa');
};

export const seedUsersDosen = async (prisma: PrismaClient) => {
  console.log('🚀 START: Seeding user dosen');

  const role = await prisma.role.findFirst({
    where: { nama_role: 'DOSEN' },
    select: { id_role: true },
  });

  if (!role) {
    console.error('❌ Role DOSEN tidak ditemukan');
    return;
  }

  const userDosen = dosenData.data.map(async (d) => ({
    username: String(d.nip),
    password: await bcrypt.hash(String(d.default_password), 10),
    id_role: role.id_role,
  }));

  const usersToCreate = await Promise.all(userDosen);

  await prisma.user.createMany({
    data: usersToCreate,
    skipDuplicates: true,
  });

  console.log('✅ DONE: Seeding user dosen');
};
