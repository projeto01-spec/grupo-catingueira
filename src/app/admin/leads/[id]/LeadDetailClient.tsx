'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateLead, addLeadInteracao } from '@/app/actions'
import type { Lead, LeadInteracao, MensagemPadrao, TipoInteracao } from '@/types'

const statusOpts = [
  { value: 'novo', label: 'Novo', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'contato_feito', label: 'Contato feito', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'negociando', label: 'Negociando', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'fechado', label: 'Fechado', cls: 'bg-green-600/20 text-green-400 border-green-600/30' },
  { value: 'perdido', label: 'Perdido', cls: 'bg-red-600/20 text-red-400 border-red-600/30' },
]

const tipoOpts: { value: TipoInteracao; label: string; icon: string }[] = [
  { value: 'nota', label: 'Nota', icon: '📝' },
  { value: 'ligacao', label: 'Ligação', icon: '📞' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'visita', label: 'Visita', icon: '🏪' },
  { value: 'proposta', label: 'Proposta', icon: '📋' },
]

const tipoIcon: Record<string, string> = {
  nota: '📝', ligacao: '📞', whatsapp: '💬',
  visita: '🏪', proposta: '📋', site: '🌐',
}

interface Props {
  lead: Lead
  interacoes: LeadInteracao[]
  vendedores: { id: string; nome: string }[]
  templates: MensagemPadrao[]
  lojaId: string
  userId: string
}

