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
const tileTestOn = () => ['batalha', 'ia'].includes(new URLSearchParams(location.search).get('cenario'));   // ?cenario=ia (passo 5 da batalha no tile) reaproveita o mapa de teste

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
// L4 (POIs lego; só com legoOn): densidade e vida do tile. themeExtra = POIs de tema a MAIS que o `theme` da tabela ([9, 12]; os extras entram como P pequeno quando o tipo tem esse tamanho);
// pChance = chance de um POI do tema (sem tamanho fixo na tabela) nascer pequeno (0.5); shore = [mín, máx] de folga entre a borda da vila de pesca e a água (4 e 16);
// poiGap = folga entre as bordas de dois POIs lego (18; POI_GAP, 30, vale para os antigos); microGap = folga entre a borda de um micro-POI e cidades/POIs/outros micros (7: menor que AMB_GAP); microEdge = distância mínima do micro à borda do tile (24).
// Cada tema tem em TILE_COMPOSE a coluna `vida: [mín, máx, ids de micro-POI de LEGO_MICRO.list]`; microPlace diz onde nasce cada micro ('road' beira da estrada, 'far' longe dela, 'free' qualquer).
// Marcas de guerra (trincheira, barricada, atalaia, acampamento fortificado, campo de batalha, vala comum, paliçada) NÃO entram mais no sorteio dos temas (feature 12, passo 8): só os arredores
// do principal de facção (tcSurround) e, no passo 10, o improviso de guerra e as cicatrizes de batalha, todos por estado de jogo.
const TILE_LEGO = { themeExtra: [9, 12], pChance: 0.5, shore: [4, 16], microGap: 7, poiGap: 18, microEdge: 24 };
const TILE_MICRO_PLACE = { carroca: 'road', acampamento: 'road', barricada: 'road', estande: 'far', altar: 'far', torre: 'far', monolito: 'far', ermitao: 'far',
  minerio: 'free', toras: 'free', armadilha: 'far', tumba: 'far', estatua: 'free', campo_batalha: 'free', trincheira: 'free', vala_comum: 'far', palicada: 'free' };
const TILE_COMPOSE = {
  cidade:   { main: 'cidade', theme: [4, 5, ['qualquer']], ambient: [3, 5, ['acampamento', 'bando', 'gruta']], vida: [14, 18, ['carroca', 'estatua', 'monolito', 'estande', 'acampamento', 'tumba']] },
  vila:     { main: 'vila', theme: [4, 5, ['pousada', 'taverna', 'fazenda_pequena', 'santuario', 'entreposto']], ambient: [3, 5, ['acampamento', 'bando', 'gruta', 'torre_vigia']], vida: [14, 18, ['carroca', 'estande', 'ermitao', 'armadilha', 'acampamento', 'toras', 'altar']] },
  fazenda:  { main: 'fazenda', theme: [4, 5, ['fazenda_pequena', 'plantacao', 'pousada', 'taverna', 'vila_ou_descanso']], ambient: [6, 8, ['acampamento', 'bando', 'torre_vigia', 'ruinas_rara']], vida: [15, 19, ['carroca', 'armadilha', 'ermitao', 'acampamento', 'monolito', 'estatua']] },
  mina:     { main: 'mina', theme: [4, 5, ['mina_pequena', 'alojamento', 'pousada', 'entreposto', 'vila_ou_descanso']], ambient: [6, 8, ['gruta', 'acampamento', 'bando']], vida: [15, 19, ['minerio', 'minerio', 'carroca', 'acampamento', 'tumba', 'torre']] },
  serraria: { main: 'serraria', theme: [4, 5, ['serraria_pequena', 'alojamento', 'pousada', 'cacadores', 'vila_ou_descanso']], ambient: [6, 8, ['bando', 'acampamento', 'torre_vigia']], vida: [15, 19, ['toras', 'toras', 'ermitao', 'armadilha', 'carroca', 'acampamento', 'estande']] },
  animais:  { main: 'cacadores', theme: [4, 5, ['cacadores_pequeno', 'alojamento', 'pousada', 'santuario']], ambient: [6, 8, ['bando', 'gruta', 'acampamento']], vida: [16, 20, ['armadilha', 'estande', 'ermitao', 'toras', 'acampamento', 'monolito', 'altar']] },
  ponte:    { main: 'ponte', theme: [4, 5, ['pousada', 'taverna', 'entreposto', 'pesca', 'torre_vigia']], ambient: [6, 8, ['acampamento', 'bando']], vida: [15, 19, ['carroca', 'acampamento', 'estatua', 'tumba']] },
  fortaleza:{ main: 'forte', theme: [4, 5, ['pousada', 'vila_apoio']], ambient: [6, 8, ['acampamento', 'bando', 'gruta']], vida: [16, 20, ['carroca', 'tumba', 'estatua', 'monolito']] },
  ruinas:   { main: 'ruinas', theme: [4, 5, ['ruinas_menor', 'reliquia', 'santuario']], ambient: [6, 8, ['guardioes', 'bando', 'gruta', 'acampamento']], vida: [16, 20, ['torre', 'tumba', 'estatua', 'monolito', 'altar']] },
  passagem: { main: null, theme: [0, 2, ['fazenda', 'santuario', 'pousada_abandonada']], ambient: [8, 12, ['caverna', 'acampamento', 'bando', 'matilha']], vida: [17, 21, ['carroca', 'acampamento', 'estande', 'altar', 'torre', 'monolito', 'ermitao', 'armadilha', 'tumba', 'estatua']] }
};
// Tipos de batalha no tile (rodada 8): conquista (a facção ataca o POI principal), defesa (a facção está no principal e repele) e choque (dois batalhões).
const TILE_BATTLES = ['conquista', 'defesa', 'choque'];
// Verdadeiro com ?cenario=tile (a 4A abre o tile VAZIO: só terreno, borda e aberturas; ?cidade=1 devolve a cidade central da etapa 3).
// Etapa 4B: o tile de tema 'cidade' agora traz a cidade enorme (CITY_HUGE em city-modifiers.js); os outros temas seguem vazios até as sessões 4C/4E.
// Cidade que o tile recebe: 'enorme' (tema cidade), 'antiga' (?cidade=1: a cidade pequena da etapa 3, para comparar) ou null (tile vazio).
const tileCityKind = tema => {
  if (!mapTileOn()) return null;
  if (new URLSearchParams(location.search).get('cidade') === '1') return 'antiga';
  return tema === 'cidade' ? 'enorme' : tema === 'vila' ? 'vila' : null;
};
// Tile sem POIs (só a 4E os põe): todo tile do cenário, menos ?cidade=1 (cidade antiga com os POIs do gerador antigo).
const tileBare = () => mapTileOn() && new URLSearchParams(location.search).get('cidade') !== '1';
const tileEmptyOn = tema => mapTileOn() && !tileCityKind(tema);

