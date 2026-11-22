'use strict';
// ---------- Modificadores: mapa mundi e mapas locais (feature 5; decisões em docs/features/5_mapa-mundi.md) ----------
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo.
// Os valores são PONTO DE PARTIDA, a calibrar testando.

// Cenário de teste de batalha ?cenario=batalha (mapa local de 320 com duas cidades: a sua, pequena, num canto, e a de outra facção, grande).
// Você começa na sua cidade; a batalha começa quando se aproxima da cidade inimiga (regra normal de ataque a cidade).
// Parâmetros de URL que sobrescrevem: ?inim=N (soldados na cidade inimiga) e ?alia=N (soldados com o jogador); ?inim=0&alia=0 mede o mapa sem batalha;
// ?pos=centro começa no meio da cidade inimiga e ?pos=portao no portão dela.
const TILE_TEST = {
  // Lado do mapa local, em blocos (múltiplo de 32). Padrão: 320
  size: 320,
  // Cidade do jogador: centro (x, z) no canto e meia-largura (bem pequena; 36 é a menor cidade normal do jogo). Padrão: x 52, z 52, half 36
  home: { x: 52, z: 52, half: 36 },
  // Cidade da outra facção: centro (x, z) no canto oposto e meia-largura (lado de 200 = ~39% da área do mapa). Padrão: x 210, z 210, half 100
  big: { x: 210, z: 210, half: 100 },
  // Soldados inimigos na cidade grande (o jogo põe alguns; o cenário completa ou tira até chegar a este número). Padrão: 30
  defenders: 30,
  // Soldados do jogador, criados na cidade dele; vão atrás dele quando o ataque começa. Padrão: 10
  allies: 10,
  // Tipo de inimigo usado para completar (ver EDEF em entities.js). Padrão: 'soldier'
  enemyType: 'soldier',
  // Distância do jogador ao portão inimigo com ?pos=portao, em blocos. Padrão: 14
  startGap: 14,
  // Quantos quadros medir para o relatório de desempenho (window.TILETEST.perf). Padrão: 300
  perfFrames: 300
};
// Verdadeiro quando o cenário de teste de batalha está ligado pela URL.
const tileTestOn = () => new URLSearchParams(location.search).get('cenario') === 'batalha';
