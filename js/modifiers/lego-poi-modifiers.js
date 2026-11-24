'use strict';
// ---------- Modificadores: POIs "lego" do L3.5 (docs/features/11_pois-procedurais-lego.md, seção 7h) ----------
// Estende LEGO_RECIPES, LEGO_PICK, LEGO_MIN, LEGO_DECOR e LEGO_PAL (lego-modifiers.js, que carrega antes) com 11 tipos: caçadores, santuário, ruínas, forte, torre, pousada,
// alojamento, entreposto, plantação, vila de pesca e vila de trabalhadores. Mesmo formato da fazenda/mina/serraria: cada tipo tem os tamanhos M (médio) e P (pequeno), com 4 esqueletos
// de vagas cada. Peças e montador: js/local/poilego2.js e poilego.js. Coordenadas no quadro do esqueleto (portão ao sul, z = half-1; as vagas ficam dentro de ±half).
// Campos novos de uma receita (opcionais): fence = chance de cerca (padrão LEGO_FENCE[tamanho]) ou 'wall' (muralha de pedra com portão, sempre); path = false (sem caminho do portão
// à porta); noflag = true (sem bandeira: ruínas); gate = meia-largura do portão (2.5). Tipos de vaga novos: agua (lago da vila de pesca), cozinha (alojamento).
// Vaga de esqueleto: LS(tipo, x, z, w, d, frente, chance). frente = lado da porta da peça ('S','N','E','W'); chance = probabilidade de a vaga existir (1).
const LS = (k, x, z, w, d, face, p) => { const s = { k, x, z, w, d }; if (face) s.face = face; if (p !== undefined) s.p = p; return s };

