'use strict';
// ---------- Modificadores: POIs "lego" (protótipo da fazenda; docs/features/11_pois-procedurais-lego.md) ----------
// Um POI lego é montado de PEÇAS (casa, celeiro, silos, curral, campo...) colocadas em VAGAS de um ESQUELETO desenhado à mão; a semente decide esqueleto, giro/espelho,
// peça de cada vaga e enfeites. Este arquivo só tem dados (números e tabelas); o montador está em js/local/poilego.js. Ligado por ?lego=1 (legoOn); sem ele a fazenda
// continua a de sempre. Todas as coordenadas são do esqueleto "de frente para o sul": o portão fica em z = +gate (sul) e o esqueleto gira/espelha depois.
// Padrões entre parênteses.

// Verdadeiro com ?lego=1 (a fazenda passa a ser montada por peças; o resto do jogo não muda).
const legoOn = () => new URLSearchParams(location.search).get('lego') === '1';
// Metade do lado da área (blocos) de um esqueleto "M" (fazenda principal, raio 18 de POI_DEFS.farm): tudo fica entre -half e +half em x e z (17).
const LEGO_HALF = 17;
// Vaga = {k: tipo, x, z, w, d (retângulo, canto mínimo x,z), face: lado para onde a frente da peça olha ('S','N','E','W'), p: chance de a vaga existir (1)}.
// Tipos de vaga: casa (âncora; sempre há uma), apoio (celeiro, silos, galinheiro, curral, pomar ou nada), campo (cultivo), curral (animais) e patio (enfeites: poço, carroça, fardos, lampião).
// gate: meia-largura do portão da cerca (2.5); a cerca vai de x -17..17, z -17..16 e o portão fica em z = 16 (sul). flag: onde fica a bandeira do dono (ao lado do portão, fora da cerca).
// lane (por esqueleto, 0): x da faixa livre por onde passa o caminho do portão até a casa.
const LEGO_FARM = {
  gate: 2.5, flag: [4, 17.2],
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
  ],
  // Que peça entra em cada tipo de vaga (peso; só entram as que cabem em w×d, ver `min`). 'nada' deixa o terreno livre.
  pick: {
    casa: { casa: 1 },
    apoio: { celeiro: 4, silos: 3, galinheiro: 2, curral: 2, pomar: 1.5, nada: 0.5 },
    campo: { trigo: 4, horta: 3, milho: 3, pomar: 1.2 },
    curral: { curral: 1 }
  },
  // Tamanho mínimo (w, d) de cada peça.
  min: { casa: [9, 7], celeiro: [8, 7], silos: [6, 4], galinheiro: [6, 5], curral: [8, 6], pomar: [8, 7], trigo: [6, 6], horta: [6, 6], milho: [6, 6], nada: [0, 0] },
  // Enfeites do pátio (peso): poço, carroça, fardos de feno, lampião, banco. Sorteia 3 a 4 em posições diferentes do retângulo do pátio.
  decor: { poco: 3, carroca: 2, feno: 2, lampiao: 2, banco: 1 }, decorN: [3, 4],
  // Cores sorteadas: parede e telhado da casa, parede do celeiro, cor das portas/janelas (shut) e animais por espécie.
  pal: {
    wall: [0xe8d8b0, 0xd8c8a0, 0xf0e4c4, 0xc8b890], roof: [0x9a4a2a, 0x7a3a2a, 0x8a5a3a, 0x6a4a3a], shut: [0x3a5a3a, 0x3a4a6a, 0x6a3a3a, 0x4a3a2a],
    barn: [0x9a3a2a, 0x8a4a2a, 0x7a5a3a, 0xa04a30], barnRoof: [0x4a3a30, 0x3a3a40, 0x5a3a2a],
    animals: { vaca: [0xf0ece0, 0x8a5a3a, 0x3a2a22], ovelha: [0xf0ece0, 0xe0dccc], porco: [0xf0b0b0, 0xd89090] },
    crops: { trigo: [0xd8b84a, 0xe0c050, 0xc8a83c], horta: [0x3a8a2a, 0xc83a2a, 0xe08a2a, 0x5ab03a], milho: [0x5aa030, 0x6ab03a, 0x4a9028] }
  }
};
