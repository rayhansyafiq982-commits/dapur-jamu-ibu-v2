import { NextRequest, NextResponse } from 'next/server'

const MAKE_DRIVE_WEBHOOK_URL = 'https://hook.eu1.make.com/yikrsiksdg3dhrw0t81tfbb6hplok4cq'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('photo') as File
    const userName = formData.get('userName') as string
    const tanggal = formData.get('tanggal') as string
    const attendanceId = formData.get('attendanceId') as string

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64Data = buffer.toString('base64')

    // Kirim ke Make.com tanpa menunggu response
    fetch(MAKE_DRIVE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photo: base64Data,
        userName,
        tanggal,
        attendanceId,
      }),
    }).catch(err => console.error('Make webhook error:', err))

    return NextResponse.json({ success: true, message: 'Foto sedang diproses' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
