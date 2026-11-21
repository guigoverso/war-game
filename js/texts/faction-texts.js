'use strict';
// ---------- Textos: evolução da facção ----------
// Cada texto tem um comentário acima: onde aparece e para que serve. Só o texto muda aqui; a lógica apenas o chama.

// ------ Evolução da facção ------
// Livro, aba Facção (página inicial das decisões): bloco da esquerda com nome e nível da facção do jogador.
const txtFacHead=f=>'<h3>'+f.name+'</h3><p>Nível da facção: <b>'+facLvl()+'</b> / '+LVL.facMax+'</p><p>Ações do líder por rodada: <b>'+maxActions()
  +'</b></p><p>Cidades: <b>'+cityMine().length+'</b> (no nível máximo: <b>'+citiesAtMax()+'</b>)<br>POIs: <b>'+poiMine().length
  +'</b></p><p class="ldsm">Cada nível da facção dá +1 ação do líder por rodada, a partir da próxima rodada. '
  +'Subir pede ouro, recursos e, nos níveis mais altos, POIs e cidades.</p>';
// Livro, aba Facção: linha do checklist de um requisito (POIs, cidades). r = item de facReqState (modifiers/).
const txtFacReqLine=r=>'<li>'+(r.ok?'✔':'✘')+' '+r.txt+': tem '+r.have+' de '+r.need+'</li>';
// Toast ao clicar em evoluir a facção.
const txtFacUpToast=n=>'🚩 Sua facção evoluiu! Nível '+n+'';
// Relatório da rodada (rdNow): facção evoluída pelo jogador.
const txtFacUpReport=n=>'🚩 Sua facção chegou ao nível '+n+'.';
