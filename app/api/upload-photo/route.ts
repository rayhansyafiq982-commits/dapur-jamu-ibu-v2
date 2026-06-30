import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Foto check-in diteruskan ke Make.com webhook untuk diupload ke Google Drive.
// Webhook: https://hook.eu1.make.com/yikrsiksdg3dhrw0t81tfbb6hplok4cq
const MAKE_DRIVE_WEBHOOK_URL = 'https://hook.eu1.make.com/yikrsiksdg3dhrw0t81tfbb6hplok4cq'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('photo') as File
    const userName = formData.get('userName') as string
    const tanggal = formData.get('tanggal') as string
    const attendanceId = formData.get('attendanceId') as string

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    // Convert foto ke base64 MURNI (tanpa prefix data:image/...) — format yang dibaca modul Google Drive di Make
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64Data = buffer.toString('base64')

    let driveUrl: string | null = null
    try {
      const makeResponse = await fetch(MAKE_DRIVE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo: base64Data,
          userName,
          tanggal,
          attendanceId,
        }),
      })
      if (makeResponse.ok) {
        const result = await makeResponse.json().catch(() => null)
        driveUrl = result?.fileUrl || null
      }
    } catch (makeError) {
      console.error('Make webhook unreachable:', makeError)
    }

    const supabase = createServiceClient()
    await supabase.from('attendance').update({
      foto_url: driveUrl,
      catatan: driveUrl ? 'Foto tersimpan di Drive' : 'Foto diterima, menunggu sync ke Drive',
    }).eq('id', attendanceId)

    return NextResponse.json({ success: true, fileUrl: driveUrl })
  } catch (error: any) {
    console.error('Upload route error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
