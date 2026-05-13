'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveAquisicao, saveCustoManutencao, deleteCustoManutencao } from '@/app/actions'
import { formatarPreco, calcularDiasEstoque } from '@/lib/utils'
import type { Veiculo, FinanceiroVeiculo, CustoManutencao } from '@/types'

const CATEGORIAS = ['Manutenção', 'Transporte', 'Estética', 'Documentação', 'Outros']

interface Props {
  veiculo: Veiculo
  financeiro: FinanceiroVeiculo | null
  custos: CustoManutencao[]
  lojaId: string
}

interface NovoCusto {
  categoria: string
  descricao: string
  valor: string
  data: string
}

const inputCls = 'w-full bg-[#F8F8F8] border border-[#E5E5E5] rounded-lg px-3 py-2 text-[#111] text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors placeholder-[#D0D0D0]'
const labelCls = 'block text-[#9CA3AF] text-xs uppercase tracking-wider mb-1.5'

export default function CustosVeiculoClient({ veiculo, financeiro, custos: initialCustos, lojaId }: Props) {
  const router = useRouter()

  // ── Aquisição ─────────────────────────────────────────────────────────────
  const [custoAquisicao, setCustoAquisicao] = useState(
    String(financeiro?.custo_aquisicao ?? '')
  )
  const [salvandoAquisicao, setSalvandoAquisicao] = useState(false)
  const [aquisicaoOk, setAquisicaoOk] = useState(false)

  // ── Custos adicionais ─────────────────────────────────────────────────────
  const [custos, setCustos] = useState(initialCustos)
  const [adicionando, setAdicionando] = useState(false)
  const [novoCusto, setNovoCusto] = useState<NovoCusto>({
    categoria: CATEGORIAS[0],
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
  })
  const [salvandoCusto, setSalvandoCusto] = useState(false)
  const [deletandoCusto, setDeletandoCusto] = useState<string | null>(null)

  // ── Calculations ──────────────────────────────────────────────────────────
  const custoAqNum = parseFloat(custoAquisicao.replace(',', '.')) || 0
  const totalAdicionais = custos.reduce((a, c) => a + c.valor, 0)
  const custoTotal = custoAqNum + totalAdicionais
  const precoVenda = financeiro?.preco_venda ?? veiculo.preco
  const lucroBruto = precoVenda - custoAqNum
  const lucroLiquido = precoVenda - custoTotal
  const margem = precoVenda > 0 ? (lucroLiquido / precoVenda) * 100 : 0
  const diasEstoque = calcularDiasEstoque(veiculo.data_aquisicao, financeiro?.data_venda)

  async function handleSalvarAquisicao(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoAquisicao(true)
    setAquisicaoOk(false)
    try {
      await saveAquisicao(veiculo.id, lojaId, custoAqNum, financeiro?.id)
      setAquisicaoOk(true)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvandoAquisicao(false)
    }
  }

  async function handleAdicionarCusto(e: React.FormEvent) {
    e.preventDefault()
    const valor = parseFloat(novoCusto.valor.replace(',', '.'))
    if (!novoCusto.descricao.trim() || isNaN(valor) || valor <= 0) return
    setSalvandoCusto(true)
    try {
      await saveCustoManutencao({
        veiculo_id: veiculo.id,
        loja_id: lojaId,
        categoria: novoCusto.categoria,
        descricao: novoCusto.descricao,
        valor,
        data: novoCusto.data || null,
      })
      setCustos(prev => [...prev, {
        id: Date.now().toString(),
        veiculo_id: veiculo.id,
        loja_id: lojaId,
        categoria: novoCusto.categoria,
        descricao: novoCusto.descricao,
        valor,
        data: novoCusto.data || null,
        created_at: new Date().toISOString(),
      }])
      setNovoCusto({ categoria: CATEGORIAS[0], descricao: '', valor: '', data: new Date().toISOString().split('T')[0] })
      setAdicionando(false)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar custo')
    } finally {
      setSalvandoCusto(false)
    }
  }

  async function handleDeletar(id: string) {
    if (!confirm('Remover este custo?')) return
    setDeletandoCusto(id)
    try {
      await deleteCustoManutencao(id, veiculo.id)
      setCustos(prev => prev.filter(c => c.id !== id))
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao deletar')
    } finally {
      setDeletandoCusto(null)
    }
  }

  return (
    <div className="mt-10 space-y-6">
      <h2 className="font-[family-name:var(--font-barlow-condensed)] text-xl font-black uppercase text-[#111] tracking-wide">
        Controle Financeiro
      </h2>

      {/* ── Card Aquisição ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
        <h3 className="text-[#111] font-semibold text-sm mb-4">Custo de aquisição</h3>
        <form onSubmit={handleSalvarAquisicao} className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className={labelCls}>Valor de aquisição (R$)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={custoAquisicao}
              onChange={e => setCustoAquisicao(e.target.value)}
              className={inputCls}
              placeholder="0,00"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={salvandoAquisicao}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-[#111] transition-all hover:brightness-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--cor-primaria)' }}
            >
              {salvandoAquisicao ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
          {aquisicaoOk && <span className="text-green-600 text-sm">✓ Salvo</span>}
        </form>
      </div>

      {/* ── Card Custos Adicionais ─────────────────────────────────────────── */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <h3 className="text-[#111] font-semibold text-sm">Custos adicionais</h3>
          <button
            onClick={() => setAdicionando(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E5E5E5] text-[#6B7280] hover:text-[#111] hover:border-[#D0D0D0] transition-colors bg-white"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar custo
          </button>
        </div>

        {/* Add form */}
        {adicionando && (
          <form onSubmit={handleAdicionarCusto} className="px-5 py-4 bg-[#FAFAFA] border-b border-[#E5E5E5]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className={labelCls}>Categoria</label>
                <select value={novoCusto.categoria} onChange={e => setNovoCusto(p => ({ ...p, categoria: e.target.value }))} className={inputCls}>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Descrição</label>
                <input
                  required
                  value={novoCusto.descricao}
                  onChange={e => setNovoCusto(p => ({ ...p, descricao: e.target.value }))}
                  className={inputCls}
                  placeholder="Ex: Troca de óleo"
                />
              </div>
              <div>
                <label className={labelCls}>Valor (R$)</label>
                <input
                  required
                  type="number"
                  min={0}
                  step={0.01}
                  value={novoCusto.valor}
                  onChange={e => setNovoCusto(p => ({ ...p, valor: e.target.value }))}
                  className={inputCls}
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className={labelCls}>Data</label>
                <input
                  type="date"
                  value={novoCusto.data}
                  onChange={e => setNovoCusto(p => ({ ...p, data: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={salvandoCusto}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#111] transition-all hover:brightness-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--cor-primaria)' }}
              >
                {salvandoCusto ? 'Salvando...' : 'Adicionar'}
              </button>
              <button
                type="button"
                onClick={() => setAdicionando(false)}
                className="px-4 py-2 rounded-lg text-sm text-[#6B7280] hover:text-[#111] border border-[#E5E5E5] hover:border-[#D0D0D0] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        {custos.length === 0 ? (
          <p className="px-5 py-8 text-center text-[#9CA3AF] text-sm">Nenhum custo adicional registrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8F8F8]">
                  {['Categoria', 'Descrição', 'Valor', 'Data', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-[#9CA3AF] font-medium text-xs uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {custos.map(c => (
                  <tr key={c.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-[#F0F0F0] text-[#6B7280]">{c.categoria}</span>
                    </td>
                    <td className="px-4 py-3 text-[#111]">{c.descricao}</td>
                    <td className="px-4 py-3 text-[#111] font-medium">{formatarPreco(c.valor)}</td>
                    <td className="px-4 py-3 text-[#9CA3AF] text-xs">
                      {c.data ? new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeletar(c.id)}
                        disabled={deletandoCusto === c.id}
                        className="text-[#9CA3AF] hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#E5E5E5] bg-[#F8F8F8]">
                  <td colSpan={2} className="px-4 py-2 text-[#9CA3AF] text-xs font-medium uppercase tracking-wider">Total adicionais</td>
                  <td className="px-4 py-2 text-[#111] font-bold">{formatarPreco(totalAdicionais)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Card Resultado ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
        <h3 className="text-[#111] font-semibold text-sm mb-4">Resultado</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Custo de aquisição', valor: formatarPreco(custoAqNum), cor: 'text-[#111]' },
            { label: 'Custos adicionais', valor: formatarPreco(totalAdicionais), cor: 'text-[#111]' },
            { label: 'Custo total', valor: formatarPreco(custoTotal), cor: 'text-[#111] font-bold' },
            {
              label: financeiro?.preco_venda ? 'Preço de venda' : 'Preço anunciado',
              valor: formatarPreco(precoVenda),
              cor: 'text-[#111]',
            },
            {
              label: 'Lucro bruto',
              valor: formatarPreco(lucroBruto),
              cor: lucroBruto >= 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold',
            },
            {
              label: 'Lucro líquido',
              valor: formatarPreco(lucroLiquido),
              cor: lucroLiquido >= 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold',
            },
            {
              label: 'Margem %',
              valor: `${margem.toFixed(1)}%`,
              cor: margem >= 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold',
            },
            { label: 'Dias em estoque', valor: `${diasEstoque}d`, cor: 'text-[#6B7280]' },
          ].map(item => (
            <div key={item.label} className="bg-[#F8F8F8] rounded-lg p-3">
              <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">{item.label}</p>
              <p className={`text-lg font-[family-name:var(--font-barlow-condensed)] font-black ${item.cor}`}>
                {item.valor}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
