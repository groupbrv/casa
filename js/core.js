/* CASA • núcleo: utilitários, dados, regras, acesso, layout e rotas */
'use strict';

/* ===================== Utilitários ===================== */
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const MES3 = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brl0 = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
const r2 = v => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
const dd = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
const ddmmaa = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
const dias = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 864e5);
const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const mesKey = iso => iso.slice(0, 7);
const addMes = (k, n) => { let [a, m] = k.split('-').map(Number); m += n; while (m > 12) { m -= 12; a++; } while (m < 1) { m += 12; a--; } return a + '-' + String(m).padStart(2, '0'); };
const mesLabel = k => { const [a, m] = k.split('-'); return MESES[+m - 1] + ' de ' + a; };
const mesTitulo = k => { const t = mesLabel(k); return t[0].toUpperCase() + t.slice(1); };
const mesCurto = k => { const [a, m] = k.split('-'); return MES3[+m - 1] + '/' + a.slice(2); };
const norm = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
const parseValor = s => { if (typeof s === 'number') return r2(s); s = String(s || '').replace(/[R$\s]/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); const n = parseFloat(s); return isNaN(n) ? 0 : r2(n); };
const valorInput = v => (v || v === 0) && v !== '' ? Number(v).toFixed(2).replace('.', ',') : '';
const hojeLocal = () => { const d = new Date(Date.now() - 3 * 3600e3); return d.toISOString().slice(0, 10); }; // America/Fortaleza (UTC-3, sem horário de verão)
const soma = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
const uniq = a => [...new Set(a)];

const ICON = {
  logo: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 8.2 6.3"/><path d="m20.6 6.4-.4 3.4-3.3-.8"/><circle cx="12" cy="12" r="2.2"/>',
  dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  contas: '<path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  apagar: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pagas: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  metas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  cad: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  rel: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  cfg: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  dots: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  casa: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  baixar: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  imp: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'
};
const ic = k => '<svg class="i" viewBox="0 0 24 24">' + ICON[k] + '</svg>';

/* ===================== Estado ===================== */
const S = {
  sb: null, session: null, perfil: null, hoje: hojeLocal(),
  cad: [], lanc: [], rec: [], metas: [], aportes: [], espacos: [], A: null, esp: null, sel: new Set(),
  ui: { mes: null, dash: {}, contas: { status: '', q: '' }, apagar: {}, pagas: { periodo: 'mes' }, rel: { tipo: 'mensal' } }
};
const C = {
  byId: id => S.cad.find(c => c.id === id),
  nome: id => { const c = id && C.byId(id); return c ? c.nome : ''; },
  lista: (tipo, incluirId) => S.cad.filter(c => c.tipo === tipo && (c.ativo || c.id === incluirId)).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
};
const podeEditar = () => S.perfil && ['admin', 'editor'].includes(S.perfil.papel);
const eAdmin = () => S.perfil && S.perfil.papel === 'admin';