// Raios (half + 1): caçadores M13 P10, santuário M14 P11, ruínas M11 P9, forte M15 P13, torre M11 P8, pousada M14 P11, alojamento M14 P12 (P: 11), entreposto M16 P12,
// plantação M18 P12, vila de pesca M14 P12, vila de trabalhadores M23 P16. (POI_DEFS.r, pois.js, guarda o tamanho médio.)
const LEGO_RECIPES_L35 = {
  hunters: {
    M: { half: 12, gate: 2.5, flag: [4, 12.2], decorN: [3, 4], fence: 0,
      skeletons: [
        { id: 'circulo', slots: [LS('casa', -4, -5, 8, 8, 'S'), LS('apoio', -12, -9, 8, 6, 'E'), LS('apoio', 4, -9, 8, 6, 'W'), LS('apoio', -12, 3, 10, 4, 'S'), LS('apoio', 6, 3, 6, 6, 'W'), LS('patio', -2, 4, 4, 6)] },
        { id: 'fila', slots: [LS('casa', -4, 0, 8, 8, 'S'), LS('apoio', -12, -12, 8, 6, 'S'), LS('apoio', -4, -12, 8, 6, 'S'), LS('apoio', 4, -12, 8, 6, 'S'), LS('patio', -12, -6, 24, 6), LS('campo', -12, 1, 7, 8), LS('campo', 5, 1, 7, 8)] },
        { id: 'clareira', slots: [LS('casa', -11, -4, 8, 8, 'E'), LS('patio', -3, -5, 8, 10), LS('apoio', -11, -12, 8, 6, 'S'), LS('apoio', -3, -12, 8, 6, 'S'), LS('apoio', 6, -6, 6, 6, 'W'), LS('apoio', 6, 2, 6, 6, 'W'), LS('campo', -11, 5, 8, 6)] },
        { id: 'dupla', slots: [LS('casa', -4, -12, 8, 8, 'S'), LS('patio', -4, -3, 8, 7), LS('apoio', -12, -12, 8, 6, 'E'), LS('apoio', 4, -12, 8, 6, 'W'), LS('campo', -12, -3, 8, 7), LS('campo', 4, -3, 8, 7), LS('apoio', -12, 5, 8, 6, 'N'), LS('apoio', 4, 5, 8, 6, 'N')] }
      ] },
    P: { half: 9, gate: 2.5, flag: [4, 9.2], decorN: [2, 3], fence: 0,
      skeletons: [
        { id: 'p-circulo', slots: [LS('casa', -4, -5, 8, 8, 'S'), LS('apoio', -9, -5, 5, 5, 'E'), LS('apoio', 4, -5, 5, 5, 'W'), LS('apoio', -9, 3, 7, 4, 'S'), LS('apoio', 5, 3, 4, 4, 'W'), LS('patio', -2, 4, 4, 3)] },
        { id: 'p-fila', slots: [LS('casa', -4, -9, 8, 8, 'S'), LS('apoio', -9, -9, 5, 6, 'E'), LS('apoio', 4, -9, 5, 6, 'W'), LS('patio', -9, 0, 18, 4), LS('apoio', -9, 4, 6, 3, 'S'), LS('apoio', 3, 4, 6, 3, 'S')] },
        { id: 'p-lado', slots: [LS('casa', -9, -4, 8, 8, 'E'), LS('patio', -1, -4, 5, 9), LS('apoio', -9, -9, 6, 5, 'S'), LS('apoio', -1, -9, 8, 5, 'S'), LS('apoio', 5, -3, 4, 6, 'W')] },
        { id: 'p-armadilhas', slots: [LS('casa', -4, -9, 8, 8, 'S'), LS('apoio', -9, -9, 5, 6, 'E'), LS('apoio', 4, -9, 5, 6, 'W'), LS('campo', -9, 0, 6, 6), LS('campo', 3, 0, 6, 6), LS('patio', -3, 0, 6, 6)] }
      ] }
  },
  sanctuary: {
    M: { half: 13, gate: 2.5, flag: [4, 13.2], decorN: [3, 4], fence: 0.5,
      skeletons: [
        { id: 'eixo', slots: [LS('casa', -5, -13, 10, 10, 'S'), LS('apoio', -13, -13, 7, 7, 'E'), LS('apoio', 6, -13, 7, 7, 'W'), LS('patio', -5, -2, 10, 8), LS('campo', -13, 0, 8, 10), LS('campo', 5, 0, 8, 10)] },
        { id: 'claustro', slots: [LS('casa', -5, -13, 10, 10, 'S'), LS('patio', -13, -2, 26, 6), LS('apoio', -13, -13, 7, 8, 'S'), LS('apoio', 6, -13, 7, 8, 'S'), LS('campo', -13, 5, 9, 7), LS('campo', 4, 5, 9, 7)] },
        { id: 'lateral', slots: [LS('casa', -13, -5, 10, 10, 'E'), LS('patio', -3, -6, 9, 12), LS('apoio', -13, -13, 8, 7, 'E'), LS('campo', 7, -6, 6, 8), LS('campo', 7, 3, 6, 8), LS('apoio', -13, 6, 8, 6, 'E')] },
        { id: 'isolada', slots: [LS('casa', -5, -5, 10, 10, 'S'), LS('apoio', -13, -13, 8, 7, 'S'), LS('apoio', 5, -13, 8, 7, 'S'), LS('campo', -13, -5, 8, 10), LS('campo', 5, -5, 8, 10), LS('patio', -5, 6, 10, 5), LS('patio', -5, -13, 10, 8)] }
      ] },
    P: { half: 10, gate: 2.5, flag: [4, 10.2], decorN: [2, 3], fence: 0.25,
      skeletons: [
        { id: 'p-eixo', slots: [LS('casa', -5, -10, 10, 9, 'S'), LS('apoio', -10, -10, 5, 6, 'E'), LS('apoio', 5, -10, 5, 6, 'W'), LS('patio', -5, 0, 10, 6), LS('campo', -10, 0, 5, 6), LS('campo', 5, 0, 5, 6)] },
        { id: 'p-frente', slots: [LS('casa', -5, -3, 10, 9, 'S'), LS('apoio', -10, -10, 10, 5, 'S'), LS('apoio', 0, -10, 10, 5, 'S'), LS('campo', -10, -4, 5, 8), LS('campo', 5, -4, 5, 8), LS('patio', -5, 7, 10, 1.9)] },
        { id: 'p-lateral', slots: [LS('casa', -10, -5, 10, 9, 'E'), LS('patio', 0, -5, 5, 9), LS('apoio', 5, -10, 5, 6, 'W'), LS('campo', 5, -3, 5, 7), LS('campo', -10, 5, 6, 4)] },
        { id: 'p-tumulos', slots: [LS('casa', -5, -10, 10, 9, 'S'), LS('apoio', 5, -10, 5, 6, 'W'), LS('apoio', -10, -10, 5, 6, 'E'), LS('campo', -10, 0, 6, 7), LS('campo', 4, 0, 6, 7), LS('patio', -4, 0, 8, 6)] }
      ] }
  },
  ruins: {
    M: { half: 10, gate: 2.5, flag: [4, 10.2], decorN: [2, 3], fence: 0, path: false, noflag: true,
      skeletons: [
        { id: 'nave', slots: [LS('casa', -5, -10, 10, 8, 'S'), LS('apoio', -10, -10, 5, 6, 'S'), LS('apoio', 5, -10, 5, 6, 'S'), LS('patio', -5, -1, 10, 5), LS('campo', -10, -3, 5, 7), LS('campo', 5, -3, 5, 7), LS('campo', -10, 5, 7, 4), LS('campo', 3, 5, 7, 4)] },
        { id: 'circulo', slots: [LS('casa', -4, -4, 8, 8, 'S'), LS('apoio', -10, -10, 7, 5, 'S'), LS('apoio', 3, -10, 7, 5, 'S'), LS('apoio', -10, -4, 6, 8, 'E'), LS('apoio', 4, -4, 6, 8, 'W'), LS('patio', -4, 5, 8, 3)] },
        { id: 'galeria', slots: [LS('casa', -4, -10, 8, 7, 'S'), LS('patio', -10, -2, 20, 4), LS('campo', -10, -10, 6, 8), LS('campo', 4, -10, 6, 8), LS('apoio', -10, 3, 6, 6, 'N'), LS('apoio', 4, 3, 6, 6, 'N')] },
        { id: 'canto', slots: [LS('casa', 1, -10, 9, 8, 'S'), LS('apoio', -10, -10, 10, 5, 'S'), LS('patio', -2, -1, 12, 5), LS('campo', -10, -4, 7, 7), LS('campo', -10, 4, 7, 5), LS('campo', 3, 4, 7, 5)] }
      ] },
    P: { half: 8, gate: 2.5, flag: [4, 8.2], decorN: [1, 2], fence: 0, path: false, noflag: true,
      skeletons: [
        { id: 'p-lado', slots: [LS('casa', -8, -8, 8, 7, 'S'), LS('apoio', 1, -8, 7, 6, 'S'), LS('campo', -8, 0, 6, 6), LS('campo', 2, 0, 6, 6)] },
        { id: 'p-centro', slots: [LS('casa', -4, -1, 8, 7, 'S'), LS('apoio', -8, -8, 8, 5, 'S'), LS('apoio', 0, -8, 8, 5, 'S')] },
        { id: 'p-direita', slots: [LS('casa', 0, -8, 8, 7, 'S'), LS('apoio', -8, -8, 7, 6, 'S'), LS('campo', -8, 0, 6, 6), LS('campo', 2, 0, 6, 6)] },
        { id: 'p-patio', slots: [LS('casa', -4, -8, 8, 7, 'S'), LS('campo', -8, 0, 6, 6), LS('campo', 2, 0, 6, 6), LS('patio', -2, 0, 4, 6)] }
      ] }
  },
  fort: {
    M: { half: 14, gate: 2.5, flag: [4, 14.2], decorN: [3, 4], fence: 'wall',
      skeletons: [
        { id: 'patio-central', slots: [LS('casa', -4, -11, 8, 7, 'S'), LS('apoio', -11, -6, 7, 6, 'E'), LS('apoio', 4, -6, 7, 6, 'W'), LS('campo', -11, 1, 7, 9), LS('campo', 4, 1, 7, 9), LS('patio', -4, -3, 8, 13)] },
        { id: 'quartel-fundo', slots: [LS('casa', 1, -11, 10, 7, 'S'), LS('apoio', -11, -11, 9, 7, 'S'), LS('patio', -11, -3, 22, 7), LS('campo', -11, 5, 9, 5), LS('campo', 2, 5, 9, 5)] },
        { id: 'fileira', slots: [LS('casa', -4, -11, 8, 7, 'S'), LS('apoio', -11, -11, 7, 7, 'S'), LS('apoio', 4, -11, 7, 7, 'S'), LS('patio', -11, -3, 22, 5), LS('campo', -11, 3, 8, 7), LS('apoio', 3, 3, 8, 7, 'N')] },
        { id: 'treino-central', slots: [LS('casa', -4, -11, 8, 7, 'S'), LS('apoio', -11, -11, 7, 7, 'S'), LS('apoio', 4, -11, 7, 7, 'S'), LS('campo', -11, -3, 8, 8), LS('campo', 3, -3, 8, 8), LS('patio', -3, -3, 6, 12)] }
      ] },
    P: { half: 12, gate: 2.5, flag: [4, 12.2], decorN: [2, 3], fence: 'wall',
      skeletons: [
        { id: 'p-patio', slots: [LS('casa', -4, -9, 8, 6, 'S'), LS('apoio', -9, -9, 5, 6, 'E'), LS('apoio', 4, -9, 5, 6, 'W'), LS('patio', -4, -2, 8, 10), LS('campo', -9, -2, 5, 10), LS('campo', 4, -2, 5, 10)] },
        { id: 'p-campos', slots: [LS('casa', -4, -9, 8, 6, 'S'), LS('campo', -9, -9, 5, 6), LS('campo', 4, -9, 5, 6), LS('patio', -9, -2, 18, 3), LS('apoio', -9, 2, 7, 6, 'N'), LS('apoio', 2, 2, 7, 6, 'N')] },
        { id: 'p-quartel', slots: [LS('casa', -4, -9, 8, 6, 'S'), LS('patio', -9, -2, 18, 4), LS('apoio', -9, 2, 7, 6, 'N'), LS('apoio', 2, 2, 7, 6, 'N'), LS('apoio', -9, -9, 5, 6, 'E'), LS('apoio', 4, -9, 5, 6, 'W')] },
        { id: 'p-canto', slots: [LS('casa', -9, -9, 8, 6, 'S'), LS('apoio', 0, -9, 9, 6, 'S'), LS('patio', -9, -2, 18, 5), LS('campo', -9, 4, 7, 5), LS('campo', 2, 4, 7, 5)] }
      ] }
  },
  tower: {
    M: { half: 10, gate: 2.5, flag: [4, 10.2], decorN: [2, 3],
      skeletons: [
        { id: 'base', slots: [LS('casa', -4, -10, 8, 8, 'S'), LS('apoio', -10, -10, 6, 6, 'E'), LS('apoio', 4, -10, 6, 6, 'W'), LS('patio', -4, -1, 8, 5), LS('campo', -10, -3, 6, 6), LS('campo', 4, -3, 6, 6)] },
        { id: 'lateral', slots: [LS('casa', -10, -8, 8, 8, 'E'), LS('patio', -2, -8, 6, 10), LS('apoio', 4, -10, 6, 6, 'W'), LS('campo', 4, -3, 6, 6)] },
        { id: 'frente', slots: [LS('casa', -4, -5, 8, 8, 'S'), LS('apoio', -10, -10, 10, 5, 'S'), LS('apoio', 0, -10, 10, 5, 'S'), LS('campo', -10, -4, 6, 7), LS('campo', 4, -4, 6, 7), LS('patio', -4, 4, 8, 4)] },
        { id: 'fundo', slots: [LS('casa', -4, -10, 8, 8, 'S'), LS('patio', -10, -1, 20, 3), LS('apoio', -10, 3, 6, 5, 'N'), LS('apoio', 4, 3, 6, 5, 'N'), LS('campo', -10, -10, 6, 8), LS('campo', 4, -10, 6, 8)] }
      ] },
    P: { half: 7, gate: 2.5, flag: [4, 7.2], decorN: [1, 2],
      skeletons: [
        { id: 'p-torre', slots: [LS('casa', -4, -7, 8, 8, 'S'), LS('patio', -4, 2, 8, 3)] },
        { id: 'p-esquerda', slots: [LS('casa', -7, -7, 8, 8, 'S'), LS('campo', 2, -7, 5, 5), LS('patio', -7, 1, 8, 4)] },
        { id: 'p-direita', slots: [LS('casa', -1, -7, 8, 8, 'S'), LS('campo', -7, -7, 5, 5), LS('patio', -1, 2, 8, 3)] },
        { id: 'p-centro', slots: [LS('casa', -4, -3, 8, 8, 'S'), LS('campo', -7, -7, 5, 4), LS('campo', 2, -7, 5, 4)] }
      ] }
  },
  inn: {
    M: { half: 13, gate: 2.5, flag: [4, 13.2], decorN: [3, 4],
      skeletons: [
        { id: 'casa-ao-fundo', slots: [LS('casa', -6, -13, 12, 8, 'S'), LS('patio', -6, -4, 12, 6), LS('apoio', -13, -13, 7, 8, 'E'), LS('apoio', 6, -13, 7, 8, 'W'), LS('campo', -13, -4, 7, 8), LS('campo', 6, -4, 7, 8), LS('apoio', -13, 5, 10, 7, 'E')] },
        { id: 'casa-no-centro', slots: [LS('casa', -6, -4, 12, 8, 'S'), LS('apoio', -13, -13, 12, 7, 'S'), LS('apoio', 1, -13, 12, 7, 'S'), LS('campo', -13, -5, 7, 9), LS('campo', 6, -5, 7, 9), LS('patio', -6, 5, 12, 5)] },
        { id: 'casa-lateral', slots: [LS('casa', -13, -6, 12, 8, 'E'), LS('patio', -1, -6, 8, 10), LS('apoio', -13, -13, 8, 7, 'S'), LS('apoio', -3, -13, 10, 7, 'S'), LS('campo', 8, -6, 5, 10), LS('campo', -13, 3, 9, 8)] },
        { id: 'estalagem', slots: [LS('casa', -6, -13, 12, 8, 'S'), LS('patio', -6, -4, 12, 5), LS('apoio', -13, -13, 7, 8, 'E'), LS('apoio', 6, -13, 7, 8, 'W'), LS('campo', -13, -4, 7, 8), LS('campo', 6, -4, 7, 8), LS('campo', -13, 5, 10, 6), LS('campo', 3, 5, 10, 6)] }
      ] },
    P: { half: 10, gate: 2.5, flag: [4, 10.2], decorN: [2, 3],
      skeletons: [
        { id: 'p-fundo', slots: [LS('casa', -6, -10, 12, 8, 'S'), LS('patio', -6, -1, 12, 5), LS('campo', -10, -10, 4, 8), LS('campo', 6, -10, 4, 8), LS('campo', -10, -1, 4, 7), LS('campo', 6, -1, 4, 7)] },
        { id: 'p-centro', slots: [LS('casa', -6, -3, 12, 8, 'S'), LS('apoio', -10, -10, 10, 5, 'S'), LS('apoio', 0, -10, 10, 5, 'S'), LS('campo', -10, -4, 4, 8), LS('campo', 6, -4, 4, 8)] },
        { id: 'p-lateral', slots: [LS('casa', -10, -6, 12, 8, 'E'), LS('patio', 2, -6, 6, 10), LS('campo', -10, 3, 8, 5), LS('campo', 3, 5, 6, 4)] },
        { id: 'p-frente', slots: [LS('casa', -6, -10, 12, 8, 'S'), LS('campo', -10, -10, 4, 8), LS('campo', 6, -10, 4, 8), LS('apoio', -10, -1, 8, 6, 'N'), LS('apoio', 2, -1, 8, 6, 'N')] }
      ] }
  },
  lodge: {
    M: { half: 13, gate: 2.5, flag: [4, 13.2], decorN: [3, 4],
      skeletons: [
        { id: 'barracao-fundo', slots: [LS('casa', -6, -13, 12, 8, 'S'), LS('patio', -4, -4, 9, 5), LS('cozinha', -13, -4, 9, 8), LS('apoio', -13, -13, 7, 7, 'E'), LS('apoio', 6, -13, 7, 8, 'W'), LS('campo', 5, -4, 8, 8)] },
        { id: 'barracao-centro', slots: [LS('casa', -6, -4, 11, 8, 'S'), LS('cozinha', 5, -4, 8, 8), LS('campo', -13, -5, 7, 9), LS('apoio', -13, -13, 12, 7, 'S'), LS('apoio', 1, -13, 12, 7, 'S'), LS('patio', -6, 5, 12, 5)] },
        { id: 'barracao-lateral', slots: [LS('casa', -13, -6, 11, 8, 'E'), LS('patio', -2, -6, 7, 10), LS('cozinha', 5, -5, 8, 8), LS('apoio', -13, -13, 8, 6, 'S'), LS('apoio', -3, -13, 10, 6, 'S'), LS('campo', -13, 3, 9, 8), LS('campo', 6, 5, 7, 6)] },
        { id: 'cozinha-ao-lado', slots: [LS('casa', -6, -13, 11, 8, 'S'), LS('cozinha', 5, -13, 8, 8), LS('apoio', -13, -13, 7, 8, 'E'), LS('patio', -6, -4, 12, 6), LS('campo', -13, -4, 7, 8), LS('campo', 6, -4, 7, 8), LS('campo', -13, 5, 10, 6), LS('campo', 3, 5, 10, 6)] }
      ] },
    P: { half: 11, gate: 2.5, flag: [4, 11.2], decorN: [2, 3],
      skeletons: [
        { id: 'p-barracao', slots: [LS('casa', -6, -11, 11, 8, 'S'), LS('patio', -6, -2, 9, 7), LS('cozinha', 3, -2, 8, 7), LS('apoio', -11, -11, 5, 6, 'E'), LS('apoio', 5, -11, 6, 6, 'W'), LS('campo', -11, -2, 5, 7)] },
        { id: 'p-cozinha-fundo', slots: [LS('casa', -11, -11, 11, 8, 'S'), LS('cozinha', 3, -8, 8, 7), LS('patio', -11, -2, 14, 8), LS('apoio', 3, 0, 6, 5, 'W'), LS('campo', -11, 6, 8, 4)] },
        { id: 'p-cozinha-esquerda', slots: [LS('casa', -5, -11, 11, 8, 'S'), LS('cozinha', -11, -3, 8, 7), LS('apoio', -11, -11, 6, 6, 'E'), LS('apoio', 6, -11, 5, 6, 'W'), LS('patio', -3, -2, 7, 8), LS('apoio', 4, -2, 7, 7, 'W'), LS('campo', -11, 5, 8, 5)] },
        { id: 'p-tendas', slots: [LS('casa', -6, -11, 11, 8, 'S'), LS('cozinha', -11, -2, 8, 7), LS('patio', -3, -2, 10, 7), LS('campo', 7, -2, 4, 7), LS('apoio', -11, -11, 5, 6, 'E'), LS('apoio', 5, -11, 6, 6, 'W'), LS('campo', -11, 6, 6, 4), LS('campo', 5, 6, 6, 4)] }
      ] }
  },
  post: {
    M: { half: 15, gate: 2.5, flag: [4, 15.2], decorN: [3, 4],
      skeletons: [
        { id: 'mercado-fundo', slots: [LS('casa', -9, -15, 18, 10, 'S'), LS('patio', -6, -4, 12, 5), LS('apoio', -15, -15, 6, 10, 'E'), LS('apoio', 9, -15, 6, 10, 'W'), LS('campo', -15, -3, 9, 8), LS('campo', 6, -3, 9, 8), LS('apoio', -15, 6, 9, 6, 'N'), LS('apoio', 6, 6, 9, 6, 'N')] },
        { id: 'mercado-centro', slots: [LS('casa', -9, -5, 18, 10, 'S'), LS('patio', -9, 6, 18, 5), LS('apoio', -15, -15, 10, 8, 'S'), LS('apoio', -5, -15, 10, 8, 'S'), LS('apoio', 5, -15, 10, 8, 'S'), LS('campo', -15, -6, 6, 10), LS('campo', 9, -6, 6, 10)] },
        { id: 'praca-larga', slots: [LS('casa', -9, -15, 18, 10, 'S'), LS('patio', -15, -4, 30, 6), LS('apoio', -15, -15, 6, 10, 'E'), LS('apoio', 9, -15, 6, 10, 'W'), LS('campo', -15, 3, 10, 8), LS('campo', 5, 3, 10, 8)] },
        { id: 'feira', slots: [LS('casa', -9, -15, 18, 10, 'S'), LS('campo', -15, -4, 7, 10), LS('campo', 8, -4, 7, 10), LS('patio', -8, -4, 16, 8), LS('apoio', -15, -15, 6, 10, 'E'), LS('apoio', 9, -15, 6, 10, 'W'), LS('campo', -15, 7, 10, 7), LS('campo', 5, 7, 10, 7)] }
      ] },
    P: { half: 11, gate: 2.5, flag: [4, 11.2], decorN: [2, 3],
      skeletons: [
        { id: 'p-fundo', slots: [LS('casa', -6, -11, 12, 7, 'S'), LS('patio', -6, -3, 12, 4), LS('apoio', -11, -11, 5, 7, 'E'), LS('apoio', 6, -11, 5, 7, 'W'), LS('campo', -11, -3, 5, 7), LS('campo', 6, -3, 5, 7), LS('apoio', -11, 5, 8, 5, 'N'), LS('apoio', 3, 5, 8, 5, 'N')] },
        { id: 'p-centro', slots: [LS('casa', -6, -3, 12, 7, 'S'), LS('apoio', -11, -11, 11, 6, 'S'), LS('apoio', 0, -11, 11, 6, 'S'), LS('campo', -11, -4, 5, 7), LS('campo', 6, -4, 5, 7), LS('patio', -6, 5, 12, 4)] },
        { id: 'p-largo', slots: [LS('casa', -11, -11, 12, 7, 'S'), LS('apoio', 2, -11, 9, 7, 'S'), LS('patio', -11, -3, 22, 5), LS('apoio', -11, 3, 8, 6, 'N'), LS('apoio', 3, 3, 8, 6, 'N')] },
        { id: 'p-feira', slots: [LS('casa', -6, -11, 12, 7, 'S'), LS('patio', -11, -3, 22, 4), LS('apoio', -11, 2, 9, 6, 'N'), LS('apoio', 2, 2, 9, 6, 'N'), LS('campo', -11, -11, 5, 7), LS('campo', 6, -11, 5, 7)] }
      ] }
  },
  plantation: {
    M: { half: 17, gate: 2.5, flag: [4, 17.2], decorN: [3, 4],
      skeletons: [
        { id: 'faixas', slots: [LS('casa', -5, -17, 10, 8, 'S'), LS('patio', -5, -8, 10, 20), LS('campo', -17, -17, 12, 10), LS('campo', 5, -17, 12, 10), LS('apoio', -17, -6, 12, 8, 'E'), LS('apoio', 5, -6, 12, 8, 'W'), LS('campo', -17, 3, 12, 13), LS('campo', 5, 3, 12, 13)] },
        { id: 'campo-grande', slots: [LS('casa', -5, -3, 10, 8, 'S'), LS('campo', -17, -17, 34, 8), LS('apoio', -17, -8, 12, 10, 'E'), LS('apoio', 5, -8, 12, 10, 'W'), LS('patio', -5, -8, 10, 5), LS('campo', -17, 3, 12, 13), LS('campo', 5, 3, 12, 13), LS('patio', -5, 6, 10, 6)] },
        { id: 'em-fileiras', slots: [LS('casa', -17, -17, 10, 8, 'S'), LS('patio', -17, -8, 34, 5), LS('apoio', -6, -17, 10, 8, 'S'), LS('apoio', 6, -17, 11, 8, 'S'), LS('campo', -17, -2, 12, 9), LS('campo', 5, -2, 12, 9), LS('campo', -17, 8, 12, 8), LS('campo', 5, 8, 12, 8)] },
        { id: 'quadras', slots: [LS('casa', -5, -17, 10, 8, 'S'), LS('patio', -5, -8, 10, 6), LS('campo', -17, -17, 12, 9), LS('campo', 5, -17, 12, 9), LS('apoio', -17, -7, 10, 9, 'E'), LS('apoio', 7, -7, 10, 9, 'W'), LS('campo', -17, 3, 13, 13), LS('campo', 4, 3, 13, 13), LS('patio', -4, -1, 8, 5)] }
      ] },
    P: { half: 11, gate: 2.5, flag: [4, 11.2], decorN: [2, 3],
      skeletons: [
        { id: 'p-faixas', slots: [LS('casa', -5, -11, 10, 8, 'S'), LS('patio', -5, -2, 10, 8), LS('campo', -11, -11, 6, 8), LS('campo', 5, -11, 6, 8), LS('campo', -11, -2, 6, 12), LS('campo', 5, -2, 6, 12)] },
        { id: 'p-grande', slots: [LS('casa', -5, -3, 10, 8, 'S'), LS('campo', -11, -11, 22, 7), LS('campo', -11, -3, 6, 12), LS('campo', 5, -3, 6, 12), LS('patio', -5, 6, 10, 3)] },
        { id: 'p-fileira', slots: [LS('casa', -11, -11, 10, 8, 'S'), LS('apoio', 0, -11, 11, 7, 'S'), LS('patio', -11, -2, 22, 4), LS('campo', -11, 3, 10, 6), LS('campo', 3, 3, 8, 6)] },
        { id: 'p-apoios', slots: [LS('casa', -5, -11, 10, 8, 'S'), LS('apoio', -11, -11, 6, 8, 'E'), LS('apoio', 5, -11, 6, 8, 'W'), LS('patio', -5, -2, 10, 6), LS('campo', -11, -2, 6, 12), LS('campo', 5, -2, 6, 12)] }
      ] }
  },
  fishery: {
    M: { half: 13, gate: 2.5, flag: [4, 13.2], decorN: [3, 4],
      skeletons: [
        { id: 'cais-esquerdo', slots: [LS('casa', -4, -13, 8, 7, 'S'), LS('patio', -3, -5, 7, 5), LS('agua', -13, -4, 10, 10), LS('apoio', -13, -13, 9, 7, 'E'), LS('apoio', 4, -13, 9, 7, 'W'), LS('campo', 5, -4, 8, 9), LS('apoio', 5, 6, 8, 6, 'N')] },
        { id: 'lago-ao-fundo', slots: [LS('casa', -4, -4, 8, 7, 'S'), LS('agua', -13, -13, 13, 8), LS('apoio', 1, -13, 12, 8, 'S'), LS('campo', -13, -4, 9, 9), LS('campo', 4, -4, 9, 9), LS('patio', -4, 4, 8, 5)] },
        { id: 'lago-lateral', slots: [LS('casa', -13, -6, 8, 7, 'E'), LS('patio', -5, -6, 6, 12), LS('agua', 1, -13, 12, 10), LS('apoio', -13, -13, 12, 6, 'S'), LS('campo', 2, -2, 11, 8), LS('apoio', -13, 2, 8, 6, 'N')] },
        { id: 'cais-direito', slots: [LS('casa', -4, -13, 8, 7, 'S'), LS('patio', -4, -5, 7, 6), LS('apoio', -13, -13, 9, 7, 'E'), LS('apoio', 4, -13, 9, 7, 'W'), LS('campo', -13, -5, 9, 8), LS('agua', 3, -4, 10, 9), LS('campo', -13, 4, 9, 8)] }
      ] },
    P: { half: 11, gate: 2.5, flag: [4, 11.2], decorN: [2, 3],
      skeletons: [
        { id: 'p-cais', slots: [LS('casa', -4, -11, 8, 7, 'S'), LS('patio', 0, -3, 6, 8), LS('agua', -11, -3, 11, 8), LS('apoio', 5, -11, 6, 6, 'S')] },
        { id: 'p-fundo', slots: [LS('casa', -11, -11, 8, 7, 'S'), LS('apoio', -2, -11, 9, 6, 'S'), LS('agua', -11, -3, 10, 8), LS('campo', 2, -3, 8, 8)] },
        { id: 'p-lago-norte', slots: [LS('casa', 3, -11, 8, 7, 'S'), LS('agua', -11, -11, 11, 8), LS('apoio', -11, -2, 9, 6, 'E'), LS('patio', 0, -2, 5, 8)] },
        { id: 'p-direita', slots: [LS('casa', -4, -11, 8, 7, 'S'), LS('agua', 1, -3, 10, 8), LS('apoio', -11, -3, 8, 6, 'E'), LS('patio', -3, -3, 4, 8)] }
      ] }
  },
  workers: {
    M: { half: 22, gate: 2.5, flag: [4, 22.2], decorN: [4, 6],
      skeletons: [
        { id: 'rua-central', slots: [LS('casa', -6, -22, 12, 8, 'S'), LS('patio', -6, -13, 12, 26), LS('apoio', -14, -12, 8, 6, 'E'), LS('apoio', -14, -4, 8, 6, 'E'), LS('apoio', -14, 4, 8, 6, 'E'), LS('apoio', 6, -12, 8, 6, 'W'), LS('apoio', 6, -4, 8, 6, 'W'),
          LS('apoio', 6, 4, 8, 6, 'W'), LS('campo', -22, -12, 8, 20), LS('campo', 14, -12, 8, 20), LS('apoio', -14, 12, 8, 8, 'E'), LS('apoio', 6, 12, 8, 8, 'W')] },
        { id: 'praca', slots: [LS('casa', -5, -20, 10, 8, 'S'), LS('patio', -8, -11, 16, 18), LS('apoio', -16, -11, 8, 6, 'E'), LS('apoio', -16, -3, 8, 6, 'E'), LS('apoio', -16, 5, 8, 6, 'E'), LS('apoio', 8, -11, 8, 6, 'W'),
          LS('apoio', 8, -3, 8, 6, 'W'), LS('apoio', 8, 5, 8, 6, 'W'), LS('campo', -22, 12, 16, 9), LS('campo', 6, 12, 16, 9)] },
        { id: 'duas-ruas', slots: [LS('casa', -5, -22, 10, 8, 'S'), LS('patio', -22, -13, 44, 6), LS('apoio', -22, -6, 8, 6, 'N'), LS('apoio', -13, -6, 8, 6, 'N'), LS('apoio', 5, -6, 8, 6, 'N'), LS('apoio', 14, -6, 8, 6, 'N'), LS('patio', -4, -6, 8, 16),
          LS('apoio', -22, 3, 8, 6, 'S'), LS('apoio', -13, 3, 8, 6, 'S'), LS('apoio', 5, 3, 8, 6, 'S'), LS('apoio', 14, 3, 8, 6, 'S'), LS('patio', -22, 10, 44, 4), LS('campo', -22, 15, 12, 6), LS('campo', 10, 15, 12, 6)] },
        { id: 'em-l', slots: [LS('casa', -16, -22, 11, 8, 'S'), LS('apoio', -3, -22, 9, 8, 'S'), LS('apoio', 8, -22, 8, 8, 'S'), LS('patio', -22, -13, 44, 5), LS('apoio', -22, -7, 8, 6, 'N'), LS('apoio', -13, -7, 8, 6, 'N'), LS('patio', -4, -7, 8, 20),
          LS('apoio', 5, -7, 8, 6, 'N'), LS('apoio', 14, -7, 8, 6, 'N'), LS('campo', -22, 0, 17, 12), LS('campo', 5, 0, 17, 12), LS('campo', -22, 13, 12, 8), LS('campo', 10, 13, 12, 8)] }
      ] },
    P: { half: 15, gate: 2.5, flag: [4, 15.2], decorN: [3, 4],
      skeletons: [
        { id: 'p-rua', slots: [LS('casa', -5, -15, 10, 8, 'S'), LS('patio', -5, -6, 10, 14), LS('apoio', -13, -6, 8, 6, 'E'), LS('apoio', -13, 1, 8, 6, 'E'), LS('apoio', 5, -6, 8, 6, 'W'), LS('apoio', 5, 1, 8, 6, 'W'),
          LS('campo', -15, -15, 10, 8), LS('campo', 5, -15, 10, 8), LS('campo', -13, 8, 10, 6), LS('campo', 3, 8, 10, 6)] },
        { id: 'p-praca', slots: [LS('casa', -5, -15, 10, 8, 'S'), LS('patio', -6, -6, 12, 12), LS('apoio', -14, -6, 8, 6, 'E'), LS('apoio', 6, -6, 8, 6, 'W'), LS('apoio', -14, 1, 8, 6, 'E'), LS('apoio', 6, 1, 8, 6, 'W'), LS('campo', -14, 8, 11, 6), LS('campo', 3, 8, 11, 6)] },
        { id: 'p-fileiras', slots: [LS('casa', -5, -15, 10, 8, 'S'), LS('patio', -15, -6, 30, 4), LS('patio', -3, -1, 6, 14), LS('apoio', -12, -1, 9, 6, 'N'), LS('apoio', 3, -1, 9, 6, 'N'), LS('apoio', -12, 6, 9, 6, 'S'), LS('apoio', 3, 6, 9, 6, 'S'), LS('campo', -15, -15, 10, 8), LS('campo', 5, -15, 10, 8)] },
        { id: 'p-u', slots: [LS('casa', -5, -15, 10, 8, 'S'), LS('apoio', -15, -15, 10, 7, 'S'), LS('apoio', 5, -15, 10, 7, 'S'), LS('patio', -15, -7, 30, 5), LS('campo', -15, -1, 12, 12), LS('campo', 3, -1, 12, 12), LS('patio', -3, -1, 6, 12)] }
      ] }
  }
};
Object.assign(LEGO_RECIPES, LEGO_RECIPES_L35);

