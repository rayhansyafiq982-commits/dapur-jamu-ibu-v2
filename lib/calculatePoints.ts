/**
 * Menghitung poin kehadiran berdasarkan waktu masuk.
 * - Batas normal: 08:00 → 0 poin
 * - Tiap 1 menit lebih awal dari 08:00 = +1 poin
 * - Maksimal dihitung mulai 07:00 = +60 poin
 * - Datang 08:00 atau lebih lambat = 0 poin
 */
export function calculateAttendancePoints(jamMasuk: Date): number {
  const hours = jamMasuk.getHours()
  const minutes = jamMasuk.getMinutes()
  const totalMinutes = hours * 60 + minutes
  const BATAS_NORMAL = 8 * 60        // 480 menit (08:00)
  const BATAS_AWAL = 7 * 60          // 420 menit (07:00)

  if (totalMinutes >= BATAS_NORMAL) return 0

  const menitLebihAwal = BATAS_NORMAL - totalMinutes
  return Math.min(menitLebihAwal, BATAS_NORMAL - BATAS_AWAL) // max 60
}
