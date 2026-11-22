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
const TXT_WAR_LEFTOVER_BTN = { end: 'Encerrar mesmo assim', back: 'Voltar', map: '📍 Ver no mapa' };

// ---- Migrados de war-texts.js ----
// Caderno, aba Guerra: aviso sem guerra, e guerra sem frente.
const TXT_WAR_TAB_NONE = '<h3>⚔ Guerra</h3><p>Você não está em guerra.';
const TXT_WAR_TAB_NOFRONT = '<p class="ldsm">Guerra sem frente montada</p>';
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
// Toast de operação lançada (poi = nome do POI); cancelar não avisa.
const txtWarOpPlanned = (poi, wait) => '⚔ Ataque a ' + poi + ' lançado' + (wait ? ' (aguarda o ataque anterior).' : '.');
// Toast quando um POI da trilha limpo de bandidos é anexado na hora (sem o cartão "Terras livres").
const txtWarAutoAnnex = poi => '🏴 ' + poi + ' limpo e anexado ao seu domínio (POI da trilha da guerra).';

// ---- Aba Guerra do livro (warbook.js) ----
// Linha "Alvo: ..." da esquerda. tn = nome do alvo, kind = 'city' ou 'poi'.
const txtWarTarget = (tn, kind) => 'Alvo: <b>' + tn + '</b> (' + (kind === 'poi' ? 'POI' : 'cidade') + ')';
const TXT_WAR_MAP_BTN = 'Ver no mapa';
// Popup do mapa (aba Guerra): título e botão que liga/desliga os nomes dos POIs (on = nomes ligados).
const TXT_WAR_MAP_TITLE = '📍 Mapa da guerra';
const txtWarMapNames = on => '🏷 Nomes dos POIs: ' + (on ? 'ligado' : 'desligado');
const TXT_WAR_FRONT_BTN = '🗺 Ver a frente no mapa';
// Tabela de lados do Resumo (cabeçalhos) e aviso de lado vazio.
const TXT_WAR_SIDES = { mine: 'Seu lado', enemy: 'Lado inimigo', you: '(você)' };
// Log do Resumo: título da rodada e texto quando não há registro.
const txtWarLogRound = r => 'Rodada ' + r;
const TXT_WAR_LOG_EMPTY = '<p class="ldsm">Nada registrado ainda. As operações e os eventos entram aqui ao fim de cada rodada.</p>';
// Operações lançadas: texto sem operação, e nota fora do turno do Líder.
const TXT_WAR_LAUNCHED_EMPTY = '<p class="ldsm">Nenhuma operação lançada nesta rodada.</p>';
const TXT_WAR_OPS_LEADER_ONLY = '<p class="ldsm">🔒 Operações só se lançam no <b>turno do Líder</b> (no escritório).</p>';
// Nomes das operações ainda sem lógica (botões desativados) e o texto do ataque à cidade.
const TXT_WAR_OP_NAMES = { defense: 'Defender um POI', sabotage: 'Sabotar o inimigo', reduceFatigue: 'Reduzir a fadiga' };
const txtWarOpCityName = (cn, cost) => 'Ataque à cidade ' + cn + ' (' + cost + ' pontos)';
// Botão de ataque a POI na lista de disponíveis: poi = nome, en = dono atual, cost = pontos.
const txtWarOpAvail = (poi, en, cost) => 'Ataque a ' + poi + ' contra ' + en + ' (' + cost + ' ponto' + (cost > 1 ? 's' : '') + ')';
// Defesa: ataque inimigo pendente (STATE.war.inc). poi = nome do POI, en = facção atacante.
const txtWarIncLabel = (poi, en) => 'Defender ' + poi + ' contra ' + en;
// Popup de detalhes do ataque (antes de lançar). poi = nome, en = dono, cost = pontos, wait = depende de outro ataque,
// min = soldados mínimos da guarnição.
const txtWarOpDetail = (poi, en, cost, wait, min) => '<p>Atacar <b>' + poi + '</b>, hoje de <b>' + en + '</b>.</p>'
  + '<p>Custo: <b>' + cost + '</b> ponto(s) de líder.</p>'
  + '<p class="ldsm">No turno do Comandante você terá de limpar a guarnição (' + min + ' soldados ou mais) para tomar o POI. '
  + 'O que não for cumprido vira falha e o ponto não volta.</p>'
  + (wait ? '<p class="ldsm">⏳ Este ataque <b>aguarda</b> o anterior: só vale depois que o POI anterior for seu.</p>' : '');
// Popup de resumo de uma operação lançada. state = chave de TXT_WAR_OP_STATE.
const txtWarOpSummary = (label, state, cost, wait) => '<p><b>' + label + '</b></p><p>Estado: <b>' + state + '</b> • custo: ' + cost
  + ' ponto(s).</p>' + (wait ? '<p class="ldsm">Aguarda o ataque anterior.</p>' : '');
const TXT_WAR_POP = { launch: 'Lançar operação', summary: 'Operação', confirm: 'Lançar', cancelOp: 'Cancelar operação', close: 'Fechar',
  back: 'Voltar', map: '📍 Ver no mapa' };
// Territórios: texto de facção sem território na trilha (o título é o nome da facção).
const TXT_WAR_TERR = { none: 'Sem território na trilha.' };
