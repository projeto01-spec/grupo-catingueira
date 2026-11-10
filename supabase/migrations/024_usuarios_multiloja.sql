-- ============================================================
-- MIGRATION 024 — Acesso de usuário a mais de uma loja
-- Rode no SQL Editor ANTES do deploy da branch fase1-lojas (o código novo lê
-- usuarios_lojas; o código atual em produção não é afetado por esta migration).
-- Requer a 021 aplicada (schema `privado` e privado.usuario_acessa_loja).
-- Idempotente: pode rodar mais de uma vez.
--
-- O que faz:
--   1. Tabela usuarios_lojas (usuario × loja) — lojas com acesso.
--   2. Popula com a loja atual (padrão) de cada usuário.
--   3. Gatilho: a loja padrão (usuarios_perfil.loja_id) sempre está entre as
--      lojas com acesso — inserida automaticamente e protegida contra remoção.
--   4. RLS: cada usuário lê só as próprias linhas; escrita só service role.
--   5. privado.usuario_acessa_loja: admin/diretor → qualquer loja; demais →
--      loja marcada em usuarios_lojas. Inativo → nunca.
--   6. Reescreve as policies de RLS do schema public que comparam
--      usuarios_perfil.loja_id direto, trocando essa comparação por
--      privado.usuario_acessa_loja(<loja da linha>). Para quem tem uma loja só
--      o efeito é o mesmo; quem tem duas passa a ver as duas; admin/diretor
--      passam a ver todas (antes a RLS os prendia à loja padrão).
--      As definições originais vão para privado.backup_policies_024 (usada
--      pelo rollback). Policies com formato não reconhecido NÃO são alteradas
--      — aparecem como WARNING na aba de mensagens para revisão manual.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 0) PRÉ-CHECAGEM
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('privado.usuario_acessa_loja(uuid)') is null then
    raise exception 'privado.usuario_acessa_loja não existe. Rode a migration 021 antes da 024.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'usuarios_perfil' and column_name = 'ativo'
  ) then
    raise exception 'usuarios_perfil.ativo não existe.';
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────
-- 1) TABELA usuarios_lojas
-- ─────────────────────────────────────────────────────────────
create table if not exists public.usuarios_lojas (
  usuario_id uuid not null references public.usuarios_perfil(id) on delete cascade,
  loja_id    uuid not null references public.lojas(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (usuario_id, loja_id)
);

create index if not exists idx_usuarios_lojas_loja on public.usuarios_lojas (loja_id);

comment on table public.usuarios_lojas is
  '024: lojas com acesso por usuário. Admin/diretor têm todas automaticamente (a lista deles não é usada). usuarios_perfil.loja_id = loja padrão, sempre presente aqui (gatilho).';


-- ─────────────────────────────────────────────────────────────
-- 2) POPULAR com a loja padrão de cada usuário
-- ─────────────────────────────────────────────────────────────
insert into public.usuarios_lojas (usuario_id, loja_id)
select up.id, up.loja_id
from public.usuarios_perfil up
where up.loja_id is not null
  and exists (select 1 from public.lojas l where l.id = up.loja_id)
on conflict (usuario_id, loja_id) do nothing;


-- ─────────────────────────────────────────────────────────────
-- 3) GATILHOS — loja padrão sempre entre as lojas com acesso
-- ─────────────────────────────────────────────────────────────
create or replace function privado.usuarios_lojas_incluir_padrao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.loja_id is not null then
    insert into public.usuarios_lojas (usuario_id, loja_id)
    values (new.id, new.loja_id)
    on conflict (usuario_id, loja_id) do nothing;
  end if;
  return new;
end
$$;

drop trigger if exists trg_usuarios_lojas_incluir_padrao on public.usuarios_perfil;
create trigger trg_usuarios_lojas_incluir_padrao
  after insert or update of loja_id on public.usuarios_perfil
  for each row execute function privado.usuarios_lojas_incluir_padrao();

-- Impede remover a loja padrão da lista (a remoção em cascata, quando o
-- usuário ou a loja são apagados, continua funcionando: aí o perfil já não
-- aponta mais para essa loja).
create or replace function privado.usuarios_lojas_proteger_padrao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.usuarios_perfil up
    where up.id = old.usuario_id and up.loja_id = old.loja_id
  ) then
    raise exception 'A loja padrão do usuário não pode ser removida das lojas com acesso. Troque a loja padrão antes.';
  end if;
  return old;
end
$$;

drop trigger if exists trg_usuarios_lojas_proteger_padrao on public.usuarios_lojas;
create trigger trg_usuarios_lojas_proteger_padrao
  before delete on public.usuarios_lojas
  for each row execute function privado.usuarios_lojas_proteger_padrao();

revoke all on function privado.usuarios_lojas_incluir_padrao() from public;
revoke all on function privado.usuarios_lojas_proteger_padrao() from public;


-- ─────────────────────────────────────────────────────────────
-- 4) RLS de usuarios_lojas
-- ─────────────────────────────────────────────────────────────
alter table public.usuarios_lojas enable row level security;

