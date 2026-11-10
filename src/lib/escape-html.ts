// Escapa texto para HTML. Usado pelas rotas de impressão (/api/pdf/*), que
// montam a página como string: sem isso, um "<script>" cadastrado em marca,
// modelo, nome do comprador etc. rodaria na sessão de quem abrisse a ficha
// (mesmo domínio do admin, com os cookies de login).

const MAPA: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
}

export function escapeHtml(valor: unknown): string {
  if (valor === null || valor === undefined || valor === false) return ''
  return String(valor).replace(/[&<>"'`]/g, c => MAPA[c])
}

/** Trecho de HTML já seguro (montado por `html` ou constante do próprio código). */
export class HtmlSeguro {
  private readonly valor: string
  constructor(valor: string) {
    this.valor = valor
  }
  toString(): string {
    return this.valor
  }
}

/** Marca um trecho como HTML confiável — só para strings fixas do código (CSS, SVG gerado pela lib de QR). */
export function raw(valor: string): HtmlSeguro {
  return new HtmlSeguro(valor)
}

function interpolar(valor: unknown): string {
  if (valor instanceof HtmlSeguro) return valor.toString()
  if (Array.isArray(valor)) return valor.map(interpolar).join('')
  return escapeHtml(valor)
}

/**
 * Template tag que escapa TODO valor interpolado, exceto o que já for
 * HtmlSeguro (outro `html`...`` ou `raw()`). Arrays são concatenados.
 *
 *   html`<td>${venda.comprador_nome}</td>`  // nome escapado
 */
export function html(partes: TemplateStringsArray, ...valores: unknown[]): HtmlSeguro {
  let saida = partes[0]
  for (let i = 0; i < valores.length; i++) {
    saida += interpolar(valores[i]) + partes[i + 1]
  }
  return new HtmlSeguro(saida)
}

/** Cor CSS vinda do banco: só aceita #rgb/#rrggbb/#rrggbbaa; senão usa o fallback. */
export function corCssSegura(cor: string | null | undefined, fallback: string): string {
  return cor && /^#[0-9a-f]{3,8}$/i.test(cor.trim()) ? cor.trim() : fallback
}
