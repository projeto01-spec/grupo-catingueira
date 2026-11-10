-- ============================================================
-- FASE 1 — Inconsistências de loja (SOMENTE LEITURA)
-- Registros ligados a um veículo com loja_id diferente da loja ATUAL do
-- veículo, e histórico de transferência que não bate com a loja atual.
-- Resultado: tipo | situacao | registro_id | veiculo | loja_registro | loja_veiculo | data | detalhe
--
-- Como ler a coluna "situacao":
--   ERRO     → nunca deveria acontecer (a transferência move esses registros junto)
--   REVISAR  → pode ser legítimo (ex.: venda feita na loja A e o carro foi
--              transferido depois; lead criado antes da transferência)
--
-- Requer a tabela veiculo_transferencias (migration 009). Se ela não existir,
-- apague o bloco "transferências" no final antes de rodar.
-- ============================================================

with
v as (
  select v.id, v.loja_id, v.created_at,
         concat_ws(' ', v.marca, v.modelo, v.ano::text, nullif(v.placa, '')) as descricao
  from public.veiculos v
),
lj as (select id, nome from public.lojas),

-- financeiro_veiculos / custos_manutencao / vistoria_veiculo: a transferência
-- atualiza o loja_id deles junto com o veículo → divergência é ERRO.
fin as (
  select 'financeiro_veiculos'::text as tipo, 'ERRO'::text as situacao, f.id::text as registro_id,
         v.descricao as veiculo, f.loja_id as loja_registro, v.loja_id as loja_veiculo,
         f.created_at as data, 'custo/preço do carro preso na loja antiga — some do financeiro da loja atual'::text as detalhe
  from public.financeiro_veiculos f join v on v.id = f.veiculo_id
  where f.loja_id is distinct from v.loja_id
),
custos as (
  select 'custos_manutencao', 'ERRO', c.id::text, v.descricao, c.loja_id, v.loja_id,
         c.created_at, 'custo/serviço preso na loja antiga'
  from public.custos_manutencao c join v on v.id = c.veiculo_id
  where c.loja_id is distinct from v.loja_id
),
vist as (
  select 'vistoria_veiculo', 'ERRO', vv.id::text, v.descricao, vv.loja_id, v.loja_id,
         vv.created_at, 'vistoria presa na loja antiga'
  from public.vistoria_veiculo vv join v on v.id = vv.veiculo_id
  where vv.loja_id is distinct from v.loja_id
),
-- leads e vendas NÃO são movidos na transferência (regra atual) → REVISAR.
lead as (
  select 'leads (veiculo_id)', 'REVISAR', l.id::text, v.descricao, l.loja_id, v.loja_id,
         l.created_at, 'lead de uma loja apontando para carro de outra (' || coalesce(l.nome, '') || ')'
  from public.leads l join v on v.id = l.veiculo_id
  where l.loja_id is distinct from v.loja_id
),
venda as (
  select 'vendas', 'REVISAR', vd.id::text, v.descricao, vd.loja_id, v.loja_id,
         vd.created_at, 'venda ' || coalesce(vd.numero_venda, '(sem número)') || ' — ' || coalesce(vd.status, '')
           || ' — comprador ' || coalesce(vd.comprador_nome, '')
  from public.vendas vd join v on v.id = vd.veiculo_id
  where vd.loja_id is distinct from v.loja_id
),

-- transferências: loja atual ≠ destino da ÚLTIMA transferência → ERRO
ultima as (
  select distinct on (t.veiculo_id) t.*
  from public.veiculo_transferencias t
  order by t.veiculo_id, t.data_transferencia desc
),
transf_atual as (
  select 'transferência (última)', 'ERRO', u.id::text, v.descricao, u.loja_destino_id, v.loja_id,
         u.data_transferencia, 'veículo não está na loja de destino da última transferência'
  from ultima u join v on v.id = u.veiculo_id
  where u.loja_destino_id is distinct from v.loja_id
),
-- cadeia quebrada: origem de uma transferência ≠ destino da anterior → REVISAR
cadeia as (
  select t.*, lag(t.loja_destino_id) over (partition by t.veiculo_id order by t.data_transferencia) as destino_anterior
  from public.veiculo_transferencias t
),
transf_cadeia as (
  select 'transferência (cadeia)', 'REVISAR', c.id::text, v.descricao, c.loja_origem_id, c.destino_anterior,
         c.data_transferencia, 'origem desta transferência ≠ destino da anterior'
  from cadeia c join v on v.id = c.veiculo_id
  where c.destino_anterior is not null and c.loja_origem_id is distinct from c.destino_anterior
),

tudo as (
  select * from fin
  union all select * from custos
  union all select * from vist
  union all select * from lead
  union all select * from venda
  union all select * from transf_atual
  union all select * from transf_cadeia
)
select t.tipo, t.situacao, t.registro_id, t.veiculo,
       coalesce(lr.nome, t.loja_registro::text) as loja_registro,
       coalesce(lv.nome, t.loja_veiculo::text) as loja_veiculo,
       t.data, t.detalhe
from tudo t
left join lj lr on lr.id = t.loja_registro
left join lj lv on lv.id = t.loja_veiculo
order by t.situacao, t.tipo, t.data desc;

-- Veículo específico do relato (Hilux 94b80c7c…): loja atual e transferências.
-- Descomente para conferir:
-- select v.id, l.nome as loja_atual, v.created_at,
--        (select json_agg(json_build_object('de', lo.nome, 'para', ld.nome, 'em', t.data_transferencia) order by t.data_transferencia)
--           from public.veiculo_transferencias t
--           left join public.lojas lo on lo.id = t.loja_origem_id
--           left join public.lojas ld on ld.id = t.loja_destino_id
--          where t.veiculo_id = v.id) as transferencias
-- from public.veiculos v join public.lojas l on l.id = v.loja_id
-- where v.id = '94b80c7c-d026-4ca4-b979-61134838e793';
