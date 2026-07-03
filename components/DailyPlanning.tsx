'use client'

import { useState, useEffect } from 'react'
import { supabase, DailyTask, DailyPlanning as DPType } from '@/lib/supabase'

interface Props { user: any; attendance: any }

interface TaskItem extends DailyTask {
  is_planned: boolean
  is_completed: boolean
  catatan_planning: string
  catatan_aktual: string
  showNoteP: boolean
  showNoteA: boolean
  planning_id?: string
}

export default function DailyPlanning({ user, attendance: attendanceProp }: Props) {
  const [tab, setTab] = useState<'planning' | 'aktual'>('planning')
  const [items, setItems] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [showPica, setShowPica] = useState(false)
  const [picaIdx, setPicaIdx] = useState(0)
  const [picaData, setPicaData] = useState<Record<string, string>>({})
  const [picaDone, setPicaDone] = useState(false)
  const [attendance, setAttendance] = useState<any>(attendanceProp)

  useEffect(() => {
    const load = async () => {
      // Selalu fetch attendance terbaru langsung — jangan andalkan props yang mungkin stale
      const today = new Date().toISOString().split('T')[0]
      let currentAttendance = attendanceProp
      if (!currentAttendance) {
        const { data: att } = await supabase.from('attendance').select('*').eq('user_id', user.id).eq('tanggal', today).maybeSingle()
        if (att) { currentAttendance = att; setAttendance(att) }
      }

      const { data: tasks } = await supabase.from('daily_tasks').select('*').eq('divisi', user.divisi).eq('is_active', true).order('urutan')
      if (!tasks) return

      if (currentAttendance) {
        const { data: existing } = await supabase.from('daily_planning').select('*').eq('attendance_id', currentAttendance.id)
        if (existing && existing.length > 0) {
          setItems(tasks.map(t => {
            const p = existing.find((e: DPType) => e.task_id === t.id)
            return { ...t, is_planned: p?.is_planned ?? false, is_completed: p?.is_completed ?? false, catatan_planning: p?.catatan_planning ?? '', catatan_aktual: p?.catatan_aktual ?? '', showNoteP: false, showNoteA: false, planning_id: p?.id }
          }))
          if (existing.some((e: DPType) => e.is_planned)) setTab('aktual')
        } else {
          setItems(tasks.map(t => ({ ...t, is_planned: true, is_completed: false, catatan_planning: '', catatan_aktual: '', showNoteP: false, showNoteA: false })))
        }
      } else {
        // Belum check-in hari ini
        setItems(tasks.map(t => ({ ...t, is_planned: true, is_completed: false, catatan_planning: '', catatan_aktual: '', showNoteP: false, showNoteA: false })))
      }
      setLoading(false)
    }
    load()
  }, [user.divisi, user.id, attendanceProp])

  const toggle = (id: string, field: 'is_planned' | 'is_completed') =>
    setItems(p => p.map(i => i.id === id ? { ...i, [field]: !i[field] } : i))
  const setNote = (id: string, field: 'catatan_planning' | 'catatan_aktual', val: string) =>
    setItems(p => p.map(i => i.id === id ? { ...i, [field]: val } : i))
  const toggleNote = (id: string, field: 'showNoteP' | 'showNoteA') =>
    setItems(p => p.map(i => i.id === id ? { ...i, [field]: !i[field] } : i))

  const savePlanning = async () => {
    if (!attendance) {
      // Coba fetch ulang attendance
      const today = new Date().toISOString().split('T')[0]
      const { data: att } = await supabase.from('attendance').select('*').eq('user_id', user.id).eq('tanggal', today).maybeSingle()
      if (!att) {
        setSavedMsg('⚠️ Kamu belum check-in hari ini. Absen dulu ya!')
        setTimeout(() => setSavedMsg(''), 3000)
        return
      }
      setAttendance(att)
    }
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const currentAttendance = attendance || (await supabase.from('attendance').select('*').eq('user_id', user.id).eq('tanggal', today).maybeSingle()).data
    if (!currentAttendance) return
    const upserts = items.filter(i => i.is_planned).map(i => ({
      attendance_id: currentAttendance.id, user_id: user.id, tanggal: today,
      task_id: i.id, is_planned: true, is_completed: false,
      catatan_planning: i.catatan_planning,
    }))
    const { error } = await supabase.from('daily_planning').upsert(upserts, { onConflict: 'attendance_id,task_id' })
    if (error) console.error('Planning save error:', error)
    setSaving(false)
    setSavedMsg('Planning tersimpan!')
    setTimeout(() => { setSavedMsg(''); setTab('aktual') }, 1200)
  }

  const saveAktual = async () => {
    if (!attendance) return
    setSaving(true)
    for (const item of items.filter(i => i.is_planned)) {
      await supabase.from('daily_planning').update({ is_completed: item.is_completed, catatan_aktual: item.catatan_aktual, waktu_completed: item.is_completed ? new Date().toISOString() : null })
        .eq('attendance_id', attendance.id).eq('task_id', item.id)
    }
    const unfinished = items.filter(i => i.is_planned && !i.is_completed)
    setSaving(false)
    if (unfinished.length > 0) { setShowPica(true) }
    else { setSavedMsg('Aktual tersimpan!'); setTimeout(() => setSavedMsg(''), 1500) }
  }

  const savePica = async () => {
    const unfinished = items.filter(i => i.is_planned && !i.is_completed)
    const current = unfinished[picaIdx]
    const { data: planningRow } = await supabase.from('daily_planning').select('id').eq('attendance_id', attendance.id).eq('task_id', current.id).maybeSingle()
    if (planningRow) {
      const today = new Date().toISOString().split('T')[0]
      const tanggalWITA = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' })

      await supabase.from('pica').insert({
        planning_id: planningRow.id, user_id: user.id, tanggal: today,
        identifikasi_masalah: picaData[`${current.id}_masalah`] || '',
        akar_penyebab: picaData[`${current.id}_akar`] || '',
        rencana_perbaikan: picaData[`${current.id}_perbaikan`] || '',
        target_selesai: picaData[`${current.id}_target`] || null,
      })

      // Sync ke Google Sheets PICA via Make webhook
      try {
        await fetch('https://hook.eu1.make.com/qk59vpm9fzc57olrzb4j19kswkr8oo58', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tanggal: tanggalWITA,
            karyawan: user.full_name,
            tugas: current.nama_tugas,
            identifikasi_masalah: picaData[`${current.id}_masalah`] || '',
            akar_penyebab: picaData[`${current.id}_akar`] || '',
            rencana_perbaikan: picaData[`${current.id}_perbaikan`] || '',
            target_selesai: picaData[`${current.id}_target`] || '-',
          }),
        })
      } catch (e) {
        console.error('Make PICA webhook error:', e)
      }
    }
    if (picaIdx < unfinished.length - 1) setPicaIdx(i => i + 1)
    else setPicaDone(true)
  }

  const unfinished = items.filter(i => i.is_planned && !i.is_completed)
  const planned = items.filter(i => i.is_planned)

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#5C7868' }}>⏳ Memuat tugas...</div>

  if (picaDone) return (
    <div style={{ background: '#FDF0EE', border: '2px solid #C0392B', borderRadius: 16, padding: 28, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>📝</div>
      <div style={{ color: '#C0392B', fontWeight: 800, fontSize: 16 }}>PICA Terkirim!</div>
      <div style={{ color: '#5C7868', fontSize: 13, marginTop: 4 }}>Evaluasi sudah disimpan untuk review owner.</div>
    </div>
  )

  const cardStyle = { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(107,63,26,0.08)', border: '1px solid #D5E5DA' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'linear-gradient(135deg, #4CAF6D, #0D3322)', borderRadius: 16, padding: '16px 20px' }}>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>Daily Planning</div>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, marginTop: 2 }}>{user.full_name} — {user.divisi}</div>
      </div>

      {savedMsg && <div style={{ background: '#E8F8F0', border: '2px solid #A8E6C3', borderRadius: 10, padding: '10px 14px', color: '#27AE60', fontWeight: 700, fontSize: 13 }}>✅ {savedMsg}</div>}

      {!showPica && (
        <>
          <div style={{ display: 'flex', background: '#E5F0E8', borderRadius: 12, padding: 4, gap: 4 }}>
            {(['planning', 'aktual'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#1B5E3A' : '#5C7868', boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
                {t === 'planning' ? '📝 Planning' : '✅ Aktual'}
              </button>
            ))}
          </div>

          {tab === 'planning' && (
            <div style={cardStyle}>
              <div style={{ color: '#5C7868', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Rencana Kerja Hari Ini</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {items.map(item => (
                  <div key={item.id} style={{ borderRadius: 12, border: `2px solid ${item.is_planned ? '#1B5E3A' : '#D5E5DA'}`, background: item.is_planned ? '#E5F5EA' : '#F4FAF6', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 12, padding: '12px 14px', cursor: 'pointer' }} onClick={() => toggle(item.id, 'is_planned')}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.is_planned ? '#1B5E3A' : '#D5E5DA'}`, background: item.is_planned ? '#1B5E3A' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        {item.is_planned && <span style={{ color: 'white', fontSize: 13 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{item.icon} {item.nama_tugas}</div>
                        <div style={{ fontSize: 11, color: '#5C7868', marginTop: 2 }}>{item.deskripsi}</div>
                      </div>
                    </div>
                    {item.is_planned && (
                      <div style={{ borderTop: '1px dashed #D5E5DA' }}>
                        <button onClick={() => toggleNote(item.id, 'showNoteP')} style={{ width: '100%', background: 'none', border: 'none', padding: '8px 14px', textAlign: 'left', fontSize: 11, color: '#1B5E3A', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          ✏️ {item.catatan_planning ? 'Lihat/edit catatan' : '+ Tambah catatan rencana'} <span style={{ marginLeft: 'auto' }}>{item.showNoteP ? '▲' : '▼'}</span>
                        </button>
                        {item.showNoteP && (
                          <div style={{ padding: '0 14px 12px' }}>
                            <textarea value={item.catatan_planning} onChange={e => setNote(item.id, 'catatan_planning', e.target.value)} rows={3} placeholder="Tulis rencana detail atau target hari ini..." onClick={e => e.stopPropagation()}
                              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #D5E5DA', background: 'white', fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={savePlanning} disabled={saving || planned.length === 0}
                style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: planned.length > 0 ? '#1B5E3A' : '#DDD', color: 'white', fontWeight: 800, cursor: planned.length > 0 ? 'pointer' : 'not-allowed', fontSize: 15 }}>
                {saving ? '⏳ Menyimpan...' : '💾 Simpan Planning'}
              </button>
            </div>
          )}

          {tab === 'aktual' && (
            <div style={cardStyle}>
              <div style={{ color: '#5C7868', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Realisasi & Catatan Aktual</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {planned.map(item => (
                  <div key={item.id} style={{ borderRadius: 12, border: `2px solid ${item.is_completed ? '#4CAF6D' : '#D5E5DA'}`, background: item.is_completed ? '#E5F5EA' : '#F4FAF6', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 12, padding: '12px 14px', cursor: 'pointer' }} onClick={() => toggle(item.id, 'is_completed')}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.is_completed ? '#4CAF6D' : '#D5E5DA'}`, background: item.is_completed ? '#4CAF6D' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        {item.is_completed && <span style={{ color: 'white', fontSize: 13 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, textDecoration: item.is_completed ? 'line-through' : 'none', color: item.is_completed ? '#5C7868' : '#1A2E22' }}>{item.icon} {item.nama_tugas}</div>
                        {!item.is_completed && <div style={{ fontSize: 11, color: '#E67E22', marginTop: 2, fontWeight: 600 }}>⚠️ Belum selesai</div>}
                      </div>
                    </div>
                    <div style={{ borderTop: '1px dashed #D5E5DA' }}>
                      <button onClick={() => toggleNote(item.id, 'showNoteA')} style={{ width: '100%', background: 'none', border: 'none', padding: '8px 14px', textAlign: 'left', fontSize: 11, color: item.is_completed ? '#4CAF6D' : '#1B5E3A', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        📝 {item.catatan_aktual ? 'Lihat/edit catatan aktual' : `+ Isi catatan ${item.is_completed ? 'hasil kerja' : 'kendala'}`} <span style={{ marginLeft: 'auto' }}>{item.showNoteA ? '▲' : '▼'}</span>
                      </button>
                      {item.showNoteA && (
                        <div style={{ padding: '0 14px 12px' }}>
                          {item.catatan_planning && <div style={{ padding: '8px 10px', background: 'rgba(193,127,58,0.08)', borderRadius: 6, fontSize: 11, color: '#5C7868', marginBottom: 8, fontStyle: 'italic' }}>📌 Rencana: "{item.catatan_planning}"</div>}
                          <textarea value={item.catatan_aktual} onChange={e => setNote(item.id, 'catatan_aktual', e.target.value)} rows={3} placeholder={item.is_completed ? 'Ceritakan apa yang dikerjakan dan hasilnya...' : 'Jelaskan kendala yang dihadapi...'} onClick={e => e.stopPropagation()}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #D5E5DA', background: 'white', fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {unfinished.length > 0 && <div style={{ padding: '10px 14px', background: '#FDF0EE', borderRadius: 10, border: '1px solid #F0B0A8', marginBottom: 12, color: '#C0392B', fontSize: 12, fontWeight: 700 }}>⚠️ {unfinished.length} tugas belum selesai — form PICA akan muncul</div>}
              <button onClick={saveAktual} disabled={saving}
                style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: unfinished.length > 0 ? '#C0392B' : '#4CAF6D', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 15 }}>
                {saving ? '⏳ Menyimpan...' : unfinished.length > 0 ? `⚠️ Selesai & Isi PICA (${unfinished.length})` : '✅ Simpan Aktual'}
              </button>
            </div>
          )}
        </>
      )}

      {/* PICA */}
      {showPica && !picaDone && unfinished[picaIdx] && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FDF0EE', border: '2px solid #C0392B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚠️</div>
            <div><div style={{ fontWeight: 800, color: '#C0392B', fontSize: 15 }}>Form PICA</div><div style={{ fontSize: 12, color: '#5C7868' }}>Evaluasi {picaIdx + 1} dari {unfinished.length} tugas</div></div>
          </div>
          <div style={{ background: '#FDF0EE', borderRadius: 10, padding: '10px 14px', marginBottom: 16, border: '1px solid #F0B0A8' }}>
            <div style={{ fontWeight: 700, color: '#C0392B' }}>{unfinished[picaIdx].icon} {unfinished[picaIdx].nama_tugas}</div>
            {unfinished[picaIdx].catatan_aktual && <div style={{ fontSize: 12, color: '#5C7868', marginTop: 4, fontStyle: 'italic' }}>"{unfinished[picaIdx].catatan_aktual}"</div>}
          </div>
          {[['masalah', '🔍 Identifikasi Masalah', 'Apa kendala sehingga tugas tidak selesai?'], ['akar', '🌱 Akar Penyebab', 'Mengapa masalah tersebut terjadi?'], ['perbaikan', '🔧 Rencana Perbaikan', 'Langkah konkret untuk mencegah terulang?']].map(([f, label, ph]) => (
            <div key={f} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1A2E22', marginBottom: 6 }}>{label} *</label>
              <textarea value={picaData[`${unfinished[picaIdx].id}_${f}`] || ''} onChange={e => setPicaData(d => ({ ...d, [`${unfinished[picaIdx].id}_${f}`]: e.target.value }))} placeholder={ph} rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '2px solid #D5E5DA', background: '#F4FAF6', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1A2E22', marginBottom: 6 }}>📅 Target Selesai</label>
            <input type="date" value={picaData[`${unfinished[picaIdx].id}_target`] || ''} onChange={e => setPicaData(d => ({ ...d, [`${unfinished[picaIdx].id}_target`]: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '2px solid #D5E5DA', background: '#F4FAF6', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button onClick={savePica} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#C0392B', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 15 }}>
            {picaIdx < unfinished.length - 1 ? `💾 Simpan & Lanjut (${picaIdx + 1}/${unfinished.length})` : '✅ Kirim Semua PICA'}
          </button>
        </div>
      )}
    </div>
  )
}
