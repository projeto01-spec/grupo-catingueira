'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveVistoria } from '@/app/actions'
import type { VistoriaVeiculo } from '@/types'

type Status = 'ok' | 'nok' | 'na'

const statusCls: Record<Status, string> = {
  ok: 'bg-green-50 text-green-700 border-green-200',
  nok: 'bg-red-50 text-red-700 border-red-200',
  na: 'bg-gray-100 text-gray-500 border-gray-200',
}

const statusInactiveCls = 'bg-white text-[#9CA3AF] border-[#E5E5E5] hover:border-[#D0D0D0]'

interface Props {
  veiculoId: string
  lojaId: string
  itensConfig: { key: string; label: string }[]
  vistoria: VistoriaVeiculo | null
}

export default function VistoriaClient({ veiculoId, lojaId, itensConfig, vistoria }: Props) {
  const router = useRouter()

  const initialItens = itensConfig.reduce<Record<string, Status>>((acc, item) => {
    acc[item.key] = (vistoria?.itens?.[item.key] as Status) ?? 'na'
    return acc
  }, {})

  const [itens, setItens] = useState<Record<string, Status>>(initialItens)
  const [observacoes, setObservacoes] = useState(vistoria?.observacoes ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  const nokCount = Object.values(itens).filter(v => v === 'nok').length
  const okCount = Object.values(itens).filter(v => v === 'ok').length
  const aprovado = nokCount === 0 && okCount > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    setSucesso(false)
    try {
      await saveVistoria(veiculoId, lojaId, itens, observacoes, aprovado, vistoria?.id)
      setSucesso(true)
      router.refresh()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-[#6B7280] text-sm">OK ({okCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-[#6B7280] text-sm">NOK ({nokCount})</span>
        </div>
        <div
          className={`ml-auto px-3 py-1.5 rounded-full text-xs font-semibold border ${
            aprovado
              ? 'bg-green-50 text-green-700 border-green-200'
              : nokCount > 0
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {aprovado ? '✅ Aprovada' : nokCount > 0 ? '❌ Reprovada' : '⚠️ Pendente'}
        </div>
      </div>

      <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
        <div className="divide-y divide-[#F0F0F0]">
          {itensConfig.map(item => {
            const status = itens[item.key]
            return (
              <div key={item.key} className="flex items-center justify-between px-5 py-3">
                <span className="text-[#111] text-sm">{item.label}</span>
                <div className="flex gap-2">
                  {(['ok', 'nok', 'na'] as Status[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setItens(prev => ({ ...prev, [item.key]: s }))}
                      className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                        status === s ? statusCls[s] : statusInactiveCls
                      }`}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
        <label className="block text-[#6B7280] text-xs uppercase tracking-wider mb-2">
          Observações gerais
        </label>
        <textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          rows={4}
          placeholder="Anote problemas, ajustes necessários..."
          className="w-full bg-[#F8F8F8] border border-[#E5E5E5] rounded-lg px-3 py-2 text-[#111] text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors resize-y placeholder-[#D0D0D0]"
        />
      </div>

      {erro && <p className="text-red-600 text-sm">{erro}</p>}
      {sucesso && <p className="text-green-600 text-sm">Vistoria salva com sucesso.</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="px-6 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--cor-primaria)', color: '#111' }}
        >
          {salvando ? 'Salvando...' : 'Salvar vistoria'}
        </button>
        <a
          href={`/api/pdf/ficha/${veiculoId}`}
          target="_blank"
          className="px-4 py-2.5 rounded-lg text-sm font-medium border border-[#E5E5E5] text-[#6B7280] hover:text-[#111] hover:border-[#D0D0D0] transition-colors bg-white"
        >
          📄 Ficha PDF
        </a>
      </div>

      {vistoria && (
        <p className="text-[#9CA3AF] text-xs">
          Última vistoria: {new Date(vistoria.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      )}
    </form>
  )
}
