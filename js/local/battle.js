'use strict';
// ---------- Batalha no tile: núcleo (feature 12, passo 1; docs/features/12_batalha-no-tile.md, seções 4A, 4B e 5) ----------
// Peças reutilizáveis pelos modos seguintes (Choque, Defesa, Ataque): GERADOR (ponto que lança soldados em lotes, com raio de ativação, reserva própria e coleira),
// cota de vivos, reposição do lado do jogador, placar, pop-ups de fim e ajuste em tempo real. Os soldados lançados são inimigos normais (spawnEnemy) de uma "área"
// de batalha (mesma forma da área de raid: state 'attacking', kind 'raid'), então os soldados do jogador (allies.js) os enxergam e a ordem de movimento (V/X) vale.
// Passo 1 = só o modo ?cenario=batalha&modo=nucleo: um gerador num mapa aberto, o jogador começa fora do raio. Números em modifiers/battle-modifiers.js,
// textos em texts/battle-texts.js. Nada daqui roda fora do cenário de teste (BATTLE.on é falso) e nada é salvo (4B-17).
const BATTLE = { on: false, over: false, mode: '', area: null, gens: [], base: null, rng: null, lot: [3, 5], delay: 3, liveCap: 30, allyCap: 20,
  ally: { reserve: 0, total0: 0, lot: null, nextAt: 0 }, total0: 0, t: 0, scanT: 0, hudT: 0, last: 0, fps: 60, hud: null, hudOn: true };

const battleOn = () => BATTLE.on && !BATTLE.over;

// Número vindo da URL (?chave=N) ou o padrão.
function battleParam(key, def) {
  const v = new URLSearchParams(location.search).get(key);
  return v === null || v === '' || isNaN(+v) ? def : +v;
}

// Sorteio inteiro entre a e b, inclusive; reproduzível com ?semente=N (só nos testes).
const battleRand = (a, b) => BATTLE.rng ? BATTLE.rng.int(a, b) : Math.floor(a + (b - a + 1) * Math.random());
// Tamanho do próximo lote (sorteio entre o mínimo e o máximo do lote ajustável).
const battleDrawLot = () => battleRand(Math.min(BATTLE.lot[0], BATTLE.lot[1]), Math.max(BATTLE.lot[0], BATTLE.lot[1]));
// O lote pendente de um gerador (ou da reposição do jogador) é sorteado quando preciso; ajustar o lote em tempo real zera o pendente.
const battleLotOf = o => o.lot || (o.lot = battleDrawLot());

// Faixa circular colada ao terreno (raio r, largura w), para ver os raios no chão.
function battleRing(cx, cz, r, color, w) {
  const N = 96, pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const a = i / N * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    for (const rr of [r - w / 2, r + w / 2]) { const x = clamp(cx + c * rr, 1, W - 2), z = clamp(cz + s * rr, 1, W - 2); pos.push(x, tH(x, z) + 0.35, z); }
  }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
  m.frustumCulled = false; scene.add(m); return m;
}

// Área de batalha: onde "moram" os soldados lançados. O centro acompanha o jogador (os soldados dele seguem o centro da área em modo de assalto).
function battleMakeArea() {
  const a = { kind: 'raid', btl: true, id: 800, name: 'Batalha', cx: P.x, cz: P.z, y: P.y, half: BATTLE_MOD.areaHalf, biome: 0, rank: 1, hpMul: 1, state: 'attacking',
    owner: 'enemy', home: false, enemies: [], npcs: [], walk: [], flags: [], aliveEnemies: 0, totalEnemies: 0, leash: 999 };
  WORLD.areas.push(a); return a;
}

