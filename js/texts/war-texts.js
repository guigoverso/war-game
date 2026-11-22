'use strict';
// ---------- Textos: guerra ----------
// Cada texto tem um comentário acima: onde aparece e para que serve. Só o texto muda aqui; a lógica apenas o chama.
// (Ainda sem telas de guerra: os textos entram conforme as operações, a fadiga e o relatório forem implementados.)

// Livro e relatório da rodada: nome de cada marco de fadiga do jogador (índice = marco, 0 = nenhum).
const TXT_WAR_MARK = ['Tropas dispostas', 'Cansaço leve', 'Cansaço forte', 'Exaustão'];
// Livro (aba da guerra) e relatório: linha da fadiga do jogador. f = fadiga atual.
const txtWarFatigue = f => '⚔ Fadiga de guerra: <b>' + f + '</b> / ' + WAR.fatigue.max + ' (' + TXT_WAR_MARK[warFatigueMark(f)] + ')';

// Balão de fala ao falar (E) com um paciente deitado no Hospital de campanha (um sorteado).
const TXT_WAR_PATIENT_SAY = ['Ugh... foi por pouco.', 'A guerra não acaba nunca?', 'Os médicos dizem que eu fico bem.', 'Minha perna... não consigo levantar.', 'Quando isso acabar, vou para casa.'];

// Declaração de guerra (mapa): faixa em cima do mapa pedindo o alvo. enemy = nome da facção.
const txtWarPickBanner = enemy => '⚔ <b>Guerra contra ' + enemy + '</b> — clique no mapa na <b>cidade</b> (ou em um POI) que quer conquistar. Feche o caderno (M ou E) para cancelar.';
// Declaração de guerra: aviso ao clicar num lugar que não é alvo válido.
const TXT_WAR_PICK_BAD = 'Escolha uma cidade (ou POI permanente) da facção inimiga.';
// Declaração de guerra: aviso quando não há rota por terra até o alvo.
const TXT_WAR_NO_ROUTE = 'Não há caminho por terra até esse alvo (muita água no meio).';
// Declaração de guerra: o alvo é recusado porque uma cidade ou POI de terceiros (fora da guerra) fecha o caminho. tipo = 'city' ou 'poi',
// nome = nome do bloqueio, fac = nome da facção dona.
const txtWarBlocked = (tipo, nome, fac) => 'Alvo recusado: ' + (tipo === 'city' ? 'a cidade ' : 'o POI ') + '<b>' + nome + '</b> (' + fac
  + ') fecha o caminho e a rota não pode passar por quem está fora da guerra. Escolha outro alvo.';
// Declaração de guerra: faixa de confirmação com a previsão da frente. alvo = nome, n = POIs no caminho, w = POIs de guerra novos,
// o = nome da cidade sua de origem, dist = distância em blocos.
const txtWarPreview = (enemy, alvo, o, n, w, dist) => '⚔ <b>' + enemy + '</b> — alvo: <b>' + alvo + '</b>, a partir de <b>' + o
  + '</b> (' + dist + ' blocos). No caminho: <b>' + n + '</b> POIs' + (w ? ' e <b>' + w + '</b> POIs de guerra novos' : '') + '. A linha tracejada é a frente.';
// Declaração de guerra: botões de confirmar e escolher outro alvo.
const TXT_WAR_CONFIRM = '⚔ Confirmar e declarar guerra';
const TXT_WAR_RETRY = '↩ Escolher outro alvo';
// Declaração de guerra: botão que abre a edição manual da rota, e os botões da edição (desfazer, voltar à rota automática,
// concluir; este só liga com todos os POIs obrigatórios marcados).
const TXT_WAR_EDIT = '✏ Editar a rota';
const TXT_WAR_EDIT_UNDO = '↶ Desfazer parada';
const TXT_WAR_EDIT_AUTO = '🤖 Rota automática';
const TXT_WAR_EDIT_DONE = '✔ Concluir a rota';
// Declaração de guerra: faixa da edição da rota. de = nome de onde a rota está agora, n = paradas marcadas, got/total = obrigatórios
// marcados e total, alvo = nome do alvo.
const txtWarEditBanner = (de, n, got, total, alvo) => '✏ <b>Editando a rota</b> — a partir de <b>' + de + '</b> (' + n + ' paradas). '
  + 'Marque os POIs <b style="color:#1a7a2a">verdes</b> (obrigatórios: <b>' + got + '/' + total + '</b>) e, se quiser, outros dourados para conquistar '
  + 'no caminho (<b>?</b> = ainda não descoberto); depois conclua ou clique em ' + alvo + '.';
// Declaração de guerra: nome, na faixa da edição, de um lugar livre de guerra marcado como parada (ainda não é POI).
const TXT_WAR_SPOT_NAME = 'um lugar de guerra';
// Declaração de guerra: tentou concluir a rota sem marcar todos os POIs obrigatórios. n = quantos faltam.
const txtWarEditMissing = n => 'Faltam ' + n + ' POI(s) obrigatório(s) da rota (verdes).';
// Declaração de guerra: o jogador clicou num POI que a edição não aceita como parada.
const TXT_WAR_EDIT_BAD = 'Escolha um dos POIs destacados (verdes ou dourados).';
// Dica do botão Encerrar turno desligado enquanto o alvo da guerra está sendo escolhido no mapa.
const TXT_WAR_END_BLOCKED = 'Escolha o alvo da guerra (ou feche o caderno para cancelar) antes de encerrar o turno';
// Aviso (toast) depois de declarar a guerra com a frente montada. n = POIs de guerra criados.
const txtWarFrontReady = n => '🗺 Frente montada' + (n ? ': ' + n + ' POIs de guerra surgiram no caminho.' : '.');
// Aviso quando a paz desfaz a frente (os POIs de guerra somem).
const TXT_WAR_FRONT_GONE = '🕊 Os acampamentos e trincheiras da frente foram desmontados.';
// Negociação, tela Guerra: texto do botão que abre o mapa para escolher o alvo. f = nome da facção.
const txtWarChooseTarget = f => '🗺 Escolher o alvo no mapa (' + f + ')';

