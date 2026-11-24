'use strict';
// Teste em Node dos esqueletos lego (js/modifiers/lego-modifiers.js; protótipo da fazenda). Uso (de dentro de tests/): node macro/lego.js
// Confere: vagas dentro da área, sem sobreposição entre vagas, faixa do portão livre, cada vaga com ao menos uma peça que cabe, uma casa por esqueleto, lane livre.
const {erros,run}=require('./carregar')();
let falhas=0;const ok=(c,n,w)=>{if(!c)falhas++;console.log((c?'OK    ':'FALHA ')+n+(w?' — '+w:''))};
ok(erros.length===0,'camada macro carrega (inclui lego-modifiers.js)',erros.join(' | '));
const r=run(`(()=>{const L=LEGO_FARM,H=LEGO_HALF,out=[],info=[];
  for(const sk of L.skeletons){
    const S=sk.slots,casa=S.filter(s=>s.k==='casa').length;if(casa!==1)out.push(sk.id+': '+casa+' casas');
    for(const s of S){
      if(s.x<-H||s.z<-H||s.x+s.w>H||s.z+s.d>H-1)out.push(sk.id+': vaga '+s.k+' fora da área ('+s.x+','+s.z+','+s.w+','+s.d+')');
      const tab=L.pick[s.k];if(s.k!=='patio'){if(!tab)out.push(sk.id+': vaga sem tabela '+s.k);else if(!Object.keys(tab).some(id=>{const m=L.min[id];return s.w>=m[0]&&s.d>=m[1]}))out.push(sk.id+': nenhuma peça cabe em '+s.k+' '+s.w+'x'+s.d)}
      if(s.z+s.d>H-1-0.01&&s.z+s.d>16)out.push(sk.id+': vaga encosta na cerca da frente');
    }
    for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){const a=S[i],b=S[j];if(a.x<b.x+b.w&&b.x<a.x+a.w&&a.z<b.z+b.d&&b.z<a.z+a.d)out.push(sk.id+': vagas '+a.k+'/'+b.k+' se sobrepõem')}
    const lane=sk.lane||0;for(const s of S)if(s.k!=='patio'&&s.k!=='casa'&&lane>s.x&&lane<s.x+s.w&&s.z+s.d>0&&s.z<H-1&&sk.id!=='x')out.push(sk.id+': faixa x='+lane+' cruza a vaga '+s.k+' ('+s.x+'..'+(s.x+s.w)+')');
    for(const s of S)if(s.z+s.d>=H-1&&s.x<L.gate&&s.x+s.w>-L.gate)out.push(sk.id+': vaga '+s.k+' bloqueia o portão');
    info.push(sk.id+':'+S.length);
  }
  return{out,info,n:L.skeletons.length}})()`);
ok(r.n>=5,r.n+' esqueletos',r.info.join(' '));
ok(r.out.length===0,'geometria dos esqueletos',r.out.slice(0,6).join(' | '));
console.log(falhas?'\n'+falhas+' FALHA(S)':'\nTudo OK');process.exit(falhas?1:0);
