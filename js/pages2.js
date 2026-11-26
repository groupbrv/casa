/* CASA • cadastros, relatórios e configurações */
'use strict';

function carregarXLSX() {
  if (window.XLSX) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = res; s.onerror = () => rej(new Error('Não foi possível carregar o módulo de Excel. Verifique a internet.')); document.head.appendChild(s); });
}
async function exportarExcel(nome, abas) {
  await carregarXLSX();
  const wb = XLSX.utils.book_new();
  abas.forEach(([titulo, linhas]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas.length ? linhas : [{ Aviso: 'Sem dados' }]), titulo.slice(0, 31)));
  XLSX.writeFile(wb, nome + '.xlsx');
}

/* ===================== Cadastros ===================== */
const CAD_TABS = [['responsavel', 'Responsáveis'], ['empresa', 'Empresas'], ['centro_custo', 'Centros de custo'], ['categoria', 'Categorias'], ['tipo_despesa', 'Tipos de despesa'], ['recorrentes', 'Contas recorrentes']];
const usoCad = id => S.lanc.filter(l => [l.responsavel_id, l.empresa_id, l.centro_custo_id, l.categoria_id, l.tipo_id].includes(id)).length + S.rec.filter(r => [r.responsavel_id, r.empresa_id, r.centro_custo_id, r.categoria_id, r.tipo_id].includes(id)).length;
PAGES.cadastros = {
  html(sub) {
    const tab = CAD_TABS.find(t => t[0] === sub) ? sub : 'responsavel';
    const abas = '<div class="tabs">' + CAD_TABS.map(t => '<a href="#/cadastros/' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + '</a>').join('') + '</div>';
    if (tab === 'recorrentes') return pageHead('Cadastros · ' + espNome(S.esp), 'Contas que se repetem e entram sozinhas em Contas a pagar todo mês', podeEditar() ? '<button class="btn" data-a="gerarMesModal">Gerar competências</button><button class="btn pri" data-a="novaRec">' + ic('mais') + 'Nova recorrente</button>' : '') + abas + tabelaRec();
    const lista = S.cad.filter(c => c.tipo === tab).sort((a, b) => (b.ativo - a.ativo) || a.ordem - b.ordem || a.nome.localeCompare(b.nome));
    return pageHead('Cadastros · ' + espNome(S.esp), 'Itens desta área que alimentam os formulários. Desativar esconde dos formulários sem apagar o histórico.', podeEditar() ? '<button class="btn pri" data-a="novoCad" data-v="' + tab + '">' + ic('mais') + 'Adicionar</button>' : '') + abas +
      '<div class="tbl-wrap"><table class="tbl static"><thead><tr><th>Nome</th>' + (tab === 'tipo_despesa' ? '<th>Natureza</th>' : '') + '<th class="r">Uso</th><th>Situação</th><th></th></tr></thead><tbody>' +
      (lista.length ? lista.map(c => '<tr><td><b>' + esc(c.nome) + '</b></td>' + (tab === 'tipo_despesa' ? '<td>' + (c.natureza === 'fixa' ? 'Fixa' : 'Variável') + '</td>' : '') + '<td class="r num">' + usoCad(c.id) + '</td><td>' + (c.ativo ? '<span class="pill p-paga"><i></i>Ativo</span>' : '<span class="pill p-inativo"><i></i>Inativo</span>') + '</td>' +
        '<td class="acts">' + (podeEditar() ? '<button class="btn xs" data-a="editCad" data-id="' + c.id + '">Editar</button> <button class="btn xs" data-a="togCad" data-id="' + c.id + '">' + (c.ativo ? 'Desativar' : 'Ativar') + '</button>' : '') + '</td></tr>').join('') : '<tr><td colspan="5"><div class="empty">Nenhum cadastro.</div></td></tr>') + '</tbody></table></div>';
  }
};
function tabelaRec() {
  const ls = S.rec.slice().sort((a, b) => (b.ativo - a.ativo) || a.dia_vencimento - b.dia_vencimento || a.descricao.localeCompare(b.descricao));
  const at = ls.filter(r => r.ativo);
  return '<div class="kpis k3"><div class="kpi"><div class="l">Recorrentes ativas</div><div class="v num">' + at.length + '</div></div><div class="kpi"><div class="l">Previsto por mês</div><div class="v num">' + brl(soma(at, r => +r.valor)) + '</div></div><div class="kpi"><div class="l">Inativas</div><div class="v num">' + (ls.length - at.length) + '</div></div></div>' +
    '<div class="tbl-wrap"><table class="tbl static"><thead><tr><th>Despesa</th><th>Categoria</th><th>Responsável</th><th>Dia</th><th>Vigência</th><th class="r">Valor</th><th>Ativa</th><th></th></tr></thead><tbody>' +
    (ls.length ? ls.map(r => '<tr><td class="desc"><b>' + esc(r.descricao) + '</b><small>' + esc(C.nome(r.tipo_id)) + '</small></td><td>' + esc(C.nome(r.categoria_id) || '—') + '</td><td>' + esc(C.nome(r.responsavel_id) || '—') + '</td><td>' + r.dia_vencimento + '</td><td>' + mesCurto(mesKey(r.inicio)) + (r.fim ? ' a ' + mesCurto(mesKey(r.fim)) : ' em diante') + '</td><td class="r num">' + brl(r.valor) + '</td>' +
      '<td>' + (podeEditar() ? '<button class="tg' + (r.ativo ? ' on' : '') + '" data-a="togRec" data-id="' + r.id + '" aria-label="Ativar ou desativar"></button>' : (r.ativo ? 'Sim' : 'Não')) + '</td><td class="acts">' + (podeEditar() ? '<button class="btn xs" data-a="editRec" data-id="' + r.id + '">Editar</button>' : '') + '</td></tr>').join('') : '<tr><td colspan="8"><div class="empty">Nenhuma conta recorrente.</div></td></tr>') + '</tbody></table></div>';
}
function formCad(tipo, c) {
  const novo = !c; c = c || { tipo, ativo: true, natureza: 'variavel' };
  const nomeTipo = CAD_TABS.find(t => t[0] === c.tipo)[1];
  abrirModal((novo ? 'Adicionar' : 'Editar') + ' · ' + nomeTipo, '<form id="fCd"><div class="field"><label>Nome *</label><input class="inp" id="cdN" value="' + esc(c.nome || '') + '" maxlength="80" required></div>' +
    (c.tipo === 'tipo_despesa' ? '<div class="field"><label>Natureza (usada no gráfico fixas × variáveis)</label>' + seg('cdNat', [['fixa', 'Fixa'], ['variavel', 'Variável']], c.natureza || 'variavel') + '</div>' : '') +
    '<div class="err" id="cdErr"></div><div class="mf"><button type="button" class="btn" data-a="fechar">Cancelar</button><button class="btn pri" id="cdS">Salvar</button></div></form>', {
    classe: 'sm', onMount: m => {
      ligarSegs(m);
      $('#fCd', m).onsubmit = async e => {
        e.preventDefault(); const row = { nome: $('#cdN').value.trim() }; if (c.tipo === 'tipo_despesa') row.natureza = segVal('cdNat');
        if (S.cad.some(x => x.tipo === c.tipo && x.id !== c.id && norm(x.nome) === norm(row.nome))) return $('#cdErr').textContent = 'Já existe um cadastro com esse nome.';
        try { await act(() => novo ? DB.insert('cadastros', Object.assign({ tipo: c.tipo, ordem: S.cad.filter(x => x.tipo === c.tipo).length }, row)) : DB.update('cadastros', c.id, row), 'Cadastro salvo.', $('#cdS')); fecharModal(); } catch (err) { $('#cdErr').textContent = err.message; }
      };
    }
  });
}
function formRec(r) {
  const novo = !r; r = r || { ativo: true, dia_vencimento: 10, inicio: S.ui.mes + '-01', tipo_id: (C.lista('tipo_despesa').find(t => t.natureza === 'fixa') || {}).id, empresa_id: (C.lista('empresa')[0] || {}).id };
  abrirModal(novo ? 'Nova conta recorrente' : 'Editar conta recorrente', '<form id="fR"><div class="field"><label>Despesa *</label><input class="inp" id="rD" value="' + esc(r.descricao || '') + '" maxlength="120" required></div>' +
    '<div class="grid3"><div class="field"><label>Valor previsto</label><input class="inp num" id="rV" inputmode="decimal" value="' + valorInput(r.valor) + '"></div><div class="field"><label>Dia do vencimento</label><input class="inp" id="rDia" type="number" min="1" max="31" value="' + r.dia_vencimento + '"></div><div class="field"><label>Tipo</label><select class="inp" id="rT">' + opts(C.lista('tipo_despesa', r.tipo_id), r.tipo_id) + '</select></div></div>' +
    '<div class="grid2"><div class="field"><label>Categoria</label><select class="inp" id="rC">' + opts(C.lista('categoria', r.categoria_id), r.categoria_id) + '</select></div><div class="field"><label>Responsável</label><select class="inp" id="rR">' + opts(C.lista('responsavel', r.responsavel_id), r.responsavel_id) + '</select></div></div>' +
    '<div class="grid2"><div class="field"><label>Centro de custo</label><select class="inp" id="rCC">' + opts(C.lista('centro_custo', r.centro_custo_id), r.centro_custo_id) + '</select></div><div class="field"><label>Empresa</label><select class="inp" id="rE">' + opts(C.lista('empresa', r.empresa_id), r.empresa_id) + '</select></div></div>' +
    '<div class="grid2"><div class="field"><label>Início (competência)</label><input class="inp" id="rI" type="month" value="' + mesKey(r.inicio) + '" required></div><div class="field"><label>Fim (opcional)</label><input class="inp" id="rF" type="month" value="' + (r.fim ? mesKey(r.fim) : '') + '"><span class="hint">Ex.: última parcela</span></div></div>' +
    '<div class="box"><div class="hd"><span>Ativa</span><button type="button" class="tg' + (r.ativo ? ' on' : '') + '" id="rA"></button></div></div>' +
    '<div class="field"><label>Observações</label><textarea class="inp" id="rO">' + esc(r.observacoes || '') + '</textarea></div><div class="err" id="rErr"></div>' +
    '<div class="mf">' + (!novo ? '<button type="button" class="btn danger" id="rX">Excluir</button><span class="grow"></span>' : '') + '<button type="button" class="btn" data-a="fechar">Cancelar</button><button class="btn pri" id="rS">Salvar</button></div></form>', {
    onMount: m => {
      $('#rA', m).onclick = function () { this.classList.toggle('on'); };
      $('#fR', m).onsubmit = async e => {
        e.preventDefault();
        const row = { descricao: $('#rD').value.trim(), valor: parseValor($('#rV').value), dia_vencimento: Math.min(31, Math.max(1, +$('#rDia').value || 10)), tipo_id: $('#rT').value || null, categoria_id: $('#rC').value || null, responsavel_id: $('#rR').value || null, centro_custo_id: $('#rCC').value || null, empresa_id: $('#rE').value || null, inicio: $('#rI').value + '-01', fim: $('#rF').value ? $('#rF').value + '-01' : null, ativo: $('#rA').classList.contains('on'), observacoes: $('#rO').value.trim() || null };
        if (row.fim && row.fim < row.inicio) return $('#rErr').textContent = 'O fim não pode ser antes do início.';
        try { await act(() => novo ? DB.insert('recorrentes', row) : DB.update('recorrentes', r.id, row), 'Conta recorrente salva. Os lançamentos já gerados não mudam.', $('#rS')); fecharModal(); } catch (err) { $('#rErr').textContent = err.message; }
      };
      const x = $('#rX', m); if (x) x.onclick = async () => { if (!await confirmar('Excluir conta recorrente?', 'Ela vai para a lixeira. Os lançamentos já gerados continuam no histórico.', 'Excluir')) return; act(() => DB.update('recorrentes', r.id, { excluido_em: new Date().toISOString() }), 'Recorrente enviada para a lixeira.'); };
    }
  });
}
Object.assign(ACTIONS, {
  novoCad: el => formCad(el.dataset.v),
  editCad: el => formCad(null, C.byId(el.dataset.id)),
  togCad: el => { const c = C.byId(el.dataset.id); act(() => DB.update('cadastros', c.id, { ativo: !c.ativo }), c.ativo ? 'Cadastro desativado (o histórico continua).' : 'Cadastro ativado.', el); },
  novaRec: () => formRec(null),
  editRec: el => formRec(S.rec.find(r => r.id === el.dataset.id)),
  togRec: el => { const r = S.rec.find(x => x.id === el.dataset.id); act(() => DB.update('recorrentes', r.id, { ativo: !r.ativo }), r.ativo ? 'Recorrente desativada.' : 'Recorrente ativada.', el); }
});

