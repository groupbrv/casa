/* CASA • páginas principais */
'use strict';

/* ===================== Formulários de conta ===================== */
function formConta(l, base) {
  if (!podeEditar()) return toast('Seu acesso é somente leitura.', true);
  const novo = !l; l = l || Object.assign({ competencia: (S.ui.mes || mesKey(S.hoje)) + '-01', tipo_id: (C.lista('tipo_despesa').find(t => t.natureza === 'variavel') || {}).id, empresa_id: (C.lista('empresa')[0] || {}).id }, base || {});
  const sug = uniq(S.lanc.map(x => x.descricao).concat(S.rec.map(r => r.descricao))).sort();
  const pago = !!l.pagamento;
  const corpo = '<form id="fC">' +
    '<div class="field"><label>Nome da despesa *</label><input class="inp" id="cD" list="sugD" value="' + esc(l.descricao || '') + '" required maxlength="120" placeholder="Ex.: Conta de luz - Casa"><datalist id="sugD">' + sug.map(s => '<option value="' + esc(s) + '">').join('') + '</datalist></div>' +
    '<div class="grid3"><div class="field"><label>Valor *</label><input class="inp num" id="cV" inputmode="decimal" value="' + valorInput(l.valor) + '" placeholder="0,00" required></div>' +
    '<div class="field"><label>Competência *</label><input class="inp" id="cM" type="month" value="' + mesKey(l.competencia) + '" required><span class="hint">Mês a que a despesa pertence</span></div>' +
    '<div class="field"><label>Vencimento</label><input class="inp" id="cVc" type="date" value="' + esc(l.vencimento || '') + '"><span class="hint">Data limite para pagar</span></div></div>' +
    '<div class="grid2"><div class="field"><label>Categoria</label><select class="inp" id="cCat">' + opts(C.lista('categoria', l.categoria_id), l.categoria_id) + '</select></div>' +
    '<div class="field"><label>Responsável</label><select class="inp" id="cR">' + opts(C.lista('responsavel', l.responsavel_id), l.responsavel_id) + '</select></div></div>' +
    '<div class="grid3"><div class="field"><label>Centro de custo</label><select class="inp" id="cCC">' + opts(C.lista('centro_custo', l.centro_custo_id), l.centro_custo_id) + '</select></div>' +
    '<div class="field"><label>Empresa</label><select class="inp" id="cE">' + opts(C.lista('empresa', l.empresa_id), l.empresa_id) + '</select></div>' +
    '<div class="field"><label>Tipo</label><select class="inp" id="cT">' + opts(C.lista('tipo_despesa', l.tipo_id), l.tipo_id) + '</select></div></div>' +
    '<div class="box"><div class="hd"><span>Já foi paga?</span><button type="button" class="tg' + (pago ? ' on' : '') + '" id="cPg" aria-label="Paga"></button></div>' +
    '<div class="grid2" id="cPw"' + (pago ? '' : ' hidden') + ' style="margin-top:10px"><div class="field"><label>Data do pagamento</label><input class="inp" id="cP" type="date" value="' + esc(l.pagamento || S.hoje) + '"></div><div class="field"><label>Valor efetivamente pago</label><input class="inp num" id="cVP" inputmode="decimal" value="' + valorInput(l.valor_pago != null ? l.valor_pago : '') + '" placeholder="igual ao valor"></div></div></div>' +
    '<div class="field"><label>Observações</label><textarea class="inp" id="cO" maxlength="1000">' + esc(l.observacoes || '') + '</textarea></div>' +
    (l.revisar ? '<div class="warnbox"><b>Revisar:</b> ' + esc(l.revisar) + ' <label style="display:inline-flex;gap:6px;align-items:center;margin-left:8px"><input type="checkbox" id="cRv"> marcar como revisado</label></div>' : '') +
    '<div class="err" id="cErr"></div>' +
    '<div class="mf"><button type="button" class="btn" data-a="fechar">Cancelar</button><button class="btn pri" id="cS">' + (novo ? 'Cadastrar conta' : 'Salvar alterações') + '</button></div></form>';
  abrirModal(novo ? 'Nova conta' : 'Editar conta', corpo, {
    onMount: m => {
      $('#cPg', m).onclick = function () { this.classList.toggle('on'); $('#cPw').hidden = !this.classList.contains('on'); };
      $('#cD', m).addEventListener('change', () => {
        const d = $('#cD').value; const ref = S.rec.find(r => r.descricao === d) || [...S.lanc].reverse().find(x => x.descricao === d);
        if (!ref) return;
        [['cCat', 'categoria_id'], ['cR', 'responsavel_id'], ['cCC', 'centro_custo_id'], ['cE', 'empresa_id'], ['cT', 'tipo_id']].forEach(([id, k]) => { if (!$('#' + id).value && ref[k]) $('#' + id).value = ref[k]; });
        if (!$('#cV').value && ref.valor) $('#cV').value = valorInput(ref.valor);
      });
      $('#fC', m).onsubmit = async e => {
        e.preventDefault();
        const row = {
          descricao: $('#cD').value.trim(), valor: parseValor($('#cV').value), competencia: $('#cM').value + '-01', vencimento: $('#cVc').value || null,
          categoria_id: $('#cCat').value || null, responsavel_id: $('#cR').value || null, centro_custo_id: $('#cCC').value || null,
          empresa_id: $('#cE').value || null, tipo_id: $('#cT').value || null, observacoes: $('#cO').value.trim() || null
        };
        if ($('#cPg').classList.contains('on')) { row.pagamento = $('#cP').value || S.hoje; row.valor_pago = $('#cVP').value ? parseValor($('#cVP').value) : row.valor; }
        else { row.pagamento = null; row.valor_pago = null; }
        if ($('#cRv') && $('#cRv').checked) row.revisar = null;
        if (!row.descricao) return $('#cErr').textContent = 'Informe o nome da despesa.';
        if (!$('#cM').value) return $('#cErr').textContent = 'Informe a competência.';
        if (row.valor < 0) return $('#cErr').textContent = 'O valor não pode ser negativo.';
        // Duplicidade acidental (aviso amigável antes do bloqueio do banco)
        const dup = S.lanc.find(x => x.id !== l.id && !x.cancelado && norm(x.descricao) === norm(row.descricao) && x.competencia === row.competencia && +x.valor === row.valor && (x.vencimento || '') === (row.vencimento || ''));
        if (dup) return $('#cErr').textContent = 'Já existe "' + dup.descricao + '" neste mês com o mesmo valor e vencimento. Para evitar duplicidade, edite a conta existente.';
        const parecida = novo && S.lanc.find(x => !x.cancelado && norm(x.descricao) === norm(row.descricao) && x.competencia === row.competencia);
        if (parecida && !$('#fC').dataset.ok) { $('#fC').dataset.ok = 1; return $('#cErr').innerHTML = 'Atenção: já existe "' + esc(parecida.descricao) + '" em ' + mesLabel(mesKey(row.competencia)) + ' (' + brl(parecida.valor) + '). Clique de novo em “Cadastrar” para confirmar.'; }
        try {
          await act(() => novo ? DB.insert('lancamentos', row) : DB.update('lancamentos', l.id, row), novo ? 'Conta cadastrada.' : 'Conta atualizada.', $('#cS'));
          fecharModal();
        } catch (err) { $('#cErr').textContent = err.message; }
      };
    }
  });
}

