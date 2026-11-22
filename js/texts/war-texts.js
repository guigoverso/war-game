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
// Declaração de guerra: faixa de confirmação com a previsão da frente. alvo = nome, n = POIs no caminho, w = POIs de guerra novos,
// o = nome da cidade sua de origem, dist = distância em blocos.
const txtWarPreview = (enemy, alvo, o, n, w, dist) => '⚔ <b>' + enemy + '</b> — alvo: <b>' + alvo + '</b>, a partir de <b>' + o
  + '</b> (' + dist + ' blocos). No caminho: <b>' + n + '</b> POIs' + (w ? ' e <b>' + w + '</b> POIs de guerra novos' : '') + '. A linha tracejada é a frente.';
// Declaração de guerra: botões de confirmar e escolher outro alvo.
const TXT_WAR_CONFIRM = '⚔ Confirmar e declarar guerra';
const TXT_WAR_RETRY = '↩ Escolher outro alvo';
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
// Cenário de guerra: título e explicação do painel (aba Facções da pausa).
const TXT_WAR_SCN_TITLE = '🧪 Cenário de guerra';
const TXT_WAR_SCN_HELP = 'Guerra declarada ou não (WAR.scenario.startAtWar); POIs divididos (se o total for ímpar, o inimigo fica com a maioria). As operações ainda não existem: use os atalhos para testar o mapa.';
// Cenário de guerra: linha de resumo do painel. en = facção inimiga, a = POIs seus, b = POIs do inimigo, o = outros.
const txtWarScnSummary = (en, a, b, o) => 'Inimigo: <b>' + en + '</b> • POIs: seus <b>' + a + '</b>, dele <b>' + b + '</b>, outros ' + o;

// Aviso do plano (faixa da previsão, console): não coube POI de guerra perto de uma cidade, então o primeiro/último POI
// conquistável fica longe dela. lado = 'origem' ou 'alvo'; nome = cidade; d = distância em blocos.
const txtWarRingFail = (lado, nome, d) => '⚠ Nenhum terreno livre perto de ' + nome + ' (' + lado + '): o POI conquistável mais próximo fica a ' +
  d + ' blocos da muralha.';
