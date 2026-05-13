'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveVistoria } from '@/app/actions'
import type { VistoriaVeiculo } from '@/types'

type Status = 'ok' | 'nok' | 'na'

const statusCls: Record<Status, string> = {
  ok: 'bg-green-600/20 text-green-400 border-green-600/30',
  nok: 'bg-red-600/20 text-red-400 border-red-600/30',
  na: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

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

  function toggleStatus(key: string, current: Status) {
    const next: Status = current === 'na' ? 'ok' : current === 'ok' ? 'nok' : 'na'
    setItens(prev => ({ ...prev, [key]: next }))
  }

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
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span className="text-[#888] text-sm">OK ({okCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="text-[#888] text-sm">NOK ({nokCount})</span>
        </div>
        <div
          className={`ml-auto px-3 py-1.5 rounded-full text-xs font-semibold border ${
            aprovado
              ? 'bg-green-600/20 text-green-400 border-green-600/30'
              : nokCount > 0
              ? 'bg-red-600/20 text-red-400 border-red-600/30'
              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
          }`}
        >
          {aprovado ? '✅ Aprovada' : nokCount > 0 ? '❌ Reprovada' : '⚠️ Pendente'}
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="divide-y divide-[#1E1E1E]">
          {itensConfig.map(item => {
            const status = itens[item.key]
            return (
              <div key={item.key} className="flex items-center justify-between px-5 py-3">
                <span className="text-white text-sm">{item.label}</span>
                <div className="flex gap-2">
                  {(['ok', 'nok', 'na'] as Status[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setItens(prev => ({ ...prev, [item.key]: s }))}
                      className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                        status === s
                          ? statusCls[s]
                          : 'border-[#2A2A2A] text-[#444] hover:text-[#888]'
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

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
        <label className="block text-[#555] text-xs uppercase tracking-wider mb-2">
          Observações gerais
        </label>
        <textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          rows={4}
          placeholder="Anote problemas, ajustes necessários..."
          className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors resize-y placeholder-[#444]"
        />
      </div>

      {erro && <p className="text-red-400 text-sm">{erro}</p>}
      {sucesso && <p className="text-green-400 text-sm">Vistoria salva com sucesso.</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="px-6 py-2.5 rounded-lg font-bold text-sm text-[#0D0D0D] transition-all hover:brightness-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--cor-primaria)' }}
        >
          {salvando ? 'Salvando...' : 'Salvar vistoria'}
        </button>
        <a
          href={`/api/pdf/ficha/${veiculoId}`}
          target="_blank"
          className="px-4 py-2.5 rounded-lg text-sm font-medium border border-[#2A2A2A] text-[#666] hover:text-white hover:border-[#333] transition-colors"
        >
          📄 Ficha PDF
        </a>
      </div>

      {vistoria && (
        <p className="text-[#444] text-xs">
          Última vistoria: {new Date(vistoria.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      )}
    </form>
  )
}
