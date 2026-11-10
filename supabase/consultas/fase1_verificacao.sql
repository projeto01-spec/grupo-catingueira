-- ============================================================
-- FASE 1 — Verificação depois de rodar 021 (e depois a 022)
-- Somente leitura. Resultado: verificacao | esperado | obtido | ok
-- ============================================================

with checks as (
  -- View existe e não expõe colunas sensíveis
  select 'view veiculos_publicos existe' as verificacao, 'sim' as esperado,
         case when to_regclass('public.veiculos_publicos') is not null then 'sim' else 'não' end as obtido
  union all
  select 'view sem colunas sensíveis', 'nenhuma',
         coalesce((select string_agg(column_name, ', ')
                   from information_schema.columns
                   where table_schema = 'public' and table_name = 'veiculos_publicos'
                     and column_name in ('placa','chassi','renavam','hodometro_venda','data_aquisicao',
                                         'proprietario_tipo','percentual_socio','excluido','rascunho')
                        or (table_schema = 'public' and table_name = 'veiculos_publicos' and column_name like 'olx\_%')), 'nenhuma')
  union all
  select 'colunas da view', '(conferir)',
         (select string_agg(column_name, ', ' order by ordinal_position)
          from information_schema.columns where table_schema = 'public' and table_name = 'veiculos_publicos')
  union all
  -- Privilégios: anon só SELECT na view
  select 'anon SELECT na view', 'true', has_table_privilege('anon', 'public.veiculos_publicos', 'select')::text
  union all
  select 'anon UPDATE na view', 'false', has_table_privilege('anon', 'public.veiculos_publicos', 'update')::text
  union all
  select 'anon DELETE na view', 'false', has_table_privilege('anon', 'public.veiculos_publicos', 'delete')::text
  union all
  -- Contagem por loja: view x tabela (devem bater)
  select 'veículos públicos por loja (view)', '= tabela',
         (select string_agg(l.slug || '=' || coalesce(n, 0), ', ' order by l.slug)
          from public.lojas l
          left join (select loja_id, count(*) n from public.veiculos_publicos group by loja_id) v on v.loja_id = l.id)
  union all
  select 'veículos públicos por loja (tabela)', '= view',
         (select string_agg(l.slug || '=' || coalesce(n, 0), ', ' order by l.slug)
          from public.lojas l
          left join (select loja_id, count(*) n from public.veiculos
                     where status = 'disponivel' and rascunho = false and excluido = false group by loja_id) v on v.loja_id = l.id)
  union all
  -- Leads sem INSERT público
  select 'leads: policies de INSERT público', 'nenhuma',
         coalesce((select string_agg(policyname, ', ') from pg_policies
                   where schemaname = 'public' and tablename = 'leads' and cmd = 'INSERT'
                     and (with_check is null or btrim(with_check) = 'true')), 'nenhuma')
  union all
  -- Storage
  select 'storage: policies restrictive da fase 1', '4',
         (select count(*)::text from pg_policies
          where schemaname = 'storage' and tablename = 'objects' and policyname like 'fase1 storage%' and permissive = 'RESTRICTIVE')
  union all
  select 'funções privado.*', '4',
         (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'privado'
            and p.proname in ('usuario_acessa_loja','usuario_tem_perfil','loja_da_venda','storage_loja_do_objeto'))
  union all
  -- Transferências / troca
  select 'veiculo_transferencias: policies', 'gerencia acessa transferencias da propria loja',
         coalesce((select string_agg(policyname, ', ') from pg_policies
                   where schemaname = 'public' and tablename = 'veiculo_transferencias'), '(tabela sem policies ou inexistente)')
  union all
  select 'veiculo_recebido_venda: policies', 'gerencia acessa veiculo recebido da propria loja',
         coalesce((select string_agg(policyname, ', ') from pg_policies
                   where schemaname = 'public' and tablename = 'veiculo_recebido_venda'), '(tabela sem policies ou inexistente)')
  union all
  -- Só depois da 022:
  select '[após 022] veiculos: policies sem auth.uid()', 'nenhuma',
         coalesce((select string_agg(policyname, ', ') from pg_policies
                   where schemaname = 'public' and tablename = 'veiculos' and cmd in ('SELECT','ALL')
                     and coalesce(qual, '') not ilike '%auth.uid()%'), 'nenhuma')
  union all
  select '[após 022] anon SELECT em veiculos', 'false', has_table_privilege('anon', 'public.veiculos', 'select')::text
)
select verificacao, esperado, obtido,
       case
         when esperado in ('(conferir)', '= tabela', '= view') then '—'
         when esperado = obtido then 'OK'
         else 'VERIFICAR'
       end as ok
from checks;

-- Teste manual com a anon key (depois da 022), no terminal:
--   curl "$SUPABASE_URL/rest/v1/veiculos?select=chassi&limit=1" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
--     → esperado: [] ou erro de permissão
--   curl "$SUPABASE_URL/rest/v1/veiculos_publicos?select=id,marca&limit=1" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
--     → esperado: 1 veículo
--   curl "$SUPABASE_URL/rest/v1/veiculos_publicos?select=chassi&limit=1" ...
--     → esperado: erro "column veiculos_publicos.chassi does not exist"
