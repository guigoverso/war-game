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
  return (c.vila ? 'Vila' : 'Cidade enorme') + ': formato <b>' + (TXT_TILE_SHAPE_NAME[c.shape] || c.shape) + '</b> • caixa ' + (2 * c.half + 1) + '×' + (2 * c.half + 1) + ' • pegada '
    + n + ' blocos (' + Math.round(n * 100 / (W * W)) + '% do tile) • ' + (c.houses || []).length + ' prédios • ' + (c.streets || []).length + (c.vila ? ' caminhos • ' : ' ruas • ')
    + (c.plazaCount || 0) + ' praça(s) extra(s) • construída em ' + (c.buildMs || 0) + ' ms';
};

// Resultado do teste de capacidade (?pois=max) no painel do cenário: total e quantos de cada tipo couberam. f = WORLD.tileFill.
const txtTileFill = f => 'Teste de POIs: <b>' + f.total + '</b> couberam (' + Object.keys(f.counts).map(t => f.counts[t] + ' ' + POI_DEFS[t].n.toLowerCase()).join(', ') + ') em ' + f.ms + ' ms';

// ---------- Composição do tile (4E): painel do cenário de tile ----------
// Nome de cada arquétipo de posição do POI principal (tileMainPlan) e de cada zona de guerra, para o painel.
const TXT_TILE_ARCH = { central: 'central', deslocado: 'deslocado', estrada: 'beira da estrada', fundo: 'no fundo', encosta: 'encosta', margem: 'margem' };
const TXT_TILE_ZONE = { abertura: 'abertura', anel: 'anel', praca: 'praça de encontro' };
// Resumo da composição no painel (aba Facções da pausa): principal e arquétipo, contagem de POIs por tipo, ambiente, zonas de guerra, falhas e tempo. tc = WORLD.tileCompose.
const txtTileCompose = tc => {
  const nome = tc.principal ? (POI_DEFS[tc.principal.type] ? POI_DEFS[tc.principal.type].n : tc.principal.type === 'vila' ? 'Vila' : 'Cidade') : 'nenhum (tile de passagem)';
  const tipos = Object.keys(tc.counts).map(t => tc.counts[t] + ' ' + (POI_DEFS[t] ? POI_DEFS[t].n.toLowerCase() : t)).join(', ');
  return 'Principal: <b>' + nome + '</b>' + (tc.arq ? ' • posição <b>' + (TXT_TILE_ARCH[tc.arq] || tc.arq) + '</b>' + (tc.caiu ? ' (caiu de outro arquétipo)' : '') : '')
    + (tc.principal ? ' em (' + tc.principal.x + ', ' + tc.principal.z + ')' : '')
    + '<br>POIs: <b>' + tc.pois + '</b>' + (tipos ? ' (' + tipos + ')' : '') + ' • acampamentos ' + tc.camps + ' • grutas ' + tc.caves + ' • bandos ' + tc.packs + ' • baús ' + tc.chests
    + '<br>Zonas de guerra: ' + (tc.zones.length ? tc.zones.map(z => { const k = z.split(':'); return (TXT_TILE_ZONE[k[0]] || k[0]) + (k[1] ? ' ' + k[1] : '') }).join(', ') : 'nenhuma')
    + (tc.falhas.length ? '<br>Sem lugar: ' + tc.falhas.join(', ') : '') + ' • composto em ' + tc.ms + ' ms';
};
// Linha de atalhos da batalha no painel: rótulo e nomes dos tipos (tileBattleRow, mapwin.js); '' = sem batalha.
const TXT_TILE_BATTLE = 'Batalha no tile:';
const TXT_TILE_BATTLE_NAME = { '': 'Nenhuma', conquista: 'Conquista', defesa: 'Defesa', choque: 'Choque' };
// POIs de guerra montados pela batalha (WORLD.tileWar.pois), no painel: tipo, zona, lado e dono.
const txtTileWar = tw => !tw.battle ? '' : 'POIs de guerra (' + tw.battle.tipo + '): ' + (tw.pois.length ? tw.pois.map(p => POI_DEFS[p.type].n + ' [' + (TXT_TILE_ZONE[p.zona.split(':')[0]] || p.zona) + ', ' + p.lado + ', ' + poiOwnerName(p.owner) + ']').join('; ') : 'nenhum (sem zona livre para esta batalha)');

