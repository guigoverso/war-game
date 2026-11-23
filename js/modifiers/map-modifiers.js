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

// ---------- Etapa 4 do plano: tiles com tema (feature 8, docs/features/8_tiles-e-vilas.md; plano em 9_plano-implementacao-tiles.md) ----------
// Lado do tile (mapa local), em blocos, igual para TODOS os tiles (múltiplo de 32). ?tam=N troca só para teste. Padrão: 384
const TILE_SIZE = 384;
// Temas de tile (o tema decide o POI principal e a composição). 'passagem' = tile sem tema, fora das rotas, sem vila nem comércio.
const TILE_THEMES = ['cidade', 'vila', 'fazenda', 'mina', 'serraria', 'animais', 'ponte', 'fortaleza', 'ruinas', 'passagem'];
// Biomas em que cada tema nasce (0 planície, 1 floresta, 2 deserto, 3 neve, 4 rocha; lista vazia = qualquer; ponte = água). Padrão: tabela da rodada 2
const TILE_THEME_BIOMES = { cidade: [], vila: [], fazenda: [0, 2], mina: [3, 4], serraria: [1], animais: [1], ponte: [], fortaleza: [], ruinas: [], passagem: [] };
// Peso de cada tema ao sortear o tema de um tile temático (proporção inicial de um mundo de ~36 nós: 5 a 7 cidades, 7 a 9 vilas, ~10 de recurso,
// 2 a 3 fortalezas, 2 a 3 pontes, 1 a 2 ruínas). Padrão: cidade 6, vila 8, fazenda 4, mina 3, serraria 3, animais 2, ponte 2.5, fortaleza 2.5, ruínas 1.5
const TILE_THEME_WEIGHT = { cidade: 6, vila: 8, fazenda: 4, mina: 3, serraria: 3, animais: 2, ponte: 2.5, fortaleza: 2.5, ruinas: 1.5 };
// Porcentagem de tiles COM tema (o resto é passagem) quando o jogador não escolhe. Opção da criação do mundo; por enquanto ?temas=N na URL. Limites 0 a 100. Padrão: 70
const TILE_THEMED_PCT = { def: 70, min: 0, max: 100 };
// Composição de POIs por tema (tabela aprovada da feature 8): principal, tema (min a max entre as opções) e ambiente (min a max entre as opções);
// baús escondidos em todo tile. As opções são ids de POI (ou 'qualquer' = qualquer POI, com peso pelo terreno). Só dados: o gerador (4E) lê.
const TILE_CHESTS = [6, 10];
const TILE_COMPOSE = {
  cidade:   { main: 'cidade', theme: [4, 5, ['qualquer']], ambient: [3, 5, ['acampamento', 'bando', 'gruta']] },
  vila:     { main: 'vila', theme: [4, 5, ['pousada', 'taverna', 'fazenda_pequena', 'santuario', 'entreposto']], ambient: [3, 5, ['acampamento', 'bando', 'gruta', 'torre_vigia']] },
  fazenda:  { main: 'fazenda', theme: [4, 5, ['fazenda_pequena', 'plantacao', 'pousada', 'taverna', 'vila_ou_descanso']], ambient: [6, 8, ['acampamento', 'bando', 'torre_vigia', 'ruinas_rara']] },
  mina:     { main: 'mina', theme: [4, 5, ['mina_pequena', 'alojamento', 'pousada', 'entreposto', 'vila_ou_descanso']], ambient: [6, 8, ['gruta', 'acampamento', 'bando']] },
  serraria: { main: 'serraria', theme: [4, 5, ['serraria_pequena', 'alojamento', 'pousada', 'cacadores', 'vila_ou_descanso']], ambient: [6, 8, ['bando', 'acampamento', 'torre_vigia']] },
  animais:  { main: 'cacadores', theme: [4, 5, ['cacadores_pequeno', 'alojamento', 'pousada', 'santuario']], ambient: [6, 8, ['bando', 'gruta', 'acampamento']] },
  ponte:    { main: 'ponte', theme: [4, 5, ['pousada', 'taverna', 'entreposto', 'pesca', 'torre_vigia']], ambient: [6, 8, ['acampamento', 'bando']] },
  fortaleza:{ main: 'forte', theme: [4, 5, ['acampamento_fortificado', 'atalaia', 'trincheira', 'pousada', 'vila_apoio']], ambient: [6, 8, ['acampamento', 'bando', 'gruta']] },
  ruinas:   { main: 'ruinas', theme: [4, 5, ['ruinas_menor', 'reliquia', 'santuario']], ambient: [6, 8, ['guardioes', 'bando', 'gruta', 'acampamento']] },
  passagem: { main: null, theme: [0, 2, ['fazenda', 'santuario', 'pousada_abandonada']], ambient: [8, 12, ['caverna', 'acampamento', 'bando', 'matilha']] }
};
// Tipos de batalha no tile (rodada 8): conquista (a facção ataca o POI principal), defesa (a facção está no principal e repele) e choque (dois batalhões).
const TILE_BATTLES = ['conquista', 'defesa', 'choque'];
// Verdadeiro com ?cenario=tile (a 4A abre o tile VAZIO: só terreno, borda e aberturas; ?cidade=1 devolve a cidade central da etapa 3).
// Etapa 4B: o tile de tema 'cidade' agora traz a cidade enorme (CITY_HUGE em city-modifiers.js); os outros temas seguem vazios até as sessões 4C/4E.
// Cidade que o tile recebe: 'enorme' (tema cidade), 'antiga' (?cidade=1: a cidade pequena da etapa 3, para comparar) ou null (tile vazio).
const tileCityKind = tema => {
  if (!mapTileOn()) return null;
  if (new URLSearchParams(location.search).get('cidade') === '1') return 'antiga';
  return tema === 'cidade' ? 'enorme' : null;
};
// Tile sem POIs (só a 4E os põe): todo tile do cenário, menos ?cidade=1 (cidade antiga com os POIs do gerador antigo).
const tileBare = () => mapTileOn() && new URLSearchParams(location.search).get('cidade') !== '1';
const tileEmptyOn = tema => mapTileOn() && !tileCityKind(tema);