// Gerador: marca no chão (mastro e bandeira), reserva própria, raio de ativação e coleira. Começa dormindo.
function battleAddGen(x, z, reserve) {
  const y = tH(x, z), grp = new THREE.Group();
  part(grp, GEO_BOX, 0.4, 3.2, 0.4, 0x4a3a2a, 0, 1.6, 0); part(grp, GEO_BOX, 1.5, 0.9, 0.1, 0xb02020, 0.85, 2.7, 0);
  grp.position.set(x, y, z); scene.add(grp);
  const g = { x, z, y, radius: BATTLE_MOD.genRadius, reserve, reserve0: reserve, awake: false, lot: null, nextAt: 0, group: grp };
  if (BATTLE_MOD.showRings && new URLSearchParams(location.search).get('raios') !== '0') {
    g.ring = battleRing(x, z, g.radius, BATTLE_MOD.ringColor, 0.8);
    g.leashRing = battleRing(x, z, g.radius * BATTLE_MOD.leashMul, BATTLE_MOD.leashColor, 0.5);
  }
  BATTLE.gens.push(g); return g;
}

// Lança um soldado em volta do gerador, já em guarda (reage ao jogador).
function battleSpawnFrom(g) {
  const R = BATTLE_MOD.spawnRing, a = Math.random() * 6.283, r = R[0] + Math.random() * (R[1] - R[0]);
  const e = spawnEnemy(BATTLE.area, BATTLE_MOD.enemyType, g.x + Math.cos(a) * r, g.z + Math.sin(a) * r);
  e.btl = g; e.aggro = true; e.unseenT = 99; e.reactT = 0.4 + Math.random() * 0.4; e.homeX = g.x; e.homeZ = g.z;
  return e;
}

// Coleira (chamada por updateEnemy): o soldado lançado só persegue enquanto o gerador está acordado e ele está dentro de raio x fator; fora disso volta ao gerador
// (e.recall) e só deixa de voltar ao chegar perto (ou ao raio de ativação, se o gerador estiver acordado). Devolve se está ativo (em combate).
function battleEnemyActive(e) {
  const g = e.btl, dg = Math.hypot(e.x - g.x, e.z - g.z), home = BATTLE_MOD.homeDist;
  if (e.recall && dg <= (g.awake ? g.radius : home)) { e.recall = null; e.spreadT = 0; }
  if (!e.recall && (!g.awake || dg > g.radius * BATTLE_MOD.leashMul) && dg > home) { e.recall = g; e.spreadT = 0; }
  return !e.recall && !P.dead && !BATTLE.over;
}

// Gera os lotes dos geradores acordados: só quando a cota de vivos comporta o lote inteiro e passou o atraso desde o lote anterior.
function battleTickGens() {
  const A = BATTLE.area, lm = BATTLE_MOD.leashMul;
  let live = A.aliveEnemies;
  for (const g of BATTLE.gens) {
    const dp = P.dead ? 1e9 : Math.hypot(P.x - g.x, P.z - g.z);
    if (!g.awake && dp < g.radius) g.awake = true; else if (g.awake && dp > g.radius * lm) g.awake = false;
    if (!g.awake || g.reserve <= 0 || BATTLE.t < g.nextAt) continue;
    const n = Math.min(battleLotOf(g), g.reserve, BATTLE.liveCap);
    if (BATTLE.liveCap - live < n) continue;
    for (let i = 0; i < n; i++) battleSpawnFrom(g);
    live += n; g.reserve -= n; g.lot = null; g.nextAt = BATTLE.t + BATTLE.delay;
  }
}

// Reposição do lado do jogador (4B-11): em lotes, mesma regra de cota; nasce na base (de onde ele veio) e segue a ordem ativa ou o jogador.
function battleSpawnAlly() {
  const b = BATTLE.base, a = Math.random() * 6.283, r = 2 + Math.random() * 3, f = freeSpot(b.x + Math.cos(a) * r, b.z + Math.sin(a) * r, 0.5, 1.8, 0.45);
  const s = spawnAlly(f[0], f[1], WORLD.home);
  s.temp = true; s.state = 'assault'; s.assaultCity = BATTLE.area; s.form = { ang: Math.random() * 6.283, r: 5 + Math.random() * 5 };
  return s;
}
function battleTickAllies() {
  const R = BATTLE.ally;
  if (R.reserve <= 0 || P.dead || BATTLE.t < R.nextAt) return;
  const live = ALLIES.filter(a => a.alive).length, n = Math.min(battleLotOf(R), R.reserve, BATTLE.allyCap);
  if (BATTLE.allyCap - live < n) return;
  for (let i = 0; i < n; i++) battleSpawnAlly();
  R.reserve -= n; R.lot = null; R.nextAt = BATTLE.t + BATTLE.delay;
}

