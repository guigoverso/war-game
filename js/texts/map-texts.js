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
  'Formato do mundo: <b>' + win.F.fmtName + '</b> • ' + (win.free ? '<b>janela livre</b>' : 'tile <b>' + win.ti + ',' + win.tj + '</b>') + ' (' + win.size + '×' + win.size + ') • centro no mundo ('
  + win.cx + ', ' + win.cz + ') • ' + win.neighbors.length + ' trilha(s), ' + win.openings.length + ' abertura(s) na borda'
  + (win.openings.length ? ' (' + win.openings.map(o => o.dir + (o.road ? '' : ' sem estrada')).join(', ') + ')' : '') + '.'
  + (win.desc ? txtTileDesc(win) : '');

// Rótulo de cada tema de tile (painel do cenário de tile).
const TXT_TILE_THEME = { cidade: 'Cidade', vila: 'Vila', fazenda: 'Fazenda', mina: 'Mina', serraria: 'Serraria', animais: 'Animais', ponte: 'Ponte',
  fortaleza: 'Fortaleza', ruinas: 'Ruínas', passagem: 'Passagem' };
// Linha do descritor do tile no painel: tema, terreno (água e biomas), adequação do terreno ao tema, batalha e se o tile está vazio. win = WORLD.win.
const txtTileDesc = win => {
  const d = win.desc, t = d.terreno, bn = ['planície', 'floresta', 'deserto', 'neve', 'rocha'], b = t.biomas;
  return '<br>Tema: <b>' + TXT_TILE_THEME[d.tema] + '</b> • terreno: ' + Math.round(t.agua * 100) + '% água; '
    + bn.map((n, k) => Math.round(b[k] * 100) + '% ' + n).join(', ') + ' (da terra) • adequação ao tema ' + Math.round(d.adequacao * 100) + '%'
    + (d.batalha ? ' • batalha <b>' + d.batalha.tipo + '</b>: atacante entra por ' + (d.batalha.entradaAtacante || '—')
      + (d.batalha.entradaDefensor ? ', defensor por ' + d.batalha.entradaDefensor : '') + (d.batalha.estacionado ? ', estacionado: ' + d.batalha.estacionado : '')
      + (d.batalha.ajustada ? ' (entrada pedida não existe: ajustada)' : '') : '')
    + (win.empty ? ' • <i>tile vazio (só terreno e bordas; POIs vêm na 4E)</i>' : '');
};
// Rótulo do atalho que troca o tema do tile atual (painel do cenário de tile).
const TXT_TILE_THEMES = 'Trocar o tema:';

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

// ---------- Cidade enorme (4B): painel do cenário de tile com tema Cidade ----------
// Rótulo da linha de atalhos que troca o formato da pegada (?forma_cidade=) e nome de cada formato (cidade enorme, CITY_SHAPES em cityfoot.js).
const TXT_TILE_SHAPES = 'Formato da cidade:';
const TXT_TILE_SHAPE_NAME = { quadrado: 'Quadrado', circulo: 'Círculo', losango: 'Losango', oval: 'Oval', cruz: 'Cruz', ele: 'Em L', flor: 'Flor' };
// Rótulo da linha de atalhos que troca o relevo de demonstração (?relevo=) e nome de cada um (mapwin.js reliefDemo; 'natural' = o relevo do campo do mundo).
const TXT_TILE_RELIEFS = 'Relevo do tile:';
const TXT_TILE_RELIEF_NAME = { natural: 'Natural', plano: 'Plano', colinas: 'Colinas', lago: 'Lago', rio: 'Rio', costa: 'Costa' };
// Rótulo da linha de atalhos que troca o muro da cidade (?muro=) e nome de cada tipo.
const TXT_TILE_WALLS = 'Muro:';
const TXT_TILE_WALL_NAME = { pedra: 'Pedra', palicada: 'Paliçada', cerca: 'Cerca', nenhum: 'Nenhum' };
// Resumo da cidade enorme no painel do cenário: formato, caixa, área da pegada (e % do tile), casas, praças extras e tempo de construção. c = cidade (WORLD.home).
const txtTileCityInfo = c => {
  let n = 0; if (c.foot) for (let i = 0; i < c.foot.length; i++) n += c.foot[i];
  return 'Cidade enorme: formato <b>' + (TXT_TILE_SHAPE_NAME[c.shape] || c.shape) + '</b> • caixa ' + (2 * c.half + 1) + '×' + (2 * c.half + 1) + ' • pegada '
    + n + ' blocos (' + Math.round(n * 100 / (W * W)) + '% do tile) • ' + (c.houses || []).length + ' prédios • ' + (c.streets || []).length + ' ruas • '
    + (c.plazaCount || 0) + ' praça(s) extra(s) • construída em ' + (c.buildMs || 0) + ' ms';
};

// Resultado do teste de capacidade (?pois=max) no painel do cenário: total e quantos de cada tipo couberam. f = WORLD.tileFill.
const txtTileFill = f => 'Teste de POIs: <b>' + f.total + '</b> couberam (' + Object.keys(f.counts).map(t => f.counts[t] + ' ' + POI_DEFS[t].n.toLowerCase()).join(', ') + ') em ' + f.ms + ' ms';
