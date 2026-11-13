'use strict';
// ---------- Cozinha: fogueiras de acampamento e taverna (Fase 2) ----------
// Receitas em DATA.recipes. A fogueira só faz as receitas simples (station:'fire'); a taverna faz todas.
function invCountTag(tag){let n=0;for(const s of STATE.inv.slots){if(s){const d=itemDef(s.id);if(d.tags&&d.tags.includes(tag))n+=s.n}}return n}
// remove n itens de um tag, começando pelos de menor valor (gasta o peixe barato primeiro)
function invRemoveTag(tag,n){
  const ids=[...new Set(STATE.inv.slots.filter(s=>s&&(itemDef(s.id).tags||[]).includes(tag)).map(s=>s.id))].sort((a,b)=>itemDef(a).value-itemDef(b).value);
  let left=n;for(const id of ids){if(left<=0)break;left-=invRemove(id,Math.min(left,invCount(id)))}
}
const ingHave=g=>g.tag?invCountTag(g.tag):invCount(g.id);
const ingName=g=>g.tag==='fish'?'Qualquer peixe':itemDef(g.id).name;
const ingIcon=g=>g.tag==='fish'?'🐟':itemDef(g.id).icon;
function canCook(r){return r.ing.every(g=>ingHave(g)>=g.n)}
function recipeOpen(r,kind){return r.station==='fire'||kind==='tavern'}
function cook(rid){
  const r=DATA.recipes[rid];if(!r||!recipeOpen(r,G.cookKind)||!canCook(r))return false;
  for(const g of r.ing){if(g.tag)invRemoveTag(g.tag,g.n);else invRemove(g.id,g.n)}
  const txt=invGive([[r.out,1]]);sfx('coin',0);toast('🍳 '+r.name+' pronto! '+txt,2500);return true;
}
function openCooking(kind){G.cookKind=kind;openPanel('cook');renderCooking()}
function renderCooking(){
  const kind=G.cookKind;
  $('cookinfo').textContent=kind==='tavern'?'Taverna — todas as receitas':'Fogueira — só receitas simples (as outras exigem a taverna)';
  $('cookbody').innerHTML=Object.values(DATA.recipes).map(r=>{
    const open=recipeOpen(r,kind),ok=open&&canCook(r),out=itemDef(r.out);
    const ing=r.ing.map(g=>'<span style="color:'+(ingHave(g)>=g.n?'#8aff8a':'#ff8a8a')+'">'+ingIcon(g)+' '+ingName(g)+' '+Math.min(ingHave(g),g.n)+'/'+g.n+'</span>').join(' • ');
    return '<div class="card'+(open?'':' locked')+'"><b>'+r.icon+' '+r.name+'</b><div class="st">'+out.desc+'<br>'+ing+(open?'':'<br><i>Só na taverna</i>')+'</div><button class="gold" data-r="'+r.id+'" '+(ok?'':'disabled')+'>Cozinhar</button></div>';
  }).join('');
}
