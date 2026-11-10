'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setLojaAtiva } from '@/app/actions'

// Mostrado no lugar de uma página de detalhe quando o registro (veículo,
// venda, lead) é de outra loja e o usuário tem acesso a ela (mais de uma loja). Demais
// recebem 404 (ver conferirLojaDoRegistro em lib/loja-ativa.ts).
export default function AvisoOutraLoja({
  lojaId,
  lojaNome,
  voltarHref,
  voltarTexto = 'Voltar',
}: {
  lojaId: string
  lojaNome: string
  voltarHref: string
  voltarTexto?: string
}) {
  const router = useRouter()
  const [trocando, setTrocando] = useState(false)
  const [erro, setErro] = useState('')

  async function trocar() {
    setTrocando(true)
    setErro('')
    try {
      await setLojaAtiva(lojaId)
      router.refresh()
    } catch {
      setErro('Não foi possível trocar de loja. Use o seletor no menu.')
      setTrocando(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <p className="text-amber-800 font-semibold text-sm">
          Este registro pertence à loja {lojaNome} — troque a loja no seletor para abrir.
        </p>
        <p className="text-amber-700 text-xs mt-1">
          O painel está mostrando outra loja agora. Nada foi alterado.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={trocar}
            disabled={trocando}
            className="min-h-[44px] px-4 rounded-xl font-bold text-sm text-[#111827] bg-[#F5C842] hover:brightness-95 disabled:opacity-50"
          >
            {trocando ? 'Trocando...' : `Trocar para ${lojaNome}`}
          </button>
          <a
            href={voltarHref}
            className="inline-flex items-center min-h-[44px] px-4 rounded-xl border border-[#E5E7EB] bg-white text-sm font-semibold text-[#374151] hover:border-[#D0D0D0]"
          >
            {voltarTexto}
          </a>
        </div>
        {erro && <p className="text-red-700 text-xs mt-2">{erro}</p>}
      </div>
    </div>
  )
}
