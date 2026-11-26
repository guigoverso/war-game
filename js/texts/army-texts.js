'use strict';
// ---------- Textos: exército e recrutamento (feature 12, passo 11) ----------
// Cada texto tem um comentário acima: onde aparece e para que serve. Só o texto muda aqui; a lógica apenas o chama.

// Linha de cima do Quartel (allies.js, renderBarracks): moedas e soldados vivos.
const txtBarracksInfo = (coins, n, max) => '◉ ' + coins + ' moedas  •  Soldados: ' + n + '/' + max;
// Descrição da caixa "Recrutar soldado" do Quartel e da tela do edifício de alistamento da vila: teto do exército e o que sobra do limite da rodada.
const txtRecruitDesc = (max, left, cap) => 'Máx. ' + max + ' vivos. Munição infinita. Nesta rodada ainda dá para recrutar aqui: ' + left + ' de ' + cap + '.';
// Rótulo do botão de recrutar: cheio, limite da rodada esgotado ou com o preço.
const txtRecruitBtn = (cost, full, left) => full ? 'Exército completo' : left <= 0 ? 'Limite da rodada' : 'Recrutar ◉' + cost;
// Título da tela do edifício de alistamento da vila (poigame.js, svcRecruit).
const TXT_RECRUIT_TITLE = '⚔ ALISTAMENTO';
// Fala do sargento na tela do alistamento da vila, com os soldados e as moedas do jogador.
const txtRecruitGreeting = (n, max, coins) => '— Quem quer lutar, assina aqui. Soldados: <b>' + n + '/' + max + '</b> • Moedas: <b>◉ ' + coins + '</b>';
// Placa e linha de interação do edifício de alistamento da vila (city.js e game.js).
const TXT_RECRUIT_SIGN = 'ALISTAMENTO';
const TXT_RECRUIT_PROMPT = '[E] Alistamento: recrutar soldados';
// Aviso ao ganhar soldado (refém libertado, mercenários, refugiados) com o exército cheio: o excesso se perde (substitui o texto da reserva).
const TXT_ARMY_FULL_LOST = 'Seu exército está cheio: o excesso não pôde se juntar.';
