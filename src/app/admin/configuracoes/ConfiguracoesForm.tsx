'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateLojaSettings } from '@/app/actions'
import type { Loja } from '@/types'

export default function ConfiguracoesForm({ loja }: { loja: Loja }) {
  const router = useRouter()

  const [nome, setNome] = useState(loja.nome)
  const [whatsapp, setWhatsapp] = useState(loja.whatsapp)
  const [corPrimaria, setCorPrimaria] = useState(loja.cor_primaria)
  const [corSecundaria, setCorSecundaria] = useState(loja.cor_secundaria)
  const [endereco, setEndereco] = useState(loja.endereco ?? '')
  const [cidade, setCidade] = useState(loja.cidade ?? '')
  const [estado, setEstado] = useState(loja.estado ?? '')
  const [horario, setHorario] = useState(loja.horario ?? '')
  const [sobre, setSobre] = useState(loja.sobre ?? '')
  const [missao, setMissao] = useState(loja.missao ?? '')
  const [visao, setVisao] = useState(loja.visao ?? '')
  const [instagram, setInstagram] = useState(loja.instagram ?? '')
  const [mapsUrl, setMapsUrl] = useState(loja.maps_url ?? '')

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    setSucesso(false)
    try {
      await updateLojaSettings(loja.id, {
        nome,
        whatsapp,
        cor_primaria: corPrimaria,
        cor_secundaria: corSecundaria,
        endereco: endereco || null,
        cidade: cidade || null,
        estado: estado || null,
        horario: horario || null,
        sobre: sobre || null,
        missao: missao || null,
        visao: visao || null,
        instagram: instagram || null,
        maps_url: mapsUrl || null,
      })
      setSucesso(true)
      router.refresh()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const inputCls =
    'w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors placeholder-[#444]'

  const textareaCls =
    'w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors placeholder-[#444] resize-y min-h-[80px]'

  const labelCls = 'block text-[#555] text-xs uppercase tracking-wider mb-1.5'

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-white">
          Configurações
        </h1>
        <p className="text-[#555] text-sm mt-1">{loja.nome}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-white font-semibold text-sm mb-4">Informações básicas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nome da loja</label>
              <input required value={nome} onChange={e => setNome(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>WhatsApp (só números)</label>
              <input required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className={inputCls} placeholder="83999999999" />
            </div>
            <div>
              <label className={labelCls}>Instagram (@ ou URL)</label>
              <input value={instagram} onChange={e => setInstagram(e.target.value)} className={inputCls} placeholder="@suaLoja" />
            </div>
          </div>
        </section>

        <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-white font-semibold text-sm mb-4">Cores da marca</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelCls}>Cor primária</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={corPrimaria}
                  onChange={e => setCorPrimaria(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-[#2A2A2A] bg-transparent"
                />
                <span className="text-[#888] text-sm font-mono">{corPrimaria}</span>
              </div>
            </div>
            <div>
              <label className={labelCls}>Cor secundária</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={corSecundaria}
                  onChange={e => setCorSecundaria(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-[#2A2A2A] bg-transparent"
                />
                <span className="text-[#888] text-sm font-mono">{corSecundaria}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-white font-semibold text-sm mb-4">Localização</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Endereço</label>
              <input value={endereco} onChange={e => setEndereco(e.target.value)} className={inputCls} placeholder="Rua, número, bairro" />
            </div>
            <div>
              <label className={labelCls}>Cidade</label>
              <input value={cidade} onChange={e => setCidade(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Estado (UF)</label>
              <input value={estado} onChange={e => setEstado(e.target.value)} className={inputCls} placeholder="PB" maxLength={2} />
            </div>
            <div>
              <label className={labelCls}>Horário de funcionamento</label>
              <input value={horario} onChange={e => setHorario(e.target.value)} className={inputCls} placeholder="Seg a Sex: 8h às 18h | Sáb: 8h às 13h" />
            </div>
            <div>
              <label className={labelCls}>URL do Google Maps (embed)</label>
              <input value={mapsUrl} onChange={e => setMapsUrl(e.target.value)} className={inputCls} placeholder="https://maps.google.com/..." />
            </div>
          </div>
        </section>

        <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-white font-semibold text-sm mb-4">Conteúdo institucional</h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Sobre nós</label>
              <textarea value={sobre} onChange={e => setSobre(e.target.value)} className={textareaCls} placeholder="História e descrição da loja..." />
            </div>
            <div>
              <label className={labelCls}>Missão</label>
              <textarea value={missao} onChange={e => setMissao(e.target.value)} className={textareaCls} rows={2} />
            </div>
            <div>
              <label className={labelCls}>Visão</label>
              <textarea value={visao} onChange={e => setVisao(e.target.value)} className={textareaCls} rows={2} />
            </div>
          </div>
        </section>

        {erro && (
          <div className="px-4 py-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-400 text-sm">
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="px-4 py-3 bg-green-600/20 border border-green-600/30 rounded-lg text-green-400 text-sm">
            Configurações salvas com sucesso.
          </div>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="px-6 py-3 rounded-lg font-semibold text-sm text-[#0D0D0D] transition-all hover:brightness-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--cor-primaria)' }}
        >
          {salvando ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </form>
    </div>
  )
}
