import { NextResponse } from 'next/server'
import { html } from '@/lib/escape-html'
import { conferirLojaDoRegistro, mensagemOutraLoja, type PerfilLoja } from '@/lib/loja-ativa'

// Rotas /api/pdf/* (ficha, etiqueta, contrato, venda): o registro precisa ser
// da loja ATIVA do painel, igual às páginas e Server Actions. Retorna a
// resposta de bloqueio, ou null se pode seguir.
export async function bloqueioPorLoja(perfil: PerfilLoja, lojaDoRegistro: string | null | undefined): Promise<NextResponse | null> {
  const conferencia = await conferirLojaDoRegistro(perfil, lojaDoRegistro)
  if (conferencia.status === 'ok') return null
  if (conferencia.status === 'negado') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  // Admin/diretor com o seletor em outra loja: página simples explicando.
  const pagina = html`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Registro de outra loja</title>
<style>body{font-family:Arial,sans-serif;background:#F8F8F8;margin:0;padding:24px;color:#111}
.box{max-width:560px;margin:40px auto;background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:20px}
a{display:inline-block;margin-top:12px;color:#111;font-weight:700}</style></head>
<body><div class="box"><p><strong>${mensagemOutraLoja(conferencia.loja.nome)}</strong></p>
<p>Troque a loja no seletor do painel e abra a impressão de novo.</p>
<a href="/admin/veiculos">Voltar ao painel</a></div></body></html>`
  return new NextResponse(pagina.toString(), {
    status: 409,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
