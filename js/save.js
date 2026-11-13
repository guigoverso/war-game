'use strict';
// ---------- Salvar e carregar ----------
// O mundo (terreno, cidades, estradas) é refeito pela semente; o que muda no jogo é guardado por cima como "deltas":
// jogador, armas, exército, cidades conquistadas, acampamentos, baús, missões, hora do dia e o STATE (recursos, rodada...).
// Limite conhecido: soldados e animais vivos não são guardados com posição; ao carregar, o mundo nasce com os habitantes iniciais.
const SAVE_SLOTS=3;
const saveKey=i=>'fc_save_'+i;
const chestKey=ch=>Math.round(ch.x)+','+Math.round(ch.z);

function collectSave(){
  const army=Object.assign({},ARMY);delete army.city;
  const qa=QUEST.active?Object.assign({},QUEST.active):null;if(qa)delete qa.camp;
  return {
    v:SAVE_VERSION,savedAt:new Date().toISOString(),seed:WORLD.seed,bio:G.startBio||'',creative:!!G.creative,
    flags:{god:!!G.god,infAmmo:!!G.infAmmo,noReload:!!G.noReload,won:!!G.won},
    player:G.dg?{x:G.dg.ret.x,y:G.dg.ret.y,z:G.dg.ret.z,yaw:G.dg.ret.yaw,pitch:P.pitch,hp:P.hp,maxhp:P.maxhp,armor:P.armor,coins:P.coins}   // dentro da dungeon, salva a posição do portal
      :{x:P.x,y:P.y,z:P.z,yaw:P.yaw,pitch:P.pitch,hp:P.hp,maxhp:P.maxhp,armor:P.armor,coins:P.coins},
    weapons:{owned:WS.owned.slice(),mag:WS.mag.slice(),reserve:WS.reserve.slice(),cur:WS.cur},
    army,allies:allyCount(),
    cities:WORLD.cities.map(c=>({id:c.id,owner:c.owner})),
    camps:WORLD.camps.map(c=>({id:c.id,gone:!!c.gone,goneAt:c.goneAt,completed:!!c.completed,cleared:c.state==='cleared',cageOpened:!!(c.cage&&c.cage.opened)})),
    chests:WORLD.chests.filter(c=>c.opened).map(chestKey),
    quests:{counter:QUEST.counter,boards:QUEST.boards,done:QUEST.done,active:qa},
    time:{t:DN.t,days:DN.days},
    state:JSON.parse(JSON.stringify(STATE))
  };
}

// migra um salvamento antigo para a versão atual (cada versão nova acrescenta um passo aqui)
function migrateSave(d){
  if(!d||typeof d!=='object')return null;
  if(d.v>SAVE_VERSION)return null;          // salvamento de uma versão mais nova que o jogo
  if(d.v<2){d.v=2}   // v2 acrescentou inventário e durabilidade dentro de state (ausentes = padrão)
  if(d.v<3){d.v=3}   // v3 acrescentou bônus de comida, vendedores e a vara de pescar (ausentes = padrão)
  if(d.v<4){d.v=4}   // v4: armas viram itens (barra 1–6), atalhos 7–9 guardam pilhas e há cardumes de pesca (ausentes = padrão)
  if(d.v<5){d.v=5}   // v5: portais, armas lendárias, cidades queimadas e controle de raids (ausentes = padrão)
  // if(d.v<6){ ...ajustes...; d.v=6 }
  return d;
}

function readSave(i){
  try{const raw=localStorage.getItem(saveKey(i));if(!raw)return null;return migrateSave(JSON.parse(raw))}catch(e){return null}
}
function writeSave(i){
  try{localStorage.setItem(saveKey(i),JSON.stringify(collectSave()));return true}catch(e){console.error(e);return false}
}
function deleteSave(i){try{localStorage.removeItem(saveKey(i))}catch(e){}}
function saveSummary(d){
  if(!d)return null;
  const dt=new Date(d.savedAt),cities=(d.cities||[]).filter(c=>c.owner==='player').length;
  return dt.toLocaleDateString('pt-BR')+' '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+' • semente '+d.seed+' • rodada '+((d.state&&d.state.round)||1)+' • ◉ '+Math.floor(d.player.coins)+' • cidades '+cities+'/'+(d.cities||[]).length+(d.creative?' • criativo':'');
}

