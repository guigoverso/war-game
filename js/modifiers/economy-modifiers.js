'use strict';
// ---------- Modificadores: economia (ainda vazio: os números antigos seguem em ECON, econ.js) ----------
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo.
// Este arquivo carrega cedo: funções daqui só podem usar globais de outros arquivos DENTRO do corpo (na hora da chamada).

// Coloque aqui os modificadores NOVOS de economia (preços, produção, imposto, suprimento).

// ---------- Pistola: inquebrável e com munição comprável em dívida (etapa 1C do plano em docs/features/6_plano-mapa-mundi.md) ----------
// Ouro mais baixo que a compra de munição da PISTOLA pode deixar (dívida máxima). Só a pistola ignora o bloqueio por dívida. Padrão: -9999
const PISTOL_DEBT_FLOOR = -9999;
// Regra: a arma i nunca perde durabilidade nem quebra? Só a pistola (a arma de partida). Padrão: só a pistola
function weaponUnbreakable(i) { return WEAPONS[i] && WEAPONS[i].id === 'pistol'; }
// Regra: dá para comprar a munição da arma i por 'cost' de ouro mesmo sem saldo/em dívida? Só a pistola, até PISTOL_DEBT_FLOOR
function pistolDebtOk(i, cost) { return weaponUnbreakable(i) && P.coins - cost >= PISTOL_DEBT_FLOOR; }

// ---------- Tiles: produção e imposto por rodada (etapa 4F; feature 8, rodadas 2, 6 e 9) ----------
// Produção de um tile de recurso do jogador por rodada = base + perLvl × nível do líder, vezes mul (mesma conta dos POIs de hoje, POIX.prod: o tile a SUBSTITUI
// quando a etapa 8 ligar). res = o que cada tema produz (animais produz comida por ora; carne e couro ficam para a etapa 8). Só tema com res produz. Padrão: base 1, perLvl 1, mul 1
const TILE_PROD = { base: 1, perLvl: 1, mul: 1, res: { fazenda: 'food', mina: 'ore', serraria: 'wood', animais: 'food' } };
// Imposto do tile de VILA por rodada = base + perRank × rank (rank igual para todas as vilas: vila não tem rank). Só o tile de vila gera imposto (cidade segue em ECON.taxBase/taxRank). Padrão: 12 + 5 × 2 = 22
const TILE_TAX = { base: 12, perRank: 5, rank: 2 };
// Regra: o tema gera imposto? Só a vila.
function tileTaxes(tema) { return tema === 'vila' }
