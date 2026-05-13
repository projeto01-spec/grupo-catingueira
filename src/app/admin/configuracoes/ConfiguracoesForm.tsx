'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateLojaSettings,
  saveMensagemPadrao,
  deleteMensagemPadrao,
} from '@/app/actions'
import type { Loja, MensagemPadrao } from '@/types'

const VARIAVEIS = ['{nome}', '{veiculo}', '{preco}']

export default function ConfiguracoesForm({
  loja,
  templates: initialTemplates,
}: {
  loja: Loja
  templates: MensagemPadrao[]
}) {
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

  const [templates, setTemplates] = useState(initialTemplates)
  const [tituloNovo, setTituloNovo] = useState('')
  const [mensagemNova, setMensagemNova] = useState('')
  const [salvandoTemplate, setSalvandoTemplate] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    setSucesso(false)
    try {
      await updateLojaSettings(loja.id, {
        nome, whatsapp, cor_primaria: corPrimaria, cor_secundaria: corSecundaria,
        endereco: endereco || null, cidade: cidade || null, estado: estado || null,
        horario: horario || null, sobre: sobre || null, missao: missao || null,
        visao: visao || null, instagram: instagram || null, maps_url: mapsUrl || null,
      })
      setSucesso(true)
      router.refresh()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!tituloNovo.trim() || !mensagemNova.trim()) return
    setSalvandoTemplate(true)
    try {
      await saveMensagemPadrao(loja.id, tituloNovo, mensagemNova, editandoId ?? undefined)
      setTituloNovo('')
      setMensagemNova('')
      setEditandoId(null)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar template')
    } finally {
      setSalvandoTemplate(false)
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm('Remover este template?')) return
    await deleteMensagemPadrao(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    router.refresh()
  }

  function startEditTemplate(t: MensagemPadrao) {
    setEditandoId(t.id)
    setTituloNovo(t.titulo)
    setMensagemNova(t.mensagem)
  }

  function insertVar(v: string) {
    setMensagemNova(prev => prev + v)
  }

  const inputCls = 'w-full bg-[#F8F8F8] border border-[#E5E5E5] rounded-lg px-3 py-2 text-[#111] text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors placeholder-[#D0D0D0]'
  const textareaCls = `${inputCls} resize-y min-h-[80px]`
  const labelCls = 'block text-[#9CA3AF] text-xs uppercase tracking-wider mb-1.5'

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
          Configurações
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">{loja.nome}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
          <h2 className="text-[#111] font-semibold text-sm mb-4">Informações básicas</h2>
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
              <label className={labelCls}>Instagram</label>
              <input value={instagram} onChange={e => setInstagram(e.target.value)} className={inputCls} placeholder="@suaLoja" />
            </div>
          </div>
        </section>

        <section className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
          <h2 className="text-[#111] font-semibold text-sm mb-4">Cores da marca</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelCls}>Cor primária</label>
              <div className="flex items-center gap-3">
                <input type="color" value={corPrimaria} onChange={e => setCorPrimaria(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-[#E5E5E5] bg-white" />
                <span className="text-[#6B7280] text-sm font-mono">{corPrimaria}</span>
              </div>
            </div>
            <div>
              <label className={labelCls}>Cor secundária</label>
              <div className="flex items-center gap-3">
                <input type="color" value={corSecundaria} onChange={e => setCorSecundaria(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-[#E5E5E5] bg-white" />
                <span className="text-[#6B7280] text-sm font-mono">{corSecundaria}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
          <h2 className="text-[#111] font-semibold text-sm mb-4">Localização</h2>
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
              <input value={horario} onChange={e => setHorario(e.target.value)} className={inputCls} placeholder="Seg a Sex: 8h às 18h" />
            </div>
            <div>
              <label className={labelCls}>URL Google Maps (embed)</label>
              <input value={mapsUrl} onChange={e => setMapsUrl(e.target.value)} className={inputCls} />
            </div>
          </div>
        </section>

        <section className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
          <h2 className="text-[#111] font-semibold text-sm mb-4">Conteúdo institucional</h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Sobre nós</label>
              <textarea value={sobre} onChange={e => setSobre(e.target.value)} className={textareaCls} placeholder="História e descrição..." />
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

        {erro && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erro}</div>}
        {sucesso && <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">Configurações salvas com sucesso.</div>}

        <button type="submit" disabled={salvando} className="px-6 py-3 rounded-lg font-semibold text-sm text-[#111] transition-all hover:brightness-90 disabled:opacity-50" style={{ backgroundColor: 'var(--cor-primaria)' }}>
          {salvando ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </form>

      <div className="mt-10">
        <h2 className="font-[family-name:var(--font-barlow-condensed)] text-xl font-black uppercase text-[#111] mb-6">
          Mensagens Padrão
        </h2>

        <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm mb-4">
          <h3 className="text-[#111] font-semibold text-sm mb-4">
            {editandoId ? 'Editar template' : 'Novo template'}
          </h3>
          <form onSubmit={handleSaveTemplate} className="space-y-3">
            <div>
              <label className={labelCls}>Título</label>
              <input
                value={tituloNovo}
                onChange={e => setTituloNovo(e.target.value)}
                required
                placeholder="Ex: Primeiro contato"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Mensagem</label>
              <textarea
                value={mensagemNova}
                onChange={e => setMensagemNova(e.target.value)}
                required
                rows={4}
                placeholder="Olá {nome}, temos o {veiculo} pelo valor de {preco}..."
                className={textareaCls}
              />
              <div className="flex gap-2 mt-2">
                <span className="text-[#9CA3AF] text-xs">Variáveis:</span>
                {VARIAVEIS.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVar(v)}
                    className="text-xs px-2 py-0.5 rounded bg-[#F0F0F0] text-[#6B7280] hover:text-[#111] transition-colors font-mono"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={salvandoTemplate}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#111] transition-all hover:brightness-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--cor-primaria)' }}
              >
                {salvandoTemplate ? 'Salvando...' : editandoId ? 'Atualizar' : 'Adicionar'}
              </button>
              {editandoId && (
                <button
                  type="button"
                  onClick={() => { setEditandoId(null); setTituloNovo(''); setMensagemNova('') }}
                  className="px-4 py-2 rounded-lg text-sm text-[#6B7280] hover:text-[#111] border border-[#E5E5E5] hover:border-[#D0D0D0] transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {templates.length > 0 && (
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="bg-white border border-[#E5E5E5] rounded-xl p-4 shadow-sm flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[#111] text-sm font-medium">{t.titulo}</p>
                  <p className="text-[#9CA3AF] text-xs mt-1 truncate">{t.mensagem}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEditTemplate(t)}
                    className="text-xs text-[#6B7280] hover:text-[#111] px-2.5 py-1 rounded border border-[#E5E5E5] hover:border-[#D0D0D0] transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="text-xs text-[#6B7280] hover:text-red-600 px-2.5 py-1 rounded border border-[#E5E5E5] hover:border-red-200 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
