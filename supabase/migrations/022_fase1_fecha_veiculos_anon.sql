-- ============================================================
-- MIGRATION 022 — Fase 1: segurança (parte 2 de 2)
-- Rode SÓ DEPOIS do deploy do código da Fase 1 (site lendo de veiculos_publicos).
-- Rodar antes deixa home/estoque/veículo vazios até o deploy.
-- Idempotente.
--
-- Remove o SELECT público direto em `veiculos`: com a anon key (que é pública,
-- vai no JavaScript do site) qualquer pessoa conseguia consultar
-- chassi, renavam, placa, proprietario_tipo, percentual_socio e olx_* dos
-- veículos disponíveis. O site agora lê só de `veiculos_publicos` (021).
-- A equipe logada continua lendo `veiculos` pela policy da própria loja.
-- ============================================================

do $$
begin
  if to_regclass('public.veiculos_publicos') is null then
    raise exception 'View public.veiculos_publicos não existe. Rode a migration 021 (e faça o deploy) antes da 022.';
  end if;
end $$;

-- Nomes conhecidos (o real no banco é publico_ve_disponiveis; o schema.sql
-- documenta "público vê disponíveis").
drop policy if exists publico_ve_disponiveis on public.veiculos;
drop policy if exists "público vê disponíveis" on public.veiculos;

-- Outras policies de leitura em veiculos que NÃO usam auth.uid() só são
-- AVISADAS, não removidas: uma policy da equipe escrita com função auxiliar
-- (sem auth.uid() literal) cairia aqui e derrubaria o acesso do admin.
-- Para a anon key isso não importa: o REVOKE abaixo já tira todo acesso dela
-- à tabela, independentemente das policies. Confira os avisos na aba de
-- mensagens do SQL Editor.
do $$
declare
  r record;
begin
  for r in
    select policyname, roles, qual
    from pg_policies
    where schemaname = 'public'
      and tablename = 'veiculos'
      and cmd in ('SELECT', 'ALL')
      and coalesce(qual, '') not ilike '%auth.uid()%'
  loop
    raise warning 'veiculos: policy sem auth.uid() mantida — revise: % (roles=%, USING=%)', r.policyname, r.roles, r.qual;
  end loop;
end $$;

-- A anon key perde SELECT/INSERT/UPDATE/DELETE (e TRUNCATE/REFERENCES/TRIGGER)
-- na tabela. Isto NÃO mexe no papel `authenticated` (equipe logada no admin,
-- que continua pela policy da própria loja) nem na service role (Server
-- Actions e páginas do admin, que ignoram RLS e grants de anon).
revoke all on public.veiculos from anon;


-- ============================================================
-- ROLLBACK (comentado) — devolve a leitura pública direta de veiculos.
-- ============================================================
-- grant select, insert, update, delete on public.veiculos to anon;
-- create policy publico_ve_disponiveis on public.veiculos for select
--   using (status = 'disponivel' and rascunho = false);
