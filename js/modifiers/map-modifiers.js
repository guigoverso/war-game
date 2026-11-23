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

// ---------- Etapa 3 do plano: campo do mundo e mapa local por janela (atrás de ?mundo=1 e de ?cenario=tile) ----------
// O mundo é uma FUNÇÃO de posição (js/macro/worldfield.js); o mapa local é uma janela dessa função. Valores = ponto de partida, a calibrar.
const WORLD_FIELD = {
  // Grade PROVISÓRIA de tiles (a etapa 5 troca por um grafo): quantos tiles de lado, distância entre centros e quanto cada centro pode sair do lugar
  // (em blocos). Mundo = tiles x spacing de lado. Padrão: 7, 288, 48
  tiles: 7, spacing: 288, jitter: 48,
  // Tamanho da janela por tipo de tile, em blocos (múltiplo de 32). Padrão: cidade 320, natureza 256
  sizeCity: 320, sizeNature: 256,
  // Formatos do mundo (landMask em escala de mundo). Padrão: continentes, pangeia, arquipélagos e grande lago
  formats: ['continentes', 'pangeia', 'arquipelagos', 'lago'],
  // Largura da transição terra-mar em unidades do mundo (1 = metade do mundo, ~1000 blocos). Menor = costa mais curta. Padrão: 0.12
  coastWidth: 0.12,
  // Fração de terra que um tile/janela deve ter para ser escolhido como padrão (busca a mais próxima de landTarget, mínimo landMin). Padrão: 0.8 e 0.45
  landTarget: 0.8, landMin: 0.45,
  // Passo (em blocos) da amostragem usada para medir terra e desenhar o mapa mundi de teste. Padrão: 16
  sampleStep: 16,
  // Chance de existir trilha entre dois tiles vizinhos de terra (sorteio pela aresta) e quanto o caminho serpenteia (blocos). Padrão: 0.8 e 36
  trailProb: 0.8, trailWobble: 36,
  // Borda fechada por árvores: largura mínima e variação (blocos, com ruído), fração da faixa que é parede de colisão. Padrão: 6, 5, 0.6
  borderBase: 6, borderVar: 5, borderSolid: 0.6,
  // Abertura da borda onde há trilha: meia largura e profundidade (blocos para dentro). Padrão: 5 e 24
  gapHalf: 5, gapDepth: 24,
  // Detalhe fino do relevo (1 = igual ao mapa antigo; menor = terreno mais liso). Padrão: 0.8
  detail: 0.8
};
// ?cenario=tile mostra um tile da grade (?ti=&tj= escolhe; ?tipo=cidade usa a janela de cidade; ?forma= escolhe o formato; ?pos=borda começa na primeira abertura).
const mapTileOn = () => new URLSearchParams(location.search).get('cenario') === 'tile';
// ?mundo=1 (ou o cenário de tile) gera o mapa local como janela do campo do mundo, em vez do mapa antigo.
const mapWorldOn = () => mapTileOn() || new URLSearchParams(location.search).get('mundo') === '1';
// Lado da janela de tile pedida pela URL (?tipo=cidade = sizeCity; qualquer outro = sizeNature).
const mapTileSize = () => new URLSearchParams(location.search).get('tipo') === 'cidade' ? WORLD_FIELD.sizeCity : WORLD_FIELD.sizeNature;
