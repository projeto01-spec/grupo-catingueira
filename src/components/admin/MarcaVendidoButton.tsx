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
        className="text-xs text-[#6B7280] hover:text-green-700 px-2.5 py-1.5 rounded-md border border-[#E5E5E5] hover:border-green-300 hover:bg-green-50 transition-colors disabled:opacity-50 bg-white"
      >
        {carregando ? '...' : 'Vendido'}
      </button>
      {erro && <p className="text-red-600 text-xs">{erro}</p>}
    </div>
  )
}
