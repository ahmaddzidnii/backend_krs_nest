/**
 *
 * DEPENDENSI GRAPH PADA SEEDER APLIKASI INI
 *
 * FAKULTAS -> TIDAK TERGANTUNG PADA DEPENDENSI LAIN
 * PRODI -> TERGANTUNG PADA FAKULTAS
 * KURIKULUM -> TERGANTUNG PADA PRODI
 * MATAKULIAH -> TIDAK TERGANTUNG PADA DEPENDENSI LAIN
 * DETAIL KURIKULUM -> TERGANTUNG PADA KURIKULUM DAN MATAKULIAH
 *
 * PERIODE -> TIDAK TERGANTUNG PADA DEPENDENSI LAIN
 *
 *
 * ROLE -> TIDAK TERGANTUNG PADA DEPENDENSI LAIN
 * USER -> TERGANTUNG PADA ROLE
 * DOSEN -> TERGANTUNG PADA USER DAN PRODI
 * MAHASISWA -> TERGANTUNG PADA USER, PRODI, DPA, DAN KURIKULUM
 *
 */

import { PrismaClient } from '@prisma/client';

import { seedRole } from './role';
import { seedDosen } from './seed-dosen';
import { seedFakultas } from './fakultas';
import { seedProgramStudi } from './prodi';
import { seedKurikulum } from './kurikulum';
import { seedMahasiswa } from './mahasiswa';
import { seedMataKuliah } from './matakuliah';
import { seedDetailKurikulum } from './detail_kurikulum';
import { seedUsersDosen, seedUsersMahasiswa } from './seed-user';
import { prisma as prismaCLient } from './prisma';
import { seedPeriodeAkademik } from './periode-akademik';
import { seedKelasDitawarkan } from './kelas-ditawarkan';

const prisma = prismaCLient as PrismaClient;
async function main() {
  try {
    console.log('🚀 Memulai proses seeding...');

    // // --- TIER 1: Entitas tanpa dependensi ---
    // // Role, Fakultas, dan MataKuliah dapat dijalankan secara paralel.
    // console.log('Seeding entitas independen: Role, Fakultas, Mata Kuliah...');
    // await Promise.all([
    //   seedRole(prisma),
    //   seedFakultas(prisma),
    //   seedMataKuliah(prisma),
    //   seedPeriodeAkademik(prisma),
    // ]);
    // console.log('✅ Entitas independen berhasil di-seed.');

    // // --- TIER 2: Tergantung pada TIER 1 ---
    // // User bergantung pada Role.
    // // Program Studi bergantung pada Fakultas.
    // console.log('Seeding User dan Program Studi...');
    // await Promise.all([
    //   seedUsersMahasiswa(prisma),
    //   seedUsersDosen(prisma),
    //   seedProgramStudi(prisma),
    // ]);
    // console.log('✅ User dan Program Studi berhasil di-seed.');

    // // --- TIER 3: Tergantung pada TIER 2 ---
    // // Kurikulum bergantung pada Program Studi.
    // console.log('Seeding Kurikulum...');
    // await seedKurikulum(prisma);
    // console.log('✅ Kurikulum berhasil di-seed.');

    // // --- TIER 4: Tergantung pada TIER 2 & 3 ---
    // // Dosen bergantung pada User dan Program Studi.
    // // Detail Kurikulum bergantung pada Kurikulum dan Mata Kuliah.
    // console.log('Seeding Dosen dan Detail Kurikulum...');
    // await Promise.all([seedDosen(prisma), seedDetailKurikulum(prisma)]);
    // console.log('✅ Dosen dan Detail Kurikulum berhasil di-seed.');

    // // --- TIER 5: Entitas paling kompleks, tergantung pada TIER sebelumnya ---
    // // Mahasiswa bergantung pada User, Program Studi, Dosen (sebagai DPA), dan Kurikulum.
    // console.log('Seeding Mahasiswa...');
    // await seedMahasiswa(prisma);
    // console.log('✅ Mahasiswa berhasil di-seed.');

    // --- TIER 6: Kelas Ditawarkan bergantung pada Periode Akademik dan Mata Kuliah ---
    console.log('Seeding Kelas Ditawarkan...');
    await seedKelasDitawarkan(prisma);
    console.log('✅ Kelas Ditawarkan berhasil di-seed.');

    console.log('🎉 Proses seeding selesai dengan sukses!');
  } catch (error) {
    console.error('❌ Terjadi error saat seeding:', error);
    process.exit(1);
  } finally {
    console.log('🔌 Menutup koneksi Prisma...');
    await prisma.$disconnect();
    console.log('🔌 Koneksi Prisma berhasil ditutup.');
  }
}

main();
