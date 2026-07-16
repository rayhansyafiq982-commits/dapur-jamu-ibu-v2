import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createServiceClient } from '@/lib/supabase'

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!

async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

async function ensureSheet(sheets: any, title: string, headers: string[]) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const existing = meta.data.sheets?.find((s: any) => s.properties?.title === title)
  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    })
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${title}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    })
  }
}

async function deleteRowsByDate(sheets: any, sheetTitle: string, tanggal: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetTitle}!A:A`,
  })
  const rows = res.data.values || []
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const sheetId = sheetMeta.data.sheets?.find((s: any) => s.properties?.title === sheetTitle)?.properties?.sheetId

  const deleteRequests: any[] = []
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i]?.[0] === tanggal) {
      deleteRequests.push({
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: i, endIndex: i + 1 }
        }
      })
    }
  }

  if (deleteRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: deleteRequests },
    })
  }
}

function fmtTime(ts: string | null): string {
  if (!ts) return '–'
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })
}

export async function POST(request: NextRequest) {
  try {
    const { tanggal, type } = await request.json()
    const supabase = createServiceClient()
    const sheets = await getSheets()

    // ── ABSENSI ──
    if (!type || type === 'absensi') {
      await ensureSheet(sheets, 'Absensi', ['Tanggal', 'Nama', 'Divisi', 'Jam Masuk', 'Jam Pulang', 'Poin', 'Status', 'Foto'])
      await deleteRowsByDate(sheets, 'Absensi', tanggal)

      const { data: attData } = await supabase
        .from('attendance')
        .select('*, profiles(full_name, divisi)')
        .eq('tanggal', tanggal)

      if (attData && attData.length > 0) {
        const rows = attData.map(att => [
          att.tanggal,
          att.profiles?.full_name || '-',
          att.profiles?.divisi || '-',
          fmtTime(att.jam_masuk),
          fmtTime(att.jam_pulang),
          att.poin || 0,
          att.status || '-',
          att.foto_url || '-',
        ])
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Absensi!A:H',
          valueInputOption: 'RAW',
          requestBody: { values: rows },
        })
      }
    }

    // ── PLANNING ──
    if (!type || type === 'planning') {
      await ensureSheet(sheets, 'Planning Harian', ['Tanggal', 'Nama', 'Divisi', 'Tugas', 'Direncanakan', 'Selesai', 'Catatan Planning', 'Catatan Aktual'])
      await deleteRowsByDate(sheets, 'Planning Harian', tanggal)

      const { data: planData } = await supabase
        .from('daily_planning')
        .select('*, attendance!inner(tanggal, profiles(full_name, divisi)), daily_tasks(nama_tugas)')
        .eq('attendance.tanggal', tanggal)
        .eq('is_planned', true)

      if (planData && planData.length > 0) {
        const rows = planData.map((p: any) => [
          p.attendance?.tanggal || tanggal,
          p.attendance?.profiles?.full_name || '-',
          p.attendance?.profiles?.divisi || '-',
          p.daily_tasks?.nama_tugas || '-',
          p.is_planned ? '✅' : '❌',
          p.is_completed ? '✅' : '❌',
          p.catatan_planning || '-',
          p.catatan_aktual || '-',
        ])
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Planning Harian!A:H',
          valueInputOption: 'RAW',
          requestBody: { values: rows },
        })
      }
    }

    // ── PICA ──
    if (!type || type === 'pica') {
      await ensureSheet(sheets, 'PICA', ['Tanggal', 'Nama', 'Tugas', 'Masalah', 'Akar Penyebab', 'Rencana Perbaikan', 'Target Selesai', 'Status'])

      const { data: picaData } = await supabase
        .from('pica')
        .select('*, profiles(full_name), daily_planning(*, daily_tasks(nama_tugas))')
        .order('created_at', { ascending: false })

      if (picaData && picaData.length > 0) {
        // Hapus semua data PICA dulu lalu tulis ulang
        const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'PICA!A:A' })
        const rows = res.data.values || []
        const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
        const sheetId = sheetMeta.data.sheets?.find((s: any) => s.properties?.title === 'PICA')?.properties?.sheetId

        if (rows.length > 1) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
              requests: [{
                deleteDimension: {
                  range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: rows.length }
                }
              }]
            }
          })
        }

        const newRows = picaData.map((p: any) => [
          p.created_at ? new Date(p.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }) : '-',
          p.profiles?.full_name || '-',
          p.daily_planning?.daily_tasks?.nama_tugas || '-',
          p.identifikasi_masalah || '-',
          p.akar_penyebab || '-',
          p.rencana_perbaikan || '-',
          p.target_selesai || '-',
          p.status === 'closed' ? '✅ Closed' : '🔴 Open',
        ])
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'PICA!A:H',
          valueInputOption: 'RAW',
          requestBody: { values: newRows },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Sync sheets error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
