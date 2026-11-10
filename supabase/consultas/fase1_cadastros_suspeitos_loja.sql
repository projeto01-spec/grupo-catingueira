-- ============================================================
-- FASE 1 — Cadastros que PODEM ter ido para a loja errada (SOMENTE LEITURA)
--
-- Causa do bug: para admin/diretor SEM cookie `loja_ativa` válido (1º acesso,
-- outro navegador/celular, cookie expirado após 7 dias), o seletor mostrava a
-- 1ª loja em ordem alfabética (CATINGUEIRA), mas tudo que era cadastrado ia
-- para perfil.loja_id do usuário. Se o perfil do usuário é da FELIZARDO,
-- cadastros feitos "na Catingueira" foram gravados na Felizardo.
--
-- Não há como saber pelo banco qual loja estava no seletor no momento. Esta
-- consulta lista os candidatos para conferência manual: registros criados por
-- admin/diretor cuja loja_id = perfil.loja_id do autor, quando essa loja NÃO é
-- a 1ª em ordem alfabética (ou seja, quando rótulo e dado divergiam).
-- `veiculos` não tem coluna de autor: entram todos os veículos dessas lojas
-- criados no período, para revisão.
--
-- Ajuste o período em `desde` se quiser (padrão: 180 dias).
-- Resultado: tipo | registro_id | loja_gravada | autor | criado_em | descricao
-- ============================================================

with
params as (select now() - interval '180 days' as desde),
primeira_loja as (select id from public.lojas order by nome limit 1),
-- admin/diretor cujo perfil é de uma loja diferente da 1ª alfabética
autores as (
  select up.id, up.nome, up.loja_id
  from public.usuarios_perfil up
  where up.perfil in ('admin', 'diretor')
    and up.loja_id <> (select id from primeira_loja)
),
lj as (select id, nome from public.lojas),

leads_s as (
  select 'lead'::text as tipo, l.id::text as registro_id, l.loja_id, a.nome as autor, l.created_at as criado_em,
         concat_ws(' — ', l.nome, l.telefone, l.origem) as descricao
  from public.leads l join autores a on a.id = l.criado_por and a.loja_id = l.loja_id
  where l.created_at >= (select desde from params)
),
lanc_s as (
  select 'lançamento financeiro', lf.id::text, lf.loja_id, a.nome, lf.criado_em,
         concat_ws(' — ', lf.tipo, lf.categoria, lf.valor::text, lf.descricao)
  from public.lancamentos_financeiros lf join autores a on a.id = lf.criado_por and a.loja_id = lf.loja_id
  where lf.criado_em >= (select desde from params)
),
vendas_s as (
  -- vendas não têm autor; vendedor_id é o vendedor escolhido (costuma ser quem lançou)
  select 'venda (vendedor = admin/diretor)', vd.id::text, vd.loja_id, a.nome, vd.created_at,
         concat_ws(' — ', vd.numero_venda, vd.status, vd.comprador_nome)
  from public.vendas vd join autores a on a.id = vd.vendedor_id and a.loja_id = vd.loja_id
  where vd.created_at >= (select desde from params)
),
veic_s as (
  -- sem autor: todos os veículos das lojas afetadas no período
  select 'veículo (sem autor — conferir)', v.id::text, v.loja_id, null::text, v.created_at,
         concat_ws(' ', v.marca, v.modelo, v.ano::text, nullif(v.placa, ''))
  from public.veiculos v
  where v.loja_id in (select loja_id from autores)
    and v.created_at >= (select desde from params)
    and coalesce(v.excluido, false) = false
),
tudo as (
  select * from leads_s
  union all select * from lanc_s
  union all select * from vendas_s
  union all select * from veic_s
)
select t.tipo, t.registro_id, coalesce(lj.nome, t.loja_id::text) as loja_gravada, t.autor, t.criado_em, t.descricao
from tudo t left join lj on lj.id = t.loja_id
order by t.criado_em desc;

-- Para corrigir um registro que caiu na loja errada:
--   veículo → use "Transferir" no admin (move financeiro/custos/vistoria e grava histórico).
--   lead / lançamento / venda → me diga quais ids; preparo o UPDATE específico
--   (venda tem pagamentos/promissórias ligados e precisa de cuidado).
