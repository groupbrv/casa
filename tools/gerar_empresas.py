"""Gera db/04_empresas.sql: lançamentos de julho da Bravus e do Hub, cada um na sua área, e cadastros iniciais da Bravinhos."""
import openpyxl, datetime, uuid, sys, decimal, json
SRC, OUT = sys.argv[1], sys.argv[2]
NS = uuid.UUID('6f1c1d1e-0000-4000-8000-00000000ca5a')
uid = lambda *k: str(uuid.uuid5(NS, '|'.join(k)))
q = lambda s: 'null' if s is None or s == '' else "'" + str(s).replace("'", "''") + "'"
r2 = lambda v: decimal.Decimal(str(v)).quantize(decimal.Decimal('0.01'), rounding=decimal.ROUND_HALF_UP)
norm = lambda s: ' '.join(str(s or '').split()).lower()
ESP = {'Bravus': '00000000-0000-4000-8000-0000000000b1', 'Hub': '00000000-0000-4000-8000-0000000000a1', 'Bravinhos': '00000000-0000-4000-8000-0000000000b2'}
wb = openpyxl.load_workbook(SRC); wbv = openpyxl.load_workbook(SRC, data_only=True)
cad = wb['Cadastros']; cats = [r[0].value for r in cad[cad.tables['tblCategorias'].ref]][1:]; cats = [c for c in cats if c]
linhas = {'Bravus': [], 'Hub': []}
for r, rv in zip(wb['Base Financeira'].iter_rows(min_row=2), wbv['Base Financeira'].iter_rows(min_row=2)):
    v = [c.value for c in r]; vv = [c.value for c in rv]
    if v[0] not in linhas: continue
    comp = vv[1] if isinstance(vv[1], datetime.datetime) else None
    if comp is None and isinstance(v[1], str) and v[1].startswith('=DATE('):
        a, m, d = [int(x) for x in v[1][6:-1].split(',')]; comp = datetime.datetime(a, m, d)
    if isinstance(v[1], datetime.datetime): comp = v[1]
    st = v[9] if not (isinstance(v[9], str) and v[9].startswith('=')) else None
    linhas[v[0]].append(dict(empresa=v[0], comp=comp.date().replace(day=1), venc=v[2].date() if v[2] else None, pag=v[3].date() if v[3] else None,
        cc=v[4], cat=v[5], desc=' '.join(str(v[6]).split()), tipo='Fixa' if str(v[7]).strip().upper() == 'FIXA' else 'Variável', valor=v[8] or 0, st=st, obs=v[10]))
out = ['-- Lançamentos de julho/2026 da Bravus e do Hub (planilha "Planilha de Despesas Unificada v3"), cada um na sua área', 'set search_path = public;', 'begin;']
def cad_(esp, tipo, nome, ativo=True, ordem=0, nat=None):
    out.append(f"insert into cadastros (id,espaco_id,tipo,nome,ativo,ordem,natureza,criado_por) values ('{uid(esp,tipo,nome)}','{ESP[esp]}','{tipo}',{q(nome)},{str(ativo).lower()},{ordem},{q(nat)},null) on conflict do nothing;")
ref = lambda esp, tipo, nome: 'null' if not nome else f"'{uid(esp, tipo, nome)}'"
resumo = {}
for esp in ['Bravus', 'Hub', 'Bravinhos']:
    ls = linhas.get(esp, [])
    cad_(esp, 'empresa', esp); cad_(esp, 'tipo_despesa', 'Fixa', True, 0, 'fixa'); cad_(esp, 'tipo_despesa', 'Variável', True, 1, 'variavel')
    for i, c in enumerate(cats + sorted({l['cat'] for l in ls if l['cat'] and l['cat'] not in cats})): cad_(esp, 'categoria', c, True, i)
    for i, c in enumerate(sorted({l['cc'] for l in ls if l['cc']} | ({esp} if esp == 'Bravinhos' else set()))): cad_(esp, 'centro_custo', c, True, i)
    tot = decimal.Decimal(0); nrec = 0
    for i, l in enumerate(ls):
        valor = r2(l['valor']); tot += valor; flags = []
        if valor == 0: flags.append('valor zero')
        if not l['venc']: flags.append('sem vencimento')
        if not l['cc']: flags.append('sem centro de custo')
        if isinstance(l['valor'], float) and r2(l['valor']) != decimal.Decimal(str(l['valor'])): flags.append(f"valor arredondado (planilha: {l['valor']})")
        if l['st']: flags.append(f"status digitado à mão na planilha: {l['st']}")
        dups = [x for x in ls if x is not l and norm(x['desc']) == norm(l['desc']) and x['comp'] == l['comp']]
        if dups: flags.append('possível duplicata (mesma despesa no mesmo mês)')
        iref = f"{norm(l['empresa'])}|{l['comp']:%Y-%m}|{norm(l['desc'])}|{valor:.2f}|{l['venc'] or ''}"
        rid = 'null'
        if l['tipo'] == 'Fixa' and valor > 0:
            rid_ = uid(esp, 'recorrente', l['desc']); rid = f"'{rid_}'"; nrec += 1
            out.append("insert into recorrentes (id,espaco_id,descricao,empresa_id,centro_custo_id,categoria_id,tipo_id,valor,dia_vencimento,inicio,ativo,criado_por) values "
                       f"('{rid_}','{ESP[esp]}',{q(l['desc'])},{ref(esp,'empresa',esp)},{ref(esp,'centro_custo',l['cc'])},{ref(esp,'categoria',l['cat'])},{ref(esp,'tipo_despesa',l['tipo'])},{valor},{l['venc'].day if l['venc'] else 10},'{l['comp']}',true,null) on conflict do nothing;")
        out.append("insert into lancamentos (id,espaco_id,competencia,descricao,empresa_id,centro_custo_id,categoria_id,tipo_id,valor,vencimento,pagamento,observacoes,revisar,recorrente_id,origem,import_ref,criado_por) values "
                   f"('{uid(esp,'lanc',str(i),iref)}','{ESP[esp]}','{l['comp']}',{q(l['desc'])},{ref(esp,'empresa',esp)},{ref(esp,'centro_custo',l['cc'])},{ref(esp,'categoria',l['cat'])},{ref(esp,'tipo_despesa',l['tipo'])},"
                   f"{valor},{q(l['venc'])},{q(l['pag'])},{q(l['obs'])},{q('; '.join(flags) or None)},{rid},'importacao',{q(iref)},null) on conflict do nothing;")
    if ls:
        out.append(f"insert into importacoes (espaco_id,arquivo,lidas,importadas,ignoradas,total,resumo,criado_por) values ('{ESP[esp]}','Planilha_de_Despesas_Unificada_v3_1.xlsx',{len(ls)},{len(ls)},0,{tot},'{{\"empresa\":\"{esp}\"}}'::jsonb,null);")
    resumo[esp] = {'lancamentos': len(ls), 'total': str(tot), 'recorrentes_fixas': nrec}
out.append('commit;')
open(OUT, 'w').write('\n'.join(out) + '\n')
print(json.dumps(resumo, ensure_ascii=False))
