-- ============================================================
-- FASE 1 — Inconsistências de loja (SOMENTE LEITURA)
-- Versão adaptativa: funciona com o schema real, mesmo que tabelas/colunas
-- do SQL versionado não existam (ex.: vistoria_veiculo não existe no banco).
--
-- Como funciona: cria uma função TEMPORÁRIA (pg_temp — some quando a sessão
-- fecha, não grava nada no banco) que, para cada tabela, primeiro confere se
-- ela existe e tem veiculo_id/loja_id. Colunas opcionais são lidas com
-- to_jsonb(linha)->>'coluna' (devolve nulo se a coluna não existir, sem erro).
-- Tabela ausente aparece como linha "AVISO" no resultado.
--
-- Resultado: tipo | situacao | registro_id | veiculo | loja_registro | loja_veiculo | data | detalhe
--   ERRO    → nunca deveria acontecer (a transferência move esses registros junto)
--   REVISAR → pode ser legítimo (venda feita antes de o carro ser transferido; lead antigo)
--   AVISO   → tabela/coluna não existe no banco; verificação pulada
-- ============================================================

create or replace function pg_temp.fase1_inconsistencias()
returns table (
  tipo text, situacao text, registro_id text, veiculo text,
  loja_registro uuid, loja_veiculo uuid, data timestamptz, detalhe text
)
language plpgsql
as $fn$
declare
  s record;
  tem_colunas boolean;
begin
  -- Registros filhos do veículo com loja_id próprio.
  for s in
    select * from (values
      ('financeiro_veiculos', 'ERRO',    'custo/preço do carro preso na loja antiga'),
      ('custos_manutencao',   'ERRO',    'custo/serviço preso na loja antiga'),
      ('vistoria_veiculo',    'ERRO',    'vistoria presa na loja antiga'),
      ('leads',               'REVISAR', 'lead de uma loja apontando para carro de outra'),
      ('vendas',              'REVISAR', 'venda de uma loja com carro que hoje está em outra')
    ) as x(tabela, sit, det)
  loop
    select count(*) = 2 into tem_colunas
    from information_schema.columns
    where table_schema = 'public' and table_name = s.tabela and column_name in ('veiculo_id', 'loja_id');

    if to_regclass('public.' || s.tabela) is null or not tem_colunas then
      tipo := s.tabela; situacao := 'AVISO';
      registro_id := null; veiculo := null; loja_registro := null; loja_veiculo := null; data := null;
      detalhe := case when to_regclass('public.' || s.tabela) is null
                      then 'tabela não existe no banco — verificação pulada'
                      else 'tabela sem colunas veiculo_id/loja_id — verificação pulada' end;
      return next;
      continue;
    end if;

    return query execute format($q$
      select %L::text,
             %L::text,
             to_jsonb(x) ->> 'id',
             concat_ws(' ', v.marca, v.modelo, v.ano::text, nullif(to_jsonb(v) ->> 'placa', '')),
             x.loja_id,
             v.loja_id,
             coalesce(to_jsonb(x) ->> 'created_at', to_jsonb(x) ->> 'criado_em')::timestamptz,
             %L || coalesce(' — ' || nullif(concat_ws(' · ',
                                to_jsonb(x) ->> 'numero_venda',
                                to_jsonb(x) ->> 'status',
                                to_jsonb(x) ->> 'comprador_nome',
                                to_jsonb(x) ->> 'nome'), ''), '')
      from public.%I x
      join public.veiculos v on v.id = x.veiculo_id
      where x.loja_id is distinct from v.loja_id
    $q$, s.tabela, s.sit, s.det, s.tabela);
  end loop;

  -- Histórico de transferências.
  if to_regclass('public.veiculo_transferencias') is null then
    tipo := 'veiculo_transferencias'; situacao := 'AVISO';
    registro_id := null; veiculo := null; loja_registro := null; loja_veiculo := null; data := null;
    detalhe := 'tabela não existe no banco — verificação pulada';
    return next;
  else
    return query execute $q$
      with t as (
        select to_jsonb(x) ->> 'id' as id,
               (to_jsonb(x) ->> 'veiculo_id')::uuid as veiculo_id,
               (to_jsonb(x) ->> 'loja_origem_id')::uuid as origem,
               (to_jsonb(x) ->> 'loja_destino_id')::uuid as destino,
               (to_jsonb(x) ->> 'data_transferencia')::timestamptz as quando
        from public.veiculo_transferencias x
      ),
      ultima as (
        select distinct on (veiculo_id) * from t order by veiculo_id, quando desc nulls last
      ),
      cadeia as (
        select t.*, lag(destino) over (partition by veiculo_id order by quando) as destino_anterior from t
      )
      select 'transferência (última)'::text, 'ERRO'::text, u.id,
             concat_ws(' ', v.marca, v.modelo, v.ano::text, nullif(to_jsonb(v) ->> 'placa', '')),
             u.destino, v.loja_id, u.quando,
             'veículo não está na loja de destino da última transferência'::text
      from ultima u join public.veiculos v on v.id = u.veiculo_id
      where u.destino is distinct from v.loja_id
      union all
      select 'transferência (cadeia)', 'REVISAR', c.id,
             concat_ws(' ', v.marca, v.modelo, v.ano::text, nullif(to_jsonb(v) ->> 'placa', '')),
             c.origem, c.destino_anterior, c.quando,
             'origem desta transferência ≠ destino da anterior'
      from cadeia c join public.veiculos v on v.id = c.veiculo_id
      where c.destino_anterior is not null and c.origem is distinct from c.destino_anterior
    $q$;
  end if;
end
$fn$;

select i.tipo,
       i.situacao,
       i.registro_id,
       i.veiculo,
       coalesce(lr.nome, i.loja_registro::text) as loja_registro,
       coalesce(lv.nome, i.loja_veiculo::text) as loja_veiculo,
       i.data,
       i.detalhe
from pg_temp.fase1_inconsistencias() i
left join public.lojas lr on lr.id = i.loja_registro
left join public.lojas lv on lv.id = i.loja_veiculo
order by case i.situacao when 'ERRO' then 1 when 'REVISAR' then 2 else 3 end, i.tipo, i.data desc nulls last;
