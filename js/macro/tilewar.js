'use strict';
// ---------- Integração do tile com o macro (passo 10 de docs/features/12_batalha-no-tile.md). Camada macro: sem Three.js nem DOM ----------
// Três peças, todas guardadas na ficha do tile (STATE.tiles[chave], js/macro/tilestate.js; campo ausente = nenhum):
//  1) Cerco (4B-18): ficha.cerco = {ataq, cidade, left, ini, entrada}. O prazo é em AÇÕES do jogador (WAR.siege: cidade 5, outro tile 3). Cada ação gasta tira 1
//     (siegeTick); se o batalhão chega antes de zerar vira Defesa (siegeArrive); se zera, o tile cai sem cálculo (siegeFall) e os POIs dele vão junto. O cerco só vale
//     dentro do turno do Comandante: no fim do turno (siegeEndTurn) o que sobrou do prazo passa e o tile cai de qualquer jeito (nada é carregado para a rodada seguinte).
//  2) Fadiga de guerra (4B-13): tileWarFatigue(war, ...) soma em STATE.war.fat / nfat conforme o resultado; sem guerra ativa não mexe em nada.
//  3) Cicatrizes (camada 3 das marcas de guerra): ficha.cicatriz = [id de micro-POI de LEGO_MICRO.list]; só em tile onde houve luta. A geração do tile as monta (tcScars).
// Improviso de guerra (camada 2): tileWarWhy diz se o tile merece acampamento/atalaia/sacos na estrada (batalha, cerco ou batalhão inimigo no tile).

// ---- cerco ----
const siegeDays = cidade => cidade ? WAR.siege.city : WAR.siege.other;
const siegeGet = key => { const s = tileStatesAll()[key]; return s && s.cerco ? Object.assign({}, s.cerco) : null };
const siegeList = () => Object.keys(tileStatesAll()).filter(k => tileStatesAll()[k].cerco);
// Começa o cerco de `ataq` (facção ou 'bandit') ao tile; entrada = abertura por onde o inimigo chegou (acampamento improvisado). Devolve false se já está cercado.
function siegeStart(key, ataq, cidade, entrada) {
  const s = tileSt(key); if (s.cerco) return false;
  const n = siegeDays(cidade);
  s.cerco = { ataq, cidade: !!cidade, left: n, ini: n, entrada: entrada || null };
  if (typeof rdNow === 'function') rdNow(txtSiegeStart(key, n));
  return true;
}
// Uma ação do jogador (n ações): desce a contagem. Devolve 'caiu' se o tile caiu, 'cerco' se segue cercado, null se não há cerco.
function siegeTick(key, n) {
  const s = tileStatesAll()[key]; if (!s || !s.cerco) return null;
  s.cerco.left -= n === undefined ? 1 : n;
  if (s.cerco.left <= 0) { siegeFall(key); return 'caiu' }
  if (typeof rdNow === 'function') rdNow(txtSiegeTick(key, s.cerco.left));
  return 'cerco';
}
// O tile cai: o dono passa a ser o atacante e os POIs vão junto (ficha.tomado). Devolve o atacante.
function siegeFall(key) {
  const s = tileSt(key), ataq = s.cerco ? s.cerco.ataq : null;
  s.cerco = null; s.dono = ataq; s.tomado = true;
  if (typeof rdNow === 'function') rdNow(txtSiegeFall(key));
  return ataq;
}
// O batalhão do jogador chega ao tile cercado: o cerco acaba e a luta vira Defesa (batalha grande, o jogador é teleportado). Devolve o descritor {tipo, entrada, donoAtacante,
// origem} ou null (sem cerco: nada a defender).
function siegeArrive(key) {
  const s = tileStatesAll()[key]; if (!s || !s.cerco) return null;
  const c = s.cerco; s.cerco = null;
  return { tipo: 'defesa', entrada: c.entrada, donoAtacante: c.ataq, origem: 'cerco' };
}
// Fim do turno do Comandante: todo cerco ainda aberto derruba o tile. Devolve [{key, ataq}] dos tiles que caíram.
function siegeEndTurn() {
  const out = [];
  for (const k of siegeList()) out.push({ key: k, ataq: siegeFall(k) });
  return out;
}

