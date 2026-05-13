import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import { formatarPreco, calcularLucro, calcularDiasEstoque } from '@/lib/utils'
import MonthPicker from '@/components/admin/MonthPicker'
import type { FinanceiroVeiculo, UsuarioPerfil } from '@/types'

interface SearchParams {
  mes?: string
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase.from('usuarios_perfil').select('*').eq('id', user.id).single()
  if (!perfilData) redirect('/login')
  const perfil = perfilData as UsuarioPerfil

  if (!['gerente', 'diretor', 'admin'].includes(perfil.perfil)) redirect('/admin/dashboard')

  const lojaId = await getLojaIdAtiva(perfil)

  let query = supabase
    .from('financeiro_veiculos')
    .select('*, veiculo:veiculos(marca, modelo, ano, data_aquisicao)')
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false })

  if (params.mes) {
    const [ano, mes] = params.mes.split('-')
    const inicio = new Date(parseInt(ano), parseInt(mes) - 1, 1).toISOString()
    const fim = new Date(parseInt(ano), parseInt(mes), 0).toISOString()
    query = query.gte('created_at', inicio).lte('created_at', fim)
  }

  const { data } = await query
  const registros = (data ?? []) as FinanceiroVeiculo[]

  const totais = registros.reduce(
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

  const margemMedia = totais.faturamento > 0 ? (totais.lucro / totais.faturamento) * 100 : 0
  const ticketMedio = totais.count > 0 ? totais.faturamento / totais.count : 0

  const agora = new Date()
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
            Financeiro
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">DRE por veículo</p>
        </div>
        <MonthPicker value={params.mes ?? mesAtual} basePath="/admin/financeiro" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Faturamento', valor: formatarPreco(totais.faturamento), cor: '#3B82F6' },
          { label: 'Custo total', valor: formatarPreco(totais.custo), cor: '#EF4444' },
          { label: 'Lucro total', valor: formatarPreco(totais.lucro), cor: '#16A34A' },
          { label: 'Margem média', valor: `${margemMedia.toFixed(1)}%`, cor: 'var(--cor-primaria)' },
          { label: 'Ticket médio', valor: formatarPreco(ticketMedio), cor: '#8B5CF6' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
            <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-2">{c.label}</p>
            <p className="font-[family-name:var(--font-barlow-condensed)] text-2xl font-black" style={{ color: c.cor }}>
              {c.valor}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#F8F8F8]">
                {['Veículo', 'Custo Aq.', 'Custos Extras', 'Custo Total', 'Preço Venda', 'Lucro Bruto', 'Margem %', 'Dias Estoque'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[#9CA3AF] font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#9CA3AF] text-sm">
                    Nenhum registro financeiro encontrado.
                  </td>
                </tr>
              ) : (
                registros.map(f => {
                  const r = calcularLucro(f)
                  const extras = f.custos_adicionais.reduce((a, c) => a + c.valor, 0)
                  const dias = f.veiculo ? calcularDiasEstoque(f.veiculo.data_aquisicao!, f.data_venda) : 0
                  const lucroPositivo = r.lucro_bruto >= 0

                  return (
                    <tr key={f.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-4 py-3 text-[#111] font-medium whitespace-nowrap">
                        {f.veiculo ? `${f.veiculo.marca} ${f.veiculo.modelo} ${f.veiculo.ano}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">{formatarPreco(f.custo_aquisicao)}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{formatarPreco(extras)}</td>
                      <td className="px-4 py-3 text-[#111]">{formatarPreco(r.custo_total)}</td>
                      <td className="px-4 py-3 text-[#111]">
                        {f.preco_venda ? formatarPreco(f.preco_venda) : '—'}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${lucroPositivo ? 'text-green-700' : 'text-red-600'}`}>
                        {formatarPreco(r.lucro_bruto)}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${lucroPositivo ? 'text-green-700' : 'text-red-600'}`}>
                        {r.margem_percentual.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF]">{dias}d</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {registros.length > 0 && (
        <div className="mt-6 bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
          <h2 className="text-[#111] font-semibold text-sm mb-4">Detalhamento por veículo</h2>
          <div className="space-y-3">
            {registros.map(f => {
              const r = calcularLucro(f)
              const pct = totais.faturamento > 0 ? ((f.preco_venda ?? 0) / totais.faturamento) * 100 : 0
              return (
                <div key={f.id} className="flex items-center gap-3">
                  <span className="text-[#6B7280] text-xs w-40 shrink-0 truncate">
                    {f.veiculo ? `${f.veiculo.marca} ${f.veiculo.modelo}` : '—'}
                  </span>
                  <div className="flex-1 bg-[#F0F0F0] rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: r.lucro_bruto >= 0 ? '#16A34A' : '#DC2626',
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span className={`text-xs w-24 shrink-0 font-medium ${r.lucro_bruto >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {formatarPreco(r.lucro_bruto)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