// ---------- Posição do jogador na pausa (aba Geral) ----------
// Texto da posição (e do que vai para a área de transferência): X e Z no mapa local e Y = altura dos pés, com uma casa decimal. p = jogador (P).
const txtPlayerPos = p => 'X ' + p.x.toFixed(1) + '  Y ' + p.y.toFixed(1) + '  Z ' + p.z.toFixed(1);
// Rótulos do botão de copiar a posição: normal, depois de copiar (volta ao normal em 1,5 s) e se o navegador recusou.
const TXT_POS_COPY = '📋 Copiar', TXT_POS_COPIED = '✔ Copiado', TXT_POS_FAIL = '✖ Falhou';

// ---------- Mapa mundi em 3D (js/ui/mundo3d.js) ----------

// Rótulo de cada tema de tile no mapa mundi (inclui o mar).
const TXT_WM3_THEME = Object.assign({ mar: 'Mar aberto' }, TXT_TILE_THEME);
// Nome do bioma, na ordem de WF_BIO (planície, floresta, deserto, neve, rocha).
const TXT_WM3_BIOME = ['campos', 'mata', 'areia', 'neve', 'rocha'];
// Painel do tile no mapa mundi (canto superior direito). n = ponto do grafo, d = {prod: texto|null, owner: {name, css}|null, aqui, cost: {acoes, mar}|null, sem}.
// Mostra o nome, a produção (se houver), a facção (ou neutro) e, se há um caminho prévio, o custo.
const txtWm3Info = (n, d) => {
  let s = '<div class="wm3-head">' + TXT_WM3_THEME[n.tema] + (n.home ? ' ★' : '') + (n.porto ? ' ⚓' : '') + '</div><div class="wm3-body">';
  if (d.prod) s += '<div class="wm3-row"><i>⚒️</i><span>Produção</span><b>' + d.prod + '</b></div>';
  s += '<div class="wm3-row"><i>🏴</i><span>Facção</span><b>' + (d.owner ? '<span class="wm3-sw" style="background:' + d.owner.css + '"></span>' + d.owner.name : 'Neutro') + '</b></div>';
  if (d.aqui) s += '<div class="wm3-row"><i>🛡️</i><span>Seu batalhão está aqui</span></div>';
  else if (d.sem) s += '<div class="wm3-row"><i>🧭</i><span>Sem caminho até lá</span></div>';
  else if (d.cost) s += '<div class="wm3-row"><i>🧭</i><span>Caminho</span><b>' + d.cost.acoes + (d.cost.acoes === 1 ? ' ação' : ' ações') + (d.cost.mar ? ' • navio' : '') + '</b></div>';
  return s + '</div>';
};
// Produção por tipo de recurso (TILE_PROD.res) e o imposto de vila/cidade (aparece no painel do tile).
const TXT_WM3_PROD = { food: 'Alimentos', ore: 'Minério', wood: 'Madeira', imposto: 'Impostos' };
// Nome provisório de uma facção NPC só pela cor (até o grafo ter as facções reais). c = nome da cor ("Vermelho").
const txtWm3FacName = c => 'Facção ' + c;
// Nome da facção do jogador quando ele ainda não deu um.
const TXT_WM3_YOURS = 'Sua facção';
// Botões do canto superior direito (mostrar/ocultar nomes dos tiles; abrir o livro) e a dica do canto inferior direito.
const TXT_WM3_VIEW = { nomes: '🏷️ Nomes', livro: '📖 Livro (L)' };
const TXT_WM3_BOOKHINT = '📖 L — abrir o livro';
// Menu do batalhão (clique DIREITO nele): título e opções. ok = já funciona; as outras só existem por enquanto (etapas 7 e 8).
const TXT_WM3_MENU_TITLE = 'Batalhão';
const TXT_WM3_MENU = [{ id: 'entrar', ic: '🚪', t: 'Entrar no tile', ok: false }, { id: 'acampar', ic: '⛺', t: 'Acampar', ok: false },
  { id: 'soldados', ic: '🛡️', t: 'Soldados', ok: false }, { id: 'suprimentos', ic: '🎒', t: 'Suprimentos', ok: false }, { id: 'fechar', ic: '✖️', t: 'Fechar', ok: true }];
// Aviso enquanto o mundo é montado (tela de carregamento do mapa mundi).
const TXT_WM3_LOADING = 'Desenhando o mundo...';
// Botão do modo criativo (aba Mundo) que abre o mapa mundi.
const TXT_WM3_BUTTON = '🌍 Mapa mundi 3D';
