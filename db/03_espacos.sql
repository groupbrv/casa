-- =====================================================================
-- BRV360 • Áreas independentes (Casa, Bravus, Bravinhos, Hub)
-- Cada área tem suas próprias contas, recorrentes, metas e cadastros.
-- Usuários podem ter acesso a todas as áreas ou só a algumas.
-- Rode depois do 01_schema.sql. Os dados existentes vão para a área "Casa".
-- =====================================================================
set search_path = public;

create table if not exists public.espacos (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null unique check (slug ~ '^[a-z0-9-]+$'),
  nome      text not null,
  ordem     int not null default 0,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);
insert into public.espacos (id, slug, nome, ordem) values
  ('00000000-0000-4000-8000-0000000000c1', 'casa',      'Casa',      0),
  ('00000000-0000-4000-8000-0000000000b1', 'bravus',    'Bravus',    1),
  ('00000000-0000-4000-8000-0000000000b2', 'bravinhos', 'Bravinhos', 2),
  ('00000000-0000-4000-8000-0000000000a1', 'hub',       'Hub',       3)
on conflict (slug) do nothing;

-- Acesso por área (null = todas as áreas)
alter table public.perfis   add column if not exists espacos uuid[];
alter table public.convites add column if not exists espacos uuid[];

-- Área em cada registro (os existentes vão para "Casa")
do $$
declare t text;
begin
  foreach t in array array['cadastros','recorrentes','lancamentos','metas','importacoes'] loop
    execute format('alter table public.%I add column if not exists espaco_id uuid references public.espacos(id)', t);
    execute format('update public.%I set espaco_id = %L where espaco_id is null', t, '00000000-0000-4000-8000-0000000000c1');
    execute format('alter table public.%I alter column espaco_id set not null', t);
    execute format('create index if not exists ix_%s_espaco on public.%I (espaco_id)', t, t);
  end loop;
end $$;
alter table public.auditoria add column if not exists espaco_id uuid;

-- Unicidades passam a valer dentro de cada área
drop index if exists public.ux_cadastros_nome;
create unique index if not exists ux_cadastros_nome on public.cadastros (espaco_id, tipo, lower(trim(nome)));
drop index if exists public.ux_lanc_duplicidade;
create unique index if not exists ux_lanc_duplicidade on public.lancamentos
  (espaco_id, lower(trim(descricao)), competencia, valor, coalesce(vencimento, date '1900-01-01'))
  where excluido_em is null and not cancelado and import_ref is null;
drop index if exists public.ux_lanc_import;
create unique index if not exists ux_lanc_import on public.lancamentos (espaco_id, import_ref)
  where import_ref is not null and excluido_em is null;

-- Registros relacionados precisam ser da mesma área
create or replace function public.mesma_area() returns trigger
language plpgsql as $$
declare c record; e uuid;
begin
  if tg_table_name in ('lancamentos','recorrentes') then
    for c in select unnest(array[new.empresa_id, new.responsavel_id, new.centro_custo_id, new.categoria_id, new.tipo_id]) as id loop
      if c.id is not null then
        select espaco_id into e from public.cadastros where id = c.id;
        if e is distinct from new.espaco_id then raise exception 'Cadastro de outra área não pode ser usado aqui.'; end if;
      end if;
    end loop;
    if tg_table_name = 'lancamentos' then
      if new.recorrente_id is not null then
        select espaco_id into e from public.recorrentes where id = new.recorrente_id;
        if e is distinct from new.espaco_id then raise exception 'Recorrente de outra área.'; end if;
      end if;
    end if;
  end if;
  if tg_op = 'UPDATE' and new.espaco_id is distinct from old.espaco_id then raise exception 'Não é possível mover um registro para outra área.'; end if;
  return new;
end $$;
drop trigger if exists trg_mesma_area on public.lancamentos;
create trigger trg_mesma_area before insert or update on public.lancamentos for each row execute function public.mesma_area();
drop trigger if exists trg_mesma_area on public.recorrentes;
create trigger trg_mesma_area before insert or update on public.recorrentes for each row execute function public.mesma_area();
drop trigger if exists trg_mesma_area on public.metas;
create trigger trg_mesma_area before update on public.metas for each row execute function public.mesma_area();
drop trigger if exists trg_mesma_area on public.cadastros;
create trigger trg_mesma_area before update on public.cadastros for each row execute function public.mesma_area();

