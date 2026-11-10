-- ============================================================
-- MIGRATION 021 — Fase 1: segurança (parte 1 de 2)
-- Rode no SQL Editor do Supabase. Idempotente: pode rodar mais de uma vez.
--
-- ORDEM DE APLICAÇÃO (importante):
--   1. supabase/consultas/fase1_checagem.sql  → conferir colunas/policies
--   2. ESTA migration (021)                    → segura com o código atual em produção
--   3. deploy do código da Fase 1              → site passa a ler da view
--   4. migration 022                           → fecha SELECT da anon key em veiculos
--   Rodar a 022 antes do deploy deixa o site público SEM veículos até o deploy.
--
-- O que faz:
--   A. Funções auxiliares (schema `privado`, fora da API REST).
--   B. View `veiculos_publicos` (colunas seguras, só disponíveis/publicados).
--   C. Remove INSERT público "with check (true)" de leads.
--   D. veiculo_transferencias / veiculo_recebido_venda com trava de loja.
--   E. Storage: policies RESTRICTIVE por loja nos buckets veiculos-fotos e
--      veiculos-documentos (somam-se às existentes, sem precisar saber o nome
--      delas; arquivos antigos continuam funcionando).
--
-- Separação sempre por loja_id (nada de nome/domínio). admin/diretor: todas as
-- lojas; demais perfis: só a própria (mesma regra de src/lib/acesso.ts).
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 0) PRÉ-CHECAGEM — aborta tudo se faltar coluna obrigatória
-- ─────────────────────────────────────────────────────────────
do $$
declare
  faltando text;
begin
  select string_agg(c, ', ') into faltando
  from unnest(array[
    'id','loja_id','marca','modelo','versao','ano','cor','km','combustivel','cambio','preco',
    'valor_oferta','tipo','portas','descricao','opcionais','status','destaque','fotos','created_at',
    'excluido','rascunho'
  ]) as c
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'veiculos' and column_name = c
  );
  if faltando is not null then
    raise exception 'veiculos sem as colunas: %. Aplique as migrations pendentes (001/002/010) antes da 021.', faltando;
  end if;

  select string_agg(c, ', ') into faltando
  from unnest(array['id','loja_id','perfil','ativo']) as c
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'usuarios_perfil' and column_name = c
  );
  if faltando is not null then
    raise exception 'usuarios_perfil sem as colunas: %.', faltando;
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────
-- A) FUNÇÕES AUXILIARES
-- Schema `privado`: não é exposto pela API REST (PostgREST só expõe `public`),
-- então ninguém chama estas funções via /rpc. SECURITY DEFINER para ler
-- usuarios_perfil/veiculos/vendas sem depender da RLS dessas tabelas (evita
-- recursão e o caso de admin operando a outra loja).
-- ─────────────────────────────────────────────────────────────
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to anon, authenticated;

