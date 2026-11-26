'use strict';
// ---------- Modificadores: batalhão no estado (passo 9 de docs/features/12_batalha-no-tile.md; camada macro, js/macro/battalion.js) ----------
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo.

const BAT = {
  // Teto de soldados de um batalhão (4B-4): nunca é ultrapassado; ganhos além dele se perdem. Padrão: 50
  max: 50,
  // Quantos dos soldados são "de elite" (entram em qualquer luta; o resto são comuns, só na batalha grande). Padrão: 5
  elite: 5,
  // Máximo de batalhões do jogador por nível da facção (índice 0 = nível 1; o último vale para os níveis acima). Padrão: 1, 2 e 3
  countByLevel: [1, 2, 3],
  // Tipos de soldado aceitos (os de ALLY_KINDS em allies.js). Padrão: soldier, heavy, sniper e gunner
  kinds: ['soldier', 'heavy', 'sniper', 'gunner']
};
// Regra: quantos batalhões o jogador pode ter com a facção no nível `lvl`.
const batCountMax = lvl => BAT.countByLevel[Math.max(0, Math.min(BAT.countByLevel.length - 1, (lvl || 1) - 1))];