-- Permissão por área
create or replace function public.acesso_espaco(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where user_id = auth.uid() and ativo and (espacos is null or p = any(espacos)))
$$;
grant execute on function public.acesso_espaco(uuid) to authenticated;

-- Auditoria guarda a área do registro (para o histórico não misturar áreas)
create or replace function public.registrar_auditoria() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_acao text; v_id text; v_nome text; v_esp uuid; j jsonb;
begin
  select nome into v_nome from public.perfis where user_id = auth.uid();
  j := coalesce(to_jsonb(new), to_jsonb(old));
  v_esp := nullif(j->>'espaco_id','')::uuid;
  if v_esp is null and tg_table_name = 'aportes' then select espaco_id into v_esp from public.metas where id = (j->>'meta_id')::uuid; end if;
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
  insert into public.auditoria (tabela, registro_id, acao, usuario_id, usuario_nome, antes, depois, espaco_id)
  values (tg_table_name, v_id, v_acao, auth.uid(), coalesce(v_nome, 'Sistema'),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end, v_esp);
  return coalesce(new, old);
end $$;
update public.auditoria a set espaco_id = coalesce(nullif(coalesce(a.depois,a.antes)->>'espaco_id','')::uuid, '00000000-0000-4000-8000-0000000000c1')
  where a.espaco_id is null and a.tabela <> 'perfis';

-- Novo usuário herda as áreas do convite
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.convites%rowtype; primeiro boolean;
begin
  select not exists (select 1 from public.perfis) into primeiro;
  select * into c from public.convites where email = lower(new.email) and usado_em is null;
  insert into public.perfis (user_id, nome, email, papel, ativo, espacos)
  values (new.id, coalesce(c.nome, new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)), lower(new.email),
          case when primeiro then 'admin' when c.email is not null then c.papel else 'leitor' end,
          primeiro or c.email is not null, case when primeiro then null else c.espacos end)
  on conflict (user_id) do nothing;
  if c.email is not null then update public.convites set usado_em = now() where email = c.email; end if;
  return new;
end $$;

