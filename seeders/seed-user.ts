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

  const usersToCreate = dataMhs.map((mhs) => ({
    username: String(mhs.NIM),
    password: bcrypt.hashSync(String(mhs.PASSWORD), 10),
    id_role: role.id_role,
  }));

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

  const usersToCreate = dosenData.data.map((d) => ({
    username: String(d.nip),
    password: bcrypt.hashSync(String(d.default_password), 10),
    id_role: role.id_role,
  }));

  await prisma.user.createMany({
    data: usersToCreate,
    skipDuplicates: true,
  });

  console.log('✅ DONE: Seeding user dosen');
};
