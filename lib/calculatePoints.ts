/**
 * Menghitung poin kehadiran berdasarkan waktu masuk (WITA / UTC+8).
 * - Batas normal: 08:00 → 0 poin
 * - Tiap 1 menit lebih awal dari 08:00 = +1 poin
 * - Maksimal dihitung mulai 07:00 = +60 poin
 * - Datang 08:00 atau lebih lambat = 0 poin
 */
export function calculateAttendancePoints(jamMasuk: Date): number {
  // Konversi ke WITA (Asia/Makassar, UTC+8) secara eksplisit
  const witaTimeStr = jamMasuk.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar',
    hour12: false,
  })
  
  const [hoursStr, minutesStr] = witaTimeStr.split('.')
  const hours = parseInt(hoursStr, 10)
  const minutes = parseInt(minutesStr, 10)
  
  const totalMinutes = hours * 60 + minutes
  const BATAS_NORMAL = 8 * 60   // 480 menit (08:00 WITA)
  const BATAS_AWAL = 7 * 60     // 420 menit (07:00 WITA)

  if (totalMinutes >= BATAS_NORMAL) return 0

  const menitLebihAwal = BATAS_NORMAL - totalMinutes
  return Math.min(menitLebihAwal, BATAS_NORMAL - BATAS_AWAL) // max 60
}
