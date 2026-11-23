'use strict';
// ---------- Textos: mapa mundi e mapas locais (feature 5) ----------
// Cada texto tem um comentário acima: onde aparece e para que serve.

// Aviso ao abrir o cenário ?cenario=batalha (toast). n = soldados inimigos, a = soldados do jogador, half = meia-largura da cidade, size = lado do mapa.
const txtTileTestOpen = (n, a, half, size) =>
  '🧪 Teste de batalha: mapa de ' + size + '. Você começa na sua cidade (canto); a cidade inimiga, de ' + (half * 2) + ' de lado, tem ' + n
  + ' soldados e a batalha começa quando você se aproximar, com ' + a + ' soldados seus. Pausa (Tab) → Facções tem os atalhos e o desempenho.';

// Cabeçalho do painel de testes do cenário (aba Facções da pausa).
const TXT_TILETEST_TITLE = '🧪 Teste de batalha (mapa local de cidade)';

// Explicação do painel de testes do cenário.
const TXT_TILETEST_HELP = 'Mede o desempenho com muitos atores. "Medir" grava a média de quadros por segundo e o tempo de atualização/desenho. '
  + 'Compare com ?inim=0&alia=0 (sem batalha).';

// Linha do relatório de desempenho. p = {fps, upd, ren, frames}, e = inimigos vivos, a = aliados vivos.
const txtTileTestPerf = (p, e, a) =>
  p.fps.toFixed(1) + ' qps • atualizar ' + p.upd.toFixed(1) + ' ms • desenhar ' + p.ren.toFixed(1) + ' ms (' + p.frames + ' quadros) • inimigos '
  + e + ' • aliados ' + a;

// ---------- Cenário ?cenario=tile (campo do mundo e mapa local por janela; js/local/mapwin.js) ----------

// Cabeçalho do painel do cenário de tile (aba Facções da pausa).
const TXT_TILE_TITLE = '🧪 Teste de tile (janela do campo do mundo)';

// Dados do tile no painel. win = WORLD.win (formato do mundo, posição na grade, tipo, tamanho, aberturas e trilhas).
const txtTileInfo = win =>
  'Formato do mundo: <b>' + win.F.fmtName + '</b> • ' + (win.free ? '<b>janela livre</b>' : 'tile <b>' + win.ti + ',' + win.tj + '</b>') + ' (' + win.kind + ', ' + win.size + '×' + win.size + ') • centro no mundo ('
  + win.cx + ', ' + win.cz + ') • ' + win.neighbors.length + ' trilha(s), ' + win.openings.length + ' abertura(s) na borda'
  + (win.openings.length ? ' (' + win.openings.map(o => o.dir + (o.road ? '' : ' sem estrada')).join(', ') + ')' : '') + '.';

// Legenda da imagem do mundo no painel do cenário de tile.
const TXT_TILE_MAPHELP = 'Quadrado vermelho = este tile; pontos brancos = centros da grade; linhas claras = trilhas. A grade é provisória (etapa 5 troca por um grafo).';

// Rótulo do atalho para um tile vizinho. t = {dir:'E'|'W'|'S'|'N', i, j}.
const txtTileDirLabel = t => ({ E: '→ Leste', W: '← Oeste', S: '↓ Sul', N: '↑ Norte' }[t.dir]) + ' (' + t.i + ',' + t.j + ')';

// Linha dos atalhos para vizinhos; texto quando o tile não tem trilha; botão que leva o jogador à primeira abertura.
const TXT_TILE_NEIGHBORS = 'Ir para o vizinho:';
const TXT_TILE_NONEIGHBOR = 'nenhum (tile sem trilhas; use ?ti=&tj= na URL)';
const TXT_TILE_GOBORDER = '📍 Ir à primeira abertura da borda';

// Rótulo dos atalhos que deslocam a janela 128 blocos (teste de continuidade: o terreno comum às duas janelas tem de ser igual; compare com o mapa, tecla M).
const TXT_TILE_SHIFT = 'Deslocar a janela 128 blocos (continuidade):';
