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
  fish:{},         // Fase 2: peixes por bioma e tipo de água
  buffs:{},        // Fase 2: bônus temporários da comida
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
  ['sucata','Sucata de metal','🔩','material',20,6,'Peças de metal retorcidas. Conta como 1 de minério no estoque das cidades.',{supply:{res:'ore'}}],
  ['couro','Couro','🟤','material',20,5,'Couro curtido, útil para qualquer artesão.'],
  ['carne','Carne crua','🥩','material',20,4,'Carne fresca. Pode ser cozida ou contar como 1 de alimento no estoque.',{supply:{res:'food'},price:7,shop:'store'}],
  ['ervas','Ervas medicinais','🌿','material',20,3,'Folhas de cheiro forte, usadas em remédios. Também conta como 1 de alimento no estoque.',{supply:{res:'food'}}],
  ['tora','Tronco de madeira','🪵','material',20,6,'Madeira para as cidades: conta como 1 de madeira no estoque.',{supply:{res:'wood'},price:9,shop:'store'}],
  ['minerio','Minério bruto','⛏','material',20,8,'Minério para as cidades: conta como 1 de minério no estoque.',{supply:{res:'ore'},price:12,shop:'store'}],
  ['pele_lobo','Pele de lobo','🐺','trophy',10,12,'Pele grossa e cinzenta de lobo.'],
  ['presa','Presa de javali','🦷','trophy',10,14,'Presa curva e amarelada.'],
  ['seda','Seda de aranha','🕸','trophy',10,12,'Fios resistentes de aranha gigante.'],
  ['ferrao','Ferrão de escorpião','🦂','trophy',10,16,'O ferrão ainda guarda veneno.'],
  ['garra','Garra de urso','🐻','trophy',10,30,'Uma garra enorme e afiada.'],
  ['moeda_antiga','Moeda antiga','🪙','trophy',10,40,'Cunhagem de um reino esquecido.'],
  ['joia','Joia lapidada','💎','trophy',5,90,'Brilha mesmo no escuro.'],
  ['reliquia','Relíquia','🏺','relic',5,150,'Objeto antigo e raro. Guardada para oferecer a facções (em breve).',{noSell:true}],
  ['bandagem','Bandagem','🩹','consumable',10,20,'Estanca os ferimentos. Cura 25 de vida.',{use:{heal:25},price:25,shop:'clinic'}],
  ['kit_medico','Kit médico','🧰','consumable',5,50,'Material completo de primeiros socorros. Cura 60 de vida.',{use:{heal:60},price:65,shop:'clinic'}],
  ['erva_curativa','Erva curativa','🌱','consumable',10,15,'Cura 40 de vida aos poucos, em 8 segundos.',{use:{regen:{total:40,secs:8}}}]
]);
// ---------- Fase 2: pesca, cozinha e bônus temporários ----------
defItems([
  ['vara','Vara de pescar','🎣','weapon',1,30,'Coloque na barra 1–6 e equipe. Com ela na mão, aperte o botão direito mirando um cardume para pescar. Não serve para atacar.',{rod:true,price:60,shop:'store'}],
  ['lambari','Lambari','🐟','material',10,5,'Peixe pequeno de rio. Bom para a frigideira.',{tags:['fish']}],
  ['tilapia','Tilápia','🐟','material',10,8,'Peixe de água doce, muito comum.',{tags:['fish']}],
  ['bagre','Bagre','🐟','material',10,12,'Peixe de fundo, mais ativo à noite.',{tags:['fish']}],
  ['truta','Truta','🐟','material',10,14,'Peixe de água fria e limpa.',{tags:['fish']}],
  ['salmao','Salmão','🍣','material',10,22,'Peixe raro de rios gelados.',{tags:['fish']}],
  ['sardinha','Sardinha','🐟','material',10,6,'Peixe do mar, vem em cardume.',{tags:['fish']}],
  ['atum','Atum','🐟','material',10,18,'Peixe grande do mar, briga bastante.',{tags:['fish']}],
  ['caranguejo','Caranguejo','🦀','material',10,10,'Marisco das praias e do mar.'],
  ['peixe_dourado','Peixe dourado','✨','trophy',5,60,'Raríssimo. Brilha como ouro.',{tags:['fish']}],
  ['bota','Bota velha','🥾','material',10,1,'Alguém perdeu isto no fundo da água.'],
  ['peixe_assado','Peixe assado','🍢','consumable',5,18,'Peixe na brasa. Cura 35 de vida.',{use:{heal:35},price:22,shop:'tavern'}],
  ['espeto_carne','Espeto de carne','🍖','consumable',5,20,'Carne grelhada. Cura 30 e dá Força por 3 minutos.',{use:{heal:30,buff:'forca'},price:24,shop:'tavern'}],
  ['sopa_peixe','Sopa de peixe','🍜','consumable',5,28,'Sopa quente. Cura 25 e dá Regeneração por 4 minutos.',{use:{heal:25,buff:'regen'},price:34,shop:'tavern'}],
  ['ensopado','Ensopado rústico','🍲','consumable',5,40,'Cura 55 e dá Resistência por 4 minutos.',{use:{heal:55,buff:'resistencia'},price:48,shop:'tavern'}],
  ['banquete','Banquete do caçador','🍽','consumable',3,120,'Cura 100 e dá Força, Agilidade e Resistência.',{use:{heal:100,buff:['forca','agil','resistencia']}}]
]);
// armas como itens: type 'weapon', ficam na barra 1–6 (ou na bolsa). value = metade do preço de compra
(function(){
  const icons=['🔫','🔫','🔫','🔫','🎯','🚀'];
  WEAPONS.forEach((w,i)=>dataDefine('items','w_'+w.id,{name:w.name,icon:icons[i],type:'weapon',stack:1,value:Math.max(30,Math.round(w.price*0.5)),desc:w.desc,weapon:i}));
})();
// bônus temporários (duração em segundos de jogo)
DATA.buffs={};
for(const [id,name,icon,secs,desc,fx] of[
  ['forca','Força','💪',180,'+10% de dano das armas',{dmg:1.10}],
  ['regen','Regeneração','💚',240,'Recupera 0,6 de vida por segundo',{regen:0.6}],
  ['resistencia','Resistência','🛡',240,'−15% do dano recebido',{resist:0.85}],
  ['agil','Agilidade','💨',180,'+8% de velocidade',{speed:1.08}]
])dataDefine('buffs',id,Object.assign({name,icon,secs,desc},fx));
// peixes: w = peso do sorteio; water: fresh (rio/lago), sea (mar) ou any; night/biomes: multiplicadores; fight: dificuldade (0,4 a 1,6)
function defFish(id,name,item,w,water,fight,extra){dataDefine('fish',id,Object.assign({name,item,w,water,fight},extra||{}))}
defFish('lambari','Lambari','lambari',30,'fresh',0.7);
defFish('tilapia','Tilápia','tilapia',22,'fresh',0.85);
defFish('bagre','Bagre','bagre',12,'fresh',1.0,{night:3});
defFish('truta','Truta','truta',10,'fresh',1.1,{biomes:{[BIO_SNOW]:3,[BIO_ROCK]:3,[BIO_FOREST]:2}});
defFish('salmao','Salmão','salmao',5,'fresh',1.35,{biomes:{[BIO_SNOW]:4}});
defFish('sardinha','Sardinha','sardinha',30,'sea',0.7);
defFish('atum','Atum','atum',8,'sea',1.4);
defFish('caranguejo','Caranguejo','caranguejo',12,'sea',0.6);
defFish('peixe_dourado','Peixe dourado','peixe_dourado',1.2,'any',1.6);
defFish('bota','Bota velha','bota',6,'any',0.4);
// receitas: station 'fire' (fogueira de acampamento) ou 'tavern' (só na taverna, também serve para as simples). ing: {id} ou {tag}
function defRecipe(id,name,icon,station,ing,out,desc){dataDefine('recipes',id,{name,icon,station,ing,out,desc})}
defRecipe('peixe_assado','Peixe assado','🍢','fire',[{tag:'fish',n:1}],'peixe_assado','Qualquer peixe na brasa.');
defRecipe('espeto_carne','Espeto de carne','🍖','fire',[{id:'carne',n:2}],'espeto_carne','Duas carnes cruas no espeto.');
defRecipe('sopa_peixe','Sopa de peixe','🍜','tavern',[{tag:'fish',n:2},{id:'ervas',n:1}],'sopa_peixe','Dois peixes e ervas, em panela.');
defRecipe('ensopado','Ensopado rústico','🍲','tavern',[{id:'carne',n:1},{id:'ervas',n:1},{tag:'fish',n:1}],'ensopado','Carne, ervas e peixe.');
defRecipe('banquete','Banquete do caçador','🍽','tavern',[{id:'peixe_dourado',n:1},{id:'carne',n:2},{id:'ervas',n:2}],'banquete','Exige um peixe dourado.');

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
// baú comum: itens valiosos (moeda antiga, joia) têm 10% cada; relíquia NUNCA (só em baús de dungeon)
defLoot('chest','Baú',[{id:'sucata',p:.8,min:1,max:3},{id:'ervas',p:.6,min:1,max:3},{id:'bandagem',p:.5,min:1,max:2},{id:'kit_medico',p:.2},{id:'moeda_antiga',p:.10},{id:'joia',p:.10},{id:'tora',p:.5,min:1,max:3},{id:'minerio',p:.4,min:1,max:2}]);
// baú de dungeon (usado na Fase 3): as relíquias aparecem aqui
defLoot('chest_dungeon','Baú de dungeon',[{id:'sucata',p:.7,min:2,max:4},{id:'kit_medico',p:.4},{id:'moeda_antiga',p:.3},{id:'joia',p:.25},{id:'reliquia',p:.35},{id:'tora',p:.5,min:1,max:3},{id:'minerio',p:.5,min:1,max:3}]);

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
