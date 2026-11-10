-- ============================================================
-- MIGRATION 023 — Fase 1: perfil de usuário e limites dos buckets
-- Rode no SQL Editor DEPOIS do deploy da branch fase1-seguranca (o código novo
-- já lê os nomes de outros usuários pela service role e valida os tipos de
-- arquivo antes do upload). Idempotente. Independente da 022.
--
-- O que faz:
--   A. usuarios_perfil: só SELECT do próprio perfil para o navegador. Remove
--      as policies que permitiam escrita (a "usuario_ve_proprio_perfil" era
--      FOR ALL sem WITH CHECK: qualquer usuário logado podia, pela anon key,
--      trocar o próprio perfil para 'admin', mudar loja_id, se reativar ou
--      liberar módulos). Escrita fica só no servidor (service role, actions.ts).
--   B. Limite de tamanho e tipos aceitos nos buckets veiculos-fotos e
--      veiculos-documentos.
--   C. Remove a policy "vendas-docs acesso total" se o bucket vendas-docs não
--      existir (nenhum código envia para ele; só há uma tela de "legado" que
--      exibe links antigos gravados em vendas.documentos_urls).
--
-- Conferido no código antes desta migration:
--   - Nenhum client do navegador (@/lib/supabase, anon key) faz insert/update/
--     delete em usuarios_perfil. Os únicos usos do client do navegador são:
--     login/logout (auth) e upload no Storage (fotos, configurações, anexos).
--   - Toda escrita em usuarios_perfil está em src/app/actions.ts com
--     adminSupabase() (service role): criarUsuario, atualizarUsuario,
--     updateUserRole, inviteUser, deleteUser.
--   - Leituras com o client do usuário: o PRÓPRIO perfil (proxy.ts e as
--     páginas do admin, .eq('id', user.id)) — continua funcionando. As listas
--     de outros usuários (CRM e detalhe do lead) passaram para service role
--     nesta fase, filtradas pela loja ativa.
--   - Tipos enviados ao bucket veiculos-fotos: fotos de veículo e imagens da
--     home são recodificadas no navegador para image/jpeg (lib/upload-fotos);
--     o favicon sobe original e agora só aceita PNG/ICO/WEBP/JPG
--     (ConfiguracoesClient). Anexos: PDF/JPG/PNG/WEBP até 20 MB (AnexosClient).
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- A) usuarios_perfil — só SELECT do próprio perfil
-- ─────────────────────────────────────────────────────────────
do $$
declare
  r record;
begin
  if to_regclass('public.usuarios_perfil') is null then
    raise exception 'Tabela public.usuarios_perfil não existe.';
  end if;

  -- Nomes conhecidos: o real no banco (informado na checagem) e os do schema.sql.
  execute 'drop policy if exists usuario_ve_proprio_perfil on public.usuarios_perfil';
  execute 'drop policy if exists "usuário lê próprio perfil" on public.usuarios_perfil';
  execute 'drop policy if exists "diretor/admin gerencia perfis" on public.usuarios_perfil';

  -- Qualquer outra policy que permita escrita (ALL/INSERT/UPDATE/DELETE) também
  -- sai: escrita em usuarios_perfil é só pela service role. Policies só de
  -- SELECT que existirem além destas são mantidas (e listadas como aviso).
  for r in
    select policyname, cmd
    from pg_policies
    where schemaname = 'public'
      and tablename = 'usuarios_perfil'
  loop
    if r.cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE') then
      execute format('drop policy %I on public.usuarios_perfil', r.policyname);
      raise notice 'usuarios_perfil: policy com escrita removida: % (%)', r.policyname, r.cmd;
    elsif r.policyname <> 'usuario_le_proprio_perfil' then
      raise warning 'usuarios_perfil: policy de SELECT mantida — revise: %', r.policyname;
    end if;
  end loop;
end $$;

alter table public.usuarios_perfil enable row level security;

