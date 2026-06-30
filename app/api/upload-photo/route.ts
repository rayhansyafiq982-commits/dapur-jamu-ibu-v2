import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Foto check-in diteruskan ke Make.com webhook untuk diupload ke Google Drive.
// Webhook: https://hook.eu1.make.com/yikrsiksdg3dhrw0t81tfbb6hplok4cq
// (Scenario di Make perlu dikonfigurasi: Webhook -> Google Drive "Upload a file")
const MAKE_DRIVE_WEBHOOK_URL = 'https://hook.eu1.make.com/yikrsiksdg3dhrw0t81tfbb6hplok4cq'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('photo') as File
    const userName = formData.get('userName') as string
    const tanggal = formData.get('tanggal') as string
    const attendanceId = formData.get('attendanceId') as string

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    // Forward foto ke Make.com sebagai multipart/form-data
    const forwardData = new FormData()
    forwardData.append('photo', file, `${tanggal}_${userName}_checkin.jpg`)
    forwardData.append('userName', userName)
    forwardData.append('tanggal', tanggal)
    forwardData.append('attendanceId', attendanceId)

    let driveUrl: string | null = null
    try {
      const makeResponse = await fetch(MAKE_DRIVE_WEBHOOK_URL, { method: 'POST', body: forwardData })
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
