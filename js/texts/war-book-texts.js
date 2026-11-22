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

// ---- Operações de guerra (warops.js) ----
// Motivos pelos quais um ataque não pode ser lançado (aparecem no botão desativado da aba Guerra e no toast de recusa).
const TXT_WAR_OP_WHY = {
  notLeader: 'Operações só se lançam no turno do Líder.',
  noWar: 'Você não está em guerra.',
  noFront: 'Não há frente montada para esta guerra.',
  notOnLine: 'Este POI não está na trilha da guerra.',
  mine: 'Este POI já é seu.',
  notEnemy: 'Só se ataca POI do inimigo ou de bandidos.',
  notReleased: 'O alvo só pode ser atacado com o POI mais perto da sua cidade e o mais perto do alvo já seus.',
  repeated: 'Já há uma operação contra este alvo.',
  maxAttacks: n => 'Teto de ' + n + ' ataques por rodada.',
  notAdjacent: 'Não é adjacente: ataque a partir de um POI seu ou do alvo de outra operação.',
  noPoints: c => 'Faltam pontos de líder (custa ' + c + ').'
};
// Nomes dos estados de uma operação (aba Guerra, Operações lançadas).
const TXT_WAR_OP_STATE = { aguarda: 'aguardando', ativa: 'ativa', ok: 'cumprida', falha: 'falhou' };
// Botão descritivo de uma operação lançada: ex. "Ataque à Fazenda contra Bandidos". poi = nome do POI, en = dono atual.
const txtWarOpLabel = (type, poi, en) => (type === 'attack' ? 'Ataque a ' : 'Operação em ') + poi + ' contra ' + en;
// Toasts de operação lançada e cancelada (poi = nome do POI).
const txtWarOpPlanned = (poi, wait) => '⚔ Ataque a ' + poi + ' lançado' + (wait ? ' (aguarda o ataque anterior).' : '.');
const txtWarOpCancelled = poi => '↩ Ataque a ' + poi + ' cancelado: o ponto de líder voltou.';
// Toast quando um POI da trilha limpo de bandidos é anexado na hora (sem o cartão "Terras livres").
const txtWarAutoAnnex = poi => '🏴 ' + poi + ' limpo e anexado ao seu domínio (POI da trilha da guerra).';