drop policy if exists usuario_le_proprias_lojas on public.usuarios_lojas;
create policy usuario_le_proprias_lojas
  on public.usuarios_lojas
  for select
  to authenticated
  using (usuario_id = auth.uid());

revoke all on public.usuarios_lojas from anon;
revoke insert, update, delete, truncate on public.usuarios_lojas from authenticated;
grant select on public.usuarios_lojas to authenticated;


-- ─────────────────────────────────────────────────────────────
-- 5) privado.usuario_acessa_loja — agora por usuarios_lojas
-- (usada pelas policies de Storage da 021, pelas de transferência/troca e
-- pelas policies reescritas no passo 6)
-- ─────────────────────────────────────────────────────────────
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
         and (
           up.perfil in ('admin', 'diretor')
           or exists (
             select 1 from public.usuarios_lojas ul
             where ul.usuario_id = up.id and ul.loja_id = p_loja
           )
         )
     )
$$;

revoke all on function privado.usuario_acessa_loja(uuid) from public;
grant execute on function privado.usuario_acessa_loja(uuid) to anon, authenticated;


-- ─────────────────────────────────────────────────────────────
-- 6) REESCRITA DAS POLICIES que comparam usuarios_perfil.loja_id
--
-- Formatos reconhecidos (texto como o Postgres guarda em pg_policies):
--   a) EXISTS (... FROM usuarios_perfil up WHERE (up.id = auth.uid()) AND (up.loja_id = <tabela>.loja_id) ...)
--      → (up.loja_id = X) vira privado.usuario_acessa_loja(X); o resto (perfil,
--        id = auth.uid()) fica igual. Também vale em JOIN ... ON (up.loja_id = v.loja_id).
--   b) <col> IN (SELECT usuarios_perfil.loja_id FROM usuarios_perfil WHERE (usuarios_perfil.id = auth.uid()))
--      → privado.usuario_acessa_loja(<col>)
-- Qualquer outro uso de usuarios_perfil.loja_id → WARNING, policy intocada.
-- Tabelas usuarios_perfil e usuarios_lojas ficam de fora.
-- ─────────────────────────────────────────────────────────────
create table if not exists privado.backup_policies_024 (
  schemaname name not null,
  tablename  name not null,
  policyname name not null,
  permissive text not null,
  roles      name[] not null,
  cmd        text not null,
  qual       text,
  with_check text,
  salvo_em   timestamptz not null default now(),
  primary key (schemaname, tablename, policyname)
);
revoke all on privado.backup_policies_024 from public, anon, authenticated;

do $$
declare
  p record;
  aliases text[];
  a text;
  novo_qual text;
  novo_check text;
  restante text;
  roles_sql text;
  re_in constant text :=
    '([\w\.]+) IN \(\s*SELECT\s+[\w\.]*loja_id\s+FROM\s+(?:public\.)?usuarios_perfil(?:\s+\w+)?\s+WHERE\s+\([\w\.]*id = auth\.uid\(\)\)\)';
  alteradas int := 0;
begin
  for p in
    select *
    from pg_policies
    where schemaname = 'public'
      and tablename not in ('usuarios_perfil', 'usuarios_lojas')
      and (coalesce(qual, '') ~ 'usuarios_perfil' or coalesce(with_check, '') ~ 'usuarios_perfil')
      and (coalesce(qual, '') ~ 'loja_id' or coalesce(with_check, '') ~ 'loja_id')
  loop
    -- Aliases usados para usuarios_perfil no texto (ex.: "usuarios_perfil up").
    select coalesce(array_agg(distinct m[1]), '{}') into aliases
    from regexp_matches(coalesce(p.qual, '') || ' ' || coalesce(p.with_check, ''), 'usuarios_perfil\s+(\w+)', 'g') as m
    where upper(m[1]) not in ('WHERE', 'ON', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'CROSS', 'AS');
    aliases := aliases || array['usuarios_perfil'];

    novo_qual := p.qual;
    novo_check := p.with_check;

    -- (b) loja_id IN (SELECT usuarios_perfil.loja_id ... WHERE (usuarios_perfil.id = auth.uid()))
    novo_qual := regexp_replace(novo_qual, re_in, 'privado.usuario_acessa_loja(\1)', 'g');
    novo_check := regexp_replace(novo_check, re_in, 'privado.usuario_acessa_loja(\1)', 'g');

    -- (a) (up.loja_id = X) / (X = up.loja_id)
    foreach a in array aliases loop
      novo_qual := regexp_replace(novo_qual, '\(' || a || '\.loja_id = ([\w\.]+)\)', 'privado.usuario_acessa_loja(\1)', 'g');
      novo_qual := regexp_replace(novo_qual, '\(([\w\.]+) = ' || a || '\.loja_id\)', 'privado.usuario_acessa_loja(\1)', 'g');
      novo_check := regexp_replace(novo_check, '\(' || a || '\.loja_id = ([\w\.]+)\)', 'privado.usuario_acessa_loja(\1)', 'g');
      novo_check := regexp_replace(novo_check, '\(([\w\.]+) = ' || a || '\.loja_id\)', 'privado.usuario_acessa_loja(\1)', 'g');
    end loop;

    -- Sobrou alguma referência a <alias>.loja_id? Formato não reconhecido → não mexe.
    restante := coalesce(novo_qual, '') || ' ' || coalesce(novo_check, '');
    if exists (select 1 from unnest(aliases) x where restante ~ ('\m' || x || '\.loja_id\M')) then
      raise warning 'policy NÃO alterada (formato não reconhecido) — revise manualmente: %.% "%" | USING: % | CHECK: %',
        p.tablename, p.cmd, p.policyname, p.qual, p.with_check;
      continue;
    end if;

    if novo_qual is not distinct from p.qual and novo_check is not distinct from p.with_check then
      continue; -- já reescrita numa execução anterior
    end if;

    -- Backup da definição original (só na primeira vez — reexecuções não sobrescrevem).
    insert into privado.backup_policies_024 (schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check)
    values (p.schemaname, p.tablename, p.policyname, p.permissive, p.roles, p.cmd, p.qual, p.with_check)
    on conflict (schemaname, tablename, policyname) do nothing;

    select string_agg(case when r = 'public' then 'public' else quote_ident(r) end, ', ')
      into roles_sql
    from unnest(p.roles) as r;

    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    execute format(
      'create policy %I on %I.%I as %s for %s to %s %s %s',
      p.policyname, p.schemaname, p.tablename,
      p.permissive, p.cmd, roles_sql,
      case when novo_qual is not null then 'using (' || novo_qual || ')' else '' end,
      case when novo_check is not null then 'with check (' || novo_check || ')' else '' end
    );
    alteradas := alteradas + 1;
    raise notice 'policy reescrita: %.% "%" | USING: %', p.tablename, p.cmd, p.policyname, novo_qual;
  end loop;

  raise notice '024: % policy(ies) reescrita(s). Originais em privado.backup_policies_024.', alteradas;
