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

function formatarKm(v: number) {
  return v.toLocaleString('pt-BR') + ' km'
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

  const loja = veiculo.loja as { nome: string; whatsapp: string; endereco: string | null; dominio: string }

  const veiculoUrl = `https://${loja.dominio}/veiculo/${id}`

  let qrSvg = ''
  try {
    const QRCode = (await import('qrcode')).default
    qrSvg = await QRCode.toString(veiculoUrl, { type: 'svg', width: 80, margin: 1 })
  } catch {
    qrSvg = ''
  }

  const fotoHtml = veiculo.fotos[0]
    ? `<img src="${veiculo.fotos[0]}" alt="Foto principal" style="width:100%;height:240px;object-fit:cover;border-radius:8px;margin-bottom:16px;" />`
    : ''

  const opcionaisHtml = veiculo.opcionais?.length
    ? `<div style="margin-top:16px;"><strong>Opcionais:</strong><br/>${(veiculo.opcionais as string[]).join(' • ')}</div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Ficha — ${veiculo.marca} ${veiculo.modelo}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#111;background:#fff;padding:32px;max-width:800px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #F5C842;padding-bottom:16px;margin-bottom:24px}
.logo{font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.item{background:#F9F9F9;border-radius:6px;padding:10px 14px}
.item label{display:block;font-size:10px;text-transform:uppercase;color:#888;letter-spacing:0.1em;margin-bottom:4px}
.item span{font-size:14px;font-weight:600;color:#111}
.preco{font-size:36px;font-weight:900;margin:16px 0}
.desc{font-size:13px;color:#555;line-height:1.6;margin-top:8px}
.footer{margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#888;display:flex;justify-content:space-between;align-items:center}
@media print{body{padding:16px}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">${loja.nome}</div>
    <div style="color:#888;font-size:12px;margin-top:4px">${loja.endereco ?? ''}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:12px;color:#888">WhatsApp</div>
    <div style="font-size:14px;font-weight:600">${loja.whatsapp}</div>
  </div>
</div>

${fotoHtml}

<h1 style="font-size:28px;font-weight:900;text-transform:uppercase;margin-bottom:4px">${veiculo.marca} ${veiculo.modelo}</h1>
<p style="color:#888;font-size:14px;margin-bottom:16px">${veiculo.versao ?? ''} ${veiculo.ano}</p>

<div class="preco" style="color:#F5C842">${formatarPreco(veiculo.preco)}</div>

<div class="grid">
  <div class="item"><label>Quilometragem</label><span>${formatarKm(veiculo.km)}</span></div>
  <div class="item"><label>Câmbio</label><span>${veiculo.cambio}</span></div>
  <div class="item"><label>Combustível</label><span>${veiculo.combustivel}</span></div>
  <div class="item"><label>Cor</label><span>${veiculo.cor}</span></div>
  ${veiculo.placa ? `<div class="item"><label>Placa</label><span>${veiculo.placa}</span></div>` : ''}
  <div class="item"><label>Ano</label><span>${veiculo.ano}</span></div>
</div>

${veiculo.descricao ? `<div class="desc">${veiculo.descricao}</div>` : ''}
${opcionaisHtml}

<div class="footer">
  <div>
    <div>${loja.nome}</div>
    <div>${veiculoUrl}</div>
  </div>
  ${qrSvg ? `<div style="width:80px">${qrSvg}</div>` : ''}
</div>

<script>window.onload=()=>window.print()</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
