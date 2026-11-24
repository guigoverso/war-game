'use strict';
// ---------- Modificadores: POIs "lego" (L2: fazenda, mina e serraria; docs/features/11_pois-procedurais-lego.md) ----------
// Um POI lego é montado de PEÇAS (casa, celeiro, boca de mina, serra, campo...) colocadas em VAGAS de um ESQUELETO desenhado à mão; a semente decide esqueleto, giro/espelho,
// peça de cada vaga e enfeites. Este arquivo só tem dados (números e tabelas); o montador está em js/local/poilego.js. Ligado por ?lego=1 ou ?cenario=lego (legoOn); sem eles
// fazenda, mina e serraria continuam as de sempre. Coordenadas do esqueleto "de frente para o sul": o portão fica em z = half-1 (sul) e o esqueleto gira/espelha depois.
// Padrões entre parênteses.

// Verdadeiro com ?lego=1 ou ?cenario=lego (fazenda, mina e serraria passam a ser montadas por peças; o resto do jogo não muda).
const legoOn = () => { const q = new URLSearchParams(location.search); return q.get('lego') === '1' || q.get('cenario') === 'lego' };
// Verdadeiro só em ?cenario=lego: mundo super plano com os POIs lego em grade (poiLegoShowGen).
const legoShowOn = () => new URLSearchParams(location.search).get('cenario') === 'lego';
// Cenário lego: variações por tipo e tamanho (4), colunas e espaçamento mínimo da grade em blocos (46; cresce para caber o maior POI da vista), tipos na ordem das fileiras e tamanhos de cada tipo (M médio, P pequeno).
// Tipos de POI que o compositor do tile (tilecompose.js) vira com a frente para a estrada mais próxima e liga a ela por uma trilha (L1b). Os antigos (taverna, entreposto, pousada,
// alojamento) giram o desenho inteiro pelo gancho BC_XF (poilego.js, legoOldBuild); fazenda, mina e serraria só quando lego está ligado (legoOn). Padrão: os quatro antigos
const LEGO_FACE_TYPES = ['tavern', 'post', 'inn', 'lodge'];
// L3.5: types = todos os tipos (um link por tipo na galeria cenarios-pois.html: ?cenario=lego&tipo=<tipo>); base = o que a vista sem `tipo` mostra (só os 3 primeiros: a grade
// de 14 tipos x 2 tamanhos x 46 blocos não cabe no mapa). Receitas e peças dos 11 tipos novos: lego-poi-modifiers.js e poilego2.js.
// Tipos lego que, com lego ligado, também giram para a estrada e ganham trilha no tile (fazenda, mina, serraria) e, no L4, plantação e vila de trabalhadores (de estrada). Padrão: os cinco.
const LEGO_FACE_RECIPES = ['farm', 'mine', 'sawmill', 'plantation', 'workers'];
const LEGO_SHOW = { n: 4, gap: 46, types: ['farm', 'mine', 'sawmill', 'hunters', 'sanctuary', 'ruins', 'fort', 'tower', 'inn', 'lodge', 'post', 'plantation', 'fishery', 'workers'],
  base: ['farm', 'mine', 'sawmill'], sizes: ['M', 'P'], area: [245, 215] };
