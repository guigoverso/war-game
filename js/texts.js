'use strict';
// ---------- Textos do jogo: mensagens, avisos, textos de livro/cartão e funções que montam texto ----------

// ------ Entreposto (loja do POI) ------
// Sufixo do botão de material do lojista: quantidade restante nesta rodada.
const txtPostStock=n=>' (restam '+n+')';

// Abas da tela do lojista do entreposto [chave, rótulo] (poigame.js, svcPost).
const POST_TABS=[['food','🍲 Comida'],['ammo','🔫 Munição'],['heal','🩹 Remédios'],['mat','📦 Materiais'],['sell','💰 Venda']];
// Frase do topo da tela do lojista: acréscimo do entreposto (%) e moedas do jogador.
const txtPostIntro=(pct,coins)=>'— Do que precisa? Compro e vendo. Preços '+pct+'% acima na compra. Moedas: <b>◉ '+coins+'</b>';
// Aba Venda: dica quando nenhum item da bolsa está escolhido.
const TXT_POST_SELL_HINT='Clique em um item da mochila. (Armas e curas das barras não aparecem aqui: guarde-as na bolsa para vendê-las.)';
// Aba Venda: item que o entreposto não compra.
const TXT_POST_NO_SELL='Este item não pode ser vendido.';
// Aba Venda: preço pago por unidade e valor base.
const txtPostSellPrice=(price,base)=>'Preço agora: <b>◉'+price+'</b> cada (valor base ◉'+base+')';
// Aba Venda, toast: o comprador ficou sem ouro no meio de uma venda / antes de comprar qualquer unidade.
const TXT_POST_BROKE='o comprador ficou sem ouro';
const TXT_POST_BROKE_FULL='O comprador está sem ouro para este item.';

// ------ Torre de vigia ------
// Dica de interação ao chegar na torre sua; usada = já foi feita nesta rodada. Aparece no canto da tela.
const TXT_VIGIL_HINT='[E] Fazer vigia';
// Toast: achou um ponto de interesse (sem dizer o tipo; o "?" aparece no minimapa e no mapa).
const TXT_VIGIL_FOUND='Um novo ponto de interesse foi marcado no mapa.';
// Toast: não há mais nada novo no raio da torre.
const TXT_VIGIL_NOTHING='Não foi encontrado nada fora do normal.';
// Toast: esta torre já fez a vigia na rodada.
const TXT_VIGIL_USED='Esta torre já foi usada nesta rodada.';
// Toast: a vigia só vale no turno do Comandante.
const TXT_VIGIL_WRONG_PHASE='A vigia é feita no turno do comandante.';
// Toast: o jogador chegou perto de um "?" e ele sumiu.
const TXT_VIGIL_ARRIVED='Você chegou ao ponto de interesse.';

// ------ Evolução das cidades ------
// Tela da cidade (livro, aba Cidades) e aba Efeitos: o que o nível atual da cidade do jogador rende. g = cityLvlGain(c) (econ.js).
const txtCityLvlGain=(c,g)=>'Nível <b>'+g.lvl+'</b> / '+LVL.cityMax+': +'+g.prod+' de produção, +◉'+g.tax+' de imposto por rodada.';
// Aba Efeitos (buffs): linha de uma cidade sua evoluída (nível 2 ou mais).
const txtCityLvlBuff=(c,g)=>'🏘 '+c.name+' (nível '+g.lvl+'): +'+g.prod+' de produção, +◉'+g.tax+' de imposto';
// Nome do muro de cada tipo (CITY_WALL_BY_LEVEL em modifiers.js); aparece na tela da cidade e no toast de evolução.
const TXT_WALL_NAME={none:'sem muros',fence:'cerca',palisade:'muros de madeira',stone:'muralha de pedra'};
// Muro que a cidade terá no nível lvl, com atiradores quando o nível os dá (citySentriesAt, modifiers.js).
const txtWallAt=lvl=>(TXT_WALL_NAME[cityWallTypeAt(lvl)]||'')+(citySentriesAt(lvl)?' com atiradores':'');
// Tela da cidade (livro, aba Cidades): bloco "Evoluir a cidade" do jogador. cost = custo; linhas de recursos vêm de txtLvlCostLine.
const txtCityUpNext=(c,lvl)=>'Nível <b>'+lvl+'</b> / '+LVL.cityMax+'. Próximo nível ('+(lvl+1)+'): '+txtWallAt(lvl+1)
  +', +'+LVL.cityProd+' de produção e +◉'+LVL.cityTax+' de imposto por rodada.';
// Linha de um item do custo na tela de evolução: ✔ se o jogador tem o suficiente, ✘ se não. k = ouro/recurso, need = quantia.
const txtLvlCostLine=(k,need,ok)=>'<li>'+(ok?'✔':'✘')+' '+LVL_RES_ICON[k]+' '+need+' (tem '+lvlHave(k)+')</li>';
// Toast ao clicar em evoluir a cidade.
const txtCityUpToast=(c,lvl)=>'🏘 '+c.name+' evoluiu para o nível '+lvl+': '+txtWallAt(lvl)+' e mais produção e imposto.';
// Relatório da rodada (rdNow): cidade evoluída pelo jogador.
const txtCityUpReport=(c,lvl)=>'🏘 '+c.name+' evoluiu para o nível '+lvl+'.';

// ------ Evolução da facção ------
// Livro, aba Facção (página inicial das decisões): bloco da esquerda com nome e nível da facção do jogador.
const txtFacHead=f=>'<h3>'+f.name+'</h3><p>Nível da facção: <b>'+facLvl()+'</b> / '+LVL.facMax+'</p><p>Ações do líder por rodada: <b>'+maxActions()
  +'</b></p><p>Cidades: <b>'+cityMine().length+'</b> (no nível máximo: <b>'+citiesAtMax()+'</b>)<br>POIs: <b>'+poiMine().length
  +'</b></p><p class="ldsm">Cada nível da facção dá +1 ação do líder por rodada, a partir da próxima rodada. '
  +'Subir pede ouro, recursos e, nos níveis mais altos, POIs e cidades.</p>';
// Livro, aba Facção: linha do checklist de um requisito (POIs, cidades). r = item de facReqState (modifiers.js).
const txtFacReqLine=r=>'<li>'+(r.ok?'✔':'✘')+' '+r.txt+': tem '+r.have+' de '+r.need+'</li>';
// Toast ao clicar em evoluir a facção.
const txtFacUpToast=n=>'🚩 Sua facção evoluiu! Nível '+n+'';
// Relatório da rodada (rdNow): facção evoluída pelo jogador.
const txtFacUpReport=n=>'🚩 Sua facção chegou ao nível '+n+'.';
