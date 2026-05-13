'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { marcarVeiculoVendido } from '@/app/actions'

export default function MarcaVendidoButton({ veiculoId }: { veiculoId: string }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleClick() {
    if (!confirm('Marcar este veículo como vendido? Lembretes de pós-venda serão criados automaticamente.')) return
    setCarregando(true)
    setErro(null)
    try {
      await marcarVeiculoVendido(veiculoId)
      router.refresh()
    } catch {
      setErro('Falha ao atualizar.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={carregando}
        className="text-xs text-[#666] hover:text-green-400 px-2.5 py-1.5 rounded-md border border-[#2A2A2A] hover:border-green-400/30 transition-colors disabled:opacity-50"
      >
        {carregando ? '...' : 'Vendido'}
      </button>
      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}