/* ===================== Banco (Supabase) ===================== */
const DB = {
  async all(tabela, opts = {}) {
    const out = []; const step = 1000;
    for (let i = 0; ; i += step) {
      let q = S.sb.from(tabela).select(opts.select || '*');
      if (opts.vivos) q = q.is('excluido_em', null);
      if (opts.mortos) q = q.not('excluido_em', 'is', null);
      if (opts.order) q = q.order(opts.order, { ascending: !opts.desc });
      if (opts.limit) q = q.limit(opts.limit);
      else q = q.range(i, i + step - 1);
      const { data, error } = await q;
      if (error) throw traduz(error);
      out.push(...data);
      if (opts.limit || data.length < step) break;
    }
    return out;
  },
  async insert(tabela, rows) {
    if (['lancamentos', 'recorrentes', 'metas', 'cadastros', 'importacoes'].includes(tabela)) {
      if (!S.esp || S.esp === 'todos') throw new Error('Escolha uma área (Casa, Bravus, Bravinhos ou Hub) antes de cadastrar.');
      rows = (Array.isArray(rows) ? rows : [rows]).map(r => Object.assign({ espaco_id: S.esp }, r));
    }
    const { data, error } = await S.sb.from(tabela).insert(rows).select();
    if (error) throw traduz(error); return data;
  },
  async update(tabela, id, patch, col = 'id') {
    const { data, error } = await S.sb.from(tabela).update(patch).eq(col, id).select();
    if (error) throw traduz(error);
    if (!data || !data.length) throw new Error('Não foi possível salvar (sem permissão ou registro inexistente).');
    return data[0];
  },
  async remove(tabela, id, col = 'id') {
    const { error } = await S.sb.from(tabela).delete().eq(col, id);
    if (error) throw traduz(error);
  },
  async rpc(fn, args) {
    const { data, error } = await S.sb.rpc(fn, args);
    if (error) throw traduz(error); return data;
  }
};
function traduz(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/ux_lanc_duplicidade/.test(m)) return new Error('Já existe uma conta igual (mesma despesa, mês, valor e vencimento).');
  if (/ux_lanc_recorrencia/.test(m)) return new Error('Essa conta recorrente já foi lançada neste mês.');
  if (/ux_lanc_import/.test(m)) return new Error('Essa linha já foi importada antes.');
  if (/ux_cadastros_nome/.test(m)) return new Error('Já existe um cadastro com esse nome.');
  if (/row-level security|permission denied/i.test(m)) return new Error('Você não tem permissão para esta ação.');
  if (/Failed to fetch|NetworkError|network/i.test(m)) return new Error('Sem conexão com o servidor. Verifique a internet e tente de novo.');
  if (/Invalid login credentials/i.test(m)) return new Error('E-mail ou senha incorretos.');
  if (/Email not confirmed/i.test(m)) return new Error('Confirme o seu e-mail pelo link que enviamos antes de entrar.');
  if (/Password should be/i.test(m)) return new Error('A senha precisa ter pelo menos 8 caracteres.');
  if (/check constraint/i.test(m)) return new Error('Algum campo tem um valor inválido. Confira os dados.');
  return new Error(m);
}

let carregando = 0;
function busy(on) { carregando += on ? 1 : -1; if (carregando < 0) carregando = 0; $('#bar').className = carregando ? 'on' : ''; }

async function carregarTudo() {
  busy(true);
  try {
    const [espacos, cad, lanc, rec, metas, aportes] = await Promise.all([
      DB.all('espacos', { order: 'ordem' }),
      DB.all('cadastros', { order: 'nome' }),
      DB.all('lancamentos', { vivos: true }),
      DB.all('recorrentes', { vivos: true }),
      DB.all('metas', { vivos: true }),
      DB.all('aportes', { vivos: true })
    ]);
    S.A = { cad, lanc, rec, metas, aportes };
    S.espacos = espacos.filter(e => e.ativo);
    S.hoje = hojeLocal();
    if (!S.esp || (S.esp !== 'todos' && !S.espacos.some(e => e.id === S.esp))) {
      const pref = store('brv_esp');
      S.esp = pref === 'todos' && S.espacos.length > 1 ? 'todos' : ((S.espacos.find(e => e.slug === pref) || S.espacos[0] || {}).id || null);
    }
    if (S.esp === 'todos' && S.espacos.length < 2) S.esp = (S.espacos[0] || {}).id;
    if (!S.ultimaEsp) S.ultimaEsp = S.esp !== 'todos' ? S.esp : (S.espacos[0] || {}).id;
    aplicarEspaco();
  } finally { busy(false); }
}
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
const espNome = id => (S.espacos.find(e => e.id === id) || {}).nome || '';
const espAtual = () => S.espacos.find(e => e.id === S.esp);
function aplicarEspaco() {
  const A = S.A; if (!A) return;
  if (S.esp === 'todos') Object.assign(S, { cad: A.cad, lanc: A.lanc, rec: A.rec, metas: A.metas, aportes: A.aportes });
  else {
    const metas = A.metas.filter(m => m.espaco_id === S.esp), ids = new Set(metas.map(m => m.id));
    Object.assign(S, { cad: A.cad.filter(c => c.espaco_id === S.esp), lanc: A.lanc.filter(l => l.espaco_id === S.esp), rec: A.rec.filter(r => r.espaco_id === S.esp), metas, aportes: A.aportes.filter(a => ids.has(a.meta_id)) });
  }
}
function trocarEspaco(id) {
  S.esp = id; S.sel.clear(); store('brv_esp', id === 'todos' ? 'todos' : ((S.espacos.find(e => e.id === id) || {}).slug || ''));
  if (id !== 'todos') S.ultimaEsp = id;
  S.ui.contas = { status: '', q: '' }; S.ui.apagar = {}; S.ui.dash = {}; S.ui.pagas.categoria = S.ui.pagas.responsavel = S.ui.pagas.centro = '';
  aplicarEspaco();
  if (id === 'todos' && !['painel', 'relatorios', 'config'].includes(rota().pg)) { location.hash = '#/painel'; return; }
  render(); scrollTo(0, 0);
}

