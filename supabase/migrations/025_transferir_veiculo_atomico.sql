-- ============================================================
-- MIGRATION 025 — Transferência de veículo atômica (tudo ou nada)
-- Rode no SQL Editor ANTES do deploy da branch fase1-lojas: o código novo
-- chama esta função (supabase.rpc('transferir_veiculo')) e, sem ela, a
-- transferência é recusada com "precisa da migration 025" (nada é alterado).
-- Idempotente (create or replace). Não depende da 024.
--
-- Por quê: a action fazia 5 chamadas separadas (histórico, veiculos,
-- financeiro_veiculos, custos_manutencao, vistoria_veiculo). No banco real
-- `vistoria_veiculo` NÃO existe (ERROR 42P01): a última chamada falhava DEPOIS
-- de o histórico ter sido gravado e o carro (e financeiro/custos) já terem
-- mudado de loja — o usuário via "erro" com a transferência meio feita.
--
-- Agora: uma função, uma transação.
--   - veiculo_transferencias (histórico) é OBRIGATÓRIA: se não existir, a
--     função falha e nada muda.
--   - veiculos.loja_id é atualizado.
--   - Tabelas filhas com loja_id próprio (financeiro_veiculos,
--     custos_manutencao e a tabela de vistoria) são atualizadas SE existirem
--     com as colunas veiculo_id e loja_id; senão são puladas e listadas em
--     "pulados" no retorno. Qualquer erro no meio desfaz tudo.
--   - Regra financeira inalterada: leads e vendas NÃO são movidos (a venda
--     pertence à loja onde aconteceu); anexos/veiculo_aquisicao não têm loja_id.
--
-- Nome da tabela de vistoria: hoje 'vistoria_veiculo' (o que o código usa e
-- que NÃO existe no banco). Quando a tabela real de vistoria for confirmada,
-- troque o nome no array `tabelas_filhas` abaixo E em
-- src/lib/tabelas-opcionais.ts (TABELA_VISTORIA).
--
-- Segurança: SECURITY DEFINER, executável só pela service_role (a Server
-- Action transferirVeiculo confere sessão, perfil de gerência e loja ativa
-- antes de chamar). anon/authenticated não podem chamar via /rpc.
-- ============================================================

create or replace function public.transferir_veiculo(
  p_veiculo_id uuid,
  p_loja_destino_id uuid,
  p_usuario_id uuid,
  p_observacoes text default null,
  p_loja_origem_esperada uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tabelas_filhas constant text[] := array['financeiro_veiculos', 'custos_manutencao', 'vistoria_veiculo'];
  v_origem uuid;
  v_transferencia_id uuid;
  t text;
  n bigint;
  movidos jsonb := '{}'::jsonb;
  pulados text[] := '{}';
begin
  if to_regclass('public.veiculo_transferencias') is null then
    raise exception 'Tabela veiculo_transferencias não existe (migration 009). Nada foi alterado.';
  end if;

  -- Trava a linha do veículo até o fim da transação (duas transferências
  -- simultâneas do mesmo carro não se atropelam).
  select v.loja_id into v_origem
  from public.veiculos v
  where v.id = p_veiculo_id
  for update;

  if not found then
    raise exception 'Veículo não encontrado.';
  end if;
  if p_loja_origem_esperada is not null and v_origem is distinct from p_loja_origem_esperada then
    raise exception 'O veículo mudou de loja enquanto a transferência era feita. Atualize a página.';
  end if;
  if v_origem = p_loja_destino_id then
    raise exception 'O veículo já pertence a essa loja.';
  end if;
  if not exists (select 1 from public.lojas l where l.id = p_loja_destino_id) then
    raise exception 'Loja de destino não encontrada.';
  end if;

  -- 1) Histórico (mesmas colunas que o código já gravava).
  execute
    'insert into public.veiculo_transferencias (veiculo_id, loja_origem_id, loja_destino_id, transferido_por, observacoes)
     values ($1, $2, $3, $4, $5) returning id'
    into v_transferencia_id
    using p_veiculo_id, v_origem, p_loja_destino_id, p_usuario_id, p_observacoes;

  -- 2) Veículo.
  update public.veiculos set loja_id = p_loja_destino_id where id = p_veiculo_id;

  -- 3) Tabelas filhas com loja_id próprio — só as que existem de verdade.
  foreach t in array tabelas_filhas loop
    if to_regclass('public.' || t) is not null
       and exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = t and column_name = 'veiculo_id')
       and exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = t and column_name = 'loja_id')
    then
      execute format('update public.%I set loja_id = $1 where veiculo_id = $2', t)
        using p_loja_destino_id, p_veiculo_id;
      get diagnostics n = row_count;
      movidos := movidos || jsonb_build_object(t, n);
    else
      pulados := pulados || t;
    end if;
  end loop;

  return jsonb_build_object(
    'transferencia_id', v_transferencia_id,
    'loja_origem_id', v_origem,
    'loja_destino_id', p_loja_destino_id,
    'movidos', movidos,
    'pulados', to_jsonb(pulados)
  );
end
$$;

comment on function public.transferir_veiculo(uuid, uuid, uuid, text, uuid) is
  '025: transferência atômica (histórico + veiculos + tabelas filhas existentes). Só service_role.';

revoke all on function public.transferir_veiculo(uuid, uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.transferir_veiculo(uuid, uuid, uuid, text, uuid) to service_role;

-- Verificação (rode depois, separado — não transfere nada):
--   select proname, prosecdef, proacl from pg_proc where proname = 'transferir_veiculo';
--   -- esperado: prosecdef = true; proacl com service_role e SEM anon/authenticated


-- ============================================================
-- ROLLBACK (comentado) — remove a função. Volte o código antes: a action
-- transferirVeiculo depende dela.
-- ============================================================
-- drop function if exists public.transferir_veiculo(uuid, uuid, uuid, text, uuid);
