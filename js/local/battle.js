'use strict';
// ---------- Batalha no tile: núcleo (feature 12, passo 1; docs/features/12_batalha-no-tile.md, seções 4A, 4B e 5) ----------
// Peças reutilizáveis pelos modos seguintes (Choque, Defesa, Ataque): GERADOR (ponto que lança soldados em lotes, com raio de ativação, reserva própria e coleira),
// cota de vivos, reposição do lado do jogador, placar, pop-ups de fim e ajuste em tempo real. Os soldados lançados são inimigos normais (spawnEnemy) de uma "área"
// de batalha (mesma forma da área de raid: state 'attacking', kind 'raid'), então os soldados do jogador (allies.js) os enxergam e a ordem de movimento (V/X) vale.
// Passo 2 = modo choque, passo 3 = defesa, passo 4 (no fim do arquivo) = ataque. Passo 1 = só o modo ?cenario=batalha&modo=nucleo: um gerador num mapa aberto, o jogador começa fora do raio. Números em modifiers/battle-modifiers.js,
// textos em texts/battle-texts.js. Nada daqui roda fora do cenário de teste (BATTLE.on é falso) e nada é salvo (4B-17).
const BATTLE = { on: false, over: false, mode: '', small: false, squadOn: false, area: null, gens: [], base: null, center: null, centerR: 0, limit: null, postCfg: null, warn: null, stuckT: 0, cover: [], rng: null, lot: [3, 5], delay: 3, liveCap: 30, allyCap: 20,
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
// o.kind 'post' (Choque): posto sempre acordado, sem raio nem coleira, que manda soldados ao centro; o.side 'player' lança soldados do jogador (padrão: 'enemy').
function battleAddGen(x, z, reserve, o) {
  o = o || {};
  const y = tH(x, z), grp = new THREE.Group(), side = o.side || 'enemy', post = o.kind === 'post';
  part(grp, GEO_BOX, 0.4, 3.2, 0.4, 0x4a3a2a, 0, 1.6, 0); part(grp, GEO_BOX, 1.5, 0.9, 0.1, side === 'player' ? (facColor(0) || 0x2a4a9a) : 0xb02020, 0.85, 2.7, 0);
  grp.position.set(x, y, z); scene.add(grp);
  const g = { x, z, y, side, kind: post ? 'post' : 'gen', radius: o.radius || BATTLE_MOD.genRadius, reserve, reserve0: reserve, awake: post, lot: null, nextAt: 0, group: grp };
  if (!post && BATTLE_MOD.showRings && new URLSearchParams(location.search).get('raios') !== '0') {
    g.ring = battleRing(x, z, g.radius, BATTLE_MOD.ringColor, 0.8);
    g.leashRing = battleRing(x, z, g.radius * BATTLE_MOD.leashMul, BATTLE_MOD.leashColor, 0.5);
  }
  BATTLE.gens.push(g); return g;
}

// Lança um soldado em volta do gerador, já em guarda (reage ao jogador).
function battleSpawnFrom(g) {
  const R = BATTLE_MOD.spawnRing, a = Math.random() * 6.283, r = R[0] + Math.random() * (R[1] - R[0]);
  const f = freeSpot(g.x + Math.cos(a) * r, g.z + Math.sin(a) * r, 0.5, 1.8, 0.45);   // nunca nasce dentro de obstáculo
  const e = spawnEnemy(BATTLE.area, BATTLE_MOD.enemyType, f[0], f[1]);
  e.btl = g; e.aggro = true; e.unseenT = 99; e.reactT = 0.4 + Math.random() * 0.4; e.homeX = g.x; e.homeZ = g.z;
  if (g.kind === 'post') { e.homeX = BATTLE.center.x; e.homeZ = BATTLE.center.z; e.recall = BATTLE.center; }   // sai do posto marchando ao centro
  return e;
}

// Coleira (chamada por updateEnemy): o soldado lançado só persegue enquanto o gerador está acordado e ele está dentro de raio x fator; fora disso volta ao gerador
// (e.recall) e só deixa de voltar ao chegar perto (ou ao raio de ativação, se o gerador estiver acordado). Devolve se está ativo (em combate).
function battleEnemyActive(e) {
  if (e.btl.kind === 'post') return battlePostActive(e);
  const g = e.btl, dg = Math.hypot(e.x - g.x, e.z - g.z), home = BATTLE_MOD.homeDist;
  if (e.recall && dg <= (g.awake ? g.radius : home)) { e.recall = null; e.spreadT = 0; }
  if (!e.recall && (!g.awake || dg > g.radius * BATTLE_MOD.leashMul) && dg > home) { e.recall = g; e.spreadT = 0; }
  return !e.recall && !P.dead && !BATTLE.over;
}

// Soldado de posto (Choque): luta quando o alvo (você ou um soldado seu) está a menos de `engage`; senão marcha ao centro e fica por lá (recall = centro).
function battlePostActive(e) {
  const C = BATTLE.postCfg, tg = e.tg || P, hot = !P.dead && !BATTLE.over && Math.hypot(tg.x - e.x, tg.z - e.z) < C.engage;
  e.recall = hot || Math.hypot(e.x - BATTLE.center.x, e.z - BATTLE.center.z) <= C.hold ? null : BATTLE.center;
  return hot;
}

// Gera os lotes dos geradores acordados: só quando a cota de vivos comporta o lote inteiro e passou o atraso desde o lote anterior.
// Postos do jogador (Choque) entram na mesma regra, com a cota de vivos do jogador (allyCap) e soldados dele.
function battleTickGens() {
  const A = BATTLE.area, lm = BATTLE_MOD.leashMul, live = { enemy: A.aliveEnemies, player: ALLIES.filter(a => a.alive).length };
  for (const g of BATTLE.gens) {
    if (g.kind !== 'post') {
      const dp = P.dead ? 1e9 : Math.hypot(P.x - g.x, P.z - g.z);
      if (!g.awake && dp < g.radius) g.awake = true; else if (g.awake && dp > g.radius * lm) g.awake = false;
    }
    if (!g.awake || g.reserve <= 0 || BATTLE.t < g.nextAt || (g.side === 'player' && P.dead)) continue;
    const cap = g.side === 'player' ? BATTLE.allyCap : BATTLE.liveCap, n = Math.min(battleLotOf(g), g.reserve, cap);
    if (cap - live[g.side] < n) continue;
    for (let i = 0; i < n; i++) g.side === 'player' ? battleSpawnAlly(g) : battleSpawnFrom(g);
    live[g.side] += n; g.reserve -= n; g.lot = null; g.nextAt = BATTLE.t + BATTLE.delay;
  }
}

// Reposição do lado do jogador (4B-11): em lotes, mesma regra de cota; nasce na base (de onde ele veio) e segue a ordem ativa ou o jogador.
function battleSpawnAlly(from) {
  const b = from || BATTLE.base, a = Math.random() * 6.283, r = 2 + Math.random() * 3, f = freeSpot(b.x + Math.cos(a) * r, b.z + Math.sin(a) * r, 0.5, 1.8, 0.45);
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
  const res = side => BATTLE.gens.reduce((s, g) => s + (g.side === side ? g.reserve : 0), 0);
  const pf = ALLIES.filter(a => a.alive).length, pr = BATTLE.ally.reserve + res('player'), ef = BATTLE.area.aliveEnemies, er = res('enemy');
  return { p: { f: pf, r: pr, d: Math.max(0, BATTLE.ally.total0 - pf - pr) }, e: { f: ef, r: er, d: Math.max(0, BATTLE.total0 - ef - er) } };
}

// Placar (4B-5): topo = em campo + reserva; depois em campo, reserva e mortos (mais fraco); jogador à esquerda; rodapé com o ajuste em tempo real.
function battleHudDraw() {
  if (BATTLE.small) return;   // batalha pequena: sem placar (4B-5, o placar é só da batalha grande)
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
  if (BATTLE.center) {   // Choque: área central (círculo branco) e peças de cobertura (quadradinhos cinza)
    const [cx, cy] = f(BATTLE.center.x, BATTLE.center.z);
    g.lineWidth = 2 * k; g.strokeStyle = BATTLE.limit ? hex6(BATTLE_MOD.defesaColor) : '#fff'; g.beginPath(); g.arc(cx, cy, BATTLE.centerR * sc, 0, 6.283); g.stroke();
    if (BATTLE.limit) {   // Defesa: zona cinza além da borda
      g.strokeStyle = hex6(BATTLE_MOD.defesaGrayColor); g.setLineDash([5 * k, 4 * k]); g.beginPath();
      g.arc(cx, cy, (BATTLE.centerR + BATTLE_MOD.defesa.gray) * sc, 0, 6.283); g.stroke(); g.setLineDash([]);
    }
    g.fillStyle = BATTLE_MOD.coverMark; for (const c of BATTLE.cover) { const [x, y] = f(c.x, c.z); g.fillRect(x - 2 * k, y - 2 * k, 4 * k, 4 * k); }
  }
  const T = BATTLE.target;
  for (const q of BATTLE.gens) {
    const [x, y] = f(q.x, q.z);
    if (q.ring) {
      g.lineWidth = 2 * k; g.strokeStyle = hex6(BATTLE_MOD.ringColor); g.beginPath(); g.arc(x, y, q.radius * sc, 0, 6.283); g.stroke();
      g.strokeStyle = hex6(BATTLE_MOD.leashColor); g.setLineDash([6 * k, 5 * k]); g.beginPath(); g.arc(x, y, q.radius * BATTLE_MOD.leashMul * sc, 0, 6.283); g.stroke(); g.setLineDash([]);
    }
    g.fillStyle = q.side === 'player' || (T && q === T.gen && T.captured) ? hex6(facColor(0) || 0x2a4a9a) : '#b02020'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 * k; g.fillRect(x - 5 * k, y - 5 * k, 10 * k, 10 * k); g.strokeRect(x - 5 * k, y - 5 * k, 10 * k, 10 * k);
  }
  if (units) {
    g.strokeStyle = '#000'; g.lineWidth = k;
    g.fillStyle = '#4aa0ff'; for (const a of ALLIES) if (a.alive) { const [x, y] = f(a.x, a.z); g.fillRect(x - 3.5 * k, y - 3.5 * k, 7 * k, 7 * k); g.strokeRect(x - 3.5 * k, y - 3.5 * k, 7 * k, 7 * k); }
    g.fillStyle = '#ff2a2a'; for (const e of ENEMIES) if (e.alive && e.btl) { const [x, y] = f(e.x, e.z); g.fillRect(x - 3 * k, y - 3 * k, 6 * k, 6 * k); g.strokeRect(x - 3 * k, y - 3 * k, 6 * k, 6 * k); }
  }
  g.restore();
}

// Os soldados do jogador deixam de seguir: patrulham em volta do ponto (padrão: onde o jogador está agora), numa área de patrulha própria (mesma forma de uma cidade
// para o `patrol` de updateAlly). Para voltar a segui-lo (outra batalha), armyAssault os teleporta para trás do jogador.
function battleSquadStand(x, z) {
  const spot = { cx: x === undefined ? P.x : x, cz: z === undefined ? P.z : z, half: BATTLE_MOD.standHalf };
  for (const a of ALLIES) if (a.alive) { a.state = 'patrol'; a.patrolCity = spot; a.assaultCity = null; a.tgtE = null; a.path = null; a.form = null; }
}

// Fim da batalha (passo 10): grava no macro (tileBattleEnd, js/macro/tilewar.js) fadiga, baixas, dono do tile e cicatriz. O cenário de teste não tem tile nem batalhão no
// estado: usa a chave 'teste' e só a fadiga/cicatriz importam (ver ?origem=cerco em battleStartDefesa). Resumo em BATTLE.fim.
function battleRecord(res) {
  if (BATTLE.mode === 'nucleo') return;
  const foe = typeof tileTestFoe === 'function' ? tileTestFoe() : null, c = battleCounts();
  BATTLE.fim = tileBattleEnd({ key: BATTLE.key || 'teste', modo: BATTLE.mode, res, grande: !BATTLE.small, mortos: c.p.d, fid: foe ? foe.fid : undefined, war: warX(), guerra: !!foe && relStatus(foe.fid) === 'war' });
}

// Vitória: só uma notificação verde na hora (sem pop-up), com a mensagem do modo; o jogo continua para o jogador andar pelo campo.
function battleWin() {
  if (BATTLE.over) return;
  BATTLE.over = true; battleRecord('vitoria'); BATTLE.area.state = 'cleared';
  battleSquadStand();   // os soldados deixam de seguir o jogador e patrulham onde a batalha terminou
  toast(TXT_BATTLE_WIN.titulo + ': ' + (TXT_BATTLE_WIN[BATTLE.mode] || TXT_BATTLE_WIN.nucleo), 8000);
  const t = $('toasts').lastChild; if (t) { t.style.background = 'rgba(20,90,40,.92)'; t.style.borderColor = '#2a8a3a'; t.style.color = '#b8ffc8'; }
  battleHudDraw(); sfx('win', 0);
}
// Derrota (chamada por die() em game.js): morte do comandante. No protótipo: tela de derrota com Reiniciar (recarrega o cenário).
function battleDefeat(key) {
  BATTLE.over = true; battleRecord('derrota'); BATTLE.area.state = 'cleared'; battleWarn(false);
  $('dead').innerHTML = '<div class="panel"><h1 style="color:#ff6a6a">' + TXT_BATTLE_LOSE.titulo + '</h1><p>' + (TXT_BATTLE_LOSE[key || BATTLE.mode] || TXT_BATTLE_LOSE.nucleo)
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
  battleTickGens(); battleTickAllies(); battleTickLimit(); battleTickStuck(); battleTickAtaque(); battleTickPequena();
  if (BATTLE.over) return;
  BATTLE.scanT -= dt;
  if (BATTLE.scanT <= 0) {
    BATTLE.scanT = 0.4; A.enemies = A.enemies.filter(e => !e.gone);
    if (!P.dead && BATTLE.total0 > 0 && A.aliveEnemies <= 0 && (!BATTLE.target || BATTLE.target.captured) && BATTLE.gens.every(g => g.side === 'player' || g.reserve <= 0)) { battleWin(); return; }
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
  BATTLE.gens = []; BATTLE.cover = []; BATTLE.center = null; BATTLE.centerR = 0; BATTLE.limit = null; BATTLE.target = null; BATTLE.ally.reserve = 0;   // o cenário pode ser montado de novo (mundo refeito)
  BATTLE.key = null; BATTLE.origem = null; BATTLE.fim = null; batSnapshot();   // foto do batalhão antes da luta (4B-17)
  BATTLE.mode = mode; BATTLE.small = mode === 'pequena'; BATTLE.over = false; BATTLE.t = 0; BATTLE.stuckT = 0; BATTLE.last = performance.now();
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

// ---------- Modo choque (passo 2; ?cenario=batalha&modo=choque; 4B-9 e 4B-14) ----------
// Peças de cobertura (micro-POIs de batalha), cada uma [x0,y0,z0,x1,y1,z1,cor] em relação ao ponto; 'ang' gira 90 graus. Todas têm colisão.
const BATTLE_COVER = {
  sacos: [[-1.6, 0, -0.5, 1.6, 1.1, 0.5, 0xb8a06a], [-1.1, 1.1, -0.4, 1.1, 1.6, 0.4, 0xa8905a]],
  caixotes: [[-0.7, 0, -0.7, 0.7, 1.4, 0.7, 0x8a6c3a], [0.9, 0, -0.5, 1.9, 1.0, 0.5, 0x9a7a45], [-0.5, 1.4, -0.5, 0.5, 2.2, 0.5, 0x7a5c30]],
  barricada: [[-2, 0, -0.2, 2, 1.3, 0.2, 0x7a5a30], [-2, 0, -0.5, -1.7, 1.6, 0.5, 0x5a4020], [1.7, 0, -0.5, 2, 1.6, 0.5, 0x5a4020]],
  carroca: [[-1.6, 0.5, -0.9, 1.6, 1.5, 0.9, 0x6a4f2a], [-0.2, 0, -1.2, 0.2, 1.6, -0.9, 0x3a2a1a], [-0.2, 0, 0.9, 0.2, 1.6, 1.2, 0x3a2a1a]]
};
// Constrói uma peça de cobertura no ponto (x,z), na malha própria (BX_CAP), assentada no chão mais alto sob ela.
function battleBuildCover(kind, x, z, ang) {
  const rot = (u, v) => ang ? [v, -u] : [u, v];
  let gy = -1e9; for (const [u, v] of [[-1.8, -1], [1.8, -1], [-1.8, 1], [1.8, 1], [0, 0]]) { const q = rot(u, v); gy = Math.max(gy, tH(x + q[0], z + q[1])); }
  BX_CAP = { batch: new BoxBatch(), cols: [] };
  try {
    for (const b of BATTLE_COVER[kind]) {
      const p = rot(b[0], b[2]), q = rot(b[3], b[5]);
      Bx(x + Math.min(p[0], q[0]), gy - 0.6 + b[1], z + Math.min(p[1], q[1]), x + Math.max(p[0], q[0]), gy + b[4], z + Math.max(p[1], q[1]), b[6], true, { j: 0.05 });
    }
  } finally {
    const cap = BX_CAP; BX_CAP = null; const m = cap.batch.toMesh(MAT_TERRAIN); if (m) scene.add(m);
  }
}

// Distância do ponto (x,z) ao segmento a-b (para manter as rotas dos postos ao centro livres).
function battleSegDist(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}

// Espalha as peças de cobertura: pares espelhados (lado do jogador e do inimigo, mesma peça e mesma posição relativa) fora das rotas dos 6 postos.
function battleScatterCover() {
  const C = BATTLE_MOD.choque, V = BATTLE_MOD.cover, c = C.center, posts = C.playerPosts.concat(C.enemyPosts), kinds = Object.keys(BATTLE_COVER);
  const total = Math.max(0, Math.round(battleParam('cobertura', battleRand(V.count[0], V.count[1])))), pairs = Math.floor(total / 2), list = [];
  const okAt = (x, z) => posts.every(p => battleSegDist(x, z, p, c) > V.routeGap) && list.every(o => Math.hypot(o.x - x, o.z - z) > 4.5);
  const pick = () => { for (let t = 0; t < 40; t++) {   // ponto na metade do jogador (oeste); o par espelhado fica na metade do inimigo
    const a = battleRand(0, 6283) / 1000, r = V.ring[0] + battleRand(0, 1000) / 1000 * (V.ring[1] - V.ring[0]), x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
    if (x <= c.x - 2 && okAt(x, z) && okAt(2 * c.x - x, z)) return [x, z]; } return null; };
  for (let i = 0; i < pairs; i++) {
    const p = pick(); if (!p) continue;
    const kind = kinds[battleRand(0, kinds.length - 1)], ang = battleRand(0, 1), mx = 2 * c.x - p[0];
    for (const [x, z] of [[p[0], p[1]], [mx, p[1]]]) { list.push({ x, z, kind }); battleBuildCover(kind, x, z, ang); }
  }
  if (total % 2) { const z = c.z + (battleRand(0, 1) ? 1 : -1) * (6 + battleRand(0, 1000) / 1000 * 12); if (okAt(c.x, z)) { list.push({ x: c.x, z, kind: 'sacos' }); battleBuildCover('sacos', c.x, z, 1); } }
  return list;
}

// Reparte uma reserva total entre n postos (o resto vai para os primeiros).
const battleSplit = (total, n) => Array.from({ length: n }, (_, i) => Math.floor(total / n) + (i < total % n ? 1 : 0));

// Modo choque: 3 postos do jogador e 3 do inimigo mandam soldados em lotes ao centro; sem raio de ativação. Vence quem zerar a reserva e os vivos do outro lado.
function battleStartChoque() {
  const C = BATTLE_MOD.choque, home = WORLD.home;
  tileTestFillEnemies(tileTestFoe(), 0);   // a cidade inimiga fica vazia: a única luta é a dos postos
  const f = freeSpot(C.playerStart.x, C.playerStart.z, 0.5, 1.8, 0.45);
  P.x = f[0]; P.z = f[1]; P.y = tH(P.x, P.z) + 0.1; P.vx = P.vz = P.vy = 0; P.camY = P.y;
  P.yaw = Math.atan2(-(C.center.x - P.x), -(C.center.z - P.z)); P.pitch = -0.05;
  battleConfig('choque');
  BATTLE.center = { x: C.center.x, z: C.center.z }; BATTLE.centerR = C.centerR; BATTLE.postCfg = C; BATTLE.base = { x: P.x, z: P.z };
  const n = Math.min(tileTestCount('alia', TILE_TEST.allies), BATTLE_MOD.allyTotal), er = battleParam('inim', BATTLE_MOD.enemyReserve);
  const pr = Math.max(0, Math.min(battleParam('reserva', 1e9), BATTLE_MOD.allyTotal - n));
  for (let i = 0; i < n; i++) spawnAlly(P.x + (i - n / 2) * 1.5, P.z + 3, home);
  battleSplit(er, C.enemyPosts.length).forEach((r, i) => battleAddGen(C.enemyPosts[i].x, C.enemyPosts[i].z, r, { side: 'enemy', kind: 'post' }));
  battleSplit(pr, C.playerPosts.length).forEach((r, i) => battleAddGen(C.playerPosts[i].x, C.playerPosts[i].z, r, { side: 'player', kind: 'post' }));
  if (BATTLE_MOD.showRings && new URLSearchParams(location.search).get('raios') !== '0') battleRing(C.center.x, C.center.z, C.centerR, 0xffffff, 0.8);
  BATTLE.cover = battleScatterCover();
  BATTLE.total0 = er; BATTLE.ally.total0 = n + pr;
  armyAssault(BATTLE.area, '');
  BATTLE.on = true; battleHudDraw();
}

// ---------- Modo defesa (passo 3; ?cenario=batalha&modo=defesa; 4B-8 e 4B-10) ----------
// Aviso fixo na tela (zona cinza da Defesa); mostra ou esconde.
function battleWarn(on) {
  if (!BATTLE.warn) { const d = document.createElement('div'); d.id = 'btlwarn';
    d.style.cssText = 'position:fixed;left:50%;top:70px;transform:translateX(-50%);z-index:6;background:rgba(90,20,20,.88);border:3px solid #c03030;color:#ffd0d0;'
      + 'padding:8px 18px;font:bold 16px monospace;pointer-events:none;display:none;text-shadow:1px 1px 0 #000'; d.textContent = TXT_BATTLE_DEF_WARN; document.body.appendChild(d); BATTLE.warn = d; }
  BATTLE.warn.style.display = on ? 'block' : 'none';
}

// Barreira da Defesa (a cada quadro): na zona cinza (além do raio) mostra o aviso; ao atravessá-la o comandante foge e a batalha está perdida.
function battleTickLimit() {
  const L = BATTLE.limit; if (!L || P.dead) return;
  const d = Math.hypot(P.x - L.x, P.z - L.z);
  if (d > L.r + L.gray) { P.dead = true; battleDefeat('defesaFuga'); return; }
  battleWarn(d > L.r);
}

// Limita o ponto de uma ordem de movimento (V) à área de defesa (4B-8); fora da Defesa não muda nada. Chamada por orderGo (allies.js).
function battleClampOrder(o) {
  const L = BATTLE.limit; if (!BATTLE.on || !L) return;
  const dx = o.x - L.x, dz = o.z - L.z, d = Math.hypot(dx, dz);
  if (d > L.r - 2) { o.x = L.x + dx / d * (L.r - 2); o.z = L.z + dz / d * (L.r - 2); }
}

// POI defendido (marcador provisório do cenário: bandeira do jogador e sacos de areia em volta; o POI real entra na integração, passo 10).
function battleBuildDefended(x, z) {
  const grp = new THREE.Group(), y = tH(x, z);
  part(grp, GEO_BOX, 0.5, 6, 0.5, 0x4a3a2a, 0, 3, 0); part(grp, GEO_BOX, 2.4, 1.4, 0.1, facColor(0) || 0x2a4a9a, 1.3, 5.2, 0);
  grp.position.set(x, y, z); scene.add(grp);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; battleBuildCover('sacos', x + Math.cos(a) * 7, z + Math.sin(a) * 7, i % 2); }
}

// Modo defesa: o jogador nasce no centro do POI defendido; 3 postos inimigos fora da área mandam lotes ao POI; reposição do jogador nasce dentro do POI.
function battleStartDefesa() {
  const D = BATTLE_MOD.defesa, home = WORLD.home, c = D.center, R = clamp(D.footprint / 2 + D.radiusPad, D.radiusMin, D.radiusMax);
  tileTestFillEnemies(tileTestFoe(), 0);   // a cidade inimiga fica vazia: a única luta é a dos postos
  battleBuildDefended(c.x, c.z);
  const f = freeSpot(c.x + 3, c.z + 3, 0.5, 1.8, 0.45);
  P.x = f[0]; P.z = f[1]; P.y = tH(P.x, P.z) + 0.1; P.vx = P.vz = P.vy = 0; P.camY = P.y; P.yaw = 0; P.pitch = -0.05;
  battleConfig('defesa');
  battleOrigemCerco();
  BATTLE.center = { x: c.x, z: c.z }; BATTLE.centerR = R; BATTLE.postCfg = D; BATTLE.base = { x: c.x, z: c.z };
  BATTLE.limit = { x: c.x, z: c.z, r: R, gray: D.gray };
  const n = Math.min(tileTestCount('alia', TILE_TEST.allies), BATTLE_MOD.allyTotal), er = battleParam('inim', BATTLE_MOD.enemyReserve);
  const pr = Math.max(0, Math.min(battleParam('reserva', 1e9), BATTLE_MOD.allyTotal - n));
  for (let i = 0; i < n; i++) spawnAlly(P.x + (i - n / 2) * 1.5, P.z + 3, home);
  const dist = R + D.postDist;
  battleSplit(er, D.postAngles.length).forEach((r, i) => { const a = D.postAngles[i] * Math.PI / 180;
    battleAddGen(c.x + Math.cos(a) * dist, c.z + Math.sin(a) * dist, r, { side: 'enemy', kind: 'post' }); });
  if (BATTLE_MOD.showRings && new URLSearchParams(location.search).get('raios') !== '0') {
    battleRing(c.x, c.z, R, BATTLE_MOD.defesaColor, 0.8); battleRing(c.x, c.z, R + D.gray, BATTLE_MOD.defesaGrayColor, 0.6);
  }
  BATTLE.total0 = er; BATTLE.ally.total0 = n + pr; BATTLE.ally.reserve = pr;
  armyAssault(BATTLE.area, '');
  BATTLE.on = true; battleHudDraw();
}

// ?origem=cerco (passo 10): a Defesa vem de um cerco. Abre o cerco no tile de teste (cidade: prazo de WAR.siege.city), o jogador gasta ações (?acoes=N, padrão 2) e o batalhão
// chega a tempo: siegeArrive devolve o descritor da Defesa (BATTLE.origem). Se as ações zerarem o prazo o tile cairia (sem Defesa); aqui o teste sempre chega a tempo.
function battleOrigemCerco() {
  const q = new URLSearchParams(location.search); if (q.get('origem') !== 'cerco') return;
  const foe = typeof tileTestFoe === 'function' ? tileTestFoe() : null, key = BATTLE.key = 'teste', ac = Math.min(+q.get('acoes') || 2, WAR.siege.city - 1);
  siegeStart(key, foe ? foe.fid : 'bandit', true, 'W'); siegeTick(key, ac);
  BATTLE.origem = siegeArrive(key); BATTLE.origem.acoesGastas = ac;
}

// Soldado de posto preso (Choque e Defesa): marchando ao centro e fora da área sem sair do lugar por `time` s -> teleporte logo além da borda da área, na direção em
// que está; preso de novo -> recua (some e conta como baixa), para a vitória nunca depender dele. Roda no tique de 0,4 s de updateBattle.
function battleTickStuck() {
  if (!BATTLE.center || BATTLE.stuckT > BATTLE.t) return;
  BATTLE.stuckT = BATTLE.t + 0.4;
  const S = BATTLE_MOD.stuck, c = BATTLE.center, edge = BATTLE.centerR + S.offset;
  for (const e of BATTLE.area.enemies) {
    if (!e.alive || !e.btl || e.btl.kind !== 'post') continue;
    const d = Math.hypot(e.x - c.x, e.z - c.z), k = e.stk;
    if (!e.recall || d <= edge + 1 || (k && Math.hypot(e.x - k.x, e.z - k.z) > S.move) || !k) { e.stk = { x: e.x, z: e.z, t: BATTLE.t }; continue; }
    if (BATTLE.t - k.t < S.time) continue;
    e.stk = { x: e.x, z: e.z, t: BATTLE.t };
    if (e.stuckN) { e.alive = false; e.gone = true; scene.remove(e.group); BATTLE.area.aliveEnemies--; BATTLE.area.totalEnemies--; continue; }   // recua
    e.stuckN = 1; const f = freeSpot(c.x + (e.x - c.x) / d * edge, c.z + (e.z - c.z) / d * edge, 0.5, 1.8, 0.45);
    e.x = f[0]; e.z = f[1]; e.y = tH(e.x, e.z); e.path = null; if (e.group) e.group.position.set(e.x, e.y, e.z);
  }
}

// ---------- Modo ataque (passo 4; ?cenario=batalha&modo=ataque; 4B-2 e 4B-12) ----------
// POI alvo (marcador provisório do cenário: bandeira inimiga e sacos de areia; o POI real entra na integração, passo 10). Devolve a bandeira (muda de cor ao conquistar).
function battleBuildTarget(x, z) {
  const grp = new THREE.Group(), y = tH(x, z);
  part(grp, GEO_BOX, 0.5, 6, 0.5, 0x4a3a2a, 0, 3, 0); const flag = part(grp, GEO_BOX, 2.4, 1.4, 0.1, 0xb02020, 1.3, 5.2, 0);
  grp.position.set(x, y, z); scene.add(grp);
  for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + 0.4; battleBuildCover('sacos', x + Math.cos(a) * 6, z + Math.sin(a) * 6, i % 2); }
  return flag;
}

// Pontos dos 3 satélites (4B-12): POIs reais do dono do tile (pois, a 100-150 do alvo) primeiro; o que faltar vira posto temporário em arco ([graus, distância]).
function battleSatSpots(T, pois) {
  const A = BATTLE_MOD.ataque, out = [];
  for (const p of pois || []) {
    const d = Math.hypot(p.cx - T.x, p.cz - T.z);
    if (out.length < 3 && d >= A.satRange[0] && d <= A.satRange[1]) out.push({ x: p.cx, z: p.cz, poi: p });
  }
  for (const [deg, dist] of A.satTemp.slice(out.length)) {
    const a = deg * Math.PI / 180, f = freeSpot(T.x + Math.cos(a) * dist, T.z + Math.sin(a) * dist, 0.5, 1.8, 0.45);
    out.push({ x: f[0], z: f[1] });
  }
  return out.slice(0, 3);
}

// Modo ataque (regra de 2026-11-25): SEM batalhão no tile (?batalhao=0) o jogador luta só com a guarnição do POI alvo; COM batalhão (padrão) a guarnição é completada até
// `garrisonBattalion` (30) com soldados tirados da reserva (total = reserva + guarnição original) e 3 satélites (POIs reais do dono do tile ou postos temporários, com a reserva do inimigo dividida) mandam reforços em lotes ao alvo à medida
// que os soldados morrem (cota de vivos). opts (integração, passo 10): { poi, pois } = POI real do alvo e POIs do dono do tile (satélites e anexação junto).
function battleStartAtaque(opts) {
  opts = opts || {};
  const A = BATTLE_MOD.ataque, home = WORLD.home, c = A.center;
  tileTestFillEnemies(tileTestFoe(), 0);   // a cidade inimiga fica vazia: as únicas lutas são a guarnição e os reforços
  const flag = battleBuildTarget(c.x, c.z), at = new URLSearchParams(location.search).get('pos') === 'trilha' ? A.start : { x: home.cx + 4, z: home.cz + 4 };   // padrão: nasce na sua cidade e caminha até o alvo
  const f = freeSpot(at.x, at.z, 0.5, 1.8, 0.45);
  P.x = f[0]; P.z = f[1]; P.y = tH(P.x, P.z) + 0.1; P.vx = P.vz = P.vy = 0; P.camY = P.y;
  P.yaw = Math.atan2(-(c.x - P.x), -(c.z - P.z)); P.pitch = -0.05;
  battleConfig('ataque');
  BATTLE.base = { x: A.start.x, z: A.start.z };   // a reposição do seu lado nasce na abertura da trilha, perto do alvo (4B-11)
  const bat = battleParam('batalhao', 1) !== 0, er = bat ? battleParam('inim', BATTLE_MOD.enemyReserve) : 0, base = battleParam('guarnicao', A.garrison);
  const fill = bat ? clamp(A.garrisonBattalion - base, 0, er) : 0, gar = base + fill;   // o batalhão completa a guarnição com soldados da reserva (não cria novos)
  const n = Math.min(tileTestCount('alia', TILE_TEST.allies), BATTLE_MOD.allyTotal), pr = Math.max(0, Math.min(battleParam('reserva', 1e9), BATTLE_MOD.allyTotal - n));
  for (let i = 0; i < n; i++) spawnAlly(P.x + (i - n / 2) * 1.5, P.z + 3, home);
  const name = opts.poi && typeof POI_DEFS !== 'undefined' && POI_DEFS[opts.poi.type] ? POI_DEFS[opts.poi.type].n : TXT_BATTLE_TARGET_NAME;
  const T = { x: c.x, z: c.z, flag, name, captured: false, owner: 'enemy', poi: opts.poi || null, sats: [], pois: [] };
  BATTLE.center = { x: c.x, z: c.z }; BATTLE.centerR = A.retakeR; BATTLE.postCfg = A; BATTLE.target = T;   // os reforços marcham ao alvo
  T.gen = battleAddGen(c.x, c.z, 0, { radius: A.alert });   // o alvo é um gerador sem reserva: só dá o raio de alerta e a coleira da guarnição
  for (let i = 0; i < gar; i++) {
    const a = i / gar * 6.283, r = 2 + (i % 4) * 2.5, e = battleSpawnFrom(T.gen), q = freeSpot(c.x + Math.cos(a) * r, c.z + Math.sin(a) * r, 0.5, 1.8, 0.45);
    e.x = q[0]; e.z = q[1]; e.y = tH(e.x, e.z); e.group.position.set(e.x, e.y, e.z); e.homeX = c.x; e.homeZ = c.z;
    e.aggro = false; e.unseenT = 0;   // a guarnição só reage quando o jogador chega ao raio de alerta
  }
  if (bat) {
    const spots = battleSatSpots(T, opts.pois);
    battleSplit(er - fill, spots.length).forEach((r, i) => {
      const g = battleAddGen(spots[i].x, spots[i].z, r, { side: 'enemy', kind: 'post' }); g.role = 'sat'; T.sats.push(g); if (spots[i].poi) T.pois.push(spots[i].poi);
    });
  }
  if (T.poi) T.pois.unshift(T.poi);
  BATTLE.total0 = er + base; BATTLE.ally.total0 = n + pr; BATTLE.ally.reserve = pr;   // total = reserva + guarnição original (ex.: 100 + 12 = 112)
  armyAssault(BATTLE.area, '');
  BATTLE.on = true; battleHudDraw();
}

// Anexação (4B-2 e 4B-7): o alvo passa ao jogador (bandeira muda de cor); em jogo real, o POI e os demais POIs do tile passam junto para o novo dono.
function battleAnnex(T) {
  T.captured = true; T.owner = 'player'; T.flag.material = mat(facColor(0) || 0x2a4a9a);
  if (T.gen.ring) { scene.remove(T.gen.ring); scene.remove(T.gen.leashRing); T.gen.ring = T.gen.leashRing = null; }
  for (const p of T.pois) if (typeof poiSetOwner === 'function') poiSetOwner(p, 'player');
}

// Ataque, a cada quadro: o POI é conquistado quando morre o último soldado da guarnição (os de reforço não contam). Se ainda há reserva ou reforços vivos, avisa
// (txtBattleTomado); a batalha só termina (vitória) com o alvo seu e a reserva e os vivos do inimigo zerados.
function battleTickAtaque() {
  const T = BATTLE.target; if (BATTLE.small || !T || T.captured || P.dead || BATTLE.area.enemies.some(e => e.alive && e.btl === T.gen)) return;
  battleAnnex(T);
  const more = BATTLE.area.aliveEnemies > 0 || BATTLE.gens.some(g => g.side === 'enemy' && g.reserve > 0);
  if (more) toast(txtBattleTomado(T.name), 6000);
}

// ---------- Modo pequena (passo 7; ?cenario=batalha&modo=pequena; 4B-3, 4B-7 e 4B-16) ----------
// Tile inimigo SEM batalhão: o jogador e só as elites (até 10) contra uma defesa local de número fixo, sem reposição de nenhum lado e sem placar. O POI principal é mais
// forte (a defesa tem mais vida: hpMul). A defesa acorda no raio de alerta e tem coleira (como a guarnição do Ataque). Conquista = matar a defesa (decisão de 2026-11-25: sem tempo
// no centro); o raio de alerta e a coleira valem até a conquista; a vitória sai logo depois da anexação. Derrota branda: o comandante cai e perde só o que morreu na luta (protótipo: tela com Reiniciar).
// opts (integração, passo 10): { poi } = POI real do alvo (passa ao jogador junto com o tile).
function battleStartPequena(opts) {
  opts = opts || {};
  const A = BATTLE_MOD.pequena, home = WORLD.home, c = A.center;
  tileTestFillEnemies(tileTestFoe(), 0);   // a cidade inimiga fica vazia: a única luta é a defesa local
  const flag = battleBuildTarget(c.x, c.z), f = freeSpot(home.cx + 4, home.cz + 4, 0.5, 1.8, 0.45);
  P.x = f[0]; P.z = f[1]; P.y = tH(P.x, P.z) + 0.1; P.vx = P.vz = P.vy = 0; P.camY = P.y;
  P.yaw = Math.atan2(-(c.x - P.x), -(c.z - P.z)); P.pitch = -0.05;
  battleConfig('pequena');
  BATTLE.base = { x: P.x, z: P.z };
  const n = Math.min(tileTestCount('alia', TILE_TEST.allies), A.elites), gar = Math.round(battleParam('guarnicao', A.garrison));
  for (let i = 0; i < n; i++) spawnAlly(P.x + (i - n / 2) * 1.5, P.z + 3, home);
  const name = opts.poi && typeof POI_DEFS !== 'undefined' && POI_DEFS[opts.poi.type] ? POI_DEFS[opts.poi.type].n : TXT_BATTLE_TARGET_NAME;
  const T = { x: c.x, z: c.z, flag, name, captured: false, owner: 'enemy', poi: opts.poi || null, sats: [], pois: opts.poi ? [opts.poi] : [], capT: 0 };
  BATTLE.target = T;
  T.gen = battleAddGen(c.x, c.z, 0, { radius: A.alert });   // sem reserva: só dá o raio de alerta e a coleira da defesa (somem ao conquistar, em battleAnnex)
  for (let i = 0; i < gar; i++) {
    const a = i / gar * 6.283, r = 2 + (i % 4) * 2.5, e = battleSpawnFrom(T.gen), q = freeSpot(c.x + Math.cos(a) * r, c.z + Math.sin(a) * r, 0.5, 1.8, 0.45);
    e.x = q[0]; e.z = q[1]; e.y = tH(e.x, e.z); e.group.position.set(e.x, e.y, e.z); e.homeX = c.x; e.homeZ = c.z;
    e.aggro = false; e.unseenT = 0; e.hp *= A.hpMul; e.maxhp *= A.hpMul;   // o POI principal é mais forte
  }
  BATTLE.total0 = gar; BATTLE.ally.total0 = n; BATTLE.squadOn = false;
  battleSquadStand();   // os soldados só aparecem em volta do jogador (teleporte) quando a defesa acorda; antes patrulham aqui
  BATTLE.on = true;
}

// Batalha pequena, a cada quadro: (1) os soldados só acompanham o jogador enquanto a defesa está acordada (ele está lutando): ao acordar são teleportados para trás dele,
// ao dormir de novo (ele se afastou) ficam patrulhando onde ele está; (2) morta a defesa o POI é anexado na hora (sem tempo no centro) e a vitória sai no tique de
// updateBattle. (battleTickAtaque não age aqui.)
function battleTickPequena() {
  const T = BATTLE.target; if (!BATTLE.small || !T || T.captured || P.dead) return;
  const fight = T.gen.awake;
  if (fight !== BATTLE.squadOn) { BATTLE.squadOn = fight; if (fight) armyAssault(BATTLE.area, ''); else battleSquadStand(); }
  if (!BATTLE.area.enemies.some(e => e.alive)) battleAnnex(T);
}
