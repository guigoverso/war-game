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
// Abas da compra na Taverna do mundo novo (poigame.js, svcTavern): o quarto fica no menu.
const TAVERN_TABS = [['food', '🍲 Comida'], ['heal', '🩹 Remédios']];
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
const txtLegoSvc = { shop: 'Lojista: comprar suprimentos', inn: 'Pousadeiro: comida, remédios e quarto', cook: 'Cozinheiro: cantina e cama', smith: 'Ferreiro: consertar arma', merc: 'Mercenário: recrutar soldado' };
const poiMicroLabel = m => 'Micro: ' + m.n + (m.old ? ' (já existia)' : '');

// ---------- Etapa 8.5 (mundo novo): pedágio, torre e santuário. TODOS EM RASCUNHO, a aprovar ----------
// Popup do pedágio (ui/mundoturno.js, wm3TollAsk): aparece quando o batalhão vai atravessar um tile de ponte ou fortaleza que cobra. dono = 'bandit', 'neutral' ou o nome da facção.
const txtTollTitle = nome => '🌉 ' + nome;
const txtTollAsk = (dono, preco) => dono === 'bandit'
  ? 'Uma sentinela de bandidos fecha a ponte com a lança. — Quinhentos para passar sem sangue — diz, sem tirar o olho da tropa. (◉' + preco + ')'
  : dono === 'neutral'
    ? 'Um guarda sem bandeira estende a mão aberta. — A passagem tem preço, viajante. (◉' + preco + ')'
    : 'Os guardas de ' + dono + ' barram o caminho. — O soldo da passagem, comandante. (◉' + preco + ')';
const txtTollPay = preco => 'Pagar ◉' + preco, TXT_TOLL_REFUSE = 'Recusar', TXT_TOLL_NOMORE = 'Não mostrar novamente';
// Opção das configurações (pausa) que liga e desliga o popup do pedágio (ui/mundoturno.js, mundoTollSetting).
const txtTollSetting = on => 'Pedágio: ' + (on ? 'perguntar antes de pagar' : 'pagar automaticamente');
// Botão do encontro com bandidos em tile de pedágio deles: pagar e seguir sem lutar (macro/toll.js wtEncPay).
const TXT_TOLL_BACK = '↩ Voltar ao tile anterior';
const txtTollEncPay = preco => '🪙 Pagar ◉' + preco + ' e passar';
// Relatório do turno (wtLog): os bandidos tomaram a ponte ou a fortaleza.
const txtWtTollTaken = nome => '🏴 Bandidos tomaram a passagem de ' + nome + ' e cobram de quem quer atravessar.';
// Torre de vigia (poigame.js, poiTowerUse): o resultado de cada uso. Sem achado, usa TXT_VIGIL_NOTHING.
const txtTowerFound = nome => 'Os vigias avistaram movimento estranho para os lados de ' + nome + '.';
const TXT_TOWER_LIMIT = 'Os vigias já não aguentam mais olhar: não há o que ver por hoje.';
// Santuário (poigame.js, svcSanctuary): fala do sacerdote e botão do dízimo.
const txtSancAsk = (dano, cura, preco) => '— A casa é de todos. Deixe o que o coração mandar e o altar alivia o que dói. ' + (dano > 0 ? '(cura ' + cura + ' de vida por ◉' + preco + ')' : '(você não precisa de cura)');
const txtSancPay = preco => '🕯 Deixar ◉' + preco + ' no altar';
const TXT_SANC_ALTAR = 'Altar: pedir alívio e deixar o dízimo';