-- Usuário logado, ativo, com acesso à loja (admin/diretor: qualquer loja existente).
create or replace function privado.usuario_acessa_loja(p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_loja is not null
     and exists (select 1 from public.lojas l where l.id = p_loja)
     and exists (
       select 1 from public.usuarios_perfil up
       where up.id = auth.uid()
         and up.ativo = true
         and (up.perfil in ('admin', 'diretor') or up.loja_id = p_loja)
     )
$$;

-- Usuário logado e ativo com um dos perfis.
create or replace function privado.usuario_tem_perfil(p_perfis text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios_perfil up
    where up.id = auth.uid()
      and up.ativo = true
      and up.perfil = any (p_perfis)
  )
$$;

-- Loja de uma venda (sem passar pela RLS de vendas).
create or replace function privado.loja_da_venda(p_venda uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select vd.loja_id from public.vendas vd where vd.id = p_venda
$$;

-- Loja dona de um objeto do Storage, pelo caminho:
--   veiculos-fotos:      {loja_id}/...  |  configuracoes/{loja_id}/...  |  landing/{loja_id}/... (legado)
--   veiculos-documentos: veiculo/{veiculo_id}/...  |  venda/{venda_id}/...
--     (documentos NÃO são organizados por loja — a loja vem do veículo/venda,
--      o que cobre arquivos antigos e novos sem mover nada)
-- Qualquer outro formato → null (negado para o navegador; service role não é afetada).
create or replace function privado.storage_loja_do_objeto(p_bucket text, p_nome text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  partes text[];
  pasta text;
  resultado uuid;
  re_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if p_nome is null then
    return null;
  end if;
  partes := string_to_array(p_nome, '/');
  if coalesce(array_length(partes, 1), 0) < 2 then
    return null;
  end if;

  if p_bucket = 'veiculos-fotos' then
    pasta := case when partes[1] in ('configuracoes', 'landing') then partes[2] else partes[1] end;
    if pasta ~ re_uuid then
      return pasta::uuid;
    end if;
    return null;
  end if;

  if p_bucket = 'veiculos-documentos' then
    if partes[2] !~ re_uuid then
      return null;
    end if;
    if partes[1] = 'veiculo' then
      select v.loja_id into resultado from public.veiculos v where v.id = partes[2]::uuid;
    elsif partes[1] = 'venda' then
      select vd.loja_id into resultado from public.vendas vd where vd.id = partes[2]::uuid;
    end if;
    return resultado;
  end if;

  return null;
end
$$;

revoke all on function privado.usuario_acessa_loja(uuid) from public;
revoke all on function privado.usuario_tem_perfil(text[]) from public;
revoke all on function privado.loja_da_venda(uuid) from public;
revoke all on function privado.storage_loja_do_objeto(text, text) from public;
grant execute on function privado.usuario_acessa_loja(uuid) to anon, authenticated;
grant execute on function privado.usuario_tem_perfil(text[]) to anon, authenticated;
grant execute on function privado.loja_da_venda(uuid) to anon, authenticated;
grant execute on function privado.storage_loja_do_objeto(text, text) to anon, authenticated;


-- ─────────────────────────────────────────────────────────────
-- B) VIEW veiculos_publicos
-- Só colunas seguras: sem placa, chassi, renavam, hodometro_venda,
-- data_aquisicao, proprietario_tipo, percentual_socio, olx_*.
-- ano_fabricacao/ano_modelo/condicao entram só se existirem (migration 018).
--
-- security_invoker = false (padrão): a view lê `veiculos` com o dono (postgres),
-- por isso continua funcionando depois que a 022 tirar o SELECT da anon key na
-- tabela. O filtro de linhas está na própria view. security_barrier impede que
-- filtros do usuário sejam avaliados antes do filtro da view.
-- O Supabase Advisor vai apontar "security definer view" — é intencional aqui.
-- ─────────────────────────────────────────────────────────────
do $$
declare
  colunas text[] := array[
    'id','loja_id','marca','modelo','versao','ano','cor','km','combustivel','cambio','preco',
    'valor_oferta','tipo','portas','descricao','opcionais','status','destaque','fotos','created_at'
  ];
  opcional text;
begin
  foreach opcional in array array['ano_fabricacao','ano_modelo','condicao'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'veiculos' and column_name = opcional
    ) then
      colunas := colunas || opcional;
    else
      raise notice 'veiculos_publicos: coluna opcional % não existe (migration 018) — fica fora da view', opcional;
    end if;
  end loop;

  execute 'drop view if exists public.veiculos_publicos';
  execute format(
    'create view public.veiculos_publicos with (security_barrier = true) as
       select %s
       from public.veiculos
       where status = %L and rascunho = false and excluido = false',
    (select string_agg(quote_ident(c), ', ') from unnest(colunas) as c),
    'disponivel'
  );
end $$;

comment on view public.veiculos_publicos is
  'Fase 1 (021): leitura pública de veículos. Só disponíveis/publicados/não excluídos e só colunas seguras. Fonte única no código: src/lib/veiculos-publicos.ts';

-- O Supabase dá ALL por padrão em objetos novos do schema public; numa view
-- simples isso permitiria UPDATE/DELETE pela anon key (a view é atualizável e
-- roda como dono). Tira tudo e devolve só SELECT.
revoke all on public.veiculos_publicos from public, anon, authenticated;
grant select on public.veiculos_publicos to anon, authenticated;


-- ─────────────────────────────────────────────────────────────
-- C) LEADS — remove INSERT público sem restrição
-- O formulário do site grava com service role (submitContatoLead), que ignora
-- RLS; a policy só servia para quem quisesse inserir direto pela anon key
-- (spam sem honeypot nem limite). Remove pelo nome conhecido e qualquer outra
-- policy de INSERT pública com CHECK true (o nome real pode divergir do schema.sql).
-- ─────────────────────────────────────────────────────────────
drop policy if exists "público cria lead" on public.leads;

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'leads'
      and cmd = 'INSERT'
      and (with_check is null or btrim(with_check) = 'true')
      and roles && array['public', 'anon']::name[]
  loop
    execute format('drop policy %I on public.leads', r.policyname);
    raise notice 'leads: policy de insert público removida: %', r.policyname;
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────
-- D) veiculo_transferencias / veiculo_recebido_venda — trava por loja
-- Antes: qualquer gerente/diretor/admin de QUALQUER loja via todas as linhas.
-- Agora: perfil de gerência + acesso à loja (origem ou destino; ou loja da venda).
-- As Server Actions usam service role (não são afetadas); isto é a defesa no banco.
-- Tabelas podem não existir (migrations 009/010) — nesse caso só avisa.
-- ─────────────────────────────────────────────────────────────
do $$
declare
  r record;
