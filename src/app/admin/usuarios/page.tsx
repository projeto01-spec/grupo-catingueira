import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import type { UsuarioPerfil, Loja } from '@/types'
import UsuariosClient from './UsuariosClient'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function UsuariosPage() {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase
    .from('usuarios_perfil')
    .select('*')
    .eq('id', user.id)
    .single()

  const perfil = perfilData as UsuarioPerfil | null
  if (!perfil) redirect('/login')
  if (!['diretor', 'admin'].includes(perfil.perfil)) redirect('/admin/dashboard')

  const { data: lojasData } = await supabase.from('lojas').select('*').order('nome')
  const lojas = (lojasData ?? []) as Loja[]

  const admin = adminClient()

  const lojaIds = lojas.map(l => l.id)
  let usuariosPerfil: (UsuarioPerfil & { loja: Loja | null })[] = []

  if (lojaIds.length > 0) {
    const { data } = await admin
      .from('usuarios_perfil')
      .select('*, loja:lojas(*)')
      .in('loja_id', lojaIds)
      .order('nome')
    usuariosPerfil = (data ?? []) as (UsuarioPerfil & { loja: Loja | null })[]
  }

  // Merge emails from auth.users
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap: Record<string, string> = {}
  for (const u of authData?.users ?? []) {
    emailMap[u.id] = u.email ?? ''
  }

  const usuarios = usuariosPerfil.map(u => ({ ...u, email: emailMap[u.id] ?? '' }))

  return <UsuariosClient perfil={perfil} usuarios={usuarios} lojas={lojas} />
}
