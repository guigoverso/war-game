'use strict';
// ---------- Aba Guerra do livro (feature operações de guerra; docs/features/4_operacoes-de-guerra.md) ----------
// Esquerda: cabeçalho, bandeiras, alvo e os botões Resumo / Lançar operações / Territórios. Direita: a seção escolhida.
// Navegação em LB.wsec ('summary' | 'ops' | 'terr') e LB.wtab (aba de operação). Cliques: data-wa. Textos em war-book-texts.js.
const WAR_OP_TAB_ORDER = ['attack', 'defense', 'sabotage', 'other'];

// Facção inimiga da guerra em curso (a primeira campanha, ou guerra forçada sem campanha); undefined se não há guerra.
function warMainFid() {
  const ids = Object.keys(warX().camps).map(Number);
  for (const f of WORLD.factions || []) if (relOf(f.id).war && !ids.includes(f.id)) ids.push(f.id);
  return ids[0];
}
const warChip = id => '<i style="color:' + hex6(facColor(id) || 0xffffff) + ';font-style:normal">■</i> ';
const warFacName = id => warChip(id) + ((facOf(id) || {}).name || '?');
const warPoiName = p => POI_DEFS[p.type].n;
const warRedDot = '<i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#d02020;margin-left:5px"></i>';

// Tabela de lados (mesmo desenho da rebelião, rebSidesTable): você e seus aliados × o inimigo e os dele.
function warSidesTable(fid) {
  const al = (warX().camps[fid] || {}).allies || { player: [], enemy: [] }, S = TXT_WAR_SIDES;
  const L = ['<b>' + warFacName(0) + '</b> ' + S.you].concat((al.player || []).map(warFacName));
  const R = ['<b>' + warFacName(fid) + '</b>'].concat((al.enemy || []).map(warFacName));
  let h = '<table style="width:100%;margin:8px 0;border-collapse:collapse;font-size:15px"><tr style="color:#6a5434;font-size:13px">'
    + '<td style="width:45%">' + S.mine + '</td><td></td><td>' + S.enemy + '</td></tr>';
  for (let i = 0; i < Math.max(L.length, R.length); i++) {
    h += '<tr><td style="padding:2px 0">' + (L[i] || '') + '</td><td style="text-align:center;width:10%;color:#a03a10"><b>X</b></td><td>'
      + (R[i] || '') + '</td></tr>';
  }
  return h + '</table>';
}
// Log narrativo: rodadas da mais recente para a mais antiga, cada uma com suas frases.
function warLogHtml() {
  const log = warX().log.slice().reverse().filter(e => warEventText(e));
  if (!log.length) return TXT_WAR_LOG_EMPTY;
  let h = '', rd = null;
  for (const e of log) {
    if (e.round !== rd) { h += (rd === null ? '' : '</ul>') + '<h5>' + txtWarLogRound(e.round) + '</h5><ul class="ldul">'; rd = e.round; }
    h += '<li>' + warEventText(e) + '</li>';
  }
  return h + '</ul>';
}
const warOpsHere = () => warX().ops.filter(o => o.round === STATE.round);
// Descrição de uma operação lançada (botão e popup): "Ataque a Fazenda contra Bandidos".
function warOpName(op) {
  const p = warOpPoi(op);
  return txtWarOpLabel(op.type, p ? warPoiName(p) : '?', poiOwnerName(op.of !== undefined ? op.of : p ? p.owner : 'none'));
}
const warMapBtn = (k, id) => ' <button class="ldmini" data-wa="' + k + '" data-id="' + id + '" title="' + TXT_WAR_MAP_BTN
  + '" style="font-size:11px;padding:0 4px;margin:0 0 0 4px">📍</button>';