begin
  if to_regclass('public.veiculo_transferencias') is null then
    raise notice 'veiculo_transferencias não existe (migration 009 não aplicada) — pulando';
  else
    -- Remove TODAS as policies atuais da tabela (nome real pode divergir do SQL versionado).
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'veiculo_transferencias' loop
      execute format('drop policy %I on public.veiculo_transferencias', r.policyname);
      raise notice 'veiculo_transferencias: policy removida: %', r.policyname;
    end loop;
    execute 'alter table public.veiculo_transferencias enable row level security';
    execute $p$
      create policy "gerencia acessa transferencias da propria loja"
        on public.veiculo_transferencias for all to authenticated
        using (
          privado.usuario_tem_perfil(array['gerente','diretor','admin'])
          and (privado.usuario_acessa_loja(loja_origem_id) or privado.usuario_acessa_loja(loja_destino_id))
        )
        with check (
          privado.usuario_tem_perfil(array['gerente','diretor','admin'])
          and (privado.usuario_acessa_loja(loja_origem_id) or privado.usuario_acessa_loja(loja_destino_id))
        )
    $p$;
  end if;

  if to_regclass('public.veiculo_recebido_venda') is null then
    raise notice 'veiculo_recebido_venda não existe (migration 010 não aplicada) — pulando';
  else
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'veiculo_recebido_venda' loop
      execute format('drop policy %I on public.veiculo_recebido_venda', r.policyname);
      raise notice 'veiculo_recebido_venda: policy removida: %', r.policyname;
    end loop;
    execute 'alter table public.veiculo_recebido_venda enable row level security';
    execute $p$
      create policy "gerencia acessa veiculo recebido da propria loja"
        on public.veiculo_recebido_venda for all to authenticated
        using (
          privado.usuario_tem_perfil(array['gerente','diretor','admin'])
          and privado.usuario_acessa_loja(privado.loja_da_venda(venda_id))
        )
        with check (
          privado.usuario_tem_perfil(array['gerente','diretor','admin'])
          and privado.usuario_acessa_loja(privado.loja_da_venda(venda_id))
        )
    $p$;
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────
-- E) STORAGE — policies RESTRICTIVE por loja
-- Policies restrictive são combinadas com AND com as permissivas que já
-- existem (criadas pelo Dashboard, nomes desconhecidos). Resultado: o que já
-- era permitido continua, mas SÓ quando o caminho pertence a uma loja do usuário.
--   - veiculos-fotos: INSERT/UPDATE/DELETE por loja. Leitura continua pública
--     (URL /object/public não passa por RLS) — nenhuma restrição de SELECT.
--   - veiculos-documentos: INSERT/UPDATE/DELETE/SELECT por loja.
-- Outros buckets: não afetados (primeira condição do OR).
-- service_role (Server Actions, signed URLs) ignora RLS — não é afetada.
-- Arquivos antigos: fotos sempre usaram {loja_id}/ ou configuracoes|landing/{loja_id}/;
-- documentos usam veiculo|venda/{id}/ (loja derivada). Nenhum arquivo precisa mudar.
-- Exclusão de foto pelo app agora é feita no servidor (removerFotoVeiculo /
-- descartarFotosNaoSalvas), então nada do navegador depende de DELETE.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "fase1 storage insert por loja" on storage.objects;
create policy "fase1 storage insert por loja"
  on storage.objects
  as restrictive
  for insert
  to public
  with check (
    bucket_id not in ('veiculos-fotos', 'veiculos-documentos')
    or privado.usuario_acessa_loja(privado.storage_loja_do_objeto(bucket_id, name))
  );

