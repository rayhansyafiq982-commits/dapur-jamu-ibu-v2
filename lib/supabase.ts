import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type Profile = {
  id: string
  full_name: string
  role: 'super_admin' | 'karyawan'
  divisi: 'Produksi' | 'Admin' | null
  avatar_url: string | null
  is_active: boolean
}

export type Attendance = {
  id: string
  user_id: string
  tanggal: string
  jam_masuk: string | null
  jam_pulang: string | null
  poin: number
  status: 'hadir' | 'sakit' | 'izin' | 'alpha'
  keterangan_sakit: string | null
  surat_dokter_url: string | null
  foto_url: string | null
}

export type DailyTask = {
  id: string
  divisi: 'Produksi' | 'Admin'
  nama_tugas: string
  deskripsi: string
  icon: string
  urutan: number
}

export type DailyPlanning = {
  id: string
  attendance_id: string
  user_id: string
  tanggal: string
  task_id: string
  is_planned: boolean
  is_completed: boolean
  catatan_planning: string | null
  catatan_aktual: string | null
}

export type Pica = {
  id: string
  planning_id: string
  user_id: string
  tanggal: string
  identifikasi_masalah: string
  akar_penyebab: string
  rencana_perbaikan: string
  target_selesai: string | null
  status: 'open' | 'in_progress' | 'closed'
}