// Números do placar: do jogador (soldados em campo = vivos; reserva; mortos = o que falta para o total inicial) e do inimigo.
function battleCounts() {
  const pf = ALLIES.filter(a => a.alive).length, pr = BATTLE.ally.reserve, ef = BATTLE.area.aliveEnemies, er = BATTLE.gens.reduce((s, g) => s + g.reserve, 0);
  return { p: { f: pf, r: pr, d: Math.max(0, BATTLE.ally.total0 - pf - pr) }, e: { f: ef, r: er, d: Math.max(0, BATTLE.total0 - ef - er) } };
}

// Placar (4B-5): topo = em campo + reserva; depois em campo, reserva e mortos (mais fraco); jogador à esquerda; rodapé com o ajuste em tempo real.
function battleHudDraw() {
  if (!BATTLE.hud) { const d = document.createElement('div'); d.id = 'btlhud';
    d.style.cssText = 'position:fixed;right:8px;top:300px;z-index:5;background:rgba(15,15,22,.78);border:3px solid #111;padding:6px 14px;'
      + 'font:14px/1.4 monospace;color:#ccc;text-align:center;pointer-events:none;min-width:270px;text-shadow:1px 1px 0 #000'; document.body.appendChild(d); BATTLE.hud = d; }
  const c = battleCounts(), T = TXT_BATTLE_SCORE, fc = facColor(0), pc = fc != null ? hex6(fc) : '#4a90e0', ec = BATTLE_MOD.scoreBandit;
  const cell = (v, col, big, dim) => '<td style="color:' + col + ';font-size:' + (big ? 22 : 15) + 'px;font-weight:bold;padding:0 10px;opacity:' + (dim ? BATTLE_MOD.scoreDeadAlpha : 1) + '">' + v + '</td>';
  const row = (lab, a, b, dim) => '<tr><td style="text-align:left;color:#999;font-size:12px">' + lab + '</td>' + cell(a, pc, 0, dim) + '<td></td>' + cell(b, ec, 0, dim) + '</tr>';
  BATTLE.hud.innerHTML = '<table style="width:100%;border-collapse:collapse"><tr><td></td>' + cell(c.p.f + c.p.r, pc, 1) + '<td style="color:#888">' + T.vs + '</td>' + cell(c.e.f + c.e.r, ec, 1) + '</tr>'
    + row(T.field, c.p.f, c.e.f) + row(T.reserve, c.p.r, c.e.r) + row(T.dead, c.p.d, c.e.d, true) + '</table>'
    + '<div style="color:#777;font-size:11px;margin-top:3px">' + txtBattleTune(BATTLE.lot, BATTLE.delay, BATTLE.fps) + '</div>';
}

