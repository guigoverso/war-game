'use strict';
// ---------- Guerra: estado salvo (Fase 6; números em WAR, js/modifiers/war-modifiers.js) ----------
// STATE.war guarda só a CAMPANHA; quem está em guerra com o jogador continua em STATE.rel[fid].war (factions.js).
//  fat    fadiga de guerra do jogador (0 a WAR.fatigue.max)
//  nfat   fadiga simples de cada facção NPC {fid: n}
//  camps  campanha por inimigo principal {fid: {kind:'attack'|'defense', since:rodada, allies:{player:[fid], enemy:[fid]}}}
//  ops    operações planejadas na rodada: {type, target, fid, cost}
//  inc    ataques inimigos pendentes (viram operação de Defesa no turno do Líder seguinte): {fid, target}
//  log    log narrativo da guerra: [{round, id, args, result}] (texto montado na hora por warEventText, texts/war-event-texts.js)
// Os pontos de líder gastos são os de STATE.rd.actions (econ.js). Ainda não há batalhas (itens 6 a 13 do plano da fase 6).
const warNew = () => ({ fat: 0, nfat: {}, camps: {}, ops: [], inc: [], log: [], trace: [] });   // trace: POIs de guerra que ficaram como rastro depois da paz (warfront.js)
Hooks.on('resetState', () => { STATE.war = warNew(); });
// Acessor: cria o estado se faltar (partida nova ou save antigo) e completa campos que faltem.
function warX() {
  const W = STATE.war || (STATE.war = warNew()), d = warNew();
  for (const k in d) if (W[k] === undefined) W[k] = d[k];
  return W;
}
// Há campanha de guerra do jogador em andamento?
const warActive = () => Object.keys(warX().camps).length > 0;
// Marco de fadiga atual do jogador (0 a 3) e acréscimo de suprimento correspondente.
const warMark = () => warFatigueMark(warX().fat);
const warSupply = () => warSupplyBonus(warX().fat);
// Registra um evento no log da guerra (rodada atual). id = chave de WAR_EV; result = 'success' | 'failed'. Guarda só as
// últimas WAR.logMax rodadas.
function warLog(id, args, result) {
  const W = warX(); W.log.push({ round: STATE.round, id, args: args || [], result: result || 'success' });
  const min = STATE.round - WAR.logMax + 1;
  W.log = W.log.filter(e => e.round >= min);
}
// Aplica o estado lido de um save (save.js).
function warApply(s) { STATE.war = Object.assign(warNew(), s || {}); }

