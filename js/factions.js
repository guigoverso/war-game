'use strict';
// ---------- Facções (Fase 5, F1): de quem é cada cidade ----------
// As facções NPC nascem da SEMENTE do mundo (nome, cor, bandeira, temperamento e cidades), então não vão para o save; só a identidade do jogador (STATE.fac).
// c.owner continua dizendo a relação com o jogador ('player' | 'enemy') e c.fid diz de qual facção a cidade é (0 = a do jogador).
// c.fid é derivado: cidade do jogador → 0; senão a facção de origem (c.ofid). Rebelião devolve a cidade à de origem. (Um dia owner pode sair; ver docs/fase-5-facoes.md.)
const FAC_MIN_NPC=2,FAC_MAX_NPC=4;
const FAC_COLORS=[{n:'Azul',c:0x2a6aff},{n:'Vermelho',c:0xd8322a},{n:'Verde',c:0x2aa04a},{n:'Amarelo',c:0xe8b820},{n:'Roxo',c:0x8a3ac8},{n:'Ciano',c:0x20b0c8},{n:'Laranja',c:0xe87820},{n:'Rosa',c:0xd0409a},{n:'Marrom',c:0x8a5a2a},{n:'Cinza',c:0x8a8a8a}];
// temperamento: multiplicador do que muda a relação (ganho/perda), para a F2; a pacífica nunca declara guerra (Fase 6)
const FAC_TEMPER={pacifica:{n:'Pacífica',gain:1.5,loss:0.5},neutra:{n:'Neutra',gain:1,loss:1},agressiva:{n:'Agressiva',gain:0.5,loss:1.5}};
const FAC_KINDS=['Reino','Ordem','Liga','Clã','Legião','Casa','Aliança','Império','Guilda','Confraria'];
const FAC_EPITH=['do Corvo','da Aurora','de Ferro','das Brumas','do Leão','da Serpente','do Trovão','dos Pinheiros','da Lua','do Sol','do Lobo','da Rosa','dos Ventos','do Falcão','da Tempestade'];
// 20 bandeiras prontas (grade 8×5): '.' = cor principal, '#' = cor de contraste
const FAC_FLAGS=[
  ['........','........','........','........','........'],
  ['........','........','########','........','........'],
  ['...##...','...##...','...##...','...##...','...##...'],
  ['...##...','...##...','########','...##...','...##...'],
  ['#.......','.#......','..#.....','...#....','....#...'],
  ['########','........','........','........','########'],
  ['####....','####....','####....','####....','####....'],
  ['########','########','........','........','........'],
  ['........','..####..','..####..','..####..','........'],
  ['#.#.#.#.','.#.#.#.#','#.#.#.#.','.#.#.#.#','#.#.#.#.'],
  ['#.......','###.....','#####...','###.....','#.......'],
  ['...##...','..####..','.######.','..####..','...##...'],
  ['#.#.#.#.','#.#.#.#.','#.#.#.#.','#.#.#.#.','#.#.#.#.'],
  ['########','........','########','........','########'],
  ['########','#......#','#......#','#......#','########'],
  ['#......#','.#....#.','..#..#..','.#....#.','#......#'],
  ['..####..','.######.','.######.','.######.','..####..'],
  ['####....','####....','........','........','........'],
  ['..##....','..##....','########','..##....','..##....'],
  ['...###..','..###...','.###....','###.....','##......']
];
const FAC_NAME_DEFAULT='Minha facção';
const FAC_W=32,FAC_H=20;   // a bandeira é uma grade de 32×20 pixels: -1 = cor principal da facção, senão 0xRRGGBB
Hooks.on('resetState',()=>{STATE.fac={name:FAC_NAME_DEFAULT,color:0,flag:0,px:null}});   // px: desenho do jogador (null = o desenho pronto 'flag'); npcColors: cores sorteadas das NPC (guardadas para o mundo reaparecer igual)

// identidade de uma facção por id: 0 = jogador (vem do STATE), 1.. = NPC (vem de WORLD.factions)
function facOf(id){
  if(id===0||id===undefined){const f=STATE.fac||{};return{id:0,player:true,name:f.name||FAC_NAME_DEFAULT,color:f.color||0,flag:f.flag||0,temper:null}}
  return(WORLD.factions||[]).find(f=>f.id===id)||null;
}
const facColor=id=>{const f=facOf(id);return f?FAC_COLORS[f.color].c:null};
const facCities=id=>WORLD.cities.filter(c=>c.fid===id);
const facTemperName=f=>f&&f.temper?FAC_TEMPER[f.temper].n:'';

