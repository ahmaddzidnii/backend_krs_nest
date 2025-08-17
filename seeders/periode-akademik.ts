import { Prisma, PrismaClient } from '@prisma/client';

type PeriodeAkademik = Prisma.PeriodeAkademikCreateManyInput[];

export async function seedPeriodeAkademik(prisma: PrismaClient) {
  const periodeAkademikData: PeriodeAkademik = [
    {
      tahun_akademik: '2025/2026',
      jenis_semester: 'GANJIL',
      is_active: true,
      tanggal_mulai_krs: new Date('2025-08-01'),
      tanggal_selesai_krs: new Date('2025-08-31'),
      jam_mulai_harian_krs: '2025-08-17T00:00:00Z',
      jam_selesai_harian_krs: '2025-08-17T23:59:59Z',
    },
  ];

  await prisma.periodeAkademik.createMany({
    data: periodeAkademikData,
    skipDuplicates: true,
  });
}
