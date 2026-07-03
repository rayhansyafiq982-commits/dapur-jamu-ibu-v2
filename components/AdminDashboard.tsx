'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import JobdeskScreen from './JobdeskScreen'

const G = {
  primary: '#1B5E3A', primaryDark: '#0D3322', accent: '#4CAF6D', accentLight: '#E5F5EA',
  surface: '#F4FAF6', surfaceAlt: '#E5F0E8', text: '#1A2E22', textMuted: '#5C7868',
  border: '#D5E5DA', white: '#FFFFFF', alert: '#C0392B', alertLight: '#FDF0EE',
}

export default function AdminDashboard({ user }: { user: any }) {
  const [tab, setTab] = useState<'rekap' | 'aktivitas' | 'pica' | 'jobdesc'>('rekap')
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [karyawan, setKaryawan] = useState<any[]>([])
  const [rekap, setRekap] = useState<any[]>([])
  const [aktivitas, setAktivitas] = useState<any[]>([])
  const [picaList, setPicaList] = useState<any[]>([])
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'karyawan').eq('is_active', true)
      setKaryawan(profiles || [])

      const today = new Date()
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today); d.setDate(today.getDate() - i)
        return d.toISOString().split('T')[0]
      })

      const { data: attData } = await supabase.from('attendance').select('*, profiles(full_name, divisi)').in('tanggal', dates).order('tanggal', { ascending: false })
      setRekap(attData || [])

      const { data: picaData } = await supabase.from('pica').select('*, profiles(full_name), daily_planning(*, daily_tasks(nama_tugas, icon))').order('created_at', { ascending: false }).limit(20)
      setPicaList(picaData || [])

      setLoading(false)
    }
    load()
  }, [])

  const loadAktivitas = async (userId: string) => {
    setSelectedUser(userId)
    const today = new Date().toISOString().split('T')[0]
    const { data: att } = await supabase.from('attendance').select('id').eq('user_id', userId).eq('tanggal', today).single()
    if (!att) { setAktivitas([]); return }
    const { data: planning } = await supabase.from('daily_planning').select('*, daily_tasks(nama_tugas, icon, deskripsi)').eq('attendance_id', att.id).eq('is_planned', true)
    setAktivitas(planning || [])
    setTab('aktivitas')
  }

  const uniqueDates = Array.from(new Set(rekap.map(r => r.tanggal))).slice(0, 7)
  const selectedKaryawan = karyawan.find(k => k.id === selectedUser)
  const doneCount = aktivitas.filter(a => a.is_completed).length

  const exportExcel = () => {
    const header = ['Karyawan', ...uniqueDates.map(d => new Date(d).toLocaleDateString('id-ID'))].join(',')
    const rows = karyawan.map(k => {
      const cells = uniqueDates.map(d => {
        const att = rekap.find(r => r.user_id === k.id && r.tanggal === d)
        if (!att) return '-'
        const jm = att.jam_masuk ? new Date(att.jam_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }) : '-'
        return `${jm} (+${att.poin})`
      })
      return [k.full_name, ...cells].join(',')
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rekap-absensi-DJI-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    window.print()
  }

  const C = { card: { background: G.white, borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(27,94,58,0.08)', border: `1px solid ${G.border}` } }

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: G.textMuted }}>⏳ Memuat data...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-rekap, #printable-rekap * { visibility: visible; }
          #printable-rekap { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${G.primary}, ${G.primaryDark})`, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/logo.jpg" alt="logo" style={{ width: 40, height: 40, borderRadius: 10 }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>Dashboard Owner</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Dapur Jamu Ibu</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Karyawan</div>
          <div style={{ color: '#fff', fontSize: 26, fontWeight: 900 }}>{karyawan.length}</div>
        </div>
      </div>

      {/* Karyawan Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${karyawan.length}, 1fr)`, gap: 10 }}>
        {karyawan.map(k => {
          const todayAtt = rekap.find(r => r.user_id === k.id && r.tanggal === new Date().toISOString().split('T')[0])
          return (
            <div key={k.id} onClick={() => loadAktivitas(k.id)}
              style={{ background: G.white, borderRadius: 14, padding: '14px 10px', border: `2px solid ${selectedUser === k.id && tab === 'aktivitas' ? G.primary : G.border}`, textAlign: 'center', cursor: 'pointer' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', margin: '0 auto 4px',
                background: k.avatar_url ? `url(${k.avatar_url})` : G.surfaceAlt, backgroundSize: 'cover', backgroundPosition: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>{!k.avatar_url && '👤'}</div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{k.full_name}</div>
              <div style={{ color: G.textMuted, fontSize: 10 }}>{k.divisi}</div>
              <div style={{ marginTop: 8, background: todayAtt ? G.accentLight : '#F5F5F5', borderRadius: 8, padding: '4px 0' }}>
                <span style={{ color: todayAtt ? G.primary : '#999', fontWeight: 800, fontSize: 14 }}>
                  {todayAtt ? `+${todayAtt.poin}` : '–'}
                </span>
                <span style={{ color: G.textMuted, fontSize: 10 }}> poin</span>
              </div>
              {todayAtt && <div style={{ fontSize: 10, color: todayAtt.status === 'hadir' ? G.primary : '#2563EB', marginTop: 4, fontWeight: 600 }}>{todayAtt.status === 'hadir' ? '✅ Hadir' : '🤒 Sakit'}</div>}
            </div>
          )
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: G.textMuted }}>Tap kartu untuk lihat detail aktivitas →</div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: G.surfaceAlt, borderRadius: 12, padding: 4, gap: 4 }}>
        {([['rekap', '📊 Rekap'], ['aktivitas', '📋 Aktivitas'], ['pica', '⚠️ PICA'], ['jobdesc', '📖 Jobdesc']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '9px 4px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer', background: tab === k ? G.white : 'transparent', color: tab === k ? G.primary : G.textMuted, boxShadow: tab === k ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>

      {/* REKAP */}
      {tab === 'rekap' && (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportExcel} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${G.primary}`, background: G.white, color: G.primary, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              📊 Export Excel
            </button>
            <button onClick={exportPDF} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: G.primary, color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              📄 Export PDF
            </button>
          </div>

          <div id="printable-rekap" style={{ ...C.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${G.border}`, fontWeight: 700, fontSize: 13 }}>Rekap 7 Hari Terakhir</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: G.surface }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: G.textMuted, fontWeight: 700, borderBottom: `1px solid ${G.border}`, whiteSpace: 'nowrap' }}>Karyawan</th>
                    {uniqueDates.map(d => <th key={d} style={{ padding: '10px 8px', textAlign: 'center', color: G.primary, fontWeight: 700, borderBottom: `1px solid ${G.border}`, borderLeft: `1px solid ${G.border}`, whiteSpace: 'nowrap', fontSize: 11 }}>{new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {karyawan.map((k, i) => (
                    <tr key={k.id} style={{ borderBottom: `1px solid ${G.border}`, background: i % 2 === 0 ? G.white : G.surface }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{k.full_name}</td>
                      {uniqueDates.map(d => {
                        const att = rekap.find(r => r.user_id === k.id && r.tanggal === d)
                        return (
                          <td key={d} style={{ padding: '8px', textAlign: 'center', borderLeft: `1px solid ${G.border}` }}>
                            {att ? (
                              <div>
                                <div style={{ fontSize: 10, color: G.textMuted }}>{att.jam_masuk ? new Date(att.jam_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }) : '–'}</div>
                                <div style={{ fontWeight: 800, color: att.poin > 0 ? G.primary : '#CCC', fontSize: 13 }}>+{att.poin}</div>
                                <div style={{ fontSize: 10, color: att.status === 'hadir' ? G.primary : '#2563EB' }}>{att.status}</div>
                              </div>
                            ) : <span style={{ color: '#DDD' }}>–</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* AKTIVITAS */}
      {tab === 'aktivitas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {karyawan.map(k => (
              <button key={k.id} onClick={() => loadAktivitas(k.id)} style={{ flex: 1, padding: '8px 6px', borderRadius: 10, border: `2px solid ${selectedUser === k.id ? G.primary : G.border}`, background: selectedUser === k.id ? G.accentLight : G.white, cursor: 'pointer', fontSize: 11, fontWeight: 700, color: selectedUser === k.id ? G.primary : G.textMuted }}>
                {k.full_name}
              </button>
            ))}
          </div>

          {selectedKaryawan && (
            <div style={{ ...C.card, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontWeight: 800, fontSize: 15 }}>{selectedKaryawan.full_name}</div><div style={{ fontSize: 12, color: G.textMuted }}>Divisi {selectedKaryawan.divisi} — Hari ini</div></div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: G.textMuted }}>Progres</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: doneCount === aktivitas.length && aktivitas.length > 0 ? G.accent : G.primary }}>{doneCount}/{aktivitas.length}</div>
                </div>
              </div>
              <div style={{ marginTop: 12, height: 6, background: G.surfaceAlt, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${aktivitas.length ? doneCount / aktivitas.length * 100 : 0}%`, background: doneCount === aktivitas.length ? G.accent : G.primary, borderRadius: 3 }} />
              </div>
            </div>
          )}

          <div style={C.card}>
            <div style={{ color: G.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Detail Pekerjaan Hari Ini</div>
            {aktivitas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: G.textMuted }}>
                {selectedUser ? 'Belum ada data planning hari ini' : '← Pilih karyawan di atas'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aktivitas.map((a, i) => (
                  <div key={i} style={{ borderRadius: 12, border: `2px solid ${a.is_completed ? G.accent : G.alert}`, background: a.is_completed ? G.accentLight : G.alertLight, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer' }} onClick={() => setExpandedTask(expandedTask === `${selectedUser}-${i}` ? null : `${selectedUser}-${i}`)}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: a.is_completed ? G.accent : G.alert, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontSize: 12 }}>{a.is_completed ? '✓' : '!'}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{a.daily_tasks?.icon} {a.daily_tasks?.nama_tugas}</div>
                        <div style={{ fontSize: 11, color: a.is_completed ? G.primary : G.alert, fontWeight: 600, marginTop: 2 }}>{a.is_completed ? '✅ Selesai' : '⚠️ Tidak selesai'}</div>
                      </div>
                      <span style={{ fontSize: 12, color: G.textMuted }}>{expandedTask === `${selectedUser}-${i}` ? '▲' : '▼'}</span>
                    </div>
                    {expandedTask === `${selectedUser}-${i}` && (
                      <div style={{ borderTop: `1px dashed ${G.border}`, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {a.catatan_planning && (
                          <div style={{ padding: '8px 10px', background: 'rgba(27,94,58,0.06)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: G.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>📌 Rencana Awal</div>
                            <div style={{ fontSize: 12 }}>{a.catatan_planning}</div>
                          </div>
                        )}
                        <div style={{ padding: '8px 10px', background: a.is_completed ? 'rgba(76,175,109,0.08)' : 'rgba(192,57,43,0.05)', borderRadius: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: a.is_completed ? G.primary : G.alert, marginBottom: 4, textTransform: 'uppercase' }}>{a.is_completed ? '📝 Catatan Aktual' : '⚠️ Keterangan Tidak Selesai'}</div>
                          <div style={{ fontSize: 12, color: a.catatan_aktual ? G.text : G.textMuted, fontStyle: a.catatan_aktual ? 'normal' : 'italic' }}>{a.catatan_aktual || 'Belum ada catatan'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PICA */}
      {tab === 'pica' && (
        <div style={C.card}>
          <div style={{ color: G.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Laporan PICA Terbaru</div>
          {picaList.length === 0 ? <div style={{ textAlign: 'center', padding: '24px 0', color: G.textMuted }}>Belum ada laporan PICA</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {picaList.map((p, i) => (
                <div key={i} style={{ padding: '14px', borderRadius: 12, border: `1px solid ${p.status === 'closed' ? '#A8E6C3' : '#F0B0A8'}`, background: p.status === 'closed' ? G.accentLight : G.alertLight }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{p.profiles?.full_name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: p.status === 'closed' ? G.primary : G.alert }}>{p.status === 'closed' ? '✅ Closed' : '🔴 Open'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: G.textMuted, marginBottom: 4 }}>📌 {p.daily_planning?.daily_tasks?.nama_tugas}</div>
                  <div style={{ fontSize: 12, marginBottom: 4 }}><strong>Masalah:</strong> {p.identifikasi_masalah}</div>
                  <div style={{ fontSize: 12, marginBottom: 4 }}><strong>Perbaikan:</strong> {p.rencana_perbaikan}</div>
                  {p.target_selesai && <div style={{ fontSize: 11, color: G.textMuted }}>🎯 Target: {new Date(p.target_selesai).toLocaleDateString('id-ID')}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* JOBDESC */}
      {tab === 'jobdesc' && <JobdeskScreen user={user} />}
    </div>
  )
}