// gera as facções NPC e reparte as cidades (chamado pelo gerador do mundo, logo depois de criar as cidades)
function genFactions(){
  const cities=WORLD.cities,home=WORLD.home,rng=new RNG((WORLD.seed*2654435761+7)>>>0);
  const npc=cities.filter(c=>c!==home),n=Math.min(npc.length,rng.int(FAC_MIN_NPC,FAC_MAX_NPC));
  // uma cidade-semente por facção, o mais afastadas possível; as demais vão para a semente mais próxima (toda facção fica com pelo menos 1 cidade)
  const dist=(a,b)=>Math.hypot(a.cx-b.cx,a.cz-b.cz),seeds=[rng.pick(npc)];
  while(seeds.length<n){let best=null,bd=-1;for(const c of npc){if(seeds.includes(c))continue;const d=Math.min(...seeds.map(s=>dist(s,c)));if(d>bd){bd=d;best=c}}seeds.push(best)}
  // temperamentos: com 3 ou 4 facções NPC há ao menos uma pacífica e uma agressiva; o resto sorteia (25/50/25)
  const roll=()=>{const r=rng.r();return r<0.25?'pacifica':r<0.75?'neutra':'agressiva'};
  const temps=n>=3?['pacifica','agressiva']:[];while(temps.length<n)temps.push(roll());rng.shuffle(temps);
  // cores (sem repetir a do jogador), bandeiras e nomes sem repetição
  const pcol=(STATE.fac&&STATE.fac.color)||0,sorted=rng.shuffle(FAC_COLORS.map((_,i)=>i).filter(i=>i!==pcol)),flags=rng.shuffle(FAC_FLAGS.map((_,i)=>i)),used=new Set();
  const sv=STATE.fac&&STATE.fac.npcColors,cols=sv&&sv.length>=n?sv:sorted;if(STATE.fac)STATE.fac.npcColors=cols.slice(0,n);   // salvo: o jogador pode trocar de cor depois sem mudar as das NPC
  const mkName=()=>{for(let t=0;t<60;t++){const s=rng.pick(FAC_KINDS)+' '+rng.pick(FAC_EPITH);if(!used.has(s)){used.add(s);return s}}return 'Facção '+(used.size+1)};
  WORLD.factions=seeds.map((s,i)=>({id:i+1,name:mkName(),color:cols[i],flag:flags[i],temper:temps[i],seed:s.id}));
  for(const c of cities){
    c.ofid=c===home?0:1+seeds.reduce((bi,s,i)=>dist(c,s)<dist(c,seeds[bi])?i:bi,0);
    Object.defineProperty(c,'fid',{get(){return this.owner==='player'?0:this.ofid},configurable:true});
  }
}

// ---------- bandeira: desenho em pixels (32×20) e textura ----------
const facAlt=main=>(((main>>16)&255)*0.3+((main>>8)&255)*0.59+(main&255)*0.11)/255>0.55?0x222222:0xffffff;   // cor de contraste dos desenhos prontos
const hex6=n=>'#'+n.toString(16).padStart(6,'0');
// desenho pronto (8×5) ampliado para a grade 32×20
function facPresetPx(i,main){
  const alt=facAlt(main),a=new Array(FAC_W*FAC_H).fill(-1);
  FAC_FLAGS[i].forEach((row,y)=>{for(let x=0;x<8;x++)if(row[x]==='#')for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++)a[(y*4+dy)*FAC_W+x*4+dx]=alt});
  return a;
}
function facPx(id){
  const f=facOf(id);if(!f)return new Array(FAC_W*FAC_H).fill(-1);
  if(f.player){const px=STATE.fac&&STATE.fac.px;return Array.isArray(px)&&px.length===FAC_W*FAC_H?px:facPresetPx(f.flag,FAC_COLORS[f.color].c)}
  return f._px||(f._px=facPresetPx(f.flag,FAC_COLORS[f.color].c));
}
// desenha a bandeira (cor principal por baixo, pixels por cima) num canvas
function facDraw(g,px,main,cell){
  g.fillStyle=hex6(main);g.fillRect(0,0,FAC_W*cell,FAC_H*cell);
  for(let i=0;i<px.length;i++)if(px[i]>=0){g.fillStyle=hex6(px[i]);g.fillRect((i%FAC_W)*cell,Math.floor(i/FAC_W)*cell,cell,cell)}
}
function facFlagCanvas(id,cell){const f=facOf(id),cv=document.createElement('canvas');cv.width=FAC_W*cell;cv.height=FAC_H*cell;facDraw(cv.getContext('2d'),facPx(id),FAC_COLORS[f?f.color:0].c,cell);return cv}
const facFlagURL=(id,cell)=>facFlagCanvas(id,cell||4).toDataURL();
const FAC_TEX={};let facPVer=0,facPTex=null;   // NPC: textura em cache por facção; jogador: refeita quando a identidade muda (facTouch)
function facFlagTex(id){
  const mk=()=>{const t=new THREE.CanvasTexture(facFlagCanvas(id,4));t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;return t};
  if(!id){if(!facPTex||facPTex.ver!==facPVer){if(facPTex)facPTex.tex.dispose();facPTex={ver:facPVer,tex:mk()}}return facPTex.tex}
  return FAC_TEX[id]||(FAC_TEX[id]=mk());
}
const facTouch=()=>{facPVer++};
// aplica a bandeira da facção atual da cidade (material branco + textura)
function facSetFlag(c){
  if(!c.flagMat)return;
  c.flagMat.map=facFlagTex(c.fid);c.flagMat.color.setHex(0xffffff);c.flagMat.needsUpdate=true;
}
// recolore todas as bandeiras (depois de carregar um save ou de o jogador mudar a identidade)
function refreshFactionLook(){facTouch();for(const c of WORLD.cities)facSetFlag(c);facReskin()}
// troca o uniforme dos guardas (portão e quartel) e dos soldados do jogador para a cor da facção atual (conquista, rebelião, nova cor)
function facReskin(){
  const swap=(n,col)=>{
    if(!col||!n.look||n.look.shirt===col||!n.group||n.alive===false)return;
    const L=Object.assign({},n.look,{shirt:col}),m=buildHuman(L),old=n.group;
    m.group.position.copy(old.position);m.group.rotation.copy(old.rotation);
    if(n.model&&n.model.arms)m.arms.forEach((a,i)=>{if(n.model.arms[i])a.rotation.x=n.model.arms[i].rotation.x});   // mantém a pose (arma erguida)
    if(n.bubble){old.remove(n.bubble);m.group.add(n.bubble)}
    scene.remove(old);scene.add(m.group);n.group=m.group;n.model=m;n.look=L;
    if(n.vested){n.vested=false;const ar=n.armor;giveAllyVest(n);n.armor=ar}   // soldado com colete: refaz o colete no novo modelo
  };
  if(typeof NPCS!=='undefined')for(const n of NPCS)if(n.role==='guard'&&n.city&&n.city.fid!==undefined)swap(n,facColor(n.city.fid));
  if(typeof ALLIES!=='undefined')for(const a of ALLIES)swap(a,facColor(0));
}
// cor em uso por outra facção que ainda tem cidades (não dá para o jogador pegá-la; destruída = livre)
function facColorOwner(i){return(WORLD.factions||[]).find(f=>f.color===i&&WORLD.cities.some(c=>c.fid===f.id))||null}
// muda a identidade do jogador (nome, cor e desenho) e atualiza o mundo
function facSetIdentity(o){
  const f=STATE.fac||(STATE.fac={});
  if(o.name!==undefined)f.name=String(o.name).trim().slice(0,24)||FAC_NAME_DEFAULT;
  if(o.color!==undefined)f.color=o.color;
  if(o.px!==undefined)f.px=o.px;
  if(typeof WORLD!=='undefined'&&WORLD.cities&&WORLD.cities.length&&WORLD.cities[0].flagMat)refreshFactionLook();else facTouch();
}