// Cenário lego: área limpa (meia-largura em x e em z, em blocos, a partir do centro do mapa) onde não nascem cidades (cada uma tem até 45 de meio-lado, então a muralha fica
// longe da grade e do bloco de micro-POIs). Em ?cenario=lego também não nascem acampamentos, grutas, baús, bandos nem terrenos de guerra: só o que é da feature. Padrão: LEGO_SHOW.area.
// Micro-POIs (L3; poimicro.js): só cenário. No cenário lego ficam em bloco ao lado da grade, depois dos 4 dormentes que já existiam: x = distância do centro à 1ª coluna (110),
// gap = espaço entre os centros (28: cabe o maior raio dormente, 12), cols = colunas (4). list = os novos: id (função de MICRO_PIECES), n (nome da placa) e r (raio, 3 a 7).
const LEGO_MICRO = { x: 110, gap: 28, cols: 4, list: [
  { id: 'carroca', n: 'Carroça quebrada', r: 5 }, { id: 'acampamento', n: 'Acampamento abandonado', r: 7 }, { id: 'estande', n: 'Estande de caça', r: 6 },
  { id: 'altar', n: 'Altar solitário', r: 6 }, { id: 'torre', n: 'Ruína de torre', r: 7 }, { id: 'monolito', n: 'Monólito', r: 5 },
  { id: 'ermitao', n: 'Cabana de ermitão', r: 7 }, { id: 'minerio', n: 'Carrinho de minério perdido', r: 5 }, { id: 'toras', n: 'Toras caídas', r: 6 },
  { id: 'armadilha', n: 'Armadilha de caça', r: 5 }, { id: 'tumba', n: 'Tumba', r: 6 }, { id: 'estatua', n: 'Estátua quebrada', r: 5 },
  { id: 'campo_batalha', n: 'Campo de batalha esquecido', r: 7 }, { id: 'barricada', n: 'Barricada derrubada', r: 7 }, { id: 'trincheira', n: 'Trincheira abandonada', r: 7 },
  { id: 'vala_comum', n: 'Vala comum', r: 7 }, { id: 'palicada', n: 'Paliçada tombada', r: 8 }] };
// Vista do cenário lego pela URL (galeria cenarios-pois.html): ?tipo=<tipo de LEGO_SHOW.types> mostra só as variações desse tipo; ?micro=1 só os micro-POIs; sem nenhum, os tipos de LEGO_SHOW.base e os micros.
// Devolve {types: tipos da grade, micro: mostra o bloco de micro-POIs, solo: o bloco de micros fica sozinho (centrado)}.
function legoShowView() {
  const q = new URLSearchParams(location.search), t = q.get('tipo'), only = q.get('micro') === '1';
  return { types: only ? [] : LEGO_SHOW.types.includes(t) ? [t] : LEGO_SHOW.base, micro: only || !LEGO_SHOW.types.includes(t), solo: only };
}
// Sem piso próprio: o POI usa o chão do cenário (como os outros POIs). Com ?cenario=lego, ?piso=planicie|floresta|deserto|neve|montanha força o bioma de todos os POIs (padrão: planicie).
// Chance de o POI ter cerca em volta, por tamanho: cresce com o POI (P pequeno 25%, M médio 50%, G grande 75%).
const LEGO_FENCE = { P: 0.25, M: 0.5, G: 0.75 };
const LEGO_PISO_BIOMA = { planicie: 0, floresta: 1, deserto: 2, neve: 3, montanha: 4 };
const legoShowBiome = () => LEGO_PISO_BIOMA[new URLSearchParams(location.search).get('piso')] || 0;
// Nome do tamanho (placas do cenário).
const LEGO_SIZE_NAME = { M: 'médio', P: 'pequeno' };

