'use strict';
// ---------- Textos do jogo: mensagens, avisos, textos de livro/cartão e funções que montam texto ----------

// ---------- Torre: "Fazer vigia" (poigame.js, poiScan e poiVigil) ----------
// Dica de interação ao chegar na torre sua; usada = já foi feita nesta rodada. Aparece no canto da tela.
const TXT_VIGIL_HINT='[E] Fazer vigia';
// Toast: achou um ponto de interesse (sem dizer o tipo; o "?" aparece no minimapa e no mapa).
const TXT_VIGIL_FOUND='Um novo ponto de interesse foi marcado no mapa.';
// Toast: não há mais nada novo no raio da torre.
const TXT_VIGIL_NOTHING='Não foi encontrado nada fora do normal.';
// Toast: esta torre já fez a vigia na rodada.
const TXT_VIGIL_USED='Esta torre já foi usada nesta rodada.';
// Toast: a vigia só vale no turno do Comandante.
const TXT_VIGIL_WRONG_PHASE='A vigia é feita no turno do comandante.';
// Toast: o jogador chegou perto de um "?" e ele sumiu.
const TXT_VIGIL_ARRIVED='Você chegou ao ponto de interesse.';