// Mapa num popup (não troca o livro de aba, para não fechar o livro nem encerrar o turno sem querer). poi/city = id a destacar
// (anel dourado); sem nenhum, mostra só a frente da guerra. Botões: nomes dos POIs (G.poiNames) e Fechar.
let warMapWin = null;
function warMapShow(poi, city) {
  G.poiFocus = poi === undefined ? null : poi; G.cityFocus = city === undefined ? null : city;
  const sz = Math.max(260, Math.min(520, innerWidth - 80, innerHeight - 210));
  if (!warMapWin) {
    const names = UI.button('', 'alt', () => { G.poiNames = !G.poiNames; warMapDraw(); });
    warMapWin = UI.window({ title: '', width: Math.min(560, innerWidth - 30), z: 70, onClose: () => { G.poiFocus = null; G.cityFocus = null; } });
    warMapWin.names = names;
    warMapWin.foot.append(names, UI.button(TXT_WAR_POP.close, 'gold', () => warMapWin.close()));
  }
  warMapWin.setTitle(TXT_WAR_MAP_TITLE);
  warMapWin.body.innerHTML = '<canvas id="warmapcv" width="' + sz + '" height="' + sz + '" style="display:block;margin:0 auto;border:3px solid #111"></canvas>';
  warMapWin.open(); warMapDraw();
}
function warMapDraw() {
  warMapWin.names.textContent = txtWarMapNames(G.poiNames);
  drawBigMap(document.getElementById('warmapcv'));
}
const warShowPoi = id => warMapShow(id);
// Botão grande (operação disponível/lançada); why = motivo de estar desativado.
const warOpBtn = (a, id, label, why, extra) => '<button class="ldcity warop" data-wa="' + a + '" data-id="' + id + '"' + (why ? ' disabled' : '') + '><span>'
  + label + '</span>' + (extra ? '<small>' + extra + '</small>' : '') + (why ? '<em>' + why + '</em>' : '') + '</button>';

