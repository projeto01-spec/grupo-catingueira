'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  updateLojaSettings,
  saveMensagemPadrao,
  deleteMensagemPadrao,
} from '@/app/actions'
import type { Loja, MensagemPadrao } from '@/types'

const VARIAVEIS = ['{nome}', '{veiculo}', '{preco}']
type TabId = 'dados' | 'aparencia' | 'mensagens'

const lojaSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  whatsapp: z.string().min(8, 'WhatsApp inválido (mínimo 8 dígitos)'),
  cor_primaria: z.string().min(4, 'Cor inválida'),
  cor_secundaria: z.string().min(4, 'Cor inválida'),
  endereco: z.string(),
  cidade: z.string(),
  estado: z.string().max(2, 'Use 2 letras (ex: PB)'),
  horario: z.string(),
  instagram: z.string(),
  maps_url: z.string(),
  sobre: z.string(),
  missao: z.string(),
  visao: z.string(),
})

type LojaForm = z.infer<typeof lojaSchema>

const inputCls = 'w-full bg-[#F8F8F8] border border-[#E5E5E5] rounded-lg px-3 py-2 text-[#111] text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors placeholder-[#D0D0D0]'
const textareaCls = `${inputCls} resize-y`
const labelCls = 'block text-[#9CA3AF] text-xs uppercase tracking-wider mb-1.5'
const errorCls = 'text-red-600 text-xs mt-1'

