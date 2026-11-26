'use strict';
// ---------- Modificadores: provocação (tiro de longe acorda a defesa; vale para a batalha no tile e para POIs com bandidos) ----------
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo.
const PROVOKE = {
  // Tempo (s) em que a defesa/o bando fica "provocado" depois de levar um tiro (renova a cada tiro e enquanto algum atirador enxerga o jogador). Padrão: 12
  secs: 12,
  // Enquanto provocados, a coleira (até onde perseguem o jogador a partir do POI/gerador) é multiplicada por isto. Padrão: 3
  leashMul: 3,
  // Quantos atiradores do grupo viram contra-atiradores (revidam de longe) quando o grupo é provocado. Padrão: 2
  counterN: 2,
  // Contra-atirador: alcance multiplicado por isto (soldado 42 vira ~92) e fração do alcance em que ele prefere ficar parado atirando. Padrão: 2.2 e 0.8
  counterRangeMul: 2.2, counterHold: 0.8
};
