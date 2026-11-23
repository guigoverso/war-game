'use strict';
// Carrega, em Node e sem navegador, os scripts globais da camada macro (js/core + js/macro + modifiers + texts) num contexto `vm`.
// Regra da camada: js/macro não usa Three.js nem DOM; este carregador NÃO define THREE, document nem window, então qualquer uso quebra aqui.
// Uso: const {ctx,run}=require('./carregar')([extras]) ; run('expr') avalia no contexto (os `const` globais dos scripts ficam visíveis a run).
const vm=require('vm'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..','..');
// mesma ordem do index.html (só o que a camada macro precisa)
const BASE=['js/core/util.js',...fs.readdirSync(path.join(ROOT,'js/modifiers')).map(f=>'js/modifiers/'+f),
  ...fs.readdirSync(path.join(ROOT,'js/texts')).map(f=>'js/texts/'+f),'js/core/state.js'];
module.exports=function(extras){
  const ctx=vm.createContext({console,Math,JSON,Date,Map,Set,Array,Object,Number,String,Float32Array,Int16Array,Uint8Array,Int32Array,
    performance:{now:()=>Date.now()},setTimeout,
    location:{search:''},      // os modifiers lêem ?parametros; vazio = padrão
    URLSearchParams,localStorage:{getItem:()=>null,setItem(){}}});
  const files=[...BASE,...(extras||[])];
  // lista de checagem: tudo o que está em js/macro é carregado também, para garantir que não depende de navegador
  for(const f of fs.readdirSync(path.join(ROOT,'js/macro')))files.push('js/macro/'+f);
  const erros=[];
  for(const f of files){
    // `const`/`let` de topo ficam no escopo de script do contexto; `run` usa o mesmo contexto, então enxerga todos
    try{vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f})}catch(e){erros.push(f+': '+e.message)}
  }
  return{ctx,erros,run:code=>vm.runInContext(code,ctx)};
};