/* ===================== Relatórios ===================== */
const RELS = [['mensal', 'Despesas mensais'], ['anual', 'Despesas anuais'], ['categoria', 'Gastos por categoria'], ['responsavel', 'Gastos por responsável'], ['centro', 'Gastos por centro de custo'], ['pagopend', 'Pagas × pendentes'], ['atrasos', 'Histórico de atrasos'], ['economias', 'Evolução das economias']];
function dadosRelatorio() {
  const f = S.ui.rel; const ano = f.ano || S.hoje.slice(0, 4);
  const de = f.de || (ano + '-01'), ate = f.ate || (ano + '-12');
  const ls = filtrarLanc(S.lanc.filter(l => !l.cancelado && mesKey(l.competencia) >= de && mesKey(l.competencia) <= ate), f);
  const meses = []; for (let k = de; k <= ate; k = addMes(k, 1)) meses.push(k);
  const T = { titulo: RELS.find(r => r[0] === f.tipo)[1], periodo: mesTitulo(de) + ' a ' + mesTitulo(ate), colunas: [], linhas: [], total: null, grafico: '' };
  const porGrupo = (chave) => {
    const tot = soma(ls, l => +l.valor); const g = agrupar(ls, chave);
    T.colunas = ['Item', 'Total', '% do total', 'Pago', 'Em aberto', 'Contas', 'Média mensal'];
    T.linhas = g.map(([k, v]) => { const sub = ls.filter(l => (chave(l) || 'Não informado') === k); const r = resumo(sub); return [k, brl(v), pct(v, tot) + '%', brl(r.pago), brl(r.aberto), sub.length, brl(v / Math.max(1, meses.length))]; });
    T.total = ['Total', brl(tot), '100%', brl(resumo(ls).pago), brl(resumo(ls).aberto), ls.length, brl(tot / Math.max(1, meses.length))];
    T.grafico = hbars(g, tot, 10);
  };
  if (f.tipo === 'mensal' || f.tipo === 'pagopend') {
    const rs = meses.map(k => [k, resumo(ls.filter(l => mesKey(l.competencia) === k))]);
    if (f.tipo === 'mensal') {
      T.colunas = ['Competência', 'Total', 'Fixas', 'Variáveis', 'Contas', 'Variação'];
      T.linhas = rs.map(([k, r], i) => { const sub = ls.filter(l => mesKey(l.competencia) === k); const fx = soma(sub.filter(l => natureza(l) === 'fixa'), l => +l.valor); const ant = i ? rs[i - 1][1].total : 0; return [mesTitulo(k), brl(r.total), brl(fx), brl(r.total - fx), r.qtd, ant ? ((r.total - ant) >= 0 ? '+' : '−') + brl(Math.abs(r.total - ant)) : '—']; });
      const tot = resumo(ls); T.total = ['Total', brl(tot.total), '', '', tot.qtd, ''];
      T.grafico = colunas(rs.map(([k, r]) => ({ rot: MES3[+k.slice(5) - 1], tip: mesTitulo(k), vals: [r.total] })), [{ k: 'a', nome: 'Total' }]);
    } else {
      T.colunas = ['Competência', 'Total', 'Pago', 'Pendente', 'Atrasado', '% pago', 'Contas pendentes'];
      T.linhas = rs.map(([k, r]) => [mesTitulo(k), brl(r.total), brl(r.pago), brl(r.aberto), brl(r.atrasado), pct(r.pago, r.total) + '%', r.qPend]);
      const t = resumo(ls); T.total = ['Total', brl(t.total), brl(t.pago), brl(t.aberto), brl(t.atrasado), pct(t.pago, t.total) + '%', t.qPend];
      T.grafico = colunas(rs.map(([k, r]) => ({ rot: MES3[+k.slice(5) - 1], tip: mesTitulo(k), vals: [r.pago, r.aberto - r.atrasado, r.atrasado] })), [{ k: 'paid', nome: 'Pago' }, { k: 'open', nome: 'Pendente' }, { k: 'late', nome: 'Atrasado' }]);
    }
  } else if (f.tipo === 'anual') {
    const todos = filtrarLanc(S.lanc.filter(l => !l.cancelado), f); const anos = uniq(todos.map(l => l.competencia.slice(0, 4))).sort();
    T.periodo = 'Todos os anos';
    T.colunas = ['Ano', 'Total', 'Pago', 'Em aberto', 'Contas', 'Média mensal (meses com dados)'];
    T.linhas = anos.map(a => { const sub = todos.filter(l => l.competencia.startsWith(a)); const r = resumo(sub); const nm = uniq(sub.map(l => mesKey(l.competencia))).length; return [a, brl(r.total), brl(r.pago), brl(r.aberto), r.qtd, brl(r.total / Math.max(1, nm))]; });
    T.grafico = colunas(anos.map(a => ({ rot: a, vals: [resumo(todos.filter(l => l.competencia.startsWith(a))).total] })), [{ k: 'a', nome: 'Total' }]);
  } else if (f.tipo === 'categoria') porGrupo(l => C.nome(l.categoria_id));
  else if (f.tipo === 'responsavel') porGrupo(l => C.nome(l.responsavel_id));
  else if (f.tipo === 'centro') porGrupo(l => C.nome(l.centro_custo_id));
  else if (f.tipo === 'atrasos') {
    const at = ls.filter(l => st(l).k === 'atrasada' || st(l).atraso).sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1));
    T.colunas = ['Despesa', 'Competência', 'Vencimento', 'Pagamento', 'Dias de atraso', 'Valor', 'Situação', 'Responsável'];
    T.linhas = at.map(l => { const s = st(l); return [l.descricao, mesTitulo(mesKey(l.competencia)), ddmmaa(l.vencimento), ddmmaa(l.pagamento) || '—', s.k === 'atrasada' ? -s.n : s.atraso, brl(l.valor), s.k === 'atrasada' ? 'Em atraso (não paga)' : 'Paga com atraso', C.nome(l.responsavel_id) || '—']; });
    T.total = ['Total', '', '', '', at.length ? Math.round(soma(at, l => st(l).k === 'atrasada' ? -st(l).n : st(l).atraso) / at.length) + ' (média)' : '', brl(soma(at, l => +l.valor)), at.length + ' conta(s)', ''];
    const pagas = ls.filter(ehPaga); T.grafico = '<div class="stat2"><div><span class="l">Pagas em dia</span><b class="num">' + pct(pagas.filter(l => !st(l).atraso).length, pagas.length) + '%</b></div><div><span class="l">Abertas em atraso</span><b class="num">' + ls.filter(l => st(l).k === 'atrasada').length + '</b></div></div>';
  } else if (f.tipo === 'economias') {
    T.colunas = ['Mês'].concat(S.metas.map(m => m.nome)).concat(['Total acumulado']);
    T.linhas = meses.map(k => { const fim = k + '-31'; const vals = S.metas.map(m => soma(S.aportes.filter(a => a.meta_id === m.id && a.data <= fim), a => +a.valor)); return [mesTitulo(k)].concat(vals.map(brl)).concat([brl(soma(vals))]); });
    T.grafico = colunas(meses.map(k => ({ rot: MES3[+k.slice(5) - 1], tip: mesTitulo(k), vals: [soma(S.aportes.filter(a => a.data <= k + '-31'), a => +a.valor)] })), [{ k: 'a', nome: 'Acumulado' }]);
  }
  return T;
}
PAGES.relatorios = {
  html() {
    const f = S.ui.rel; const T = dadosRelatorio();
    const anos = uniq(S.lanc.map(l => l.competencia.slice(0, 4)).concat([S.hoje.slice(0, 4)])).sort();
    return pageHead('Relatórios · ' + (S.esp === 'todos' ? 'Todas as áreas' : espNome(S.esp)), T.titulo + ' · ' + T.periodo, '<button class="btn" data-a="relXls">' + ic('baixar') + 'Excel</button><button class="btn" data-a="relPdf">' + ic('imp') + 'PDF</button>') +
      '<div class="filters"><select class="inp sm" data-f="tipo">' + optsTxt(RELS, f.tipo) + '</select>' +
      (f.tipo !== 'anual' ? '<select class="inp sm" data-f="ano">' + anos.map(a => '<option' + ((f.ano || S.hoje.slice(0, 4)) === a ? ' selected' : '') + '>' + a + '</option>').join('') + '</select><input class="inp sm" type="month" data-f="de" value="' + esc(f.de || '') + '" title="De (opcional)"><input class="inp sm" type="month" data-f="ate" value="' + esc(f.ate || '') + '" title="Até (opcional)">' : '') +
      (f.tipo !== 'economias' ? '<select class="inp sm" data-f="categoria">' + opts(C.lista('categoria', f.categoria), f.categoria, 'Categoria') + '</select><select class="inp sm" data-f="responsavel">' + opts(C.lista('responsavel', f.responsavel), f.responsavel, 'Responsável') + '</select><select class="inp sm" data-f="centro">' + opts(C.lista('centro_custo', f.centro), f.centro, 'Centro de custo') + '</select>' : '') + '</div>' +
      '<div class="cards"><div class="card c12">' + T.grafico + '</div></div><div style="height:16px"></div>' +
      '<div class="tbl-wrap"><table class="tbl static"><thead><tr>' + T.colunas.map((c, i) => '<th class="' + (i ? 'r' : '') + '">' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      (T.linhas.length ? T.linhas.map(l => '<tr>' + l.map((v, i) => '<td class="' + (i ? 'r num' : '') + '">' + esc(v) + '</td>').join('') + '</tr>').join('') : '<tr><td colspan="' + T.colunas.length + '"><div class="empty">Sem dados no período.</div></td></tr>') + '</tbody>' +
      (T.total ? '<tfoot><tr>' + T.total.map((v, i) => '<td class="' + (i ? 'r num' : '') + '">' + esc(v) + '</td>').join('') + '</tr></tfoot>' : '') + '</table></div>';
  },
  mount() { ligarFiltros(S.ui.rel); }
};
Object.assign(ACTIONS, {
  relPdf: () => window.print(),
  relXls: async el => {
    el.disabled = true;
    try {
      const T = dadosRelatorio();
      const linhas = T.linhas.concat(T.total ? [T.total] : []).map(l => Object.fromEntries(T.colunas.map((c, i) => [c, l[i]])));
      await exportarExcel('BRV360 - ' + (S.esp === 'todos' ? 'Todas as areas' : espNome(S.esp)) + ' - ' + T.titulo + ' - ' + T.periodo.replace(/\//g, '-'), [[T.titulo, linhas]]);
    } catch (e) { toast(e.message, true); } finally { el.disabled = false; }
  }
});

/* ===================== Configurações ===================== */
const CFG_TABS = [['conta', 'Minha conta'], ['usuarios', 'Usuários'], ['importar', 'Importar Excel'], ['lixeira', 'Lixeira'], ['historico', 'Histórico'], ['backup', 'Backup']];
PAGES.config = {
  html(sub) {
    const tab = CFG_TABS.find(t => t[0] === sub) ? sub : 'conta';
    const abas = '<div class="tabs">' + CFG_TABS.filter(t => eAdmin() || ['conta', 'historico', 'backup'].includes(t[0])).map(t => '<a href="#/config/' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + '</a>').join('') + '</div>';
    return pageHead('Configurações', '') + abas + '<div id="cfg">' + (CFG[tab] ? CFG[tab].html() : '') + '</div>';
  },
  mount(sub) { const tab = CFG_TABS.find(t => t[0] === sub) ? sub : 'conta'; if (CFG[tab] && CFG[tab].mount) CFG[tab].mount(); }
};
const CFG = {};
CFG.conta = {
  html: () => '<div class="cards"><div class="card c6"><h3>Meus dados</h3><form id="fMe"><div class="field"><label>Nome</label><input class="inp" id="meN" value="' + esc(S.perfil.nome) + '" maxlength="60" required></div><div class="field"><label>E-mail</label><input class="inp" value="' + esc(S.session.user.email) + '" disabled></div><div class="field"><label>Nível de acesso</label><input class="inp" value="' + esc({ admin: 'Administrador', editor: 'Editor', leitor: 'Somente leitura' }[S.perfil.papel]) + '" disabled></div><button class="btn pri" id="meS">Salvar</button></form></div>' +
    '<div class="card c6"><h3>Trocar senha</h3><form id="fSn"><div class="field"><label>Nova senha (mínimo 8 caracteres)</label><input class="inp" id="snN" type="password" minlength="8" autocomplete="new-password" required></div><div class="field"><label>Repita a nova senha</label><input class="inp" id="snR" type="password" minlength="8" autocomplete="new-password" required></div><div class="err" id="snErr"></div><button class="btn pri" id="snS">Trocar senha</button></form>' +
    '<h3 style="margin-top:24px">Sessões</h3><p class="muted" style="margin:-6px 0 12px;font-size:13px">Saia de todos os aparelhos se perdeu um celular ou usou um computador de outra pessoa.</p><button class="btn" data-a="sairTodos">Sair de todos os aparelhos</button></div></div>',
  mount() {
    $('#fMe').onsubmit = async e => { e.preventDefault(); await act(() => DB.update('perfis', S.perfil.user_id, { nome: $('#meN').value.trim() }, 'user_id').then(p => { S.perfil = p; }), 'Dados salvos.', $('#meS')); };
    $('#fSn').onsubmit = async e => {
      e.preventDefault(); if ($('#snN').value !== $('#snR').value) return $('#snErr').textContent = 'As senhas não conferem.';
      const { error } = await S.sb.auth.updateUser({ password: $('#snN').value }); if (error) return $('#snErr').textContent = traduz(error).message;
      e.target.reset(); toast('Senha alterada.');
    };
  }
};
ACTIONS.sairTodos = async () => { if (await confirmar('Sair de todos os aparelhos?', 'Você precisará entrar de novo em todos os aparelhos, inclusive neste.', 'Sair de todos')) await S.sb.auth.signOut({ scope: 'global' }); };

CFG.usuarios = {
  html: () => '<div class="cards"><div class="card c7"><h3>Usuários</h3><div id="usrs" class="muted">Carregando…</div></div><div class="card c5"><h3>Convidar pessoa</h3><form id="fCv"><div class="field"><label>Nome</label><input class="inp" id="cvN" required maxlength="60"></div><div class="field"><label>E-mail</label><input class="inp" id="cvE" type="email" required></div><div class="field"><label>Áreas que pode ver</label><div class="chips" id="cvA">' + S.espacos.map(e => '<label class="chip on"><input type="checkbox" value="' + e.id + '" checked style="margin:0 4px 0 0">' + esc(e.nome) + '</label>').join('') + '</div><span class="hint">Desmarque as áreas que a pessoa não deve ver.</span></div><div class="field"><label>Nível de acesso</label><select class="inp" id="cvP">' + optsTxt([['editor', 'Editor — lança e edita'], ['leitor', 'Somente leitura'], ['admin', 'Administrador — tudo']], 'editor') + '</select></div><div class="err" id="cvErr"></div><button class="btn pri" id="cvS">Criar convite</button></form>' +
    '<div class="infobox" style="margin-top:14px">Depois do convite, a pessoa abre <b>' + esc(location.host) + '</b>, clica em <b>“Recebi um convite”</b> e cria a senha com esse mesmo e-mail. Só e-mails convidados recebem acesso.</div><div id="cvs"></div></div></div>',
  async mount() {
    const papel = { admin: 'Administrador', editor: 'Editor', leitor: 'Somente leitura' };
    const [{ data: us }, { data: cv }] = await Promise.all([S.sb.from('perfis').select('*').order('criado_em'), S.sb.from('convites').select('*').order('criado_em', { ascending: false })]);
    const areasTxt = u => !u.espacos || !u.espacos.length ? 'Todas as áreas' : u.espacos.map(espNome).filter(Boolean).join(', ');
    $('#usrs').innerHTML = '<table class="tbl static"><thead><tr><th>Nome</th><th>Acesso</th><th>Situação</th><th></th></tr></thead><tbody>' + (us || []).map(u => '<tr><td class="desc"><b>' + esc(u.nome) + '</b><small>' + esc(u.email || '') + ' · ' + esc(areasTxt(u)) + (u.user_id === S.perfil.user_id ? '' : ' · <a data-a="areasUser" data-id="' + u.user_id + '" style="cursor:pointer">alterar áreas</a>') + '</small></td><td>' + (u.user_id === S.perfil.user_id ? papel[u.papel] : '<select class="inp sm" data-u="' + u.user_id + '">' + optsTxt(Object.entries(papel), u.papel) + '</select>') + '</td><td>' + (u.ativo ? '<span class="pill p-paga"><i></i>Ativo</span>' : '<span class="pill p-inativo"><i></i>Bloqueado</span>') + '</td><td class="acts">' + (u.user_id === S.perfil.user_id ? '<span class="muted">você</span>' : '<button class="btn xs" data-a="togUser" data-id="' + u.user_id + '" data-v="' + (u.ativo ? 0 : 1) + '">' + (u.ativo ? 'Bloquear' : 'Liberar') + '</button>') + '</td></tr>').join('') + '</tbody></table>';
    $$('[data-u]').forEach(s => s.onchange = async () => { const u = us.find(x => x.user_id === s.dataset.u); try { await DB.rpc('definir_acesso', { p_user: u.user_id, p_papel: s.value, p_ativo: u.ativo, p_espacos: u.espacos }); toast('Acesso atualizado.'); } catch (e) { toast(e.message, true); } render(); });
    CFG.usuarios.lista = us || [];
    $('#cvs').innerHTML = (cv || []).length ? '<h3 style="margin-top:16px">Convites</h3>' + cv.map(c => '<div class="ap"><span>' + (c.usado_em ? 'usado' : 'pendente') + '</span><span>' + esc(c.nome) + ' · ' + esc(c.email) + ' · ' + esc(areasTxt(c)) + '</span>' + (c.usado_em ? '' : '<b><button class="btn xs danger" data-a="delConvite" data-v="' + esc(c.email) + '">Remover</button></b>') + '</div>').join('') : '';
    $('#fCv').onsubmit = async e => {
      e.preventDefault();
      const areas = $$('#cvA input:checked').map(i => i.value);
      if (!areas.length) return $('#cvErr').textContent = 'Escolha pelo menos uma área.';
      try { await DB.insert('convites', { email: $('#cvE').value.trim().toLowerCase(), nome: $('#cvN').value.trim(), papel: $('#cvP').value, criado_por: S.perfil.user_id, espacos: areas.length === S.espacos.length ? null : areas }); toast('Convite criado. Avise a pessoa para criar o acesso.'); render(); }
      catch (err) { $('#cvErr').textContent = /duplicate|unique/.test(err.message) ? 'Já existe convite para esse e-mail.' : err.message; }
    };
  }
};
Object.assign(ACTIONS, {
  areasUser: el => {
    const u = (CFG.usuarios.lista || []).find(x => x.user_id === el.dataset.id); if (!u) return;
    const tem = id => !u.espacos || !u.espacos.length || u.espacos.includes(id);
    abrirModal('Áreas de ' + esc(u.nome), '<form id="fAr"><div class="chips" id="arA">' + S.espacos.map(e => '<label class="chip on"><input type="checkbox" value="' + e.id + '"' + (tem(e.id) ? ' checked' : '') + ' style="margin:0 4px 0 0">' + esc(e.nome) + '</label>').join('') + '</div><p class="muted" style="font-size:13px">A pessoa só vê, lança e paga contas das áreas marcadas.</p><div class="err" id="arErr"></div><div class="mf"><button type="button" class="btn" data-a="fechar">Cancelar</button><button class="btn pri" id="arS">Salvar</button></div></form>', {
      classe: 'sm', onMount: m => {
        $('#fAr', m).onsubmit = async e => {
          e.preventDefault(); const areas = $$('#arA input:checked').map(i => i.value);
          if (!areas.length) return $('#arErr').textContent = 'Escolha pelo menos uma área.';
          try { await DB.rpc('definir_acesso', { p_user: u.user_id, p_papel: u.papel, p_ativo: u.ativo, p_espacos: areas.length === S.espacos.length ? null : areas }); fecharModal(); toast('Áreas atualizadas.'); render(); } catch (err) { $('#arErr').textContent = err.message; }
        };
      }
    });
  },
  togUser: async el => { const { data: u } = await S.sb.from('perfis').select('*').eq('user_id', el.dataset.id).single(); try { await DB.rpc('definir_acesso', { p_user: u.user_id, p_papel: u.papel, p_ativo: el.dataset.v === '1', p_espacos: u.espacos }); toast(el.dataset.v === '1' ? 'Usuário liberado.' : 'Usuário bloqueado.'); } catch (e) { toast(e.message, true); } render(); },
  delConvite: async el => { try { await DB.remove('convites', el.dataset.v, 'email'); toast('Convite removido.'); } catch (e) { toast(e.message, true); } render(); }
});

/* ---------- Importação de Excel (mesmo formato da planilha original) ---------- */
let IMP = null;
CFG.importar = {
  html: () => S.esp === 'todos' ? '<div class="warnbox">Escolha uma área no menu (Casa, Bravus, Bravinhos ou Hub) para importar. Os lançamentos entram só na área escolhida.</div>' : '<div class="card"><h3>Importar lançamentos para: ' + esc(espNome(S.esp)) + '</h3><p class="muted" style="margin:-6px 0 14px">Use o formato da planilha original (aba <b>Base Financeira</b>, com as colunas Empresa, Competência, Vencimento Original, Data de Pagamento, Centro de Custo, Categoria, Despesa, Tipo, Valor e Observações). Linhas vazias e linhas já importadas são ignoradas automaticamente. Nada é gravado antes da sua confirmação.</p>' +
    '<input type="file" id="impF" accept=".xlsx,.xlsm,.xls" class="inp" style="padding:7px"><div id="impR" style="margin-top:16px"></div></div><div class="card" style="margin-top:16px"><h3>Importações anteriores</h3><div id="impH" class="muted">Carregando…</div></div>',
  async mount() {
    if (!$('#impF')) return;
    $('#impF').onchange = async e => { const f = e.target.files[0]; if (!f) return; $('#impR').innerHTML = '<div class="muted">Lendo arquivo…</div>'; try { await carregarXLSX(); IMP = analisarPlanilha(XLSX.read(await f.arrayBuffer(), { cellDates: true }), f.name); mostrarImport(); } catch (err) { $('#impR').innerHTML = '<div class="warnbox">' + esc(err.message) + '</div>'; } };
    const { data } = await S.sb.from('importacoes').select('*').order('criado_em', { ascending: false }).limit(20);
    $('#impH').innerHTML = (data || []).length ? '<table class="tbl static"><thead><tr><th>Data</th><th>Arquivo</th><th class="r">Lidas</th><th class="r">Importadas</th><th class="r">Ignoradas</th><th class="r">Total</th></tr></thead><tbody>' + data.map(i => '<tr><td>' + new Date(i.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' }) + '</td><td>' + esc(i.arquivo) + '</td><td class="r">' + i.lidas + '</td><td class="r">' + i.importadas + '</td><td class="r">' + i.ignoradas + '</td><td class="r num">' + brl(i.total) + '</td></tr>').join('') + '</tbody></table>' : 'Nenhuma importação.';
  }
};
function analisarPlanilha(wb, arquivo) {
  const nomeAba = wb.SheetNames.find(n => norm(n) === 'base financeira') || wb.SheetNames.find(n => { const r = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, range: 0 })[0] || []; return r.some(c => norm(c) === 'despesa'); });
  if (!nomeAba) throw new Error('Não encontrei a aba "Base Financeira" (nem uma aba com a coluna "Despesa").');
  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nomeAba], { header: 1, raw: true, defval: null });
  const cab = (linhas[0] || []).map(norm);
  const col = n => cab.findIndex(c => c === norm(n));
  const ix = { empresa: col('Empresa'), comp: col('Competência'), venc: col('Vencimento Original') >= 0 ? col('Vencimento Original') : col('Vencimento'), pag: col('Data de Pagamento'), cc: col('Centro de Custo'), cat: col('Categoria'), desc: col('Despesa'), tipo: col('Tipo'), valor: col('Valor'), obs: col('Observações') };
  if (ix.desc < 0 || ix.valor < 0 || ix.comp < 0) throw new Error('A aba precisa ter pelo menos as colunas Competência, Despesa e Valor.');
  const iso = v => { if (!v) return null; if (v instanceof Date) return new Date(v.getTime() - v.getTimezoneOffset() * 6e4 + 12 * 3600e3).toISOString().slice(0, 10); if (typeof v === 'number') { const d = XLSX.SSF.parse_date_code(v); return d ? d.y + '-' + String(d.m).padStart(2, '0') + '-' + String(d.d).padStart(2, '0') : null; } const m = String(v).match(/(\d{2})\/(\d{2})\/(\d{4})/); if (m) return m[3] + '-' + m[2] + '-' + m[1]; const m2 = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/); return m2 ? m2[0] : null; };
  const out = { arquivo, aba: nomeAba, vazias: 0, invalidas: [], itens: [], empresas: {} };
  const existentes = new Set(S.lanc.map(l => l.import_ref).filter(Boolean));
  linhas.slice(1).forEach((r, i) => {
    const g = k => ix[k] >= 0 ? r[ix[k]] : null;
    if ([g('empresa'), g('desc'), g('valor')].every(v => v == null || v === '')) { out.vazias++; return; }
    const desc = String(g('desc') || '').trim().replace(/\s+/g, ' '); const comp = iso(g('comp')); const valorBruto = typeof g('valor') === 'number' ? g('valor') : parseValor(g('valor'));
    if (!desc || !comp) { out.invalidas.push({ linha: i + 2, motivo: !desc ? 'sem despesa' : 'competência inválida' }); return; }
    const empresa = String(g('empresa') || '').trim(); const valor = r2(valorBruto || 0); const venc = iso(g('venc')); const pag = iso(g('pag'));
    const cc = String(g('cc') || '').trim() || null;
    const ref = norm(empresa) + '|' + comp.slice(0, 7) + '|' + norm(desc) + '|' + valor.toFixed(2) + '|' + (venc || '');
    const avisos = [];
    if (!valor) avisos.push('valor zero'); if (!venc) avisos.push('sem vencimento'); if (!cc) avisos.push('sem centro de custo');
    if (typeof valorBruto === 'number' && r2(valorBruto) !== valorBruto) avisos.push('valor arredondado (planilha: ' + valorBruto + ')');
    out.empresas[empresa || '(sem empresa)'] = (out.empresas[empresa || '(sem empresa)'] || 0) + 1;
    out.itens.push({ linha: i + 2, empresa, comp: comp.slice(0, 7) + '-01', desc, valor, venc, pag, cc, cat: String(g('cat') || '').trim() || null, tipo: /^fix/i.test(String(g('tipo') || '')) ? 'Fixa' : 'Variável', obs: g('obs') ? String(g('obs')) : null, ref, existe: existentes.has(ref), avisos, resp: cc && /^pessoal - /i.test(cc) ? cc.replace(/^pessoal - /i, '').trim() : null });
  });
  const ativas = new Set(C.lista('empresa').map(c => norm(c.nome)));
  out.selec = new Set(Object.keys(out.empresas).filter(e => ativas.has(norm(e))));
  if (!out.selec.size) Object.keys(out.empresas).forEach(e => out.selec.add(e));
  return out;
}
function mostrarImport() {
  const I = IMP; const sel = I.itens.filter(x => I.selec.has(x.empresa || '(sem empresa)'));
  const novos = sel.filter(x => !x.existe), rep = sel.filter(x => x.existe);
  $('#impR').innerHTML = '<div class="infobox">Aba <b>' + esc(I.aba) + '</b>: ' + I.itens.length + ' lançamento(s) lido(s), ' + I.vazias + ' linha(s) vazia(s) ignorada(s)' + (I.invalidas.length ? ', ' + I.invalidas.length + ' inválida(s) (linhas ' + I.invalidas.slice(0, 8).map(x => x.linha).join(', ') + ')' : '') + '.</div>' +
    '<div class="field"><label>Empresas a importar</label><div class="chips">' + Object.entries(I.empresas).map(([e, n]) => '<button class="chip' + (I.selec.has(e) ? ' on' : '') + '" data-a="impEmp" data-v="' + esc(e) + '">' + esc(e) + ' <span class="c">' + n + '</span></button>').join('') + '</div></div>' +
    '<div class="kpis"><div class="kpi good"><div class="l">Novos (serão importados)</div><div class="v num">' + novos.length + '</div><div class="s">' + brl(soma(novos, x => x.valor)) + '</div></div><div class="kpi"><div class="l">Já existentes (ignorados)</div><div class="v num">' + rep.length + '</div></div><div class="kpi warn"><div class="l">Com avisos para revisar</div><div class="v num">' + novos.filter(x => x.avisos.length).length + '</div></div><div class="kpi"><div class="l">Total selecionado</div><div class="v num">' + brl(soma(sel, x => x.valor)) + '</div></div></div>' +
    (novos.length ? '<div class="tbl-wrap" style="max-height:340px"><table class="tbl static"><thead><tr><th>Linha</th><th>Despesa</th><th>Comp.</th><th>Vencimento</th><th>Pagamento</th><th class="r">Valor</th><th>Avisos</th></tr></thead><tbody>' + novos.map(x => '<tr><td>' + x.linha + '</td><td>' + esc(x.desc) + '</td><td>' + mesCurto(x.comp.slice(0, 7)) + '</td><td>' + (ddmmaa(x.venc) || '—') + '</td><td>' + (ddmmaa(x.pag) || '—') + '</td><td class="r num">' + brl(x.valor) + '</td><td style="color:var(--warn);font-size:12px">' + esc(x.avisos.join('; ')) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div class="mf" style="margin-top:12px"><button class="btn pri" data-a="impOk">Importar ' + novos.length + ' lançamento(s)</button></div>' : '<div class="empty"><b>Nada novo para importar</b>Todos os lançamentos selecionados já existem no sistema.</div>');
}
async function garantirCad(tipo, nome, extra) {
  if (!nome) return null; let c = S.cad.find(x => x.tipo === tipo && norm(x.nome) === norm(nome));
  if (!c) { [c] = await DB.insert('cadastros', Object.assign({ tipo, nome: nome.trim(), ordem: S.cad.filter(x => x.tipo === tipo).length }, extra || {})); S.cad.push(c); }
  return c.id;
}
Object.assign(ACTIONS, {
  impEmp: el => { const e = el.dataset.v; IMP.selec.has(e) ? IMP.selec.delete(e) : IMP.selec.add(e); mostrarImport(); },
  impOk: async el => {
    const novos = IMP.itens.filter(x => IMP.selec.has(x.empresa || '(sem empresa)') && !x.existe);
    if (!await confirmar('Confirmar importação?', 'Serão importados <b>' + novos.length + '</b> lançamento(s), somando <b>' + brl(soma(novos, x => x.valor)) + '</b>. Cadastros que não existirem serão criados.', 'Importar', false)) return;
    el.disabled = true; busy(true);
    try {
      const rows = [];
      for (const x of novos) {
        rows.push({ competencia: x.comp, descricao: x.desc, valor: x.valor, vencimento: x.venc, pagamento: x.pag, observacoes: x.obs, revisar: x.avisos.join('; ') || null, origem: 'importacao', import_ref: x.ref,
          empresa_id: await garantirCad('empresa', x.empresa), centro_custo_id: await garantirCad('centro_custo', x.cc), categoria_id: await garantirCad('categoria', x.cat),
          tipo_id: await garantirCad('tipo_despesa', x.tipo, { natureza: x.tipo === 'Fixa' ? 'fixa' : 'variavel' }), responsavel_id: await garantirCad('responsavel', x.resp) });
      }
      let n = 0; for (let i = 0; i < rows.length; i += 200) { n += (await DB.insert('lancamentos', rows.slice(i, i + 200))).length; }
      await DB.insert('importacoes', { arquivo: IMP.arquivo, lidas: IMP.itens.length + IMP.vazias + IMP.invalidas.length, importadas: n, ignoradas: IMP.itens.length + IMP.vazias + IMP.invalidas.length - n, total: r2(soma(novos, x => x.valor)), resumo: { aba: IMP.aba, empresas: [...IMP.selec], vazias: IMP.vazias, invalidas: IMP.invalidas } });
      IMP = null; await carregarTudo(); render(); toast(n + ' lançamento(s) importado(s).');
    } catch (e) { toast(e.message, true); el.disabled = false; } finally { busy(false); }
  }
});

/* ---------- Lixeira ---------- */
const LIX = [['lancamentos', 'Contas', x => x.descricao + ' · ' + mesCurto(mesKey(x.competencia)) + ' · ' + brl(x.valor)], ['recorrentes', 'Recorrentes', x => x.descricao + ' · ' + brl(x.valor)], ['metas', 'Metas', x => x.nome + ' · ' + brl(x.valor_meta)], ['aportes', 'Aportes', x => x.descricao + ' · ' + brl(x.valor)]];
CFG.lixeira = {
  html: () => '<div class="infobox"><b>' + esc(S.esp === 'todos' ? 'Todas as áreas' : espNome(S.esp)) + ':</b> itens excluídos ficam aqui e não entram em nenhum total. Restaure se foi engano. A exclusão definitiva não pode ser desfeita.</div><div id="lix" class="muted">Carregando…</div>',
  async mount() {
    let res = await Promise.all(LIX.map(([t]) => DB.all(t, { mortos: true, order: 'excluido_em', desc: true })));
    if (S.esp !== 'todos') {
      const metasArea = new Set(S.A.metas.filter(m => m.espaco_id === S.esp).map(m => m.id).concat(res[2].filter(m => m.espaco_id === S.esp).map(m => m.id)));
      res = res.map((lista, i) => LIX[i][0] === 'aportes' ? lista.filter(a => metasArea.has(a.meta_id)) : lista.filter(x => x.espaco_id === S.esp));
    }
    const html = LIX.map(([t, nome, fmt], i) => res[i].length ? '<h3 style="font-size:14px;margin:16px 0 8px">' + nome + ' (' + res[i].length + ')</h3><div class="tbl-wrap"><table class="tbl static"><tbody>' + res[i].map(x => '<tr><td>' + esc(fmt(x)) + '</td><td class="muted" style="font-size:12.5px">excluído em ' + new Date(x.excluido_em).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' }) + '</td><td class="acts"><button class="btn xs" data-a="lixRest" data-t="' + t + '" data-id="' + x.id + '">Restaurar</button> <button class="btn xs danger" data-a="lixDel" data-t="' + t + '" data-id="' + x.id + '">Excluir definitivamente</button></td></tr>').join('') + '</tbody></table></div>' : '').join('');
    $('#lix').innerHTML = html || '<div class="empty"><b>Lixeira vazia</b></div>';
  }
};
Object.assign(ACTIONS, {
  lixRest: el => act(() => DB.update(el.dataset.t, el.dataset.id, { excluido_em: null }), 'Item restaurado.', el),
  lixDel: async el => { if (await confirmar('Excluir definitivamente?', 'Esta ação não pode ser desfeita. O registro continua apenas no histórico de alterações.', 'Excluir definitivamente')) act(() => DB.remove(el.dataset.t, el.dataset.id), 'Excluído definitivamente.'); }
});

/* ---------- Histórico ---------- */
CFG.historico = {
  html: () => '<div class="filters"><select class="inp sm" id="hT">' + optsTxt([['', 'Tudo'], ['lancamentos', 'Contas'], ['recorrentes', 'Recorrentes'], ['metas', 'Metas'], ['aportes', 'Aportes'], ['cadastros', 'Cadastros'], ['perfis', 'Usuários']], '') + '</select></div><div class="tbl-wrap"><div id="hist" class="muted" style="padding:16px">Carregando…</div></div>',
  async mount() {
    const load = async () => {
      let q = S.sb.from('auditoria').select('*').order('quando', { ascending: false }).limit(300); if ($('#hT').value) q = q.eq('tabela', $('#hT').value);
      if (S.esp !== 'todos') q = q.eq('espaco_id', S.esp);
      const { data, error } = await q; if (error) return $('#hist').textContent = traduz(error).message;
      const nomeReg = a => { const o = a.depois || a.antes || {}; return o.descricao || o.nome || o.email || ''; };
      $('#hist').outerHTML = '<table class="tbl static" id="hist"><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Registro</th><th>Detalhe</th></tr></thead><tbody>' + data.map(a => '<tr><td style="white-space:nowrap">' + new Date(a.quando).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' }) + '</td><td>' + esc(a.usuario_nome) + '</td><td>' + esc(a.acao) + '</td><td>' + esc(nomeReg(a)) + ' <small class="muted">(' + esc(a.tabela) + ')</small></td><td style="font-size:12.5px;color:var(--muted)">' + resumoMudanca(a).replace(/^: /, '') + '</td></tr>').join('') + '</tbody></table>';
    };
    $('#hT').onchange = () => { const t = $('#hist'); if (t) t.outerHTML = '<div id="hist" class="muted" style="padding:16px">Carregando…</div>'; load(); };
    load();
  }
};

/* ---------- Backup ---------- */
CFG.backup = {
  html: () => '<div class="cards"><div class="card c6"><h3>Baixar backup completo</h3><p class="muted" style="margin:-6px 0 14px">Gera um arquivo Excel com todas as tabelas do sistema (contas, recorrentes, metas, aportes, cadastros e lixeira). Guarde em local seguro.</p><button class="btn pri" data-a="backupXls">' + ic('baixar') + 'Baixar backup (.xlsx)</button></div>' +
    '<div class="card c6"><h3>Backup automático</h3><p class="muted" style="margin:-6px 0 0;font-size:13.5px">Uma rotina automática copia o banco toda semana para um repositório privado do GitHub (<b>groupbrv/casa-backup</b>), mantendo o histórico de cópias. A mesma rotina mantém o banco ativo diariamente.</p></div></div>'
};
ACTIONS.backupXls = async el => {
  el.disabled = true; busy(true);
  try {
    const nomeCad = id => C.nome(id);
    const [lanc, rec, metas, aportes] = await Promise.all(['lancamentos', 'recorrentes', 'metas', 'aportes'].map(t => DB.all(t)));
    const C2 = id => (S.A.cad.find(c => c.id === id) || {}).nome || '';
    const L = lanc.map(l => ({ 'Área': espNome(l.espaco_id), Empresa: C2(l.empresa_id), 'Competência': mesKey(l.competencia), Vencimento: l.vencimento, 'Data de Pagamento': l.pagamento, 'Centro de Custo': C2(l.centro_custo_id), Categoria: C2(l.categoria_id), Despesa: l.descricao, Tipo: C2(l.tipo_id), Valor: +l.valor, 'Valor Pago': l.valor_pago != null ? +l.valor_pago : null, Status: st(l).t, 'Responsável': C2(l.responsavel_id), 'Observações': l.observacoes, Cancelada: l.cancelado ? 'sim' : '', 'Na lixeira': l.excluido_em ? 'sim' : '', ID: l.id }));
    await exportarExcel('BRV360 - backup ' + S.hoje, [['Base Financeira', L], ['Recorrentes', rec.map(r => ({ 'Área': espNome(r.espaco_id), Despesa: r.descricao, Valor: +r.valor, Dia: r.dia_vencimento, 'Início': mesKey(r.inicio), Fim: r.fim ? mesKey(r.fim) : '', Ativa: r.ativo ? 'sim' : 'não', Categoria: nomeCad(r.categoria_id), 'Responsável': nomeCad(r.responsavel_id), ID: r.id }))],
      ['Metas', metas.map(m => ({ 'Área': espNome(m.espaco_id), Meta: m.nome, Valor: +m.valor_meta, 'Data limite': m.data_limite, Ativa: m.ativo ? 'sim' : 'não', ID: m.id }))], ['Aportes', aportes.map(a => ({ Meta: (metas.find(m => m.id === a.meta_id) || {}).nome, Data: a.data, 'Descrição': a.descricao, Valor: +a.valor, ID: a.id }))],
      ['Cadastros', S.A.cad.map(c => ({ 'Área': espNome(c.espaco_id), Tipo: c.tipo, Nome: c.nome, Ativo: c.ativo ? 'sim' : 'não', ID: c.id }))]]);
  } catch (e) { toast(e.message, true); } finally { el.disabled = false; busy(false); }
};