// ---------- Relações com as facções NPC (Fase 5, F2) ----------
// STATE.rel[fid] = {v:0..10, ally, war, debt:{amt,from}, warAt, crimeRd}. O status sai do valor e dos marcadores:
//  Aliado (ally, exige v=10 + acordo) • Favorável 8–10 • Neutro 4–7 • Desfavorável 1–3 • Inimiga 0 • Em guerra (war, v=0 por declaração)
const REL_MAX=10,REL_START=5;
const REL_ST={
  ally:{n:'Aliado',col:'#5ad0ff',price:-0.2,txt:'Lojas dela com 20% de desconto. Só existe com relação 10 e acordo; cair abaixo de 10 desfaz a aliança.'},
  fav:{n:'Favorável',col:'#6ad06a',price:-0.1,txt:'Lojas dela com 10% de desconto. Com relação 10 dá para negociar uma aliança (turno do líder).'},
  neutral:{n:'Neutro',col:'#e0e0e0',price:0,txt:'Preços normais, caravanas permitidas.'},
  unfav:{n:'Desfavorável',col:'#ffb060',price:0.3,txt:'Lojas dela com 30% de acréscimo. Caravanas permitidas.'},
  enemy:{n:'Inimiga',col:'#ff7a7a',price:0,txt:'Você não pode entrar nas cidades dela: os guardas atiram. Sem caravanas. Para melhorar: ouro, relíquias (e missões, em breve).'},
  war:{n:'Em guerra',col:'#ff3030',price:0,txt:'Você só entra nas cidades dela atacando-as ([F] perto da cidade). Sem caravanas.'}
};
Hooks.on('resetState',()=>{STATE.rel={}});
function relOf(fid){const R=STATE.rel||(STATE.rel={});return R[fid]||(R[fid]={v:REL_START,ally:false,war:false,debt:null,warAt:null,crimeRd:-1})}
function relStatus(fid){
  if(!fid)return 'own';
  const r=relOf(fid);
  if(r.war)return 'war';
  if(r.ally&&r.v>=REL_MAX)return 'ally';
  return r.v>=8?'fav':r.v>=4?'neutral':r.v>=1?'unfav':'enemy';
}
const facTradeOK=fid=>!fid||['unfav','neutral','fav','ally'].includes(relStatus(fid));   // caravanas: de Desfavorável para cima
function facNote(msg,ms){if(typeof toast==='function')toast(msg,ms||4000);const rd=STATE.rd;if(rd&&rd.report)rd.report.push(msg)}