/* Executa uma ação, recarrega dados e redesenha */
async function act(fn, okMsg, btn) {
  if (btn) btn.disabled = true;
  busy(true);
  try {
    const r = await fn();
    await carregarTudo();
    render();
    if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg);
    return r;
  } catch (e) { toast(e.message, true); throw e; }
  finally { busy(false); if (btn && btn.isConnected) btn.disabled = false; }
}

/* ===================== Regras financeiras ===================== */
// competência, vencimento e pagamento são campos distintos.
function st(l) {
  const h = S.hoje;
  if (l.cancelado) return { k: 'cancelada', t: 'Cancelada', grupo: 'cancelada' };
  if (l.pagamento && l.pagamento <= h) {
    const atraso = l.vencimento && l.pagamento > l.vencimento ? dias(l.pagamento, l.vencimento) : 0;
    return { k: 'paga', t: atraso ? 'Paga com atraso' : 'Paga em dia', atraso, grupo: 'paga' };
  }
  if (l.pagamento || l.agendado_para) return { k: 'agendada', t: 'Agendada · ' + dd(l.pagamento || l.agendado_para), grupo: 'agendada' };
  if (!l.vencimento) return { k: 'semvenc', t: 'Sem vencimento', grupo: 'depois', aberta: true };
  const n = dias(l.vencimento, h);
  if (n < 0) return { k: 'atrasada', t: 'Atrasada', n, grupo: 'atrasada', aberta: true };
  if (n === 0) return { k: 'hoje', t: 'Vence hoje', n, grupo: 'hoje', aberta: true };
  if (n <= 7) return { k: 'semana', t: 'Vence em ' + n + (n === 1 ? ' dia' : ' dias'), n, grupo: 'semana', aberta: true };
  if (n <= 15) return { k: 'quinzena', t: 'Vence em ' + n + ' dias', n, grupo: 'quinzena', aberta: true };
  return { k: 'pendente', t: 'A vencer', n, grupo: 'depois', aberta: true };
}
const ehPaga = l => st(l).k === 'paga';
const ehAberta = l => !!st(l).aberta;            // pendente/atrasada/vencendo (não inclui agendada)
const aPagar = l => { const k = st(l).k; return k !== 'paga' && k !== 'cancelada'; }; // inclui agendadas
const valorEfetivo = l => ehPaga(l) ? Number(l.valor_pago != null ? l.valor_pago : l.valor) : Number(l.valor);
const diasTxt = l => {
  const s = st(l);
  if (s.k === 'paga') return s.atraso ? '<span class="dias warn">paga ' + s.atraso + 'd após</span>' : '<span class="dias ok">em dia</span>';
  if (s.n == null) return '';
  if (s.n < 0) return '<span class="dias crit">' + (-s.n) + (s.n === -1 ? ' dia' : ' dias') + ' de atraso</span>';
  if (s.n === 0) return '<span class="dias warn">hoje</span>';
  return '<span class="dias ' + (s.n <= 7 ? 'warn' : 'ok') + '">em ' + s.n + (s.n === 1 ? ' dia' : ' dias') + '</span>';
};
const tagRec = l => l.recorrente_id ? '<span class="tagrec" title="Gerada a partir de uma conta recorrente">↻ Recorrente</span>' : '';
const pill = l => { const s = st(l); return '<span class="pill p-' + s.k + '"><i></i>' + esc(s.t) + '</span>'; };
function resumo(ls) {
  const vivos = ls.filter(l => !l.cancelado);
  const r = { total: soma(vivos, l => +l.valor), pago: 0, pagoEf: 0, aberto: 0, atrasado: 0, semana: 0, qPend: 0, qtd: vivos.length, agendado: 0 };
  vivos.forEach(l => {
    const s = st(l);
    if (s.k === 'paga') { r.pago += +l.valor; r.pagoEf += valorEfetivo(l); }
    else { r.aberto += +l.valor; r.qPend++; if (s.k === 'agendada') r.agendado += +l.valor; }
    if (s.k === 'atrasada') r.atrasado += +l.valor;
    if (s.k === 'hoje' || s.k === 'semana') r.semana += +l.valor;
  });
  r.comprometido = r.pagoEf + r.aberto;
  return r;
}
function agrupar(ls, chave, valor = l => +l.valor) {
  const m = new Map();
  ls.forEach(l => { const k = chave(l) || 'Não informado'; m.set(k, (m.get(k) || 0) + valor(l)); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
function filtrarLanc(ls, f) {
  return ls.filter(l =>
    (!f.mes || mesKey(l.competencia) === f.mes) &&
    (!f.responsavel || l.responsavel_id === f.responsavel) &&
    (!f.centro || l.centro_custo_id === f.centro) &&
    (!f.categoria || l.categoria_id === f.categoria) &&
    (!f.tipo || l.tipo_id === f.tipo));
}
const natureza = l => { const t = C.byId(l.tipo_id); return t ? (t.natureza || (norm(t.nome).startsWith('fix') ? 'fixa' : 'variavel')) : 'variavel'; };
const mesesComDados = () => uniq(S.lanc.map(l => mesKey(l.competencia))).sort();

/* ===================== UI básica ===================== */
let tT;
function toast(msg, erro, btnTxt, fn) {
  const t = $('#toast'); clearTimeout(tT);
  t.className = erro ? 'e' : ''; t.innerHTML = '<span>' + esc(msg) + '</span>' + (btnTxt ? '<button>' + esc(btnTxt) + '</button>' : '');
  if (btnTxt) t.querySelector('button').onclick = () => { t.classList.remove('on'); fn(); };
  void t.offsetWidth; t.classList.add('on');
  tT = setTimeout(() => t.classList.remove('on'), btnTxt ? 7000 : erro ? 5000 : 3200);
}

function abrirModal(titulo, corpo, { classe = '', onMount } = {}) {
  fecharMenu();
  const m = $('#modal');
  m.className = 'modal ' + classe;
  m.innerHTML = '<div class="mh"><h2>' + titulo + '</h2><button class="x" data-a="fechar" aria-label="Fechar">×</button></div><div class="mb">' + corpo + '</div>';
  $('#veil').classList.add('on'); void m.offsetWidth; m.classList.add('on');
  if (onMount) onMount(m);
  const f = m.querySelector('input:not([type=hidden]):not([type=checkbox]),select,textarea');
  if (f && innerWidth > 860) setTimeout(() => f.focus(), 100);
}
function fecharModal() { $('#veil').classList.remove('on'); $('#modal').classList.remove('on'); }

function confirmar(titulo, texto, rotulo = 'Confirmar', perigo = true) {
  return new Promise(res => {
    abrirModal(titulo, '<p style="margin:0 0 16px;color:var(--ink-2)">' + texto + '</p><div class="mf"><button class="btn" data-a="fechar">Voltar</button><button class="btn ' + (perigo ? 'danger solid' : 'pri') + '" id="cfOk">' + esc(rotulo) + '</button></div>', {
      classe: 'sm', onMount: m => {
        $('#cfOk', m).onclick = () => { fecharModal(); res(true); };
        $$('[data-a=fechar]', m).forEach(b => b.addEventListener('click', () => res(false), { once: true }));
      }
    });
  });
}

let menuEl = null;
function abrirMenu(btn, itens) {
  fecharMenu();
  menuEl = document.createElement('div'); menuEl.className = 'menu';
  menuEl.innerHTML = itens.map(i => i === '-' ? '<hr>' : '<button class="' + (i.d ? 'd' : '') + '">' + esc(i.t) + '</button>').join('');
  document.body.appendChild(menuEl);
  const bs = $$('button', menuEl); let k = 0;
  itens.forEach(i => { if (i !== '-') { const b = bs[k++]; b.onclick = e => { e.stopPropagation(); fecharMenu(); i.f(); }; } });
  const r = btn.getBoundingClientRect(), w = menuEl.offsetWidth, h = menuEl.offsetHeight;
  menuEl.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + 'px';
  menuEl.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + 'px';
}
function fecharMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }

const opts = (lista, sel, vazio = '—') => '<option value="">' + esc(vazio) + '</option>' + lista.map(c => '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.nome) + (c.ativo ? '' : ' (inativo)') + '</option>').join('');
const optsTxt = (lista, sel) => lista.map(x => '<option value="' + esc(x[0]) + '"' + (x[0] === sel ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('');
function seg(id, vals, sel) { return '<div class="seg2" id="' + id + '">' + vals.map(v => '<button type="button" data-v="' + esc(v[0]) + '" class="' + (v[0] === sel ? 'on' : '') + '">' + esc(v[1]) + '</button>').join('') + '</div>'; }
const segVal = id => { const b = $('#' + id + ' button.on'); return b ? b.dataset.v : ''; };
function ligarSegs(root) { $$('.seg2', root).forEach(s => s.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('button', s).forEach(x => x.classList.remove('on')); b.classList.add('on'); })); }

/* Gráficos (SVG/HTML leves, uma cor por série) */
function hbars(lista, total, max = 7) {
  if (!lista.length) return '<div class="empty">Sem dados para os filtros escolhidos.</div>';
  let top = lista.slice(0, max); const resto = lista.slice(max);
  if (resto.length) top.push(['Demais (' + resto.length + ')', soma(resto, x => x[1])]);
  const maior = Math.max(...top.map(x => x[1])) || 1;
  return '<div class="hbars">' + top.map(x => '<div class="hb" title="' + esc(x[0]) + ': ' + brl(x[1]) + '"><span class="n">' + esc(x[0]) + '</span><span class="v num">' + brl0(x[1]) + '<small>' + pct(x[1], total) + '%</small></span><div class="t"><div class="f" style="width:' + (x[1] / maior * 100).toFixed(1) + '%"></div></div></div>').join('') + '</div>';
}
// series: [{k:classe, nome}], dados: [{rot, on, vals:[...], tip}]
function colunas(dados, series, { rotulo = true } = {}) {
  const tot = dados.map(d => soma(d.vals)); const mx = Math.max(...tot) || 1;
  return '<div class="colchart"><div class="cols">' + dados.map((d, i) =>
    '<div class="col' + (d.dim ? ' dim' : '') + '" tabindex="0"' + (d.act ? ' data-a="' + d.act + '" data-v="' + esc(d.v) + '" style="cursor:pointer"' : '') + '>' +
    (rotulo && tot[i] ? '<span class="vt num" style="bottom:' + (tot[i] / mx * 100) + '%">' + brl0(tot[i]) + '</span>' : '') +
    '<div class="stk" style="height:' + (tot[i] / mx * 100).toFixed(1) + '%">' + d.vals.map((v, j) => v > 0 ? '<div class="seg ' + series[j].k + '" style="height:' + (v / (tot[i] || 1) * 100).toFixed(2) + '%"></div>' : '').join('') + '</div>' +
    '<div class="tip"><b>' + esc(d.tip || d.rot) + '</b><br>' + series.map((s, j) => esc(s.nome) + ': ' + brl(d.vals[j])).join('<br>') + (series.length > 1 ? '<br>Total: ' + brl(tot[i]) : '') + '</div></div>').join('') +
    '</div><div class="colx">' + dados.map(d => '<span class="' + (d.on ? 'on' : '') + '">' + esc(d.rot) + '</span>').join('') + '</div>' +
    (series.length > 1 ? '<div class="legend">' + series.map(s => '<span><i class="seg ' + s.k + '" style="background:' + ({ paid: 'var(--good)', open: '#C5CEDB', late: 'var(--crit)', a: 'var(--chart)', b: 'var(--chart-2)' })[s.k] + '"></i>' + esc(s.nome) + '</span>').join('') + '</div>' : '') + '</div>';
}

/* ===================== Acesso ===================== */
function telaAcesso(modo, msg) {
  $('#app').hidden = true; const a = $('#auth'); a.hidden = false;
  const logo = '<div class="logo"><svg viewBox="0 0 24 24">' + ICON.casa + '</svg></div>';
  const forms = {
    entrar: '<h1>BRV360</h1><p class="sub">Gestão financeira da casa e das empresas</p><form id="fA"><div class="field"><label>E-mail</label><input class="inp" id="aE" type="email" autocomplete="username" required></div><div class="field"><label>Senha</label><input class="inp" id="aS" type="password" autocomplete="current-password" required></div><div class="err" id="aErr">' + esc(msg || '') + '</div><button class="btn pri block" id="aB">Entrar</button></form><div class="links"><a data-m="esqueci">Esqueci a senha</a><a data-m="criar">Recebi um convite</a></div>',
    esqueci: '<h1>Recuperar senha</h1><p class="sub">Enviaremos um link para criar uma nova senha.</p><form id="fA"><div class="field"><label>E-mail</label><input class="inp" id="aE" type="email" required></div><div class="err" id="aErr">' + esc(msg || '') + '</div><button class="btn pri block" id="aB">Enviar link</button></form><div class="links"><a data-m="entrar">Voltar</a></div>',
    criar: '<h1>Criar acesso</h1><p class="sub">Só funciona para e-mails convidados por um administrador.</p><form id="fA"><div class="field"><label>Seu nome</label><input class="inp" id="aN" required></div><div class="field"><label>E-mail do convite</label><input class="inp" id="aE" type="email" autocomplete="username" required></div><div class="field"><label>Senha (mínimo 8 caracteres)</label><input class="inp" id="aS" type="password" autocomplete="new-password" minlength="8" required></div><div class="err" id="aErr">' + esc(msg || '') + '</div><button class="btn pri block" id="aB">Criar acesso</button></form><div class="links"><a data-m="entrar">Já tenho acesso</a></div>',
    novasenha: '<h1>Nova senha</h1><p class="sub">Escolha uma nova senha para entrar.</p><form id="fA"><div class="field"><label>Nova senha (mínimo 8 caracteres)</label><input class="inp" id="aS" type="password" autocomplete="new-password" minlength="8" required></div><div class="err" id="aErr">' + esc(msg || '') + '</div><button class="btn pri block" id="aB">Salvar senha</button></form>',
    aguardando: '<h1>Acesso pendente</h1><p class="sub">Sua conta foi criada, mas ainda não foi liberada por um administrador do Casa. Peça para ele liberar em <b>Configurações → Usuários</b>.</p><button class="btn block" id="aSair">Sair</button>',
    info: '<h1>Pronto</h1><p class="sub">' + esc(msg || '') + '</p><button class="btn pri block" data-m="entrar">Ir para o login</button>'
  };
  a.innerHTML = '<div class="auth-card">' + logo + forms[modo] + '</div>';
  $$('[data-m]', a).forEach(x => x.onclick = () => telaAcesso(x.dataset.m));
  const sair = $('#aSair'); if (sair) sair.onclick = () => S.sb.auth.signOut();
  const f = $('#fA'); if (!f) return;
  f.onsubmit = async e => {
    e.preventDefault(); const b = $('#aB'); b.disabled = true; $('#aErr').textContent = '';
    try {
      const email = $('#aE') ? $('#aE').value.trim().toLowerCase() : '';
      if (modo === 'entrar') { const { error } = await S.sb.auth.signInWithPassword({ email, password: $('#aS').value }); if (error) throw traduz(error); }
      if (modo === 'esqueci') { const { error } = await S.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); if (error) throw traduz(error); telaAcesso('info', 'Se o e-mail estiver cadastrado, você vai receber o link em instantes.'); }
      if (modo === 'criar') {
        const { data, error } = await S.sb.auth.signUp({ email, password: $('#aS').value, options: { data: { nome: $('#aN').value.trim() }, emailRedirectTo: location.origin + location.pathname } });
        if (error) throw traduz(error);
        if (!data.session) telaAcesso('info', 'Enviamos um link de confirmação para ' + email + '. Abra o e-mail e depois entre com sua senha.');
      }
      if (modo === 'novasenha') { const { error } = await S.sb.auth.updateUser({ password: $('#aS').value }); if (error) throw traduz(error); toast('Senha alterada.'); window.__recOk && window.__recOk(); history.replaceState(null, '', location.pathname + '#/painel'); iniciarApp(); }
    } catch (err) { $('#aErr').textContent = err.message; }
    finally { if (b.isConnected) b.disabled = false; }
  };
}

async function iniciarApp() {
  try {
    const { data, error } = await S.sb.from('perfis').select('*').eq('user_id', S.session.user.id).maybeSingle();
    if (error) throw traduz(error);
    S.perfil = data;
    if (!data || !data.ativo) return telaAcesso('aguardando');
    await carregarTudo();
    // Lança automaticamente as contas recorrentes do mês atual (nunca duplica nem recria excluídas)
    let geradas = 0;
    if (podeEditar()) { try { geradas = await DB.rpc('gerar_recorrentes', { p_inicio: mesKey(S.hoje) + '-01', p_meses: 1, p_espaco: null }) || 0; if (geradas) await carregarTudo(); } catch (e) { console.warn(e); } }
    $('#auth').hidden = true; $('#app').hidden = false;
    if (!location.hash || location.hash === '#') location.hash = '#/painel';
    render();
    if (geradas) toast(geradas + ' conta(s) recorrente(s) de ' + mesLabel(mesKey(S.hoje)) + ' lançada(s) em Contas a pagar (cada uma na sua área).');
  } catch (e) { telaAcesso('entrar', e.message); }
}

/* ===================== Layout e rotas ===================== */
const NAV = [
  ['painel', 'Dashboard', 'dash'], ['contas', 'Contas e despesas', 'contas'], ['apagar', 'Contas a pagar', 'apagar'], ['pagas', 'Contas pagas', 'pagas'],
  ['metas', 'Economias e metas', 'metas'], ['cadastros', 'Cadastros', 'cad'], ['relatorios', 'Relatórios', 'rel'], ['config', 'Configurações', 'cfg']
];
const PAGES = {};
function rota() { const p = (location.hash || '#/painel').slice(2).split('/'); return { pg: PAGES[p[0]] ? p[0] : 'painel', sub: p[1] || '' }; }

function render() {
  if ($('#app').hidden) return;
  fecharMenu();
  const r = rota();
  if (S.esp === 'todos' && !['painel', 'relatorios', 'config'].includes(r.pg)) { S.esp = S.ultimaEsp || (S.espacos[0] || {}).id; aplicarEspaco(); }
  if (render.ultimaRota !== r.pg) { S.sel.clear(); render.ultimaRota = r.pg; }
  const atrasadas = S.lanc.filter(l => st(l).k === 'atrasada').length;
  const atrPorEsp = id => S.A.lanc.filter(l => l.espaco_id === id && st(l).k === 'atrasada').length;
  $('#areas').innerHTML = '<div class="sec">Áreas</div>' + (S.espacos.length > 1 ? '<button class="area' + (S.esp === 'todos' ? ' on' : '') + '" data-a="area" data-v="todos"><i class="dot dot-all"></i>Visão geral<span class="hint">todas</span></button>' : '') +
    S.espacos.map(e => { const n = atrPorEsp(e.id); return '<button class="area' + (S.esp === e.id ? ' on' : '') + '" data-a="area" data-v="' + e.id + '"><i class="dot a-' + e.slug + '"></i>' + esc(e.nome) + (n ? '<span class="badge" title="' + n + ' atrasada(s)">' + n + '</span>' : '') + '</button>'; }).join('');
  $('#tbArea').innerHTML = '<button class="chip on" data-a="abrirSide">' + esc(S.esp === 'todos' ? 'Visão geral' : espNome(S.esp)) + ' ▾</button>';
  $('#nav').innerHTML = '<div class="sec">' + esc(S.esp === 'todos' ? 'Visão geral' : 'Menu · ' + espNome(S.esp)) + '</div>' + NAV.map((n, i) =>
    (i === 4 ? '<div class="sec">Planejamento</div>' : i === 5 ? '<div class="sec">Gestão</div>' : '') +
    '<a href="#/' + n[0] + '" class="' + (r.pg === n[0] ? 'on' : '') + '">' + ic(n[2]) + esc(n[1]) + (n[0] === 'apagar' && atrasadas ? '<span class="badge">' + atrasadas + '</span>' : '') + '</a>').join('');
  $('#meNome').textContent = S.perfil.nome;
  $('#mePapel').textContent = { admin: 'Administrador', editor: 'Editor', leitor: 'Somente leitura' }[S.perfil.papel];
  $('#meAv').textContent = S.perfil.nome.trim().charAt(0).toUpperCase();
  $('#tbTitulo').textContent = (NAV.find(n => n[0] === r.pg) || NAV[0])[1];
  $('#bnav').innerHTML = [['painel', 'Painel', 'dash'], ['contas', 'Contas', 'contas'], ['apagar', 'A pagar', 'apagar'], ['metas', 'Metas', 'metas'], ['mais', 'Mais', 'menu']].map(n =>
    '<a ' + (n[0] === 'mais' ? 'data-a="abrirSide"' : 'href="#/' + n[0] + '"') + ' class="' + (r.pg === n[0] ? 'on' : '') + '">' + ic(n[2]) + n[1] + '</a>').join('');
  $('#side').classList.remove('open');
  const pg = PAGES[r.pg];
  $('#page').innerHTML = pg.html(r.sub);
  if (pg.mount) pg.mount(r.sub);
}

function pageHead(titulo, sub, acoes) {
  return '<div class="print-head"><h1>' + esc(titulo) + '</h1><p>BRV360 • ' + esc(S.esp === 'todos' ? 'Todas as áreas' : espNome(S.esp)) + ' — emitido em ' + ddmmaa(S.hoje) + ' por ' + esc(S.perfil.nome) + (sub ? ' — ' + esc(sub) : '') + '</p></div>' +
    '<div class="ph"><div><h1>' + esc(titulo) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (acoes ? '<div class="acts">' + acoes + '</div>' : '') + '</div>';
}
function mesNav(mes, act = 'mesNav') {
  return '<div class="mesnav"><button data-a="' + act + '" data-v="-1" aria-label="Mês anterior">‹</button><span>' + mesTitulo(mes) + '</span><button data-a="' + act + '" data-v="1" aria-label="Próximo mês">›</button></div>';
}

/* Delegação global de cliques: data-a="acao" */
const ACTIONS = {
  fechar: () => fecharModal(),
  abrirSide: () => $('#side').classList.add('open'),
  sair: async () => { await S.sb.auth.signOut(); },
  mesNav: el => { S.ui.mes = addMes(S.ui.mes, +el.dataset.v); render(); },
  area: el => trocarEspaco(el.dataset.v)
};
document.addEventListener('click', e => {
  if (menuEl && !e.target.closest('.menu')) fecharMenu();
  const el = e.target.closest('[data-a]'); if (!el) {
    if ($('#side').classList.contains('open') && !e.target.closest('#side')) $('#side').classList.remove('open');
    return;
  }
  const f = ACTIONS[el.dataset.a]; if (!f) return;
  if (el.tagName === 'A' && !el.getAttribute('href')) e.preventDefault();
  e.stopPropagation(); f(el, e);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { fecharMenu(); fecharModal(); } });
addEventListener('hashchange', () => { render(); scrollTo(0, 0); });
addEventListener('resize', fecharMenu);
// Ao voltar para a aba, atualiza (outra pessoa pode ter lançado algo)
let ultimoSync = Date.now();
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && S.perfil && Date.now() - ultimoSync > 60e3) {
    ultimoSync = Date.now(); try { await carregarTudo(); render(); } catch (e) {}
  }
});

/* ===================== Início ===================== */
async function boot() {
  if (!window.CASA_CONFIG || !window.supabase) { document.body.innerHTML = '<p style="padding:24px">Erro ao carregar o sistema. Recarregue a página.</p>'; return; }
  S.sb = window.supabase.createClient(CASA_CONFIG.url, CASA_CONFIG.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  S.ui.mes = mesKey(S.hoje);
  let recuperando = /type=recovery/.test(location.hash);
  window.__recOk = () => { recuperando = false; };
  S.sb.auth.onAuthStateChange((ev, session) => {
    S.session = session;
    if (ev === 'PASSWORD_RECOVERY') { recuperando = true; return setTimeout(() => telaAcesso('novasenha'), 0); }
    if (ev === 'SIGNED_OUT' || !session) { S.perfil = null; return telaAcesso('entrar'); }
    if (recuperando) return setTimeout(() => telaAcesso('novasenha'), 0);
    if (ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION') { if (!S.perfil) setTimeout(iniciarApp, 0); }
  });
}
document.addEventListener('DOMContentLoaded', boot);