// Marcas da batalha no Mapa M (units = true: também soldados) e no minimapa (units = false: o minimapa já marca os soldados). f(x,z) -> [px,py] em pixels,
// sc = pixels por bloco, k = escala das marcas. Gerador: quadrado vermelho; raio de ativação: círculo vermelho; coleira: círculo laranja tracejado.
function battleMarks(g, f, sc, k, units) {
  if (!BATTLE.on) return;
  g.save();
  for (const q of BATTLE.gens) {
    const [x, y] = f(q.x, q.z);
    if (q.ring) {
      g.lineWidth = 2 * k; g.strokeStyle = hex6(BATTLE_MOD.ringColor); g.beginPath(); g.arc(x, y, q.radius * sc, 0, 6.283); g.stroke();
      g.strokeStyle = hex6(BATTLE_MOD.leashColor); g.setLineDash([6 * k, 5 * k]); g.beginPath(); g.arc(x, y, q.radius * BATTLE_MOD.leashMul * sc, 0, 6.283); g.stroke(); g.setLineDash([]);
    }
    g.fillStyle = '#b02020'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 * k; g.fillRect(x - 5 * k, y - 5 * k, 10 * k, 10 * k); g.strokeRect(x - 5 * k, y - 5 * k, 10 * k, 10 * k);
  }
  if (units) {
    g.strokeStyle = '#000'; g.lineWidth = k;
    g.fillStyle = '#4aa0ff'; for (const a of ALLIES) if (a.alive) { const [x, y] = f(a.x, a.z); g.fillRect(x - 3.5 * k, y - 3.5 * k, 7 * k, 7 * k); g.strokeRect(x - 3.5 * k, y - 3.5 * k, 7 * k, 7 * k); }
    g.fillStyle = '#ff2a2a'; for (const e of ENEMIES) if (e.alive && e.btl) { const [x, y] = f(e.x, e.z); g.fillRect(x - 3 * k, y - 3 * k, 6 * k, 6 * k); g.strokeRect(x - 3 * k, y - 3 * k, 6 * k, 6 * k); }
  }
  g.restore();
}

// Pop-up de vitória (verde), na hora: reaproveita a tela "victory" (só existe no cenário de teste com este texto).
function battleWin() {
  if (BATTLE.over) return;
  BATTLE.over = true; BATTLE.area.state = 'cleared';
  for (const a of ALLIES) if (a.alive) { a.state = 'patrol'; a.patrolCity = WORLD.home; a.assaultCity = null; }
  $('victory').innerHTML = '<div class="panel" style="text-align:center;border-color:#2a8a3a"><h1 style="color:#6aff8a">' + TXT_BATTLE_WIN.titulo + '</h1><p>'
    + (TXT_BATTLE_WIN[BATTLE.mode] || TXT_BATTLE_WIN.nucleo) + '</p><button id="btlok" class="gold">' + TXT_BATTLE_OK + '</button></div>';
  $('btlok').onclick = () => closePanel();
  battleHudDraw(); sfx('win', 0); openPanel('victory');
}
// Derrota (chamada por die() em game.js): morte do comandante. No protótipo: tela de derrota com Reiniciar (recarrega o cenário).
function battleDefeat() {
  BATTLE.over = true; BATTLE.area.state = 'cleared';
  $('dead').innerHTML = '<div class="panel"><h1 style="color:#ff6a6a">' + TXT_BATTLE_LOSE.titulo + '</h1><p>' + (TXT_BATTLE_LOSE[BATTLE.mode] || TXT_BATTLE_LOSE.nucleo)
    + '</p><button id="btlre" class="red">' + TXT_BATTLE_LOSE.botao + '</button></div>';
  $('btlre').onclick = () => location.reload();
  battleHudDraw(); openPanel('dead');
}

// Chamada a cada quadro por update() em game.js.
function updateBattle(dt) {
  if (!BATTLE.on || BATTLE.over) return;
  const now = performance.now(), d = (now - BATTLE.last) / 1000; BATTLE.last = now;
  if (d > 0 && d < 0.5) BATTLE.fps += (1 / d - BATTLE.fps) * 0.05;
  BATTLE.t += dt;
  const A = BATTLE.area; A.cx = P.x; A.cz = P.z; A.y = P.y;
  battleTickGens(); battleTickAllies();
  BATTLE.scanT -= dt;
  if (BATTLE.scanT <= 0) {
    BATTLE.scanT = 0.4; A.enemies = A.enemies.filter(e => !e.gone);
    if (!P.dead && BATTLE.total0 > 0 && A.aliveEnemies <= 0 && BATTLE.gens.every(g => g.reserve <= 0)) { battleWin(); return; }
  }
  BATTLE.hudT -= dt; if (BATTLE.hudT <= 0) { BATTLE.hudT = 0.2; battleHudDraw(); }
}