// as caravanas com uma facção acabam quando ela vira inimiga, em guerra, ou quando a aliança/comércio se perde
function facCutCaravans(fid){
  const rd=STATE.rd;if(!rd||!rd.routes)return 0;
  const cut=rd.routes.filter(r=>WORLD.cities[r.a].fid===fid||WORLD.cities[r.b].fid===fid);
  if(!cut.length)return 0;
  rd.routes=rd.routes.filter(r=>!cut.includes(r));
  if(typeof CARAVANS!=='undefined')for(const c of CARAVANS)if(cut.includes(c.r))c.doomed=true;   // as carroças ficam na estrada até o turno acabar (purgeDoomedCaravans, rounds.js)
  if(typeof computeBuffs==='function')computeBuffs();
  facNote('🛒 As caravanas com '+facOf(fid).name+' foram desfeitas (as carroças somem quando o turno acabar).');
  return cut.length;
}
// efeitos de uma mudança de status
function relEffects(fid,before,after){
  if(before===after)return;
  const f=facOf(fid);
  if(before==='ally'&&after!=='ally')facNote('🤝 A aliança com '+f.name+' acabou.');
  if(after==='enemy'||after==='war'||before==='ally')facCutCaravans(fid);
  if(after!=='ally'&&after!=='war')facNote(f.name+': agora '+REL_ST[after].n.toLowerCase()+'.',3000);
}
// muda a relação por ações (ganho/perda pesam pelo temperamento; mínimo de 1 ponto)
function relChange(fid,delta){
  const r=relOf(fid),f=facOf(fid);if(!f||r.war)return 0;
  const T=FAC_TEMPER[f.temper||'neutra'],m=delta>0?T.gain:T.loss,d=Math.sign(delta)*Math.max(1,Math.round(Math.abs(delta)*m));
  const before=relStatus(fid);r.v=Math.max(0,Math.min(REL_MAX,r.v+d));if(r.ally&&r.v<REL_MAX)r.ally=false;
  relEffects(fid,before,relStatus(fid));return d;
}
function relSet(fid,v){const r=relOf(fid),before=relStatus(fid);r.v=Math.max(0,Math.min(REL_MAX,v));if(r.ally&&r.v<REL_MAX)r.ally=false;if(r.war&&v>0)r.war=false;relEffects(fid,before,relStatus(fid))}
// aliança (acordo; exige relação 10) e guerra (declaração)
// poder de uma facção = soma de (1 + nível) das cidades dela; o jogador usa o nível da capital/cidades evoluídas, as NPC o nível pelo rank (1–6 → 1–3)
ECON.ally={base:1500,min:0.4,max:3};   // aliança: custo base ◉1500 quando os poderes se igualam; vai de 0,4× (você muito mais forte) a 3× (muito mais fraco)
function facPower(fid){
  let p=0;
  for(const c of WORLD.cities){if(c.fid!==fid)continue;const lvl=fid===0?(c.home?STATE.rd.lvl:cityLvl(c)):Math.max(1,Math.ceil((c.rank||1)/2));p+=1+lvl}
  return p;
}
function facAllyCost(fid){
  const me=facPower(0),them=facPower(fid),k=ECON.ally,ratio=Math.max(k.min,Math.min(k.max,them/Math.max(1,me)));
  return{me,them,ratio,cost:Math.round(k.base*ratio/50)*50};
}
function facAlly(fid){
  const r=relOf(fid);if(r.v<REL_MAX||r.war||r.ally)return false;
  if(!canAct('ally')){if(typeof toast==='function')toast('Sem ações do líder nesta rodada.',2500);return false}   // fechar aliança é uma ação do líder
  const a=facAllyCost(fid);if(!Ledger.spend({gold:a.cost})){if(typeof toast==='function')toast('Ouro insuficiente para a aliança (◉'+a.cost+').',2500);return false}
  spendAct('ally');r.ally=true;facNote('🤝 Aliança fechada com '+facOf(fid).name+' por ◉'+a.cost+': lojas dela com 20% de desconto.');return true;
}
// pedir paz: custa o valor da reparação registrada (r.debt); depois será a base do preço da paz conforme o andamento da guerra (Fase 6)
function facAskPeace(fid){
  const r=relOf(fid),f=facOf(fid);if(!r.war)return false;
  const amt=r.debt?r.debt.amt:REL_REP.neutral;
  if(!Ledger.spend({gold:amt})){if(typeof toast==='function')toast('Ouro insuficiente para a paz (◉'+amt+').',2500);return false}
  r.war=false;r.debt=null;r.warAt=null;r.ally=false;r.v=REL_START;
  facNote('🕊 Paz com '+f.name+' por ◉'+amt+'. A relação volta a 5 (neutro).');return true;
}
function facDeclareWar(fid,byThem){
  const r=relOf(fid),before=relStatus(fid);r.war=true;r.v=0;r.ally=false;r.warAt=null;
  if(!r.debt)r.debt={amt:REL_REP[before]||REL_REP.neutral,from:before};   // o valor registrado é o preço da paz (e base do preço futuro)
  facNote(byThem?'⚔ '+facOf(fid).name+' declarou guerra a você!':'⚔ Você declarou guerra a '+facOf(fid).name+'. Agora você só entra nas cidades dela atacando.',5000);
  facCutCaravans(fid);relEffects(fid,before,'war');
  for(const c of WORLD.cities)if(c.fid===fid&&c.owner==='enemy'&&c.state==='idle')facRespawnGuards(c);   // a guerra começa com a cidade guarnecida de novo
}
function facPeace(fid){const r=relOf(fid);r.war=false;r.v=REL_START;r.warAt=null;facNote('🕊 Paz com '+facOf(fid).name+' (relação 5).')}   // a paz de verdade é da Fase 6; hoje só pelo modo criativo
// crime: o jogador feriu alguém numa cidade que não está em guerra com ele. Cai um degrau por rodada por facção:
//  aliado → neutro(5) • favorável/neutro/desfavorável → inimiga(0) • inimiga → guerra na rodada seguinte (a pacífica não declara guerra)
const REL_REP={ally:1000,fav:1500,neutral:2000,unfav:2000,enemy:4000};
// declaração de guerra prevista (crime/massacre): devolve o id da facção com a data mais antiga já vencida, ou null
function facWarDue(){
  const R=STATE.rel||{};let best=null,at=1e9;
  for(const id in R){const r=R[id];if(r.warAt!=null&&!r.war&&STATE.round>=r.warAt&&r.warAt<at){at=r.warAt;best=+id}}
  return best;
}
function facCrime(c){
  const fid=c.fid;if(!fid||c.owner!=='enemy')return;
  const st=relStatus(fid);if(st==='war')return;
  const r=relOf(fid),f=facOf(fid);
  if(r.crimeRd===STATE.round)return;r.crimeRd=STATE.round;r.crimeCity=c.name;
  const amt=REL_REP[st];
  r.debt=r.debt?{amt:Math.max(r.debt.amt,amt),from:r.debt.from}:{amt,from:st};
  if(st==='ally'){r.ally=false;r.v=REL_START}
  else if(st==='enemy'){
    if(f.temper!=='pacifica'){r.warAt=STATE.round+1;r.warWhy='crimes';r.warCity=c.name;facNote('🚨 Crime em '+c.name+': '+f.name+' vai declarar guerra na próxima rodada. Reparação: ◉'+r.debt.amt+'.',5000)}
    else facNote('🚨 Crime em '+c.name+': '+f.name+' é pacífica e não declara guerra, mas exige reparação (◉'+r.debt.amt+').',5000);
  }else r.v=0;
  if(st!=='enemy')facNote('🚨 Crime em '+c.name+': '+f.name+' agora é '+REL_ST[relStatus(fid)].n.toLowerCase()+'. Reparação: ◉'+r.debt.amt+'.',5000);
  facCutCaravans(fid);if(st==='ally')facNote('🤝 A aliança com '+f.name+' acabou.');
}
// o jogador acabou com os soldados de uma cidade que não estava em guerra: a facção (exceto a pacífica) declara guerra na rodada seguinte
function facCityEmptied(c){
  const fid=c.fid;if(!fid||relStatus(fid)==='war')return;
  const r=relOf(fid),f=facOf(fid);
  if(f.temper==='pacifica'){facNote('🛡 Você eliminou os soldados de '+c.name+'. '+f.name+' é pacífica e não declara guerra, mas exige reparação.',4500);return}
  if(r.warAt==null){
    r.warAt=STATE.round+1;r.warWhy='massacre';r.warCity=c.name;r.v=0;r.ally=false;facCutCaravans(fid);
    facNote('⚔ Você eliminou os soldados de '+c.name+': '+f.name+' vai declarar guerra na próxima rodada.'+(r.debt?' Reparação: ◉'+r.debt.amt+' (a agressiva recusa).':''),5500);
  }
}
// soldados de uma cidade em guerra renascem no começo da rodada: os mortos dão lugar a novos, nos postos de origem
function facRespawnGuards(c){
  const dead=c.enemies.filter(e=>!e.alive);
  for(const e of dead){
    const i=ENEMIES.indexOf(e);if(i>=0)ENEMIES.splice(i,1);
    c.enemies.splice(c.enemies.indexOf(e),1);scene.remove(e.group);
    spawnEnemy(c,e.type,e.homeX,e.homeZ,undefined,e.sentry);c.totalEnemies--;   // spawnEnemy conta de novo no total
  }
  return dead.length;
}
Hooks.on('round',()=>{
  const R=STATE.rel||{};
  // (a declaração de guerra pendente NÃO é mais automática: vira a política 'declguerra' no turno do líder)
  for(const c of WORLD.cities)if(c.owner==='enemy'&&c.state==='idle'&&relStatus(c.fid)==='war'&&facRespawnGuards(c))facNote('🛡 Os soldados de '+c.name+' se reorganizaram.',3000);
});
// preço: desconto/acréscimo pela relação com a facção dona da loja
addPriceFx('rel',ctx=>{const c=ctx.city;if(!c||c.owner==='player'||!c.fid)return[];const st=relStatus(c.fid),p=REL_ST[st].price;return p?[{txt:'Relação com '+facOf(c.fid).name+': '+REL_ST[st].n,mul:1+p}]:[]},20);