// aplica um salvamento depois que o mundo da semente foi gerado e povoado
function applySave(d){
  const f=d.flags||{};
  G.won=!!f.won;G.god=!!f.god;G.infAmmo=!!f.infAmmo;G.noReload=!!f.noReload;
  // estado geral (recursos, rodada...)
  resetState();
  const s=d.state||{};STATE.round=s.round||1;STATE.phase=s.phase||'commander';STATE.res=Object.assign({food:0,ore:0,wood:0},s.res||{});
  if(s.inv)STATE.inv=s.inv;if(s.dur)STATE.dur=s.dur;if(s.buffs)STATE.buffs=s.buffs;if(s.vendors)STATE.vendors=s.vendors;if(s.fishGone)STATE.fishGone=s.fishGone;
  STATE.portals=s.portals||[];STATE.portalSeq=s.portalSeq||0;STATE.portalDay=s.portalDay;STATE.legend=s.legend||{};STATE.burnt=s.burnt||{};STATE.raidDay=s.raidDay||0;STATE.raidLast=s.raidLast===undefined?-9:s.raidLast;
  if(!(s.portals&&s.portals.length)&&s.portalDay===undefined)STATE.portalDay=undefined;   // salvamento antigo: os portais nascem na hora
  normalizeInv();refreshBuffs();   // inventário e durabilidade (salvamentos antigos usam os padrões)
  // cidades conquistadas
  for(const sc of d.cities||[]){
    const c=WORLD.cities[sc.id];if(!c||sc.owner!=='player'||c.owner==='player')continue;
    c.owner='player';c.state='conquered';c.flagMat.color.setHex(0x2a6aff);
    for(const e of c.enemies)if(e.alive){e.alive=false;e.gone=true;scene.remove(e.group)}
    c.aliveEnemies=0;
  }
  // acampamentos
  for(const sc of d.camps||[]){
    const c=WORLD.camps.find(k=>k.id===sc.id);if(!c)continue;
    if(sc.gone&&!c.gone){despawnCamp(c);c.goneAt=sc.goneAt;continue}
    if(c.gone)continue;
    if(sc.cleared&&c.state!=='cleared'){
      for(const e of c.enemies)if(e.alive){e.alive=false;e.gone=true;scene.remove(e.group)}
      c.aliveEnemies=0;c.state='cleared';c.flagMat.color.setHex(0x2a6aff);
    }
    if(sc.cageOpened&&c.cage&&!c.cage.opened){
      const cg=c.cage;cg.opened=true;cg.box.y0=-50;cg.box.y1=-49;cg.t=1;cg.door.rotation.y=cg.yb+cg.th;
      const h=c.hostage;if(h&&h.alive){h.alive=false;h.gone=true;scene.remove(h.group)}
    }
    c.completed=!!sc.completed;
  }
  // baús abertos
  const open=new Set(d.chests||[]);
  for(const ch of WORLD.chests)if(open.has(chestKey(ch))){ch.opened=true;ch.open=1;ch.lid.rotation.x=-1.9}
  // missões
  const q=d.quests||{};
  QUEST.counter=q.counter||{};QUEST.boards=q.boards||{};QUEST.done=q.done||0;QUEST.active=null;
  if(q.active){
    const camp=q.active.campId!==undefined?WORLD.camps.find(k=>k.id===q.active.campId&&!k.gone):null;
    if(q.active.type==='delivery'||camp){
      QUEST.active=Object.assign({},q.active,{camp:camp||undefined});
      if(camp){camp.questTarget=true;camp.name='Acampamento dos '+q.active.gang}
    }
  }
  // hora do dia
  if(d.time){DN.t=d.time.t;DN.days=d.time.days}
  // jogador
  const p=d.player;
  P.x=p.x;P.y=p.y;P.z=p.z;P.yaw=p.yaw;P.pitch=p.pitch;P.hp=p.hp;P.maxhp=p.maxhp;P.armor=p.armor;P.coins=p.coins;
  P.vx=P.vz=P.vy=0;P.camY=P.y;P.dead=false;P.crouch=false;
  // armas
  const w=d.weapons;
  WS.owned=w.owned.slice();WS.mag=w.mag.slice();WS.reserve=w.reserve.slice();WS.cur=w.cur;WS.rod=false;WS.none=false;
  reconcileWeapons();   // as armas viram itens (barra 1–6 ou bolsa) se o salvamento for antigo; depois equipa uma válida
  if(STATE.inv.wbar.includes(wItemId(w.cur)))selectWeapon(w.cur);
  // exército
  Object.assign(ARMY,d.army||{});ARMY.city=null;
  const hm=WORLD.home,bk=hm.barracks||{x:hm.cx,z:hm.cz};
  for(let i=0;i<(d.allies||0);i++){const a=spawnAlly(bk.x,bk.z,hm);if(ARMY.vest)giveAllyVest(a)}
  applyArmyStats();
  buildNav();   // as mudanças (acampamentos removidos, cidades conquistadas) alteram a navegação
}