// Ajuste em tempo real (cenário de teste): [ ] muda o lote, - = muda o atraso entre lotes.
document.addEventListener('keydown', e => {
  if (!battleOn() || G.panel || e.repeat) return;
  const K = BATTLE_MOD.keys, L = BATTLE_MOD.lotLimit, d = e.code === K.lotUp || e.code === K.delayUp ? 1 : -1;
  if (e.code === K.lotUp || e.code === K.lotDown) BATTLE.lot = BATTLE.lot.map(v => clamp(v + d, L[0], L[1]));
  else if (e.code === K.delayUp || e.code === K.delayDown) BATTLE.delay = Math.max(0, +(BATTLE.delay + d * BATTLE_MOD.delayStep).toFixed(2));
  else return;
  for (const g of BATTLE.gens) g.lot = null;
  BATTLE.ally.lot = null; battleHudDraw();
});

// Configuração comum a todos os modos: cotas, lote, atraso e sorteio vindos da URL ou dos modificadores.
function battleConfig(mode) {
  const q = new URLSearchParams(location.search), lt = (q.get('lote') || '').split('-').map(Number).filter(n => !isNaN(n) && n > 0);
  BATTLE.mode = mode; BATTLE.over = false; BATTLE.t = 0; BATTLE.last = performance.now();
  BATTLE.lot = lt.length ? [lt[0], lt[lt.length - 1]] : BATTLE_MOD.lot.slice();
  BATTLE.delay = battleParam('atraso', BATTLE_MOD.lotDelay);
  BATTLE.liveCap = battleParam('vivos', BATTLE_MOD.liveCap); BATTLE.allyCap = battleParam('vivosalia', BATTLE_MOD.allyLiveCap);
  BATTLE.rng = q.get('semente') ? new RNG(+q.get('semente')) : null;
  BATTLE.area = battleMakeArea();
}

// Modo núcleo (?cenario=batalha&modo=nucleo): um gerador inimigo num mapa aberto; o jogador começa fora do raio, com os soldados de elite e uma reserva.
function battleStartNucleo() {
  const N = BATTLE_MOD.nucleo, home = WORLD.home;
  tileTestFillEnemies(tileTestFoe(), 0);   // a cidade inimiga fica vazia: a única luta é a do gerador
  const f = freeSpot(N.start.x, N.start.z, 0.5, 1.8, 0.45);
  P.x = f[0]; P.z = f[1]; P.y = tH(P.x, P.z) + 0.1; P.vx = P.vz = P.vy = 0; P.camY = P.y;
  P.yaw = Math.atan2(-(N.gen.x - P.x), -(N.gen.z - P.z)); P.pitch = -0.05;
  battleConfig('nucleo');
  BATTLE.base = { x: P.x, z: P.z };
  const n = Math.min(tileTestCount('alia', TILE_TEST.allies), BATTLE_MOD.allyTotal), er = battleParam('inim', BATTLE_MOD.enemyReserve), pr = Math.max(0, Math.min(battleParam('reserva', 1e9), BATTLE_MOD.allyTotal - n));   // o batalhão (elites + reserva) nunca passa de allyTotal
  for (let i = 0; i < n; i++) spawnAlly(P.x + (i - n / 2) * 1.5, P.z + 3, home);
  BATTLE.gens = [battleAddGen(N.gen.x, N.gen.z, er)];
  BATTLE.total0 = er; BATTLE.ally.reserve = pr; BATTLE.ally.total0 = n + pr;
  armyAssault(BATTLE.area, '');   // os soldados de elite acompanham o jogador em modo de assalto (a ordem V/X vale)
  BATTLE.on = true; battleHudDraw();
}