// Direita, Lançar operações: lançadas + disponíveis por aba.
function warOpsHtml(fid, ln) {
  const nav = LB.wtab || 'attack', T = TXT_WAR_OP_TABS, here = warOpsHere();
  let h = '<h4>' + TXT_WAR_SEC.launched + '</h4>'
    + (here.length ? here.map(o => warOpBtn('op', o.id, warOpName(o), null, TXT_WAR_OP_STATE[o.state])).join('') : TXT_WAR_LAUNCHED_EMPTY)
    + '<h4>' + TXT_WAR_SEC.available + '</h4><div class="ldsub2" style="margin-bottom:6px">'
    + WAR_OP_TAB_ORDER.map(k => '<button class="ldmini' + (nav === k ? ' sel' : '') + '" data-wa="tab" data-v="' + k + '" style="font-size:14px">'
      + T[k] + (k === 'defense' && warX().inc.length ? warRedDot : '') + '</button>').join(' ') + '</div>';
  if (!isLeader()) return h + TXT_WAR_OPS_LEADER_ONLY;
  const ph = key => warOpBtn('x', 0, TXT_WAR_OP_NAMES[key], WAR.ops[key].off, null);
  if (nav === 'attack') {
    const cost = warOpCost('attack');
    const cand = ln.pois.concat(ln.kind === 'poi' && ln.target ? [ln.target] : []).filter(p => p.owner !== 'player');
    h += cand.map(p => warOpBtn('pick', p.id, txtWarOpAvail(warPoiName(p), poiOwnerName(p.owner), cost), warOpCanAttack(fid, p), null)).join('');
    if (ln.kind === 'city' && ln.target) h += warOpBtn('x', 0, txtWarOpCityName(ln.target.name, warOpCost('city')), warOpCanCity(), null);
  } else if (nav === 'defense') {
    h += warX().inc.map(i => { const p = (WORLD.pois || []).find(q => q.id === i.target);
      return warOpBtn('x', 0, txtWarIncLabel(p ? warPoiName(p) : '?', (facOf(i.fid) || {}).name || '?'), WAR.ops.defense.off, null); }).join('')
      || ph('defense');
  } else if (nav === 'sabotage') h += ph('sabotage');
  else h += ph('reduceFatigue');
  return h;
}
// Direita, Territórios: só o que a trilha da guerra envolve (cidade de origem, cidade/POI alvo e os POIs da rota), por facção, com
// "ver no mapa". O alvo do conflito em vermelho escuro. Calculado ao abrir (reflete conquistas).
function warTerrHtml(fid, ln) {
  const al = (warX().camps[fid] || {}).allies || { player: [], enemy: [] };
  const org = WORLD.cities.find(c => c.id === ln.fr.originId), tc = ln.kind === 'city' ? ln.target : null;
  const pois = ln.pois.concat(ln.kind === 'poi' && ln.target ? [ln.target] : []);
  const block = (id, always) => {
    const cs = [org, tc].filter(c => c && c.fid === id), ps = pois.filter(p => p.owner === (id === 0 ? 'player' : id));
    if (!cs.length && !ps.length && !always) return '';
    const li = (n, k, i, tgt) => '<li' + (tgt ? ' style="color:#8a1a1a;font-weight:bold"' : '') + '>' + n + warMapBtn(k, i) + '</li>';
    const flag = '<img class="fe-img" src="' + facFlagURL(id, 4) + '" width="32" height="20" style="vertical-align:middle;margin-left:6px">';
    return '<h4>' + ((facOf(id) || {}).name || '?') + flag + '</h4>' + (cs.length || ps.length
      ? '<ul class="ldul">' + cs.map(c => li('🏘 ' + c.name, 'mapc', c.id, c === tc)).join('')
        + ps.map(p => li(warPoiName(p), 'mapp', p.id, p === ln.target)).join('') + '</ul>' : '<p class="ldsm">' + TXT_WAR_TERR.none + '</p>');
  };
  return block(0, true) + (al.player || []).map(id => block(id)).join('') + '<hr style="border-color:#9a7a44">'
    + block(fid, true) + (al.enemy || []).map(id => block(id)).join('');
}
// Aba Guerra do caderno (book.js): devolve [esquerda, direita].
function warBookPages() {
  const fid = warMainFid();
  if (fid === undefined) return [TXT_WAR_TAB_NONE, ''];
  const ln = warFrontLine(fid), en = (facOf(fid) || {}).name || 'Inimigo', sec = LB.wsec || 'summary', B = TXT_WAR_BTN;
  let L = '<h3>⚔ ' + txtWarHead(en) + '</h3>';
  if (!ln || !ln.target) return [L + TXT_WAR_TAB_NOFRONT, ''];
  const tn = ln.kind === 'city' ? ln.target.name : warPoiName(ln.target);
  L += '<div style="display:flex;align-items:center;gap:10px"><img class="fe-img" src="' + facFlagURL(0, 4) + '" width="96" height="60">'
    + '<b style="font-size:22px;color:#a03a10">X</b><img class="fe-img" src="' + facFlagURL(fid, 4) + '" width="96" height="60"></div>'
    + '<p>' + txtWarTarget(tn, ln.kind) + (ln.kind === 'city' ? warMapBtn('mapc', ln.target.id) : warMapBtn('mapp', ln.target.id)) + '</p>'
    + txtWarTabState(ln.kind, warFrontReleased(ln))
    + ['summary', 'ops', 'terr'].map(k => '<button class="ldcity' + (sec === k ? ' sel' : '') + '" data-wa="sec" data-v="' + k + '"><span>'
      + B[k] + '</span></button>').join('')
    + '<button data-wa="front" class="gold" style="margin-top:6px">' + TXT_WAR_FRONT_BTN + '</button>';
  if (typeof WARSCN !== 'undefined' && WARSCN.on) {   // cenário de guerra: atalhos de teste aqui também (sem modo criativo)
    L += TXT_WAR_TAB_SCN + '<button data-wsn="poi" class="alt">📍 Ir ao POI inimigo</button> '
      + '<button data-wsn="conq" class="alt">🏴 Conquistar POI</button>';
  }
  const R = sec === 'ops' ? '<h3>' + B.ops + '</h3>' + warOpsHtml(fid, ln)
    : sec === 'terr' ? '<h3>' + B.terr + '</h3>' + warTerrHtml(fid, ln)
    : '<h3>' + B.summary + '</h3>' + warSidesTable(fid) + '<h4>' + TXT_WAR_SEC.log + '</h4>' + warLogHtml();
  return [L, R];
}

