import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import type { Loja, MensagemPadrao, UsuarioPerfil } from '@/types'
import ConfiguracoesForm from './ConfiguracoesForm'

export default async function ConfiguracoesPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase
    .from('usuarios_perfil')
    .select('*')
    .eq('id', user.id)
    .single()

  const perfil = perfilData as UsuarioPerfil | null
  if (!perfil) redirect('/login')
  if (!['gerente', 'diretor', 'admin'].includes(perfil.perfil)) redirect('/admin/dashboard')

  const lojaId = await getLojaIdAtiva(perfil)

  const [{ data: lojaData }, { data: templatesData }] = await Promise.all([
    supabase.from('lojas').select('*').eq('id', lojaId).single(),
    supabase.from('mensagens_padrao').select('*').eq('loja_id', lojaId).order('titulo'),
  ])

  if (!lojaData) redirect('/admin/dashboard')

  return (
    <ConfiguracoesForm
      loja={lojaData as Loja}
      templates={(templatesData ?? []) as MensagemPadrao[]}
    />
  )
}
