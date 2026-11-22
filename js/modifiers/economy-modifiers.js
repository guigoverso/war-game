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
