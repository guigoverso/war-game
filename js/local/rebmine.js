'use strict';
// ---------- Rebelião em cidade DO JOGADOR (F5d) ----------
// Usa a MESMA máquina das rebeliões de cidades NPC (rebellion.js): STATE.reb.cur com owner = 0 (o jogador). Quando uma cidade sua se rebela (rounds.js → rebelCity):
//  turno do líder: a cidade pega fogo, ganha a bandeira dos rebeldes e vem o cartão "Rebelião na sua cidade" (rebAnnounce → rebCard).
//  A) Lutar: no turno do comandante, chegando perto a invasão começa (rebCombatStart). Vencendo, a cidade volta a ser sua e fica REBM.cool rodadas sem se rebelar,
//     sem evento de pós-rebelião. Se você cair (ou não for), os rebeldes vencem: a cidade fica independente (facção nova ou anexada), sem cartão.
//  B) Reconhecer a independência: na hora, nasce uma facção nova ou uma que apoiou os rebeldes anexa a cidade; as outras cidades suas ficam mais descontentes.
// Se já há outra rebelião em andamento, a cidade se rebela como antes (guarnição inimiga para reconquistar, ec(c).rebelled → noReb ao reconquistar).
const REBM={sup:{war:0.8,enemy:0.4,unfav:0.3,neutral:0.2,fav:0,ally:0},cool:5,pAnnex:0.6,rel:8,relLost:5,ups:1};   // apoio por relação com você; 5 rodadas sem se rebelar; 60% de uma facção que apoiou anexar; relação com a facção nova; +1 de descontentamento
// facções que apoiam os rebeldes de uma cidade sua, pela relação delas com você (REBM.sup): guerra 80%, inimiga 40%, desfavorável 30%, neutra 20%, favorável/aliada 0%
function rebmSupporters(c){
  const out=[];
  for(const f of WORLD.factions||[]){
    if(!facCities(f.id).length)continue;
    if(Math.random()<(REBM.sup[relStatus(f.id)]||0))out.push(f.id);
  }
  return out;
}
function rebmStart(c){   // chamado por rebelCity; false se já há outra rebelião
  const S=rebS();if(S.cur)return false;
  S.cur={cid:c.id,owner:0,round:STATE.round+1,stage:'queued',choice:null,sup:rebmSupporters(c),color:rebFreeColor(),flag:rebFreeFlag(),win:null,garrison:6+2*(c.rank||1)};
  return true;
}
// a cidade sai de você: facção nova ou anexada por quem apoiou os rebeldes (a rebelião em andamento é a atual: S.cur)
function rebmLeave(c,relNew,why){
  const r=rebS().cur,sup=r.sup.filter(g=>facOf(g)&&facCities(g).length);
  const all=(WORLD.factions||[]).filter(f=>facCities(f.id).length).map(f=>f.id);
  if(sup.length&&(Math.random()<REBM.pAnnex||rebAtCap()))rebAnnexBy(c,rebNearest(c,sup));
  else if(!rebAtCap())rebNewFaction(c,relNew,why);
  else if(all.length)rebAnnexBy(c,rebNearest(c,all));
  const e=ec(c);if(e){e.rebelled=false;e.ups=0}
  c.state='idle';c.crime=false;rebEnd();
}
function rebmUpset(except){   // as outras cidades suas ficam mais descontentes
  let n=0;for(const o of WORLD.cities){if(o.owner!=='player'||o.id===except)continue;const eo=ec(o);if(!eo)continue;eo.ups=(eo.ups||0)+REBM.ups;eo.mood='upset';n++}
  return n;
}
function rebmLost(c,rep){   // os rebeldes venceram a luta (você caiu): independência sem cartão
  rebmLeave(c,REBM.relLost,'os rebeldes venceram');
  rep.push('🏳 Os rebeldes de '+c.name+' venceram: a cidade deixou de ser sua.');
}
function rebmWon(c){   // você esmagou a rebelião: a cidade volta a ser sua e não se rebela por REBM.cool rodadas (sem pós-rebelião)
  const S=rebS();
  REBB.active=false;REBB.mode=null;rebTempClear();
  rebClear(c);c.owner='player';c.state='conquered';c.crime=false;facSetFlag(c);facReskin();if(typeof armyConquered==='function')armyConquered(c);
  const e=ec(c);if(e){e.rebelled=false;e.noReb=STATE.round+REBM.cool;e.ups=0;e.mood='ok'}
  S.cur=null;S.last=STATE.round;
  sfx('win',0);facNote('🛡 Você esmagou a rebelião de '+c.name+'! A cidade é sua de novo e não se rebela por '+REBM.cool+' rodadas.',5000);
}
definePolicy({id:'rebmine',name:'Rebelião na sua cidade',city:true,noRoll:true,flex:true,cool:0,snapRef:()=>rebS().cur,withSnap:rebWithSnap,
  cond:()=>!!rebCur()&&rebCur().owner===0,
  pickCity:()=>rebCity(),
  extra:(c)=>rebSidesTable(rebCur()),
  fixCond:()=>{const c=WORLD.cities.find(k=>k.owner==='player'&&!k.home);if(!c||rebS().cur)return null;rebelCity(c);return 'rebelou '+c.name},
  text:c=>{const r=rebCur();return 'Sem suprimentos por rodadas a fio, os moradores de '+c.name+' se levantaram contra você. A guarnição foi expulsa, a cidade arde e uma bandeira nova foi hasteada. '+(r.sup.length?'Há quem os apoie de fora: '+rebNames(r.sup)+'. ':'')+'O que você fará?'},
  options:[
    {k:'A',label:'Lutar contra os rebeldes',type:'both',eff:c=>'No turno do Comandante, vá até a cidade (marcada no mapa): a invasão começa quando você chegar perto. Os soldados dela são os rebeldes'+(rebCur().sup.length?' (mais soldados de '+rebNames(rebCur().sup)+')':'')+'. Seus soldados seguem com você. Vencendo, a cidade é sua de novo e não se rebela por '+REBM.cool+' rodadas (sem evento de pós-rebelião). Se você cair, os rebeldes vencem e a cidade fica independente.',
      apply:x=>{rebCur().choice='combat';rebAfter(x,'⚔ Você vai combater a rebelião de '+rebCity().name+'.')}},
    {k:'B',label:'Reconhecer a independência',type:'debuff',eff:c=>{const r=rebCur();return 'A cidade deixa de ser sua: '+(r.sup.length?'nasce uma facção nova ou uma facção que apoiou os rebeldes ('+rebNames(r.sup)+') anexa a cidade. ':'nasce uma facção nova (relação "Favorável" com você). ')+'As suas outras cidades ficam mais descontentes (+'+REBM.ups+' rodada de descontentamento).'},
      apply:x=>{const c=rebCity()||x.city;rebmLeave(c,REBM.rel,'você reconheceu a independência');const n=rebmUpset(c.id);rdNow('🏳 Você reconheceu a independência de '+c.name+'.'+(n?' As outras '+n+' cidade(s) suas ficaram mais descontentes.':''));x.toast('🏳 '+c.name+' agora é independente.',4500)}}
  ]});
