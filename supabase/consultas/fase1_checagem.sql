-- ============================================================
-- FASE 1 — Checagem do banco real (SOMENTE LEITURA)
-- Rode no SQL Editor ANTES das migrations 021/022 e me mande o resultado.
-- Uma única consulta; resultado em 3 colunas: secao | item | detalhe.
-- ============================================================

with
-- Migrations registradas pela CLI do Supabase (só existe se alguém usou `supabase db push`).
mig as (
  select 'A. migrations'::text as secao,
         'supabase_migrations.schema_migrations'::text as item,
         case
           when to_regclass('supabase_migrations.schema_migrations') is null
             then 'tabela não existe — migrations foram rodadas à mão no SQL Editor (sem registro)'
           else (xpath('/row/v/text()',
                   query_to_xml('select string_agg(version::text, '', '' order by version) as v from supabase_migrations.schema_migrations',
                                false, true, '')))[1]::text
         end as detalhe
),
-- Colunas reais de veiculos (nome:tipo, na ordem da tabela).
cols as (
  select 'B. colunas veiculos', 'todas',
         string_agg(column_name || ':' || data_type, ', ' order by ordinal_position)
  from information_schema.columns
  where table_schema = 'public' and table_name = 'veiculos'
),
-- Colunas que o código novo/antigo usa e podem não existir (migrations 001/002/010/018/020).
esperadas as (
  select 'B. colunas veiculos', 'coluna ' || c,
         case when exists (select 1 from information_schema.columns
                           where table_schema = 'public' and table_name = 'veiculos' and column_name = c)
              then 'EXISTE' else 'NÃO EXISTE' end
  from unnest(array[
    'valor_oferta','tipo','portas','excluido','rascunho',            -- usadas pela view (obrigatórias)
    'ano_fabricacao','ano_modelo','condicao','publicar_olx','publicar_marketplace', -- migration 018 (VeiculoForm envia sempre)
    'proprietario_tipo','percentual_socio','chassi','renavam','placa','hodometro_venda',
    'olx_marca_id','olx_versao_id','olx_ad_id'                       -- migration 020
  ]) as c
),
up_cols as (
  select 'B. colunas usuarios_perfil', 'todas',
         string_agg(column_name || ':' || data_type, ', ' order by ordinal_position)
  from information_schema.columns
  where table_schema = 'public' and table_name = 'usuarios_perfil'
),
tabelas as (
  select 'C. tabelas', t,
         case when to_regclass('public.' || t) is null then 'NÃO EXISTE' else 'existe' end
  from unnest(array['vendas','anexos','veiculo_transferencias','veiculo_recebido_venda',
                    'venda_pagamentos','venda_promissorias','lancamentos_financeiros','olx_integracoes']) as t
),
-- Policies atuais (nome real no banco, comando, permissive/restrictive, papéis, USING, WITH CHECK).
pol as (
  select 'D. policies ' || schemaname || '.' || tablename,
         policyname || ' [' || cmd || ', ' || permissive || ', roles=' || array_to_string(roles, ',') || ']',
         'USING: ' || coalesce(qual, '—') || ' | CHECK: ' || coalesce(with_check, '—')
  from pg_policies
  where (schemaname = 'public' and tablename in ('veiculos','leads','usuarios_perfil','veiculo_transferencias','veiculo_recebido_venda','vendas','lojas'))
     or (schemaname = 'storage' and tablename = 'objects')
),
rls as (
  select 'D. RLS ligado?', n.nspname || '.' || c.relname,
         case when c.relrowsecurity then 'RLS ligado' else 'RLS DESLIGADO' end
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('veiculos','leads','usuarios_perfil','veiculo_transferencias','veiculo_recebido_venda','vendas','lojas')
),
grants as (
  select 'E. privilégios anon', 'public.veiculos',
         'select=' || has_table_privilege('anon', 'public.veiculos', 'select')
         || ' insert=' || has_table_privilege('anon', 'public.veiculos', 'insert')
         || ' update=' || has_table_privilege('anon', 'public.veiculos', 'update')
),
-- Buckets: público?, limite de tamanho, tipos aceitos.
buckets as (
  select 'F. buckets', id,
         'public=' || public
         || ' | file_size_limit=' || coalesce(file_size_limit::text, 'sem limite')
         || ' | allowed_mime_types=' || coalesce(array_to_string(allowed_mime_types, ','), 'qualquer')
  from storage.buckets
  where id in ('veiculos-fotos', 'veiculos-documentos')
),
-- Padrão real dos caminhos: 1ª pasta de cada arquivo e se ela é um loja_id.
caminhos as (
  select 'G. caminhos ' || bucket_id,
         padrao,
         count(*)::text || ' arquivo(s) — ' || max(classe)
  from (
    select o.bucket_id,
           case
             when position('/' in o.name) = 0 then '(arquivo na raiz)'
             when split_part(o.name, '/', 1) in ('configuracoes', 'landing') then
               split_part(o.name, '/', 1) || '/'
               || coalesce((select l.slug from public.lojas l where l.id::text = split_part(o.name, '/', 2)), split_part(o.name, '/', 2))
             when split_part(o.name, '/', 1) in ('veiculo', 'venda') then split_part(o.name, '/', 1) || '/{id}'
             else coalesce((select l.slug from public.lojas l where l.id::text = split_part(o.name, '/', 1)), split_part(o.name, '/', 1))
           end as padrao,
           case
             when exists (select 1 from public.lojas l where l.id::text = split_part(o.name, '/', 1)) then '1ª pasta = loja_id'
             when split_part(o.name, '/', 1) in ('configuracoes', 'landing')
                  and exists (select 1 from public.lojas l where l.id::text = split_part(o.name, '/', 2)) then '2ª pasta = loja_id'
             when split_part(o.name, '/', 1) in ('veiculo', 'venda') then 'pasta por entidade (loja derivada do veículo/venda)'
             else 'NÃO ORGANIZADO POR LOJA'
           end as classe
    from storage.objects o
    where o.bucket_id in ('veiculos-fotos', 'veiculos-documentos')
  ) x
  group by bucket_id, padrao
),
lojas as (
  select 'H. lojas', slug, 'id=' || id || ' | dominio=' || dominio from public.lojas
)
select * from mig
union all select * from cols
union all select * from esperadas
union all select * from up_cols
union all select * from tabelas
union all select * from pol
union all select * from rls
union all select * from grants
union all select * from buckets
union all select * from caminhos
union all select * from lojas
order by 1, 2;