drop policy if exists "fase1 storage update por loja" on storage.objects;
create policy "fase1 storage update por loja"
  on storage.objects
  as restrictive
  for update
  to public
  using (
    bucket_id not in ('veiculos-fotos', 'veiculos-documentos')
    or privado.usuario_acessa_loja(privado.storage_loja_do_objeto(bucket_id, name))
  )
  with check (
    bucket_id not in ('veiculos-fotos', 'veiculos-documentos')
    or privado.usuario_acessa_loja(privado.storage_loja_do_objeto(bucket_id, name))
  );

drop policy if exists "fase1 storage delete por loja" on storage.objects;
create policy "fase1 storage delete por loja"
  on storage.objects
  as restrictive
  for delete
  to public
  using (
    bucket_id not in ('veiculos-fotos', 'veiculos-documentos')
    or privado.usuario_acessa_loja(privado.storage_loja_do_objeto(bucket_id, name))
  );

drop policy if exists "fase1 storage select documentos por loja" on storage.objects;
create policy "fase1 storage select documentos por loja"
  on storage.objects
  as restrictive
  for select
  to public
  using (
    bucket_id <> 'veiculos-documentos'
    or privado.usuario_acessa_loja(privado.storage_loja_do_objeto(bucket_id, name))
  );


-- ============================================================
-- ROLLBACK (comentado) — desfaz a 021. Rode a reversão da 022 ANTES desta.
-- Recria as policies originais do SQL versionado (schema.sql / 009 / 010).
-- ============================================================
-- drop policy if exists "fase1 storage insert por loja" on storage.objects;
-- drop policy if exists "fase1 storage update por loja" on storage.objects;
-- drop policy if exists "fase1 storage delete por loja" on storage.objects;
-- drop policy if exists "fase1 storage select documentos por loja" on storage.objects;
--
-- do $$
-- begin
--   if to_regclass('public.veiculo_transferencias') is not null then
--     drop policy if exists "gerencia acessa transferencias da propria loja" on public.veiculo_transferencias;
--     create policy "gerencia acessa transferencias de veiculo" on public.veiculo_transferencias for all
--       using (exists (select 1 from public.usuarios_perfil up where up.id = auth.uid() and up.perfil in ('gerente','diretor','admin')));
--   end if;
--   if to_regclass('public.veiculo_recebido_venda') is not null then
--     drop policy if exists "gerencia acessa veiculo recebido da propria loja" on public.veiculo_recebido_venda;
--     create policy "gerencia acessa veiculo recebido na troca" on public.veiculo_recebido_venda for all
--       using (exists (select 1 from public.usuarios_perfil up where up.id = auth.uid() and up.perfil in ('gerente','diretor','admin')));
--   end if;
-- end $$;
--
-- create policy "público cria lead" on public.leads for insert with check (true);
--
-- drop view if exists public.veiculos_publicos;
--
-- drop function if exists privado.storage_loja_do_objeto(text, text);
-- drop function if exists privado.loja_da_venda(uuid);
-- drop function if exists privado.usuario_tem_perfil(text[]);
-- drop function if exists privado.usuario_acessa_loja(uuid);
-- drop schema if exists privado;
