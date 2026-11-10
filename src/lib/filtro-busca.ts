// Texto digitado pelo usuário usado dentro de `.or()` do supabase-js.
//
// `.or('marca.ilike.%x%,modelo.ilike.%x%')` é enviado cru ao PostgREST: uma
// vírgula ou parêntese no texto quebra o filtro (ou acrescenta condições), e
// `%`/`_` viram curinga do LIKE. Aqui:
//   1. `\`, `%` e `_` são escapados para o LIKE (escape padrão do Postgres é `\`);
//   2. o padrão vai entre aspas duplas, que é como o PostgREST aceita vírgula,
//      ponto, dois-pontos e parênteses dentro de um valor — com `\` e `"`
//      escapados por barra invertida, conforme a doc do PostgREST;
//   3. `*` é removido (o PostgREST o trata como curinga em like/ilike).

const TAMANHO_MAXIMO = 100

/** Escapa curingas do LIKE (`\`, `%`, `_`). Útil também em `.ilike()` fora de `.or()`. */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, c => `\\${c}`)
}

/** Normaliza o termo de busca: corta tamanho, remove `*` e espaços nas pontas. */
export function normalizarTermoBusca(texto: string | null | undefined): string {
  return (texto ?? '').replace(/\*/g, ' ').trim().slice(0, TAMANHO_MAXIMO)
}

/** Padrão `%termo%` pronto para ir como valor de `ilike` dentro de `.or()`. */
export function padraoIlikeParaOr(termo: string): string {
  const padrao = `%${escaparLike(termo)}%`
  return `"${padrao.replace(/[\\"]/g, c => `\\${c}`)}"`
}

/**
 * Monta a string de `.or()` com `ilike` em várias colunas.
 * Retorna null se o termo ficar vazio depois de normalizado.
 *
 *   const filtro = filtroOrIlike(['marca', 'modelo'], params.busca)
 *   if (filtro) query = query.or(filtro)
 */
export function filtroOrIlike(colunas: string[], texto: string | null | undefined): string | null {
  const termo = normalizarTermoBusca(texto)
  if (!termo) return null
  const padrao = padraoIlikeParaOr(termo)
  return colunas.map(c => `${c}.ilike.${padrao}`).join(',')
}
