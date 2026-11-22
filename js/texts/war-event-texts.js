'use strict';
// ---------- Textos: log narrativo da guerra (feature operações de guerra) ----------
// STATE.war.log guarda {round, id, args, result}; o texto é montado na hora por warEventText, então editar a frase aqui muda
// também as rodadas já registradas. Aparece no Resumo da guerra (aba Guerra do livro).

// Ids dos eventos do log (chave de WAR_EVENT_TEXTS). Só os de operação do jogador, do inimigo e retomada por bandidos têm
// emissor por enquanto; o de aliado fica pronto para o item 17.
const WAR_EV = {
  attackPoi: 'attackPoi',          // operação de ataque do jogador a um POI. args: [jogador, inimigo, POI]
  enemyAttack: 'enemyAttack',      // operação de ataque do inimigo a um POI do jogador. args: [inimigo, jogador, POI]
  banditsRetake: 'banditsRetake',  // bandidos tomaram um POI da trilha. args: [POI, dono anterior]
  allyJoin: 'allyJoin',            // aliado entrou na guerra. args: [aliado, lado]
  allyLeave: 'allyLeave'           // aliado saiu da guerra. args: [aliado, lado]
};
// Frases por evento e resultado (success / failed). a = args do registro.
const WAR_EVENT_TEXTS = {
  attackPoi: {
    success: a => a[0] + ' tomou ' + a[2] + ' de ' + a[1] + '.',
    failed: a => a[0] + ' não conseguiu tomar ' + a[2] + ' de ' + a[1] + '.'
  },
  enemyAttack: {
    success: a => a[0] + ' tomou ' + a[2] + ' de ' + a[1] + '.',
    failed: a => a[0] + ' atacou ' + a[2] + ', mas ' + a[1] + ' resistiu.'
  },
  banditsRetake: {
    success: a => 'Bandidos retomaram ' + a[0] + ', que era de ' + a[1] + '.',
    failed: a => 'Bandidos tentaram retomar ' + a[0] + ', mas ' + a[1] + ' manteve o posto.'
  },
  allyJoin: {
    success: a => a[0] + ' entrou na guerra ao lado de ' + a[1] + '.',
    failed: a => a[0] + ' recusou entrar na guerra.'
  },
  allyLeave: {
    success: a => a[0] + ' saiu da guerra.',
    failed: a => a[0] + ' ameaçou sair da guerra, mas ficou.'
  }
};
// Texto de uma entrada do log ({id, args, result}); '' se o id for desconhecido.
function warEventText(ev) {
  const t = WAR_EVENT_TEXTS[ev.id], f = t && (t[ev.result] || t.success);
  return f ? f(ev.args || []) : '';
}