// ---------- Etapa 4E: composição do tile (js/macro/tile.js posição do principal; js/local/tilecompose.js preenchimento) ----------
// ?compor=0 volta ao tile vazio (4A) para comparar. Padrão: ligado em todo tile do cenário (?cidade=1 e ?pois=max seguem sem composição).
const tileComposeOn = () => mapTileOn() && new URLSearchParams(location.search).get('compor') !== '0' && new URLSearchParams(location.search).get('cidade') !== '1'
  && new URLSearchParams(location.search).get('pois') !== 'max';
// Onde fica o POI principal (arquétipos sorteados pela semente, rodada 8). margin: distância mínima do POI à borda do tile (70). openGap: distância mínima
// a qualquer abertura, para sobrar espaço à defesa (80). bigEdge: folga da caixa da cidade/vila à borda; o deslocamento máximo é (tile - 2*half)/2 - bigEdge (14,
// igual a CITY_HUGE.margin). bigOpen: a cidade/vila fica a `half + bigOpen` de qualquer abertura (12). shift: faixa do arquétipo "deslocado" como fração da
// metade do tile (0.25 a 0.40). tries: sorteios por arquétipo antes de cair no seguinte. topFrac: "encosta" escolhe entre esta fração dos pontos mais altos (0.25).
// shoreMin/shoreMax: "margem" fica com água (ou borda de floresta) entre estas distâncias (6 e 26). Pesos: arquétipo por tema (o que falta vale 0); tile de UMA
// entrada sempre usa "fundo" (e "deslocado" se não houver como). Padrão: central 30%, deslocado 25, estrada 20, fundo 10; mina/fortaleza com encosta; ponte/serraria com margem.
const TILE_MAIN = {
  margin: 70, openGap: 80, bigEdge: 14, bigOpen: 12, shift: [0.25, 0.40], tries: 80, topFrac: 0.25, shoreMin: 6, shoreMax: 26,
  weights: {
    padrao: { central: 30, deslocado: 25, estrada: 20, fundo: 10 },
    cidade: { central: 30, deslocado: 30, estrada: 25, fundo: 10 },
    vila: { central: 30, deslocado: 30, estrada: 25, fundo: 10 },
    mina: { central: 10, deslocado: 15, estrada: 10, fundo: 10, encosta: 55 },
    fortaleza: { central: 15, deslocado: 15, estrada: 20, fundo: 10, encosta: 40 },
    ponte: { central: 15, margem: 85 },
    serraria: { central: 20, deslocado: 15, estrada: 10, margem: 55 }
  }
};
// Como cada id da tabela TILE_COMPOSE vira POI. type = id de POI_DEFS; place = onde nasce: 'road' (perto da estrada), 'far' (longe das estradas),
// 'main' (colado ao POI principal), 'free' (qualquer lugar); ambient: acampamento/gruta/bando (áreas, não POIs de POI_DEFS). owner: dono inicial ('none' = ruínas).
// size ('P' pequeno, 'M' médio; sem size o tipo sorteia pelo TILE_LEGO.pChance), place ('shore' = margem de água). L5: todos os ids têm POI próprio (nada de substituto pendente).
// caravan: só onde passa estrada de caravana (tileCaravanRoad). 'vila_ou_descanso' sorteia entre as opções de `pick` (40% vila de trabalhadores, 60% descanso).
const TILE_POI_MAP = {
  fazenda: { type: 'farm', place: 'road' }, fazenda_pequena: { type: 'farm', place: 'road', size: 'P' }, plantacao: { type: 'plantation', place: 'road' },
  mina_pequena: { type: 'mine', place: 'road', size: 'P' }, serraria_pequena: { type: 'sawmill', place: 'road', size: 'P' }, cacadores: { type: 'hunters', place: 'far' },
  cacadores_pequeno: { type: 'hunters', place: 'far', size: 'P' }, pousada: { type: 'inn', place: 'road' }, pousada_abandonada: { type: 'inn', place: 'far' },
  taverna: { type: 'tavern', place: 'road' }, entreposto: { type: 'post', place: 'road', caravan: true }, santuario: { type: 'sanctuary', place: 'far' },
  alojamento: { type: 'lodge', place: 'road' }, torre_vigia: { type: 'tower', place: 'free' }, pesca: { type: 'fishery', place: 'shore' },
  ruinas_menor: { type: 'ruins', place: 'free', size: 'P' }, ruinas_rara: { type: 'ruins', place: 'far' }, reliquia: { type: 'ruins', place: 'far' }, guardioes: { type: 'ruins', place: 'far' },
  acampamento_fortificado: { type: 'fortcamp', place: 'free' }, atalaia: { type: 'lookout', place: 'free' }, trincheira: { type: 'trench', place: 'free' },
  vila_apoio: { type: 'workers', place: 'road', size: 'P' }, vila_trabalhadores: { type: 'workers', place: 'road', size: 'M' },
  vila_ou_descanso: { pick: [['vila_trabalhadores', 40], ['pousada', 30], ['alojamento', 30]] },
  acampamento: { ambient: 'camp' }, gruta: { ambient: 'cave' }, caverna: { ambient: 'cave' }, bando: { ambient: 'pack' }, matilha: { ambient: 'pack' }
};
// POI principal de cada tema (valor de TILE_COMPOSE[tema].main -> id de POI_DEFS). 'cidade' e 'vila' são o gerador de cidades (4B/4C).
const TILE_MAIN_TYPE = { cacadores: 'hunters', forte: 'fort', fazenda: 'farm', mina: 'mine', serraria: 'sawmill', ponte: 'bridge', ruinas: 'ruinvil' };
// Se o POI principal não cabe em lugar nenhum do tile (vila em escombros é enorme, raio 40), entra este menor no lugar (id de POI_DEFS). Padrão: ruínas antigas no lugar da vila em escombros; forte -> torre.
const TILE_MAIN_FALLBACK = { ruinvil: 'ruins', fort: 'tower' };
// Se o tema ponte não achar ponte no tile (o grafo da etapa 5 é que a cria), o principal vira este POI (padrão: entreposto, que já vive em estrada).
const TILE_BRIDGE_FALLBACK = 'post';
// Opções de 'qualquer' (cidade e vila: qualquer POI com peso pelo terreno) e o bônus de peso do que combina com o bioma do lugar (x3; vila e cidade iguais, rodada 9).
// Biomas: 0 planície, 1 floresta, 2 deserto, 3 neve, 4 rocha.
const TILE_ANY_TYPES = ['farm', 'mine', 'sawmill', 'hunters', 'sanctuary', 'fort', 'tower', 'tavern', 'post', 'ruins', 'inn', 'lodge'];
const TILE_ANY_BONUS = 3;
// Onde nasce cada tipo escolhido por 'qualquer' (mesmas classes de TILE_POI_MAP.place). Padrão: comércio, fazenda e pousada na estrada; caçadores, santuário e ruínas longe; alojamento também na estrada (pedido do usuário em 2026-11-24; antes ficava colado ao principal).
const TILE_TYPE_PLACE = { farm: 'road', mine: 'free', sawmill: 'free', hunters: 'far', sanctuary: 'far', fort: 'free', tower: 'free', tavern: 'road', post: 'road', ruins: 'far', inn: 'road', lodge: 'road' };
const TILE_ANY_FAVOR = { 0: ['farm', 'tavern', 'inn'], 1: ['sawmill', 'hunters', 'lodge'], 2: ['farm', 'post', 'ruins'], 3: ['mine', 'tower', 'sanctuary'], 4: ['mine', 'fort', 'tower'] };
// Regras de lugar dos POIs do tile. edge: distância mínima do centro à borda (36). openClear: folga da BORDA do POI a uma abertura (8; o espaço de guerra é a zona). roadNear: [mín, máx] de folga entre a
// borda do POI e a estrada para 'road' (4 e 38). farRoad: distância mínima da estrada para 'far' (52). mainNear: [mín, máx] de folga ao principal para 'main' (4 e 30).
// tries: sorteios de lugar por POI (500). laxGap: folga entre POIs na 2ª tentativa, quando a 1ª não acha lugar (12; a 1ª usa POI_GAP e AMB_GAP).
// cityGap: folga (blocos) entre a borda do POI e a pegada da cidade, rampa incluída (26). mainRamp: largura da rampa do terreno em volta do POI principal (10; a das
// estradas que chegam a ele fica a no máximo ~1 bloco da plataforma, senão a estrada bate numa parede na encosta). roadFar: quanto o POI "de estrada" pode se
// afastar além de roadNear na 2ª passada (40; não vira "qualquer lugar": sem estrada perto o POI não nasce).
// L1b (frente e trilha): offRoad = chance de um POI de offRoadTypes nascer longe da estrada, ligado a ela por uma trilha (0.3; o entreposto nunca: só na estrada, onde passa caravana);
// offNear = [mín, máx] de folga entre a borda do POI e a estrada nesse caso (mín 40 e máx 90 = alcance da trilha); trailGap = a trilha precisa de pelo menos esta distância do portão à
// estrada para existir (6; mais perto o portão já encosta nela); trailTaken = raio, em blocos, que cada trecho da trilha reserva contra outros POIs (2).
// Padrão: 36, 8, [4,38], 52, [4,30], 500, 12, 26, 10, 40, 0.3, ['tavern','inn','lodge'], [40,90], 6, 2
const TILE_PLACE = { edge: 36, openClear: 8, roadNear: [4, 38], farRoad: 52, mainNear: [4, 30], tries: 500, laxGap: 12, cityGap: 26, mainRamp: 10, roadFar: 40,
  offRoad: 0.3, offRoadTypes: ['tavern', 'inn', 'lodge'], offNear: [40, 90], trailGap: 6, trailTaken: 2 };
