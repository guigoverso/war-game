'use strict';
// ---------- Textos: guerra ----------
// Cada texto tem um comentário acima: onde aparece e para que serve. Só o texto muda aqui; a lógica apenas o chama.
// (Ainda sem telas de guerra: os textos entram conforme as operações, a fadiga e o relatório forem implementados.)

// Livro e relatório da rodada: nome de cada marco de fadiga do jogador (índice = marco, 0 = nenhum).
const TXT_WAR_MARK = ['Tropas dispostas', 'Cansaço leve', 'Cansaço forte', 'Exaustão'];
// Livro (aba da guerra) e relatório: linha da fadiga do jogador. f = fadiga atual.
const txtWarFatigue = f => '⚔ Fadiga de guerra: <b>' + f + '</b> / ' + WAR.fatigue.max + ' (' + TXT_WAR_MARK[warFatigueMark(f)] + ')';

// Cenário ?cenario=guerra: aviso ao abrir. enemy = nome da facção inimiga.
const txtWarScnWelcome = enemy => '🧪 Cenário de guerra: você e ' + enemy + ' já estão em guerra e os POIs foram divididos. Pausa (Tab) → Facções tem o painel de testes.';
// Cenário de guerra: aviso quando falta POI para o botão (conquistar, perder ou ir até). Aparece como toast.
const TXT_WAR_SCN_NO_POI = 'Nenhum POI disponível para essa ação.';
// Cenário de guerra: aviso do botão "Conquistar POI". n = nome do POI.
const txtWarScnConquered = n => '🏴 ' + n + ' conquistado (atalho de teste).';
// Cenário de guerra: aviso do botão "Perder POI". n = nome do POI, f = nome da facção.
const txtWarScnLost = (n, f) => '🏳 ' + n + ' passou para ' + f + ' (atalho de teste).';
// Cenário de guerra: título e explicação do painel (aba Facções da pausa).
const TXT_WAR_SCN_TITLE = '🧪 Cenário de guerra';
const TXT_WAR_SCN_HELP = 'Guerra já declarada; POIs divididos (se o total for ímpar, o inimigo fica com a maioria). As operações ainda não existem: use os atalhos para testar o mapa.';
// Cenário de guerra: linha de resumo do painel. en = facção inimiga, a = POIs seus, b = POIs do inimigo, o = outros.
const txtWarScnSummary = (en, a, b, o) => 'Inimigo: <b>' + en + '</b> • POIs: seus <b>' + a + '</b>, dele <b>' + b + '</b>, outros ' + o;
