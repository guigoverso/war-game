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
  items:{},        // Fase 1: itens do inventário (matéria-prima, consumíveis, troféus, relíquias)
  recipes:{},      // Fase 2: receitas de cozinha
  fish:{},         // Fase 2: peixes por bioma
  buildings:{},    // Fase 4: edifícios e símbolos de cidade
  cityTypes:{},    // Fase 4: tipos de cidade (alimentos, minérios, madeira, dinheiro, porto)
  events:{},       // Fase 4/5: eventos aleatórios
  proposals:{},    // Fase 5: propostas das reuniões entre facções
  factions:{},     // Fase 5: facções e temperamentos
  warEvents:{}     // Fase 6: ondas, ataques furtivos, raids de mercenários
};

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