// Dono inicial: do POI principal e dos demais ('bandit', 'player', 'none'); ?dono=player|bandit troca o do principal (para testar o tile do jogador).
const TILE_OWNER = { main: 'bandit', other: 'bandit' };
// Entreposto só onde passa estrada de caravana: sem o grafo (etapa 5), vale "o tile tem ao menos duas aberturas" (a estrada atravessa o tile).
const tileCaravanRoad = win => win.openings.length >= 2;
// Zonas de guerra (rodada 8): clareiras reservadas na geração, vazias até haver batalha. openDist: distância da abertura ao centro da zona de abertura (40);
// openR: raio dela (16); ringW: largura da faixa do anel em volta do principal, além do raio do POI (24); plazaR: raio da praça de encontro (18);
// siteRange: desnível máximo aceito no chão de uma zona (8); trees: as zonas ficam sem árvores.
// Improviso de guerra (passo 10 da batalha no tile; no lugar dos POIs de teste da 4E): só com batalhão, cerco ou batalha no tile. improv.abertura = POIs que o atacante improvisa na
// zona da sua abertura (acampamento fortificado ou atalaia; pLookout = chance de ser atalaia, 0,4); improv.praca = sacos de areia na estrada, na praça (barricada). Não há mais POI do
// defensor no anel: o principal de facção já tem os arredores permanentes (BATTLE_SURR). Padrão: fortcamp/lookout 0.4, barricade
// sides: donos [atacante, defensor] de cada batalha ('main' = dono do POI principal): conquista = você ataca, defesa = você defende, choque = você contra bandidos. Em batalha
// vinda do estado (cerco, batalhão) o atacante é o dono real (battle.donoAtacante).
const TILE_WAR = { openDist: 40, openR: 16, ringW: 24, plazaR: 18, siteRange: 8, improv: { abertura: ['fortcamp', 'lookout'], pLookout: 0.4, praca: 'barricade' },
  sides: { conquista: ['player', 'main'], defesa: ['bandit', 'player'], choque: ['player', 'bandit'] } };