// Vaga = {k: tipo, x, z, w, d (retângulo, canto mínimo x,z), face: lado para onde a frente da peça olha ('S','N','E','W'), p: chance de a vaga existir (1)}.
// Tipos de vaga: casa (âncora; sempre há uma: casa, boca da mina, serra), apoio (prédios menores), campo (terreno de trabalho), curral (animais; só na fazenda) e patio (enfeites).
// Receita de um tamanho: half (metade do lado; o POI inteiro cabe em raio half+1), flag (onde fica a bandeira do dono: ao lado do portão, fora da cerca), gate (meia-largura
// do portão, 2.5), skeletons (id, lane = x da faixa livre por onde passa o caminho do portão até a âncora (0), slots), pick (peça por tipo de vaga,
// com peso; só entram as que cabem, ver LEGO_MIN) e decor (enfeites do pátio com peso).
const LEGO_RECIPES = {
  farm: {
    M: { half: 17, gate: 2.5, flag: [4, 17.2], decorN: [3, 4],
      skeletons: [
        { id: 'fileira', slots: [   // campos atrás, apoios dos lados, casa na frente, pátio no meio
          { k: 'campo', x: -16, z: -16, w: 10, d: 10 }, { k: 'campo', x: -5, z: -16, w: 10, d: 10 }, { k: 'campo', x: 6, z: -16, w: 10, d: 10 },
          { k: 'apoio', x: -16, z: -4, w: 10, d: 9, face: 'E' }, { k: 'apoio', x: 6, z: -4, w: 10, d: 9, face: 'W' },
          { k: 'patio', x: -5, z: -4, w: 10, d: 9 }, { k: 'casa', x: -5, z: 5, w: 10, d: 8, face: 'S' }] },
        { id: 'patio-fechado', slots: [   // casa no fundo, apoios nos dois lados do pátio, campos à frente (o portão passa entre eles)
          { k: 'casa', x: -5, z: -16, w: 10, d: 8, face: 'S' },
          { k: 'apoio', x: -16, z: -6, w: 10, d: 10, face: 'E' }, { k: 'apoio', x: 6, z: -6, w: 10, d: 10, face: 'W' },
          { k: 'patio', x: -5, z: -6, w: 10, d: 10 },
          { k: 'campo', x: -16, z: 6, w: 12, d: 9 }, { k: 'campo', x: 4, z: 6, w: 12, d: 9 }] },
        { id: 'curral-grande', lane: 1, slots: [
          { k: 'apoio', x: -16, z: -16, w: 12, d: 9, face: 'S' }, { k: 'casa', x: 4, z: -16, w: 11, d: 8, face: 'S' },
          { k: 'patio', x: 4, z: -8, w: 11, d: 3 }, { k: 'curral', x: -16, z: -5, w: 16, d: 12, face: 'E' },
          { k: 'campo', x: 2, z: -4, w: 14, d: 10 }, { k: 'campo', x: -16, z: 8, w: 12, d: 7 }, { k: 'apoio', x: 4, z: 7, w: 12, d: 8, face: 'S' }] },
        { id: 'em-ele', slots: [   // campo largo no fundo, casa no centro, curral e apoio na frente
          { k: 'campo', x: -16, z: -16, w: 32, d: 8 }, { k: 'campo', x: -16, z: -7, w: 10, d: 12 },
          { k: 'casa', x: -3, z: -3, w: 10, d: 8, face: 'S' }, { k: 'apoio', x: 9, z: -7, w: 7, d: 10, face: 'W' },
          { k: 'patio', x: -2, z: 5, w: 4, d: 3 }, { k: 'curral', x: -16, z: 7, w: 14, d: 8, face: 'E' }, { k: 'apoio', x: 2, z: 8, w: 14, d: 7, face: 'N' }] },
        { id: 'pomar', slots: [   // casa de lado, pomar e campos atrás, curral à direita
          { k: 'campo', x: -16, z: -16, w: 14, d: 11 }, { k: 'campo', x: 0, z: -16, w: 16, d: 8 },
          { k: 'casa', x: -16, z: -3, w: 10, d: 8, face: 'E' }, { k: 'patio', x: -5, z: -4, w: 9, d: 9 },
          { k: 'curral', x: 4, z: -6, w: 12, d: 10, face: 'W' }, { k: 'apoio', x: -16, z: 7, w: 12, d: 8, face: 'E' }, { k: 'apoio', x: 4, z: 7, w: 12, d: 8, face: 'N', p: 0.7 }] }
      ] },
    P: { half: 11, gate: 2.5, flag: [4, 11.2], decorN: [2, 3],
      skeletons: [
        { id: 'p-fileira', slots: [   // casa no fundo, dois apoios, dois campos e um pátio
          { k: 'casa', x: -5, z: -11, w: 10, d: 8, face: 'S' }, { k: 'apoio', x: -11, z: -11, w: 6, d: 8, face: 'E' }, { k: 'apoio', x: 5, z: -11, w: 6, d: 8, face: 'W' },
          { k: 'patio', x: -3, z: -2, w: 6, d: 6 }, { k: 'campo', x: -11, z: -2, w: 8, d: 8 }, { k: 'campo', x: 3, z: -2, w: 8, d: 8 }] },
        { id: 'p-curral', slots: [   // casa à esquerda, curral à direita, pátio e campos na frente
          { k: 'casa', x: -11, z: -11, w: 10, d: 8, face: 'S' }, { k: 'curral', x: 1, z: -11, w: 10, d: 10, face: 'W' },
          { k: 'patio', x: -11, z: -2, w: 8, d: 6 }, { k: 'campo', x: -11, z: 4, w: 8, d: 6 }, { k: 'campo', x: 3, z: 1, w: 8, d: 9 }] },
        { id: 'p-campo-largo', slots: [   // campo largo no fundo, casa no meio, apoios dos lados
          { k: 'campo', x: -11, z: -11, w: 22, d: 8 }, { k: 'casa', x: -5, z: -3, w: 10, d: 8, face: 'S' },
          { k: 'apoio', x: -11, z: -3, w: 6, d: 8, face: 'E' }, { k: 'apoio', x: 5, z: -3, w: 6, d: 8, face: 'W' }, { k: 'patio', x: -3, z: 5, w: 6, d: 4 }] },
        { id: 'p-curral-lateral', slots: [   // campo e curral atrás, casa de lado, apoio e campo à frente
          { k: 'campo', x: -11, z: -11, w: 14, d: 8 }, { k: 'curral', x: 3, z: -11, w: 8, d: 8, face: 'W' }, { k: 'casa', x: -11, z: -2, w: 10, d: 8, face: 'E' },
          { k: 'patio', x: -1, z: -2, w: 6, d: 6 }, { k: 'apoio', x: 5, z: -2, w: 6, d: 6, face: 'W' }, { k: 'campo', x: 3, z: 4, w: 8, d: 6 }] }
      ] }
  },
  mine: {
    M: { half: 14, gate: 2.5, flag: [4, 14.2], decorN: [3, 4],
      skeletons: [
        { id: 'boca-no-fundo', slots: [   // boca no fundo com os trilhos para o pátio, apoios dos lados, depósitos de minério na frente
          { k: 'casa', x: -5, z: -14, w: 10, d: 8, face: 'S' }, { k: 'patio', x: -5, z: -6, w: 10, d: 6 },
          { k: 'apoio', x: -14, z: -8, w: 8, d: 9, face: 'E' }, { k: 'apoio', x: 6, z: -8, w: 8, d: 9, face: 'W' },
          { k: 'campo', x: -14, z: 3, w: 9, d: 9 }, { k: 'campo', x: 5, z: 3, w: 9, d: 9 }] },
        { id: 'boca-lateral', slots: [   // boca na lateral olhando para o pátio, oficinas atrás e minério à direita
          { k: 'casa', x: -14, z: -4, w: 9, d: 8, face: 'E' }, { k: 'patio', x: -5, z: -5, w: 10, d: 10 },
          { k: 'apoio', x: -14, z: -14, w: 10, d: 9, face: 'S' }, { k: 'campo', x: 5, z: -14, w: 9, d: 13 },
          { k: 'apoio', x: -14, z: 6, w: 10, d: 7, face: 'E' }, { k: 'campo', x: 5, z: 4, w: 9, d: 9 }] },
        { id: 'galeria', slots: [   // boca larga no centro-fundo, faixa de pátio ao longo da frente, pilhas na frente
          { k: 'casa', x: -6, z: -14, w: 12, d: 8, face: 'S' }, { k: 'apoio', x: -14, z: -14, w: 8, d: 8, face: 'E' }, { k: 'apoio', x: 7, z: -14, w: 7, d: 8, face: 'W' },
          { k: 'patio', x: -14, z: -5, w: 28, d: 5 }, { k: 'campo', x: -14, z: 1, w: 11, d: 12 }, { k: 'campo', x: 3, z: 1, w: 11, d: 12 }] },
        { id: 'terreiro', slots: [   // boca no centro, entulho atrás, pátios dos lados, pilhas na frente
          { k: 'casa', x: -4, z: -4, w: 10, d: 8, face: 'S' }, { k: 'apoio', x: -14, z: -14, w: 9, d: 9, face: 'S' }, { k: 'campo', x: -4, z: -14, w: 10, d: 9 },
          { k: 'apoio', x: 6, z: -14, w: 8, d: 9, face: 'W' }, { k: 'patio', x: -14, z: -4, w: 10, d: 8 }, { k: 'patio', x: 6, z: -4, w: 8, d: 8 },
          { k: 'campo', x: -14, z: 5, w: 11, d: 8 }, { k: 'campo', x: 3, z: 5, w: 11, d: 8 }] }
      ] },
    P: { half: 9, gate: 2.5, flag: [4, 9.2], decorN: [2, 3],
      skeletons: [
        { id: 'p-boca', slots: [
          { k: 'casa', x: -4, z: -9, w: 8, d: 7, face: 'S' }, { k: 'apoio', x: -9, z: -9, w: 5, d: 7, face: 'E' }, { k: 'apoio', x: 4, z: -9, w: 5, d: 7, face: 'W' },
          { k: 'patio', x: -4, z: -2, w: 8, d: 5 }, { k: 'campo', x: -9, z: 0, w: 5, d: 8 }, { k: 'campo', x: 4, z: 0, w: 5, d: 8 }] },
        { id: 'p-lateral', slots: [
          { k: 'casa', x: -9, z: -4, w: 8, d: 7, face: 'E' }, { k: 'apoio', x: -9, z: -9, w: 8, d: 5, face: 'S' }, { k: 'patio', x: -1, z: -4, w: 5, d: 7 },
          { k: 'campo', x: 4, z: -9, w: 5, d: 8 }, { k: 'campo', x: 4, z: 1, w: 5, d: 7 }] },
        { id: 'p-fundo', slots: [
          { k: 'casa', x: -9, z: -9, w: 8, d: 7, face: 'S' }, { k: 'apoio', x: 0, z: -9, w: 9, d: 8, face: 'S' },
          { k: 'patio', x: -9, z: -2, w: 8, d: 5 }, { k: 'campo', x: -9, z: 3, w: 6, d: 5 }, { k: 'campo', x: 3, z: 0, w: 6, d: 8 }] },
        { id: 'p-patio-largo', slots: [
          { k: 'casa', x: -4, z: -9, w: 8, d: 7, face: 'S' }, { k: 'campo', x: -9, z: -9, w: 5, d: 7 }, { k: 'apoio', x: 4, z: -9, w: 5, d: 7, face: 'W' },
          { k: 'patio', x: -9, z: -2, w: 18, d: 4 }, { k: 'campo', x: -9, z: 3, w: 6, d: 5 }, { k: 'campo', x: 3, z: 3, w: 6, d: 5 }] }
      ] }
  },
  sawmill: {
    M: { half: 13, gate: 2.5, flag: [4, 13.2], decorN: [3, 4],
      skeletons: [
        { id: 'linha', slots: [   // serra no fundo, escritório e pilhas dos lados, campos de toras à frente
          { k: 'casa', x: -5, z: -13, w: 11, d: 7, face: 'S' }, { k: 'patio', x: -5, z: -6, w: 11, d: 6 },
          { k: 'apoio', x: -13, z: -13, w: 8, d: 12, face: 'E' }, { k: 'apoio', x: 7, z: -13, w: 6, d: 12, face: 'W' },
          { k: 'campo', x: -13, z: 1, w: 10, d: 11 }, { k: 'campo', x: 3, z: 1, w: 10, d: 11 }] },
        { id: 'canal-lateral', slots: [   // canal com roda d'água no fundo, serra no centro, pilhas na frente
          { k: 'campo', x: -13, z: -13, w: 26, d: 7 }, { k: 'casa', x: -3, z: -4, w: 11, d: 7, face: 'S' }, { k: 'apoio', x: -13, z: -4, w: 9, d: 8, face: 'E' },
          { k: 'patio', x: 8, z: -4, w: 5, d: 8 }, { k: 'campo', x: -13, z: 5, w: 10, d: 7 }, { k: 'campo', x: 3, z: 5, w: 10, d: 7 }] },
        { id: 'patio-de-toras', slots: [
          { k: 'casa', x: -13, z: -13, w: 11, d: 7, face: 'S' }, { k: 'apoio', x: -1, z: -13, w: 7, d: 8, face: 'S' }, { k: 'campo', x: 7, z: -13, w: 6, d: 9 },
          { k: 'patio', x: -13, z: -5, w: 12, d: 8 }, { k: 'apoio', x: 1, z: -4, w: 12, d: 8, face: 'S' },
          { k: 'campo', x: -13, z: 4, w: 10, d: 8 }, { k: 'campo', x: 3, z: 4, w: 10, d: 8 }] },
        { id: 'deposito', slots: [   // serra no centro, apoios dos lados, pilhas atrás e à frente
          { k: 'casa', x: -6, z: -3, w: 12, d: 7, face: 'S' }, { k: 'campo', x: -13, z: -13, w: 13, d: 9 }, { k: 'campo', x: 1, z: -13, w: 12, d: 9 },
          { k: 'apoio', x: -13, z: -3, w: 7, d: 8, face: 'E' }, { k: 'apoio', x: 6, z: -3, w: 7, d: 8, face: 'W' },
          { k: 'campo', x: -13, z: 6, w: 10, d: 6 }, { k: 'campo', x: 3, z: 6, w: 10, d: 6 }] }
      ] },
    P: { half: 9, gate: 2.5, flag: [4, 9.2], decorN: [2, 3],
      skeletons: [
        { id: 'p-linha', slots: [
          { k: 'casa', x: -4, z: -9, w: 9, d: 6, face: 'S' }, { k: 'campo', x: -9, z: -9, w: 5, d: 6 }, { k: 'patio', x: -4, z: -3, w: 8, d: 5 },
          { k: 'campo', x: -9, z: -3, w: 5, d: 11 }, { k: 'campo', x: 4, z: 0, w: 5, d: 8 }] },
        { id: 'p-canal', slots: [
          { k: 'campo', x: -9, z: -9, w: 18, d: 5 }, { k: 'casa', x: -9, z: -4, w: 9, d: 6, face: 'E' }, { k: 'patio', x: 0, z: -4, w: 9, d: 6 },
          { k: 'campo', x: -9, z: 2, w: 6, d: 6 }, { k: 'campo', x: 3, z: 3, w: 6, d: 5 }] },
        { id: 'p-meio', slots: [
          { k: 'campo', x: -9, z: -9, w: 18, d: 5 }, { k: 'casa', x: -4, z: -4, w: 9, d: 6, face: 'S' }, { k: 'apoio', x: -9, z: -4, w: 5, d: 7, face: 'E' },
          { k: 'patio', x: -4, z: 2, w: 8, d: 4 }, { k: 'campo', x: 4, z: 3, w: 5, d: 5 }, { k: 'campo', x: -9, z: 3, w: 5, d: 5 }] },
        { id: 'p-dobrado', slots: [
          { k: 'casa', x: -4, z: -9, w: 9, d: 6, face: 'S' }, { k: 'apoio', x: -9, z: -9, w: 5, d: 7, face: 'E' }, { k: 'patio', x: -4, z: -3, w: 8, d: 5 },
          { k: 'campo', x: -9, z: -2, w: 5, d: 10 }, { k: 'campo', x: 4, z: 0, w: 5, d: 8 }] }
      ] }
  }
};
// Que peça entra em cada tipo de vaga, por tipo de POI (peso; só entram as que cabem em w×d, ver LEGO_MIN). 'nada' deixa o terreno livre.
const LEGO_PICK = {
  farm: { casa: { casa: 1 }, apoio: { celeiro: 4, silos: 3, galinheiro: 2, curral: 2, pomar: 1.5, nada: 0.5 }, campo: { trigo: 4, horta: 3, milho: 3, pomar: 1.2 }, curral: { curral: 1 } },
  mine: { casa: { boca: 1 }, apoio: { oficina: 4, guincho: 3, deposito: 3, nada: 0.5 }, campo: { minerio: 4, carvao: 2, entulho: 3, guincho: 1 } },
  sawmill: { casa: { serra: 1 }, apoio: { escritorio: 4, tabuas: 3, toras: 3, nada: 0.5 }, campo: { toras: 4, tabuas: 3, canal: 2, entulho: 0.8 } }
};
// Tamanho mínimo (w, d) de cada peça.
const LEGO_MIN = {
  casa: [9, 7], celeiro: [8, 7], silos: [6, 4], galinheiro: [6, 5], curral: [8, 6], pomar: [8, 7], trigo: [6, 6], horta: [6, 6], milho: [6, 6],
  boca: [7, 7], oficina: [5, 5], guincho: [5, 5], deposito: [5, 5], minerio: [5, 5], carvao: [5, 5], entulho: [5, 5],
  serra: [9, 6], escritorio: [5, 5], tabuas: [5, 5], toras: [5, 5], canal: [8, 4], nada: [0, 0]
};
// Enfeites do pátio por tipo de POI (peso). Sorteia `decorN` itens em posições diferentes do retângulo do pátio (poço e carroça só em célula grande).
const LEGO_DECOR = {
  farm: { poco: 3, carroca: 2, feno: 2, lampiao: 2, banco: 1 },
  mine: { carroca: 3, barril: 2, caixa: 2, lampiao: 2, rack: 1, banco: 1 },
  sawmill: { carroca: 2, barril: 1, toco: 3, tora: 3, lampiao: 2, banco: 1 }
};
// Cores sorteadas (casa, celeiro, portas/janelas, animais, culturas, rocha, minério, madeira).
const LEGO_PAL = {
  wall: [0xe8d8b0, 0xd8c8a0, 0xf0e4c4, 0xc8b890], roof: [0x9a4a2a, 0x7a3a2a, 0x8a5a3a, 0x6a4a3a], shut: [0x3a5a3a, 0x3a4a6a, 0x6a3a3a, 0x4a3a2a],
  barn: [0x9a3a2a, 0x8a4a2a, 0x7a5a3a, 0xa04a30], barnRoof: [0x4a3a30, 0x3a3a40, 0x5a3a2a],
  work: [0x8a6a3a, 0xa87a4a, 0x7a5a3a], workRoof: [0x4a3a2a, 0x3a3a40, 0x5a3a2a],
  animals: { vaca: [0xf0ece0, 0x8a5a3a, 0x3a2a22], ovelha: [0xf0ece0, 0xe0dccc], porco: [0xf0b0b0, 0xd89090] },
  crops: { trigo: [0xd8b84a, 0xe0c050, 0xc8a83c], horta: [0x3a8a2a, 0xc83a2a, 0xe08a2a, 0x5ab03a], milho: [0x5aa030, 0x6ab03a, 0x4a9028] },
  rock: [0x6a6a72, 0x7a7a82, 0x5a5a62, 0x8a8a90], ore: [0x7a6a5a, 0x5a5a6a, 0x8a5a3a, 0xc8a030], coal: [0x2a2a2a, 0x3a3a3a, 0x1f1f24], plank: [0xd0a868, 0xc89858, 0xb8884a], log: [0x8a5a2a, 0x6a4220]
};
// Nota da frente `f` de uma vaga s (ponto 1.5 bloco à frente da porta): 0 = dá num pátio, 1 = dá em campo ou terreno livre, 9 = dá em parede de outro prédio ou na cerca (porta tampada).
function legoFaceScore(slots, s, H, f) {
  const q = f === 'S' ? [s.x + s.w / 2, s.z + s.d + 1.5] : f === 'N' ? [s.x + s.w / 2, s.z - 1.5] : f === 'E' ? [s.x + s.w + 1.5, s.z + s.d / 2] : [s.x - 1.5, s.z + s.d / 2];
  if (Math.abs(q[0]) > H || q[1] < -H || q[1] > H - 1) return 9;
  const t = slots.find(o => o !== s && q[0] >= o.x && q[0] <= o.x + o.w && q[1] >= o.z && q[1] <= o.z + o.d);
  return !t ? 0.5 : t.k === 'campo' ? 1 : t.k === 'patio' ? 0 : 9;   // pátio 0, chão livre 0.5, campo 1 (as peças de campo podem ter colisão), parede 9
}
// Frente de uma vaga de apoio: a do esqueleto se dá num pátio; senão a melhor das quatro (S, E, W, N; só troca se for melhor: pátio, depois chão livre, depois campo).
function legoFaceFor(slots, s, H) {
  let best = s.face || 'S', bs = legoFaceScore(slots, s, H, best); if (bs === 0) return best;
  for (const f of ['S', 'E', 'W', 'N']) { const v = legoFaceScore(slots, s, H, f); if (v < bs) { bs = v; best = f } }
  return best;
}
// Raio de um POI lego (metade do lado + 1): vale por instância (p.r), POI_DEFS só tem o tamanho médio.
const legoR = (type, size) => LEGO_RECIPES[type][size || 'M'].half + 1;
