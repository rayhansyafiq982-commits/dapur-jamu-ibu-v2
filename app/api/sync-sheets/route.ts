import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/tos1azeoouffsr48kb3r99bh1bpatsx5'

function fmtTime(ts: string | null): string {
  if (!ts) return '–'
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
}

export async function POST(request: NextRequest) {
  try {
    const { tanggal } = await request.json()
    const supabase = createServiceClient()

    const { data: attData } = await supabase
      .from('attendance')
      .select('*, profiles(full_name)')
      .eq('tanggal', tanggal)

    const map: Record<string, any> = {}
    attData?.forEach((r: any) => { map[r.profiles.full_name] = r })

    const tanggalStr = new Date(tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

    const payload: Record<string, any> = { tanggal: tanggalStr }
    const nameMap: Record<string, string> = { Eka: 'eka', Dila: 'dila', Yuli: 'yuli' }

    for (const fullName of Object.keys(nameMap)) {
      const prefix = nameMap[fullName]
      const e = map[fullName]
      payload[`${prefix}_jm`] = e ? fmtTime(e.jam_masuk) : '–'
      payload[`${prefix}_jp`] = e ? fmtTime(e.jam_pulang) : '–'
      payload[`${prefix}_poin`] = e ? e.poin : 0
    }

    await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Make webhook sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
