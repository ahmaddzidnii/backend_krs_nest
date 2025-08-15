/**
 * Konversi string "HH:mm" ke menit dari tengah malam
 * @param timeStr format "HH:mm" (24 jam)
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Konversi menit dari tengah malam ke string "HH:mm"
 * @param totalMinutes jumlah menit dari 00:00
 */
export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Hitung durasi antara dua waktu dalam menit
 * @param startMinutes menit mulai
 * @param endMinutes menit selesai
 */
export function durationMinutes(
  startMinutes: number,
  endMinutes: number,
): number {
  return endMinutes - startMinutes;
}

/**
 * Cek apakah waktu sekarang (atau waktu custom) berada di antara jam mulai–selesai
 * @param startMinutes menit mulai
 * @param endMinutes menit selesai
 * @param currentMinutes waktu sekarang dalam menit (default: waktu sekarang lokal)
 */
export function isTimeInRange(
  startMinutes: number,
  endMinutes: number,
  currentMinutes: number = new Date().getHours() * 60 + new Date().getMinutes(),
): boolean {
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Cek apakah dua jadwal bertabrakan
 * @param startA menit mulai jadwal A
 * @param endA menit selesai jadwal A
 * @param startB menit mulai jadwal B
 * @param endB menit selesai jadwal B
 */
export function isTimeConflict(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}
