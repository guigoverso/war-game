'use strict';
// ---------- Suprimento das facções NPC (F5a): humor das cidades, preço e estoque das lojas ----------
// Cada rodada, cada facção NPC sorteia como está cada recurso: 'short' (em falta), 'ok' ou 'abund' (abundante). O sorteio é 70% situação
// (quantas cidades da facção produzem o recurso + caravanas que o trazem) e 30% sorte. Daí saem: o humor de cada cidade da facção (por quanto
// ela precisa do que falta), o preço que a facção paga pelo recurso, o estoque da loja e o contador de descontentamento (rebelião: fase futura).
// Nada é guardado por cidade além do humor e de `ups`; o estado por facção fica em STATE.rd.fsup e é refeito a cada rodada.
const FSUP={luck:0.3,floor:0.28,ceil:0.2,short:0.3,abund:0.62,relief:0.25,sellShort:1.3,sellAbund:0.85,stockShort:0.5,stockAbund:2,upW:3,richW:1,richLuck:0.1,ups:99};
FSUP.upsetPrice=0.2;   // cidade NPC descontente: +20% em todos os serviços (as curas já têm o seu efeito próprio)
const FSUP_NAME={short:'em falta',ok:'equilibrado',abund:'abundante'};
const fsupState=(fid,r)=>{const f=STATE.rd&&STATE.rd.fsup&&STATE.rd.fsup[fid];return(f&&f[r])||'ok'};
// modificadores de suprimento (SOMAM entre si, cada um expira na sua hora): STATE.rd.fmods = [{f:facção, r:recurso|null (todos), d, left, src}].
// d > 0 tira pontuação (crise, sabotagem, desastre); d < 0 dá. Caravanas (+0,25 na base) e reuniões (meetNpc) também entram na conta da pontuação.
function fsupHit(fid,d,left,res,src){const rd=STATE.rd,L=rd.fmods||(rd.fmods=[]);L.push({f:fid,r:res||null,d,left:left||1,src:src||''})}
const fsupPen=(fid,r)=>((STATE.rd&&STATE.rd.fmods)||[]).filter(m=>m.f===fid&&(m.r===null||m.r===r)).reduce((s,m)=>s+m.d,0);
function fsupCancel(fid,src){const rd=STATE.rd;if(rd.fmods)rd.fmods=rd.fmods.filter(m=>!(m.f===fid&&(!src||m.src===src)))}
function fsupRelief(){   // caravanas (suas e das NPC) trazem para uma cidade o recurso da outra ponta
  const out={},rs=STATE.rd.routes.concat(STATE.rd.nroutes||[]);
  for(const r of rs)for(const[x,y]of[[r.a,r.b],[r.b,r.a]]){
    const X=WORLD.cities[x],Y=WORLD.cities[y];if(!X||!Y||X.owner==='player'||!X.fid)continue;
    const res=focusOf(Y);if(!NEEDS.includes(res))continue;
    (out[X.fid]||(out[X.fid]={}))[res]=FSUP.relief;
  }
  return out;
}
function poiHuntPen(fid,r){   // acampamentos de caçadores seus tiram pontuação de couro da facção em guerra com você (POIX.hunt, poigame.js)
  return r==='leather'&&!mapMundoOn()&&relOf(fid).war?POIX.hunt.pen*poiCount('hunters'):0;   // mundo novo: POI sem efeito global
}
function fsupRound(){
  if(STATE.rd.fmod){for(const k in STATE.rd.fmod)fsupHit(+k,STATE.rd.fmod[k].d,STATE.rd.fmod[k].left,null,'antigo');delete STATE.rd.fmod}   // saves antigos: um golpe por facção vira um modificador
  const rd=STATE.rd,fs=WORLD.factions||[],rel=fsupRelief();rd.fsup=rd.fsup||{};
  for(const f of fs){
    const cs=facCities(f.id).filter(c=>ec(c));if(!cs.length){delete rd.fsup[f.id];continue}
    const st={};
    for(const r of NEEDS){
      const prod=cs.filter(c=>focusOf(c)===r).length,base=clamp(FSUP.floor+(1-FSUP.floor-FSUP.ceil)*clamp(2*prod/cs.length,0,1)+((rel[f.id]||{})[r]||0),0,1);   // sem produtor: base baixa (mercado interno); metade das cidades produzindo já é o teto
      const score=(1-FSUP.luck)*base+FSUP.luck*Math.random()-fsupPen(f.id,r)-poiHuntPen(f.id,r)+meetNpc(f.id,r);   // reunião das facções: efeito para todas
      st[r]=score<FSUP.short?'short':score>FSUP.abund?'abund':'ok';
    }
    rd.fsup[f.id]=st;
  }
  if(rd.fmods)rd.fmods=rd.fmods.filter(m=>--m.left>0);
  for(const c of WORLD.cities){   // humor das cidades (as suas seguem as regras de suprimento do jogador)
    if(c.owner==='player')continue;const e=ec(c);if(!e)continue;
    if(!c.fid||!rd.fsup[c.fid]){const r=Math.random(),pu=0.18+0.04*Math.max(1,c.rank||1);e.mood=r<pu?'upset':r>0.85?'rich':'ok';continue}
    let sh=0,ab=0;
    for(const r of NEEDS){const pct=e.pct[r]||0;if(pct<=0)continue;const s=rd.fsup[c.fid][r];if(s==='short')sh+=pct/100;else if(s==='abund')ab+=pct/100}
    e.mood=sh>=FSUP.upW?'upset':(sh===0&&(ab>=FSUP.richW||Math.random()<FSUP.richLuck))?'rich':'ok';
    e.ups=e.mood==='upset'?(e.ups||0)+1:0;
    if(e.mood==='upset'&&poiSancPeace(c.fid))e.mood='ok';   // Santuário da facção: 50% de não ficar Descontente (a contagem e.ups não muda)   // rodadas seguidas descontente (a rebelião, em fase futura, olha isto)
  }
}
// preço que a facção paga pelo recurso que você vende (em falta: paga mais; abundante: paga menos)
function fsupSellFx(c,id){
  if(!c||c.owner==='player'||!c.fid)return null;const s=supplyOf(id);if(!s)return null;
  const st=fsupState(c.fid,s.res);if(st==='ok')return null;
  const n=facOf(c.fid).name+' está '+FSUP_NAME[st]+' de '+resName(s.res).toLowerCase();
  return st==='short'?{txt:n+' (paga mais)',mul:FSUP.sellShort}:{txt:n+' (paga menos)',mul:FSUP.sellAbund};
}
// estoque da loja: a facção folgada num recurso tem mais dele; a que está em falta, menos
function fsupStockMul(c,res){
  if(!c||c.owner==='player'||!c.fid)return 1;const st=fsupState(c.fid,res);
  return st==='abund'?FSUP.stockAbund:st==='short'?FSUP.stockShort:1;
}
// relatório do modo criativo (anexado ao de relações em fgCheatHtml)
function fsupCheatHtml(){
  const fs=WORLD.factions||[];if(!fs.length)return '';
  const rows=fs.map(f=>'<b>'+f.name+'</b>: '+NEEDS.map(r=>resIcon(r)+' '+(FSUP_NAME[fsupState(f.id,r)])).join(' • ')).join('<br>');
  const cs=WORLD.cities.filter(c=>c.owner!=='player'&&ec(c)).map(c=>c.name+' ('+(c.rebel?'Rebeldes':facOf(c.fid).name)+'): '+MOOD[moodOf(c)].icon+' '+MOOD[moodOf(c)].n+(ec(c).ups?' • '+ec(c).ups+' rodada(s) descontente':'')).join('<br>');
  return (typeof rebCheatHtml==='function'?rebCheatHtml():'')+(typeof fevCheatHtml==='function'?fevCheatHtml():'')+(typeof gevCheatHtml==='function'?gevCheatHtml():'')+'<h4 style="margin:12px 0 4px">Suprimento das facções NPC</h4><small>'+rows+'</small><h4 style="margin:12px 0 4px">Modificadores de suprimento ativos (somam)</h4><small>'+(((STATE.rd.fmods)||[]).map(m=>facOf(m.f).name+' • '+(m.r?resName(m.r):'tudo')+': '+(m.d>0?'−':'+')+Math.abs(m.d).toFixed(2)+' ('+(m.src||'efeito')+', mais '+m.left+' rod.)').join('<br>')||'nenhum')+'</small><h4 style="margin:12px 0 4px">Humor das cidades NPC</h4><small>'+cs+'</small>';
}
// cidade NPC descontente encarece todos os serviços (curas já dobram em econ.js)
addPriceFx('fmood',ctx=>{const c=ctx.city;if(!c||c.owner==='player'||!c.fid||ctx.kind==='heal'||ctx.kind==='healhp'||moodOf(c)!=='upset')return[];return[{txt:'Cidade descontente',mul:1+FSUP.upsetPrice}]},65);
