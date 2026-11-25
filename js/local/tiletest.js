'use strict';
// ---------- Cenário de teste de batalha num mapa local (abra com ?cenario=batalha) ----------
// Feature 5 (mapa mundi): mede se um mapa local aguenta muitos atores. O mapa tem TILE_TEST.size de lado (320) e DUAS cidades: a sua, bem pequena,
// num canto (você começa nela), e a de outra facção (cores diferentes), grande (~39% da área), com TILE_TEST.defenders soldados. A batalha começa
// pela regra normal de ataque a cidade quando você se aproxima; os TILE_TEST.allies soldados seus vão atrás de você nessa hora. Os POIs com bandidos
// e os moradores nascem como no jogo normal. Números em js/modifiers/map-modifiers.js; textos em js/texts/map-texts.js.
// ?inim=N e ?alia=N trocam as quantidades (0 e 0 = sem batalha, para comparar); ?pos=centro / ?pos=portao começam já na cidade inimiga.
// Nada daqui roda no jogo normal.
const TILETEST = { on: false, acc: null, perf: null };

const tileTestFoe = () => WORLD.cities.find(c => !c.home);   // a cidade da outra facção

// Quantidade pedida pela URL (?inim= / ?alia=) ou o padrão do modificador.
function tileTestCount(key, def) {
  const v = new URLSearchParams(location.search).get(key);
  return v === null || v === '' || isNaN(+v) ? def : Math.max(0, Math.min(200, +v));
}

function tileTestScenario() {
  TILETEST.on = true; G.introBook = false; STATE.phase = 'commander'; STATE.round = 1; P.coins = 20000;
  facSetIdentity({ name: 'Teste de batalha' });
  STATE.rd.lvl = 1; STATE.rd.actions = maxActions();
}

// Deixa a cidade inimiga com exatamente n soldados vivos: tira o excesso (menos atiradores de torre) ou completa com TILE_TEST.enemyType.
// Eles ficam em estado normal (parados nos postos) até você se aproximar.
function tileTestFillEnemies(c, n) {
  let have = c.enemies.filter(e => e.alive);
  for (let i = have.length - 1; i >= 0 && have.length > n; i--) {
    const e = have[i]; if (e.sentry) continue;
    e.alive = false; e.gone = true; scene.remove(e.group); c.aliveEnemies--; c.totalEnemies--; have.splice(i, 1);
  }
  c.enemies = c.enemies.filter(e => !e.gone);
  const rng = new RNG(WORLD.seed * 7 + 3), pts = rng.shuffle(c.walk.filter(p => Math.hypot(p.x - c.cx, p.z - c.cz) > 4));
  for (let i = 0; have.length < n && pts.length && i < n * 4; i++) {
    const p = pts[i % pts.length]; have.push(spawnEnemy(c, TILE_TEST.enemyType, p.x, p.z));
  }
}

// Põe o jogador de frente para a cidade inimiga. mode: 'casa' (padrão: na sua cidade), 'portao' (no portão norte da inimiga, o que dá para a sua)
// ou 'centro' (no meio da inimiga).
function tileTestPlace(mode) {
  const home = WORLD.home, foe = tileTestFoe();
  const at = mode === 'centro' ? [foe.cx + 3, foe.cz + 3] : mode === 'portao' ? [foe.cx, foe.cz - foe.half - TILE_TEST.startGap] : [home.cx + 4, home.cz + 4];
  const f = freeSpot(at[0], at[1], 0.5, 1.8, 0.45);
  P.x = f[0]; P.z = f[1]; P.y = tH(P.x, P.z) + 0.1; P.vx = P.vz = P.vy = 0; P.camY = P.y;
  P.yaw = Math.atan2(-(foe.cx - P.x), -(foe.cz - P.z)); P.pitch = -0.05;
}