// ---------- território: entrar, atacar e cometer crime ----------
const facInCrime=()=>WORLD.cities.some(c=>c.crime&&c.state==='attacking'&&c.aliveEnemies>0);   // enquanto dura, o jogador leva 3× de dano
// serviços fechados: cidade hostil (inimiga, em guerra ou em crime)
const facClosed=c=>c.owner==='enemy'&&!c.kind&&((c.crime&&c.state==='attacking')||['enemy','war'].includes(relStatus(c.fid)));
// o jogador feriu alguém da cidade: em guerra é ataque normal; senão é crime (relação cai, a cidade reage, sem conquista nem soldados seus)
function facHostileAct(c){
  if(c.kind||c.owner!=='enemy'||c.fid===undefined)return;
  if(relStatus(c.fid)==='war'){if(c.state==='idle')startAttack(c);return}
  facCrime(c);if(c.state==='idle'&&c.aliveEnemies>0)startAttack(c,true);   // sem soldados vivos não há quem reaja
}
// quem entra numa cidade inimiga é recebido a tiros; em guerra, entrar já é atacar
function facPatrol(){
  if(P.dead||G.invis||G.dg||G.office)return;
  for(const c of WORLD.cities){
    if(c.owner!=='enemy'||c.state!=='idle'||(typeof raidLocked==='function'&&raidLocked(c)))continue;
    if(c.aliveEnemies<=0||Math.max(Math.abs(P.x-c.cx),Math.abs(P.z-c.cz))>=c.half-2)continue;   // sem soldados vivos ninguém atira (e o alarme não repete)
    const st=relStatus(c.fid);
    if(st==='enemy')startAttack(c,true);
    else if(st==='war')startAttack(c);
  }
}

