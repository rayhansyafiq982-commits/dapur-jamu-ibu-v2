'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  onCapture: (blob: Blob, dataUrl: string) => void
  onCancel: () => void
}

export default function CameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState('')
  const [isReady, setIsReady] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setIsReady(false)
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setIsReady(true)
        }
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setError('Izin kamera ditolak. Buka Pengaturan browser dan izinkan akses kamera.')
      else if (err.name === 'NotFoundError') setError('Kamera tidak ditemukan di perangkat ini.')
      else setError('Gagal membuka kamera: ' + err.message)
    }
  }, [])

  useEffect(() => {
    startCamera(facingMode)
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  const switchCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(next)
    startCamera(next)
  }

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !isReady) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1) }
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      streamRef.current?.getTracks().forEach(t => t.stop())
      onCapture(blob, dataUrl)
    }, 'image/jpeg', 0.85)
  }, [isReady, facingMode, onCapture])

  if (error) return (
    <div style={{ background: '#FDF0EE', border: '2px solid #C0392B', borderRadius: 12, padding: 20, textAlign: 'center' }}>
      <p style={{ color: '#C0392B', fontWeight: 700, marginBottom: 12 }}>⚠️ {error}</p>
      <button onClick={() => startCamera(facingMode)} style={{ background: '#C0392B', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', marginRight: 10 }}>Coba Lagi</button>
      <button onClick={onCancel} style={{ background: '#F5ECD9', color: '#6B3F1A', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', aspectRatio: '1' }}>
        <video ref={videoRef} autoPlay playsInline muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
        {!isReady && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
            <p style={{ color: 'white', fontSize: 14 }}>⏳ Membuka kamera...</p>
          </div>
        )}
        {isReady && [['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
          <div key={`${v}${h}`} style={{ position: 'absolute', [v]: 16, [h]: 16, width: 28, height: 28,
            borderTop: v === 'top' ? '3px solid #C17F3A' : 'none', borderBottom: v === 'bottom' ? '3px solid #C17F3A' : 'none',
            borderLeft: h === 'left' ? '3px solid #C17F3A' : 'none', borderRight: h === 'right' ? '3px solid #C17F3A' : 'none' }} />
        ))}
        <button onClick={switchCamera} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔄</button>
        <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center' }}>
          <span style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>
            {facingMode === 'user' ? '📸 Kamera Depan' : '📷 Kamera Belakang'}
          </span>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 13, borderRadius: 12, border: 'none', background: '#F5ECD9', color: '#6B3F1A', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Batal</button>
        <button onClick={capturePhoto} disabled={!isReady} style={{ flex: 2, padding: 13, borderRadius: 12, border: 'none', background: isReady ? '#C17F3A' : '#DDD', color: 'white', fontWeight: 800, cursor: isReady ? 'pointer' : 'not-allowed', fontSize: 14 }}>📷 Ambil Foto</button>
      </div>
    </div>
  )
}
