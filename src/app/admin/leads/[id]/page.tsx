import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
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
        .select('*')
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

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <Link
          href="/admin/crm"
          className="text-[#555] hover:text-white text-sm transition-colors inline-flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar ao CRM
        </Link>
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-white">
          {lead.nome}
        </h1>
        <p className="text-[#555] text-sm mt-1">
          {new Date(lead.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>

      <LeadDetailClient
        lead={lead}
        interacoes={interacoes}
        vendedores={vendedores}
        templates={templates}
        lojaId={lojaId}
        userId={user.id}
      />
    </div>
  )
}