// Cicatrizes de batalha (passo 10): micro-POIs de guerra que ficam no tile onde houve luta (guardados em STATE.tiles[chave].cicatriz; só cenário, sem dono). kinds = ids de
// LEGO_MICRO.list sorteados por tipo de batalha; grande/pequena = quantas nascem por luta (2 e 1); max = teto por tile (o mais antigo sai, 6). Padrão: continentes 14, pangeia 12, arquipélagos 13, lago 12 (medido: 38 a 57 tiles de terra em 16 sementes cada) e [0.46, 0.52]
const TILE_SCAR = { kinds: { ataque: ['campo_batalha', 'vala_comum', 'palicada'], defesa: ['campo_batalha', 'barricada', 'palicada'], choque: ['campo_batalha', 'trincheira', 'vala_comum'],
  pequena: ['campo_batalha', 'vala_comum'] }, grande: 2, pequena: 1, max: 6 };

// Marcas no mapa e no minimapa do cenário de tile (só com ?cenario=tile composto): círculo CIANO no POI/cidade PRINCIPAL do tile; círculo AZUL nos POIs e cidades do jogador e
// VERMELHO nos de outros donos (bandidos ou facções; ruínas sem dono e POIs livres ficam sem círculo). main/own: cores; r: raio em pixels do minimapa (principal 10, dono 7)
// e no mapa grande (principal 15, dono 10), multiplicados pelo tamanho do mapa; w: espessura.
const TILE_MARK = { main: '#00e5ff', player: '#2a7aff', enemy: '#ff2a2a', mini: { main: 10, own: 7, w: 2 }, big: { main: 15, own: 10, w: 3 } };

