-- =====================================================================
-- CASA • Gestão Financeira Familiar — schema do banco (Supabase/PostgreSQL)
-- Idempotente na criação de funções/políticas; rode uma vez num projeto novo.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- Funções utilitárias
-- ---------------------------------------------------------------------
create or replace function public.hoje() returns date
language sql stable as $$ select (now() at time zone 'America/Fortaleza')::date $$;

-- ---------------------------------------------------------------------
-- Usuários do sistema (perfil + papel)
--   admin  : tudo, inclusive usuários, lixeira e exclusão definitiva
--   editor : lança, edita, paga, cadastra
--   leitor : só visualiza
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  email       text,
  papel       text not null default 'leitor' check (papel in ('admin','editor','leitor')),
  ativo       boolean not null default false,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Convites: quem pode criar acesso (e com qual papel)
create table if not exists public.convites (
  email       text primary key check (email = lower(email)),
  nome        text not null,
  papel       text not null default 'editor' check (papel in ('admin','editor','leitor')),
  criado_por  uuid references auth.users(id) on delete set null,
  criado_em   timestamptz not null default now(),
  usado_em    timestamptz
);

create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.perfis where user_id = auth.uid() and ativo
$$;
create or replace function public.pode_ler()    returns boolean language sql stable as $$ select public.meu_papel() is not null $$;
create or replace function public.pode_editar() returns boolean language sql stable as $$ select public.meu_papel() in ('admin','editor') $$;
create or replace function public.e_admin()     returns boolean language sql stable as $$ select public.meu_papel() = 'admin' $$;

-- Novo usuário no Auth -> cria perfil. O primeiro usuário vira admin;
-- os demais só ganham acesso se houver convite para o e-mail.
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.convites%rowtype; primeiro boolean;
begin
  select not exists (select 1 from public.perfis) into primeiro;
  select * into c from public.convites where email = lower(new.email) and usado_em is null;
  insert into public.perfis (user_id, nome, email, papel, ativo)
  values (new.id,
          coalesce(c.nome, new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
          lower(new.email),
          case when primeiro then 'admin' when c.email is not null then c.papel else 'leitor' end,
          primeiro or c.email is not null)
  on conflict (user_id) do nothing;
  if c.email is not null then update public.convites set usado_em = now() where email = c.email; end if;
  return new;
end $$;
drop trigger if exists trg_novo_usuario on auth.users;
create trigger trg_novo_usuario after insert on auth.users for each row execute function public.novo_usuario();

-- ---------------------------------------------------------------------
-- Cadastros (alimentam os formulários; desativar não apaga histórico)
-- ---------------------------------------------------------------------
create table if not exists public.cadastros (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('responsavel','empresa','centro_custo','categoria','tipo_despesa')),
  nome        text not null check (length(trim(nome)) between 1 and 80),
  ativo       boolean not null default true,
  ordem       int not null default 0,
  natureza    text check (natureza in ('fixa','variavel')),   -- só para tipo_despesa
  criado_por  uuid default auth.uid(),
  criado_em   timestamptz not null default now(),
  atualizado_por uuid,
  atualizado_em  timestamptz not null default now()
);
create unique index if not exists ux_cadastros_nome on public.cadastros (tipo, lower(trim(nome)));

