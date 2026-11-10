'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { atualizarFotosVeiculo, removerFotoVeiculo } from '@/app/actions'
import GerenciadorFotos from '@/components/admin/GerenciadorFotos'

interface Props {
  veiculoId: string
  lojaId: string
  fotosIniciais: string[]
}

// Aba Fotos de um veículo já salvo:
//   - foto enviada → salva no cadastro na hora;
//   - foto removida → sai do cadastro e do Storage na hora (removerFotoVeiculo);
//   - nova ordem → só grava ao tocar "Salvar ordem".
export default function FotosVeiculoClient({ veiculoId, lojaId, fotosIniciais }: Props) {
  const router = useRouter()

  const [fotos, setFotosState] = useState<string[]>(fotosIniciais)
  // Espelho síncrono do estado: o upload termina depois de um await e precisa
  // da lista mais recente (o usuário pode ter removido/reordenado no meio).
  const fotosRef = useRef(fotos)
  function setFotos(novas: string[]) {
    fotosRef.current = novas
    setFotosState(novas)
  }

  const [enviando, setEnviando] = useState(false)
  const [ordemAlterada, setOrdemAlterada] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvoOk, setSalvoOk] = useState(false)
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)

  async function salvarLista(lista: string[]) {
    setSalvando(true)
    setSalvoOk(false)
    setErroSalvar(null)
    try {
      await atualizarFotosVeiculo(veiculoId, lista)
      setSalvoOk(true)
      setOrdemAlterada(false)
      router.refresh()
    } catch (err: unknown) {
      // Em produção o Next troca a mensagem de throw de Server Action por um
      // texto genérico; o principal aqui é não fingir que salvou.
      setErroSalvar(
        `Não foi possível salvar as fotos no veículo${err instanceof Error && err.message ? ` (${err.message})` : ''}. Toque em "Salvar ordem" para tentar de novo.`
      )
      throw err
    } finally {
      setSalvando(false)
    }
  }

  async function onAdicionadas(urls: string[]) {
    const novas = [...fotosRef.current, ...urls]
    setFotos(novas)
    try {
      await salvarLista(novas)
    } catch {
      // erro já exibido em erroSalvar; as fotos continuam na tela para tentar de novo
      setOrdemAlterada(true)
    }
  }

  async function onRemover(url: string) {
    const res = await removerFotoVeiculo(veiculoId, url)
    if (!res.ok) throw new Error(res.erro)
    setFotos(fotosRef.current.filter(f => f !== url))
    setSalvoOk(false)
    router.refresh()
  }

  function onReordenar(novas: string[]) {
    setFotos(novas)
    setOrdemAlterada(true)
    setSalvoOk(false)
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
      <h2 className="text-[#111827] font-bold text-sm uppercase tracking-wider mb-4">Fotos</h2>

      <GerenciadorFotos
        lojaId={lojaId}
        fotos={fotos}
        onAdicionadas={onAdicionadas}
        onRemover={onRemover}
        onReordenar={onReordenar}
        desabilitado={salvando}
        onEnviandoChange={setEnviando}
        rodape={
          <>
            {erroSalvar && (
              <p role="alert" className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {erroSalvar}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void salvarLista(fotosRef.current).catch(() => {})}
                disabled={salvando || enviando || !ordemAlterada}
                className="min-h-[44px] px-5 rounded-xl font-bold text-sm text-[#111827] bg-[#F5C842] hover:brightness-90 transition-all disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar ordem'}
              </button>
              {salvoOk && <span className="text-green-600 text-sm font-medium">✓ Salvo</span>}
            </div>
          </>
        }
      />
    </div>
  )
}
