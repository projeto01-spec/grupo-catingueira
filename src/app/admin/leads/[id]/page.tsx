import { notFound, redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import type { Lead, LeadInteracao, MensagemPadrao, UsuarioPerfil } from '@/types'
import LeadDetailClient from './LeadDetailClient'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
  if (!perfilData) redirect('/login')
  const perfil = perfilData as UsuarioPerfil

  const lojaId = await getLojaIdAtiva(perfil)

  const [{ data: leadData }, { data: interacoesData }, { data: vendedoresData }, { data: templatesData }] =
    await Promise.all([
      supabase
        .from('leads')
        .select('*, veiculo:veiculos(id, marca, modelo, ano)')
        .eq('id', id)
        .eq('loja_id', lojaId)
        .single(),
      supabase
        .from('lead_interacoes')
        .select('*, usuario:usuarios_perfil(nome)')
        .eq('lead_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('usuarios_perfil')
        .select('id, nome')
        .eq('loja_id', lojaId),
      supabase
        .from('mensagens_padrao')
        .select('*')
        .eq('loja_id', lojaId)
        .order('titulo'),
    ])

  if (!leadData) notFound()

  const lead = leadData as Lead
  const interacoes = (interacoesData ?? []) as LeadInteracao[]
  const vendedores = (vendedoresData ?? []) as { id: string; nome: string }[]
  const templates = (templatesData ?? []) as MensagemPadrao[]

  const criadorNome = lead.criado_por
    ? (vendedores.find(v => v.id === lead.criado_por)?.nome ?? null)
    : null

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <a
        href="/admin/crm"
        className="text-[#6B7280] hover:text-[#111] text-sm transition-colors inline-flex items-center gap-1 mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar ao CRM
      </a>

      <LeadDetailClient
        lead={lead}
        interacoes={interacoes}
        vendedores={vendedores}
        templates={templates}
        lojaId={lojaId}
        userId={user.id}
        criadorNome={criadorNome}
      />
    </div>
  )
}
