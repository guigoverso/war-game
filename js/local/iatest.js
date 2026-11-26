'use strict';
// ---------- Cenário ?cenario=ia (feature 12, passo 5): atiradores com cobertura e carregador ----------
// Mapa de teste de 320 (o mesmo do ?cenario=batalha, sem soldados na cidade). O jogador fica sozinho no oeste; a leste há atiradores inimigos e, no meio,
// peças de cobertura (as mesmas do Choque, battle.js). Posições e quantidades em IA_TEST. Nada daqui roda no jogo normal.
const IA_TEST = {
  // Onde o jogador começa e para onde olha (blocos do mapa de teste). Padrão: 120,60
  start: { x: 120, z: 60 },
  // Soldados do jogador no ?aliados=1 (?alia=N troca). Padrão: 5
  allies: 5,
  // Atiradores inimigos: tipo e posição (leste, a ~70 do jogador). Padrão: 4 soldados, 1 franco-atirador, 1 saqueador, 1 metralhador
  shooters: [['soldier', 195, 52], ['soldier', 195, 60], ['soldier', 195, 68], ['soldier', 200, 60], ['sniper', 210, 48], ['raider', 200, 72], ['gunner', 205, 60]],
  // Peças de cobertura: [tipo, x, z, girada]. Padrão: 8 peças espalhadas entre os dois lados
  cover: [['sacos', 140, 50, 0], ['barricada', 145, 66, 1], ['caixotes', 155, 58, 0], ['carroca', 160, 72, 1],
    ['sacos', 170, 46, 1], ['barricada', 172, 62, 0], ['caixotes', 180, 54, 1], ['sacos', 150, 80, 0]]
};
const iaTestOn = () => new URLSearchParams(location.search).get('cenario') === 'ia';

function iaTestStart() {
  tileTestFillEnemies(tileTestFoe(), 0);   // a cidade inimiga fica vazia: só os atiradores lutam
  const f = freeSpot(IA_TEST.start.x, IA_TEST.start.z, 0.5, 1.8, 0.45);
  P.x = f[0]; P.z = f[1]; P.y = tH(P.x, P.z) + 0.1; P.vx = P.vz = P.vy = 0; P.camY = P.y;
  P.yaw = Math.atan2(-(IA_TEST.shooters[0][1] - P.x), -(IA_TEST.shooters[0][2] - P.z)); P.pitch = -0.05;
  const area = { kind: 'raid', id: 801, name: 'Teste de IA', cx: P.x, cz: P.z, y: P.y, half: 40, biome: 0, rank: 1, hpMul: 1, state: 'attacking',
    owner: 'enemy', home: false, enemies: [], npcs: [], walk: [], flags: [], aliveEnemies: 0, totalEnemies: 0, leash: 999 };
  WORLD.areas.push(area);
  for (const [k, x, z, a] of IA_TEST.cover) battleBuildCover(k, x, z, a);
  for (const [t, x, z] of IA_TEST.shooters) spawnEnemy(area, t, x, z).def = EDEF[t];   // alcance cheio (a área 'raid' o reduziria à metade)
  iaTestAllies(area);
}

// ?aliados=1 (passo 6): soldados do jogador (?alia=N, padrão 5) em modo de assalto contra os atiradores, para ver o carregador e a cobertura deles.
function iaTestAllies(area) {
  if (new URLSearchParams(location.search).get('aliados') !== '1') return;
  const n = tileTestCount('alia', IA_TEST.allies);
  for (let i = 0; i < n; i++) spawnAlly(P.x + (i - n / 2) * 1.5, P.z + 3, WORLD.home);
  armyAssault(area, '');
}
