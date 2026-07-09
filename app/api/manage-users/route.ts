import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET — ambil semua user
export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name')
    if (error) throw error
    return NextResponse.json({ profiles })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — tambah user baru
export async function POST(request: NextRequest) {
  try {
    const { full_name, email, password, role, divisi } = await request.json()
    if (!full_name || !email || !password) {
      return NextResponse.json({ error: 'Nama, email, dan password wajib diisi' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Buat auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) throw authError

    // Buat profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      full_name,
      role: role || 'karyawan',
      divisi: divisi || null,
      is_active: true,
    })
    if (profileError) throw profileError

    return NextResponse.json({ success: true, user: authData.user })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH — update data user
export async function PATCH(request: NextRequest) {
  try {
    const { id, full_name, divisi, role, is_active, new_password } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID user wajib diisi' }, { status: 400 })

    const supabase = createServiceClient()

    // Update profile
    const { error: profileError } = await supabase.from('profiles').update({
      full_name,
      divisi,
      role,
      is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (profileError) throw profileError

    // Reset password jika ada
    if (new_password) {
      const { error: pwError } = await supabase.auth.admin.updateUserById(id, {
        password: new_password,
      })
      if (pwError) throw pwError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE — nonaktifkan user (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID user wajib diisi' }, { status: 400 })

    const supabase = createServiceClient()
    const { error } = await supabase.from('profiles').update({
      is_active: false,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
