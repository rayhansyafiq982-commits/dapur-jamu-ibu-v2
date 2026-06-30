'use client'

import { useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'

const C = {
  primary: '#1B5E3A', primaryDark: '#0D3322', accent: '#4CAF6D',
  accentLight: '#E5F5EA', surface: '#F4FAF6', surfaceAlt: '#E5F0E8',
  text: '#1A2E22', textMuted: '#5C7868', border: '#D5E5DA', white: '#FFFFFF',
  alert: '#C0392B', alertLight: '#FDF0EE',
}

export default function ProfileScreen({ user, onUserUpdate }: { user: Profile; onUserUpdate: (u: Profile) => void }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(user.avatar_url || null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPhoto(true)
    setError('')

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        setPhotoPreview(dataUrl)

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: dataUrl })
          .eq('id', user.id)

        if (updateError) throw updateError
        onUserUpdate({ ...user, avatar_url: dataUrl })
        setUploadingPhoto(false)
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      setError('Gagal upload foto: ' + err.message)
      setUploadingPhoto(false)
    }
  }

  const handleChangePassword = async () => {
    setError('')
    if (newPassword.length < 6) { setError('Password minimal 6 karakter'); return }
    if (newPassword !== confirmPassword) { setError('Konfirmasi password tidak cocok'); return }

    setSaving(true)
    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)

    if (pwError) { setError(pwError.message); return }

    setSaved(true)
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setSaved(false), 2500)
  }

  const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{ background: C.white, borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(27,94,58,0.08)', border: `1px solid ${C.border}`, ...style }}>
      {children}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header card with avatar */}
      <Card style={{ textAlign: 'center', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, border: 'none' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%', background: photoPreview ? `url(${photoPreview})` : 'rgba(255,255,255,0.15)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px solid rgba(255,255,255,0.4)', margin: '0 auto',
          }}>
            {!photoPreview && <span style={{ fontSize: 36 }}>👤</span>}
          </div>
          <label style={{
            position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: '50%',
            background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', border: '2px solid white', fontSize: 14,
          }}>
            📷
            <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
          </label>
        </div>
        <div style={{ color: 'white', fontWeight: 800, fontSize: 18, marginTop: 12 }}>{user.full_name}</div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>
          {user.role === 'super_admin' ? 'Owner / Super Admin' : `Karyawan — ${user.divisi}`}
        </div>
        {uploadingPhoto && <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 6 }}>⏳ Mengunggah foto...</div>}
      </Card>

      {/* Change password */}
      <Card>
        <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>🔒 Ganti Password</div>

        {error && (
          <div style={{ background: C.alertLight, border: '1px solid #F0B0A8', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: C.alert, fontSize: 12, fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}
        {saved && (
          <div style={{ background: C.accentLight, border: `1px solid ${C.accent}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: C.primary, fontSize: 12, fontWeight: 700 }}>
            ✅ Password berhasil diubah!
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>Password Baru</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>Konfirmasi Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Ulangi password baru"
            onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={handleChangePassword}
          disabled={saving || !newPassword || !confirmPassword}
          style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: (!newPassword || !confirmPassword) ? '#CCC' : C.primary, color: 'white', fontWeight: 800, fontSize: 14, cursor: (!newPassword || !confirmPassword) ? 'not-allowed' : 'pointer' }}
        >
          {saving ? '⏳ Menyimpan...' : '💾 Simpan Password Baru'}
        </button>
      </Card>

      {/* Info card */}
      <Card style={{ background: C.surfaceAlt }}>
        <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
          💡 Foto profil disimpan langsung di database. Untuk hasil terbaik, gunakan foto persegi (1:1) berukuran kecil.
        </div>
      </Card>
    </div>
  )
}
