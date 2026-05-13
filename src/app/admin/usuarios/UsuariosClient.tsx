'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateUserRole, inviteUser, deleteUser } from '@/app/actions'
import type { UsuarioPerfil, Loja, Perfil } from '@/types'

interface Props {
  perfil: UsuarioPerfil
  usuarios: (UsuarioPerfil & { loja: Loja | null })[]
  lojas: Loja[]
}

const perfis: Perfil[] = ['vendedor', 'gerente', 'diretor', 'admin']

export default function UsuariosClient({ perfil, usuarios, lojas }: Props) {
  const router = useRouter()

  const [convidarAberto, setConvidarAberto] = useState(false)
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [lojaId, setLojaId] = useState(lojas[0]?.id ?? '')
  const [novoPerfil, setNovoPerfil] = useState<Perfil>('vendedor')
  const [convidandoLoading, setConvidandoLoading] = useState(false)
  const [convidandoErro, setConvidandoErro] = useState<string | null>(null)
  const [convidandoSucesso, setConvidandoSucesso] = useState(false)

  const [roleLoading, setRoleLoading] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  async function handleConvidar(e: React.FormEvent) {
    e.preventDefault()
    setConvidandoLoading(true)
    setConvidandoErro(null)
    try {
      await inviteUser(email, lojaId, novoPerfil, nome)
      setConvidandoSucesso(true)
      setEmail('')
      setNome('')
      setConvidarAberto(false)
      router.refresh()
    } catch (err: unknown) {
      setConvidandoErro(err instanceof Error ? err.message : 'Erro ao convidar')
    } finally {
      setConvidandoLoading(false)
    }
  }

  async function handleRoleChange(perfilId: string, p: Perfil) {
    setRoleLoading(perfilId)
    try {
      await updateUserRole(perfilId, p)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar perfil')
    } finally {
      setRoleLoading(null)
    }
  }

  async function handleDelete(id: string, nomeUsuario: string) {
    if (!confirm(`Remover o usuário "${nomeUsuario}"? Esta ação não pode ser desfeita.`)) return
    setDeleteLoading(id)
    try {
      await deleteUser(id)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao remover usuário')
    } finally {
      setDeleteLoading(null)
    }
  }

  const perfilBadge: Record<Perfil, string> = {
    vendedor: 'bg-gray-100 text-gray-600',
    gerente: 'bg-blue-50 text-blue-700',
    diretor: 'bg-purple-50 text-purple-700',
    admin: 'bg-red-50 text-red-700',
  }

  const inputCls = 'w-full bg-[#F8F8F8] border border-[#E5E5E5] rounded-lg px-3 py-2 text-[#111] text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors'

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
            Usuários
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">{usuarios.length} usuário(s)</p>
        </div>
        <button
          onClick={() => {
            setConvidarAberto(true)
            setConvidandoSucesso(false)
            setConvidandoErro(null)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm text-[#111] transition-all hover:brightness-90"
          style={{ backgroundColor: 'var(--cor-primaria)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Convidar usuário
        </button>
      </div>

      {convidandoSucesso && (
        <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Convite enviado com sucesso! O usuário receberá um e-mail para definir sua senha.
        </div>
      )}

      {convidarAberto && (
        <div className="mb-6 bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm">
          <h2 className="text-[#111] font-semibold text-sm mb-4">Convidar novo usuário</h2>
          <form onSubmit={handleConvidar} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#9CA3AF] text-xs uppercase tracking-wider mb-1.5">Nome</label>
              <input required value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" className={inputCls} />
            </div>
            <div>
              <label className="block text-[#9CA3AF] text-xs uppercase tracking-wider mb-1.5">E-mail</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" className={inputCls} />
            </div>
            <div>
              <label className="block text-[#9CA3AF] text-xs uppercase tracking-wider mb-1.5">Loja</label>
              <select value={lojaId} onChange={e => setLojaId(e.target.value)} className={inputCls}>
                {lojas.map(l => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#9CA3AF] text-xs uppercase tracking-wider mb-1.5">Perfil</label>
              <select value={novoPerfil} onChange={e => setNovoPerfil(e.target.value as Perfil)} className={inputCls}>
                {perfis.map(p => (
                  <option key={p} value={p} className="capitalize">{p}</option>
                ))}
              </select>
            </div>
            {convidandoErro && (
              <div className="col-span-full text-red-600 text-xs">{convidandoErro}</div>
            )}
            <div className="col-span-full flex gap-2">
              <button
                type="submit"
                disabled={convidandoLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#111] transition-all hover:brightness-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--cor-primaria)' }}
              >
                {convidandoLoading ? 'Enviando...' : 'Enviar convite'}
              </button>
              <button
                type="button"
                onClick={() => setConvidarAberto(false)}
                className="px-4 py-2 rounded-lg text-sm text-[#6B7280] hover:text-[#111] border border-[#E5E5E5] hover:border-[#D0D0D0] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
        {usuarios.length === 0 ? (
          <p className="px-5 py-12 text-center text-[#9CA3AF] text-sm">
            Nenhum usuário cadastrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F8F8F8]">
                  {['Nome', 'Loja', 'Perfil', 'Ações'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[#9CA3AF] font-medium text-xs uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3 text-[#111] font-medium">{u.nome}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{u.loja?.nome ?? '—'}</td>
                    <td className="px-4 py-3">
                      {u.id === perfil.id ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${perfilBadge[u.perfil]}`}>
                          {u.perfil} (você)
                        </span>
                      ) : (
                        <select
                          defaultValue={u.perfil}
                          disabled={roleLoading === u.id}
                          onChange={e => handleRoleChange(u.id, e.target.value as Perfil)}
                          className="bg-[#F8F8F8] border border-[#E5E5E5] rounded-md px-2 py-1 text-xs text-[#111] focus:outline-none focus:border-[var(--cor-primaria)] disabled:opacity-50"
                        >
                          {perfis.map(p => (
                            <option key={p} value={p} className="capitalize">{p}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.id !== perfil.id && (
                        <button
                          onClick={() => handleDelete(u.id, u.nome)}
                          disabled={deleteLoading === u.id}
                          className="text-xs text-[#6B7280] hover:text-red-600 px-2.5 py-1.5 rounded-md border border-[#E5E5E5] hover:border-red-200 transition-colors disabled:opacity-50"
                        >
                          {deleteLoading === u.id ? '...' : 'Remover'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
