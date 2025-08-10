import { HttpException, Injectable, NestMiddleware } from '@nestjs/common';

import { PrismaService } from './prisma.service';

@Injectable()
export class KrsScheduleMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: any, res: any, next: () => void) {
    const nowUtc = new Date();

    // 1. Ambil periode akademik yang aktif dari database
    const periode = await this.prisma.periodeAkademik.findFirst({
      where: { is_active: true },
    });

    if (!periode) {
      throw new HttpException('There are no active academic periods.', 403);
    }

    // 2. Cek rentang tanggal KRS secara keseluruhan (menggunakan UTC)
    // Ini memastikan kita berada dalam periode pengisian KRS yang benar (misal: 1 - 15 Agustus)
    const tglMulai = new Date(periode.tanggal_mulai_krs);
    const tglSelesai = new Date(periode.tanggal_selesai_krs);

    // Atur waktu pada tanggal selesai ke akhir hari agar seluruh hari terhitung
    tglSelesai.setUTCHours(23, 59, 59, 999);

    const isWithinDateRange = nowUtc >= tglMulai && nowUtc <= tglSelesai;

    if (!isWithinDateRange) {
      throw new HttpException(
        'The KRS registration schedule has not yet opened or has already closed.',
        403,
      );
    }

    // 3. Cek rentang jam harian KRS (misal: setiap hari antara jam 08:00 - 15:00 WIB)
    // Logika ini hanya membandingkan komponen jam dan menit, terlepas dari tanggalnya.

    // Ambil jam dan menit dari database (diasumsikan tersimpan sebagai UTC)
    const jamMulaiKrs = new Date(periode.jam_mulai_harian_krs);
    const jamSelesaiKrs = new Date(periode.jam_selesai_harian_krs);

    // Konversi waktu mulai/selesai ke total menit sejak tengah malam
    const startTotalMinutes =
      jamMulaiKrs.getUTCHours() * 60 + jamMulaiKrs.getUTCMinutes();
    const endTotalMinutes =
      jamSelesaiKrs.getUTCHours() * 60 + jamSelesaiKrs.getUTCMinutes();

    // Konversi waktu saat ini ke total menit sejak tengah malam dalam zona waktu WIB (UTC+7)
    const currentWibHour = (nowUtc.getUTCHours() + 7) % 24;
    const currentTotalMinutes = currentWibHour * 60 + nowUtc.getUTCMinutes();

    const isWithinTimeRange =
      currentTotalMinutes < startTotalMinutes ||
      currentTotalMinutes > endTotalMinutes;

    if (isWithinTimeRange) {
      const formatTime = (date: Date) => {
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      };

      throw new HttpException(
        `KRS can only be accessed between ${formatTime(
          jamMulaiKrs,
        )} - ${formatTime(jamSelesaiKrs)} WIB.`,
        403,
      );
    }
    next();
  }
}