// ---- fadiga de guerra (4B-13) ----
// war = STATE.war (null = sem guerra: não mexe em nada); com guerra declarada entre as facções (o.guerra, relStatus) vale mesmo sem campanha. o = {modo: 'ataque'|'defesa'|'choque'|'pequena', res: 'vitoria'|'derrota', fid: facção inimiga}.
// Atacar soma attackPoi; defesa vencida soma defendPoi; derrota soma opFailed; vencer soma na fadiga simples do inimigo (nfat), perder tira a do vencedor. Devolve a mudança.
function tileWarFatigue(war, o) {
  const camps = war && war.camps ? Object.keys(war.camps).length : 0;
  if (!war || (!camps && !o.guerra)) return null;
  const F = WAR.fatigue, mx = F.max, win = o.res === 'vitoria', mode = o.modo === 'pequena' ? 'ataque' : o.modo;
  let d = 0;
  if (mode === 'ataque') d += F.gain.attackPoi;
  if (win && mode === 'defesa') d += F.gain.defendPoi;
  if (!win) d += F.gain.opFailed;
  const antes = war.fat || 0;
  war.fat = Math.min(mx, Math.round((antes + d) * 100) / 100);
  if (o.fid !== undefined && o.fid !== null && o.fid !== 'bandit') {
    war.nfat = war.nfat || {};
    const cur = war.nfat[o.fid] || 0, ch = win ? F.npc[WAR.tileFat.enemyLoss[o.modo] || 'lostBattle'] : F.npc.wonBattle;
    war.nfat[o.fid] = Math.max(0, cur + ch);
  }
  return { fat: war.fat - antes };
}

// ---- cicatrizes ----
const tileScars = key => { const s = tileStatesAll()[key]; return s && s.cicatriz ? s.cicatriz.slice() : [] };
// Registra a cicatriz de uma luta (modo: 'ataque'|'defesa'|'choque'|'pequena'; grande = batalha grande). Escolha determinística (sem sorteio): gira pela lista do tipo.
function tileScarAdd(key, modo, grande) {
  const ks = TILE_SCAR.kinds[modo] || TILE_SCAR.kinds.choque, s = tileSt(key), n = grande ? TILE_SCAR.grande : TILE_SCAR.pequena;
  s.cicatriz = s.cicatriz || [];
  for (let i = 0; i < n; i++) s.cicatriz.push(ks[(s.cicatriz.length + i) % ks.length]);
  while (s.cicatriz.length > TILE_SCAR.max) s.cicatriz.shift();
  return s.cicatriz.slice();
}

// ---- improviso de guerra ----
// Por que o tile ganha acampamento/atalaia/sacos: 'batalha' (há descritor), 'cerco', 'batalhao' (batalhão de outro dono no tile) ou null (nada é montado).
function tileWarWhy(key, battle) {
  if (battle) return 'batalha';
  if (siegeGet(key)) return 'cerco';
  return batAt(key).some(b => b.dono !== 'player') ? 'batalhao' : null;
}

// ---- fim da batalha: consequências no macro (4B-3 e 4B-13) ----
// o = {key: tile, modo: 'ataque'|'defesa'|'choque'|'pequena', res: 'vitoria'|'derrota', grande, bat: id do batalhão do jogador (opcional), mortos: soldados que morreram,
// origem: tile de onde o batalhão veio, fid: facção inimiga, war: STATE.war}. Faz, na ordem: fadiga (só com guerra), baixas (quem morre sai para sempre), derrota (grande: o
// batalhão é destruído; pequena: recua ao tile de origem e mantém o resto), vitória (ataque e pequena: o tile e os POIs dele passam ao jogador; defesa: continua seu; choque: o
// campo é seu, o tile não muda) e cicatriz do tile. A punição de ouro e munição da derrota grande é de quem chama (ouro/inventário não são macro). Devolve um resumo.
function tileBattleEnd(o) {
  const win = o.res === 'vitoria', b = o.bat ? batGet(o.bat) : null, out = { fat: null, tile: null, bat: null };
  out.fat = tileWarFatigue(o.war, { modo: o.modo, res: o.res, fid: o.fid, guerra: o.guerra });
  if (b && o.mortos > 0 && !(!win && o.grande)) batLoseAny(b, o.mortos);
  if (b && !win) {
    if (o.grande) { batDestroy(b.id); out.bat = 'destruido' } else { if (o.origem) batMove(b, o.origem); out.bat = 'recuou' }
  }
  if (win && (o.modo === 'ataque' || o.modo === 'pequena')) { tileOwnerSet(o.key, 'player'); out.tile = 'conquistado' }
  if (!win && o.modo === 'defesa') { tileOwnerSet(o.key, o.fid === undefined ? null : o.fid); out.tile = 'perdido' }
  if (o.modo !== 'nucleo') tileScarAdd(o.key, o.modo, !!o.grande);
  batSnapDrop();
  return out;
}
