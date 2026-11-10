import { cache } from 'react'
import { cookies } from 'next/headers'
import { adminSupabase } from '@/lib/supabase-server'
import { carregarLojasAcesso, ehPerfilTodasLojas } from '@/lib/acesso'
import type { Perfil } from '@/types'

// ─── Loja ativa do painel admin — FONTE ÚNICA ─────────────────────────────────
//
// Antes, o seletor (admin/layout.tsx) e as páginas resolviam a loja de jeitos
// diferentes: sem cookie válido, o seletor mostrava a 1ª loja em ordem
// alfabética (Catingueira) e as páginas usavam perfil.loja_id (ex.: Felizardo).
// Resultado: rótulo "Catingueira" com dados — e cadastros — da Felizardo.
//
// Regra única (usada pelo layout, por todas as páginas do admin, pelas Server
// Actions e pelas rotas /api/pdf):
//   - lojas permitidas: admin/diretor → todas; demais → as marcadas no
//     cadastro (usuarios_lojas, migration 024).
//   - loja ativa: cookie `loja_ativa` SE estiver entre as permitidas; senão a
//     loja padrão (perfil.loja_id); senão a primeira permitida. Quem perdeu
//     acesso à loja do cookie cai na padrão no próximo carregamento.
//   - seletor: só para quem tem mais de uma loja permitida.
// Ninguém mais lê perfil.loja_id direto para filtrar dados.

export const COOKIE_LOJA_ATIVA = 'loja_ativa'

export type LojaResumo = { id: string; nome: string }

/**
 * O mínimo do perfil que a regra precisa (serve UsuarioPerfil e PerfilAcesso).
 * `lojas_acesso` vem pronto no PerfilAcesso; para UsuarioPerfil é carregado
 * aqui pelo `id`.
 */
export type PerfilLoja = { id: string; perfil: Perfil; loja_id: string; lojas_acesso?: string[] }

export type LojaAtiva = {
  /** Loja em uso no painel (null só se não houver loja nenhuma cadastrada). */
  loja: LojaResumo | null
  /** Lojas que o usuário pode selecionar. */
  lojasPermitidas: LojaResumo[]
  /** Se o usuário pode trocar de loja pelo seletor (tem mais de uma). */
  podeTrocar: boolean
}

// Uma consulta por requisição (layout + página + actions compartilham).
const listarLojas = cache(async (): Promise<LojaResumo[]> => {
  const { data } = await adminSupabase().from('lojas').select('id, nome').order('nome')
  const vistos = new Set<string>()
  return ((data ?? []) as LojaResumo[]).filter(l => (vistos.has(l.id) ? false : (vistos.add(l.id), true)))
})

const lojasAcessoDoUsuario = cache(
  (userId: string, lojaPadrao: string): Promise<string[]> => carregarLojasAcesso(userId, lojaPadrao)
)

export async function lojasPermitidas(perfil: PerfilLoja): Promise<LojaResumo[]> {
  const lojas = await listarLojas()
  if (ehPerfilTodasLojas(perfil.perfil)) return lojas
  const ids = perfil.lojas_acesso ?? (await lojasAcessoDoUsuario(perfil.id, perfil.loja_id))
  return lojas.filter(l => ids.includes(l.id))
}

export async function resolverLojaAtiva(perfil: PerfilLoja): Promise<LojaAtiva> {
  const permitidas = await lojasPermitidas(perfil)
  const doCookie = (await cookies()).get(COOKIE_LOJA_ATIVA)?.value
  const loja =
    permitidas.find(l => l.id === doCookie) ??
    permitidas.find(l => l.id === perfil.loja_id) ??
    permitidas[0]

  return { loja: loja ?? null, lojasPermitidas: permitidas, podeTrocar: permitidas.length > 1 }
}

/** Id da loja ativa (atalho para filtros). */
export async function obterLojaAtivaId(perfil: PerfilLoja): Promise<string> {
  const { loja } = await resolverLojaAtiva(perfil)
  return loja?.id ?? perfil.loja_id
}

export async function nomeDaLoja(lojaId: string | null | undefined): Promise<string> {
  const lojas = await listarLojas()
  return lojas.find(l => l.id === lojaId)?.nome ?? 'outra loja'
}

export type ConferenciaLoja =
  | { status: 'ok' }
  /** Usuário com acesso a mais de uma loja e o seletor em outra: pode trocar e abrir. */
  | { status: 'outra-loja'; loja: LojaResumo }
  /** Sem acesso à loja do registro (ou registro sem loja): tratar como 404. */
  | { status: 'negado' }

/** Confere se um registro (pela loja dele) pode ser aberto com a loja ativa atual. */
export async function conferirLojaDoRegistro(
  perfil: PerfilLoja,
  lojaDoRegistro: string | null | undefined
): Promise<ConferenciaLoja> {
  if (!lojaDoRegistro) return { status: 'negado' }
  const { loja, lojasPermitidas: permitidas, podeTrocar } = await resolverLojaAtiva(perfil)
  if (loja?.id === lojaDoRegistro) return { status: 'ok' }
  const lojaRegistro = permitidas.find(l => l.id === lojaDoRegistro)
  if (podeTrocar && lojaRegistro) return { status: 'outra-loja', loja: lojaRegistro }
  return { status: 'negado' }
}

/** Mensagem padrão quando o registro é de outra loja. */
export function mensagemOutraLoja(nomeLoja: string): string {
  return `Este registro pertence à loja ${nomeLoja} — troque a loja no seletor para abrir.`
}