// Que peça entra em cada tipo de vaga (peso; só as que cabem, ver LEGO_MIN). 'nada' deixa o terreno livre. A peça-âncora de cada tipo (vaga casa) é sempre a mesma.
Object.assign(LEGO_PICK, {
  hunters: { casa: { fogueira: 1 }, apoio: { tenda: 5, varal: 3, trofeu: 2, toras: 1.5, nada: 0.4 }, campo: { armadilha: 3, tenda: 2, toras: 2, varal: 2, bosque: 2 } },
  sanctuary: { casa: { capela: 1 }, apoio: { campanario: 4, cela: 3, nada: 0.5 }, campo: { canteiros: 4, tumulos: 2, bosque: 2, horta: 1 } },
  ruins: { casa: { altar_ruina: 1 }, apoio: { muro_roto: 4, arco: 3, columnas: 3, entulho: 3, nada: 0.5 }, campo: { mato: 4, entulho: 3, columnas: 2, muro_roto: 2 } },
  fort: { casa: { menagem: 1 }, apoio: { quartel: 4, estabulo: 3, tenda: 2, nada: 0.4 }, campo: { treino: 4, tenda: 2, deposito: 2 } },
  tower: { casa: { torre_vigia: 1 }, apoio: { deposito: 3, oficina: 2, nada: 1 }, campo: { bosque: 3, tenda: 1 } },
  inn: { casa: { posada: 1 }, apoio: { estabulo: 3, deposito: 2, tema: 3, bosque: 1.5, nada: 0.5 }, campo: { bosque: 3, horta: 1, tema: 2 } },
  lodge: { casa: { barracao: 1 }, apoio: { tenda: 5, toras: 2, nada: 0.4 }, campo: { tenda: 2, bosque: 2 }, cozinha: { cozinha: 1 } },
  post: { casa: { mercado: 1 }, apoio: { banca: 4, carrocas: 3, cavalos: 2, pilha: 3, nada: 0.4 }, campo: { carrocas: 2, pilha: 2, bosque: 2 } },
  plantation: { casa: { casa: 1 }, apoio: { celeiro: 4, silos: 3, deposito: 2, galinheiro: 1, nada: 0.5 }, campo: { trigo: 4, milho: 4, horta: 2, pomar: 1.5 } },
  fishery: { casa: { cabana: 1 }, apoio: { redes: 3, barcos: 3, secagem: 3, deposito: 2, nada: 0.4 }, campo: { redes: 2, barcos: 2, bosque: 1.5, horta: 1 }, agua: { lago: 1 } },
  workers: { casa: { casa: 1 }, apoio: { choupana: 6, celeiro: 2, silos: 1, galinheiro: 2, nada: 0.3 }, campo: { horta: 4, trigo: 2, milho: 2, curral: 1.5, bosque: 1 } }
});