function modalPagar(l) {
  if (!podeEditar()) return toast('Seu acesso é somente leitura.', true);
  abrirModal('Marcar como paga', '<p style="margin:0 0 14px"><b>' + esc(l.descricao) + '</b><br><span class="muted">' + mesTitulo(mesKey(l.competencia)) + (l.vencimento ? ' · vence ' + ddmmaa(l.vencimento) : '') + ' · valor original ' + brl(l.valor) + '</span></p>' +
    '<form id="fP"><div class="grid2"><div class="field"><label>Data do pagamento</label><input class="inp" id="pD" type="date" value="' + S.hoje + '" max="' + addDias(S.hoje, 365) + '" required></div>' +
    '<div class="field"><label>Valor efetivamente pago</label><input class="inp num" id="pV" inputmode="decimal" value="' + valorInput(l.valor) + '" required></div></div>' +
    '<div id="pInfo" class="infobox" hidden></div><div class="err" id="pErr"></div>' +
    '<div class="mf"><button type="button" class="btn" data-a="fechar">Cancelar</button><button class="btn good" id="pS">Confirmar pagamento</button></div></form>', {
    classe: 'sm', onMount: m => {
      const info = () => {
        const d = $('#pD').value, v = parseValor($('#pV').value), box = $('#pInfo'); const msgs = [];
        if (l.vencimento && d > l.vencimento) msgs.push('Pagamento com atraso de ' + dias(d, l.vencimento) + ' dia(s).');
        if (d > S.hoje) msgs.push('Data futura: a conta fica como agendada até ' + ddmmaa(d) + '.');
        if (v !== +l.valor) msgs.push('Diferença em relação ao valor original: ' + (v > l.valor ? '+' : '−') + brl(Math.abs(v - l.valor)) + '.');
        box.hidden = !msgs.length; box.innerHTML = msgs.join('<br>');
      };
      $('#pD', m).oninput = info; $('#pV', m).oninput = info; info();
      $('#fP', m).onsubmit = async e => {
        e.preventDefault();
        try { await act(() => DB.update('lancamentos', l.id, { pagamento: $('#pD').value, valor_pago: parseValor($('#pV').value) }), 'Pagamento registrado.', $('#pS')); fecharModal(); }
        catch (err) { $('#pErr').textContent = err.message; }
      };
    }
  });
}

function modalAgendar(l) {
  if (!podeEditar()) return toast('Seu acesso é somente leitura.', true);
  abrirModal('Agendar pagamento', '<p style="margin:0 0 14px"><b>' + esc(l.descricao) + '</b> · ' + brl(l.valor) + '</p><form id="fAg"><div class="field"><label>Pagamento agendado para</label><input class="inp" id="agD" type="date" value="' + esc(l.agendado_para || l.vencimento || S.hoje) + '" required></div>' +
    '<div class="infobox">A conta sai das pendentes e vai para “Agendadas”. Quando o pagamento acontecer, use “Marcar como paga”.</div><div class="err" id="agErr"></div>' +
    '<div class="mf">' + (l.agendado_para ? '<button type="button" class="btn danger" id="agX">Remover agendamento</button><span class="grow"></span>' : '') + '<button type="button" class="btn" data-a="fechar">Cancelar</button><button class="btn pri" id="agS">Agendar</button></div></form>', {
    classe: 'sm', onMount: m => {
      $('#fAg', m).onsubmit = async e => { e.preventDefault(); try { await act(() => DB.update('lancamentos', l.id, { agendado_para: $('#agD').value }), 'Pagamento agendado.', $('#agS')); fecharModal(); } catch (err) { $('#agErr').textContent = err.message; } };
      const x = $('#agX', m); if (x) x.onclick = async () => { await act(() => DB.update('lancamentos', l.id, { agendado_para: null }), 'Agendamento removido.', x); fecharModal(); };
    }
  });
}

function modalCancelar(l) {
  if (!podeEditar()) return toast('Seu acesso é somente leitura.', true);
  abrirModal('Cancelar conta', '<p style="margin:0 0 12px">A conta <b>' + esc(l.descricao) + '</b> continua no histórico, mas deixa de entrar nos totais e nas pendências.</p><form id="fCx"><div class="field"><label>Motivo (opcional)</label><input class="inp" id="cxM" maxlength="200" placeholder="Ex.: serviço cancelado"></div>' +
    '<div class="mf"><button type="button" class="btn" data-a="fechar">Voltar</button><button class="btn danger solid" id="cxS">Cancelar conta</button></div></form>', {
    classe: 'sm', onMount: m => { $('#fCx', m).onsubmit = async e => { e.preventDefault(); await act(() => DB.update('lancamentos', l.id, { cancelado: true, motivo_cancelamento: $('#cxM').value.trim() || null }), 'Conta cancelada.', $('#cxS')); fecharModal(); }; }
  });
}

async function excluirConta(l) {
  if (!podeEditar()) return toast('Seu acesso é somente leitura.', true);
  if (!await confirmar('Excluir conta?', '<b>' + esc(l.descricao) + '</b> (' + brl(l.valor) + ') vai para a <b>Lixeira</b>. Um administrador pode restaurar depois em Configurações → Lixeira.', 'Enviar para a lixeira')) return;
  await act(() => DB.update('lancamentos', l.id, { excluido_em: new Date().toISOString() }), null);
  toast('Conta enviada para a lixeira.', false, 'Desfazer', () => act(() => DB.update('lancamentos', l.id, { excluido_em: null }), 'Conta restaurada.'));
}

function acoesConta(l) {
  const s = st(l), itens = [{ t: 'Ver detalhes', f: () => detalhesConta(l) }];
  if (podeEditar()) {
    itens.push({ t: 'Editar', f: () => formConta(l) });
    if (s.k !== 'paga' && s.k !== 'cancelada') itens.push({ t: 'Marcar como paga', f: () => modalPagar(l) }, { t: l.agendado_para ? 'Alterar agendamento' : 'Agendar pagamento', f: () => modalAgendar(l) });
    if (l.pagamento) itens.push({ t: 'Desfazer pagamento', f: () => act(() => DB.update('lancamentos', l.id, { pagamento: null }), 'Pagamento desfeito.') });
    itens.push({ t: 'Duplicar para outro mês', f: () => formConta(null, { descricao: l.descricao, valor: l.valor, categoria_id: l.categoria_id, responsavel_id: l.responsavel_id, centro_custo_id: l.centro_custo_id, empresa_id: l.empresa_id, tipo_id: l.tipo_id, competencia: addMes(mesKey(l.competencia), 1) + '-01', vencimento: l.vencimento ? addMes(mesKey(l.vencimento), 1) + l.vencimento.slice(7) : null }) });
    itens.push('-');
    itens.push(l.cancelado ? { t: 'Reativar conta', f: () => act(() => DB.update('lancamentos', l.id, { cancelado: false }), 'Conta reativada.') } : { t: 'Cancelar conta', f: () => modalCancelar(l) });
    itens.push({ t: 'Excluir', d: true, f: () => excluirConta(l) });
  }
  return itens;
}

