'use strict';
// ---------- Tabelas de dados (conteúdo manual do jogo) ----------
// Aqui ficam os conteúdos que serão escritos à mão e crescer com o tempo: itens, receitas, eventos, propostas de reunião etc.
// As fases seguintes preenchem estas tabelas; o código só lê delas. Cada entrada tem um `id` (a chave) e campos próprios.
const DATA={
  // os quatro suprimentos do livro de recursos (o ouro é P.coins)
  resources:{
    food:{name:'Alimentos',icon:'🌾'},
    ore:{name:'Minérios',icon:'⛏'},
    wood:{name:'Madeira',icon:'🪵'},
    gold:{name:'Ouro',icon:'◉'}
  },
  items:{},        // Fase 1: itens do inventário (matéria-prima, consumíveis, troféus, relíquias) — definidos abaixo
  loot:{},         // Fase 1: o que cada inimigo e os baús podem dar
  recipes:{},      // Fase 2: receitas de cozinha
  fish:{},         // Fase 2: peixes por bioma
  buildings:{},    // Fase 4: edifícios e símbolos de cidade
  cityTypes:{},    // Fase 4: tipos de cidade (alimentos, minérios, madeira, dinheiro, porto)
  events:{},       // Fase 4/5: eventos aleatórios
  proposals:{},    // Fase 5: propostas das reuniões entre facções
  factions:{},     // Fase 5: facções e temperamentos
  warEvents:{}     // Fase 6: ondas, ataques furtivos, raids de mercenários
};

// ---------- Itens (Fase 1) ----------
// type: material | consumable | trophy | relic. stack: máximo por espaço. value: valor de venda. price: se a clínica vende.
// use: {heal:N} cura instantânea; {regen:{total:N,secs:S}} cura ao longo do tempo. noSell: não pode ser vendido no armeiro.
function defItems(list){for(const [id,name,icon,type,stack,value,desc,extra] of list)dataDefine('items',id,Object.assign({name,icon,type,stack,value,desc},extra||{}))}
defItems([
  ['sucata','Sucata de metal','🔩','material',20,6,'Peças de metal retorcidas. Serve de base para consertos e melhorias.'],
  ['couro','Couro','🟤','material',20,5,'Couro curtido, útil para qualquer artesão.'],
  ['carne','Carne crua','🥩','material',20,4,'Carne fresca. Pode ser cozida no futuro.'],
  ['ervas','Ervas medicinais','🌿','material',20,3,'Folhas de cheiro forte, usadas em remédios.'],
  ['pele_lobo','Pele de lobo','🐺','trophy',10,12,'Pele grossa e cinzenta de lobo.'],
  ['presa','Presa de javali','🦷','trophy',10,14,'Presa curva e amarelada.'],
  ['seda','Seda de aranha','🕸','trophy',10,12,'Fios resistentes de aranha gigante.'],
  ['ferrao','Ferrão de escorpião','🦂','trophy',10,16,'O ferrão ainda guarda veneno.'],
  ['garra','Garra de urso','🐻','trophy',10,30,'Uma garra enorme e afiada.'],
  ['moeda_antiga','Moeda antiga','🪙','trophy',10,40,'Cunhagem de um reino esquecido.'],
  ['joia','Joia lapidada','💎','trophy',5,90,'Brilha mesmo no escuro.'],
  ['reliquia','Relíquia','🏺','relic',5,150,'Objeto antigo e raro. Guardada para oferecer a facções (em breve).',{noSell:true}],
  ['bandagem','Bandagem','🩹','consumable',10,20,'Estanca os ferimentos. Cura 25 de vida.',{use:{heal:25},price:25}],
  ['kit_medico','Kit médico','🧰','consumable',5,50,'Material completo de primeiros socorros. Cura 60 de vida.',{use:{heal:60},price:65}],
  ['erva_curativa','Erva curativa','🌱','consumable',10,15,'Cura 40 de vida aos poucos, em 8 segundos.',{use:{regen:{total:40,secs:8}}}]
]);
// loot: drops = [{id, p (chance 0..1), min, max}]
function defLoot(key,name,drops){dataDefine('loot',key,{name,drops})}
defLoot('soldier','Soldado',[{id:'sucata',p:.3,min:1,max:2},{id:'bandagem',p:.18},{id:'couro',p:.15},{id:'moeda_antiga',p:.06}]);
defLoot('sniper','Franco-atirador',[{id:'sucata',p:.4,min:1,max:2},{id:'bandagem',p:.25},{id:'joia',p:.06}]);
defLoot('brute','Brutamontes',[{id:'sucata',p:.6,min:1,max:3},{id:'kit_medico',p:.15},{id:'couro',p:.3}]);
defLoot('hound','Cão de guerra',[{id:'carne',p:.5},{id:'couro',p:.4}]);
defLoot('bot','Drone',[{id:'sucata',p:.9,min:1,max:3}]);
defLoot('golem','Golem',[{id:'sucata',p:1,min:3,max:5},{id:'joia',p:.4}]);
defLoot('wolf','Lobo',[{id:'pele_lobo',p:.7},{id:'carne',p:.5}]);
defLoot('bear','Urso',[{id:'garra',p:.75},{id:'couro',p:1,min:1,max:3},{id:'carne',p:.9,min:1,max:3}]);
defLoot('spider','Aranha',[{id:'seda',p:.7,min:1,max:2}]);
defLoot('scorpion','Escorpião',[{id:'ferrao',p:.7}]);
defLoot('boar','Javali',[{id:'presa',p:.7},{id:'carne',p:.6,min:1,max:2}]);
defLoot('chest','Baú',[{id:'sucata',p:.8,min:1,max:3},{id:'ervas',p:.6,min:1,max:3},{id:'bandagem',p:.5,min:1,max:2},{id:'moeda_antiga',p:.35},{id:'kit_medico',p:.2},{id:'joia',p:.15},{id:'reliquia',p:.12}]);

// valida uma tabela: toda entrada precisa de `name`; devolve a lista de problemas (vazia = ok)
function validateData(){
  const errs=[];
  for(const [table,rows] of Object.entries(DATA)){
    for(const [id,row] of Object.entries(rows)){
      if(!row||typeof row!=='object')errs.push(table+'.'+id+': entrada inválida');
      else if(!row.name)errs.push(table+'.'+id+': falta "name"');
    }
  }
  return errs;
}
// acesso seguro a uma entrada
function dataGet(table,id){return DATA[table]&&DATA[table][id]||null}
// registra uma entrada nova (usado pelas fases seguintes)
function dataDefine(table,id,row){
  if(!DATA[table])throw new Error('Tabela de dados desconhecida: '+table);
  DATA[table][id]=Object.assign({id},row);
}