end $$;


-- ─────────────────────────────────────────────────────────────
-- Verificação (rode depois, separado):
--   select up.nome, up.perfil, l.nome as loja
--   from public.usuarios_lojas ul
--   join public.usuarios_perfil up on up.id = ul.usuario_id
--   join public.lojas l on l.id = ul.loja_id
--   order by up.nome, l.nome;
--
--   -- policies que ainda comparam usuarios_perfil.loja_id direto (deve vir vazio
--   -- ou só as que apareceram como WARNING):
--   select tablename, policyname, cmd, qual, with_check from pg_policies
--   where schemaname = 'public' and tablename not in ('usuarios_perfil','usuarios_lojas')
--     and (coalesce(qual,'') || coalesce(with_check,'')) ~ 'usuarios_perfil'
--     and (coalesce(qual,'') || coalesce(with_check,'')) ~ '\.loja_id'
--     and (coalesce(qual,'') || coalesce(with_check,'')) !~ 'usuario_acessa_loja';
--
--   -- o que foi reescrito:
--   select tablename, policyname, cmd from privado.backup_policies_024 order by 1, 2;
-- ─────────────────────────────────────────────────────────────


-- ============================================================
-- ROLLBACK (comentado) — desfaz a 024. Volte o código antes (ou junto):
-- o código novo lê usuarios_lojas.
-- ============================================================
-- -- 6) devolve as policies originais
-- do $$
-- declare
--   b record;
--   roles_sql text;
-- begin
--   if to_regclass('privado.backup_policies_024') is null then return; end if;
--   for b in select * from privado.backup_policies_024 loop
--     select string_agg(case when r = 'public' then 'public' else quote_ident(r) end, ', ') into roles_sql from unnest(b.roles) r;
--     execute format('drop policy if exists %I on %I.%I', b.policyname, b.schemaname, b.tablename);
--     execute format('create policy %I on %I.%I as %s for %s to %s %s %s',
--       b.policyname, b.schemaname, b.tablename, b.permissive, b.cmd, roles_sql,
--       case when b.qual is not null then 'using (' || b.qual || ')' else '' end,
--       case when b.with_check is not null then 'with check (' || b.with_check || ')' else '' end);
--   end loop;
-- end $$;
-- drop table if exists privado.backup_policies_024;
--
-- -- 5) volta a função da 021 (acesso pela loja padrão)
-- create or replace function privado.usuario_acessa_loja(p_loja uuid)
-- returns boolean language sql stable security definer set search_path = public as $$
--   select p_loja is not null
--      and exists (select 1 from public.lojas l where l.id = p_loja)
--      and exists (select 1 from public.usuarios_perfil up
--                  where up.id = auth.uid() and up.ativo = true
--                    and (up.perfil in ('admin', 'diretor') or up.loja_id = p_loja))
-- $$;
--
-- -- 3) e 4) gatilhos e tabela
-- drop trigger if exists trg_usuarios_lojas_incluir_padrao on public.usuarios_perfil;
-- drop trigger if exists trg_usuarios_lojas_proteger_padrao on public.usuarios_lojas;
-- drop function if exists privado.usuarios_lojas_incluir_padrao();
-- drop function if exists privado.usuarios_lojas_proteger_padrao();
-- drop table if exists public.usuarios_lojas;
