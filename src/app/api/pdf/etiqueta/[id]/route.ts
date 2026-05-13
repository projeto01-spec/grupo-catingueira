import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function formatarPreco(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = adminSupabase()

  const { data: veiculo } = await supabase
    .from('veiculos')
    .select('*, loja:lojas(*)')
    .eq('id', id)
    .single()

  if (!veiculo) {
    return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
  }

  const loja = veiculo.loja as { nome: string; whatsapp: string; dominio: string }
  const veiculoUrl = `https://${loja.dominio}/veiculo/${id}`

  let qrSvg = ''
  try {
    const QRCode = (await import('qrcode')).default
    qrSvg = await QRCode.toString(veiculoUrl, { type: 'svg', width: 100, margin: 1 })
  } catch {
    qrSvg = ''
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Etiqueta — ${veiculo.marca} ${veiculo.modelo}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;background:#fff;padding:24px}
.etiqueta{width:210mm;padding:24px;border:2px solid #111;border-radius:12px}
.loja{font-size:12px;text-transform:uppercase;letter-spacing:0.15em;color:#888;margin-bottom:8px}
.marca{font-size:42px;font-weight:900;text-transform:uppercase;line-height:1;color:#111}
.modelo{font-size:32px;font-weight:700;text-transform:uppercase;color:#555;margin-bottom:4px}
.ano{font-size:18px;color:#888;margin-bottom:20px}
.preco{font-size:60px;font-weight:900;color:#F5C842;margin:16px 0}
.specs{display:flex;gap:20px;margin-bottom:20px}
.spec{text-align:center}
.spec label{display:block;font-size:10px;text-transform:uppercase;color:#aaa;letter-spacing:0.1em}
.spec span{font-size:15px;font-weight:700;color:#111}
.footer{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #eee;padding-top:16px;margin-top:8px}
.wa{font-size:14px;font-weight:700;color:#25D366}
@media print{body{padding:0}.etiqueta{border:none;border-radius:0}}
</style>
</head>
<body>
<div class="etiqueta">
  <div class="loja">${loja.nome}</div>
  <div class="marca">${veiculo.marca}</div>
  <div class="modelo">${veiculo.modelo} ${veiculo.versao ? '— ' + veiculo.versao : ''}</div>
  <div class="ano">${veiculo.ano}</div>
  <div class="preco">${formatarPreco(veiculo.preco)}</div>
  <div class="specs">
    <div class="spec"><label>KM</label><span>${veiculo.km.toLocaleString('pt-BR')}</span></div>
    <div class="spec"><label>Câmbio</label><span>${veiculo.cambio}</span></div>
    <div class="spec"><label>Cor</label><span>${veiculo.cor}</span></div>
    <div class="spec"><label>Combustível</label><span>${veiculo.combustivel}</span></div>
  </div>
  <div class="footer">
    <div>
      <div class="wa">WhatsApp: ${loja.whatsapp}</div>
      <div style="font-size:11px;color:#aaa;margin-top:4px">${veiculoUrl}</div>
    </div>
    ${qrSvg ? `<div style="width:100px">${qrSvg}</div>` : ''}
  </div>
</div>
<script>window.onload=()=>window.print()</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
