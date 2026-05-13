import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import { calcularLucro } from '@/lib/utils'
import RelatoriosClient from './RelatoriosClient'
import type { FinanceiroVeiculo, UsuarioPerfil } from '@/types'

export default async function RelatoriosPage() {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase.from('usuarios_perfil').select('*').eq('id', user.id).single()
  const perfil = perfilData as UsuarioPerfil | null
  if (!perfil) redirect('/login')
  if (!['gerente', 'diretor', 'admin'].includes(perfil.perfil)) redirect('/admin/dashboard')

  const lojaId = await getLojaIdAtiva(perfil)

  const dozeAtras = new Date()
  dozeAtras.setMonth(dozeAtras.getMonth() - 11)
  dozeAtras.setDate(1)

  const [
    { data: finData },
    { data: leadsData },
    { data: veiculosData },
    { data: vendedoresData },
  ] = await Promise.all([
    supabase
      .from('financeiro_veiculos')
      .select('*, veiculo:veiculos(marca, modelo, ano, data_aquisicao)')
      .eq('loja_id', lojaId)
      .not('preco_venda', 'is', null)
      .gte('created_at', dozeAtras.toISOString())
      .order('created_at'),
    supabase.from('leads').select('status, origem, responsavel_id').eq('loja_id', lojaId),
    supabase.from('veiculos').select('status').eq('loja_id', lojaId),
    supabase.from('usuarios_perfil').select('id, nome').eq('loja_id', lojaId),
  ])

  const financeiros = (finData ?? []) as FinanceiroVeiculo[]

  const leads = (leadsData ?? []) as { status: string; origem: string; responsavel_id: string | null }[]
  const veiculos = (veiculosData ?? []) as { status: string }[]
  const vendedores = (vendedoresData ?? []) as { id: string; nome: string }[]

  // Monthly data
  const mesesMap = new Map<string, { label: string; faturamento: number; lucro: number; count: number }>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    mesesMap.set(key, { label, faturamento: 0, lucro: 0, count: 0 })
  }

  for (const f of financeiros) {
    const d = new Date(f.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const mes = mesesMap.get(key)
    if (!mes) continue
    const extras = f.custos_adicionais.reduce((a, c) => a + c.valor, 0)
    mes.faturamento += f.preco_venda ?? 0
    mes.lucro += (f.preco_venda ?? 0) - f.custo_aquisicao - extras
    mes.count += 1
  }

  const meses = Array.from(mesesMap.values())

  // Totals
  const totais = financeiros.reduce(
    (acc, f) => {
      const r = calcularLucro(f)
      return {
        faturamento: acc.faturamento + (f.preco_venda ?? 0),
        custo: acc.custo + r.custo_total,
        lucro: acc.lucro + r.lucro_bruto,
        count: acc.count + 1,
      }
    },
    { faturamento: 0, custo: 0, lucro: 0, count: 0 }
  )

  // Leads grouping
  const leadsPorStatus = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {})

  const leadsPorOrigem = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.origem] = (acc[l.origem] ?? 0) + 1
    return acc
  }, {})

  // Veiculos por status
  const veiculosMap = veiculos.reduce<Record<string, number>>((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1
    return acc
  }, {})
  const veiculosPorStatus = Object.entries(veiculosMap).map(([status, count]) => ({ status, count }))

  // Vendedores leads
  const vendedoresLeads = vendedores.map(v => {
    const leadsVendedor = leads.filter(l => l.responsavel_id === v.id)
    return {
      nome: v.nome,
      total: leadsVendedor.length,
      fechados: leadsVendedor.filter(l => l.status === 'fechado').length,
    }
  }).filter(v => v.total > 0).sort((a, b) => b.total - a.total)

  // Financeiro rows
  const financeiroRows = financeiros.map(f => {
    const r = calcularLucro(f)
    return {
      id: f.id,
      veiculo: f.veiculo ? `${f.veiculo.marca} ${f.veiculo.modelo} ${f.veiculo.ano}` : '—',
      custo_aquisicao: f.custo_aquisicao,
      extras: f.custos_adicionais.reduce((a, c) => a + c.valor, 0),
      custo_total: r.custo_total,
      preco_venda: f.preco_venda,
      lucro: r.lucro_bruto,
      margem: r.margem_percentual,
    }
  })

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
          Relatórios
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">Últimos 12 meses</p>
      </div>

      <RelatoriosClient
        meses={meses}
        leadsPorStatus={leadsPorStatus}
        leadsPorOrigem={leadsPorOrigem}
        totalLeads={leads.length}
        veiculosPorStatus={veiculosPorStatus}
        vendedoresLeads={vendedoresLeads}
        financeiros={financeiroRows}
        totais={totais}
      />
    </div>
  )
}
