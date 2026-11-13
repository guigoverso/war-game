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
    player:(G.dg||G.office)?(r=>({x:r.x,y:r.y,z:r.z,yaw:r.yaw,pitch:P.pitch,hp:P.hp,maxhp:P.maxhp,armor:P.armor,coins:P.coins}))(G.dg?G.dg.ret:G.office.ret)   // dentro da dungeon ou do escritório, salva a posição de onde veio
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
// Regras para cada fase nova: some 1 ao SAVE_VERSION (state.js), acrescente um passo "if(d.v<N)" abaixo e só ACRESCENTE campos (ausentes = padrão).
// migrateSave devolve null se o salvamento é inutilizável; saveProblem() diz o motivo, para a janela mostrar algo melhor que "vazio".
function saveProblem(d){
  if(!d||typeof d!=='object'||Array.isArray(d))return 'corrompido';
  if(typeof d.v!=='number'||!(d.v>=1))return 'sem versão';
  if(d.v>SAVE_VERSION)return 'de uma versão mais nova do jogo';
  if(d.seed===undefined||!d.player||!d.weapons)return 'incompleto';
  return null;
}
function migrateSave(d){
  if(saveProblem(d))return null;
  if(d.v<2){d.v=2}   // v2 acrescentou inventário e durabilidade dentro de state (ausentes = padrão)
  if(d.v<3){d.v=3}   // v3 acrescentou bônus de comida, vendedores e a vara de pescar (ausentes = padrão)
  if(d.v<4){d.v=4}   // v4: armas viram itens (barra 1–6), atalhos 7–9 guardam pilhas e há cardumes de pesca (ausentes = padrão)
  if(d.v<5){d.v=5}   // v5: portais, armas lendárias, cidades queimadas e controle de raids (ausentes = padrão)
  if(d.v<6){d.v=6}   // v6: rodadas, turno do líder, tipos de cidade, rotas de caravana e capital (ausentes = padrão)
  if(d.v<7){d.v=7}   // v7: armazém por cidade (suprimentos viram itens); o estoque geral antigo de alimentos/minério/madeira é descartado
  if(d.v<8){d.v=8}   // v8: nível das cidades do jogador (rd.clv) e ações do líder gastas por tipo; ligações por estrada e litoral vêm da semente (ausentes = padrão)
  // if(d.v<9){ ...ajustes...; d.v=9 }
  return d;
}

// lê um espaço: {d} se está tudo certo, {empty:true} se vazio, {bad:'motivo'} se existe mas não pode ser usado
function readSaveEx(i){
  let raw;try{raw=localStorage.getItem(saveKey(i))}catch(e){return{empty:true}}
  if(!raw)return{empty:true};
  let j;try{j=JSON.parse(raw)}catch(e){return{bad:'corrompido'}}
  const why=saveProblem(j);if(why)return{bad:why};
  try{return{d:migrateSave(j)}}catch(e){console.error(e);return{bad:'erro ao atualizar'}}
}
function readSave(i){return readSaveEx(i).d||null}
function writeSave(i){
  try{
    let json=JSON.stringify(collectSave());
    try{const old=localStorage.getItem(saveKey(i));if(old)localStorage.setItem(saveKey(i)+'_bak',old)}catch(e){}   // cópia do salvamento anterior (um nível de desfazer)
    localStorage.setItem(saveKey(i),json);return true
  }catch(e){console.error(e);return false}
}
function deleteSave(i){try{localStorage.removeItem(saveKey(i));localStorage.removeItem(saveKey(i)+'_bak')}catch(e){}}
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
  const s=d.state||{};STATE.round=s.round===undefined?1:s.round;STATE.phase=s.phase||'commander';STATE.res=Object.assign({food:0,ore:0,wood:0},s.res||{});
  if(s.inv)STATE.inv=s.inv;if(s.dur)STATE.dur=s.dur;if(s.buffs)STATE.buffs=s.buffs;if(s.vendors)STATE.vendors=s.vendors;if(s.fishGone)STATE.fishGone=s.fishGone;
  STATE.portals=s.portals||[];STATE.portalSeq=s.portalSeq||0;STATE.portalDay=s.portalDay;STATE.legend=s.legend||{};STATE.burnt=s.burnt||{};STATE.raidDay=s.raidDay||0;STATE.raidLast=s.raidLast===undefined?-9:s.raidLast;
  if(!(s.portals&&s.portals.length)&&s.portalDay===undefined)STATE.portalDay=undefined;   // salvamento antigo: os portais nascem na hora
  if(s.rd)STATE.rd=s.rd;   // rodadas: tipos de cidade, entregas, rotas, nível da capital (o que faltar é completado por initEconomy)
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
      const rs=readSaveEx(i),d=rs.d||null,row=document.createElement('div');row.className='saverow';
      const info=document.createElement('div');info.className='saveinfo';
      info.innerHTML='<b>Espaço '+i+'</b><br><span>'+(d?saveSummary(d):rs.bad?'⚠ salvamento '+rs.bad+' (não pode ser carregado)':'vazio')+'</span>';
      row.appendChild(info);
      if(SaveUI.mode==='game'){
        row.appendChild(UI.button('Salvar','gold',()=>{
          const doSave=()=>{if(writeSave(i)){toast('💾 Jogo salvo no espaço '+i,2000)}else toast('Não foi possível salvar (armazenamento cheio ou bloqueado)',3000);SaveUI.render()};
          if(d||rs.bad)UI.confirm('Sobrescrever o espaço '+i+'?',doSave,'Sobrescrever');else doSave();
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
