'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateAttendancePoints } from '@/lib/calculatePoints'
import CameraCapture from './CameraCapture'

interface Props { user: any; attendance: any; onAttendanceUpdate: (att: any) => void }

export default function CheckIn({ user, attendance, onAttendanceUpdate }: Props) {
  const [time, setTime] = useState('')
  const [status, setStatus] = useState<'hadir' | 'sakit' | null>(null)
  const [step, setStep] = useState<'idle' | 'camera' | 'preview' | 'submitting' | 'done'>('idle')
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null)
  const [sakitKet, setSakitKet] = useState('')
  const [sakitFile, setSakitFile] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Makassar' }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' })

  const handleCapture = (blob: Blob, url: string) => {
    setPreview({ blob, url })
    setStep('preview')
  }

  const handleConfirmHadir = async () => {
    if (!preview) return
    setStep('submitting')
    setError('')
    try {
      const { data: timeData } = await supabase.rpc('get_server_time')
      const serverTime = timeData ? new Date(timeData) : new Date()
      const poin = calculateAttendancePoints(serverTime)

      // ✅ PERBAIKAN: Gunakan WITA untuk tanggal, bukan UTC
      const tanggal = serverTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })

      const { data: att, error: attErr } = await supabase
        .from('attendance')
        .upsert(
          { user_id: user.id, tanggal, jam_masuk: serverTime.toISOString(), poin, status: 'hadir' },
          { onConflict: 'user_id,tanggal' }
        )
        .select().single()
      if (attErr) throw attErr

      // Upload foto ke Google Drive via API route
      const formData = new FormData()
      formData.append('photo', preview.blob, 'checkin.jpg')
      formData.append('userId', user.id)
      formData.append('userName', user.full_name)
      formData.append('tanggal', tanggal)
      formData.append('attendanceId', att.id)
      await fetch('/api/upload-photo', { method: 'POST', body: formData })

      // Sync ke Google Sheets
      await fetch('/api/sync-sheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tanggal }) })

      onAttendanceUpdate(att)
      setStep('done')
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
      setStep('preview')
    }
  }

  const handleCheckOut = async () => {
    if (!attendance) return
    const { data: timeData } = await supabase.rpc('get_server_time')
    const serverTime = timeData ? new Date(timeData) : new Date()
    const { data: updated } = await supabase
      .from('attendance')
      .update({ jam_pulang: serverTime.toISOString() })
      .eq('id', attendance.id)
      .select().single()
    if (updated) {
      onAttendanceUpdate(updated)
      // ✅ PERBAIKAN: Gunakan WITA untuk tanggal sync
      const tanggal = serverTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
      await fetch('/api/sync-sheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tanggal }) })
    }
  }

  const handleConfirmSakit = async () => {
    setStep('submitting')
    try {
      const { data: timeData } = await supabase.rpc('get_server_time')
      const serverTime = timeData ? new Date(timeData) : new Date()

      // ✅ PERBAIKAN: Gunakan WITA untuk tanggal, bukan UTC
      const tanggal = serverTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })

      const { data: att } = await supabase
        .from('attendance')
        .upsert(
          { user_id: user.id, tanggal, status: 'sakit', keterangan_sakit: sakitKet, poin: 0 },
          { onConflict: 'user_id,tanggal' }
        )
        .select().single()
      if (att) onAttendanceUpdate(att)
      setStep('done')
    } catch (err: any) {
      setError(err.message)
      setStep('idle')
    }
  }

  const S = { card: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(107,63,26,0.08)', border: '1px solid #D5E5DA', marginBottom: 0 } }

  // Sudah check in & check out
  if (attendance?.jam_masuk && attendance?.jam_pulang) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ClockCard time={time} today={today} />
      <div style={{ ...S.card, background: '#E8F8F0', border: '2px solid #A8E6C3' }}>
        <div style={{ fontWeight: 800, color: '#27AE60', fontSize: 15, marginBottom: 4 }}>✅ Absensi Hari Ini Lengkap</div>
        <div style={{ color: '#5C7868', fontSize: 13 }}>
          Masuk: {new Date(attendance.jam_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })} · Pulang: {new Date(attendance.jam_pulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })}
        </div>
        <div style={{ marginTop: 10, background: '#E5F5EA', borderRadius: 10, padding: '8px 14px', display: 'inline-block' }}>
          <span style={{ color: '#1B5E3A', fontWeight: 900, fontSize: 20 }}>+{attendance.poin} poin</span>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ClockCard time={time} today={today} />

      {error && (
        <div style={{ background: '#FDF0EE', border: '2px solid #C0392B', borderRadius: 10, padding: '10px 14px', color: '#C0392B', fontSize: 13, fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Sudah check in, belum check out */}
      {attendance?.jam_masuk && !attendance?.jam_pulang && (
        <>
          <div style={{ ...S.card, background: '#E8F8F0', border: '2px solid #A8E6C3' }}>
            <div style={{ fontWeight: 800, color: '#27AE60' }}>
              ✅ Sudah Check In — Pukul {new Date(attendance.jam_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })}
            </div>
            <div style={{ color: '#5C7868', fontSize: 13, marginTop: 4 }}>+{attendance.poin} poin earned</div>
          </div>
          <button onClick={handleCheckOut} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#E5F0E8', color: '#1B5E3A', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            🏠 Check Out
          </button>
        </>
      )}

      {/* Belum absen sama sekali */}
      {!attendance && (
        <>
          {/* Status Picker */}
          {!status && (
            <div style={S.card}>
              <div style={{ color: '#5C7868', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Kehadiran Hari Ini</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setStatus('hadir')} style={{ flex: 1, padding: '20px 12px', borderRadius: 14, border: '2px solid #4CAF6D', background: '#E5F5EA', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 34, marginBottom: 6 }}>🏢</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#4CAF6D' }}>Hadir</div>
                </button>
                <button onClick={() => setStatus('sakit')} style={{ flex: 1, padding: '20px 12px', borderRadius: 14, border: '2px solid #93C5FD', background: '#EEF4FF', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 34, marginBottom: 6 }}>🤒</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#2563EB' }}>Sakit</div>
                </button>
              </div>
            </div>
          )}

          {/* HADIR FLOW */}
          {status === 'hadir' && step === 'idle' && (
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ background: '#E5F5EA', border: '2px solid #4CAF6D', borderRadius: 10, padding: '6px 14px', fontWeight: 700, color: '#4CAF6D', fontSize: 13 }}>🏢 Hadir</span>
                <button onClick={() => setStatus(null)} style={{ background: '#E5F0E8', border: '1px solid #D5E5DA', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#5C7868', cursor: 'pointer', fontWeight: 600 }}>Ganti</button>
              </div>
              <button onClick={() => setStep('camera')} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#1B5E3A', color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
                📸 Lanjut — Ambil Foto Selfie
              </button>
            </div>
          )}

          {status === 'hadir' && step === 'camera' && (
            <div style={S.card}>
              <CameraCapture onCapture={handleCapture} onCancel={() => setStep('idle')} />
            </div>
          )}

          {status === 'hadir' && step === 'preview' && preview && (
            <div style={S.card}>
              <img src={preview.url} alt="Preview" style={{ width: '100%', borderRadius: 12, aspectRatio: '1', objectFit: 'cover', marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('camera')} style={{ flex: 1, padding: 13, borderRadius: 12, border: 'none', background: '#E5F0E8', color: '#1B5E3A', fontWeight: 700, cursor: 'pointer' }}>Ulangi</button>
                <button onClick={handleConfirmHadir} style={{ flex: 2, padding: 13, borderRadius: 12, border: 'none', background: '#1B5E3A', color: 'white', fontWeight: 800, cursor: 'pointer' }}>✅ Konfirmasi Check In</button>
              </div>
            </div>
          )}

          {status === 'hadir' && step === 'submitting' && (
            <div style={{ ...S.card, textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>⏳</div>
              <div style={{ color: '#5C7868' }}>Menyimpan absensi & upload foto...</div>
            </div>
          )}

          {/* SAKIT FLOW */}
          {status === 'sakit' && step !== 'done' && (
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ background: '#EEF4FF', border: '2px solid #93C5FD', borderRadius: 10, padding: '6px 14px', fontWeight: 700, color: '#2563EB', fontSize: 13 }}>🤒 Sakit</span>
                <button onClick={() => setStatus(null)} style={{ background: '#E5F0E8', border: '1px solid #D5E5DA', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#5C7868', cursor: 'pointer', fontWeight: 600 }}>Ganti</button>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1A2E22', marginBottom: 6 }}>Keterangan Sakit *</label>
                <textarea
                  value={sakitKet}
                  onChange={e => setSakitKet(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Demam dan flu sejak tadi malam..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '2px solid #D5E5DA', background: '#F4FAF6', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ padding: '10px 14px', background: '#EEF4FF', borderRadius: 10, marginBottom: 16, fontSize: 12, color: '#2563EB' }}>
                ℹ️ Izin sakit tidak mendapat poin, namun tidak dihitung alpha.
              </div>
              <button
                onClick={handleConfirmSakit}
                disabled={!sakitKet.trim() || step === 'submitting'}
                style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: sakitKet.trim() ? '#2563EB' : '#DDD', color: 'white', fontWeight: 800, cursor: sakitKet.trim() ? 'pointer' : 'not-allowed', fontSize: 15 }}>
                {step === 'submitting' ? '⏳ Mengirim...' : '🤒 Kirim Laporan Sakit'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ClockCard({ time, today }: { time: string; today: string }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #1B5E3A, #0D3322)', borderRadius: 16, padding: 20, textAlign: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>Waktu Server</div>
      <div style={{ color: '#fff', fontSize: 38, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 2 }}>{time}</div>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 4 }}>{today}</div>
    </div>
  )
}
