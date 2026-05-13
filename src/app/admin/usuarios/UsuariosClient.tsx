'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarUsuario, resetarSenha, atualizarUsuario, deleteUser } from '@/app/actions'
import type { UsuarioPerfil, Loja, Perfil } from '@/types'

type UsuarioComEmail = UsuarioPerfil & { loja: Loja | null; email: string }

interface Props {
  perfil: UsuarioPerfil
  usuarios: UsuarioComEmail[]
  lojas: Loja[]
}

const perfis: Perfil[] = ['vendedor', 'gerente', 'diretor', 'admin']

const perfilBadge: Record<Perfil, string> = {
  vendedor: 'bg-blue-50 text-blue-700 border-blue-200',
  gerente: 'bg-orange-50 text-orange-700 border-orange-200',
  diretor: 'bg-purple-50 text-purple-700 border-purple-200',
  admin: 'bg-red-50 text-red-700 border-red-200',
}

function getIniciais(nome: string) {
  const p = nome.trim().split(' ')
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}

function gerarSenha() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const inputCls = 'w-full bg-[#F8F8F8] border border-[#E5E5E5] rounded-lg px-3 py-2 text-[#111] text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors placeholder-[#D0D0D0]'
const labelCls = 'block text-[#9CA3AF] text-xs uppercase tracking-wider mb-1.5'