// Popup de detalhes do ataque ao POI id: confirmar lança a operação (warOpPlan) e ela passa para "lançadas".
function warOpDetail(id) {
  const fid = warMainFid(), p = (WORLD.pois || []).find(q => q.id === id), ln = fid !== undefined && warFrontLine(fid);
  if (!p || !ln) return;
  const i = ln.pois.indexOf(p), wait = i >= 0 && !!(warOpLink(ln, i) || {}).after;
  const w = UI.window({ title: '⚔ ' + TXT_WAR_POP.launch, width: 460, z: 60 });
  w.body.innerHTML = txtWarOpDetail(warPoiName(p), poiOwnerName(p.owner), warOpCost('attack'), wait, WAR.garrisonMin);
  const done = () => { w.close(); w.el.remove(); };
  w.foot.append(UI.button(TXT_WAR_POP.confirm, 'gold', () => {
    const r = warOpPlan(fid, p); done();
    if (!r.ok) toast(r.why, 3500);
    if (G.panel === 'ldbook') renderBook();
  }), UI.button(TXT_WAR_POP.map, 'alt', () => { done(); warShowPoi(p.id); }), UI.button(TXT_WAR_POP.back, 'alt', done));
  w.open();
}
// Popup de resumo de uma operação lançada; no turno do Líder permite cancelar (devolve o ponto).
function warOpSummary(id) {
  const op = warOpById(id); if (!op) return;
  const w = UI.window({ title: '⚔ ' + TXT_WAR_POP.summary, width: 440, z: 60 });
  w.body.innerHTML = txtWarOpSummary(warOpName(op), TXT_WAR_OP_STATE[op.state], op.cost, op.state === 'aguarda');
  const done = () => { w.close(); w.el.remove(); };
  if (isLeader() && (op.state === 'aguarda' || op.state === 'ativa')) {
    w.foot.append(UI.button(TXT_WAR_POP.cancelOp, 'red', () => { warOpCancel(id); done(); if (G.panel === 'ldbook') renderBook(); }));
  }
  if (warOpPoi(op)) w.foot.append(UI.button(TXT_WAR_POP.map, 'alt', () => { done(); warShowPoi(op.target); }));
  w.foot.append(UI.button(TXT_WAR_POP.close, 'alt', done));
  w.open();
}
// Ao encerrar o turno do Líder em guerra com pontos sobrando e nenhuma operação lançada: pergunta antes. Devolve true se abriu o
// popup (finishLeaderTurn deve parar); "Encerrar mesmo assim" chama proceed.
function warLeftoverAsk(proceed) {
  if (!warActive() || !isLeader() || STATE.rd.actions <= 0 || !WAR.ops.attack.on) return false;
  const fid = warMainFid();
  if (fid === undefined || !warFrontLine(fid) || warOpsHere().some(o => o.state !== 'falha')) return false;
  const w = UI.window({ title: '⚔ ' + TXT_WAR_BTN.ops, width: 420, z: 60 });
  w.body.innerHTML = '<p>' + txtWarLeftoverPopup(STATE.rd.actions) + '</p>';
  const done = () => { w.close(); w.el.remove(); };
  w.foot.append(UI.button(TXT_WAR_LEFTOVER_BTN.end, 'red', () => { done(); proceed(); }), UI.button(TXT_WAR_LEFTOVER_BTN.back, 'alt', done));
  w.open();
  return true;
}

// Cliques da aba (data-wa). Ver no mapa: popup warMapShow (POI usa G.poiFocus; cidade, G.cityFocus; anel em drawBigMap, game.js).
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('#ldbook [data-wa]'); if (!b) return;
  const k = b.dataset.wa, id = +b.dataset.id;
  if (k === 'sec') LB.wsec = b.dataset.v;
  else if (k === 'tab') LB.wtab = b.dataset.v;
  else if (k === 'pick') { warOpDetail(id); return; }
  else if (k === 'op') { warOpSummary(id); return; }
  else if (k === 'front') { warMapShow(); return; }
  else if (k === 'mapp') { warShowPoi(id); return; }
  else if (k === 'mapc') { warMapShow(undefined, id); return; }
  renderBook();
}, true);   // fase de captura: bookClick (book.js) redesenha o livro e soltaria o botão antes deste tratador
