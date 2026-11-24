'use strict';
// Teste em Node dos esqueletos lego (js/modifiers/lego-modifiers.js; L2: fazenda, mina e serraria, tamanhos M e P). Uso (de dentro de tests/): node macro/lego.js
// Confere por receita: vagas dentro da área, sem sobreposição entre vagas, faixa do portão livre, cada vaga com ao menos uma peça que cabe, uma âncora por esqueleto, lane livre,
// 4 esqueletos ou mais por tipo/tamanho (as 4 variações do cenário ?cenario=lego) e peças das tabelas existentes.
const {erros,run}=require('./carregar')();
let falhas=0;const ok=(c,n,w)=>{if(!c)falhas++;console.log((c?'OK    ':'FALHA ')+n+(w?' — '+w:''))};
ok(erros.length===0,'camada macro carrega (inclui lego-modifiers.js)',erros.join(' | '));
const r=run(`(()=>{const out=[],info=[];
  for(const type of Object.keys(LEGO_RECIPES))for(const size of Object.keys(LEGO_RECIPES[type])){
    const rc=LEGO_RECIPES[type][size],H=rc.half,pick=LEGO_PICK[type],tag=type+'/'+size;
    if(rc.skeletons.length<LEGO_SHOW.n)out.push(tag+': só '+rc.skeletons.length+' esqueletos');
    if(Math.abs(rc.flag[1]-(H+0.2))>0.01)out.push(tag+': bandeira fora do lugar');
    for(const sk of rc.skeletons){
      const S=sk.slots,casa=S.filter(s=>s.k==='casa').length,id=tag+'/'+sk.id;if(casa!==1)out.push(id+': '+casa+' âncoras');
      for(const s of S){
        if(s.x<-H||s.z<-H||s.x+s.w>H||s.z+s.d>H-1)out.push(id+': vaga '+s.k+' fora da área ('+s.x+','+s.z+','+s.w+','+s.d+')');
        if(s.k!=='patio'){const tab=pick[s.k];if(!tab)out.push(id+': vaga sem tabela '+s.k);else{for(const pid of Object.keys(tab))if(!LEGO_MIN[pid])out.push(id+': peça sem tamanho mínimo '+pid);
          if(!Object.keys(tab).some(pid=>LEGO_MIN[pid]&&s.w>=LEGO_MIN[pid][0]&&s.d>=LEGO_MIN[pid][1]))out.push(id+': nenhuma peça cabe em '+s.k+' '+s.w+'x'+s.d)}}
        if(s.face&&!'NSEW'.includes(s.face))out.push(id+': frente inválida');
      }
      for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){const a=S[i],b=S[j];if(a.x<b.x+b.w&&b.x<a.x+a.w&&a.z<b.z+b.d&&b.z<a.z+a.d)out.push(id+': vagas '+a.k+'/'+b.k+' se sobrepõem')}
      for(const s of S)if(s.k==='apoio'&&legoFaceScore(S,s,H,legoFaceFor(S,s,H))>1)out.push(id+': apoio sem nenhuma frente livre ('+s.x+','+s.z+')');   // a porta de um apoio nunca dá em parede nem em cerca
      const lane=sk.lane||0;for(const s of S)if(s.k!=='patio'&&s.k!=='casa'&&lane>s.x&&lane<s.x+s.w&&s.z+s.d>0&&s.z<H-1)out.push(id+': faixa x='+lane+' cruza a vaga '+s.k+' ('+s.x+'..'+(s.x+s.w)+')');
      for(const s of S)if(s.z+s.d>=H-1&&s.x<rc.gate&&s.x+s.w>-rc.gate)out.push(id+': vaga '+s.k+' bloqueia o portão');
    }
    info.push(tag+':'+rc.skeletons.length+' (raio '+legoR(type,size)+')');
  }
  for(const t of Object.keys(LEGO_RECIPES)){if(!LEGO_DECOR[t])out.push(t+': sem enfeites');if(LEGO_RECIPES[t].M.half+1<LEGO_RECIPES[t].P.half+1)out.push(t+': P maior que M')}
  return{out,info}})()`);
ok(r.info.length>=6,r.info.length+' receitas (tipo/tamanho)',r.info.join(' '));
ok(r.out.length===0,'geometria dos esqueletos',r.out.slice(0,40).join(' | '));
console.log(falhas?'\n'+falhas+' FALHA(S)':'\nTudo OK');process.exit(falhas?1:0);