// Tamanho mínimo (w, d) das peças novas.
Object.assign(LEGO_MIN, {
  fogueira: [8, 8], tenda: [4, 4], varal: [6, 3], trofeu: [4, 4], armadilha: [5, 5], bosque: [4, 4],
  capela: [9, 9], campanario: [5, 5], cela: [6, 5], canteiros: [5, 4], tumulos: [6, 5],
  altar_ruina: [8, 7], muro_roto: [6, 3], arco: [6, 3], columnas: [5, 5], mato: [4, 4],
  menagem: [8, 6], quartel: [6, 5], estabulo: [7, 5], treino: [6, 5], torre_vigia: [8, 8],
  posada: [12, 8], tema: [10, 7], barracao: [9, 7], cozinha: [8, 7], mercado: [12, 7], banca: [6, 5], carrocas: [6, 5], cavalos: [6, 3], pilha: [4, 4],
  cabana: [7, 6], lago: [10, 8], redes: [6, 3], barcos: [7, 4], secagem: [6, 3], choupana: [6, 5]
});

// Enfeites do pátio por tipo (peso). Novos tipos de enfeite (legoYard): braseiro e pedra.
Object.assign(LEGO_DECOR, {
  hunters: { lampiao: 2, banco: 2, barril: 1, caixa: 1, toco: 2, tora: 2 },
  sanctuary: { poco: 3, banco: 3, lampiao: 2, braseiro: 3 },
  ruins: { toco: 3, tora: 2, pedra: 4 },
  fort: { poco: 3, rack: 2, banco: 1, lampiao: 2, barril: 2, caixa: 2 },
  tower: { lampiao: 3, banco: 2, barril: 1, caixa: 1 },
  inn: { poco: 2, lampiao: 3, banco: 2, barril: 1, carroca: 1 },
  lodge: { lampiao: 2, banco: 2, toco: 2, barril: 2, caixa: 1, tora: 2 },
  post: { lampiao: 3, banco: 2, poco: 2, barril: 2, caixa: 2, feno: 1 },
  plantation: { poco: 3, carroca: 3, feno: 3, lampiao: 1, banco: 1 },
  fishery: { barril: 3, caixa: 2, lampiao: 2, banco: 1, toco: 1, carroca: 1 },
  workers: { poco: 4, carroca: 2, feno: 2, lampiao: 2, barril: 1, banco: 2 }
});

// Cores novas: pedra de capela e de muralha, couros e peixes (varais), madeira de barco, cobertas de beliche.
Object.assign(LEGO_PAL, {
  stone: [0xd8d0c0, 0xcfc7b6, 0xe0d8c8], wallStone: [0x8a8a90, 0x7a7a82, 0x9a9aa0], hides: [0xe0b888, 0xd0a070, 0xc89860, 0x8a6a4a, 0xb8b0a0], tents: [0x8a6a3a, 0xa08a5a, 0x6a7a4a, 0x8a7a4a, 0x9a8a5a],
  fish: [0xb8c0c8, 0xc8d0d8, 0xa8b0b8], boat: [0x7a5632, 0x8a4a2a, 0x5a6a7a, 0x3a5a7a], blankets: [0x8a3a3a, 0x3a5a8a, 0x5a7a3a], flowers: [0xe05a8a, 0xf0d84a, 0xf2f2f2, 0x9a6ae0],
  goods: [0xc8a060, 0xa03a3a, 0x5a8a4a, 0xd8d0b0, 0x6a7a9a, 0x8a6a3a], fruit: [0xc83a2a, 0xe08a2a, 0xe0c030, 0x5ab03a]
});
