'use strict';
// ---------- Modificadores: evolução da facção (requisitos e custo) ----------
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo.
// Este arquivo carrega cedo: funções daqui só podem usar globais de outros arquivos DENTRO do corpo (na hora da chamada).

// Requisitos para evoluir a facção (econ.js LVL, book.js, game.js)
// Verificam se o jogador tem o que precisa para a facção subir de nível: POIs e cidades (LVL.facReq), custo (LVL.facCost),
// turno do Líder, ação, limite de 1 por rodada e dívida. Para mudar uma regra, edite aqui.
// Custo de evoluir a facção para o próximo nível ({gold,food,ore,wood,leather}), ou null no nível máximo. Padrão: LVL.facCost (econ.js).
// Para testar, troque pela linha comentada: só ◉1 de ouro, sem recursos.
function facCostOf() {
  if (facLvl() >= LVL.facMax) return null;
  return LVL.facCost[facLvl()] || null;
}
// requisitos para a facção subir: lista {txt, ok, have, need}; só POIs e cidades (o custo em recursos vem de facCostOf)
function facReqState(){
  const q=LVL.facReq[facLvl()];if(!q)return[];
  const row=(txt,have,need)=>({txt,have,need,ok:have>=need}),o=[];
  if(q.pois)o.push(row('POIs seus',poiMine().length,q.pois));
  if(q.cities)o.push(row('Cidades suas (com a capital)',cityMine().length,q.cities));
  if(q.maxCities)o.push(row('Cidades no nível máximo',citiesAtMax(),q.maxCities));
  return o;
}
// motivo de a facção não poder evoluir ('' = pode); a tela mostra o texto
function facUpWhy(){
  if(!isLeader())return 'Só no turno do Líder.';
  if(facLvl()>=LVL.facMax)return 'Nível máximo.';
  if(facUpDone())return 'Você já evoluiu a facção nesta rodada.';
  if(!canAct('capital'))return 'Sem ações do líder nesta rodada.';
  if(Ledger.anyDebt())return 'Com dívida não é possível comprar.';
  if(!facReqState().every(r=>r.ok))return 'Faltam requisitos.';
  return lvlCanPay(facCostOf())?'':'Faltam recursos.';
}
const canFacUp=()=>!facUpWhy();
