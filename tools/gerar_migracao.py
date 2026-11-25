"""Gera db/02_dados.sql a partir da planilha original (somente leitura)."""
import openpyxl, datetime, uuid, sys, decimal, json
SRC = sys.argv[1]; OUT = sys.argv[2]
NS = uuid.UUID('6f1c1d1e-0000-4000-8000-00000000ca5a')
uid = lambda *k: str(uuid.uuid5(NS, '|'.join(k)))
q = lambda s: 'null' if s is None or s == '' else "'" + str(s).replace("'", "''") + "'"
def r2(v): return decimal.Decimal(str(v)).quantize(decimal.Decimal('0.01'), rounding=decimal.ROUND_HALF_UP)
norm = lambda s: ' '.join(str(s or '').split()).lower()
EMPRESAS_IMPORTAR = {'Financeiro 183'}

wb = openpyxl.load_workbook(SRC)                 # fórmulas
wbv = openpyxl.load_workbook(SRC, data_only=True) # valores calculados
cad = wb['Cadastros']
def tabela(nome):
    ref = cad.tables[nome].ref; return [r[0].value for r in cad[ref]][1:]
empresas = [x for x in tabela('tblEmpresas') if x]
ccs = [x for x in tabela('tblCC') if x]
cats = [x for x in tabela('tblCategorias') if x]

base = wb['Base Financeira']; basev = wbv['Base Financeira']
linhas = []; ignoradas = {'vazias': 0, 'outras_empresas': 0}
for r, rv in zip(base.iter_rows(min_row=2), basev.iter_rows(min_row=2)):
    v = [c.value for c in r]; vv = [c.value for c in rv]
    if all(x in (None, '') for x in (v[0], v[6], v[8])): ignoradas['vazias'] += 1; continue
    if v[0] not in EMPRESAS_IMPORTAR: ignoradas['outras_empresas'] += 1; continue
    comp = vv[1] if isinstance(vv[1], datetime.datetime) else None
    if comp is None and isinstance(v[1], str) and v[1].startswith('=DATE('):
        a, m, d = [int(x) for x in v[1][6:-1].split(',')]; comp = datetime.datetime(a, m, d)
    linhas.append(dict(empresa=v[0], comp=comp.date().replace(day=1), venc=v[2].date() if v[2] else None,
                       pag=v[3].date() if v[3] else None, cc=v[4], cat=v[5], desc=' '.join(str(v[6]).split()),
                       tipo='Fixa' if str(v[7]).strip().upper() == 'FIXA' else 'Variável', valor=v[8] or 0,
                       status_lit=None if (isinstance(v[9], str) and v[9].startswith('=')) or v[9] is None else v[9], obs=v[10]))

resp = sorted({l['cc'].split(' - ', 1)[1] for l in linhas if l['cc'] and l['cc'].startswith('Pessoal - ')})
out = ['-- Migração gerada automaticamente da planilha "Planilha de Despesas Unificada v3" (somente lançamentos pessoais)',
       'set search_path = public;', 'begin;']
def cadastro(tipo, nome, ativo=True, ordem=0, natureza=None):
    out.append(f"insert into cadastros (id,tipo,nome,ativo,ordem,natureza,criado_por) values ('{uid(tipo,nome)}','{tipo}',{q(nome)},{str(ativo).lower()},{ordem},{q(natureza)},null) on conflict do nothing;")
for i, e in enumerate(empresas): cadastro('empresa', e, e in EMPRESAS_IMPORTAR, i)
for i, n in enumerate(resp): cadastro('responsavel', n, True, i)
usados_cc = {l['cc'] for l in linhas}
for i, c in enumerate(ccs): cadastro('centro_custo', c, c in usados_cc, i)
usados_cat = {l['cat'] for l in linhas}
for i, c in enumerate(cats): cadastro('categoria', c, c in usados_cat or c not in ('Mercadorias','Logística','Marketing','Investimento BRV'), i)
cadastro('tipo_despesa', 'Fixa', True, 0, 'fixa'); cadastro('tipo_despesa', 'Variável', True, 1, 'variavel')