async function detalhesConta(l) {
  const s = st(l);
  const linha = (k, v) => v ? '<dt>' + k + '</dt><dd>' + v + '</dd>' : '';
  const corpo = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' + pill(l) + diasTxt(l) + '</div>' +
    '<div class="kpi" style="box-shadow:none;margin:10px 0 16px"><div class="l">Valor original</div><div class="v num">' + brl(l.valor) + '</div>' + (ehPaga(l) ? '<div class="s">Pago: <b>' + brl(valorEfetivo(l)) + '</b>' + (+valorEfetivo(l) !== +l.valor ? ' (' + (valorEfetivo(l) > l.valor ? '+' : '−') + brl(Math.abs(valorEfetivo(l) - l.valor)) + ')' : '') + '</div>' : '') + '</div>' +
    '<dl class="dl">' + linha('Competência', mesTitulo(mesKey(l.competencia))) + linha('Vencimento', ddmmaa(l.vencimento) || '—') + linha('Pagamento', l.pagamento ? ddmmaa(l.pagamento) : '—') +
    linha('Agendado para', l.agendado_para && ddmmaa(l.agendado_para)) + linha('Categoria', esc(C.nome(l.categoria_id)) || '—') + linha('Responsável', esc(C.nome(l.responsavel_id)) || '—') +
    linha('Centro de custo', esc(C.nome(l.centro_custo_id)) || '—') + linha('Empresa', esc(C.nome(l.empresa_id))) + linha('Tipo', esc(C.nome(l.tipo_id))) +
    linha('Origem', { manual: 'Cadastro manual', importacao: 'Importada da planilha', recorrencia: 'Gerada por conta recorrente' }[l.origem]) +
    linha('Cancelamento', l.cancelado ? 'Cancelada' + (l.motivo_cancelamento ? ': ' + esc(l.motivo_cancelamento) : '') : '') +
    linha('Observações', esc(l.observacoes)) + linha('Revisar', l.revisar && '<span style="color:var(--warn)">' + esc(l.revisar) + '</span>') + '</dl>' +
    (podeEditar() ? '<div class="mf" style="justify-content:flex-start;margin-bottom:18px">' + (s.k !== 'paga' && s.k !== 'cancelada' ? '<button class="btn good sm" id="dPg">Marcar como paga</button>' : '') + '<button class="btn sm" id="dEd">Editar</button><button class="btn sm icon" id="dMais" aria-label="Mais ações">' + ic('dots') + '</button></div>' : '') +
    '<h3 style="font-size:14px;margin:0 0 10px">Histórico de alterações</h3><div id="dHist" class="muted">Carregando…</div>';
  abrirModal(esc(l.descricao), corpo, {
    classe: 'drawer', onMount: async m => {
      const pg = $('#dPg', m); if (pg) pg.onclick = () => modalPagar(l);
      const ed = $('#dEd', m); if (ed) ed.onclick = () => formConta(l);
      const mais = $('#dMais', m); if (mais) mais.onclick = e => { e.stopPropagation(); abrirMenu(mais, acoesConta(l).filter(i => i === '-' || !/detalhes|Editar|Marcar como paga/.test(i.t))); };
      try {
        const { data, error } = await S.sb.from('auditoria').select('*').eq('tabela', 'lancamentos').eq('registro_id', l.id).order('quando', { ascending: false }).limit(50);
        if (error) throw error;
        $('#dHist').innerHTML = data.length ? '<div class="timeline">' + data.map(a => '<div class="ev"><b>' + esc(a.usuario_nome) + '</b> ' + esc(a.acao) + resumoMudanca(a) + '<small>' + new Date(a.quando).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' }) + '</small></div>').join('') + '</div>' : 'Sem alterações registradas.';
      } catch (e) { $('#dHist').textContent = 'Não foi possível carregar o histórico.'; }
    }
  });
}
const CAMPOS = { descricao: 'despesa', valor: 'valor', vencimento: 'vencimento', pagamento: 'pagamento', valor_pago: 'valor pago', competencia: 'competência', categoria_id: 'categoria', responsavel_id: 'responsável', centro_custo_id: 'centro de custo', tipo_id: 'tipo', empresa_id: 'empresa', observacoes: 'observações', agendado_para: 'agendamento', revisar: 'aviso de revisão', motivo_cancelamento: 'motivo' };
function resumoMudanca(a) {
  if (!a.antes || !a.depois) return '';
  const fmt = (k, v) => v == null || v === '' ? '—' : /_id$/.test(k) ? C.nome(v) || '—' : /valor/.test(k) ? brl(v) : /^\d{4}-\d{2}-\d{2}/.test(v) ? ddmmaa(String(v).slice(0, 10)) : String(v);
  const ch = Object.keys(CAMPOS).filter(k => JSON.stringify(a.antes[k] ?? null) !== JSON.stringify(a.depois[k] ?? null));
  if (!ch.length || /marcou|desfez|cancelou|reativou|lixeira|restaurou/.test(a.acao) && ch.length <= 2) return '';
  return ': ' + ch.slice(0, 4).map(k => CAMPOS[k] + ' ' + esc(fmt(k, a.antes[k])) + ' → ' + esc(fmt(k, a.depois[k]))).join('; ');
}

/* ===================== Dashboard ===================== */
PAGES.painel = {
  html() {
    const f = S.ui.dash; const mes = S.ui.mes;
    const base = filtrarLanc(S.lanc, { responsavel: f.responsavel, centro: f.centro, categoria: f.categoria });
    const doMes = f.todos ? base : base.filter(l => mesKey(l.competencia) === mes);
    const r = resumo(doMes); const vivos = doMes.filter(l => !l.cancelado);
    const ant = resumo(base.filter(l => mesKey(l.competencia) === addMes(mes, -1)));
    const meses = []; for (let i = 11; i >= 0; i--) meses.push(addMes(mes, -i));
    const delta = !f.todos && ant.total > 0 ? (r.total - ant.total) : null;
    const fx = soma(vivos.filter(l => natureza(l) === 'fixa'), l => +l.valor), vr = r.total - fx;
    const kpi = (cls, l, v, s, act) => '<div class="kpi ' + cls + (act ? ' click" data-a="' + act + '"' : '"') + '><div class="l">' + l + '</div><div class="v num">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>';
    const filtros = '<div class="filters"><span class="lbl">Filtros</span>' + mesNav(mes) +
      '<select class="inp sm" data-f="todos"><option value="">Só o mês</option><option value="1"' + (f.todos ? ' selected' : '') + '>Todas as competências</option></select>' +
      '<select class="inp sm" data-f="responsavel">' + opts(C.lista('responsavel', f.responsavel), f.responsavel, 'Todos os responsáveis') + '</select>' +
      '<select class="inp sm" data-f="centro">' + opts(C.lista('centro_custo', f.centro), f.centro, 'Todos os centros de custo') + '</select>' +
      '<select class="inp sm" data-f="categoria">' + opts(C.lista('categoria', f.categoria), f.categoria, 'Todas as categorias') + '</select>' +
      (f.responsavel || f.centro || f.categoria || f.todos ? '<button class="btn sm ghost" data-a="dashLimpar">Limpar</button>' : '') + '</div>';
    const semDados = !vivos.length;
    return pageHead('Dashboard', f.todos ? 'Todas as competências' : mesTitulo(mes), podeEditar() ? '<button class="btn pri" data-a="novaConta">' + ic('mais') + 'Nova conta</button>' : '') + filtros +
      (semDados && !f.todos && podeEditar() && fixasFaltando(mes).length ? '<div class="infobox" style="display:flex;align-items:center;gap:10px"><span style="flex:1">Nenhuma conta lançada em ' + mesLabel(mes) + '. Há <b>' + fixasFaltando(mes).length + ' contas recorrentes</b> prontas para gerar.</span><button class="btn sm pri" data-a="gerarMes">Gerar contas do mês</button></div>' : '') +
      '<div class="kpis">' +
      kpi('', 'Total de despesas', brl(r.total), delta == null ? r.qtd + ' contas' : (delta >= 0 ? '▲ ' : '▼ ') + brl(Math.abs(delta)) + ' vs. mês anterior') +
      kpi('good', '<i style="background:var(--good)"></i>Contas pagas', brl(r.pago), pct(r.pago, r.total) + '% do total', 'irPagas') +
      kpi('', '<i style="background:#C5CEDB"></i>Em aberto', brl(r.aberto), r.qPend + ' conta(s) pendente(s)', 'irApagar') +
      kpi(r.atrasado ? 'crit' : '', '<i style="background:var(--crit)"></i>Atrasadas', brl(r.atrasado), vivos.filter(l => st(l).k === 'atrasada').length + ' conta(s)', 'irApagar') +
      kpi(r.semana ? 'warn' : '', '<i style="background:var(--warn)"></i>Próximos 7 dias', brl(r.semana), 'vencem até ' + dd(addDias(S.hoje, 7))) +
      kpi('', '% pago', pct(r.pago, r.total) + '%', '<div class="split" style="margin:6px 0 0;height:6px"><i style="width:' + pct(r.pago, r.total) + '%;background:var(--good)"></i></div>') +
      kpi('', 'Contas pendentes', String(r.qPend), r.agendado ? brl(r.agendado) + ' agendados' : 'inclui agendadas') +
      kpi('', 'Valor comprometido', brl(r.comprometido), 'valor pago efetivo + em aberto') + '</div>' +
      '<div class="cards">' +
      '<div class="card c6"><h3>Despesas por categoria<span class="r">' + (f.todos ? 'total' : mesCurto(mes)) + '</span></h3>' + hbars(agrupar(vivos, l => C.nome(l.categoria_id)), r.total) + '</div>' +
      '<div class="card c6"><h3>Despesas por centro de custo</h3>' + hbars(agrupar(vivos, l => C.nome(l.centro_custo_id)), r.total) + '</div>' +
      '<div class="card c8"><h3>Comparativo entre meses<span class="r">últimos 12 meses</span></h3>' + colunas(meses.map(k => ({ rot: MES3[+k.slice(5) - 1], tip: mesTitulo(k), on: k === mes, dim: k !== mes, act: 'irMes', v: k, vals: [resumo(base.filter(l => mesKey(l.competencia) === k)).total] })), [{ k: 'a', nome: 'Total' }]) + '</div>' +
      '<div class="card c4"><h3>Fixas × variáveis</h3>' + (r.total ? '<div class="split"><i style="width:' + pct(fx, r.total) + '%;background:var(--chart)"></i><i style="width:' + (100 - pct(fx, r.total)) + '%;background:var(--chart-2)"></i></div><div class="stat2"><div><span class="l"><i style="background:var(--chart)"></i>Fixas · ' + pct(fx, r.total) + '%</span><b class="num">' + brl(fx) + '</b></div><div><span class="l"><i style="background:var(--chart-2)"></i>Variáveis · ' + pct(vr, r.total) + '%</span><b class="num">' + brl(vr) + '</b></div></div>' : '<div class="empty">Sem dados.</div>') + '</div>' +
      '<div class="card c12"><h3>Evolução dos pagamentos<span class="r">últimos 6 meses · situação atual</span></h3>' + colunas(meses.slice(6).map(k => { const x = resumo(base.filter(l => mesKey(l.competencia) === k)); return { rot: MES3[+k.slice(5) - 1], tip: mesTitulo(k), on: k === mes, act: 'irMes', v: k, vals: [x.pago, x.aberto - x.atrasado, x.atrasado] }; }), [{ k: 'paid', nome: 'Pago' }, { k: 'open', nome: 'Em aberto' }, { k: 'late', nome: 'Atrasado' }]) + '</div>' +
      '</div>';
  },
  mount() {
    $$('[data-f]').forEach(s => s.onchange = () => { S.ui.dash[s.dataset.f] = s.value; render(); });
  }
};
Object.assign(ACTIONS, {
  dashLimpar: () => { S.ui.dash = {}; render(); },
  irMes: el => { S.ui.mes = el.dataset.v; S.ui.dash.todos = ''; render(); },
  irPagas: () => { S.ui.pagas.periodo = 'mes'; location.hash = '#/pagas'; },
  irApagar: () => { location.hash = '#/apagar'; },
  novaConta: () => formConta(null),
  gerarMes: el => act(() => DB.rpc('gerar_recorrentes', { p_inicio: S.ui.mes + '-01', p_meses: 1 }), n => n + ' conta(s) gerada(s) para ' + mesLabel(S.ui.mes) + '.', el)
});
function fixasFaltando(mes) {
  const tem = new Set(S.lanc.filter(l => mesKey(l.competencia) === mes && l.recorrente_id).map(l => l.recorrente_id));
  return S.rec.filter(r => r.ativo && r.inicio.slice(0, 7) <= mes && (!r.fim || r.fim.slice(0, 7) >= mes) && !tem.has(r.id));
}

/* ===================== Contas e despesas ===================== */
const STATUS_FILTRO = [['', 'Todos os status'], ['abertas', 'Pendentes (todas)'], ['atrasada', 'Atrasadas'], ['agendada', 'Agendadas'], ['paga', 'Pagas'], ['cancelada', 'Canceladas'], ['revisar', 'Para revisar']];
function passaStatus(l, s) {
  if (!s) return true; const k = st(l).k;
  if (s === 'abertas') return ehAberta(l);
  if (s === 'revisar') return !!l.revisar;
  return k === s;
}
function linhaTabela(l, cols) {
  const td = {
    desc: '<td class="desc"><b>' + esc(l.descricao) + (l.revisar ? '<span class="flag" title="Revisar: ' + esc(l.revisar) + '"></span>' : '') + '</b><small>' + tagRec(l) + esc(C.nome(l.categoria_id) || 'Sem categoria') + '</small></td>',
    comp: '<td class="hide-m">' + mesCurto(mesKey(l.competencia)) + '</td>',
    resp: '<td>' + esc(C.nome(l.responsavel_id) || '—') + '</td>',
    cc: '<td>' + esc(C.nome(l.centro_custo_id) || '—') + '</td>',
    cat: '<td>' + esc(C.nome(l.categoria_id) || '—') + '</td>',
    venc: '<td class="num">' + (ddmmaa(l.vencimento) || '—') + '</td>',
    pag: '<td class="num">' + (ddmmaa(l.pagamento) || '—') + '</td>',
    dias: '<td>' + diasTxt(l) + '</td>',
    valor: '<td class="r num"><b>' + brl(l.valor) + '</b></td>',
    pago: '<td class="r num">' + brl(valorEfetivo(l)) + '</td>',
    status: '<td>' + pill(l) + '</td>',
    acoes: '<td class="acts">' + (podeEditar() && st(l).k !== 'paga' && st(l).k !== 'cancelada' ? '<button class="btn xs" data-a="pagar" data-id="' + l.id + '">Pagar</button> ' : '') + '<button class="btn xs icon ghost" data-a="menuConta" data-id="' + l.id + '" aria-label="Ações">' + ic('dots') + '</button></td>'
  };
  return '<tr data-a="verConta" data-id="' + l.id + '">' + cols.map(c => td[c]).join('') + '</tr>';
}
function linhaMovel(l, extra) {
  return '<div class="mrow" data-a="verConta" data-id="' + l.id + '"><b>' + esc(l.descricao) + (l.revisar ? '<span class="flag"></span>' : '') + '</b><span class="v num">' + brl(l.valor) + '</span>' +
    '<span class="s">' + pill(l) + tagRec(l) + diasTxt(l) + (extra ? '<span>' + extra + '</span>' : '') + '</span><span class="a">' + (podeEditar() && st(l).k !== 'paga' && st(l).k !== 'cancelada' ? '<button class="btn xs" data-a="pagar" data-id="' + l.id + '">Pagar</button>' : '') + '</span></div>';
}
const HEAD = { desc: 'Despesa', comp: 'Comp.', resp: 'Responsável', cc: 'Centro de custo', cat: 'Categoria', venc: 'Vencimento', pag: 'Pagamento', dias: 'Prazo', valor: 'Valor', pago: 'Valor pago', status: 'Status', acoes: '' };
function tabela(ls, cols, rodape) {
  return '<div class="tbl-wrap resp"><table class="tbl"><thead><tr>' + cols.map(c => '<th class="' + (c === 'valor' || c === 'pago' ? 'r' : '') + (c === 'comp' ? ' hide-m' : '') + '">' + HEAD[c] + '</th>').join('') + '</tr></thead><tbody>' + ls.map(l => linhaTabela(l, cols)).join('') + '</tbody>' + (rodape || '') + '</table></div>' +
    '<div class="mlist">' + ls.map(l => linhaMovel(l, esc(C.nome(l.categoria_id)))).join('') + '</div>';
}
Object.assign(ACTIONS, {
  verConta: el => { const l = S.lanc.find(x => x.id === el.dataset.id); if (l) detalhesConta(l); },
  pagar: el => { const l = S.lanc.find(x => x.id === el.dataset.id); if (l) modalPagar(l); },
  menuConta: el => { const l = S.lanc.find(x => x.id === el.dataset.id); if (l) abrirMenu(el, acoesConta(l)); }
});

PAGES.contas = {
  html() {
    const f = S.ui.contas, mes = S.ui.mes;
    let ls = S.lanc.filter(l => f.todos || mesKey(l.competencia) === mes);
    ls = filtrarLanc(ls, f).filter(l => passaStatus(l, f.status));
    if (f.q) { const q = norm(f.q); ls = ls.filter(l => norm(l.descricao + ' ' + (l.observacoes || '') + ' ' + C.nome(l.categoria_id) + ' ' + C.nome(l.responsavel_id)).includes(q)); }
    ls.sort((a, b) => (a.vencimento || '9999') < (b.vencimento || '9999') ? -1 : (a.vencimento || '9999') > (b.vencimento || '9999') ? 1 : a.descricao.localeCompare(b.descricao));
    const vivos = ls.filter(l => !l.cancelado); const r = resumo(ls);
    const falt = fixasFaltando(mes);
    return pageHead('Contas e despesas', 'Cadastro e gestão de todos os lançamentos', podeEditar() ? '<button class="btn" data-a="gerarMesModal">Gerar recorrentes</button><button class="btn pri" data-a="novaConta">' + ic('mais') + 'Nova conta</button>' : '') +
      '<div class="filters">' + (f.todos ? '' : mesNav(mes)) +
      '<select class="inp sm" data-f="todos"><option value="">Só o mês</option><option value="1"' + (f.todos ? ' selected' : '') + '>Todas as competências</option></select>' +
      '<input class="inp sm search" data-f="q" placeholder="Buscar despesa, observação…" value="' + esc(f.q || '') + '">' +
      '<select class="inp sm" data-f="status">' + optsTxt(STATUS_FILTRO, f.status || '') + '</select>' +
      '<select class="inp sm" data-f="categoria">' + opts(C.lista('categoria', f.categoria), f.categoria, 'Categoria') + '</select>' +
      '<select class="inp sm" data-f="responsavel">' + opts(C.lista('responsavel', f.responsavel), f.responsavel, 'Responsável') + '</select>' +
      '<select class="inp sm" data-f="centro">' + opts(C.lista('centro_custo', f.centro), f.centro, 'Centro de custo') + '</select>' +
      '<select class="inp sm" data-f="tipo">' + opts(C.lista('tipo_despesa', f.tipo), f.tipo, 'Tipo') + '</select></div>' +
      (falt.length && !f.todos && podeEditar() ? '<div class="infobox" style="display:flex;align-items:center;gap:10px"><span style="flex:1"><b>' + falt.length + ' conta(s) recorrente(s)</b> ainda não lançada(s) em ' + mesLabel(mes) + '.</span><button class="btn sm pri" data-a="gerarMes">Gerar agora</button></div>' : '') +
      '<div class="kpis"><div class="kpi"><div class="l">Contas</div><div class="v num">' + vivos.length + '</div><div class="s">' + (ls.length - vivos.length ? (ls.length - vivos.length) + ' cancelada(s) fora dos totais' : 'no filtro atual') + '</div></div>' +
      '<div class="kpi"><div class="l">Total</div><div class="v num">' + brl(r.total) + '</div></div><div class="kpi good"><div class="l">Pago</div><div class="v num">' + brl(r.pago) + '</div></div><div class="kpi ' + (r.atrasado ? 'crit' : '') + '"><div class="l">Em aberto</div><div class="v num">' + brl(r.aberto) + '</div><div class="s">' + (r.atrasado ? brl(r.atrasado) + ' atrasado' : 'nada atrasado') + '</div></div></div>' +
      (ls.length ? tabela(ls, ['desc', 'comp', 'resp', 'cc', 'venc', 'pag', 'valor', 'status', 'acoes'], '<tfoot><tr><td colspan="6">' + vivos.length + ' conta(s)</td><td class="r num">' + brl(r.total) + '</td><td colspan="2"></td></tr></tfoot>')
        : '<div class="tbl-wrap"><div class="empty"><b>Nenhuma conta encontrada</b>Ajuste os filtros' + (podeEditar() ? ' ou cadastre uma nova conta.<br><button class="btn pri" data-a="novaConta">Nova conta</button>' : '.') + '</div></div>');
  },
  mount() { ligarFiltros(S.ui.contas); }
};
function ligarFiltros(obj) {
  $$('[data-f]').forEach(el => {
    const ev = el.tagName === 'INPUT' ? 'input' : 'change';
    el.addEventListener(ev, () => {
      obj[el.dataset.f] = el.value;
      if (el.tagName === 'INPUT') { const pos = el.selectionStart, k = el.dataset.f; render(); const n = $('[data-f="' + k + '"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }
      else render();
    });
  });
}
Object.assign(ACTIONS, {
  gerarMesModal: () => {
    abrirModal('Gerar contas recorrentes', '<form id="fG"><p class="muted" style="margin:0 0 12px">Cria os lançamentos das contas recorrentes ativas para as competências escolhidas. Lançamentos que já existem não são duplicados.</p>' +
      '<div class="grid2"><div class="field"><label>A partir da competência</label><input class="inp" type="month" id="gM" value="' + S.ui.mes + '" required></div><div class="field"><label>Quantos meses</label><input class="inp" type="number" id="gN" min="1" max="24" value="1" required></div></div>' +
      '<div class="infobox">' + S.rec.filter(r => r.ativo).length + ' conta(s) recorrente(s) ativa(s), somando ' + brl(soma(S.rec.filter(r => r.ativo), r => +r.valor)) + ' por mês. Gerencie em Cadastros → Contas recorrentes.</div>' +
      '<div class="mf"><button type="button" class="btn" data-a="fechar">Cancelar</button><button class="btn pri" id="gS">Gerar</button></div></form>', {
      classe: 'sm', onMount: m => { $('#fG', m).onsubmit = async e => { e.preventDefault(); await act(() => DB.rpc('gerar_recorrentes', { p_inicio: $('#gM').value + '-01', p_meses: +$('#gN').value }), n => n ? n + ' conta(s) gerada(s).' : 'Nada a gerar: as contas já existem.', $('#gS')); fecharModal(); }; }
    });
  }
});

/* ===================== Contas a pagar ===================== */
const FAIXAS = [['atrasada', 'Contas atrasadas', 'p-atrasada'], ['hoje', 'Vencem hoje', 'p-hoje'], ['semana', 'Vencem nos próximos 7 dias', 'p-semana'], ['quinzena', 'Vencem entre 8 e 15 dias', 'p-quinzena'], ['depois', 'Vencem posteriormente', 'p-pendente'], ['agendada', 'Contas agendadas', 'p-agendada']];
PAGES.apagar = {
  html() {
    const f = S.ui.apagar;
    let ls = S.lanc.filter(aPagar);
    ls = filtrarLanc(ls, { mes: f.mes, categoria: f.categoria, responsavel: f.responsavel });
    if (f.status) ls = ls.filter(l => f.status === 'pendente' ? st(l).aberta && st(l).k !== 'atrasada' : st(l).k === f.status);
    if (f.origem) ls = ls.filter(l => f.origem === 'rec' ? !!l.recorrente_id : !l.recorrente_id);
    const tot = soma(ls, l => +l.valor), atr = soma(ls.filter(l => st(l).k === 'atrasada'), l => +l.valor), prox = soma(ls.filter(l => ['hoje', 'semana'].includes(st(l).k)), l => +l.valor);
    const meses = mesesComDados();
    const grupos = FAIXAS.map(([g, t, c]) => [g, t, c, ls.filter(l => st(l).grupo === g).sort((a, b) => (a.vencimento || a.agendado_para || '9') < (b.vencimento || b.agendado_para || '9') ? -1 : 1)]).filter(x => x[3].length);
    return pageHead('Contas a pagar', 'Tudo o que ainda precisa ser pago, separado por prazo. As contas recorrentes do mês entram aqui automaticamente.') +
      '<div class="kpis k3"><div class="kpi"><div class="l">TOTAL A PAGAR</div><div class="v num">' + brl(tot) + '</div><div class="s">' + ls.length + ' conta(s) pendente(s)</div></div>' +
      '<div class="kpi crit"><div class="l"><i style="background:var(--crit)"></i>TOTAL ATRASADO</div><div class="v num">' + brl(atr) + '</div><div class="s">' + ls.filter(l => st(l).k === 'atrasada').length + ' conta(s) vencida(s)</div></div>' +
      '<div class="kpi warn"><div class="l"><i style="background:var(--warn)"></i>PRÓXIMOS VENCIMENTOS</div><div class="v num">' + brl(prox) + '</div><div class="s">hoje até ' + dd(addDias(S.hoje, 7)) + '</div></div></div>' +
      '<div class="filters"><span class="lbl">Filtrar</span><select class="inp sm" data-f="mes"><option value="">Todos os meses</option>' + meses.map(k => '<option value="' + k + '"' + (f.mes === k ? ' selected' : '') + '>' + mesTitulo(k) + '</option>').join('') + '</select>' +
      '<select class="inp sm" data-f="categoria">' + opts(C.lista('categoria', f.categoria), f.categoria, 'Todas as categorias') + '</select>' +
      '<select class="inp sm" data-f="responsavel">' + opts(C.lista('responsavel', f.responsavel), f.responsavel, 'Todos os responsáveis') + '</select>' +
      '<select class="inp sm" data-f="status">' + optsTxt([['', 'Todos os status'], ['atrasada', 'Atrasadas'], ['pendente', 'Pendentes no prazo'], ['agendada', 'Agendadas']], f.status || '') + '</select>' +
      '<select class="inp sm" data-f="origem">' + optsTxt([['', 'Recorrentes e avulsas'], ['rec', 'Só recorrentes'], ['avulsa', 'Só avulsas']], f.origem || '') + '</select></div>' +
      (grupos.length ? grupos.map(([g, t, c, gl]) => '<div class="group"><div class="group-h"><h3>' + t + '</h3><span class="tag ' + c + '">' + gl.length + '</span><span class="sum num">' + brl(soma(gl, l => +l.valor)) + '</span></div>' +
        tabela(gl, ['desc', 'comp', 'resp', 'venc', 'dias', 'valor', 'status', 'acoes']) + '</div>').join('')
        : '<div class="tbl-wrap"><div class="empty"><b>Nada a pagar</b>Nenhuma conta pendente para os filtros escolhidos.</div></div>');
  },
  mount() { ligarFiltros(S.ui.apagar); }
};

/* ===================== Contas pagas ===================== */
function periodoPagas() {
  const f = S.ui.pagas, h = S.hoje;
  if (f.periodo === 'mes') return [h.slice(0, 8) + '01', h];
  if (f.periodo === '3m') return [addMes(mesKey(h), -2) + '-01', h];
  if (f.periodo === 'ano') return [h.slice(0, 4) + '-01-01', h];
  if (f.periodo === 'tudo') return ['1900-01-01', '2999-12-31'];
  return [f.de || '1900-01-01', f.ate || '2999-12-31'];
}
PAGES.pagas = {
  html() {
    const f = S.ui.pagas; const [de, ate] = periodoPagas();
    let ls = S.lanc.filter(l => ehPaga(l) && l.pagamento >= de && l.pagamento <= ate);
    ls = filtrarLanc(ls, f);
    if (f.q) { const q = norm(f.q); ls = ls.filter(l => norm(l.descricao + ' ' + (l.observacoes || '')).includes(q)); }
    ls.sort((a, b) => a.pagamento < b.pagamento ? 1 : -1);
    const orig = soma(ls, l => +l.valor), pago = soma(ls, valorEfetivo), atraso = ls.filter(l => st(l).atraso);
    const chip = (k, t) => '<button class="chip' + (f.periodo === k ? ' on' : '') + '" data-a="pagasPer" data-v="' + k + '">' + t + '</button>';
    return pageHead('Contas pagas', 'Histórico de pagamentos realizados — ' + (de === '1900-01-01' ? 'todo o período' : ddmmaa(de) + ' a ' + ddmmaa(ate))) +
      '<div class="filters"><div class="chips">' + chip('mes', 'Este mês') + chip('3m', 'Últimos 3 meses') + chip('ano', 'Este ano') + chip('tudo', 'Tudo') + chip('custom', 'Período') + '</div>' +
      (f.periodo === 'custom' ? '<input class="inp sm" type="date" data-f="de" value="' + esc(f.de || '') + '" title="De"><input class="inp sm" type="date" data-f="ate" value="' + esc(f.ate || '') + '" title="Até">' : '') +
      '<input class="inp sm search" data-f="q" placeholder="Buscar…" value="' + esc(f.q || '') + '">' +
      '<select class="inp sm" data-f="categoria">' + opts(C.lista('categoria', f.categoria), f.categoria, 'Categoria') + '</select>' +
      '<select class="inp sm" data-f="responsavel">' + opts(C.lista('responsavel', f.responsavel), f.responsavel, 'Responsável') + '</select>' +
      '<select class="inp sm" data-f="centro">' + opts(C.lista('centro_custo', f.centro), f.centro, 'Centro de custo') + '</select></div>' +
      '<div class="kpis"><div class="kpi"><div class="l">Contas pagas</div><div class="v num">' + ls.length + '</div></div><div class="kpi"><div class="l">Valor original</div><div class="v num">' + brl(orig) + '</div></div>' +
      '<div class="kpi good"><div class="l">Valor efetivamente pago</div><div class="v num">' + brl(pago) + '</div><div class="s">' + (pago !== orig ? (pago > orig ? '+' : '−') + brl(Math.abs(pago - orig)) + ' vs. original' : 'igual ao original') + '</div></div>' +
      '<div class="kpi ' + (atraso.length ? 'warn' : '') + '"><div class="l">Pagas com atraso</div><div class="v num">' + atraso.length + '</div><div class="s">' + (ls.length ? pct(ls.length - atraso.length, ls.length) + '% pagas em dia' : '') + '</div></div></div>' +
      (ls.length ? tabela(ls, ['desc', 'valor', 'pago', 'venc', 'pag', 'dias', 'resp', 'cc', 'acoes'], '<tfoot><tr><td>' + ls.length + ' conta(s)</td><td class="r num">' + brl(orig) + '</td><td class="r num">' + brl(pago) + '</td><td colspan="6"></td></tr></tfoot>')
        : '<div class="tbl-wrap"><div class="empty"><b>Nenhum pagamento no período</b>Escolha outro período ou ajuste os filtros.</div></div>');
  },
  mount() { ligarFiltros(S.ui.pagas); }
};
ACTIONS.pagasPer = el => { S.ui.pagas.periodo = el.dataset.v; render(); };

/* ===================== Economias e metas ===================== */
function calcMeta(m) {
  const aps = S.aportes.filter(a => a.meta_id === m.id).sort((a, b) => a.data < b.data ? 1 : -1);
  const total = soma(aps, a => +a.valor), falta = Math.max(0, m.valor_meta - total), p = pct(total, m.valor_meta);
  const d = m.data_limite ? dias(m.data_limite, S.hoje) : null;
  const sem = d != null ? Math.max(1, Math.ceil(d / 7)) : null, qz = d != null ? Math.max(1, Math.ceil(d / 15)) : null, ms = d != null ? Math.max(1, Math.ceil(d / 30)) : null;
  return { aps, total, falta, p, d, porSem: sem && falta / sem, porQz: qz && falta / qz, porMes: ms && falta / ms, sem, qz, ms };
}
function termometro(p) {
  const h = Math.max(0, Math.min(100, p));
  return '<div class="thermo" role="img" aria-label="' + p + '% da meta"><div class="tube"><div class="marks">' + [25, 50, 75].map(x => '<i style="bottom:' + x + '%"></i>').join('') + '</div><div class="fill" style="height:' + h + '%"></div></div><div class="bulb">' + p + '%</div></div>';
}
PAGES.metas = {
  html(sub) {
    const arquivadas = sub === 'arquivadas';
    const ms = S.metas.filter(m => m.ativo !== arquivadas).sort((a, b) => (a.data_limite || '9') < (b.data_limite || '9') ? -1 : 1);
    const ativos = S.metas.filter(m => m.ativo);
    const totG = soma(ativos, m => calcMeta(m).total), totM = soma(ativos, m => +m.valor_meta);
    return pageHead('Economias e metas', ativos.length + ' meta(s) ativa(s) · ' + brl(totG) + ' guardados de ' + brl(totM), podeEditar() ? '<button class="btn pri" data-a="novaMeta">' + ic('mais') + 'Nova meta</button>' : '') +
      '<div class="tabs"><a href="#/metas" class="' + (arquivadas ? '' : 'on') + '">Ativas</a><a href="#/metas/arquivadas" class="' + (arquivadas ? 'on' : '') + '">Arquivadas</a></div>' +
      (ms.length ? '<div class="metas">' + ms.map(m => {
        const c = calcMeta(m);
        return '<div class="card meta">' + termometro(c.p) + '<div style="min-width:0"><div style="display:flex;align-items:flex-start;gap:8px"><div style="flex:1;min-width:0"><h3>' + esc(m.nome) + '</h3><span class="muted" style="font-size:12.5px">' + (m.data_limite ? 'até ' + ddmmaa(m.data_limite) + (c.d >= 0 ? ' · ' + c.d + ' dias' : ' · prazo encerrado') : 'sem data limite') + '</span></div>' +
          (podeEditar() ? '<button class="btn xs icon ghost" data-a="menuMeta" data-id="' + m.id + '" aria-label="Ações">' + ic('dots') + '</button>' : '') + '</div>' +
          '<div class="big num">' + brl(c.total) + '</div><div class="muted" style="font-size:13px">de ' + brl(m.valor_meta) + ' · ' + (c.falta ? 'faltam <b style="color:var(--ink)">' + brl(c.falta) + '</b>' : '<b style="color:var(--good)">meta atingida!</b>') + '</div>' +
          (m.data_limite && c.falta && c.d > 0 ? '<div class="mini"><div><small>Por semana</small><b class="num">' + brl0(c.porSem) + '</b></div><div><small>Por quinzena</small><b class="num">' + brl0(c.porQz) + '</b></div><div><small>Por mês</small><b class="num">' + brl0(c.porMes) + '</b></div></div>' : '') +
          (podeEditar() ? '<div style="display:flex;gap:6px;margin-top:10px"><button class="btn sm good" data-a="aporte" data-id="' + m.id + '" data-v="1">+ Aporte</button><button class="btn sm" data-a="aporte" data-id="' + m.id + '" data-v="-1">Retirada</button></div>' : '') +
          '<div class="aps">' + (c.aps.length ? c.aps.map(a => '<div class="ap" data-a="editAporte" data-id="' + a.id + '"><span>' + ddmmaa(a.data) + '</span><span>' + esc(a.descricao) + '</span><b class="num" style="color:' + (a.valor < 0 ? 'var(--crit)' : 'var(--good)') + '">' + (a.valor < 0 ? '−' : '+') + brl(Math.abs(a.valor)) + '</b></div>').join('') : '<div class="muted" style="font-size:13px">Nenhum aporte ainda.</div>') + '</div></div></div>';
      }).join('') + '</div>' : '<div class="tbl-wrap"><div class="empty"><b>' + (arquivadas ? 'Nenhuma meta arquivada' : 'Nenhuma meta ativa') + '</b>' + (arquivadas ? '' : 'Crie uma meta para acompanhar quanto falta guardar.') + '</div></div>');
  }
};
function formMeta(m) {
  const novo = !m; m = m || { ativo: true };
  abrirModal(novo ? 'Nova meta' : 'Editar meta', '<form id="fM"><div class="field"><label>Nome da meta *</label><input class="inp" id="mN" value="' + esc(m.nome || '') + '" maxlength="80" required placeholder="Ex.: Reserva de emergência"></div>' +
    '<div class="grid2"><div class="field"><label>Valor desejado *</label><input class="inp num" id="mV" inputmode="decimal" value="' + valorInput(m.valor_meta) + '" required></div><div class="field"><label>Data limite</label><input class="inp" id="mD" type="date" value="' + esc(m.data_limite || '') + '"></div></div>' +
    '<div class="field"><label>Observações</label><textarea class="inp" id="mO">' + esc(m.observacoes || '') + '</textarea></div><div class="err" id="mErr"></div>' +
    '<div class="mf"><button type="button" class="btn" data-a="fechar">Cancelar</button><button class="btn pri" id="mS">Salvar</button></div></form>', {
    classe: 'sm', onMount: el => {
      $('#fM', el).onsubmit = async e => {
        e.preventDefault(); const row = { nome: $('#mN').value.trim(), valor_meta: parseValor($('#mV').value), data_limite: $('#mD').value || null, observacoes: $('#mO').value.trim() || null };
        if (row.valor_meta <= 0) return $('#mErr').textContent = 'Informe um valor maior que zero.';
        try { await act(() => novo ? DB.insert('metas', row) : DB.update('metas', m.id, row), 'Meta salva.', $('#mS')); fecharModal(); } catch (err) { $('#mErr').textContent = err.message; }
      };
    }
  });
}
function formAporte(a, metaId, sinal) {
  const novo = !a; a = a || { meta_id: metaId, data: S.hoje }; sinal = a.valor < 0 ? -1 : (sinal || 1);
  const m = S.metas.find(x => x.id === a.meta_id);
  abrirModal((novo ? (sinal < 0 ? 'Registrar retirada' : 'Registrar aporte') : 'Editar movimentação') + ' · ' + esc(m ? m.nome : ''), '<form id="fAp"><div class="field"><label>Descrição *</label><input class="inp" id="apD" value="' + esc(a.descricao || '') + '" required maxlength="120" placeholder="' + (sinal < 0 ? 'Ex.: retirada para viagem' : 'Ex.: guardado em novembro') + '"></div>' +
    '<div class="grid2"><div class="field"><label>Valor ' + (sinal < 0 ? 'retirado' : 'aportado') + ' *</label><input class="inp num" id="apV" inputmode="decimal" value="' + valorInput(a.valor ? Math.abs(a.valor) : '') + '" required></div><div class="field"><label>Data</label><input class="inp" id="apDt" type="date" value="' + esc(a.data) + '" required></div></div>' +
    '<div class="field"><label>Observações</label><textarea class="inp" id="apO">' + esc(a.observacoes || '') + '</textarea></div><div class="err" id="apErr"></div>' +
    '<div class="mf">' + (!novo && podeEditar() ? '<button type="button" class="btn danger" id="apX">Excluir</button><span class="grow"></span>' : '') + '<button type="button" class="btn" data-a="fechar">Cancelar</button>' + (podeEditar() ? '<button class="btn pri" id="apS">Salvar</button>' : '') + '</div></form>', {
    classe: 'sm', onMount: el => {
      $('#fAp', el).onsubmit = async e => {
        e.preventDefault(); const v = Math.abs(parseValor($('#apV').value)); if (!v) return $('#apErr').textContent = 'Informe o valor.';
        const row = { meta_id: a.meta_id, descricao: $('#apD').value.trim(), valor: sinal * v, data: $('#apDt').value, observacoes: $('#apO').value.trim() || null };
        try { await act(() => novo ? DB.insert('aportes', row) : DB.update('aportes', a.id, row), sinal < 0 ? 'Retirada registrada.' : 'Aporte registrado.', $('#apS')); fecharModal(); } catch (err) { $('#apErr').textContent = err.message; }
      };
      const x = $('#apX', el); if (x) x.onclick = async () => { if (!await confirmar('Excluir movimentação?', 'Ela vai para a lixeira e deixa de contar na meta.', 'Excluir')) return; await act(() => DB.update('aportes', a.id, { excluido_em: new Date().toISOString() }), 'Movimentação excluída.'); };
    }
  });
}
Object.assign(ACTIONS, {
  novaMeta: () => formMeta(null),
  aporte: el => formAporte(null, el.dataset.id, +el.dataset.v),
  editAporte: el => { const a = S.aportes.find(x => x.id === el.dataset.id); if (a) formAporte(a); },
  menuMeta: el => {
    const m = S.metas.find(x => x.id === el.dataset.id); if (!m) return;
    abrirMenu(el, [{ t: 'Editar meta', f: () => formMeta(m) }, { t: m.ativo ? 'Arquivar' : 'Reativar', f: () => act(() => DB.update('metas', m.id, { ativo: !m.ativo }), m.ativo ? 'Meta arquivada.' : 'Meta reativada.') }, '-',
      { t: 'Excluir', d: true, f: async () => { if (await confirmar('Excluir meta?', 'A meta <b>' + esc(m.nome) + '</b> vai para a lixeira (com seus aportes).', 'Excluir')) act(() => DB.update('metas', m.id, { excluido_em: new Date().toISOString() }), 'Meta enviada para a lixeira.'); } }]);
  }
});