// ---------- Cenário controlado: guerra (?cenario=guerra; item A4 da fase 6) ----------
// Semente 11, modo criativo, guerra JÁ declarada contra a facção NPC com mais cidades (forçada agressiva), POIs permanentes
// divididos (metade com você; ímpar: o inimigo fica com a maioria). Números em WAR.scenario. Painel na aba Facções da pausa.
const WARSCN = { on: false, fid: 0 };
const warPois = () => (WORLD.pois || []).filter(p => !p.show && p.type !== 'ruins');
function warScenario() {
  const S = WAR.scenario;
  WARSCN.on = true; G.introBook = false; STATE.phase = 'commander'; STATE.round = S.round; P.coins = S.coins;
  STATE.res.food = S.food; STATE.res.ore = S.ore;
  facSetIdentity({ name: 'Cenário de guerra' });
  const npc = () => WORLD.cities.filter(c => c.owner === 'enemy'), cnt = f => npc().filter(c => c.fid === f).length;
  // facção do alvo: a da cidade inimiga cuja trilha tem mais POIs (para o teste das operações ter por onde atacar)
  const trail = c => { const r = warCanTarget(c.fid, 'city', c) && warFrontCheck(c.fid, 'city', c); return r && r.plan ? r.plan.chain.length + r.plan.war.length : -1; };
  const best = npc().sort((a, b) => trail(b) - trail(a))[0];
  const en = best && trail(best) >= 0 ? WORLD.factions.find(f => f.id === best.fid)
    : WORLD.factions.filter(f => cnt(f.id)).sort((a, b) => cnt(b.id) - cnt(a.id))[0];
  en.temper = 'agressiva'; WARSCN.fid = en.id;
  // cidades conquistadas: as de menor rank das outras facções
  for (let k = 0; k < S.extraCities; k++) {
    const c = npc().filter(x => x.fid !== en.id).sort((a, b) => a.rank - b.rank)[0];
    if (c) polTakeCity(c);
  }
  STATE.rd.lvl = S.lvl; STATE.rd.actions = maxActions(); computeBuffs();
  if (S.splitPois) warSplitPois(en.id);
  if (!S.startAtWar) return;   // em paz: a declaração fica por sua conta (Negociações)
  facDeclareWar(en.id, false);
  warX().camps[en.id] = { kind: 'attack', since: STATE.round, allies: { player: [], enemy: [] } };
  // frente contra a cidade inimiga de trilha mais longa (alvo padrão); sem rota, o aviso diz por quê
  const tgt = npc().filter(c => c.fid === en.id && warCanTarget(en.id, 'city', c)).sort((a, b) => trail(b) - trail(a))[0];
  const r = tgt && warFrontCheck(en.id, 'city', tgt);
  if (r && r.plan) warFrontBuild(r.plan); else WARSCN.noFront = r ? r.erro : TXT_WAR_NO_ROUTE;
}
// Divide os POIs permanentes: os mais perto de você (em relação ao inimigo) ficam seus; o resto, do inimigo.
function warSplitPois(fid) {
  const h = WORLD.home, ec = WORLD.cities.filter(c => c.fid === fid && c.owner === 'enemy');
  const dE = p => Math.min(...ec.map(c => Math.hypot(p.cx - c.cx, p.cz - c.cz)));
  const key = p => Math.hypot(p.cx - h.cx, p.cz - h.cz) - dE(p);
  const L = warPois().sort((a, b) => key(a) - key(b)), nMine = warScenarioPlayerPois(L.length);
  L.forEach((p, i) => poiSetOwner(p, i < nMine ? 'player' : fid));
}
// Teletransporta o jogador para perto de (x, z), olhando para o ponto.
function warScnGo(x, z) {
  const f = freeSpot(x, z + 12, 0.5, 1.8, 0.45);
  P.x = f[0]; P.z = f[1]; P.y = tH(P.x, P.z) + 0.1; P.vx = P.vz = P.vy = 0; P.camY = P.y;
  P.yaw = Math.atan2(-(x - P.x), -(z - P.z)); P.pitch = -0.05;
}
// POI mais perto de você cujo dono é o (id de facção ou 'player'); null se não houver.
function warScnNearest(o) {
  const d = p => Math.hypot(p.cx - P.x, p.cz - P.z);
  return warPois().filter(p => p.owner === o).sort((a, b) => d(a) - d(b))[0] || null;
}
// POI da linha da frente (ou o POI-alvo) que ainda não é seu, o mais perto de você; null se não restar.
function warScnNearestLine(ln) {
  const d = p => Math.hypot(p.cx - P.x, p.cz - P.z), L = ln.pois.concat(ln.kind === 'poi' && ln.target ? [ln.target] : []);
  return L.filter(p => p.owner !== 'player').sort((a, b) => d(a) - d(b))[0] || null;
}
// Linha do painel: a cadeia em ordem (cada POI com o dono; ▶ o próximo a conquistar) e se a Conquista de Cidade está liberada.
function warScenarioFrontHtml() {
  const ln = warFrontLine(WARSCN.fid);
  if (!ln) return '';
  const items = ln.pois.map(p => ({ n: POI_DEFS[p.type].n, o: poiOwnerName(p.owner), mine: p.owner === 'player', next: warFrontCanConquer(ln, p) }));
  const tn = ln.target ? (ln.kind === 'city' ? ln.target.name : POI_DEFS[ln.target.type].n) : '?';
  return '<p class="ldsm">' + txtWarScnChain(items, tn, ln.kind, warFrontReleased(ln)) + '</p>';
}
function warScenarioAfter() {
  toast(txtWarScnWelcome(facOf(WARSCN.fid).name), 9000);
  if (WARSCN.noFront) toast(WARSCN.noFront, 6000);
}
function warScenarioHtml() {
  const L = warPois(), a = L.filter(p => p.owner === 'player').length, b = L.filter(p => p.owner === WARSCN.fid).length;
  const B = (k, t) => '<button class="alt" data-wsn="' + k + '" style="margin:2px">' + t + '</button>';
  return '<p class="ptitle">' + TXT_WAR_SCN_TITLE + '</p><p class="ldsm" style="margin:2px 0 4px">' + TXT_WAR_SCN_HELP + '</p>'
    + '<p class="ldsm">' + txtWarScnSummary(facOf(WARSCN.fid).name, a, b, L.length - a - b) + '</p>'
    + warScenarioFrontHtml() + B('city', '📍 Cidade inimiga') + B('poi', '📍 POI inimigo') + B('conq', '🏴 Conquistar POI') + B('lose', '🏳 Perder POI')
    + B('end', '⏭ Encerrar a rodada') + B('heal', '♥ Curar tudo')
    + '<br><button class="alt" data-scn="reload">↻ Recomeçar o cenário</button><hr style="border-color:#444">';
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-wsn]'); if (!b || !WARSCN.on) return;
  const k = b.dataset.wsn, f = WARSCN.fid, say = m => toast(m, 3500);
  if (k === 'city') {
    const c = WORLD.cities.find(x => x.fid === f && x.owner === 'enemy');
    if (c) { closePanel(); warScnGo(c.cx, c.cz + c.half + 6); }
  } else if (k === 'poi') {
    const p = warScnNearest(f); if (!p) return say(TXT_WAR_SCN_NO_POI);
    closePanel(); warScnGo(p.cx, p.cz);
  } else if (k === 'conq') {
    const ln = warFrontLine(f);
    // com frente: o POI da linha (ou o alvo) mais perto de você que ainda não é seu; só o adjacente é aceito
    const p = ln ? warScnNearestLine(ln) : warScnNearest(f); if (!p) return say(TXT_WAR_SCN_NO_POI);
    if (ln && !warFrontCanConquer(ln, p)) return say(txtWarScnNotAdjacent(POI_DEFS[p.type].n));
    poiSetOwner(p, 'player'); say(txtWarScnConquered(POI_DEFS[p.type].n));
  } else if (k === 'lose') {
    const p = warScnNearest('player'); if (!p) return say(TXT_WAR_SCN_NO_POI);
    poiSetOwner(p, f); say(txtWarScnLost(POI_DEFS[p.type].n, facOf(f).name));
  } else if (k === 'end') { closePanel(); endRound(WORLD.home); }
  else if (k === 'heal') P.hp = P.maxhp;
  if (typeof renderFacCheats === 'function') renderFacCheats();
  if (G.panel === 'ldbook' && LB.tab === 'guerra') renderBook();   // atalhos da aba Guerra do caderno
});
