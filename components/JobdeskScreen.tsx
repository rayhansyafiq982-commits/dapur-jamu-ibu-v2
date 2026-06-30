'use client'

import { useState, useEffect } from 'react'
import { supabase, Profile } from '@/lib/supabase'

const C = {
  primary: '#1B5E3A', primaryDark: '#0D3322', accent: '#4CAF6D', accentLight: '#E5F5EA',
  surface: '#F4FAF6', surfaceAlt: '#E5F0E8', text: '#1A2E22', textMuted: '#5C7868',
  border: '#D5E5DA', white: '#FFFFFF',
}

// Deskripsi lengkap per task — detail tambahan di luar yang tersimpan di DB
const DETAIL_MAP: Record<string, string[]> = {
  'Kasir & Keuangan': [
    'Mencatat setiap transaksi penjualan (tunai/non-tunai) secara real-time',
    'Melakukan rekonsiliasi kas di akhir shift, memastikan saldo fisik sesuai catatan',
    'Menyimpan struk dan bukti transaksi dengan rapi',
    'Melaporkan selisih kas (jika ada) kepada owner segera',
  ],
  'Pembuatan Konten': [
    'Mengambil foto dan video produk dengan pencahayaan yang baik',
    'Melakukan multi-clip cutting untuk video promosi',
    'Menambahkan twibbon overlay sesuai tema yang berlaku',
    'Chroma key color removal untuk background bersih',
    'Audio leveling agar suara konsisten di semua video',
    'Menggunakan AI voiceover untuk narasi produk',
  ],
  'Pengaturan Ekspedisi': [
    'Memproses pesanan masuk dari semua platform penjualan',
    'Mencetak resi pengiriman dengan data yang akurat',
    'Koordinasi dengan kurir untuk penjemputan paket tepat waktu',
    'Update status pesanan ke pelanggan',
  ],
  'Kebersihan Area Kerja': [
    'Menjaga kebersihan meja kasir dan area front office',
    'Merapikan dokumen dan alat tulis di akhir shift',
    'Memastikan area kerja siap digunakan untuk shift berikutnya',
  ],
  'Persiapan & Produksi Jamu': [
    'Memilih bahan baku segar dan berkualitas sesuai standar',
    'Mengikuti SOP produksi jamu metode konvensional (bukan organik)',
    'Mengukur takaran bahan secara presisi sesuai resep',
    'Mencatat batch produksi untuk keperluan tracking',
  ],
  'Quality Control (QC)': [
    'Memastikan konsistensi rasa di setiap batch produksi',
    'Sterilisasi botol kemasan sebelum pengisian',
    'Memeriksa keamanan segel kemasan sebelum didistribusikan',
    'Menolak produk yang tidak memenuhi standar kualitas',
  ],
  'Kebersihan Area Produksi': [
    'Mensterilkan seluruh peralatan masak setelah digunakan',
    'Mengelola limbah sisa produksi sesuai prosedur kebersihan',
    'Memastikan area produksi bebas dari kontaminasi',
  ],
}

export default function JobdeskScreen({ user }: { user: Profile }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [activeDivisi, setActiveDivisi] = useState<'Produksi' | 'Admin'>(user.divisi || 'Produksi')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = user.role === 'super_admin'

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('daily_tasks').select('*').eq('is_active', true).order('divisi').order('urutan')
      setTasks(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filteredTasks = tasks.filter(t => t.divisi === activeDivisi)

  const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{ background: C.white, borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(27,94,58,0.08)', border: `1px solid ${C.border}`, ...style }}>
      {children}
    </div>
  )

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: C.textMuted }}>⏳ Memuat jobdesc...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, borderRadius: 16, padding: '16px 20px' }}>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>Panduan Kerja</div>
        <div style={{ color: 'white', fontWeight: 800, fontSize: 17, marginTop: 2 }}>Deskripsi Pekerjaan</div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4 }}>Jobdesc lengkap per divisi di Dapur Jamu Ibu</div>
      </div>

      {/* Divisi switcher — admin can view both, karyawan locked to their own */}
      {isAdmin && (
        <div style={{ display: 'flex', background: C.surfaceAlt, borderRadius: 12, padding: 4, gap: 4 }}>
          {(['Produksi', 'Admin'] as const).map(d => (
            <button key={d} onClick={() => setActiveDivisi(d)}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', background: activeDivisi === d ? C.white : 'transparent', color: activeDivisi === d ? C.primary : C.textMuted, boxShadow: activeDivisi === d ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
              {d === 'Produksi' ? '🫙 Produksi' : '📋 Admin'}
            </button>
          ))}
        </div>
      )}

      {!isAdmin && (
        <Card style={{ background: C.accentLight, border: `2px solid ${C.accent}`, padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>
            {activeDivisi === 'Produksi' ? '🫙' : '📋'} Divisi {activeDivisi}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Ini adalah jobdesc resmi divisimu</div>
        </Card>
      )}

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredTasks.map((task, i) => {
          const detail = DETAIL_MAP[task.nama_tugas] || []
          const isOpen = expanded === task.id
          return (
            <Card key={task.id} style={{ padding: 0, overflow: 'hidden' }}>
              <div onClick={() => setExpanded(isOpen ? null : task.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', cursor: 'pointer' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: C.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {task.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{i + 1}. {task.nama_tugas}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{task.deskripsi}</div>
                </div>
                <span style={{ fontSize: 14, color: C.textMuted }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {isOpen && detail.length > 0 && (
                <div style={{ borderTop: `1px dashed ${C.border}`, padding: '14px 16px 16px 72px', background: C.surface }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Rincian Tugas
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {detail.map((d, di) => (
                      <li key={di} style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Card style={{ background: C.surfaceAlt, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
          💡 Jobdesc ini menjadi acuan saat mengisi <strong>Daily Planning</strong>. Tap salah satu tugas untuk lihat rincian lengkapnya.
        </div>
      </Card>
    </div>
  )
}
