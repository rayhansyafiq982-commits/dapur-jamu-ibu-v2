import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('photo') as File
    const userName = formData.get('userName') as string
    const tanggal = formData.get('tanggal') as string
    const attendanceId = formData.get('attendanceId') as string

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const supabase = createServiceClient()

    // Nama file: tanggal/NamaUser_timestamp.jpg
    const safeName = userName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const fileName = `${tanggal}/${safeName}_${Date.now()}.jpg`

    // Convert File ke Buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload ke Supabase Storage bucket "Foto-Absensi"
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('Foto-Absensi')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      await supabase.from('attendance').update({
        catatan: 'Gagal upload foto: ' + uploadError.message,
      }).eq('id', attendanceId)
      return NextResponse.json({ success: false, error: uploadError.message })
    }

    // Ambil public URL foto
    const { data: urlData } = supabase.storage
      .from('Foto-Absensi')
      .getPublicUrl(fileName)

    const publicUrl = urlData?.publicUrl ?? null

    // Update attendance dengan URL foto
    await supabase.from('attendance').update({
      foto_url: publicUrl,
      catatan: 'Foto tersimpan di Supabase Storage',
    }).eq('id', attendanceId)

    return NextResponse.json({ success: true, fileUrl: publicUrl })

  } catch (error: any) {
    console.error('Upload route error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