-- ---------------------------------------------------------------------
-- Contas recorrentes (modelos que geram lançamentos por competência)
-- ---------------------------------------------------------------------
create table if not exists public.recorrentes (
  id              uuid primary key default gen_random_uuid(),
  descricao       text not null check (length(trim(descricao)) between 1 and 120),
  empresa_id      uuid references public.cadastros(id),
  responsavel_id  uuid references public.cadastros(id),
  centro_custo_id uuid references public.cadastros(id),
  categoria_id    uuid references public.cadastros(id),
  tipo_id         uuid references public.cadastros(id),
  valor           numeric(12,2) not null default 0 check (valor >= 0),
  dia_vencimento  int not null default 10 check (dia_vencimento between 1 and 31),
  inicio          date not null default date_trunc('month', public.hoje())::date check (extract(day from inicio) = 1),
  fim             date check (fim is null or extract(day from fim) = 1),
  ativo           boolean not null default true,
  observacoes     text,
  excluido_em     timestamptz,
  criado_por      uuid default auth.uid(),
  criado_em       timestamptz not null default now(),
  atualizado_por  uuid,
  atualizado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Lançamentos (contas e despesas)
--   competencia : mês a que a despesa pertence (sempre dia 1)
--   vencimento  : data em que deve ser paga
--   pagamento   : data em que foi efetivamente paga
-- ---------------------------------------------------------------------
create table if not exists public.lancamentos (
  id              uuid primary key default gen_random_uuid(),
  competencia     date not null check (extract(day from competencia) = 1),
  descricao       text not null check (length(trim(descricao)) between 1 and 120),
  empresa_id      uuid references public.cadastros(id),
  responsavel_id  uuid references public.cadastros(id),
  centro_custo_id uuid references public.cadastros(id),
  categoria_id    uuid references public.cadastros(id),
  tipo_id         uuid references public.cadastros(id),
  valor           numeric(12,2) not null default 0 check (valor >= 0),      -- valor original/previsto
  vencimento      date,
  pagamento       date,
  valor_pago      numeric(12,2) check (valor_pago is null or valor_pago >= 0),
  agendado_para   date,
  cancelado       boolean not null default false,
  cancelado_em    timestamptz,
  motivo_cancelamento text,
  observacoes     text,
  revisar         text,                       -- avisos de importação/validação
  recorrente_id   uuid references public.recorrentes(id) on delete set null,
  origem          text not null default 'manual' check (origem in ('manual','importacao','recorrencia')),
  import_ref      text,
  excluido_em     timestamptz,                -- lixeira (exclusão protegida)
  excluido_por    uuid,
  criado_por      uuid default auth.uid(),
  criado_em       timestamptz not null default now(),
  atualizado_por  uuid,
  atualizado_em   timestamptz not null default now(),
  constraint pagamento_exige_data check (valor_pago is null or pagamento is not null)
);
create index if not exists ix_lanc_comp on public.lancamentos (competencia) where excluido_em is null;
create index if not exists ix_lanc_venc on public.lancamentos (vencimento) where excluido_em is null and pagamento is null;
-- Recorrência nunca duplica o mesmo mês
create unique index if not exists ux_lanc_recorrencia on public.lancamentos (recorrente_id, competencia)
  where recorrente_id is not null and excluido_em is null;
-- Importação nunca duplica a mesma linha
create unique index if not exists ux_lanc_import on public.lancamentos (import_ref)
  where import_ref is not null and excluido_em is null;
-- Duplicidade acidental: mesma despesa, mesmo mês, mesmo valor e mesmo vencimento
create unique index if not exists ux_lanc_duplicidade on public.lancamentos
  (lower(trim(descricao)), competencia, valor, coalesce(vencimento, date '1900-01-01'))
  where excluido_em is null and not cancelado and import_ref is null;

-- ---------------------------------------------------------------------
-- Metas e aportes (várias metas simultâneas)
-- ---------------------------------------------------------------------
create table if not exists public.metas (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (length(trim(nome)) between 1 and 80),
  valor_meta    numeric(12,2) not null check (valor_meta > 0),
  data_limite   date,
  cor           text,
  ativo         boolean not null default true,
  observacoes   text,
  excluido_em   timestamptz,
  criado_por    uuid default auth.uid(),
  criado_em     timestamptz not null default now(),
  atualizado_por uuid,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.aportes (
  id            uuid primary key default gen_random_uuid(),
  meta_id       uuid not null references public.metas(id) on delete cascade,
  data          date not null default public.hoje(),
  descricao     text not null check (length(trim(descricao)) between 1 and 120),
  valor         numeric(12,2) not null check (valor <> 0),   -- negativo = retirada
  observacoes   text,
  excluido_em   timestamptz,
  criado_por    uuid default auth.uid(),
  criado_em     timestamptz not null default now(),
  atualizado_por uuid,
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Importações (registro de cada arquivo importado)
-- ---------------------------------------------------------------------
create table if not exists public.importacoes (
  id          uuid primary key default gen_random_uuid(),
  arquivo     text not null,
  lidas       int not null default 0,
  importadas  int not null default 0,
  ignoradas   int not null default 0,
  total       numeric(14,2) not null default 0,
  resumo      jsonb,
  criado_por  uuid default auth.uid(),
  criado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Histórico de alterações (auditoria automática)
-- ---------------------------------------------------------------------
create table if not exists public.auditoria (
  id           bigint generated always as identity primary key,
  tabela       text not null,
  registro_id  text,
  acao         text not null,
  usuario_id   uuid,
  usuario_nome text,
  quando       timestamptz not null default now(),
  antes        jsonb,
  depois       jsonb
);
create index if not exists ix_auditoria_registro on public.auditoria (tabela, registro_id, quando desc);
create index if not exists ix_auditoria_quando on public.auditoria (quando desc);

create or replace function public.registrar_auditoria() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_acao text; v_id text; v_nome text;
begin
  select nome into v_nome from public.perfis where user_id = auth.uid();
  if tg_op = 'INSERT' then v_acao := 'criou'; v_id := (to_jsonb(new)->>coalesce(tg_argv[0],'id'));
  elsif tg_op = 'DELETE' then v_acao := 'excluiu definitivamente'; v_id := (to_jsonb(old)->>coalesce(tg_argv[0],'id'));
  else
    v_id := (to_jsonb(new)->>coalesce(tg_argv[0],'id'));
    v_acao := 'editou';
    if (to_jsonb(old) ? 'excluido_em') then
      if (to_jsonb(old)->>'excluido_em') is null and (to_jsonb(new)->>'excluido_em') is not null then v_acao := 'enviou para a lixeira';
      elsif (to_jsonb(old)->>'excluido_em') is not null and (to_jsonb(new)->>'excluido_em') is null then v_acao := 'restaurou'; end if;
    end if;
    if tg_table_name = 'lancamentos' and v_acao = 'editou' then
      if old.pagamento is null and new.pagamento is not null then v_acao := 'marcou como paga';
      elsif old.pagamento is not null and new.pagamento is null then v_acao := 'desfez o pagamento';
      elsif not old.cancelado and new.cancelado then v_acao := 'cancelou';
      elsif old.cancelado and not new.cancelado then v_acao := 'reativou';
      elsif old.agendado_para is distinct from new.agendado_para and new.agendado_para is not null then v_acao := 'agendou';
      end if;
    end if;
    if to_jsonb(old) - 'atualizado_em' - 'atualizado_por' = to_jsonb(new) - 'atualizado_em' - 'atualizado_por' then return new; end if;
  end if;
  insert into public.auditoria (tabela, registro_id, acao, usuario_id, usuario_nome, antes, depois)
  values (tg_table_name, v_id, v_acao, auth.uid(), coalesce(v_nome, 'Sistema'),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create or replace function public.carimbar() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  if to_jsonb(new) ? 'atualizado_por' then new.atualizado_por := auth.uid(); end if;
  return new;
end $$;

-- Regras de negócio do lançamento
create or replace function public.validar_lancamento() returns trigger
language plpgsql as $$
begin
  new.descricao := trim(new.descricao);
  if new.pagamento is not null and new.valor_pago is null then new.valor_pago := new.valor; end if;
  if new.pagamento is null then new.valor_pago := null; end if;
  if new.pagamento is not null then new.agendado_para := null; end if;
  if new.cancelado and (tg_op = 'INSERT' or not old.cancelado) then new.cancelado_em := now(); end if;
  if not new.cancelado then new.cancelado_em := null; new.motivo_cancelamento := null; end if;
  if new.excluido_em is not null and (tg_op = 'INSERT' or old.excluido_em is null) then new.excluido_por := auth.uid(); end if;
  if new.excluido_em is null then new.excluido_por := null; end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['cadastros','recorrentes','lancamentos','metas','aportes','perfis'] loop
    execute format('drop trigger if exists trg_carimbo on public.%I', t);
    execute format('create trigger trg_carimbo before update on public.%I for each row execute function public.carimbar()', t);
    execute format('drop trigger if exists trg_auditoria on public.%I', t);
    if t = 'perfis' then
      execute format('create trigger trg_auditoria after insert or update or delete on public.%I for each row execute function public.registrar_auditoria(%L)', t, 'user_id');
    else
      execute format('create trigger trg_auditoria after insert or update or delete on public.%I for each row execute function public.registrar_auditoria()', t);
    end if;
  end loop;
end $$;
drop trigger if exists trg_validar on public.lancamentos;
create trigger trg_validar before insert or update on public.lancamentos for each row execute function public.validar_lancamento();

-- ---------------------------------------------------------------------
-- Visão com status calculado (mesmas regras da planilha)
-- ---------------------------------------------------------------------
create or replace view public.v_lancamentos with (security_invoker = true) as
select l.*,
  case
    when l.cancelado then 'cancelada'
    when l.pagamento is not null and l.pagamento <= public.hoje() then 'paga'
    when l.pagamento is not null or l.agendado_para is not null then 'agendada'
    when l.vencimento is not null and l.vencimento < public.hoje() then 'atrasada'
    else 'pendente'
  end as status,
  case
    when l.cancelado then 'Cancelada'
    when l.pagamento is not null and l.pagamento <= public.hoje() then
      case when l.vencimento is null or l.pagamento <= l.vencimento then 'Paga em dia' else 'Paga com atraso' end
    when l.pagamento is not null or l.agendado_para is not null then 'Agendada'
    when l.vencimento is null then 'Sem vencimento'
    when l.vencimento < public.hoje() then 'Atrasada'
    when l.vencimento = public.hoje() then 'Vence hoje'
    when l.vencimento <= public.hoje() + 7 then 'Vence em até 7 dias'
    when l.vencimento <= public.hoje() + 15 then 'Vence em 8 a 15 dias'
    else 'A vencer'
  end as situacao,
  case when l.vencimento is not null then l.vencimento - public.hoje() end as dias_para_vencer,
  case when l.pagamento is not null and l.vencimento is not null then greatest(l.pagamento - l.vencimento, 0) end as dias_atraso_pagamento,
  e.nome as empresa, r.nome as responsavel, cc.nome as centro_custo, ca.nome as categoria, tp.nome as tipo
from public.lancamentos l
left join public.cadastros e  on e.id  = l.empresa_id
left join public.cadastros r  on r.id  = l.responsavel_id
left join public.cadastros cc on cc.id = l.centro_custo_id
left join public.cadastros ca on ca.id = l.categoria_id
left join public.cadastros tp on tp.id = l.tipo_id
where l.excluido_em is null;

-- ---------------------------------------------------------------------
-- Gerar lançamentos das contas recorrentes para uma ou mais competências
-- ---------------------------------------------------------------------
create or replace function public.gerar_recorrentes(p_inicio date, p_meses int default 1)
returns int language plpgsql security invoker set search_path = public as $$
declare n int := 0; m int; comp date; k int;
begin
  if not public.pode_editar() then raise exception 'Sem permissão para gerar lançamentos.'; end if;
  if p_meses < 1 or p_meses > 24 then raise exception 'Escolha de 1 a 24 meses.'; end if;
  for m in 0 .. p_meses - 1 loop
    comp := (date_trunc('month', p_inicio) + make_interval(months => m))::date;
    insert into public.lancamentos (competencia, descricao, empresa_id, responsavel_id, centro_custo_id, categoria_id, tipo_id,
                                    valor, vencimento, observacoes, recorrente_id, origem)
    select comp, r.descricao, r.empresa_id, r.responsavel_id, r.centro_custo_id, r.categoria_id, r.tipo_id, r.valor,
           (comp + make_interval(days => least(r.dia_vencimento, extract(day from (comp + interval '1 month - 1 day'))::int) - 1))::date,
           r.observacoes, r.id, 'recorrencia'
    from public.recorrentes r
    where r.ativo and r.excluido_em is null and r.inicio <= comp and (r.fim is null or r.fim >= comp)
      and not exists (select 1 from public.lancamentos l where l.recorrente_id = r.id and l.competencia = comp and l.excluido_em is null)
    on conflict do nothing;
    get diagnostics k = row_count; n := n + k;
  end loop;
  return n;
end $$;

-- Admin: definir papel/ativo de um usuário
create or replace function public.definir_acesso(p_user uuid, p_papel text, p_ativo boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.e_admin() then raise exception 'Apenas administradores.'; end if;
  if p_user = auth.uid() and (p_papel <> 'admin' or not p_ativo) then raise exception 'Você não pode remover o seu próprio acesso de administrador.'; end if;
  update public.perfis set papel = p_papel, ativo = p_ativo where user_id = p_user;
end $$;

-- ---------------------------------------------------------------------
-- Segurança: RLS em todas as tabelas
-- ---------------------------------------------------------------------
alter table public.perfis      enable row level security;
alter table public.convites    enable row level security;
alter table public.cadastros   enable row level security;
alter table public.recorrentes enable row level security;
alter table public.lancamentos enable row level security;
alter table public.metas       enable row level security;
alter table public.aportes     enable row level security;
alter table public.importacoes enable row level security;
alter table public.auditoria   enable row level security;

do $$
declare t text; p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
  foreach t in array array['cadastros','recorrentes','lancamentos','metas','aportes','importacoes'] loop
    execute format('create policy ler on public.%I for select to authenticated using (public.pode_ler())', t);
    execute format('create policy inserir on public.%I for insert to authenticated with check (public.pode_editar())', t);
    execute format('create policy alterar on public.%I for update to authenticated using (public.pode_editar()) with check (public.pode_editar())', t);
    execute format('create policy apagar on public.%I for delete to authenticated using (public.e_admin())', t);
  end loop;
end $$;

create policy ler on public.auditoria for select to authenticated using (public.pode_ler());

create policy ler on public.perfis for select to authenticated using (public.pode_ler() or user_id = auth.uid());
create policy alterar_proprio on public.perfis for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and papel = (select p.papel from public.perfis p where p.user_id = auth.uid()) and ativo = (select p.ativo from public.perfis p where p.user_id = auth.uid()));

create policy ler on public.convites for select to authenticated using (public.e_admin());
create policy inserir on public.convites for insert to authenticated with check (public.e_admin());
create policy alterar on public.convites for update to authenticated using (public.e_admin()) with check (public.e_admin());
create policy apagar on public.convites for delete to authenticated using (public.e_admin());

-- Sem acesso anônimo a nada
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.perfis, public.convites, public.cadastros, public.recorrentes,
  public.lancamentos, public.metas, public.aportes, public.importacoes to authenticated;
grant select on public.auditoria, public.v_lancamentos to authenticated;
revoke execute on function public.gerar_recorrentes(date,int), public.definir_acesso(uuid,text,boolean) from anon, public;
grant execute on function public.gerar_recorrentes(date,int), public.definir_acesso(uuid,text,boolean),
  public.hoje(), public.meu_papel(), public.pode_ler(), public.pode_editar(), public.e_admin() to authenticated;

-- Backup automático (GitHub Actions usa a chave service_role, que precisa de leitura)
grant usage on schema public to service_role;
grant select on all tables in schema public to service_role;
alter default privileges in schema public grant select on tables to service_role;
