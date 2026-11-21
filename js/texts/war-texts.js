'use strict';
// ---------- Textos: guerra ----------
// Cada texto tem um comentário acima: onde aparece e para que serve. Só o texto muda aqui; a lógica apenas o chama.
// (Ainda sem telas de guerra: os textos entram conforme as operações, a fadiga e o relatório forem implementados.)

// Livro e relatório da rodada: nome de cada marco de fadiga do jogador (índice = marco, 0 = nenhum).
const TXT_WAR_MARK = ['Tropas dispostas', 'Cansaço leve', 'Cansaço forte', 'Exaustão'];
// Livro (aba da guerra) e relatório: linha da fadiga do jogador. f = fadiga atual.
const txtWarFatigue = f => '⚔ Fadiga de guerra: <b>' + f + '</b> / ' + WAR.fatigue.max + ' (' + TXT_WAR_MARK[warFatigueMark(f)] + ')';
