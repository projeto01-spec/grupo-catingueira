'use client'

import { useState } from 'react'
import { formatarPreco } from '@/lib/utils'

interface MesData {
  label: string
  faturamento: number
  lucro: number
  count: number
}

interface VeiculoStatus {
  status: string
  count: number
}

interface VendedorLead {
  nome: string
  total: number
  fechados: number
}

interface FinanceiroRow {
  id: string
  veiculo: string
  custo_aquisicao: number
  extras: number
  custo_total: number
  preco_venda: number | null
  lucro: number
  margem: number
}

interface Props {
  meses: MesData[]
  leadsPorStatus: Record<string, number>
  leadsPorOrigem: Record<string, number>
  totalLeads: number
  veiculosPorStatus: VeiculoStatus[]
  vendedoresLeads: VendedorLead[]
  financeiros: FinanceiroRow[]
  totais: { faturamento: number; custo: number; lucro: number; count: number }
}

const statusCor: Record<string, string> = {
  novo: '#3B82F6',
  contato_feito: '#F59E0B',
  negociando: '#F97316',
  fechado: '#22C55E',
  perdido: '#EF4444',
}

const statusLabel: Record<string, string> = {
  novo: 'Novo',
  contato_feito: 'Contato feito',
  negociando: 'Negociando',
  fechado: 'Fechado',
  perdido: 'Perdido',
}

const origemCor: Record<string, string> = {
  site: '#8B5CF6',
  whatsapp: '#16A34A',
  instagram: '#EC4899',
  indicacao: '#3B82F6',
  outros: '#9CA3AF',
}

const veiculoStatusCor: Record<string, string> = {
  disponivel: '#16A34A',
  reservado: '#D97706',
  vendido: '#DC2626',
  manutencao: '#6B7280',
}

const tabs = ['Estoque', 'Vendas', 'Financeiro', 'Leads', 'Vendedores'] as const
type Tab = typeof tabs[number]