// ---------- modo criativo: mudar o status das facções à mão (aba "Facções" da pausa) ----------
// Aplica um status direto: zera reparação e guerra pendente; aliado = relação 10 + acordo; guerra = declaração. Desfaz as caravanas quando o status pede.
function facForceStatus(fid,st){
  const r=relOf(fid),before=relStatus(fid);
  r.warAt=null;r.debt=null;
  if(st==='war'){facDeclareWar(fid);return}
  r.war=false;r.ally=(st==='ally');r.v={enemy:0,unfav:2,neutral:5,fav:9,ally:10}[st];
  relEffects(fid,before,relStatus(fid));
}
function renderFacCheats(){
  const box=document.getElementById('facscheat');if(!box)return;
  if(!WORLD.factions||!WORLD.factions.length){box.textContent='Gere o mundo primeiro.';return}
  box.innerHTML=(typeof scenarioHtml==='function'?scenarioHtml():'')+WORLD.factions.map(f=>{
    const st=relStatus(f.id),r=relOf(f.id);
    return '<div style="margin:6px 0"><i style="color:'+hex6(FAC_COLORS[f.color].c)+';font-style:normal">■</i> <b>'+f.name+'</b> <small>('+facTemperName(f)+', '+facCities(f.id).length+' cidade(s))</small><br>'
      +'<select data-fid="'+f.id+'" style="font-family:inherit;font-size:15px;padding:5px;margin-top:3px">'+Object.keys(REL_ST).map(k=>'<option value="'+k+'"'+(k===st?' selected':'')+'>'+REL_ST[k].n+'</option>').join('')+'</select> '
      +'<small>relação '+r.v+'/10'+(r.debt?' • reparação ◉'+r.debt.amt:'')+(r.warAt!=null?' • guerra na rodada '+r.warAt:'')+'</small></div>';
  }).join('');
}
document.addEventListener('change',e=>{
  const s=e.target.closest&&e.target.closest('#facscheat select');if(!s)return;
  facForceStatus(+s.dataset.fid,s.value);renderFacCheats();
});

// ---------- política: Declaração de guerra (consequência de massacre/crimes; nunca sorteada) ----------
// Aparece no turno do líder quando uma facção vai declarar guerra (r.warAt vencido). Substitui o sorteio da rodada e precisa ser resolvida antes de encerrar o turno.
const facWarBase=fid=>{const r=relOf(fid);return r.debt?r.debt.amt:2000};
const facWarTxt=fid=>{
  const r=relOf(fid),f=facOf(fid),city=r.warCity||'uma das suas cidades';
  return r.warWhy==='massacre'
    ?'Os mensageiros de '+f.name+' chegam à sua mesa com a notícia que ninguém queria ouvir: os soldados de '+city+' foram massacrados. O conselho deles exige reparação e, se ela não vier, a guerra será declarada.'
    :'Depois de crimes repetidos em suas terras, '+f.name+' perdeu a paciência. Seus emissários trazem um ultimato: reparação pelo que foi feito ou a guerra será declarada.';
};
definePolicy({id:'declguerra',name:'Declaração de guerra',city:false,noRoll:true,cool:0,
  cond:()=>facWarDue()!==null,
  // modo criativo: prepara uma declaração (a facção não pacífica, de preferência) para a política poder ser invocada
  fixCond:()=>{
    const fs=(WORLD.factions||[]).filter(f=>relStatus(f.id)!=='war'&&facCities(f.id).length);if(!fs.length)return null;
    const f=fs.find(x=>x.temper!=='pacifica')||fs[0],r=relOf(f.id);r.warAt=STATE.round;r.warWhy='massacre';r.warCity=(facCities(f.id)[0]||{}).name;if(!r.debt)r.debt={amt:2000,from:'neutral'};
    return 'preparei uma declaração de guerra de '+f.name;
  },
  data:()=>({fid:facWarDue()}),
  text:(c,data)=>facWarTxt(data.fid),
  options:[
    {k:'A',label:'Pagar reparação',type:'neutral',cost:x=>({gold:facWarBase(x.data.fid)}),
      eff:(c,data)=>'Paga ◉'+facWarBase(data.fid)+' para a guerra não ser declarada. A relação com '+facOf(data.fid).name+' vai para "Desfavorável" (descontente).',
      can:x=>facOf(x.data.fid).temper==='agressiva'?facOf(x.data.fid).name+' é agressiva e recusa a reparação.':null,
      apply:x=>{const f=x.data.fid,r=relOf(f);r.warAt=null;r.debt=null;r.ally=false;r.war=false;r.v=2;x.toast('💰 Reparação paga: '+facOf(f).name+' agora é desfavorável.')}},
    {k:'B',label:'Pagar reparação e pedido público de desculpas',type:'neutral',cost:x=>({gold:facWarBase(x.data.fid)*2}),
      eff:(c,data)=>'Paga o dobro (◉'+facWarBase(data.fid)*2+') e se desculpa em público. A guerra não é declarada e a relação com '+facOf(data.fid).name+' vai para "Neutro".',
      can:x=>facOf(x.data.fid).temper==='agressiva'?facOf(x.data.fid).name+' é agressiva e recusa a reparação.':null,
      apply:x=>{const f=x.data.fid,r=relOf(f);r.warAt=null;r.debt=null;r.ally=false;r.war=false;r.v=REL_START;x.toast('🕊 Desculpas aceitas: '+facOf(f).name+' agora é neutra.')}},
    {k:'C',label:'Aceitar a declaração',type:'debuff',
      eff:(c,data)=>'A guerra com '+facOf(data.fid).name+' começa: você só entra nas cidades dela atacando-as, e os soldados delas são repostos.',
      apply:x=>facDeclareWar(x.data.fid,true)}
  ]});

