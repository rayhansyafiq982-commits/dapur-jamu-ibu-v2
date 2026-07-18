'use client'

import { useState, useEffect } from 'react'

// ============================================================
// Kredensial SI-PROFIL (project Supabase terpisah dari Dapur Jamu Ibu).
// Sengaja di-hardcode di sini supaya tidak tercampur dengan konfigurasi
// Supabase aplikasi DJI sendiri. Aman dipakai di browser — anon key memang
// didesain publik, keamanan sebenarnya diatur lewat RLS di sisi SI-PROFIL.
// ============================================================
const SIPROFIL_URL = 'https://faqqzypzdxsttttxgbst.supabase.co'
const SIPROFIL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcXF6eXB6ZHhzdHR0dHhnYnN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxOTI2NDcsImV4cCI6MjA5OTc2ODY0N30.CBIQT_AdSq9HPlwiMLzt6msLKfpwrQxI59J5yvJpSzQ'
const ID_UMKM_DJI = 'UMKM-036' // ID tetap Dapur Jamu Ibu di sistem SI-PROFIL

const G = {
  primary: '#1B5E3A', primaryDark: '#0D3322', accent: '#4CAF6D', accentLight: '#E5F5EA',
  surface: '#F4FAF6', surfaceAlt: '#E5F0E8', text: '#1A2E22', textMuted: '#5C7868',
  border: '#D5E5DA', white: '#FFFFFF',
}

const BULAN_NAMA = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

async function siprofilFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SIPROFIL_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SIPROFIL_ANON_KEY,
      Authorization: `Bearer ${SIPROFIL_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`SI-PROFIL API error: ${res.status} ${text}`)
  if (!text) return null
  try { return JSON.parse(text) } catch { return null }
}

export default function OmzetScreen() {
  const now = new Date()
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [tahun, setTahun] = useState(now.getFullYear())
  const [omzet, setOmzet] = useState('')
  const [profit, setProfit] = useState('')
  const [loading, setLoading] = useState(false)
  const [sukses, setSukses] = useState(false)
  const [error, setError] = useState('')
  const [riwayat, setRiwayat] = useState<any[]>([])
  const [loadingRiwayat, setLoadingRiwayat] = useState(true)

  useEffect(() => { muatRiwayat() }, [])

  async function muatRiwayat() {
    setLoadingRiwayat(true)
    try {
      const data = await siprofilFetch(
        `omzet_bulanan?id_umkm=eq.${ID_UMKM_DJI}&omzet=not.is.null&order=tahun.desc,bulan.desc&limit=6`
      )
      setRiwayat(data || [])
    } catch (e) {
      // gagal muat riwayat bukan hal fatal
    }
    setLoadingRiwayat(false)
  }

  async function simpanOmzet() {
    if (!omzet) { setError('Isi omzet dulu ya.'); return }
    setLoading(true)
    setError('')
    try {
      await siprofilFetch(`omzet_bulanan?on_conflict=id_umkm,tahun,bulan`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id_umkm: ID_UMKM_DJI,
          tahun,
          bulan,
          omzet: parseFloat(omzet),
          profit: profit ? parseFloat(profit) : null,
        }),
      })
      setSukses(true)
      setOmzet('')
      setProfit('')
      muatRiwayat()
      setTimeout(() => setSukses(false), 3000)
    } catch (e: any) {
      setError('Gagal simpan ke SI-PROFIL: ' + e.message)
    }
    setLoading(false)
  }

  const card: React.CSSProperties = { background: G.white, borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(27,94,58,0.08)', border: `1px solid ${G.border}` }
  const input: React.CSSProperties = { width: '100%', padding: '11px 12px', borderRadius: 10, border: `1.5px solid ${G.border}`, fontSize: 14 }
  const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: G.text, marginBottom: 6 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: `linear-gradient(135deg, ${G.primary}, ${G.primaryDark})`, borderRadius: 16, padding: '16px 20px' }}>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>Lapor ke SI-PROFIL</div>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, marginTop: 2 }}>💰 Input Omzet Bulanan</div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Bulan</label>
            <select value={bulan} onChange={(e) => setBulan(parseInt(e.target.value))} style={input}>
              {BULAN_NAMA.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
            </select>
          </div>
          <div style={{ width: 90 }}>
            <label style={label}>Tahun</label>
            <input type="number" value={tahun} onChange={(e) => setTahun(parseInt(e.target.value))} style={input} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>Omzet (Rp)</label>
          <input type="number" value={omzet} onChange={(e) => setOmzet(e.target.value)} placeholder="cth. 12000000" style={input} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={label}>Profit (Rp) — opsional</label>
          <input type="number" value={profit} onChange={(e) => setProfit(e.target.value)} placeholder="cth. 7200000" style={input} />
        </div>

        {error && <div style={{ color: '#C0392B', fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
        {sukses && <div style={{ background: G.accentLight, color: G.primary, padding: '8px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 10, fontWeight: 700 }}>✅ Tersimpan ke SI-PROFIL</div>}

        <button
          onClick={simpanOmzet}
          disabled={loading}
          style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: G.primary, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
        >
          {loading ? 'Menyimpan...' : 'Simpan Omzet'}
        </button>
      </div>

      <div style={card}>
        <div style={{ color: G.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
          Riwayat Omzet Tercatat
        </div>
        {loadingRiwayat ? (
          <div style={{ color: G.textMuted, fontSize: 13 }}>Memuat...</div>
        ) : riwayat.length === 0 ? (
          <div style={{ color: G.textMuted, fontSize: 13 }}>Belum ada riwayat.</div>
        ) : (
          riwayat.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: G.surface, marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: G.text, fontWeight: 600 }}>{BULAN_NAMA[r.bulan - 1]} {r.tahun}</span>
              <span style={{ fontWeight: 800, color: G.primary, fontSize: 14 }}>Rp {Number(r.omzet).toLocaleString('id-ID')}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