// Cenário ?cenario=guerra: aviso ao abrir. enemy = nome da facção inimiga.
const txtWarScnWelcome = enemy => {
  const pois = WAR.scenario.splitPois ? 'os POIs foram divididos com ' + enemy : 'os POIs ficaram como o mundo os gerou';
  return WAR.scenario.startAtWar
    ? '🧪 Cenário de guerra: você e ' + enemy + ' já estão em guerra e ' + pois + '. Pausa (Tab) → Facções tem o painel de testes.'
    : '🧪 Cenário de guerra: ' + pois + '. Declare a guerra pela tela de Negociações. Pausa (Tab) → Facções tem o painel de testes.';
};
// Cenário de guerra: aviso quando falta POI para o botão (conquistar, perder ou ir até). Aparece como toast.
const TXT_WAR_SCN_NO_POI = 'Nenhum POI disponível para essa ação.';
// Cenário de guerra: aviso do botão "Conquistar POI". n = nome do POI.
const txtWarScnConquered = n => '🏴 ' + n + ' conquistado (atalho de teste).';
// Cenário de guerra: aviso do botão "Perder POI". n = nome do POI, f = nome da facção.
const txtWarScnLost = (n, f) => '🏳 ' + n + ' passou para ' + f + ' (atalho de teste).';
// Caderno, aba Guerra: título da página da frente. en = facção inimiga, tn = nome do alvo, kind = 'city' ou 'poi', org = cidade sua de origem.
const txtWarTabHead = (en, tn, kind, org) => '<h3>⚔ Guerra contra ' + en + '</h3><p>Alvo: <b>' + tn + '</b> (' +
  (kind === 'poi' ? 'POI' : 'cidade') + ') • saindo de <b>' + org + '</b></p>';
// Caderno, aba Guerra: uma linha da cadeia. i = posição (1...), n = nome do POI, o = dono, mine = é seu, next = pode conquistar agora.
const txtWarTabRow = (i, n, o, mine, next) => '<li>' + i + '. ' + (mine ? '✔ ' : next ? '▶ ' : '') + n + ' — ' + o + (next ? ' <b>(próximo)</b>' : '') + '</li>';
// Caderno, aba Guerra: estado da Conquista. kind = 'city' ou 'poi', ok = liberada.
const txtWarTabState = (kind, ok) => '<p>' + (ok ? '✅ ' : '🔒 ') + '<b>' + (kind === 'poi' ? 'Conquista do POI-alvo' : 'Conquista de Cidade') + '</b> ' +
  (ok ? 'liberada.' : 'bloqueada: falta controlar o POI mais perto da sua cidade e o mais perto do alvo.') + '</p>';
// Cenário de guerra: aviso do botão "Conquistar POI" quando o POI mais perto não é adjacente à sua área. n = nome do POI.
const txtWarScnNotAdjacent = n => '⛔ ' + n + ' não é adjacente: conquiste os POIs da frente em ordem, a partir da sua cidade.';
// Cenário de guerra: linha do painel com a cadeia da frente. items = [{n, o (dono), mine, next}] da sua cidade ao alvo; tn = nome do
// alvo; kind = 'city' ou 'poi'; ok = Conquista liberada. ✔ = seu, ▶ = pode conquistar agora.
const txtWarScnChain = (items, tn, kind, ok) => 'Frente: ' + (items.map(i => (i.mine ? '✔ ' : i.next ? '▶ ' : '') + i.n + ' (' + i.o + ')')
  .join(' → ') || 'sem POIs no caminho') + ' → <b>' + tn + '</b><br>' + (ok
  ? '✅ ' + (kind === 'poi' ? 'Conquista do POI-alvo' : 'Conquista de Cidade') + ' liberada'
  : '🔒 ' + (kind === 'poi' ? 'Conquista do POI-alvo' : 'Conquista de Cidade') + ' bloqueada: falta controlar o POI mais perto de cada lado');
// Cenário de guerra: título e explicação do painel (aba Facções da pausa).
const TXT_WAR_SCN_TITLE = '🧪 Cenário de guerra';
const TXT_WAR_SCN_HELP = 'Guerra declarada ou não (WAR.scenario.startAtWar), com a frente montada contra a cidade inimiga mais perto; "Conquistar POI" só aceita o próximo da cadeia. As operações ainda não existem: use os atalhos para testar o mapa.';
// Cenário de guerra: linha de resumo do painel. en = facção inimiga, a = POIs seus, b = POIs do inimigo, o = outros.
const txtWarScnSummary = (en, a, b, o) => 'Inimigo: <b>' + en + '</b> • POIs: seus <b>' + a + '</b>, dele <b>' + b + '</b>, outros ' + o;

// Aviso do plano (faixa da previsão, console): não coube POI de guerra perto de uma cidade, então o primeiro/último POI
// conquistável fica longe dela. lado = 'origem' ou 'alvo'; nome = cidade; d = distância em blocos.
const txtWarRingFail = (lado, nome, d) => '⚠ Nenhum terreno livre perto de ' + nome + ' (' + lado + '): o POI conquistável mais próximo fica a ' +
  d + ' blocos da muralha.';

// Aba Efeitos (buffs): bônus de pontos de líder durante a guerra. n = WAR.leaderPointsBonus.
const txtWarBuffLeader = n => '⚔️ Em guerra: +' + n + ' ponto' + (n > 1 ? 's' : '') + ' de líder enquanto durar o conflito';
