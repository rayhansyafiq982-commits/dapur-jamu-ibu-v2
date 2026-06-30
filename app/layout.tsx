import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dapur Jamu Ibu — Sistem Absensi',
  description: 'Sistem absensi dan manajemen kinerja karyawan Dapur Jamu Ibu',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
