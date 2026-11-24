'use strict';
// ---------- Textos: POIs (entreposto e torre de vigia) ----------
// Cada texto tem um comentário acima: onde aparece e para que serve. Só o texto muda aqui; a lógica apenas o chama.

// ------ Pousada e alojamento de trabalhadores (poigame.js, svcInn e cama) ------
// Título da tela do pousadeiro (pousada) ou do cozinheiro (alojamento).
const txtRestTitle = type => type === 'lodge' ? '🍲 CANTINA' : '🛏 POUSADA';
// Saudação do menu inicial do comerciante da pousada ou do alojamento (poigame.js, svcInn): acréscimo (%) sobre a loja da cidade.
const txtRestGreeting = (type, pct) => (type === 'lodge' ? '— Sopa quente e um beliche, patrão. ' : '— Entre, descanse! ') + 'Preços ' + pct + '% acima da cidade.';
// Descrição da caixa do quarto na aba Quarto.
const txtRestRoomDesc = type => type === 'lodge' ? 'Um beliche no barracão: a noite vira manhã (ou o dia vira noite) e a vida volta toda. Custa a cura completa.' : 'Cama na casa: a noite vira manhã (ou o dia vira noite) e a vida volta toda. Custa a cura completa.';
// Abas da tela de compra da pousada e do alojamento [chave, rótulo] (poigame.js, svcInn).
const REST_TABS = [['food', '🍲 Comida'], ['heal', '🩹 Remédios'], ['room', '🛏 Quarto']];
// Botão de alugar o quarto e botão com o quarto já reservado (nesta rodada).
const txtRestRoomRent = cost => '🛏 Alugar quarto ◉' + cost;
const txtRestRoomHeld = type => type === 'lodge' ? '🛏 Beliche reservado (durma no barracão)' : '🛏 Quarto reservado (a cama fica na casa)';
// Dica ao chegar na cama sem quarto reservado, e aviso ao tentar dormir sem ele (taverna, pousada e alojamento).
const txtBedLocked = type => type === 'tavern' ? '🔒 Cama: reserve o quarto com o taverneiro' : type === 'lodge' ? '🔒 Beliche: reserve com o cozinheiro' : '🔒 Cama: reserve o quarto com o pousadeiro';
const txtBedNeedRoom = type => type === 'tavern' ? 'Reserve o quarto com o taverneiro primeiro.' : type === 'lodge' ? 'Reserve o beliche com o cozinheiro primeiro.' : 'Reserve o quarto com o pousadeiro primeiro.';

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

// ------ Tela de serviço padrão de comerciante (svcshop.js) ------
// Linha grande do topo: moedas que o comerciante tem (sobem conforme o jogador compra).
const txtShopMerchantGold = n => '◉ ' + n + ' moedas do comerciante';
// Linha menor logo abaixo: moedas do jogador.
const txtShopPlayerGold = n => 'Suas moedas: ◉ ' + n;
// Placa de cada POI do cenário ?cenario=lego (poiLegoShowGen, poilego.js): nome, tamanho, número da variação e esqueleto sorteado.
const poiLegoLabel = (p, i) => POI_DEFS[p.type].n + ' ' + LEGO_SIZE_NAME[p.recipe.size] + ' ' + (i + 1) + ' — ' + p.recipe.skeleton;
// Placa de cada micro-POI do cenário ?cenario=lego (poiMicroShowGen, poimicro.js): "Micro: nome" e, nos que já existiam (dormentes da guerra), "(já existia)".
// Rótulos dos serviços de POI montados por peças lego (poilego2.js): aparecem como o alvo [E] do lojista, do pousadeiro e do cozinheiro.
const txtLegoSvc = { shop: 'Lojista: comprar suprimentos', inn: 'Pousadeiro: comida, remédios e quarto', cook: 'Cozinheiro: cantina e cama' };
const poiMicroLabel = m => 'Micro: ' + m.n + (m.old ? ' (já existia)' : '');
