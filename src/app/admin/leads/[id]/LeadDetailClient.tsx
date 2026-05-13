'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateLead } from '@/app/actions'
import type { Lead } from '@/types'

const statusOpts = [
  { value: 'novo', label: 'Novo' },
  { value: 'contato_feito', label: 'Contato feito' },
  { value: 'negociando', label: 'Negociando' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'perdido', label: 'Perdido' },
]

const statusBadge: Record<string, string> = {
  novo: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  contato_feito: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  negociando: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  fechado: 'bg-green-600/20 text-green-400 border-green-600/30',
  perdido: 'bg-red-600/20 text-red-400 border-red-600/30',
}

export default function LeadDetailClient({ lead }: { lead: Lead }) {
  const router = useRouter()
  const [status, setStatus] = useState(lead.status)
  const [observacoes, setObservacoes] = useState(lead.observacoes ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    setSucesso(false)
    try {
      await updateLead(lead.id, { status, observacoes: observacoes || null })
      setSucesso(true)
      router.refresh()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form
      onSubmit={handleSalvar}
      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-5"
    >
      <div>
        <label className="block text-[#555] text-xs uppercase tracking-wider mb-2">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {statusOpts.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value as Lead['status'])}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                status === opt.value
                  ? statusBadge[opt.value]
                  : 'border-[#2A2A2A] text-[#555] hover:border-[#333] hover:text-[#888]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[#555] text-xs uppercase tracking-wider mb-2">
          Observações
        </label>
        <textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          rows={5}
          placeholder="Anotações sobre o atendimento, negociação, preferências..."
          className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors resize-y placeholder-[#444]"
        />
      </div>

      {erro && (
        <p className="text-red-400 text-sm">{erro}</p>
      )}
      {sucesso && (
        <p className="text-green-400 text-sm">Salvo com sucesso.</p>
      )}

      <button
        type="submit"
        disabled={salvando}
        className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[#0D0D0D] transition-all hover:brightness-90 disabled:opacity-50"
        style={{ backgroundColor: 'var(--cor-primaria)' }}
      >
        {salvando ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  )
}