// ---------- política: Reparação (consequência de crime sem guerra; nunca sorteada) ----------
// Igual à declaração de guerra, mas para sair do estado de INIMIGA: aparece no turno do líder quando uma facção está inimiga por causa de um crime
// (guardas feridos, mas nem todos os soldados mortos), sem guerra a caminho. Se o jogador recusar, ela volta a pedir depois de FAC_REP_COOL rodadas.
const FAC_REP_COOL=3;
function facRepOk(id){const r=relOf(id);return !r.war&&r.warAt==null&&!!r.debt&&relStatus(id)==='enemy'&&(r.repCool||0)<=STATE.round&&facCities(id).length>0}
function facRepDue(){
  const R=STATE.rel||{};
  for(const id in R)if(facRepOk(+id))return +id;
  return null;
}
// todas as políticas de consequência devidas neste turno do líder (declarações de guerra primeiro, depois pedidos de reparação): cada uma vira um cartão a decidir
function facDueList(){
  const R=STATE.rel||{},ids=Object.keys(R).map(Number),out=[];
  ids.filter(id=>R[id].warAt!=null&&!R[id].war&&STATE.round>=R[id].warAt).sort((a,b)=>R[a].warAt-R[b].warAt)
    .forEach(id=>out.push({pid:'declguerra',city:-1,round:STATE.round,data:{fid:id}}));
  ids.filter(id=>facRepOk(id)).forEach(id=>out.push({pid:'reparacao',city:-1,round:STATE.round,data:{fid:id}}));
  return out;
}
definePolicy({id:'reparacao',name:'Pedido de reparação',city:false,noRoll:true,cool:0,
  cond:()=>facRepDue()!==null,
  // modo criativo: deixa uma facção inimiga com dívida para a política poder ser invocada
  fixCond:()=>{
    const fs=(WORLD.factions||[]).filter(f=>relStatus(f.id)!=='war'&&facCities(f.id).length);if(!fs.length)return null;
    const f=fs.find(x=>relStatus(x.id)==='enemy')||fs[0],r=relOf(f.id);
    r.war=false;r.ally=false;r.v=0;r.warAt=null;r.repCool=null;r.crimeCity=r.crimeCity||(facCities(f.id)[0]||{}).name;if(!r.debt)r.debt={amt:2000,from:'neutral'};
    return 'deixei '+f.name+' inimiga, com reparação pendente';
  },
  data:()=>({fid:facRepDue()}),
  text:(c,data)=>{
    const r=relOf(data.fid),f=facOf(data.fid);
    return 'Um emissário de '+f.name+' pede audiência. Depois dos tiros trocados em '+(r.crimeCity||'uma das cidades deles')+', o conselho aceita deixar o assunto para trás mediante reparação. Sem ela, as cidades deles continuam fechadas para você.';
  },
  options:[
    {k:'A',label:'Pagar reparação',type:'neutral',cost:x=>({gold:facWarBase(x.data.fid)}),
      eff:(c,data)=>'Paga ◉'+facWarBase(data.fid)+'. '+facOf(data.fid).name+' deixa de ser inimiga: a relação vai para "Desfavorável" (descontente).',
      apply:x=>{const f=x.data.fid,r=relOf(f);r.debt=null;r.repCool=null;r.v=2;x.toast('💰 Reparação paga: '+facOf(f).name+' agora é desfavorável.')}},
    {k:'B',label:'Pagar reparação e pedido público de desculpas',type:'neutral',cost:x=>({gold:facWarBase(x.data.fid)*2}),
      eff:(c,data)=>'Paga o dobro (◉'+facWarBase(data.fid)*2+') e se desculpa em público. '+facOf(data.fid).name+' deixa de ser inimiga: a relação vai para "Neutro".',
      apply:x=>{const f=x.data.fid,r=relOf(f);r.debt=null;r.repCool=null;r.v=REL_START;x.toast('🕊 Desculpas aceitas: '+facOf(f).name+' agora é neutra.')}},
    {k:'C',label:'Recusar a reparação',type:'debuff',
      eff:(c,data)=>'Nada é pago: '+facOf(data.fid).name+' continua inimiga e volta a pedir daqui a '+FAC_REP_COOL+' rodadas. Se você cometer outro crime, a guerra vem.',
      apply:x=>{relOf(x.data.fid).repCool=STATE.round+FAC_REP_COOL}}
  ]});

