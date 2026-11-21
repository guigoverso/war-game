'use strict';
// ---------- Textos: POIs (entreposto e torre de vigia) ----------
// Cada texto tem um comentário acima: onde aparece e para que serve. Só o texto muda aqui; a lógica apenas o chama.

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