// ---------- janela de salvar/carregar ----------
const SaveUI={
  win:null,mode:'game',
  open(mode){
    SaveUI.mode=mode||'game';
    if(!SaveUI.win)SaveUI.win=UI.window({title:'💾 Salvar e carregar',width:520,z:40,buttons:[{label:'Fechar',cls:'gold'}]});
    SaveUI.render();SaveUI.win.open();
  },
  render(){
    const body=SaveUI.win.body;body.innerHTML='';
    const note=document.createElement('p');
    note.textContent=SaveUI.mode==='game'?'Escolha um espaço para salvar ou carregar. Soldados e animais vivos nascem de novo ao carregar.':'Escolha um jogo salvo para continuar.';
    body.appendChild(note);
    for(let i=1;i<=SAVE_SLOTS;i++){
      const d=readSave(i),row=document.createElement('div');row.className='saverow';
      const info=document.createElement('div');info.className='saveinfo';
      info.innerHTML='<b>Espaço '+i+'</b><br><span>'+(d?saveSummary(d):'vazio')+'</span>';
      row.appendChild(info);
      if(SaveUI.mode==='game'){
        row.appendChild(UI.button('Salvar','gold',()=>{
          const doSave=()=>{if(writeSave(i)){toast('💾 Jogo salvo no espaço '+i,2000)}else toast('Não foi possível salvar (armazenamento cheio ou bloqueado)',3000);SaveUI.render()};
          if(d)UI.confirm('Sobrescrever o espaço '+i+'?',doSave,'Sobrescrever');else doSave();
        }));
      }
      const lb=UI.button('Carregar','alt',()=>{
        const go=()=>loadSlot(i);
        if(SaveUI.mode==='game')UI.confirm('Carregar o espaço '+i+'? O progresso não salvo será perdido.',go,'Carregar');else go();
      });
      if(!d)lb.disabled=true;row.appendChild(lb);
      const db=UI.button('Apagar','red',()=>UI.confirm('Apagar o espaço '+i+'?',()=>{deleteSave(i);SaveUI.render()},'Apagar'));
      if(!d)db.disabled=true;row.appendChild(db);
      body.appendChild(row);
    }
  }
};

// carrega um espaço: se já há partida em andamento, recarrega a página e inicia direto do salvamento
function loadSlot(i){
  const d=readSave(i);if(!d){toast('Espaço vazio ou salvamento incompatível',2500);return}
  try{sessionStorage.setItem('fc_loadslot',String(i))}catch(e){}
  if(G.running)location.reload();else startFromSave(i);
}
function startFromSave(i){
  const d=readSave(i);if(!d)return;
  $('seed').value=String(d.seed);$('biosel').value=d.bio||'';
  if(SaveUI.win)SaveUI.win.close();
  startGame(!!d.creative,d);
}