ref_id = lambda tipo, nome: 'null' if not nome else f"'{uid(tipo, nome)}'"
total = decimal.Decimal(0); flags_count = {}
for i, l in enumerate(linhas):
    valor = r2(l['valor']); total += valor
    flags = []
    if valor == 0: flags.append('valor zero')
    if not l['venc']: flags.append('sem vencimento')
    if not l['cc']: flags.append('sem centro de custo')
    if isinstance(l['valor'], float) and r2(l['valor']) != decimal.Decimal(str(l['valor'])): flags.append(f"valor arredondado (planilha: {l['valor']})")
    if l['status_lit']: flags.append(f"status digitado à mão na planilha: {l['status_lit']}")
    for f in flags: flags_count[f.split(' (')[0].split(':')[0]] = flags_count.get(f.split(' (')[0].split(':')[0], 0) + 1
    resp_nome = l['cc'].split(' - ', 1)[1] if l['cc'] and l['cc'].startswith('Pessoal - ') else None
    rid = uid('recorrente', l['desc'])
    iref = f"{norm(l['empresa'])}|{l['comp']:%Y-%m}|{norm(l['desc'])}|{valor:.2f}|{l['venc'] or ''}"
    out.append("insert into recorrentes (id,descricao,empresa_id,responsavel_id,centro_custo_id,categoria_id,tipo_id,valor,dia_vencimento,inicio,ativo,criado_por) values "
               f"('{rid}',{q(l['desc'])},{ref_id('empresa',l['empresa'])},{ref_id('responsavel',resp_nome)},{ref_id('centro_custo',l['cc'])},{ref_id('categoria',l['cat'])},{ref_id('tipo_despesa',l['tipo'])},"
               f"{valor},{l['venc'].day if l['venc'] else 10},'{l['comp']}',{'true' if valor > 0 else 'false'},null) on conflict do nothing;")
    out.append("insert into lancamentos (id,competencia,descricao,empresa_id,responsavel_id,centro_custo_id,categoria_id,tipo_id,valor,vencimento,pagamento,observacoes,revisar,recorrente_id,origem,import_ref,criado_por) values "
               f"('{uid('lanc',str(i),iref)}','{l['comp']}',{q(l['desc'])},{ref_id('empresa',l['empresa'])},{ref_id('responsavel',resp_nome)},{ref_id('centro_custo',l['cc'])},{ref_id('categoria',l['cat'])},{ref_id('tipo_despesa',l['tipo'])},"
               f"{valor},{q(l['venc'])},{q(l['pag'])},{q(l['obs'])},{q('; '.join(flags) or None)},'{rid}','importacao',{q(iref)},null) on conflict do nothing;")

# Economias
eco = wbv['Economias']; meta = eco['C4'].value
lim = eco['C5'].value
lim = lim.date() if isinstance(lim, datetime.datetime) else datetime.date(2026, 12, 31)
mid = uid('meta', 'Meta de poupança')
out.append(f"insert into metas (id,nome,valor_meta,data_limite,observacoes,criado_por) values ('{mid}','Meta de poupança',{r2(meta)},'{lim}','Importada da aba Economias da planilha',null) on conflict do nothing;")
ref = wb['Economias'].tables['tblEconomias'].ref; n_ap = 0; tot_ap = 0
for row in wbv['Economias'][ref][1:]:
    d, desc, val, obs = [c.value for c in row][:4]
    if not d or val in (None, ''): continue
    n_ap += 1; tot_ap += val
    out.append(f"insert into aportes (id,meta_id,data,descricao,valor,observacoes,criado_por) values ('{uid('aporte',str(d),str(desc),str(val))}','{mid}','{d.date()}',{q(desc)},{r2(val)},{q(obs)},null) on conflict do nothing;")
out.append(f"insert into importacoes (arquivo,lidas,importadas,ignoradas,total,resumo,criado_por) values ('Planilha_de_Despesas_Unificada_v3_1.xlsx',{len(linhas)+sum(ignoradas.values())},{len(linhas)},{sum(ignoradas.values())},{total},{q(json.dumps({'ignoradas':ignoradas,'avisos':flags_count,'aportes':n_ap,'total_aportes':float(tot_ap)},ensure_ascii=False))}::jsonb,null);")
out.append('commit;')
open(OUT, 'w').write('\n'.join(out) + '\n')
print(json.dumps({'lancamentos': len(linhas), 'total': str(total), 'ignoradas': ignoradas, 'avisos': flags_count, 'responsaveis': resp, 'meta': meta, 'limite': str(lim), 'aportes': n_ap, 'total_aportes': tot_ap}, ensure_ascii=False, indent=1))