export default function RelatoriosClient({
  meses,
  leadsPorStatus,
  leadsPorOrigem,
  totalLeads,
  veiculosPorStatus,
  vendedoresLeads,
  financeiros,
  totais,
}: Props) {
  const [tab, setTab] = useState<Tab>('Vendas')

  const maxFaturamento = Math.max(...meses.map(m => m.faturamento), 1)
  const maxLucro = Math.max(...meses.map(m => Math.abs(m.lucro)), 1)
  const totalVeiculos = veiculosPorStatus.reduce((a, v) => a + v.count, 0)

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-[#E5E5E5]">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-[var(--cor-primaria)] text-[var(--cor-primaria)]'
                : 'border-transparent text-[#6B7280] hover:text-[#111]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Estoque */}
      {tab === 'Estoque' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {veiculosPorStatus.map(v => (
              <div key={v.status} className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
                <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-2 capitalize">{v.status}</p>
                <p className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black" style={{ color: veiculoStatusCor[v.status] ?? '#111' }}>
                  {v.count}
                </p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
            <h3 className="text-[#111] font-semibold text-sm mb-4">Distribuição do estoque</h3>
            <div className="space-y-3">
              {veiculosPorStatus.map(v => {
                const pct = totalVeiculos > 0 ? (v.count / totalVeiculos) * 100 : 0
                return (
                  <div key={v.status} className="flex items-center gap-3">
                    <span className="text-[#6B7280] text-xs w-24 shrink-0 capitalize">{v.status}</span>
                    <div className="flex-1 bg-[#F0F0F0] rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: veiculoStatusCor[v.status] ?? '#E5E5E5', opacity: 0.8 }}
                      />
                    </div>
                    <span className="text-[#9CA3AF] text-xs w-20 shrink-0">{v.count} ({pct.toFixed(0)}%)</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Vendas */}
      {tab === 'Vendas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Vendas (12m)', valor: String(totais.count), cor: '#3B82F6' },
              { label: 'Faturamento', valor: formatarPreco(totais.faturamento), cor: '#16A34A' },
              { label: 'Lucro total', valor: formatarPreco(totais.lucro), cor: 'var(--cor-primaria)' },
              { label: 'Ticket médio', valor: totais.count > 0 ? formatarPreco(totais.faturamento / totais.count) : '—', cor: '#8B5CF6' },
            ].map(c => (
              <div key={c.label} className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
                <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-2">{c.label}</p>
                <p className="font-[family-name:var(--font-barlow-condensed)] text-2xl font-black" style={{ color: c.cor }}>
                  {c.valor}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
              <h3 className="text-[#111] font-semibold text-sm mb-5">Faturamento por mês</h3>
              <div className="space-y-2.5">
                {meses.map(m => (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="text-[#9CA3AF] text-xs w-12 shrink-0 text-right">{m.label}</span>
                    <div className="flex-1 bg-[#F0F0F0] rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(m.faturamento / maxFaturamento) * 100}%`, backgroundColor: 'var(--cor-primaria)', opacity: 0.8 }}
                      />
                    </div>
                    <span className="text-[#6B7280] text-xs w-24 shrink-0">
                      {m.faturamento > 0 ? formatarPreco(m.faturamento) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
              <h3 className="text-[#111] font-semibold text-sm mb-5">Lucro por mês</h3>
              <div className="space-y-2.5">
                {meses.map(m => (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="text-[#9CA3AF] text-xs w-12 shrink-0 text-right">{m.label}</span>
                    <div className="flex-1 bg-[#F0F0F0] rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(Math.abs(m.lucro) / maxLucro) * 100}%`, backgroundColor: m.lucro >= 0 ? '#16A34A' : '#DC2626', opacity: 0.8 }}
                      />
                    </div>
                    <span className={`text-xs w-24 shrink-0 ${m.lucro >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {m.lucro !== 0 ? formatarPreco(m.lucro) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financeiro */}
      {tab === 'Financeiro' && (
        <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F8F8F8]">
                  {['Veículo', 'Custo Aq.', 'Extras', 'Custo Total', 'Venda', 'Lucro', 'Margem %'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[#9CA3AF] font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {financeiros.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[#9CA3AF] text-sm">
                      Nenhum registro financeiro nos últimos 12 meses.
                    </td>
                  </tr>
                ) : (
                  financeiros.map(f => (
                    <tr key={f.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-4 py-3 text-[#111] font-medium whitespace-nowrap">{f.veiculo}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{formatarPreco(f.custo_aquisicao)}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{formatarPreco(f.extras)}</td>
                      <td className="px-4 py-3 text-[#111]">{formatarPreco(f.custo_total)}</td>
                      <td className="px-4 py-3 text-[#111]">{f.preco_venda ? formatarPreco(f.preco_venda) : '—'}</td>
                      <td className={`px-4 py-3 font-semibold ${f.lucro >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {formatarPreco(f.lucro)}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${f.lucro >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {f.margem.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leads */}
      {tab === 'Leads' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(statusLabel).map(([key, label]) => (
              <div key={key} className="bg-white border border-[#E5E5E5] rounded-xl p-4 shadow-sm">
                <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-2">{label}</p>
                <p className="font-[family-name:var(--font-barlow-condensed)] text-2xl font-black" style={{ color: statusCor[key] }}>
                  {leadsPorStatus[key] ?? 0}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
              <h3 className="text-[#111] font-semibold text-sm mb-5">Funil de leads</h3>
              {totalLeads === 0 ? (
                <p className="text-[#9CA3AF] text-sm">Nenhum lead registrado.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(statusLabel).map(([key, label]) => {
                    const count = leadsPorStatus[key] ?? 0
                    const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-[#6B7280] text-xs w-28 shrink-0">{label}</span>
                        <div className="flex-1 bg-[#F0F0F0] rounded-full h-5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: statusCor[key], opacity: 0.7 }}
                          />
                        </div>
                        <span className="text-[#9CA3AF] text-xs w-16 shrink-0">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
              <h3 className="text-[#111] font-semibold text-sm mb-5">Leads por origem</h3>
              {totalLeads === 0 ? (
                <p className="text-[#9CA3AF] text-sm">Nenhum lead registrado.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(leadsPorOrigem)
                    .sort(([, a], [, b]) => b - a)
                    .map(([origem, count]) => {
                      const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0
                      return (
                        <div key={origem} className="flex items-center gap-3">
                          <span className="text-[#6B7280] text-xs w-24 shrink-0 capitalize">{origem}</span>
                          <div className="flex-1 bg-[#F0F0F0] rounded-full h-5 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: origemCor[origem] ?? '#9CA3AF', opacity: 0.7 }}
                            />
                          </div>
                          <span className="text-[#9CA3AF] text-xs w-16 shrink-0">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vendedores */}
      {tab === 'Vendedores' && (
        <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
          {vendedoresLeads.length === 0 ? (
            <p className="px-5 py-12 text-center text-[#9CA3AF] text-sm">Nenhum dado de vendedores disponível.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#F8F8F8]">
                    {['Vendedor', 'Total de leads', 'Leads fechados', 'Taxa de conversão'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[#9CA3AF] font-medium text-xs uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {vendedoresLeads.map(v => {
                    const taxa = v.total > 0 ? (v.fechados / v.total) * 100 : 0
                    return (
                      <tr key={v.nome} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-4 py-3 text-[#111] font-medium">{v.nome}</td>
                        <td className="px-4 py-3 text-[#6B7280]">{v.total}</td>
                        <td className="px-4 py-3 text-green-700 font-medium">{v.fechados}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-[#F0F0F0] rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-green-500"
                                style={{ width: `${taxa}%` }}
                              />
                            </div>
                            <span className="text-[#6B7280] text-xs">{taxa.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