function tileTestAfter() {
  if (iaTestOn()) { iaTestStart(); return; }   // IA dos atiradores, passo 5 (iatest.js)
  if (battleMode() === 'nucleo') { battleStartNucleo(); return; }   // batalha no tile, passo 1 (battle.js)
  if (battleMode() === 'choque') { battleStartChoque(); return; }   // batalha no tile, passo 2 (battle.js)
  if (battleMode() === 'defesa') { battleStartDefesa(); return; }   // batalha no tile, passo 3 (battle.js)
  if (battleMode() === 'ataque') { battleStartAtaque(); return; }   // batalha no tile, passo 4 (battle.js)
  const home = WORLD.home, foe = tileTestFoe(), n =tileTestCount('inim', TILE_TEST.defenders), a = tileTestCount('alia', TILE_TEST.allies);
  tileTestPlace(new URLSearchParams(location.search).get('pos') || 'casa');
  // sem guerra declarada, atacar a cidade é "crime": ela reage, mas você não recebe os seus soldados (startAttack em entities.js); por isso a guerra vem
  // antes de ajustar os soldados (a declaração recoloca a guarnição da cidade)
  if (relStatus(foe.fid) !== 'war') facDeclareWar(foe.fid);
  tileTestFillEnemies(foe, n);
  for (let i = 0; i < a; i++) spawnAlly(P.x + (i - a / 2) * 1.5, P.z + 3, home);   // patrulham a sua cidade; o ataque os chama (armyAssault em startAttack)
  toast(txtTileTestOpen(n, a, foe.half, W), 9000);
}

// Amostra de um quadro (chamada por frame() em game.js): só conta quando a medição foi pedida e o jogo não está pausado.
function tileTestSample(upd, ren, active) {
  const A = TILETEST.acc;
  if (!TILETEST.on || !A || !active) return;
  A.n++; A.u += upd; A.r += ren;
  if (A.n < TILE_TEST.perfFrames) return;
  TILETEST.perf = { frames: A.n, upd: A.u / A.n, ren: A.r / A.n, fps: A.n / ((performance.now() - A.t0) / 1000), calls: renderer.info.render.calls };
  TILETEST.acc = null;
  if (typeof refreshCheats === 'function') refreshCheats();
}
function tileTestMeasure() { TILETEST.perf = null; TILETEST.acc = { n: 0, u: 0, r: 0, t0: performance.now() }; }

const tileTestAlive = list => list.filter(x => x.alive).length;

// Painel de testes (aparece no topo da aba Facções da pausa).
function tileTestHtml() {
  const p = TILETEST.perf, B = (k, t) => '<button class="alt" data-tt="' + k + '" style="margin:2px">' + t + '</button>';
  const st = TILETEST.acc ? 'medindo… (feche a pausa e jogue ' + TILE_TEST.perfFrames + ' quadros)'
    : p ? txtTileTestPerf(p, tileTestAlive(ENEMIES), tileTestAlive(ALLIES)) : 'sem medição ainda';
  return '<p class="ptitle">' + TXT_TILETEST_TITLE + '</p><p class="ldsm" style="margin:2px 0 4px">' + (iaTestOn() ? TXT_IA_HELP : battleMode() ? TXT_BATTLE_HELP[battleMode()] || TXT_BATTLE_HELP.nucleo : TXT_TILETEST_HELP) + '</p>'
    + '<p class="ldsm"><b>' + st + '</b></p>'
    + B('measure', '⏱ Medir') + B('home', '📍 Minha cidade') + B('gate', '📍 Portão inimigo') + B('center', '📍 Centro inimigo') + B('kill', '☠ Matar os inimigos')
    + '<br><button class="alt" data-scn="reload">↻ Recomeçar o cenário</button><hr style="border-color:#444">';
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-tt]'); if (!b) return;
  const k = b.dataset.tt, foe = tileTestFoe();
  if (k === 'measure') { tileTestMeasure(); closePanel(); }
  else if (k === 'home') { tileTestPlace('casa'); closePanel(); }
  else if (k === 'gate') { tileTestPlace('portao'); closePanel(); }
  else if (k === 'center') { tileTestPlace('centro'); closePanel(); }
  else if (k === 'kill') { for (const x of ENEMIES) if (x.alive && (x.city === foe || x.city === BATTLE.area)) damageEnemy(x, 99999, false); }
  if (typeof refreshCheats === 'function') refreshCheats();
});
