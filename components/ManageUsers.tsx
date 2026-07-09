'use client'

import { useState, useEffect } from 'react'

const C = {
  primary: '#1B5E3A', primaryDark: '#0D3322', accent: '#4CAF6D',
  surface: '#F4FAF6', surfaceAlt: '#E5F0E8', text: '#1A2E22',
  textMuted: '#5C7868', border: '#D5E5DA', white: '#FFFFFF',
  alert: '#C0392B', alertLight: '#FDF0EE',
}

interface Profile {
  id: string
  full_name: string
  role: string
  divisi: string | null
  is_active: boolean
  created_at: string
}

interface Props { user: any }

export default function ManageUsers({ user }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [view, setView] = useState<'list' | 'add' | 'edit' | 'reset'>('list')
  const [selected, setSelected] = useState<Profile | null>(null)

  // Form state
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', role: 'karyawan', divisi: '',
  })
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadProfiles() }, [])

  const loadProfiles = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/manage-users')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProfiles(data.profiles.filter((p: Profile) => p.id !== user.id))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const showMsg = (msg: string, isError = false) => {
    if (isError) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handleAdd = async () => {
    if (!form.full_name || !form.email || !form.password) {
      return showMsg('Nama, email, dan password wajib diisi', true)
    }
    if (form.password.length < 6) return showMsg('Password minimal 6 karakter', true)
    setSaving(true)
    try {
      const res = await fetch('/api/manage-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showMsg(`✅ Karyawan ${form.full_name} berhasil ditambahkan!`)
      setForm({ full_name: '', email: '', password: '', role: 'karyawan', divisi: '' })
      setView('list')
      loadProfiles()
    } catch (err: any) {
      showMsg(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch('/api/manage-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          full_name: selected.full_name,
          divisi: selected.divisi,
          role: selected.role,
          is_active: selected.is_active,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showMsg('✅ Data berhasil diupdate!')
      setView('list')
      loadProfiles()
    } catch (err: any) {
      showMsg(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!selected || !newPassword) return
    if (newPassword.length < 6) return showMsg('Password minimal 6 karakter', true)
    setSaving(true)
    try {
      const res = await fetch('/api/manage-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, new_password: newPassword }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showMsg(`✅ Password ${selected.full_name} berhasil direset!`)
      setNewPassword('')
      setView('list')
    } catch (err: any) {
      showMsg(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (profile: Profile) => {
    const action = profile.is_active ? 'nonaktifkan' : 'aktifkan'
    if (!confirm(`${action} akun ${profile.full_name}?`)) return
    try {
      const res = await fetch('/api/manage-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: profile.id, is_active: !profile.is_active }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showMsg(`✅ Akun ${profile.full_name} berhasil di-${action}!`)
      loadProfiles()
    } catch (err: any) {
      showMsg(err.message, true)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: `1.5px solid ${C.border}`, background: C.surface,
    fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6,
  }

  const cardStyle: React.CSSProperties = {
    background: C.white, borderRadius: 16, padding: 20,
    border: `1px solid ${C.border}`, boxShadow: '0 2px 12px rgba(27,94,58,0.06)',
  }

  const activeKaryawan = profiles.filter(p => p.role !== 'super_admin' && p.is_active)
  const nonActive = profiles.filter(p => p.role !== 'super_admin' && !p.is_active)

  // ─── LIST VIEW ───
  if (view === 'list') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div style={{ background: C.alertLight, border: `1px solid ${C.alert}`, borderRadius: 10, padding: '10px 14px', color: C.alert, fontSize: 13, fontWeight: 600 }}>⚠️ {error}</div>}
      {success && <div style={{ background: '#E5F5EA', border: `1px solid ${C.accent}`, borderRadius: 10, padding: '10px 14px', color: C.primary, fontSize: 13, fontWeight: 600 }}>{success}</div>}

      <button onClick={() => { setForm({ full_name: '', email: '', password: '', role: 'karyawan', divisi: '' }); setView('add') }}
        style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
        ➕ Tambah Karyawan Baru
      </button>

      {loading ? (
        <div style={{ textAlign: 'center', color: C.textMuted, padding: 20 }}>⏳ Memuat data...</div>
      ) : (
        <>
          <div style={cardStyle}>
            <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
              👥 Karyawan Aktif ({activeKaryawan.length})
            </div>
            {activeKaryawan.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.textMuted, padding: '12px 0' }}>Belum ada karyawan</div>
            ) : activeKaryawan.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < activeKaryawan.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {p.role === 'super_admin' ? '👑' : '👤'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.full_name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{p.divisi || 'Belum ada divisi'}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setSelected(p); setView('edit') }}
                    style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 12, cursor: 'pointer', fontWeight: 600, color: C.primary }}>
                    ✏️
                  </button>
                  <button onClick={() => { setSelected(p); setNewPassword(''); setView('reset') }}
                    style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 12, cursor: 'pointer', fontWeight: 600, color: C.textMuted }}>
                    🔒
                  </button>
                  <button onClick={() => handleToggleActive(p)}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #F5C6C2', background: '#FDF0EE', fontSize: 12, cursor: 'pointer', fontWeight: 600, color: C.alert }}>
                    🚫
                  </button>
                </div>
              </div>
            ))}
          </div>

          {nonActive.length > 0 && (
            <div style={{ ...cardStyle, opacity: 0.7 }}>
              <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
                🚫 Akun Nonaktif ({nonActive.length})
              </div>
              {nonActive.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < nonActive.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#999' }}>{p.full_name}</div>
                    <div style={{ fontSize: 11, color: '#BBB' }}>{p.divisi || '-'}</div>
                  </div>
                  <button onClick={() => handleToggleActive(p)}
                    style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 12, cursor: 'pointer', fontWeight: 600, color: C.primary }}>
                    ✅ Aktifkan
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )

  // ─── ADD VIEW ───
  if (view === 'add') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div style={{ background: C.alertLight, border: `1px solid ${C.alert}`, borderRadius: 10, padding: '10px 14px', color: C.alert, fontSize: 13, fontWeight: 600 }}>⚠️ {error}</div>}

      <div style={cardStyle}>
        <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>➕ Tambah Karyawan Baru</div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nama Lengkap *</label>
          <input style={inputStyle} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Contoh: Ahmad Fauzi" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Divisi / Jabatan</label>
          <select style={inputStyle} value={form.divisi} onChange={e => setForm({ ...form, divisi: e.target.value })}>
            <option value="">Pilih divisi...</option>
            <option value="Admin">Admin</option>
            <option value="Produksi">Produksi</option>
            <option value="Kasir">Kasir</option>
            <option value="Pengiriman">Pengiriman</option>
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Role</label>
          <select style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="karyawan">Karyawan</option>
            <option value="super_admin">Admin / Owner</option>
          </select>
        </div>

        <div style={{ height: 1, background: C.border, margin: '4px 0 16px' }} />

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Email (untuk login) *</label>
          <input style={inputStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="nama@email.com" />
        </div>

        <div style={{ marginBottom: 4 }}>
          <label style={labelStyle}>Password Awal * (min. 6 karakter)</label>
          <input style={inputStyle} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••" />
        </div>
      </div>

      <button onClick={handleAdd} disabled={saving}
        style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: saving ? '#CCC' : `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color: 'white', fontWeight: 800, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer' }}>
        {saving ? '⏳ Menyimpan...' : '✅ Simpan Karyawan Baru'}
      </button>
      <button onClick={() => setView('list')}
        style={{ width: '100%', padding: 12, borderRadius: 12, border: `2px solid ${C.border}`, background: 'none', color: C.textMuted, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        Batal
      </button>
    </div>
  )

  // ─── EDIT VIEW ───
  if (view === 'edit' && selected) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div style={{ background: C.alertLight, border: `1px solid ${C.alert}`, borderRadius: 10, padding: '10px 14px', color: C.alert, fontSize: 13, fontWeight: 600 }}>⚠️ {error}</div>}
      {success && <div style={{ background: '#E5F5EA', border: `1px solid ${C.accent}`, borderRadius: 10, padding: '10px 14px', color: C.primary, fontSize: 13, fontWeight: 600 }}>{success}</div>}

      <div style={cardStyle}>
        <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>✏️ Edit Data Karyawan</div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nama Lengkap</label>
          <input style={inputStyle} value={selected.full_name} onChange={e => setSelected({ ...selected, full_name: e.target.value })} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Divisi / Jabatan</label>
          <select style={inputStyle} value={selected.divisi || ''} onChange={e => setSelected({ ...selected, divisi: e.target.value })}>
            <option value="">Pilih divisi...</option>
            <option value="Admin">Admin</option>
            <option value="Produksi">Produksi</option>
            <option value="Kasir">Kasir</option>
            <option value="Pengiriman">Pengiriman</option>
          </select>
        </div>

        <div style={{ marginBottom: 4 }}>
          <label style={labelStyle}>Role</label>
          <select style={inputStyle} value={selected.role} onChange={e => setSelected({ ...selected, role: e.target.value })}>
            <option value="karyawan">Karyawan</option>
            <option value="super_admin">Admin / Owner</option>
          </select>
        </div>
      </div>

      <button onClick={handleEdit} disabled={saving}
        style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: saving ? '#CCC' : `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color: 'white', fontWeight: 800, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer' }}>
        {saving ? '⏳ Menyimpan...' : '✅ Simpan Perubahan'}
      </button>
      <button onClick={() => setView('list')}
        style={{ width: '100%', padding: 12, borderRadius: 12, border: `2px solid ${C.border}`, background: 'none', color: C.textMuted, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        Batal
      </button>
    </div>
  )

  // ─── RESET PASSWORD VIEW ───
  if (view === 'reset' && selected) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div style={{ background: C.alertLight, border: `1px solid ${C.alert}`, borderRadius: 10, padding: '10px 14px', color: C.alert, fontSize: 13, fontWeight: 600 }}>⚠️ {error}</div>}
      {success && <div style={{ background: '#E5F5EA', border: `1px solid ${C.accent}`, borderRadius: 10, padding: '10px 14px', color: C.primary, fontSize: 13, fontWeight: 600 }}>{success}</div>}

      <div style={cardStyle}>
        <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>🔒 Reset Password</div>
        <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{selected.full_name}</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>{selected.divisi}</div>
        </div>
        <div>
          <label style={labelStyle}>Password Baru (min. 6 karakter) *</label>
          <input style={inputStyle} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Masukkan password baru" />
        </div>
      </div>

      <button onClick={handleResetPassword} disabled={saving || !newPassword}
        style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: (!newPassword || saving) ? '#CCC' : `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color: 'white', fontWeight: 800, fontSize: 15, cursor: (!newPassword || saving) ? 'not-allowed' : 'pointer' }}>
        {saving ? '⏳ Menyimpan...' : '🔒 Reset Password'}
      </button>
      <button onClick={() => setView('list')}
        style={{ width: '100%', padding: 12, borderRadius: 12, border: `2px solid ${C.border}`, background: 'none', color: C.textMuted, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        Batal
      </button>
    </div>
  )

  return null
}
