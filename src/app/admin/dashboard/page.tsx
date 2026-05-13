import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createServerSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import { formatarPreco } from '@/lib/utils'
import type { Veiculo, Lead, UsuarioPerfil, Lembrete } from '@/types'
import LembretesCard from './LembretesCard'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase
    .from('usuarios_perfil').select('*').eq('id', user.id).single()
  const perfil = perfilData as UsuarioPerfil | null
  if (!perfil) redirect('/login')

  const lojaId = await getLojaIdAtiva(perfil)
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
  const hoje = agora.toISOString().split('T')[0]

  const [
    { count: totalEstoque },
    { data: vendidosMes },
    { data: financeiros },
    { count: leadsNovos },
    { data: ultimosVeiculos },
    { data: ultimosLeads },
    { data: lembretesHoje },
  ] = await Promise.all([
    supabase.from('veiculos').select('*', { count: 'exact', head: true }).eq('loja_id', lojaId).eq('status', 'disponivel'),
    supabase.from('veiculos').select('id').eq('loja_id', lojaId).eq('status', 'vendido').gte('created_at', inicioMes),
    supabase.from('financeiro_veiculos').select('custo_aquisicao, custos_adicionais, preco_venda').eq('loja_id', lojaId).not('preco_venda', 'is', null),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('loja_id', lojaId).eq('status', 'novo'),
    supabase.from('veiculos').select('*').eq('loja_id', lojaId).order('created_at', { ascending: false }).limit(5),
    supabase.from('leads').select('*').eq('loja_id', lojaId).order('created_at', { ascending: false }).limit(5),
    supabase.from('lembretes').select('*, lead:leads(nome, telefone), veiculo:veiculos(marca, modelo, ano)').eq('loja_id', lojaId).eq('concluido', false).lte('data_lembrete', hoje).order('data_lembrete'),
  ])

  const lucroMedio = financeiros && financeiros.length > 0
    ? financeiros.reduce((acc, f) => {
        const extras = (f.custos_adicionais as { valor: number }[]).reduce((s, c) => s + c.valor, 0)
        return acc + (f.preco_venda! - f.custo_aquisicao - extras)
      }, 0) / financeiros.length
    : 0

  const metricas = [
    { label: 'Em estoque', valor: String(totalEstoque ?? 0), sub: 'veículos disponíveis', cor: '#3B82F6', bgCor: '#EFF6FF' },
    { label: 'Vendidos no mês', valor: String(vendidosMes?.length ?? 0), sub: 'este mês', cor: '#16A34A', bgCor: '#F0FDF4' },
    { label: 'Lucro médio', valor: formatarPreco(lucroMedio), sub: 'por veículo vendido', cor: 'var(--cor-primaria)', bgCor: 'color-mix(in srgb, var(--cor-primaria) 10%, transparent)' },
    { label: 'Leads novos', valor: String(leadsNovos ?? 0), sub: 'aguardando contato', cor: '#D97706', bgCor: '#FFFBEB' },
  ]

  const veiculos = (ultimosVeiculos ?? []) as Veiculo[]
  const leads = (ultimosLeads ?? []) as Lead[]
  const lembretes = (lembretesHoje ?? []) as Lembrete[]

  const statusBadge: Record<string, string> = {
    disponivel: 'bg-green-50 text-green-700 border-green-200',
    reservado: 'bg-amber-50 text-amber-700 border-amber-200',
    vendido: 'bg-red-50 text-red-700 border-red-200',
    manutencao: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  const leadStatusBadge: Record<string, string> = {
    novo: 'bg-blue-50 text-blue-700 border-blue-200',
    contato_feito: 'bg-amber-50 text-amber-700 border-amber-200',
    negociando: 'bg-orange-50 text-orange-700 border-orange-200',
    fechado: 'bg-green-50 text-green-700 border-green-200',
    perdido: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
          Dashboard
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">Visão geral da sua loja</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metricas.map(m => (
          <div key={m.label} className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
            <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-2">{m.label}</p>
            <p
              className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black"
              style={{ color: m.cor }}
            >
              {m.valor}
            </p>
            <p className="text-[#9CA3AF] text-xs mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {lembretes.length > 0 && (
        <div className="mb-6">
          <LembretesCard lembretes={lembretes} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
            <h2 className="text-[#111] font-semibold text-sm">Últimos veículos</h2>
            <Link href="/admin/veiculos" className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--cor-primaria)' }}>
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            {veiculos.length === 0 ? (
              <p className="px-5 py-6 text-[#9CA3AF] text-sm text-center">Nenhum veículo cadastrado.</p>
            ) : (
              veiculos.map(v => (
                <div key={v.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-12 h-9 rounded-md overflow-hidden bg-[#F5F5F5] shrink-0">
                    {v.fotos[0] ? (
                      <Image src={v.fotos[0]} alt="" width={48} height={36} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#D0D0D0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#111] text-sm font-medium truncate">{v.marca} {v.modelo} {v.ano}</p>
                    <p className="text-[#9CA3AF] text-xs">{formatarPreco(v.preco)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${statusBadge[v.status]}`}>
                    {v.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
            <h2 className="text-[#111] font-semibold text-sm">Últimos leads</h2>
            <Link href="/admin/crm" className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--cor-primaria)' }}>
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            {leads.length === 0 ? (
              <p className="px-5 py-6 text-[#9CA3AF] text-sm text-center">Nenhum lead registrado.</p>
            ) : (
              leads.map(l => (
                <div key={l.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[#111] text-sm font-medium">{l.nome}</p>
                    <p className="text-[#9CA3AF] text-xs">{l.telefone}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${leadStatusBadge[l.status]}`}>
                    {l.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
