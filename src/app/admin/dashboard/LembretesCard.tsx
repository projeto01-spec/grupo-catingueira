'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { concluirLembrete } from '@/app/actions'
import type { Lembrete } from '@/types'

const tipoLabel: Record<string, string> = {
  pos_venda: 'Pós-venda',
  aniversario_compra: 'Aniversário de compra',
  aniversario_cliente: 'Aniversário do cliente',
  financiamento: 'Financiamento',
  visita: 'Visita',
  personalizado: 'Personalizado',
}

export default function LembretesCard({ lembretes }: { lembretes: Lembrete[] }) {
  const router = useRouter()
  const [concluindo, setConcluindo] = useState<string | null>(null)
  const [lista, setLista] = useState(lembretes)

  async function handleConcluir(id: string) {
    setConcluindo(id)
    try {
      await concluirLembrete(id)
      setLista(prev => prev.filter(l => l.id !== id))
      router.refresh()
    } finally {
      setConcluindo(null)
    }
  }

  if (lista.length === 0) return null

  return (
    <div className="bg-[#1A1A1A] border border-yellow-500/20 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center gap-2">
        <span className="text-yellow-400">⏰</span>
        <h2 className="text-white font-semibold text-sm">Lembretes de hoje</h2>
        <span className="ml-auto bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">
          {lista.length}
        </span>
      </div>
      <div className="divide-y divide-[#1E1E1E]">
        {lista.map(l => {
          const waNum = l.lead?.telefone ? `55${l.lead.telefone.replace(/\D/g, '')}` : null
          const msg = l.mensagem ?? ''
          const waHref = waNum ? `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}` : null

          return (
            <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {l.lead?.nome ?? (l.veiculo ? `${l.veiculo.marca} ${l.veiculo.modelo} ${l.veiculo.ano}` : 'Lembrete')}
                </p>
                <p className="text-[#555] text-xs mt-0.5">
                  {tipoLabel[l.tipo] ?? l.tipo} — {new Date(l.data_lembrete).toLocaleDateString('pt-BR')}
                </p>
                {l.mensagem && <p className="text-[#666] text-xs mt-0.5 truncate">{l.mensagem}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1.5 rounded-md bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                  >
                    WhatsApp
                  </a>
                )}
                <button
                  onClick={() => handleConcluir(l.id)}
                  disabled={concluindo === l.id}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-[#2A2A2A] text-[#666] hover:text-green-400 hover:border-green-400/30 transition-colors disabled:opacity-50"
                >
                  {concluindo === l.id ? '...' : 'Concluir'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