export default function UsuariosClient({ perfil, usuarios, lojas }: Props) {
  const router = useRouter()

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null)
  const [editandoUsuario, setEditandoUsuario] = useState<UsuarioComEmail | null>(null)

  // ── After-create credentials ──────────────────────────────────────────────
  const [credenciais, setCredenciais] = useState<{ email: string; senha: string } | null>(null)
  const [senhasReset, setSenhasReset] = useState<Record<string, string>>({})

  // ── Create form ───────────────────────────────────────────────────────────
  const [nomeNovo, setNomeNovo] = useState('')
  const [emailNovo, setEmailNovo] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [perfilNovo, setPerfilNovo] = useState<Perfil>('vendedor')
  const [lojaIdNova, setLojaIdNova] = useState(lojas[0]?.id ?? '')
  const [criandoLoading, setCriandoLoading] = useState(false)
  const [criandoErro, setCriandoErro] = useState<string | null>(null)

  // ── Edit form ─────────────────────────────────────────────────────────────
  const [nomeEdit, setNomeEdit] = useState('')
  const [perfilEdit, setPerfilEdit] = useState<Perfil>('vendedor')
  const [lojaIdEdit, setLojaIdEdit] = useState('')
  const [ativoEdit, setAtivoEdit] = useState(true)
  const [editandoLoading, setEditandoLoading] = useState(false)
  const [editandoErro, setEditandoErro] = useState<string | null>(null)

  // ── Per-row loading ───────────────────────────────────────────────────────
  const [resetLoading, setResetLoading] = useState<string | null>(null)
  const [toggleLoading, setToggleLoading] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  // ── Handlers ─────────────────────────────────────────────────────────────

  function abrirCriar() {
    setNomeNovo('')
    setEmailNovo('')
    setSenhaNova(gerarSenha())
    setPerfilNovo('vendedor')
    setLojaIdNova(lojas[0]?.id ?? '')
    setCriandoErro(null)
    setModal('criar')
  }

  function abrirEditar(u: UsuarioComEmail) {
    setEditandoUsuario(u)
    setNomeEdit(u.nome)
    setPerfilEdit(u.perfil)
    setLojaIdEdit(u.loja_id)
    setAtivoEdit(u.ativo)
    setEditandoErro(null)
    setModal('editar')
  }

  function fecharModal() {
    setModal(null)
    setEditandoUsuario(null)
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!senhaNova.trim()) { setCriandoErro('Gere ou digite uma senha'); return }
    setCriandoLoading(true)
    setCriandoErro(null)
    try {
      await criarUsuario({ email: emailNovo, senha: senhaNova, nome: nomeNovo, perfil: perfilNovo, loja_id: lojaIdNova })
      setCredenciais({ email: emailNovo, senha: senhaNova })
      fecharModal()
      router.refresh()
    } catch (err: unknown) {
      setCriandoErro(err instanceof Error ? err.message : 'Erro ao criar usuário')
    } finally {
      setCriandoLoading(false)
    }
  }

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!editandoUsuario) return
    setEditandoLoading(true)
    setEditandoErro(null)
    try {
      await atualizarUsuario(editandoUsuario.id, { nome: nomeEdit, perfil: perfilEdit, loja_id: lojaIdEdit, ativo: ativoEdit })
      fecharModal()
      router.refresh()
    } catch (err: unknown) {
      setEditandoErro(err instanceof Error ? err.message : 'Erro ao atualizar')
    } finally {
      setEditandoLoading(false)
    }
  }

  async function handleResetSenha(userId: string) {
    if (!confirm('Gerar nova senha aleatória para este usuário?')) return
    setResetLoading(userId)
    try {
      const { novaSenha } = await resetarSenha(userId)
      setSenhasReset(prev => ({ ...prev, [userId]: novaSenha }))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao resetar senha')
    } finally {
      setResetLoading(null)
    }
  }

  async function handleToggleAtivo(u: UsuarioComEmail) {
    setToggleLoading(u.id)
    try {
      await atualizarUsuario(u.id, { nome: u.nome, perfil: u.perfil, loja_id: u.loja_id, ativo: !u.ativo })
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar')
    } finally {
      setToggleLoading(null)
    }
  }

  async function handleDeletar(u: UsuarioComEmail) {
    if (!confirm(`Deletar o usuário "${u.nome}" (${u.email})?\n\nEsta ação não pode ser desfeita.`)) return
    setDeleteLoading(u.id)
    try {
      await deleteUser(u.id)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao deletar')
    } finally {
      setDeleteLoading(null)
    }
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
            Usuários
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">{usuarios.length} usuário(s)</p>
        </div>
        <button
          onClick={abrirCriar}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm text-[#111] transition-all hover:brightness-90"
          style={{ backgroundColor: 'var(--cor-primaria)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Criar usuário
        </button>
      </div>

      {/* Credentials card */}
      {credenciais && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-green-700 font-semibold text-sm mb-3">✅ Usuário criado com sucesso!</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-green-600 text-xs font-medium w-12">Email</span>
                  <code className="bg-white border border-green-200 text-green-800 px-2.5 py-1 rounded text-sm font-mono">
                    {credenciais.email}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(credenciais.email)}
                    className="text-green-600 text-xs hover:underline"
                  >
                    Copiar
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-600 text-xs font-medium w-12">Senha</span>
                  <code className="bg-white border border-green-200 text-green-800 px-2.5 py-1 rounded text-sm font-mono">
                    {credenciais.senha}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(credenciais.senha)}
                    className="text-green-600 text-xs hover:underline"
                  >
                    Copiar
                  </button>
                </div>
              </div>
              <p className="text-green-600 text-xs mt-3">⚠️ Anote estas credenciais — não serão exibidas novamente.</p>
            </div>
            <button onClick={() => setCredenciais(null)} className="text-green-400 hover:text-green-600 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
        {usuarios.length === 0 ? (
          <p className="px-5 py-12 text-center text-[#9CA3AF] text-sm">Nenhum usuário cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F8F8F8]">
                  {['Usuário', 'E-mail', 'Perfil', 'Loja', 'Status', 'Criado', 'Ações'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[#9CA3AF] font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-[#FAFAFA] transition-colors">
                    {/* Avatar + nome */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: 'var(--cor-primaria)', color: '#111' }}
                        >
                          {getIniciais(u.nome)}
                        </div>
                        <span className="text-[#111] font-medium whitespace-nowrap">
                          {u.nome}
                          {u.id === perfil.id && <span className="ml-1.5 text-[#9CA3AF] text-xs font-normal">(você)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] text-xs">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${perfilBadge[u.perfil]}`}>
                        {u.perfil}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{u.loja?.nome ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#9CA3AF] text-xs whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-1 flex-wrap">
                          {/* Editar */}
                          <button
                            onClick={() => abrirEditar(u)}
                            className="text-xs text-[#6B7280] hover:text-[#111] px-2.5 py-1 rounded border border-[#E5E5E5] hover:border-[#D0D0D0] transition-colors bg-white"
                          >
                            Editar
                          </button>
                          {/* Reset senha */}
                          {u.id !== perfil.id && (
                            <button
                              onClick={() => handleResetSenha(u.id)}
                              disabled={resetLoading === u.id}
                              className="text-xs text-[#6B7280] hover:text-amber-700 px-2.5 py-1 rounded border border-[#E5E5E5] hover:border-amber-200 hover:bg-amber-50 transition-colors disabled:opacity-50"
                            >
                              {resetLoading === u.id ? '...' : 'Reset senha'}
                            </button>
                          )}
                          {/* Ativar/Desativar */}
                          {u.id !== perfil.id && (
                            <button
                              onClick={() => handleToggleAtivo(u)}
                              disabled={toggleLoading === u.id}
                              className={`text-xs px-2.5 py-1 rounded border transition-colors disabled:opacity-50 ${
                                u.ativo
                                  ? 'text-[#6B7280] hover:text-red-600 border-[#E5E5E5] hover:border-red-200 hover:bg-red-50'
                                  : 'text-[#6B7280] hover:text-green-700 border-[#E5E5E5] hover:border-green-200 hover:bg-green-50'
                              }`}
                            >
                              {toggleLoading === u.id ? '...' : u.ativo ? 'Desativar' : 'Ativar'}
                            </button>
                          )}
                          {/* Deletar */}
                          {u.id !== perfil.id && (
                            <button
                              onClick={() => handleDeletar(u)}
                              disabled={deleteLoading === u.id}
                              className="text-xs text-[#6B7280] hover:text-red-600 px-2.5 py-1 rounded border border-[#E5E5E5] hover:border-red-200 transition-colors disabled:opacity-50"
                            >
                              {deleteLoading === u.id ? '...' : 'Deletar'}
                            </button>
                          )}
                        </div>
                        {/* Nova senha após reset */}
                        {senhasReset[u.id] && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-amber-600 text-xs">Nova senha:</span>
                            <code className="bg-amber-50 text-amber-700 text-xs px-1.5 py-0.5 rounded border border-amber-200 font-mono">
                              {senhasReset[u.id]}
                            </code>
                            <button
                              onClick={() => navigator.clipboard.writeText(senhasReset[u.id])}
                              className="text-amber-500 text-xs hover:underline"
                            >
                              Copiar
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Criar ──────────────────────────────────────────────────────── */}
      {modal === 'criar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={fecharModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
              <h2 className="text-[#111] font-semibold text-base">Criar usuário</h2>
              <button onClick={fecharModal} className="text-[#9CA3AF] hover:text-[#111]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCriar} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Nome completo</label>
                <input required value={nomeNovo} onChange={e => setNomeNovo(e.target.value)} className={inputCls} placeholder="João da Silva" />
              </div>
              <div>
                <label className={labelCls}>E-mail</label>
                <input required type="email" value={emailNovo} onChange={e => setEmailNovo(e.target.value)} className={inputCls} placeholder="joao@email.com" />
              </div>
              <div>
                <label className={labelCls}>Senha</label>
                <div className="flex gap-2">
                  <input
                    required
                    value={senhaNova}
                    onChange={e => setSenhaNova(e.target.value)}
                    className={inputCls}
                    placeholder="Senha inicial"
                  />
                  <button
                    type="button"
                    onClick={() => setSenhaNova(gerarSenha())}
                    className="shrink-0 px-3 py-2 rounded-lg border border-[#E5E5E5] text-[#6B7280] text-xs hover:text-[#111] hover:border-[#D0D0D0] transition-colors whitespace-nowrap"
                  >
                    Gerar senha
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Perfil</label>
                  <select value={perfilNovo} onChange={e => setPerfilNovo(e.target.value as Perfil)} className={inputCls}>
                    {perfis.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Loja</label>
                  <select value={lojaIdNova} onChange={e => setLojaIdNova(e.target.value)} className={inputCls}>
                    {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>
              </div>
              {criandoErro && <p className="text-red-600 text-sm">{criandoErro}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={criandoLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm text-[#111] transition-all hover:brightness-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--cor-primaria)' }}
                >
                  {criandoLoading ? 'Criando...' : 'Criar usuário'}
                </button>
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-4 py-2.5 rounded-lg text-sm text-[#6B7280] hover:text-[#111] border border-[#E5E5E5] hover:border-[#D0D0D0] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Editar ─────────────────────────────────────────────────────── */}
      {modal === 'editar' && editandoUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={fecharModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
              <h2 className="text-[#111] font-semibold text-base">Editar usuário</h2>
              <button onClick={fecharModal} className="text-[#9CA3AF] hover:text-[#111]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditar} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Nome</label>
                <input required value={nomeEdit} onChange={e => setNomeEdit(e.target.value)} className={inputCls} />
              </div>
              <p className="text-[#9CA3AF] text-xs">E-mail não pode ser editado ({editandoUsuario.email})</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Perfil</label>
                  <select value={perfilEdit} onChange={e => setPerfilEdit(e.target.value as Perfil)} className={inputCls}>
                    {perfis.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Loja</label>
                  <select value={lojaIdEdit} onChange={e => setLojaIdEdit(e.target.value)} className={inputCls}>
                    {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ativoEdit"
                  checked={ativoEdit}
                  onChange={e => setAtivoEdit(e.target.checked)}
                  className="w-4 h-4 accent-[var(--cor-primaria)]"
                />
                <label htmlFor="ativoEdit" className="text-[#111] text-sm">Usuário ativo</label>
              </div>
              {editandoErro && <p className="text-red-600 text-sm">{editandoErro}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={editandoLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm text-[#111] transition-all hover:brightness-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--cor-primaria)' }}
                >
                  {editandoLoading ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-4 py-2.5 rounded-lg text-sm text-[#6B7280] hover:text-[#111] border border-[#E5E5E5] hover:border-[#D0D0D0] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