// ---------- Etapa 3 do plano: campo do mundo e mapa local por janela (atrás de ?mundo=1 e de ?cenario=tile) ----------
// O mundo é uma FUNÇÃO de posição (js/macro/worldfield.js); o mapa local é uma janela dessa função. Valores = ponto de partida, a calibrar.
const WORLD_FIELD = {
  // Grade PROVISÓRIA de tiles (a etapa 5 troca por um grafo): quantos tiles de lado, distância entre centros e quanto cada centro pode sair do lugar
  // (em blocos). Mundo = tiles x spacing de lado (grade provisória; o mundo do grafo usa worldTiles abaixo). Padrão: 10, TILE_SIZE (384), 48
  tiles: 10, spacing: TILE_SIZE, jitter: 48,
  // Tamanho do mundo por formato, em tiles de lado (etapa 5: o grafo precisa de ao menos 40 tiles de TERRA por mundo, decisão de 2026-11-26; `tiles` acima
  // (10) vale só para a grade provisória e para formato sem entrada aqui) e raio das massas do formato 'continentes' (fração do meio mundo). Padrão: ver abaixo
  // Quantas massas de terra tem o formato 'continentes' (sorteado entre os dois valores pela semente; mais massas = cada uma menor). Padrão: [2, 5]
  continents: [2, 5],
  worldTiles: { continentes: 18, pangeia: 15, arquipelagos: 16, lago: 15 }, blobR: [0.46, 0.52],
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
// ---------- Etapa 5 do plano: o grafo do mapa mundi (js/macro/graph.js; decisões de 2026-11-26, rodada 15 de 5_mapa-mundi.md) ----------
// Pontos com distância mínima, vizinhos por triangulação, trilhas e estradas, tema de cada tile por adequação ao terreno. Valores = ponto de partida.
const WORLD_GRAPH = {
  // Distância mínima entre dois pontos (o tile tem 384; com 1,25 x há folga entre as janelas vizinhas: pedido do usuário em 2026-11-26, tiles muito juntos),
  // tentativas de sorteio por passada (terra, depois mar) e margem até a borda do mundo (metade do tile). O mundo (WORLD_FIELD.worldTiles) cresce junto para
  // manter 40+ tiles de terra. Padrão: TILE_SIZE * 1.25, 6000, TILE_SIZE / 2
  minDist: Math.round(TILE_SIZE * 1.25), tries: 6000, edgeMargin: TILE_SIZE / 2,
  // Passo (blocos) da grade grossa de terra e da amostragem do terreno do tile. Padrão: 32 e 32
  gridStep: 32, terrStep: 32,
  // Fração mínima de terra da janela para o ponto ser tile de TERRA (abaixo disso é tile de MAR, só para navegar). Padrão: 0.3
  landMin: 0.3,
  // Vizinhança: aresta máxima (em múltiplos de minDist), passo da sonda de terreno (blocos), água de rio (até aqui a estrada passa com ponte local),
  // vão de água que ainda vira travessia (acima disso a aresta de terra não existe; só por mar) e custo por bioma (planície, floresta, deserto, neve, rocha)
  // e da água. Padrão: 1.9, 8, 28, 96, [2, 3, 3, 3, 4], 6
  maxEdge: 1.9, probeStep: 8, riverMax: 28, bridgeMax: 96, biomeCost: [2, 3, 3, 3, 4], waterCost: 6,
  // Trilhas: máximo de vizinhos por terra, chance de uma aresta além da árvore geradora entrar e custo de uma aresta de mar (por minDist). Padrão: 4, 0.55, 2
  maxDeg: 4, extraProb: 0.55, seaCost: 2,
  // Estradas: cada cidade liga-se às N cidades mais próximas (em custo) da mesma massa de terra. Padrão: 2
  roadLinks: 2,
  // Cidades: faixa pedida (limitada a esta fração dos tiles temáticos) e terra mínima da janela por tema (fração; 0 = qualquer). Padrão: [5, 7], 0.3
  cities: [5, 7], cityMaxFrac: 0.3,
  themeLandMin: { cidade: 0.6, vila: 0.45, fazenda: 0.5, mina: 0.5, serraria: 0.5, animais: 0.5, ponte: 0.2, fortaleza: 0.4, ruinas: 0.3 },
  // Adequação mínima ao terreno (tileFit, 0 a 1) para o tema valer; o 1º tile de cada tema é FORÇADO (melhor adequação disponível) se nenhum chega. Padrão: 0.5
  minFit: 0.5,
  // Peso que um vizinho do MESMO tema tira do tile (0 = livre, 1 = proíbe). Padrão: 0.5
  sameNeighbor: 0.5,
  // Ilha inicial: mínimo de tiles de terra e de cidades alcançáveis a pé; abaixo disso a cidade inicial vira porto (navio grátis). Padrão: 6 e 2
  startIsland: { tiles: 6, cities: 2 },
  // Tile de PONTE: liga duas massas de terra por UM vão de água curto (de bridgeTile a bridgeMax blocos, quase sem mais água entre os dois tiles; vão grande demais, ou mar
  // aberto, não vira ponte). Nasce no meio do vão, tem sempre um tile de terra antes e outro depois (só liga esses dois, sem bifurcação) e fica a bridgeDist x minDist
  // de todos os outros tiles (0,5 = 240 blocos: dois tiles de 480 com um rio no meio). No máximo `bridges[1]` por mundo (sorteadas).   // `bridgeExtra` = água a mais (riachos) tolerada na reta entre os dois tiles além do vão da ponte. Padrão: 40, [3, 5], 0.5, 96
  bridgeTile: 40, bridges: [3, 5], bridgeDist: 0.5, bridgeExtra: 96,
  // Abertura do tile: quanto desliza pela borda atrás de terra (blocos). Padrão: 80
  openSlide: 80
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

// ---------- Teste de capacidade de POIs no tile (4B; ?pois=max) ----------
// Só para ver QUANTOS POIs cabem fora da cidade: ignora as regras de posição (bioma, estrada, tema) e enche o tile de POIs até não caber mais (mapwin.js tileFillPois).
// types: tipos tentados, em rodízio, dos maiores para os menores (ids de POI_DEFS; a ponte fica de fora). cityGap: folga (blocos) entre a borda do POI e a pegada da cidade
// (a rampa da cidade tem 24). poiGap: folga entre dois POIs (o jogo normal usa 30). range: desnível máximo aceito no terreno. step: passo (blocos) da grade de lugares testados.
// Padrões: os 10 tipos, 24, 4, 8 e 4.
const TILE_POI_TEST = { types: ['farm', 'tavern', 'post', 'mine', 'fort', 'sawmill', 'sanctuary', 'hunters', 'tower', 'ruins', 'inn', 'lodge', 'ruinvil'], cityGap: 24, poiGap: 4, range: 8, step: 4 };
// Verdadeiro com ?pois=max no cenário de tile.
const tileFillOn = () => mapTileOn() && new URLSearchParams(location.search).get('pois') === 'max';

// ---------- Etapa 6 do plano: mapa mundi em 3D (js/ui/mundo3d.js; diorama em voxels sobre o campo e o grafo do mundo) ----------
// ?cenario=mundo3d abre só o mapa mundi (sem gerar o mapa local); no jogo, a tecla J ou o botão do modo criativo (aba Mundo) abre o mapa do mundo atual.
// Visual de referência: ilha limpa, relevo em degraus, regiões grandes de bioma, poucos adereços grandes, trilha esculpida no chão (pedido do usuário, 2026-11-26).
// unit: blocos do mundo por unidade da cena. cell: lado de cada coluna em blocos (= unit, então 1 coluna = 1 voxel). vScale: altura de cada bloco de relevo.
// terrace: blocos de relevo por degrau. smooth: passadas de suavização do relevo (mais = ilha mais lisa). baseY: fundo do diorama.
// plateau: raio (em colunas) do pedestal plano sob cada tile (a cidade usa cityPlateau = 9; a placa do tile tem essa meia largura); pedMax: altura máxima do pedestal acima do mar (blocos).
// minIsland / minPond: ilhotas e lagoas com menos colunas que isso são apagadas (só ruído). Padrões: 16, 16, 0.25, 4, 4, -8, 6, 14, 150, 100
const WORLD3D = { unit: 16, cell: 16, vScale: 0.25, terrace: 4, smooth: 4, baseY: -8, plateau: 6, cityPlateau: 9, pedMax: 14, minIsland: 150, minPond: 100,
  // Câmera livre (arrastar com o botão direito gira em volta, esquerdo passeia, roda aproxima): distância inicial e limites (unidades), inclinação inicial e
  // limites (rad), giro máximo para cada lado (rad; 99 = livre), velocidade do passeio com WASD (por unidade de distância por segundo) e suavidade da
  // inércia (maior = mais ágil). Padrões: 150, [18, 700], 0.9, [0.2, 1.5], 99, 0.9, 9
  dist: 150, distLim: [18, 700], pitch: 0.9, pitchLim: [0.2, 1.5], yawMax: 99, panSpeed: 0.9, damp: 9,
  // Dia e noite: o tempo só passa quando o jogador GASTA AÇÕES no mapa mundi (nada automático). actionsPerDay = ações para um dia inteiro; dayStart = hora ao abrir
  // (0 a 1: 0,25 nascer do sol, 0,5 meio-dia, 0,75 pôr do sol). Cores do céu (dia, entardecer, noite) e do mar (dia, noite), luz ambiente (dia, noite), força do sol e da lua. Mar:
  // altura e velocidade das ondas. Padrões: 12, 0.3, 0xa9d2f2, 0xf2a070, 0x16244c, 0x2f86d0, 0x244f86, 0.3, 0.4, 1.15, 0.6, 0.07, 1.4
  actionsPerDay: 12, dayStart: 0.3, skyDay: 0xa9d2f2, skyDusk: 0xf2a070, skyNight: 0x16244c, seaDay: 0x2f86d0, seaNight: 0x244f86, ambDay: 0.3, ambNight: 0.4,
  sunPower: 1.15, moonPower: 0.6, waveAmp: 0.07, waveSpeed: 1.4,
  // Caminhos: largura (unidades) da linha da estrada e da trilha e transparência (0 a 1); passam por cima de tudo, menos dentro do tile. Padrões: 0.9, 0.55, 0.6
  roadW: 1, trailW: 0.55, lineAlpha: 0.6,
  // Mesa do mundo: largura e altura da moldura (unidades; altura acima do fundo do mar), degraus do pedestal (quanto saem além da laje). A profundidade da laje e a
  // altura do oceano de fora vêm de baixo (`baseY`, no começo desta tabela). Padrões: 1.1, 1.3 e [2.2, 4.4]
  frameW: 1.1, frameH: 1.3, plinth: [2.2, 4.4],
  // Imagem de fundo do mapa mundi (a mesa), relativa ao index.html, e cores com que ela é tingida à noite e no entardecer (multiplicam a imagem).
  // Padrão: 'images/map_background.jpg', 0x3a4466, 0xffc890
  backdrop: 'images/map_background.jpg', bgNight: 0x3a4466, bgDusk: 0xffc890,
  // Em volta do mundo: nuvens (quantidade, altura [min, máx] e velocidade) e navios (quantidade, escala e velocidade em unidades por
  // segundo). Padrões: 26, [26, 42], 1.2, 8, 1.5, 3
  clouds: 26, cloudY: [26, 42], cloudSpeed: 1.2, ships: 8, shipScale: 1.5, shipSpeed: 3,
  // TAMANHO DO BATALHÃO do jogador no mapa (escala do boneco com a bandeira; 1 = um humano normal, ~1,95 de altura). Mude e recarregue a página. Padrão: 3.2
  heroScale: 5,
  // Cor do bando de bandidos no mapa (o boneco é o mesmo do batalhão; o das facções usa a cor da facção). Padrão: 0x8a1c1c
  banditColor: 0x8a1c1c,
  // MONTANHAS do mapa mundi 3D (relevo de voxels sobre as terras altas, com cristas e neve). shapes = formatos sorteados por monte (pico, domo arredondado, cume = 3 picos em fila,
  // mesa de topo plano, ladeira = um lado íngreme e o outro em declive; repita um nome para ele sair mais, tire para não sair). minElev = altura mínima do terreno acima do mar
  // (blocos do campo) para nascer um monte; spacing = distância entre montes (colunas); base e perElev = altura (colunas) base e extra por bloco de elevação; jitter = sorteio extra de
  // altura; radiusMul = raio como fração da altura (menor = mais íngreme); snowFrac = fração da altura onde começa a neve; snowMin = altura mínima para ter neve. Recarregue a página.
  // Padrões: 9, 10, 30, 2.4, 8, 0.55, 0.5, 20
  mtn: { shapes: ['pico', 'domo', 'cume', 'mesa', 'ladeira'], minElev: 9, spacing: 10, base: 30, perElev: 2.4, jitter: 8, radiusMul: 0.55, snowFrac: 0.5, snowMin: 20,
    // MORROS PEQUENOS (sem neve): shapes, altura mínima do terreno, distância entre morros, chance de nascer em cada célula, altura base e por elevação, sorteio extra, raio como
    // fração da altura e altura máxima que ainda conta como morro pequeno (cor de grama). Padrões: domo/ladeira/pico, 4, 9, 0.3, 5, 0.5, 4, 1.1, 14
    small: { shapes: ['domo', 'ladeira', 'domo', 'pico'], minElev: 4, spacing: 9, prob: 0.3, base: 5, perElev: 0.5, jitter: 4, radiusMul: 1.1, maxH: 14 },
    // MORRO DA MINA (um por tile de mina, com a abertura na encosta voltada para o tile): raio, distância do centro do morro à borda do tile, altura, altura da parede onde fica a
    // abertura e meia-largura do corredor limpo até ela. Padrões: 12, 5, 18, 8, 3
    mine: { r: 12, off: 5, hgt: 18, entH: 8, width: 3 } },
  // Vagas visíveis de batalhões/caravanas por tile (o excedente de menor prioridade some; prioridade: seu batalhão ativo, seus outros batalhões, facções e
  // bandos, caravanas) e distância entre as vagas. Padrão: 3 e 5.5
  tileSlots: 3, slotGap: 5.5,
  // TAMANHO DA CARAVANA no mapa, como multiplicador do batalhão (heroScale): 1 = da altura do batalhão. Recarregue a página. Padrão: 1
  caravanScale: 0.5,
  // Escala dos modelos dos tiles e velocidade do herói andando pela trilha (unidades por segundo). Padrões: 1.3 e 16
  modelScale: 1.3, walkSpeed: 16,
  // Árvores por coluna de terra (0 a 1) em bosques: floresta, planície, deserto (cacto), neve (pinheiro), rocha. Padrão: 0.22, 0.01, 0.015, 0.12, 0
  treeProb: [0.22, 0.01, 0.015, 0.12, 0] };

// ---------- Nomes dos tiles (js/macro/tilename.js; etapa 6A) ----------
// Tentativas de sorteio por tile até achar um nome ainda não usado no mundo (depois entra número romano) e chance de o nome de recurso usar o terreno
// (em vez de um santo ou família), de uma vila ser "Vila <nome>" e de uma cidade de costa usar o nome de costa. Padrão: 12, 0.6, 0.5, 0.5.
const TILE_NAME = { tries: 12, terrain: 0.6, villaPlain: 0.5, coast: 0.5 };