drop policy if exists usuario_le_proprio_perfil on public.usuarios_perfil;
create policy usuario_le_proprio_perfil
  on public.usuarios_perfil
  for select
  to authenticated
  using (id = auth.uid());

-- Defesa extra além da RLS: navegador não tem privilégio de escrita na tabela,
-- e a anon key (visitante sem login) não tem nem leitura.
revoke insert, update, delete, truncate on public.usuarios_perfil from authenticated;
revoke all on public.usuarios_perfil from anon;


-- ─────────────────────────────────────────────────────────────
-- B) BUCKETS — tamanho máximo e tipos aceitos
-- Valem para uploads NOVOS; arquivos já existentes não são afetados.
-- SVG fica de fora do bucket público de fotos: um SVG pode conter script e
-- seria servido do domínio do Supabase com URL pública.
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'veiculos-fotos') then
    raise warning 'bucket veiculos-fotos não existe — limites não aplicados';
  end if;
  if not exists (select 1 from storage.buckets where id = 'veiculos-documentos') then
    raise warning 'bucket veiculos-documentos não existe — limites não aplicados';
  end if;
end $$;

update storage.buckets
set file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/x-icon',
      'image/vnd.microsoft.icon'
    ]
where id = 'veiculos-fotos';

update storage.buckets
set file_size_limit = 20971520, -- 20 MB
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
where id = 'veiculos-documentos';


-- ─────────────────────────────────────────────────────────────
-- C) Policy órfã do bucket vendas-docs
-- Só remove se o bucket NÃO existir. Se existir, mantém e avisa (aí é preciso
-- decidir o que fazer com os arquivos antes de mexer na policy).
-- ─────────────────────────────────────────────────────────────
do $$
declare
  qtd_vendas_com_links bigint := 0;
begin
  if exists (select 1 from storage.buckets where id = 'vendas-docs') then
    raise warning 'bucket vendas-docs EXISTE — policy "vendas-docs acesso total" mantida. Revise antes de remover.';
  else
    execute 'drop policy if exists "vendas-docs acesso total" on storage.objects';
    raise notice 'policy "vendas-docs acesso total" removida (bucket vendas-docs não existe)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vendas' and column_name = 'documentos_urls'
  ) then
    execute 'select count(*) from public.vendas where coalesce(array_length(documentos_urls, 1), 0) > 0'
      into qtd_vendas_com_links;
    if qtd_vendas_com_links > 0 then
      raise notice 'vendas com links legados em documentos_urls: % (a tela "Documentos Anexados (legado)" ainda os exibe)', qtd_vendas_com_links;
    end if;
  end if;
end $$;


-- ============================================================
-- ROLLBACK (comentado) — desfaz a 023.
-- ============================================================
-- -- A) volta a policy antiga (ALL sem CHECK — é a que tinha a falha) e os grants
-- drop policy if exists usuario_le_proprio_perfil on public.usuarios_perfil;
-- create policy usuario_ve_proprio_perfil on public.usuarios_perfil
--   for all using (id = auth.uid());
-- grant select, insert, update, delete on public.usuarios_perfil to authenticated;
-- grant select, insert, update, delete on public.usuarios_perfil to anon;
-- -- Se a checagem (fase1_checagem.sql) mostrou outras policies em
-- -- usuarios_perfil que a 023 removeu (avisos "policy com escrita removida"),
-- -- recrie-as aqui com o USING/CHECK que a checagem listou.
--
-- -- B) limites dos buckets: volte aos valores que a checagem mostrou
-- -- (null = sem limite / qualquer tipo)
-- update storage.buckets set file_size_limit = null, allowed_mime_types = null
--   where id in ('veiculos-fotos', 'veiculos-documentos');
--
-- -- C) policy do vendas-docs: recrie com o USING/CHECK que a checagem mostrou, ex.:
-- -- create policy "vendas-docs acesso total" on storage.objects for all
-- --   using (bucket_id = 'vendas-docs') with check (bucket_id = 'vendas-docs');