-- Admin define papel, situação e áreas
drop function if exists public.definir_acesso(uuid, text, boolean);
create or replace function public.definir_acesso(p_user uuid, p_papel text, p_ativo boolean, p_espacos uuid[] default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.e_admin() then raise exception 'Apenas administradores.'; end if;
  if p_user = auth.uid() and (p_papel <> 'admin' or not p_ativo or p_espacos is not null) then raise exception 'Você não pode reduzir o seu próprio acesso.'; end if;
  update public.perfis set papel = p_papel, ativo = p_ativo, espacos = case when p_espacos is null or cardinality(p_espacos) = 0 then null else p_espacos end where user_id = p_user;
end $$;
revoke execute on function public.definir_acesso(uuid,text,boolean,uuid[]) from anon, public;
grant execute on function public.definir_acesso(uuid,text,boolean,uuid[]) to authenticated;

-- Recorrências por área (sem área = todas as áreas que o usuário acessa)
drop function if exists public.gerar_recorrentes(date, int);
create or replace function public.gerar_recorrentes(p_inicio date, p_meses int default 1, p_espaco uuid default null)
returns int language plpgsql security invoker set search_path = public as $$
declare n int := 0; m int; comp date; k int;
begin
  if not public.pode_editar() then raise exception 'Sem permissão para gerar lançamentos.'; end if;
  if p_meses < 1 or p_meses > 24 then raise exception 'Escolha de 1 a 24 meses.'; end if;
  for m in 0 .. p_meses - 1 loop
    comp := (date_trunc('month', p_inicio) + make_interval(months => m))::date;
    insert into public.lancamentos (espaco_id, competencia, descricao, empresa_id, responsavel_id, centro_custo_id, categoria_id, tipo_id,
                                    valor, vencimento, observacoes, recorrente_id, origem)
    select r.espaco_id, comp, r.descricao, r.empresa_id, r.responsavel_id, r.centro_custo_id, r.categoria_id, r.tipo_id, r.valor,
           (comp + make_interval(days => least(r.dia_vencimento, extract(day from (comp + interval '1 month - 1 day'))::int) - 1))::date,
           r.observacoes, r.id, 'recorrencia'
    from public.recorrentes r
    where r.ativo and r.excluido_em is null and r.inicio <= comp and (r.fim is null or r.fim >= comp)
      and (p_espaco is null or r.espaco_id = p_espaco) and public.acesso_espaco(r.espaco_id)
      -- não recria o que já existe, nem o que foi excluído (lixeira) ou cancelado naquele mês
      and not exists (select 1 from public.lancamentos l where l.recorrente_id = r.id and l.competencia = comp)
    on conflict do nothing;
    get diagnostics k = row_count; n := n + k;
  end loop;
  return n;
end $$;
revoke execute on function public.gerar_recorrentes(date,int,uuid) from anon, public;
grant execute on function public.gerar_recorrentes(date,int,uuid) to authenticated;

-- Regras de acesso (RLS) por área
alter table public.espacos enable row level security;
do $$
declare t text; p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public'
           and tablename in ('espacos','cadastros','recorrentes','lancamentos','metas','aportes','importacoes','auditoria') loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
  foreach t in array array['cadastros','recorrentes','lancamentos','metas','importacoes'] loop
    execute format('create policy ler on public.%I for select to authenticated using (public.pode_ler() and public.acesso_espaco(espaco_id))', t);
    execute format('create policy inserir on public.%I for insert to authenticated with check (public.pode_editar() and public.acesso_espaco(espaco_id))', t);
    execute format('create policy alterar on public.%I for update to authenticated using (public.pode_editar() and public.acesso_espaco(espaco_id)) with check (public.pode_editar() and public.acesso_espaco(espaco_id))', t);
    execute format('create policy apagar on public.%I for delete to authenticated using (public.e_admin() and public.acesso_espaco(espaco_id))', t);
  end loop;
end $$;
create policy ler on public.aportes for select to authenticated using (public.pode_ler() and exists (select 1 from public.metas m where m.id = meta_id and public.acesso_espaco(m.espaco_id)));
create policy inserir on public.aportes for insert to authenticated with check (public.pode_editar() and exists (select 1 from public.metas m where m.id = meta_id and public.acesso_espaco(m.espaco_id)));
create policy alterar on public.aportes for update to authenticated using (public.pode_editar() and exists (select 1 from public.metas m where m.id = meta_id and public.acesso_espaco(m.espaco_id))) with check (public.pode_editar() and exists (select 1 from public.metas m where m.id = meta_id and public.acesso_espaco(m.espaco_id)));
create policy apagar on public.aportes for delete to authenticated using (public.e_admin() and exists (select 1 from public.metas m where m.id = meta_id and public.acesso_espaco(m.espaco_id)));
create policy ler on public.auditoria for select to authenticated using (public.pode_ler() and ((espaco_id is null and public.e_admin()) or (espaco_id is not null and public.acesso_espaco(espaco_id))));
create policy ler on public.espacos for select to authenticated using (public.acesso_espaco(id));
create policy alterar on public.espacos for update to authenticated using (public.e_admin()) with check (public.e_admin());
grant select, update on public.espacos to authenticated;
grant select on public.espacos to service_role;

-- Visão com status calculado (recriada para incluir a área)
drop view if exists public.v_lancamentos;
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
  e.nome as empresa, es.nome as area, r.nome as responsavel, cc.nome as centro_custo, ca.nome as categoria, tp.nome as tipo
from public.lancamentos l
left join public.espacos es on es.id = l.espaco_id
left join public.cadastros e  on e.id  = l.empresa_id
left join public.cadastros r  on r.id  = l.responsavel_id
left join public.cadastros cc on cc.id = l.centro_custo_id
left join public.cadastros ca on ca.id = l.categoria_id
left join public.cadastros tp on tp.id = l.tipo_id
where l.excluido_em is null;
grant select on public.v_lancamentos to authenticated, service_role;