export default function LeadDetailClient({ lead, interacoes: initialInteracoes, vendedores, templates, lojaId }: Props) {
  const router = useRouter()

  // Status / info editing
  const [status, setStatus] = useState(lead.status)
  const [observacoes, setObservacoes] = useState(lead.observacoes ?? '')
  const [responsavelId, setResponsavelId] = useState(lead.responsavel_id ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  // Interactions
  const [interacoes, setInteracoes] = useState(initialInteracoes)
  const [tipoInteracao, setTipoInteracao] = useState<TipoInteracao>('nota')
  const [descInteracao, setDescInteracao] = useState('')
  const [registrando, setRegistrando] = useState(false)

  // Template modal
  const [showTemplates, setShowTemplates] = useState(false)

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    setSucesso(false)
    try {
      await updateLead(lead.id, {
        status,
        observacoes: observacoes || null,
        responsavel_id: responsavelId || null,
      })
      setSucesso(true)
      router.refresh()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function handleRegistrarInteracao(e: React.FormEvent) {
    e.preventDefault()
    if (!descInteracao.trim()) return
    setRegistrando(true)
    try {
      await addLeadInteracao(lead.id, lojaId, tipoInteracao, descInteracao)
      setDescInteracao('')
      setInteracoes(prev => [{
        id: Date.now().toString(),
        lead_id: lead.id,
        loja_id: lojaId,
        usuario_id: null,
        tipo: tipoInteracao,
        descricao: descInteracao,
        created_at: new Date().toISOString(),
      }, ...prev])
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao registrar')
    } finally {
      setRegistrando(false)
    }
  }

  function handleWhatsApp(msg?: string) {
    const num = `55${lead.telefone.replace(/\D/g, '')}`
    const text = msg ?? `Olá ${lead.nome}, entramos em contato da nossa loja. Como posso ajudá-lo?`
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank')
  }

  function useTemplate(t: MensagemPadrao) {
    const veiculo = lead.veiculo
      ? `${lead.veiculo.marca} ${lead.veiculo.modelo} ${lead.veiculo.ano}`
      : lead.veiculo_interesse ?? ''
    const msg = t.mensagem
      .replace(/{nome}/g, lead.nome)
      .replace(/{veiculo}/g, veiculo)
      .replace(/{preco}/g, '')
    handleWhatsApp(msg)
    setShowTemplates(false)
  }

  return (
    <div className="space-y-6">
      {/* Info grid */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Telefone</p>
          <a
            href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white text-sm font-medium hover:text-[var(--cor-primaria)] transition-colors"
          >
            {lead.telefone}
          </a>
        </div>
        <div>
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Origem</p>
          <p className="text-white text-sm font-medium capitalize">{lead.origem}</p>
        </div>
        <div>
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Veículo</p>
          <p className="text-white text-sm font-medium">
            {lead.veiculo
              ? `${lead.veiculo.marca} ${lead.veiculo.modelo} ${lead.veiculo.ano}`
              : lead.veiculo_interesse || '—'}
          </p>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSalvar} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold text-sm">Atualizar lead</h2>

        <div>
          <label className="block text-[#555] text-xs uppercase tracking-wider mb-2">Status</label>
          <div className="flex flex-wrap gap-2">
            {statusOpts.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value as Lead['status'])}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  status === opt.value ? opt.cls : 'border-[#2A2A2A] text-[#555] hover:border-[#333]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[#555] text-xs uppercase tracking-wider mb-2">Responsável</label>
          <select
            value={responsavelId}
            onChange={e => setResponsavelId(e.target.value)}
            className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors"
          >
            <option value="">— Nenhum —</option>
            {vendedores.map(v => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[#555] text-xs uppercase tracking-wider mb-2">Observações</label>
          <textarea
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            rows={4}
            placeholder="Anotações sobre o atendimento..."
            className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors resize-y placeholder-[#444]"
          />
        </div>

        {erro && <p className="text-red-400 text-sm">{erro}</p>}
        {sucesso && <p className="text-green-400 text-sm">Salvo com sucesso.</p>}

        <button
          type="submit"
          disabled={salvando}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[#0D0D0D] transition-all hover:brightness-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--cor-primaria)' }}
        >
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>

      {/* WhatsApp buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleWhatsApp()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366]/10 text-[#25D366] text-sm font-medium hover:bg-[#25D366]/20 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          Abrir WhatsApp
        </button>
        {templates.length > 0 && (
          <button
            onClick={() => setShowTemplates(v => !v)}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[#2A2A2A] text-[#666] hover:text-white hover:border-[#333] transition-colors"
          >
            Usar template
          </button>
        )}
      </div>

      {showTemplates && (
        <div className="bg-[#111] border border-[#2A2A2A] rounded-xl p-4 space-y-2">
          <p className="text-[#555] text-xs uppercase tracking-wider mb-3">Templates de mensagem</p>
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => useTemplate(t)}
              className="w-full text-left px-4 py-3 rounded-lg bg-[#1A1A1A] hover:bg-[#222] transition-colors"
            >
              <p className="text-white text-sm font-medium">{t.titulo}</p>
              <p className="text-[#555] text-xs mt-0.5 truncate">{t.mensagem}</p>
            </button>
          ))}
        </div>
      )}

      {/* Add interaction */}
      <form
        onSubmit={handleRegistrarInteracao}
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 space-y-3"
      >
        <h2 className="text-white font-semibold text-sm">Registrar interação</h2>
        <div className="flex gap-2 flex-wrap">
          {tipoOpts.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTipoInteracao(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                tipoInteracao === opt.value
                  ? 'border-[var(--cor-primaria)] text-[var(--cor-primaria)]'
                  : 'border-[#2A2A2A] text-[#555] hover:border-[#333] hover:text-[#888]'
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
        <textarea
          value={descInteracao}
          onChange={e => setDescInteracao(e.target.value)}
          rows={3}
          placeholder="Descreva a interação..."
          className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors resize-none placeholder-[#444]"
        />
        <button
          type="submit"
          disabled={registrando || !descInteracao.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-[#0D0D0D] transition-all hover:brightness-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--cor-primaria)' }}
        >
          {registrando ? 'Registrando...' : 'Registrar'}
        </button>
      </form>

      {/* Timeline */}
      {interacoes.length > 0 && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-white font-semibold text-sm mb-4">Histórico</h2>
          <div className="space-y-4">
            {interacoes.map(int => (
              <div key={int.id} className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-base"
                  style={{ backgroundColor: '#111' }}
                >
                  {tipoIcon[int.tipo] ?? '📝'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-xs font-medium capitalize">{int.tipo.replace('_', ' ')}</span>
                    <span className="text-[#444] text-xs">
                      {new Date(int.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-[#888] text-sm leading-relaxed">{int.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
