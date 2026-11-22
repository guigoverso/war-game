'use strict';
// ---------- Textos: livro, aba Guerra (feature operações de guerra; docs/features/4_operacoes-de-guerra.md) ----------
// Cabeçalhos, botões, abas, rótulos e popups da aba Guerra do livro. O restante do código só chama estes textos.

// Abas de operação do turno do Líder, na ordem. Aparecem em "Operações disponíveis" (aba Guerra, Lançar operações).
const TXT_WAR_OP_TABS = { attack: 'Ataque', defense: 'Defesa', sabotage: 'Sabotagem', other: 'Outros' };
// Botões da esquerda da aba Guerra (Resumo, Operações, Territórios) e títulos das seções da direita.
const TXT_WAR_BTN = { summary: 'Resumo da guerra', ops: 'Lançar operações', terr: 'Territórios' };
const TXT_WAR_SEC = { launched: 'Operações lançadas', available: 'Operações disponíveis', log: 'Registro da guerra' };
// Cabeçalho da esquerda: "Guerra contra [facção alvo]".
const txtWarHead = en => 'Guerra contra ' + en;
// Aviso ao encerrar o turno do Líder com pontos sobrando e nenhuma operação lançada (popup; n = pontos que sobram).
const txtWarLeftoverPopup = n => 'Você ainda tem ' + n + ' ponto(s) de líder e não lançou nenhuma operação. Encerrar mesmo assim?';
const TXT_WAR_LEFTOVER_BTN = { end: 'Encerrar mesmo assim', back: 'Voltar' };

// ---- Migrados de war-texts.js ----
// Caderno, aba Guerra: aviso sem guerra, e guerra sem frente.
const TXT_WAR_TAB_NONE = '<h3>⚔ Guerra</h3><p>Você não está em guerra.';
const TXT_WAR_TAB_NOFRONT = '<p class="ldsm">Guerra sem frente montada</p>';
// Caderno, aba Guerra: ajuda à direita.
const TXT_WAR_TAB_HELP = '<h3>Como funciona a frente</h3><p class="ldsm">A rota liga sua cidade mais próxima ao alvo, passando pela cadeia de POIs. '
  + 'Só se conquista o POI <b>adjacente</b> à sua área (▶). A Conquista de Cidade só libera quando o POI mais perto de cada lado é seu. '
  + 'Os POIs de guerra (acampamentos, trincheiras...) somem quando a guerra acaba.</p>';
// Caderno, aba Guerra (só no cenário de guerra): título dos atalhos de teste.
const TXT_WAR_TAB_SCN = '<h4>🧪 Testes do cenário</h4><p class="ldsm">Atalhos até as operações existirem. Conquistar só aceita o POI adjacente.</p>';