// ---------- Etapa 3 do plano: campo do mundo e mapa local por janela (atrás de ?mundo=1 e de ?cenario=tile) ----------
// O mundo é uma FUNÇÃO de posição (js/macro/worldfield.js); o mapa local é uma janela dessa função. Valores = ponto de partida, a calibrar.
const WORLD_FIELD = {
  // Grade PROVISÓRIA de tiles (a etapa 5 troca por um grafo): quantos tiles de lado, distância entre centros e quanto cada centro pode sair do lugar
  // (em blocos). Mundo = tiles x spacing de lado. A distância é o TILE_SIZE (tiles vizinhos se encostam). Padrão: 7, TILE_SIZE (384), 48
  tiles: 7, spacing: TILE_SIZE, jitter: 48,
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
// ?cenario=tile mostra um tile da grade: ?ti=&tj= escolhe; ?tema=fazenda o tema (sem ele sai do sorteio por ?temas=70); ?tam=384 o lado; ?forma= o formato do mundo;
// ?pos=borda começa na primeira abertura; ?batalha=defesa&entrada=L descreve uma batalha (conquista|defesa|choque; &entrada2=O segundo lado do choque;
// &estac=atacante|defensor = quem já estava no tile).
const mapTileOn = () => new URLSearchParams(location.search).get('cenario') === 'tile';
// ?mundo=1 (ou o cenário de tile) gera o mapa local como janela do campo do mundo, em vez do mapa antigo.
const mapWorldOn = () => mapTileOn() || new URLSearchParams(location.search).get('mundo') === '1';
// Lado do tile: TILE_SIZE, ou ?tam=N (arredondado a múltiplo de 32, entre 128 e 768).
const mapTileSize = () => {
  const t = +new URLSearchParams(location.search).get('tam');
  return t ? Math.max(128, Math.min(768, Math.round(t / 32) * 32)) : TILE_SIZE;
};
