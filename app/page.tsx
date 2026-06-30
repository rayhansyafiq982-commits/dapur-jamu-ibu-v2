'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Email dan password wajib diisi'); return }
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email atau password salah')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #1B5E3A 0%, #0D3322 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <img src="/logo.jpg" alt="Dapur Jamu Ibu" style={{ width: 96, height: 96, borderRadius: 20, marginBottom: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} />
        <div style={{ color: '#8FD4A8', fontSize: 11, letterSpacing: 5, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Sistem Absensi</div>
        <div style={{ color: '#FFFFFF', fontSize: 28, fontWeight: 800 }}>Dapur Jamu Ibu</div>
        <div style={{ color: '#9DBFA8', fontSize: 13, marginTop: 4 }}>Minuman Rempah Andalan Keluarga</div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, border: '1px solid rgba(255,255,255,0.1)' }}>
        {error && (
          <div style={{ background: '#FDF0EE', border: '1px solid #F0B0A8', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#C0392B', fontSize: 13, fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@dapurjamuibu.com"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', padding: 14, background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #1B5E3A, #0D3322)', color: '#FFFFFF', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '⏳ Masuk...' : 'Masuk →'}
        </button>
      </div>
    </div>
  )
}
