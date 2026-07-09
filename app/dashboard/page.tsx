'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Profile, Attendance } from '@/lib/supabase'
import CheckIn from '@/components/CheckIn'
import DailyPlanning from '@/components/DailyPlanning'
import AdminDashboard from '@/components/AdminDashboard'
import ProfileScreen from '@/components/ProfileScreen'
import JobdeskScreen from '@/components/JobdeskScreen'
import ManageUsers from '@/components/ManageUsers'

const PC = {
  primary: '#1B5E3A', primaryDark: '#0D3322', accent: '#4CAF6D',
  surface: '#F4FAF6', surfaceAlt: '#E5F0E8', text: '#1A2E22',
  textMuted: '#5C7868', border: '#D5E5DA', white: '#FFFFFF',
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<Profile | null>(null)
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [activeTab, setActiveTab] = useState('absensi')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (!profile) { router.push('/'); return }
      setUser(profile)

      if (profile.role !== 'super_admin') {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
        const { data: att } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('tanggal', today)
          .single()
        setAttendance(att || null)
      } else {
        // Admin default ke tab dashboard
        setActiveTab('dashboard')
      }

      setLoading(false)
    }
    init()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PC.surface }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/logo.jpg" alt="logo" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 12 }} />
        <div style={{ color: PC.textMuted, fontSize: 14 }}>Memuat...</div>
      </div>
    </div>
  )

  if (!user) return null

  const isAdmin = user.role === 'super_admin'

  const karyawanTabs = [
    { key: 'absensi', icon: '📍', label: 'Absensi' },
    { key: 'planning', icon: '📋', label: 'Planning' },
    { key: 'jobdesc', icon: '📖', label: 'Jobdesc' },
    { key: 'poin', icon: '⭐', label: 'Poin' },
    { key: 'profil', icon: '👤', label: 'Profil' },
  ]

  const adminTabs = [
    { key: 'dashboard', icon: '📊', label: 'Dashboard' },
    { key: 'kelola', icon: '👥', label: 'Kelola' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: PC.surface, display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: PC.white, borderBottom: `1px solid ${PC.border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.jpg" alt="logo" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: PC.primary, lineHeight: 1 }}>Dapur Jamu Ibu</div>
            <div style={{ fontSize: 10, color: PC.textMuted }}>
              {user.full_name} {isAdmin ? '— Owner' : `— ${user.divisi}`}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} style={{ background: PC.surfaceAlt, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: PC.textMuted, cursor: 'pointer', fontWeight: 600 }}>
          Keluar
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        {/* Admin tabs content */}
        {isAdmin && activeTab === 'dashboard' && <AdminDashboard user={user} />}
        {isAdmin && activeTab === 'kelola' && <ManageUsers user={user} />}

        {/* Karyawan tabs content */}
        {!isAdmin && activeTab === 'absensi' && <CheckIn user={user} attendance={attendance} onAttendanceUpdate={setAttendance} />}
        {!isAdmin && activeTab === 'planning' && <DailyPlanning user={user} attendance={attendance} />}
        {!isAdmin && activeTab === 'jobdesc' && <JobdeskScreen user={user} />}
        {!isAdmin && activeTab === 'poin' && <PoinScreen user={user} />}
        {!isAdmin && activeTab === 'profil' && <ProfileScreen user={user} onUserUpdate={setUser} />}
      </div>

      {/* Bottom Nav — Admin */}
      {isAdmin && (
        <div style={{ background: PC.white, borderTop: `1px solid ${PC.border}`, display: 'flex', padding: '8px 0 16px' }}>
          {adminTabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}>
              <span style={{ fontSize: 20, filter: activeTab === t.key ? 'none' : 'grayscale(1) opacity(0.45)' }}>{t.icon}</span>
              <span style={{ fontSize: 10, fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? PC.primary : PC.textMuted }}>{t.label}</span>
              {activeTab === t.key && <div style={{ width: 4, height: 4, borderRadius: '50%', background: PC.primary }} />}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Nav — Karyawan */}
      {!isAdmin && (
        <div style={{ background: PC.white, borderTop: `1px solid ${PC.border}`, display: 'flex', padding: '8px 0 16px' }}>
          {karyawanTabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}>
              <span style={{ fontSize: 20, filter: activeTab === t.key ? 'none' : 'grayscale(1) opacity(0.45)' }}>{t.icon}</span>
              <span style={{ fontSize: 10, fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? PC.primary : PC.textMuted }}>{t.label}</span>
              {activeTab === t.key && <div style={{ width: 4, height: 4, borderRadius: '50%', background: PC.primary }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PoinScreen({ user }: { user: Profile }) {
  const [history, setHistory] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [monthlyData, setMonthlyData] = useState<{ label: string; poin: number }[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'hadir')
        .order('tanggal', { ascending: false })
        .limit(30)
      if (data) {
        setHistory(data)
        setTotal(data.reduce((s: number, d: any) => s + (d.poin || 0), 0))
        const sorted = data.slice().reverse().slice(-14)
        setMonthlyData(sorted.map((d: any) => ({
          label: new Date(d.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          poin: d.poin || 0,
        })))
      }
    }
    load()
  }, [user.id])

  const maxPoin = Math.max(...monthlyData.map(d => d.poin), 60)

  const exportCSV = () => {
    const header = 'Tanggal,Jam Masuk,Jam Pulang,Poin\n'
    const rows = history.map(att => {
      const tgl = new Date(att.tanggal).toLocaleDateString('id-ID')
      const jm = att.jam_masuk ? new Date(att.jam_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }) : '-'
      const jp = att.jam_pulang ? new Date(att.jam_pulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }) : '-'
      return `${tgl},${jm},${jp},${att.poin}`
    }).join('\n')
    const csv = header + rows
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `riwayat-poin-${user.full_name}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: `linear-gradient(135deg, ${PC.primary}, ${PC.primaryDark})`, borderRadius: 16, padding: '28px 20px', textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>Total Poin Bulan Ini</div>
        <div style={{ color: '#fff', fontSize: 54, fontWeight: 900, lineHeight: 1 }}>{total}</div>
        <div style={{ marginTop: 14, display: 'inline-block', background: 'rgba(255,255,255,0.15)', padding: '6px 16px', borderRadius: 20 }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
            {total >= 100 ? '🥇 Excellent' : total >= 60 ? '🥈 Good' : '🥉 Keep it up!'}
          </span>
        </div>
      </div>

      {monthlyData.length > 0 && (
        <div style={{ background: PC.white, borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(27,94,58,0.08)', border: `1px solid ${PC.border}` }}>
          <div style={{ color: PC.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>📊 Grafik Poin (14 Hari Terakhir)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
            {monthlyData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', maxWidth: 18,
                  height: `${Math.max((d.poin / maxPoin) * 90, 3)}px`,
                  background: d.poin >= 30 ? PC.primary : d.poin > 0 ? PC.accent : '#E0E0E0',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s',
                }} title={`${d.label}: ${d.poin} poin`} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {monthlyData.map((d, i) => (
              <div key={i} style={{ flex: 1, fontSize: 8, color: PC.textMuted, textAlign: 'center', writingMode: 'vertical-rl', textOrientation: 'mixed', height: 30 }}>
                {i % 2 === 0 ? d.label : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: PC.white, borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(27,94,58,0.08)', border: `1px solid ${PC.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ color: PC.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>Riwayat Kehadiran</div>
          <button onClick={exportCSV} style={{ background: PC.surfaceAlt, border: `1px solid ${PC.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 11, color: PC.primary, fontWeight: 700, cursor: 'pointer' }}>
            📥 Export CSV
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.length === 0
            ? <div style={{ textAlign: 'center', color: PC.textMuted, padding: '16px 0' }}>Belum ada riwayat kehadiran</div>
            : history.map((att, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: PC.surface, border: `1px solid ${PC.border}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {new Date(att.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                  <div style={{ fontSize: 12, color: PC.textMuted, marginTop: 2 }}>
                    Masuk {att.jam_masuk ? new Date(att.jam_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }) : '–'} · Pulang {att.jam_pulang ? new Date(att.jam_pulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }) : '–'}
                  </div>
                </div>
                <div style={{ padding: '4px 12px', borderRadius: 20, fontWeight: 800, fontSize: 14, background: att.poin >= 30 ? '#E5F5EA' : att.poin > 0 ? PC.surfaceAlt : '#F5F5F5', color: att.poin >= 30 ? PC.primary : att.poin > 0 ? PC.accent : '#999' }}>
                  +{att.poin}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
