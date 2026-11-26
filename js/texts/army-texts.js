'use strict';
// ---------- Textos: exército e recrutamento (feature 12, passo 11) ----------
// Cada texto tem um comentário acima: onde aparece e para que serve. Só o texto muda aqui; a lógica apenas o chama.

// Linha de cima do Quartel (allies.js, renderBarracks): moedas e soldados vivos.
const txtBarracksInfo = (coins, n, max) => '◉ ' + coins + ' moedas  •  Soldados: ' + n + '/' + max;
// Rótulo do botão de recrutar: cheio, limite da rodada esgotado ou com o preço.
const txtRecruitBtn = (cost, full, left) => full ? 'Exército completo' : left <= 0 ? 'Limite da rodada' : 'Recrutar ◉' + cost;
// Título da tela do edifício de alistamento da vila (poigame.js, svcRecruit).
const TXT_RECRUIT_TITLE = '⚔ ALISTAMENTO';
// Fala do sargento na tela do alistamento (svcRecruit): depende de a vila ser sua (gente leal à sua facção), neutra (gente atrás de emprego) ou de não haver mais recrutas.
const txtRecruitGreeting = (kind, fac, left) => left <= 0
  ? (kind === 'neutral' ? '— Hoje não tem mais ninguém, patrão. Os que sabiam segurar um fuzil já foram embora com outros.'
    : '— Por ora, acabou a fila, comandante. Quem queria vestir a farda já vestiu. Quem sabe amanhã apareça mais gente.')
  : kind === 'neutral' ? '— Tem gente aqui sem trabalho e sem pão, patrão. Qualquer soldo serve. Ofereça um contrato e eles marcham.'
    : '— Comandante! Esses aqui são leais a ' + fac + ' e querem servir sob a sua bandeira. Gente de confiança: é só assinar.';
// Linha de quantos recrutas esperam na fila do alistamento (svcRecruit).
const txtRecruitQueue = left => left > 0 ? left + (left === 1 ? ' recruta disponível' : ' recrutas disponíveis') : '';
// Placa e linha de interação do edifício de alistamento da vila (city.js e game.js).
const TXT_RECRUIT_SIGN = 'ALISTAMENTO';
const TXT_RECRUIT_PROMPT = '[E] Alistamento: recrutar soldados';
// Aviso ao ganhar soldado (refém libertado, mercenários, refugiados) com o exército cheio: o excesso se perde (substitui o texto da reserva).
const TXT_ARMY_FULL_LOST = 'Seu exército está cheio: o excesso não pôde se juntar.';