export default function ConfiguracoesForm({
  loja,
  templates: initialTemplates,
}: {
  loja: Loja
  templates: MensagemPadrao[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<TabId>('dados')
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<LojaForm>({
    resolver: zodResolver(lojaSchema),
    defaultValues: {
      nome: loja.nome,
      whatsapp: loja.whatsapp,
      cor_primaria: loja.cor_primaria,
      cor_secundaria: loja.cor_secundaria,
      endereco: loja.endereco ?? '',
      cidade: loja.cidade ?? '',
      estado: loja.estado ?? '',
      horario: loja.horario ?? '',
      instagram: loja.instagram ?? '',
      maps_url: loja.maps_url ?? '',
      sobre: loja.sobre ?? '',
      missao: loja.missao ?? '',
      visao: loja.visao ?? '',
    },
  })

  const corPrimaria = watch('cor_primaria')
  const corSecundaria = watch('cor_secundaria')

  // Templates state
  const [templates, setTemplates] = useState(initialTemplates)
  const [tituloNovo, setTituloNovo] = useState('')
  const [mensagemNova, setMensagemNova] = useState('')
  const [salvandoTemplate, setSalvandoTemplate] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  function showToast(tipo: 'ok' | 'erro', msg: string) {
    setToast({ tipo, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function onSubmit(data: LojaForm) {
    setSalvando(true)
    try {
      await updateLojaSettings(loja.id, {
        nome: data.nome,
        whatsapp: data.whatsapp,
        cor_primaria: data.cor_primaria,
        cor_secundaria: data.cor_secundaria,
        endereco: data.endereco || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        horario: data.horario || null,
        sobre: data.sobre || null,
        missao: data.missao || null,
        visao: data.visao || null,
        instagram: data.instagram || null,
        maps_url: data.maps_url || null,
      })
      showToast('ok', 'Configurações salvas com sucesso.')
      router.refresh()
    } catch (err: unknown) {
      showToast('erro', err instanceof Error ? err.message : 'Erro ao salvar')
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
    setTab('mensagens')
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'dados', label: 'Dados da Loja' },
    { id: 'aparencia', label: 'Aparência' },
    { id: 'mensagens', label: 'Mensagens Padrão' },
  ]

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
          Configurações
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">{loja.nome}</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-sm font-medium ${
          toast.tipo === 'ok'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-[#E5E5E5]">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-[var(--cor-primaria)] text-[var(--cor-primaria)]'
                : 'border-transparent text-[#6B7280] hover:text-[#111]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tabs: Dados + Aparência share the same form ── */}
      {tab !== 'mensagens' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* ── Dados da Loja ── */}
          <div className={tab === 'dados' ? '' : 'hidden'}>
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-[#111] font-semibold text-sm">Informações básicas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nome da loja *</label>
                  <input {...register('nome')} className={inputCls} />
                  {errors.nome && <p className={errorCls}>{errors.nome.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>WhatsApp (só números) *</label>
                  <input {...register('whatsapp')} className={inputCls} placeholder="83999999999" />
                  {errors.whatsapp && <p className={errorCls}>{errors.whatsapp.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Instagram</label>
                  <input {...register('instagram')} className={inputCls} placeholder="@suaLoja" />
                </div>
                <div>
                  <label className={labelCls}>Horário de funcionamento</label>
                  <input {...register('horario')} className={inputCls} placeholder="Seg a Sex: 8h às 18h" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm space-y-4 mt-4">
              <h2 className="text-[#111] font-semibold text-sm">Localização</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Endereço</label>
                  <input {...register('endereco')} className={inputCls} placeholder="Rua, número, bairro" />
                </div>
                <div>
                  <label className={labelCls}>Cidade</label>
                  <input {...register('cidade')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Estado (UF)</label>
                  <input {...register('estado')} className={inputCls} placeholder="PB" maxLength={2} />
                  {errors.estado && <p className={errorCls}>{errors.estado.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>URL Google Maps (embed)</label>
                  <input {...register('maps_url')} className={inputCls} placeholder="https://maps.google.com/..." />
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm space-y-4 mt-4">
              <h2 className="text-[#111] font-semibold text-sm">Conteúdo institucional</h2>
              <div>
                <label className={labelCls}>Sobre nós</label>
                <textarea {...register('sobre')} rows={4} className={textareaCls} placeholder="História e descrição..." />
              </div>
              <div>
                <label className={labelCls}>Missão</label>
                <textarea {...register('missao')} rows={2} className={textareaCls} />
              </div>
              <div>
                <label className={labelCls}>Visão</label>
                <textarea {...register('visao')} rows={2} className={textareaCls} />
              </div>
            </div>
          </div>

          {/* ── Aparência ── */}
          <div className={tab === 'aparencia' ? '' : 'hidden'}>
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm space-y-6">
              <h2 className="text-[#111] font-semibold text-sm">Cores da marca</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Cor primária</label>
                  <div className="flex items-center gap-3">
                    <Controller
                      name="cor_primaria"
                      control={control}
                      render={({ field }) => (
                        <input type="color" {...field} className="w-10 h-10 rounded cursor-pointer border border-[#E5E5E5]" />
                      )}
                    />
                    <span className="text-[#6B7280] text-sm font-mono">{corPrimaria}</span>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Cor secundária</label>
                  <div className="flex items-center gap-3">
                    <Controller
                      name="cor_secundaria"
                      control={control}
                      render={({ field }) => (
                        <input type="color" {...field} className="w-10 h-10 rounded cursor-pointer border border-[#E5E5E5]" />
                      )}
                    />
                    <span className="text-[#6B7280] text-sm font-mono">{corSecundaria}</span>
                  </div>
                </div>
              </div>

              {/* Live preview */}
              <div>
                <label className={labelCls}>Preview ao vivo</label>
                <div className="rounded-xl overflow-hidden border border-[#E5E5E5]">
                  {/* Header preview */}
                  <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: corPrimaria }}>
                    <span className="font-bold text-sm" style={{ color: '#111' }}>{loja.nome}</span>
                    <span className="text-xs font-medium" style={{ color: '#111' }}>Menu</span>
                  </div>
                  {/* Body preview */}
                  <div className="p-4 bg-white">
                    <div className="flex gap-3">
                      <div className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: corPrimaria, color: '#111' }}>
                        Botão primário
                      </div>
                      <div className="px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: corSecundaria, color: corSecundaria }}>
                        Botão outline
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full w-3/4" style={{ backgroundColor: corSecundaria, opacity: 0.3 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="px-6 py-3 rounded-lg font-semibold text-sm text-[#111] transition-all hover:brightness-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--cor-primaria)' }}
          >
            {salvando ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </form>
      )}

      {/* ── Mensagens Padrão tab ── */}
      {tab === 'mensagens' && (
        <div className="space-y-4">
          {/* Form */}
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
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
                  placeholder="Olá {nome}, temos o {veiculo} por {preco}..."
                  className={textareaCls}
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-[#9CA3AF] text-xs">Variáveis:</span>
                  {VARIAVEIS.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setMensagemNova(prev => prev + v)}
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

          {/* List */}
          {templates.length === 0 ? (
            <p className="text-[#9CA3AF] text-sm text-center py-8">Nenhum template cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="bg-white border border-[#E5E5E5] rounded-xl p-4 shadow-sm flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[#111] text-sm font-medium">{t.titulo}</p>
                    <p className="text-[#9CA3AF] text-xs mt-0.5 truncate">{t.mensagem}</p>
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
                      Deletar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