// ---------- F4: ações do líder que sobem a relação, e decaimento ----------
// Cada ação gasta 1 ação do líder (ECON.act) e vale uma vez por rodada por tipo e por facção; o ganho passa pelo multiplicador de temperamento (relChange).
//  rota comercial (caravana com uma cidade dela) +1 • doação de ouro ◉500 +1 / ◉1000 +2 • doação de relíquia +3
const FAC_GOLD={500:1,1000:2},FAC_RELIC_GAIN=3,FAC_ROUTE_GAIN=1;
const FAC_DECAY={pacifica:2,neutra:2,agressiva:3};   // rodadas sem mudança para a relação esfriar 1 ponto em direção a 5
const relPreview=(fid,delta)=>{const f=facOf(fid),T=FAC_TEMPER[(f&&f.temper)||'neutra'],m=delta>0?T.gain:T.loss;return Math.sign(delta)*Math.max(1,Math.round(Math.abs(delta)*m))};
function facMarkAct(fid,t){const r=relOf(fid);(r.acts||(r.acts={}))[t]=STATE.round;r.lastRd=STATE.round}
const facActUsed=(fid,t)=>{const r=relOf(fid);return !!(r.acts&&r.acts[t]===STATE.round)};
// relíquias: na bolsa do comandante ou no armazém (armazenamento compartilhado)
function facRelicStore(){let n=0;for(const s of shOf().store)if(s&&s.id==='reliquia')n+=s.n;return n}
const facRelicCount=()=>invCount('reliquia')+facRelicStore();
function facRelicTake(){
  if(invCount('reliquia')>0)return invRemove('reliquia',1)>0;
  for(const s of shOf().store)if(s&&s.id==='reliquia'){s.n--;if(s.n<=0)shOf().store[shOf().store.indexOf(s)]=null;return true}
  return false;
}
// com o mesmo ganho (já contando o teto 10 e o temperamento), só a doação MAIS CARA existe: a mais barata nem aparece
function facGoldHidden(fid,amt){
  const r=relOf(fid),eff=a=>Math.min(relPreview(fid,FAC_GOLD[a]),REL_MAX-r.v);
  return Object.keys(FAC_GOLD).map(Number).some(a=>a>amt&&eff(a)===eff(amt));
}
// por que uma ação não pode ser feita agora (ou null)
function facActBlock(fid,type,amt){
  const r=relOf(fid);
  if(!isLeader())return 'Só no turno do líder.';
  if(r.war)return 'Em guerra: só a paz resolve.';
  if(r.v>=REL_MAX)return 'A relação já está no máximo.';
  if(!canAct(type==='gold'?'give':'relic'))return 'Sem ações do líder nesta rodada.';
  if(facActUsed(fid,type))return 'Já feito nesta rodada.';
  if(type==='gold'){
    if(facGoldHidden(fid,amt))return 'Indisponível: a doação maior dá o mesmo ganho.';
    if(!Ledger.canAfford({gold:amt}))return 'Ouro insuficiente.';
  }
  if(type==='relic'&&facRelicCount()<1)return 'Você não tem relíquia (bolsa ou armazém).';
  return null;
}
function facGiveGold(fid,amt){
  if(facActBlock(fid,'gold',amt)||!FAC_GOLD[amt])return false;
  if(!Ledger.spend({gold:amt}))return false;spendAct('give');
  const d=relChange(fid,FAC_GOLD[amt]);facMarkAct(fid,'gold');
  facNote('💰 Você doou ◉'+amt+' a '+facOf(fid).name+': relação +'+d+' ('+relOf(fid).v+'/10).');return true;
}
function facGiveRelic(fid){
  if(facActBlock(fid,'relic'))return false;
  if(!facRelicTake())return false;spendAct('relic');
  const d=relChange(fid,FAC_RELIC_GAIN);facMarkAct(fid,'relic');
  facNote('🏺 Você ofereceu uma relíquia a '+facOf(fid).name+': relação +'+d+' ('+relOf(fid).v+'/10).');return true;
}
// rota comercial: chamada quando a caravana com uma cidade de outra facção é fechada
function facRouteGain(B){
  if(!B||B.owner==='player'||!B.fid)return;
  const r=relOf(B.fid);if(r.war||facActUsed(B.fid,'route'))return;
  const d=relChange(B.fid,FAC_ROUTE_GAIN);facMarkAct(B.fid,'route');
  facNote('🛒 A rota comercial aproximou você de '+facOf(B.fid).name+': relação +'+d+' ('+relOf(B.fid).v+'/10).');
}
// decaimento: a relação esfria 1 ponto em direção a 5 depois de FAC_DECAY rodadas sem mudar (agressiva: 3, as outras: 2).
// Não esfria: em guerra, aliada, com guerra a caminho, nem a inimiga com reparação pendente.
Hooks.on('round',()=>{
  const R=STATE.rel||{};
  for(const id in R){
    const r=R[id],f=facOf(+id);if(!f||r.war||r.ally||r.warAt!=null)continue;
    if(r.seenV!==r.v){r.seenV=r.v;r.lastRd=STATE.round;continue}   // mudou desde a última rodada (ação, crime, política): o relógio recomeça
    if(r.v===REL_START||(relStatus(+id)==='enemy'&&r.debt))continue;
    if(STATE.round-(r.lastRd||0)>=FAC_DECAY[f.temper||'neutra']){
      const before=r.v;r.v+=Math.sign(REL_START-r.v);r.seenV=r.v;r.lastRd=STATE.round;
      const rd=STATE.rd;if(rd&&rd.report)rd.report.push('⏳ A relação com '+f.name+' '+(before>REL_START?'esfriou':'melhorou com o tempo')+': '+r.v+'/10 ('+REL_ST[relStatus(+id)].n.toLowerCase()+').');
    }
  }
});

// ---------- crime contra caravana: atirar nos guardas de uma caravana que não é sua ----------
// Cai a relação com as facções da rota (a dona da caravana e, se for outra NPC, a do outro lado) e a aliança com elas acaba:
// cada uma vira inimiga com reparação registrada (a política de reparação aparece no turno do líder). Uma vez por rodada por facção.
function facCaravanCrime(car){
  const route=car&&car.r;if(!route||!car.city||car.city.owner==='player')return;
  const fids=new Set([car.city.fid,WORLD.cities[route.a].fid,WORLD.cities[route.b].fid]);fids.delete(0);fids.delete(undefined);
  setTimeout(()=>{for(const fid of fids){
    const wasAlly=relStatus(fid)==='ally';
    facCrime({fid,owner:'enemy',name:'uma caravana de '+car.city.name});   // queda por degrau, dívida e guerra a caminho se já era inimiga
    if(wasAlly){const r=relOf(fid);r.ally=false;r.v=0;facNote('🤝 A aliança com '+facOf(fid).name+' caiu: ela agora é inimiga.')}   // aliança cai e a facção fica inimiga (pede reparação)
  }},0);   // adiado: desfazer as caravanas no meio do tiro mexeria nas listas que o disparo ainda está percorrendo
}
