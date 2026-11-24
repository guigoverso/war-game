'use strict';
// ---------- Fase 6: POIs permanentes (fazenda, mina, serraria...) e POIs de guerra (acampamento fortificado, trincheira) ----------
// Fatia 1: gerar, mostrar e guardar o dono. Efeitos, limpeza e anexação vêm nas fatias seguintes (ver docs/fase-6-guerra.md).
// Cada POI é uma construção de blocos numa malha própria (como os acampamentos). O dono (bandidos, uma facção ou o jogador) aparece na bandeira.
// Dono: 'bandit' | número de facção | 'player' | 'none' (ruínas). Só o que mudou vai para STATE.pois (o mundo é refeito pela semente).
const POI_DEFS={
  farm:{n:'Fazenda',ic:'🌾',r:18},mine:{n:'Mina',ic:'⛏',r:15},sawmill:{n:'Serraria',ic:'🪚',r:14},hunters:{n:'Acampamento de caçadores',ic:'🏹',r:13},
  sanctuary:{n:'Santuário',ic:'⛪',r:14},post:{n:'Entreposto comercial',ic:'🏪',r:16},
  bridge:{n:'Ponte',ic:'🌉',r:9},fort:{n:'Forte',ic:'🏰',r:15},tower:{n:'Torre de vigia',ic:'🗼',r:8},tavern:{n:'Taverna',ic:'🍺',r:17},
  ruins:{n:'Ruínas antigas',ic:'🏛',r:9},
  inn:{n:'Pousada',ic:'🛏',r:13},lodge:{n:'Alojamento',ic:'🏕',r:14},ruinvil:{n:'Vila em escombros',ic:'🏚',r:POI_RUINVIL.r},   // 4D: descanso com lojinha (pousada, alojamento) e vila arrasada anexável (sem moradores)
  fortcamp:{n:'Acampamento fortificado',ic:'⛺',r:12,war:true},trench:{n:'Trincheira',ic:'🪖',r:11,war:true},
  hospital:{n:'Hospital de campanha',ic:'🏥',r:10,war:true},depot:{n:'Depósito de suprimentos',ic:'📦',r:10,war:true},
  lookout:{n:'Atalaia de madeira',ic:'🔭',r:6,war:true},barricade:{n:'Barricada de estrada',ic:'🚧',r:7,war:true}
};
const POI_WAR_TYPES=['fortcamp','trench','hospital','depot','lookout','barricade'];   // os 6 POIs de guerra (só visuais; a frente os escolhe em warfront.js; a barricada só vai em estrada)
const POI_TYPES=['farm','mine','sawmill','hunters','sanctuary','bridge','fort','tower','tavern','post','ruins','inn','lodge','ruinvil'];
Hooks.on('resetState',()=>{STATE.pois={}});

// ---------- dono e bandeira ----------
const poiColor=o=>o==='free'?0xcfcfcf:o==='bandit'?0x2a2a2a:o==='player'?0x2a6aff:typeof o==='number'?(facColor(o)||0x888888):0x888888;
const AMB_GAP=22;   // folga (borda a borda) de portais, acampamentos de bandidos, baús perdidos e cavernas de animais em relação a cidades e POIs: menor que a dos POIs (POI_GAP)
const POI_BORDER='#ff2bd6';   // borda dos quadrados dos POIs nos mapas: magenta, uma cor que não existe no terreno
const poiCss=o=>'#'+poiColor(o).toString(16).padStart(6,'0');
function poiOwnerName(o){return o==='free'?'Livre (limpo)':o==='bandit'?'Bandidos':o==='player'?'Você':o==='none'?'Sem dono':typeof o==='number'?((facOf(o)||{}).name||'Facção'):'?'}
function poiPaint(p){if(p.flagMat)p.flagMat.color.setHex(poiColor(p.owner))}
function poiSetOwner(p,o){p.owner=o;if(typeof poiOwnerChanged==='function')poiOwnerChanged(p,o);if(!p.show){STATE.pois=STATE.pois||{};STATE.pois[p.id]=o}poiPaint(p);if(typeof poiGarrisonSync==='function')poiGarrisonSync(p);if(typeof warOpOwnerChanged==='function')warOpOwnerChanged(p,o)}   // (guarnição e moradores acompanham o dono; operações de guerra: warops.js)
function poiApply(){for(const p of WORLD.pois||[]){if(!p.show&&STATE.pois&&STATE.pois[p.id]!==undefined)p.owner=STATE.pois[p.id];poiPaint(p);if(typeof poiGarrisonSync==='function')poiGarrisonSync(p)}}   // depois de gerar/carregar

// ---------- ferramentas de construção ----------
const pBc=(c,x0,y0,z0,x1,y1,z1,col,solid,o)=>Bc(c,Math.min(x0,x1),y0,Math.min(z0,z1),Math.max(x0,x1),y1,Math.max(z0,z1),col,solid,Object.assign({b:true},o||{}));   // b: desenha também a face de baixo (senão tetos e lajes somem vistos de dentro)
function poiArea(x,z,y,biome){
  const ps=PAL[biome===BIO_ROCK?1:biome]||PAL[0];
  return{cx:x,cz:z,y,biome,pal:{walls:ps.walls.slice(0,3),roofs:ps.roofs.slice(0,2),base:ps.base,trim:ps.trim,all:ps.walls},flags:[],doors:[],keepers:[]};
}
// casa pequena com a porta no meio da parede D (N/S/E/W) num retângulo local
function poiHouse(c,x0,z0,w,d,D,o,rng){
  const r={x0,x1:x0+w-1,z0,z1:z0+d-1},ns=(D==='N'||D==='S'),dd=Object.assign({h:4,floors:1,wall:0xe8d8b0,roof:0x9a4a2a,roofT:'gable',glass:0x9ed4ff,chimney:false,timber:false,shut:null},o||{});
  return makeBuilding(c,r,D,Math.floor((ns?w:d)/2)-1,dd,rng);
}
function poiPole(c,x,z,h,col){pBc(c,x-0.1,0,z-0.1,x+0.1,h,z+0.1,col||0x4a3320,true,{j:0})}
// bandeira do dono: mastro + pano (a cor é trocada em poiPaint)
function poiFlag(c,p,x,z,h){
  const by=poiBaseY(c,x,z);
  poiPole(c,x,z,h,0x3a3a3a);pBc(c,x-0.18,h,z-0.18,x+0.18,h+0.3,z+0.18,0xe0b030,false,{j:0});
  p.flagMat=new THREE.MeshLambertMaterial({color:poiColor(p.owner)});
  const m=new THREE.Mesh(GEO_BOX,p.flagMat);m.scale.set(1.7,1.05,0.08);m.position.set(c.cx+x+0.95,by+h-0.65,c.cz+z);scene.add(m);p.sceneObjs.push(m);
  const t=new THREE.Mesh(GEO_BOX,p.flagMat);t.scale.set(0.6,0.4,0.08);t.position.set(c.cx+x+2.1,by+h-0.5,c.cz+z);scene.add(t);p.sceneObjs.push(t);
}
const poiStone=[0x8a8a90,0x7a7a82,0x9a9aa0];
function poiWall(c,x0,z0,x1,z1,h,col,o){pBc(c,x0,0,z0,x1,h,z1,col||0x8a8a90,true,o||{j:0.04})}
function poiCrenels(c,x0,z0,x1,z1,y,alongX){   // ameias: blocos alternados no topo de uma muralha
  const L=alongX?x1-x0:z1-z0;
  for(let k=0;k<L;k+=1.6){if(alongX)pBc(c,x0+k,y,z0,Math.min(x1,x0+k+0.9),y+0.9,z1,0x7a7a82,true,{j:0.03});else pBc(c,x0,y,z0+k,x1,y+0.9,Math.min(z1,z0+k+0.9),0x7a7a82,true,{j:0.03})}
}

// ---------- ferramentas de detalhe ----------
function poiFence(c,x0,z0,x1,z1,col){   // cerca de estacas e travessas, com colisão (só alinhada aos eixos)
  const L=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.round(L/1.8)),cc=col||0x5a3d22,alongX=Math.abs(x1-x0)>=Math.abs(z1-z0);
  for(let i=0;i<=n;i++){const x=x0+(x1-x0)*i/n,z=z0+(z1-z0)*i/n;pBc(c,x-0.1,0,z-0.1,x+0.1,1.3,z+0.1,cc,true,{j:0.02})}
  if(alongX)pBc(c,Math.min(x0,x1),0.35,z0-0.06,Math.max(x0,x1),1.2,z0+0.06,0x6b4a2a,true,{j:0});else pBc(c,x0-0.06,0.35,Math.min(z0,z1),x0+0.06,1.2,Math.max(z0,z1),0x6b4a2a,true,{j:0});   // as travessas formam uma barreira contínua
}
// Altura do chão sob o ponto local (x, z) de um POI: o chão real nos POIs adaptados (frente da guerra), senão a altura do POI.
const poiBaseY=(c,x,z)=>c.adapt?tH(c.cx+x,c.cz+z):c.y;
// Bc de um POI adaptado ao terreno (c.adapt): caixas longas são partidas em pedaços de até 3 blocos, cada um acompanha a altura do
// chão no seu centro; o que nasce rente ao chão (y0 até 0.15) desce até o ponto mais baixo da pegada, para não flutuar nem
// piscar no encontro com o terreno; o que fica abaixo do chão de referência (base de terra, tábuas do fundo) não é desenhado.
function poiAdaptBc(c,x0,y0,z0,x1,y1,z1,color,col,o){
  if(y1<=0.02)return;
  const L=3,dx=x1-x0,dz=z1-z0;
  if(dx>L&&dx>=dz){const n=Math.ceil(dx/L);for(let k=0;k<n;k++)poiAdaptBc(c,x0+dx*k/n,y0,z0,x0+dx*(k+1)/n,y1,z1,color,col,o);return}
  if(dz>L){const n=Math.ceil(dz/L);for(let k=0;k<n;k++)poiAdaptBc(c,x0,y0,z0+dz*k/n,x1,y1,z0+dz*(k+1)/n,color,col,o);return}
  const base=tH(c.cx+(x0+x1)/2,c.cz+(z0+z1)/2);let a=base+y0;
  if(y0<=0.15){let mn=1e9;for(const px of[x0,x1])for(const pz of[z0,z1])mn=Math.min(mn,tH(c.cx+px,c.cz+pz));a=Math.min(a,mn)-0.2}
  Bx(c.cx+x0,a,c.cz+z0,c.cx+x1,base+y1,c.cz+z1,color,col,o);
}
function poiDig(c,x0,z0,x1,z1,d){   // escava o terreno (só vale na geração, antes da malha): rebaixa d blocos e deixa terra batida
  if(c.noDig)return;   // POI de guerra em jogo (warfront.js): a malha já existe, o chão não muda
  for(let iz=Math.floor(c.cz+z0);iz<Math.ceil(c.cz+z1);iz++)for(let ix=Math.floor(c.cx+x0);ix<Math.ceil(c.cx+x1);ix++){if(ix<1||iz<1||ix>=W-1||iz>=W-1)continue;H[iz*W+ix]=c.y-d;T[iz*W+ix]=T_WILD}
}
function poiLand(c,x0,z0,x1,z1){   // nivela a terra (não a água) à altura do POI
  if(c.noDig)return;
  for(let iz=Math.floor(c.cz+z0);iz<Math.ceil(c.cz+z1);iz++)for(let ix=Math.floor(c.cx+x0);ix<Math.ceil(c.cx+x1);ix++){if(ix<1||iz<1||ix>=W-1||iz>=W-1)continue;if(H[iz*W+ix]>=SEA)H[iz*W+ix]=c.y}
}
function poiWell(c,x,z){   // poço de pedra com cobertura
  pBc(c,x-1,0,z-1,x+1,0.9,z+1,0x8a8a90,true,{j:0.04});pBc(c,x-0.7,0.9,z-0.7,x+0.7,0.95,z+0.7,0x1f4a8a,false,{j:0});
  for(const sx of[-1,1])for(const sz of[-1,1])pBc(c,x+sx*0.9-0.1,0.9,z+sz*0.9-0.1,x+sx*0.9+0.1,2.6,z+sz*0.9+0.1,0x5a3d22,false,{j:0});
  for(let k=0;k<3;k++){const w=1.3-k*0.4;pBc(c,x-w,2.6+k*0.3,z-w,x+w,2.9+k*0.3,z+w,k%2?0x8a4a2a:0x9a5a3a,false,{j:0.04})}
  pBc(c,x-0.06,1.1,z-0.06,x+0.06,2.6,z+0.06,0x4a3320,false,{j:0});pBc(c,x-0.2,1.0,z+0.5,x+0.2,1.3,z+0.8,0x6b4a2a,false,{j:0});   // corda e balde
}
function poiCart(c,x,z,alongX,load){   // carroça com rodas e carga
  const a=alongX;
  pBc(c,x,0.55,z,a?x+2.6:x+1.5,0.8,a?z+1.5:z+2.6,0x7a5632,true,{j:0.03});
  for(const s of[0,1]){const o=s?(a?1.5:1.5):0;if(a){pBc(c,x+0.4,0.2,z+o-0.06+(s?0:0),x+1.0,0.8,z+o+0.06+(s?0:0),0x4a3320,false,{j:0});pBc(c,x+1.7,0.2,z+o-0.06,x+2.3,0.8,z+o+0.06,0x4a3320,false,{j:0})}else{pBc(c,x+o-0.06,0.2,z+0.4,x+o+0.06,0.8,z+1.0,0x4a3320,false,{j:0});pBc(c,x+o-0.06,0.2,z+1.7,x+o+0.06,0.8,z+2.3,0x4a3320,false,{j:0})}}
  if(a)pBc(c,x+2.6,0.6,z+0.6,x+3.8,0.7,z+0.9,0x4a3320,false,{j:0});else pBc(c,x+0.6,0.6,z+2.6,x+0.9,0.7,z+3.8,0x4a3320,false,{j:0});
  if(load)pBc(c,x+0.2,0.8,z+0.2,a?x+2.4:x+1.3,1.5,a?z+1.3:z+2.4,load,false,{j:0.07});
}
function poiBench(c,x,z,alongX){pBc(c,x,0.45,z,alongX?x+1.8:x+0.5,0.6,alongX?z+0.5:z+1.8,0x7a5632,true,{j:0.03});for(const k of[0.15,alongX?1.45:1.45])pBc(c,alongX?x+k:x+0.05,0,alongX?z+0.05:z+k,alongX?x+k+0.2:x+0.45,0.45,alongX?z+0.45:z+k+0.2,0x5a3d22,true,{j:0})}
function poiBrazier(c,x,z,y0){y0=y0||0;pBc(c,x-0.1,y0,z-0.1,x+0.1,y0+0.9,z+0.1,0x2a2a2a,true,{j:0});pBc(c,x-0.4,y0+0.9,z-0.4,x+0.4,y0+1.2,z+0.4,0x3a3a3a,false,{j:0.02});pBc(c,x-0.28,y0+1.2,z-0.28,x+0.28,y0+1.6,z+0.28,0xff7a1a,false,{j:0.1});pBc(c,x-0.14,y0+1.5,z-0.14,x+0.14,y0+1.9,z+0.14,0xffd84a,false,{j:0.1})}
function poiPath(c,x0,z0,x1,z1,col){const L=Math.hypot(x1-x0,z1-z0),n=Math.round(L/1.2);for(let i=0;i<=n;i++){const x=x0+(x1-x0)*i/n,z=z0+(z1-z0)*i/n,s=0.7+((i*7)%3)*0.12;pBc(c,x-s/2,0,z-s/2,x+s/2,0.06,z+s/2,col||0x9a9078,false,{j:0.05})}}
function poiAnimal(c,x,z,col,big){const s=big?1:0.7;pBc(c,x,0.4*s,z,x+1.2*s,0.95*s,z+0.6*s,col,true,{j:0.03});pBc(c,x+1.1*s,0.6*s,z+0.05,x+1.55*s,1.1*s,z+0.55*s,shadec(col,1.1),false,{j:0.03});for(const [a,b] of[[0.1,0.05],[0.9,0.05],[0.1,0.4],[0.9,0.4]])pBc(c,x+a*s,0,z+b*s,x+a*s+0.18*s,0.45*s,z+b*s+0.18*s,shadec(col,0.7),false,{j:0})}
function poiSign(c,x,z,col){pBc(c,x-0.07,0,z-0.07,x+0.07,1.9,z+0.07,0x4a3320,false,{j:0});pBc(c,x-0.7,1.3,z-0.05,x+0.7,1.9,z+0.07,col||0x6b4a2a,false,{j:0.02});pBc(c,x-0.55,1.45,z+0.07,x+0.55,1.75,z+0.1,0xe8d8a8,false,{j:0})}
function poiRack(c,x,z,alongX){for(let k=0;k<4;k++){const o=0.3+k*0.4;if(alongX){pBc(c,x+o,0.6,z,x+o+0.06,2.0,z+0.06,0xc0c8d0,false,{j:0});pBc(c,x+o-0.1,0.6,z,x+o+0.16,0.75,z+0.06,0x6b4a2a,false,{j:0})}else{pBc(c,x,0.6,z+o,x+0.06,2.0,z+o+0.06,0xc0c8d0,false,{j:0});pBc(c,x,0.6,z+o-0.1,x+0.06,0.75,z+o+0.16,0x6b4a2a,false,{j:0})}}pBc(c,alongX?x:x-0.05,0,alongX?z-0.05:z,alongX?x+1.8:x+0.15,0.6,alongX?z+0.15:z+1.8,0x5a3d22,true,{j:0.02})}
function poiHut(c,x0,z0,w,d,D,o,rng){const f=poiHouse(c,x0,z0,w,d,D,o,rng);furnishHouse(c,f,rng,D);return f}   // casa com mobília
const poiLampAt=(c,x,z)=>{pBc(c,x-0.1,0,z-0.1,x+0.1,3.0,z+0.1,0x2a2a2a,true,{j:0});pBc(c,x-0.3,3.0,z-0.3,x+0.3,3.5,z+0.3,0xffe9a0,false,{j:0});pBc(c,x-0.4,3.5,z-0.4,x+0.4,3.65,z+0.4,0x2a2a2a,false,{j:0})};

// Enfeite de fora da pousada e do alojamento por tema do tile (p.theme; sem ele, pelo bioma): feira na fazenda, minério na mina, toras na serraria.
function poiRestTheme(c,rng,p){
  const th=p.theme||({[BIO_PLAINS]:'farm',[BIO_FOREST]:'sawmill',[BIO_ROCK]:'mine'}[p.biome])||'none',x=p.type==='inn'?-12:10,z=p.type==='inn'?-1:-4;
  if(th==='farm'){   // banca de feira com toldo listrado e frutas, fardos de feno
    for(const [dx,dz] of[[0,0],[4,0],[0,3.5],[4,3.5]])pBc(c,x+dx-0.1,0,z+dz-0.1,x+dx+0.1,2.5,z+dz+0.1,0x5a3d22,true,{j:0.02});
    pBc(c,x,0,z+1,x+4,1.0,z+2.4,0x7a5632,true,{j:0.03});for(let i=0;i<5;i++)pBc(c,x-0.4+i*1.0,2.4,z-0.2,x+0.6+i*1.0,2.6,z+3.9,i%2?0xc03a3a:0xf0ece0,false,{j:0.03});
    for(let k=0;k<7;k++)pBc(c,x+0.3+k*0.5,1.0,z+1.2+(k%2)*0.5,x+0.7+k*0.5,1.3,z+1.6+(k%2)*0.5,rng.pick([0xc83a2a,0xe08a2a,0xe0c030,0x5ab03a]),false,{j:0.05});
    hay(c,x+6,z+2);hay(c,x+7.4,z+3.4)}
  else if(th==='mine'){   // vagonete com minério, pilha de pedras e picaretas encostadas
    poiCart(c,x,z,true,0x6a6a72);
    for(let k=0;k<5;k++)pBc(c,x+4+k*0.6,0,z+k*0.5,x+5.4+k*0.6,0.6+0.2*k,z+1.4+k*0.5,rng.pick([0x7a6a5a,0x5a5a6a,0x8a5a3a,0xc8a030]),true,{j:0.08});
    poiRack(c,x,z+4,true)}
  else if(th==='sawmill'){   // pilha de toras, toco com machado
    for(let r2=0;r2<3;r2++)for(let k=0;k<4-r2;k++)pBc(c,x+k*1.1+r2*0.55,r2*0.65,z,x+k*1.1+r2*0.55+1,r2*0.65+0.65,z+3.4,r2%2?0x8a5a2a:0x6a4220,true,{j:0.05});
    pBc(c,x+1,0,z+5,x+2,0.5,z+6,0x6b4a2a,true,{j:0.05});pBc(c,x+1.4,0.5,z+5.2,x+1.6,1.2,z+5.4,0xb0b0b8,false,{j:0})}
  else poiBench(c,x,z,true);
}

// ---------- construtores (frente = +z) ----------
const POI_BUILD={
  hunters(c,rng,p){   // acampamento de caçadores: tendas de pele, fogueira com tripé, varais de couro, troféus, lenha e armadilhas
    const tent=(tx,tz,col)=>{for(let i=0;i<5;i++){const w=1.8-i*0.34;pBc(c,tx-w,i*0.5,tz-1.4,tx+w,i*0.5+0.5,tz+1.4,shadec(col,i%2?1.07:0.95),i<3,{j:0.06})}pBc(c,tx-0.5,0,tz+1.35,tx+0.5,1.5,tz+1.45,0x1f1710,false,{j:0})};
    tent(-6,-5,0x8a6a3a);tent(5.5,-6,0xa08a5a);tent(-8.5,0.5,0x6a7a4a);
    p.sceneObjs.push(...buildCampFire(c,rng));   // a mesma fogueira do acampamento de bandidos (poi.js)
    for(const [x0,z0] of[[-9,6],[1,6.5]]){   // varais de couro com peles penduradas
      poiPole(c,x0,z0,2.8,0x7a5632);poiPole(c,x0+6,z0,2.8,0x7a5632);pBc(c,x0,2.6,z0-0.08,x0+6,2.8,z0+0.08,0x7a5632,false,{j:0});
      for(let x=x0+0.5;x<x0+5.7;x+=1.0)pBc(c,x,0.7,z0-0.05,x+0.75,2.6,z0+0.05,rng.pick([0xe0b888,0xd0a070,0xc89860,0x8a6a4a,0xb8b0a0]),false,{j:0.03})}
    poiPole(c,-3.5,-9.5,3);pBc(c,-4.2,2.7,-9.6,-2.8,2.9,-9.4,0x4a3320,false,{j:0});for(const s of[-4.2,-2.9]){pBc(c,s,2.9,-9.6,s+0.12,3.7,-9.4,0xe8e0c8,false,{j:0})}   // poste com chifres de troféu
    for(let k=0;k<3;k++)pBc(c,9+k*0.35,0,-2.5+k*0.7,9.9+k*0.35,0.5+0.35*k,-1.9+k*0.7,0x6b4a2a,true,{j:0.06});   // lenha empilhada
    crate(c,2.5,-9.5,1,1.2);barrel(c,-1.5,-9);poiBench(c,2.5,3.2,true);
    for(const [tx,tz] of[[-11,-5],[11,6],[-5,10],[11.5,-8]])tinyTree(c,tx,tz,rng);
    poiPath(c,0,2.2,0,5.2);poiLampAt(c,3.5,1.2);
    p.chestPos={x:c.cx+6.5,y:c.y,z:c.cz+2.8};   // onde nasce o baú da conquista (poigame.js)
    poiFlag(c,p,6,9,6);
  },
  sanctuary(c,rng,p){   // santuário: capela de pedra com vitrais, torre do sino, altar e bancos, poço, canteiros de flores e braseiros no caminho
    const st=[0xd8d0c0,0xcfc7b6,0xe0d8c8];
    pBc(c,-6,0,-9,6,0.12,3.5,0x9a9aa0,false,{j:0.03});   // laje de pedra
    for(const [x0,z0,x1,z1] of[[-5,-8,5,-7.6],[-5,-8,-4.6,2],[4.6,-8,5,2],[-5,1.6,-1.2,2],[1.2,1.6,5,2]])pBc(c,x0,0,z0,x1,4.6,z1,rng.pick(st),true,{j:0.03});   // paredes (a frente tem a porta)
    pBc(c,-1.2,3.2,1.6,1.2,4.6,2,0xd8d0c0,true,{j:0.02});   // verga da porta
    for(const s of[-1,1])for(const z of[-5.5,-2.5])pBc(c,s*5-0.06,1.6,z-0.6,s*5+0.06,3.6,z+0.6,rng.pick([0x6aa0e0,0xe07a6a,0xe0c04a]),false,{j:0});   // vitrais
    roofOn(c,-5.6,-8.6,5.6,2.6,4.6,'gable',0x5a6a8a,{trim:0x3a3a4a});
    pBc(c,-1.1,0.12,-7.6,1.1,1.1,-6.4,0xf2eee4,true,{j:0.02});pBc(c,-0.9,1.1,-7.5,0.9,1.2,-6.5,0xb02a3a,false,{j:0});   // altar com toalha
    for(const x of[-0.8,0.8])pBc(c,x-0.08,1.2,-7.1,x+0.08,1.6,-6.9,0xffe9a0,false,{j:0});   // velas
    for(const x of[-3.6,1.8])for(const z of[-4.5,-2.5,-0.5])poiBench(c,x,z,true);
    // torre do sino ao lado da capela: base cheia, quatro pilares, sino e telhado em pirâmide
    pBc(c,6.4,0,-9,9.6,4.5,-5.8,0xcfc7b6,true,{j:0.03});
    for(const [x,z] of[[6.4,-9],[9.2,-9],[6.4,-6.2],[9.2,-6.2]])pBc(c,x,4.5,z,x+0.4,7.5,z+0.4,0xd8d0c0,true,{j:0.02});
    pBc(c,7.4,5.3,-8,8.6,6.6,-6.8,0xe0b030,false,{j:0.03});pBc(c,7.9,6.6,-7.5,8.1,7.2,-7.3,0x3a3a3a,false,{j:0});   // sino
    for(let k=0;k<4;k++){const w=2.0-k*0.5;pBc(c,8-w,7.5+k*0.5,-7.5-w,8+w,8+k*0.5,-7.5+w,k%2?0x5a6a8a:0x4a5a7a,false,{j:0.04})}
    pBc(c,7.9,8.0,-7.6,8.1,9.6,-7.4,0xe0b030,false,{j:0});   // cruz do topo
    pBc(c,7.55,9.2,-7.6,8.45,9.4,-7.4,0xe0b030,false,{j:0});
    // frente: braseiros, caminho, poço e canteiros
    poiBrazier(c,-2.2,3.6);poiBrazier(c,2.2,3.6);poiPath(c,0,2.4,0,11);poiLampAt(c,3.6,7);
    poiWell(c,-8,7);
    for(const [x0,z0] of[[3.5,6],[-12,0.5]]){pBc(c,x0,0,z0,x0+4,0.4,z0+2,0x5a3d22,true,{j:0.04});
      for(let k=0;k<7;k++)pBc(c,x0+0.2+k*0.52,0.4,z0+0.3+(k%2)*0.9,x0+0.55+k*0.52,0.75,z0+0.65+(k%2)*0.9,rng.pick([0xe05a8a,0xf0d84a,0xf2f2f2,0x9a6ae0]),false,{j:0.05})}   // canteiros
    poiBench(c,-3.5,9,true);poiBench(c,2,9,true);
    for(const [tx,tz] of[[-10,-6],[11,3],[-11,10],[12,9]])tinyTree(c,tx,tz,rng);
    p.keepers=[];p.svcSpec=[];   // só ambientação: guardas e civis nascem em poiCivSync (poigame.js), os mesmos das cidades
    poiFlag(c,p,9,10,6);
  },
  mine(c,rng,p){   // mina em cabana: galpão de madeira sobre uma rampa escavada (5 degraus de 1 bloco) com trilhos e um vagonete descendo, torre do guincho, oficina e minério
    for(let k=1;k<=5;k++)poiDig(c,-2,4-2*k,2,6-2*k,k);   // a frente é +z; a rampa desce para o fundo
    for(let k=0;k<=5;k++){const zA=4-2*k,zB=6-2*k,y=-k;   // trilhos e dormentes acompanham os degraus
      for(const s of[-0.8,0.8])pBc(c,s-0.06,y+0.02,zA,s+0.06,y+0.16,zB,0x9a9aa2,false,{j:0});
      for(let z=zA;z<zB;z+=0.7)pBc(c,-1.2,y,z,1.2,y+0.06,z+0.3,0x4a3320,false,{j:0})}
    for(let k=1;k<=5;k++){const zA=4-2*k,zB=6-2*k;
      pBc(c,-2,-k,zA,2,-k+0.05,zB,k%2?0x7a7a82:0x6a6a72,false,{j:0.05});   // chão de pedra
      pBc(c,-2.0,-k,zA,-1.94,0,zB,0x0c0c10,false,{j:0});pBc(c,1.94,-k,zA,2.0,0,zB,0x0c0c10,false,{j:0})}   // paredes pretas: fundo de caverna
    pBc(c,-2,-5,-6.0,2,0,-5.94,0x0c0c10,false,{j:0});
    pBc(c,-0.9,-2.8,-1.8,0.9,-2.1,-0.2,0x5a5a62,true,{j:0.03});pBc(c,-0.8,-2.1,-1.7,0.8,-1.8,-0.3,0x2a2a2a,false,{j:0.05});for(let k=0;k<5;k++)pBc(c,-0.6+k*0.25,-1.8,-1.6+(k%2)*0.6,-0.4+k*0.25,-1.5,-1.2+(k%2)*0.6,0xc8a030,false,{j:0.05});   // vagonete descendo, com minério
    for(const z of[-0.7,-1.3])for(const s of[-0.8,0.8])pBc(c,s-0.1,-3.0,z-0.2,s+0.1,-2.7,z+0.2,0x2a2a2a,false,{j:0});   // rodas
    pBc(c,-0.05,-5,-0.6,0.05,0.9,-0.5,0x6a5a3a,false,{j:0});   // corda do vagonete
    // galpão de madeira sobre a boca da rampa
    for(const [x,z] of[[-2.9,6.0],[2.9,6.0],[-2.9,-0.6],[2.9,-0.6],[-2.9,2.7],[2.9,2.7]])pBc(c,x-0.18,0,z-0.18,x+0.18,3.6,z+0.18,0x5a3d22,true,{j:0.02});
    for(const s of[-1,1]){pBc(c,s*2.9-0.1,0,-0.6,s*2.9+0.1,1.3,6.0,0x7a5632,true,{j:0.04});pBc(c,s*2.9-0.1,2.4,-0.6,s*2.9+0.1,3.6,6.0,0x6b4a2a,false,{j:0.04})}
    pBc(c,-3,3.3,-0.7,3,3.6,6.1,0x4a3320,false,{j:0.02});
    roofOn(c,-3.2,-1,3.2,6.4,3.6,'gable',0x6a4a2a,{trim:0x4a3320});
    pBc(c,-1.4,2.4,6.0,1.4,3.0,6.15,0x6b4a2a,false,{j:0});pBc(c,-0.8,2.5,6.15,0.8,2.9,6.2,0xe8d8a8,false,{j:0});   // tabuleta "MINA" (sem texto)
    for(const [x,z] of[[-2.6,5.4],[2.6,5.4]]){pBc(c,x-0.06,2.3,z-0.06,x+0.06,3.0,z+0.06,0x2a2a2a,false,{j:0});pBc(c,x-0.2,2.8,z-0.2,x+0.2,3.3,z+0.2,0xffe9a0,false,{j:0})}   // lanternas
    // cerca em volta do trecho da rampa que fica a céu aberto
    poiFence(c,-2.5,-6.5,-2.5,-1.2);poiFence(c,2.5,-6.5,2.5,-1.2);poiFence(c,-2.5,-6.5,2.5,-6.5);
    // torre do guincho sobre o fundo da rampa: pernas, viga, roda e corda
    for(const sx of[-1,1]){pBc(c,sx*2.9-0.15,0,-4.5-0.15,sx*2.9+0.15,5.5,-4.5+0.15,0x5a3d22,true,{j:0.02});pBc(c,sx*2.9-0.1,0,-3.4,sx*2.9+0.1,4.2,-3.3,0x6b4a2a,false,{j:0})}
    pBc(c,-3.1,5.2,-4.7,3.1,5.55,-4.3,0x4a3320,true,{j:0.02});pBc(c,-0.9,3.9,-4.6,0.9,5.6,-4.2,0x3a3a3a,false,{j:0.02});pBc(c,-0.25,3.7,-4.65,0.25,5.8,-4.15,0x6a6a72,false,{j:0});pBc(c,-0.04,-5,-4.5,0.04,3.9,-4.4,0x6a5a3a,false,{j:0});
    poiHut(c,-14,-2,6,5,'E',{h:3.6,wall:0x8a6a3a,roof:0x4a3a2a,timber:true},rng);   // oficina
    poiRack(c,-12,3.5,true);poiBench(c,5,8,true);barrel(c,6,6);barrel(c,7.2,6.4);crate(c,6.4,7.6,1,1.1);
    for(let k=0;k<5;k++)pBc(c,5+k*0.6,0,-3+k*0.5,6.4+k*0.6,0.6+0.2*k,-1.6+k*0.5,rng.pick([0x7a6a5a,0x5a5a6a,0x8a5a3a,0xc8a030]),true,{j:0.08});   // minério à espera
    for(let k=0;k<4;k++)pBc(c,5.6+k*0.7,0,2+k*0.2,6.7+k*0.7,0.5+0.15*k,3.1+k*0.2,0x2a2a2a,false,{j:0.1});   // carvão
    poiPath(c,0,6.5,0,11);poiLampAt(c,3.4,8.5);poiSign(c,-3.5,9,0x8a3a2a);
    poiFlag(c,p,8,9,6);
  },
  sawmill(c,rng,p){   // galpão aberto, serra, rampa de toras com roda d'água, pilhas, carroça, escritório e serragem
    const r={x0:-6,x1:5,z0:-6,z1:0},f=makeShed(c,r,'S',{h:4,roof:0xc09050},rng);
    FB(c,f,7,3.2,10.5,4.2,0,0.9,0x8a6a3a,true);FB(c,f,8.6,3.1,8.8,4.3,0.9,1.9,0xc0c8d0,false,{j:0});FB(c,f,8.2,3.2,9.2,4.2,1.9,2.0,0x6a6a72,false,{j:0});   // bancada e serra
    FB(c,f,1.5,2,4.5,3.4,0,0.5,0xd0a868,false,{j:0.08});   // serragem
    for(let r2=0;r2<3;r2++)for(let k=0;k<4-r2;k++)pBc(c,-10+k*1.1+r2*0.55,r2*0.65,4,-9+k*1.1+r2*0.55,r2*0.65+0.65,8,r2%2?0x8a5a2a:0x6a4220,true,{j:0.05});
    for(let k=0;k<4;k++)for(let q=0;q<4;q++)pBc(c,5.2+q*0.1,k*0.32,3.4+q*0.05,9.5,k*0.32+0.3,5.6,k%2?0xd0a868:0xc89858,true,{j:0.04});   // tábuas em pilha cruzada
    pBc(c,-9.5,0,-9,-5,0.5,-7.5,0x6a4220,false,{j:0.1});
    poiCart(c,8.5,-7,true,0x6a4220);
    // canal de água com toras boiando até a roda (o poço de onde vêm as toras)
    pBc(c,-13,0,-8.6,-5.6,0.5,-8.2,0x6b4a2a,true,{j:0.03});pBc(c,-13,0,-5.0,-5.6,0.5,-4.6,0x6b4a2a,true,{j:0.03});pBc(c,-13,0,-8.2,-5.6,0.18,-5.0,0x3a7ad8,false,{j:0});
    for(let k=0;k<4;k++)pBc(c,-12.4+k*1.7,0.18,-7.6+(k%2)*0.7,-11.0+k*1.7,0.55,-7.0+(k%2)*0.7,0x6a4220,false,{j:0.05});
    // roda d'água
    pBc(c,6.0,0.3,-6.9,6.3,2.9,-6.6,0x4a3320,false,{j:0});for(let a=0;a<8;a++){const ang=a*0.785,px=6.15+Math.cos(ang)*1.3,py=1.6+Math.sin(ang)*1.3;pBc(c,px-0.25,py-0.15,-7.4,px+0.25,py+0.15,-6.0,0x7a5632,false,{j:0.03})}
    pBc(c,5.9,1.4,-7.2,6.4,1.8,-6.2,0x3a3a3a,false,{j:0});
    poiHut(c,-13,-1,6,5,'E',{h:3.6,wall:0xa87a4a,roof:0x6a4a2a,timber:true,shut:0x4a3a2a},rng);
    pBc(c,-1,0,-3.6,-0.1,0.5,-2.8,0x6b4a2a,true,{j:0.05});pBc(c,-0.7,0.5,-3.4,-0.5,1.2,-3.2,0xb0b0b8,false,{j:0});   // toco com machado
    poiPath(c,0,0.5,0,5);poiLampAt(c,3.4,1.2);poiFence(c,-14,7,10,7);
    poiFlag(c,p,9,2,6);
  },
  fort(c,rng,p){   // muralha de pedra com ameias e tochas, torres, portão com grade, pátio com poço, quartel, estábulo, treino e tendas
    const R=12;
    // muralha: núcleo de pedra com embasamento, fiadas e juntas alternadas nas duas faces, contrafortes e seteiras por fora, mata-cães no alto, ameias só na face de fora e passadiço livre
    const seams=(x0,z0,x1,z1)=>{
      const aX=(x1-x0)>(z1-z0),planes=aX?[[z0-0.05,z0],[z1,z1+0.05]]:[[x0-0.05,x0],[x1,x1+0.05]],a0=aX?x0:z0,a1=aX?x1:z1,JC=0x55555c;
      for(const pl of planes){
        for(let y=1.1;y<4;y+=0.9){if(aX)pBc(c,a0,y,pl[0],a1,y+0.07,pl[1],JC,false,{j:0});else pBc(c,pl[0],y,a0,pl[1],y+0.07,a1,JC,false,{j:0})}
        for(let k=0,y=1.1;y<3.9;y+=0.9,k++)for(let a=a0+(k%2?0.7:0);a<a1;a+=1.4){if(aX)pBc(c,a,y,pl[0],a+0.07,y+0.9,pl[1],JC,false,{j:0});else pBc(c,pl[0],y,a,pl[1],y+0.9,a+0.07,JC,false,{j:0})}
      }
    };
    const wall=(x0,z0,x1,z1,out)=>{
      const aX=(x1-x0)>(z1-z0),g=0.35,ox0=out==='W'?x0-g:x0,ox1=out==='E'?x1+g:x1,oz0=out==='N'?z0-g:z0,oz1=out==='S'?z1+g:z1;
      poiWall(c,x0,z0,x1,z1,4,0x8a8a90);pBc(c,ox0,0,oz0,ox1,1.1,oz1,0x6a6a72,true,{j:0.04});   // núcleo e embasamento (mais largo e escuro)
      seams(x0,z0,x1,z1);
      const L=aX?x1-x0:z1-z0,a0=aX?x0:z0;
      // por fora: contrafortes, seteiras, corbéis (mata-cães) e a borda de cima
      const o=out==='N'?-1:out==='W'?-1:1,pl=aX?(out==='N'?z0:z1):(out==='W'?x0:x1);
      const P=(a0_,y0,p0,a1_,y1,p1,col,s)=>{if(aX)pBc(c,a0_,y0,Math.min(p0,p1),a1_,y1,Math.max(p0,p1),col,s,{j:0.03});else pBc(c,Math.min(p0,p1),y0,a0_,Math.max(p0,p1),y1,a1_,col,s,{j:0.03})};
      for(let a=a0+0.6;a<a0+L-0.2;a+=6){P(a,0,pl,a+1.0,4.4,pl+o*0.55,0x7a7a82,true)}   // contrafortes
      for(let a=a0+3;a<a0+L-1;a+=4){P(a,2.2,pl,a+0.22,3.3,pl+o*0.06,0x16161a,false)}      // seteiras
      for(let a=a0+0.2;a<a0+L-0.2;a+=1.4)P(a,3.1,pl,a+0.5,3.7,pl+o*0.3,0x72727a,false);    // corbéis
      P(a0,3.7,pl,a0+L,4.0,pl+o*0.3,0x7e7e86,false);                                       // cordão de pedra sob as ameias
      for(let a=a0;a<a0+L-0.5;a+=1.7)P(a,4.0,pl-o*0.0,a+0.9,4.9,pl-o*0.5,0x7a7a82,true);   // ameias só na faixa de fora (0,5)
    };
    wall(-R,-R,R,-R+1.4,'N');wall(-R,-R,-R+1.4,R,'W');wall(R-1.4,-R,R,R,'E');wall(-R,R-1.4,-2.4,R,'S');wall(2.4,R-1.4,R,R,'S');
    pBc(c,-2.4,3.4,R-1.4,2.4,4.2,R,0x7a7a82,true,{j:0.03});   // arco do portão
    for(let x=-2.0;x<=2.0;x+=0.8)pBc(c,x-0.05,2.0,R-1.1,x+0.05,3.4,R-0.9,0x2a2a2a,false,{j:0});   // grade do portão (levantada)
    for(const s of[-1,1]){pBc(c,s*2.9-0.4,0,R-1.5,s*2.9+0.4,4.7,R+0.4,0x7a7a82,true,{j:0.03});pBc(c,s*2.0-0.35,2.3,R+0.02,s*2.0+0.35,3.8,R+0.1,0xa02a2a,false,{j:0.02})}   // pilastras e estandartes do portão
    for(let x=-2.5;x<2.6;x+=0.7)pBc(c,x,3.2,R+0.0,x+0.4,4.0,R+0.4,0x72727a,false,{j:0.03});   // mata-cães sobre o portão
    for(let i=0;i<4;i++)pBc(c,-9+i,0,-R+1.4,-8+i,i+1,-R+2.8,i%2?0x8a8a92:0x7a7a82,true,{j:0.03});   // escada até o passadiço da muralha norte
    for(const sx of[-1,1])for(const sz of[-1,1]){const x=sx*R,z=sz*R;
      pBc(c,x-2.2,0,z-2.2,x+2.2,7,z+2.2,0x74747a,true,{j:0.04});pBc(c,x-2.5,0,z-2.5,x+2.5,1.2,z+2.5,0x62626a,true,{j:0.03});   // fuste e embasamento
      pBc(c,x-2.5,7,z-2.5,x+2.5,7.5,z+2.5,0x5a5a62,true,{j:0.02});
      for(const y of[3.4,6.2])pBc(c,x-2.35,y,z-2.35,x+2.35,y+0.22,z+2.35,0x8a8a92,false,{j:0.02});   // cordões de pedra
      for(let k=0;k<7;k++){const y=0.7+k*1.0;for(const [qx,qz] of[[-2.2,-2.2],[2.2,-2.2],[-2.2,2.2],[2.2,2.2]])pBc(c,x+qx-0.3,y,z+qz-0.3,x+qx+0.3,y+0.5,z+qz+0.3,k%2?0x8a8a92:0x7a7a82,false,{j:0.04})}   // cunhais nos cantos
      for(const q of[-1,1]){for(const y of[2.8,5.0]){pBc(c,x+q*0.5-0.1,y,z-2.24,x+q*0.5+0.1,y+1.1,z-2.2,0x16161a,false,{j:0});pBc(c,x+q*0.5-0.1,y,z+2.2,x+q*0.5+0.1,y+1.1,z+2.24,0x16161a,false,{j:0});pBc(c,x-2.24,y,z+q*0.5-0.1,x-2.2,y+1.1,z+q*0.5+0.1,0x16161a,false,{j:0});pBc(c,x+2.2,y,z+q*0.5-0.1,x+2.24,y+1.1,z+q*0.5+0.1,0x16161a,false,{j:0})}}   // seteiras
      for(let a=-2.4;a<2.5;a+=1.2){for(const [qx,qz,w,d] of[[a,-2.5,0.8,0.5],[a,2.0,0.8,0.5],[-2.5,a,0.5,0.8],[2.0,a,0.5,0.8]])pBc(c,x+qx,7.5,z+qz,x+qx+w,8.4,z+qz+d,0x7a7a82,true,{j:0.03})}   // ameias em volta da torre
    }
    for(const sx of[-1,1])for(const z of[-6,0,6]){const x=sx*(R-1.6);pBc(c,x-0.08,4,z-0.08,x+0.08,5.0,z+0.08,0x4a3320,false,{j:0});pBc(c,x-0.2,5.0,z-0.2,x+0.2,5.4,z+0.2,0xff9a2a,false,{j:0.05})}   // tochas na muralha
    poiHut(c,-4,-8,8,6,'S',{h:5,wall:0x9a9a98,roof:0x4a4a52,roofT:'hip',chimney:false},rng);   // torre de menagem
    poiHut(c,-8,2,6,4,'E',{h:3.6,wall:0x8a7a62,roof:0x5a4a3a,timber:true},rng);                // quartel (afastado da torre de menagem, para dar passagem)
    poiWell(c,7,-2);   // poço no lugar do estábulo (o pátio fica limpo: sem tendas, bonecos nem caixotes)
    poiRack(c,6,6,true);poiBench(c,5.5,8.2,true);poiPole(c,9,6.8,2.2);pBc(c,8.2,1.4,6.7,9.8,1.6,6.9,0x4a3320,false,{j:0});pBc(c,8.65,2.2,6.45,9.35,2.8,7.15,0xb89048,false,{j:0.05});   // decoração do canto sudeste: estante de armas, banco e boneco de treino
    pBc(c,-10.6,0,5.5,-9.2,1,6.5,0x7a7a82,true,{j:0.03});pBc(c,-10.6,0,6.5,-9.2,2,7.5,0x8a8a92,true,{j:0.03});pBc(c,-10.6,0,7.5,-9.2,3,8.5,0x7a7a82,true,{j:0.03});pBc(c,-10.6,0,8.5,-9.2,4,9.5,0x8a8a92,true,{j:0.03});   // escada de pedra até o passadiço da muralha oeste (último degrau na altura 4)
poiPath(c,0,R+1,0,4);poiBrazier(c,-3.4,R+1.6);poiBrazier(c,3.4,R+1.6);
    poiFlag(c,p,0,-R+0.7,10);
  },
  tower(c,rng,p){   // torre de vigia de pedra com escada externa (degraus de 1 bloco), plataforma com parapeito, braseiro e teto de madeira; porta ao norte
    const b=3.3,E=1.4;
    poiWall(c,-b,b-1,b,b,9,0x7a7a82);poiWall(c,-b,-b,-b+1,b,9,0x7a7a82);poiWall(c,b-1,-b,b,b,9,0x7a7a82);
    poiWall(c,-b,-b,-0.9,-b+1,9,0x7a7a82);poiWall(c,0.9,-b,b,-b+1,9,0x7a7a82);pBc(c,-0.9,2.8,-b,0.9,9,-b+1,0x7a7a82,true,{j:0.04});   // porta ao norte
    for(const y of[3.4,6.4])pBc(c,-b-0.1,y,-b-0.1,b+0.1,y+0.25,b+0.1,0x6a6a72,false,{j:0.02});   // cintas de pedra
    for(const y of[4.6,7.4])for(const s of[-1,1]){pBc(c,s*(b-0.02)-0.05,y,-0.4,s*(b-0.02)+0.05,y+1.0,0.4,0x1a1a1a,false,{j:0})}   // seteiras
    // escada externa: 7 degraus ao longo da face sul, um no canto, e o último na face leste, ao lado da plataforma
    for(let i=0;i<7;i++)pBc(c,-b+i*(2*b/7),0,b,-b+(i+1)*(2*b/7),i+1,b+E,i%2?0x8a8a92:0x7a7a82,true,{j:0.03});
    pBc(c,b,0,b,b+E,8,b+E,0x8a8a92,true,{j:0.03});pBc(c,b,0,b-E,b+E,9,b,0x7a7a82,true,{j:0.03});
    for(let i=0;i<8;i++){const x=-b+i*(2*b/7);pBc(c,x-0.05,i+1,b+E-0.1,x+0.05,i+2.1,b+E,0x4a3320,false,{j:0})}   // balaustre
    pBc(c,-b-0.4,9,-b-0.4,b,9.5,b,0x6b4a2a,true,{j:0.03});   // plataforma: sem beiral ao sul e a leste, para a cabeça de quem sobe a escada não bater nela
    for(let k=-b-0.4;k<b+0.4;k+=1.2){pBc(c,k,9.5,-b-0.4,k+0.7,10.8,-b-0.2,0x7a5632,true,{j:0.04});if(k<b-0.8)pBc(c,k,9.5,b-0.2,k+0.7,10.8,b,0x7a5632,true,{j:0.04});pBc(c,-b-0.4,9.5,k,-b-0.2,10.8,k+0.7,0x7a5632,true,{j:0.04});if(k<b-1.6)pBc(c,b-0.2,9.5,k,b,10.8,k+0.7,0x7a5632,true,{j:0.04})}   // parapeito com colisão (1,3 de altura: um pulo de 1 bloco não passa)
    pBc(c,-b-0.4,10.5,-b-0.4,b,10.8,-b-0.2,0x6b4a2a,true,{j:0.02});pBc(c,-b-0.4,10.5,b-0.2,b,10.8,b,0x6b4a2a,true,{j:0.02});pBc(c,-b-0.4,10.5,-b-0.4,-b-0.2,10.8,b,0x6b4a2a,true,{j:0.02});pBc(c,b-0.2,10.5,-b-0.4,b,10.8,b-1.6,0x6b4a2a,true,{j:0.02});   // corrimão contínuo (aberto onde a escada chega)
    for(const sx of[-1,1])for(const sz of[-1,1])pBc(c,sx*b-0.12,10.8,sz*b-0.12,sx*b+0.12,13.2,sz*b+0.12,0x4a3320,false,{j:0});
    roofOn(c,-b-0.4,-b-0.4,b+0.4,b+0.4,13.2,'hip',0x7a4a2a,{trim:0x4a3320});   // telhado inteiro, igual ao das casas
    fillT(c,{x0:-2,x1:2,z0:-2,z1:2},T_FLOOR);
    poiBrazier(c,-b+0.8,-b+0.8,9.5);pBc(c,-1.4,9.5,0,1.4,10.2,0.7,0x6b4a2a,true,{j:0.04});   // braseiro e mesa de observação
    {const bx=0,bz=-b+0.5;pBc(c,bx-0.08,9.5,bz-0.08,bx+0.08,10.6,bz+0.08,0x3a3a3a,true,{j:0});pBc(c,bx-0.3,10.55,bz-0.5,bx+0.3,10.75,bz+0.5,0x4a4a52,false,{j:0});   // binóculo no tripé (será usado para achar POIs)
    for(const s of[-0.14,0.14]){pBc(c,bx+s-0.1,10.65,bz-0.6,bx+s+0.1,10.9,bz+0.4,0x2a2a32,false,{j:0});pBc(c,bx+s-0.13,10.62,bz-0.7,bx+s+0.13,10.93,bz-0.58,0x6ab0ff,false,{j:0})}p.binoc={x:c.cx+bx,y:c.y+10.8,z:c.cz+bz}}
    // por dentro (térreo): cama, baú, mesa e estante
    pBc(c,-2.2,0,-1.8,-0.6,0.5,0.6,0x6b4a2a,true,{j:0.03});pBc(c,-2.2,0.5,-1.8,-0.6,0.7,0.6,0xc03a3a,false,{j:0});pBc(c,0.9,0,-2,2.3,0.7,-1.2,0x7a4a22,true,{j:0.03});pBc(c,0.5,0,0.6,2.4,0.9,1.6,0x5a3d22,true,{j:0.03});pBc(c,0.5,0.9,0.6,2.4,1.0,1.6,0x8a6a3a,false,{j:0});
    pBc(c,-0.8,0.2,0,0.4,0.28,0.6,0xe0d8c0,false,{j:0});
    poiLampAt(c,-1.8,-b-1.4);poiSign(c,1.8,-b-1.6,0x4a3a2a);poiBench(c,-b-2,-1,false);poiPath(c,0,-b-0.5,0,-b-4);
    pBc(c,-5.2,0,-5.2,-4.4,2.4,-4.4,0x4a3320,false,{j:0});pBc(c,-5.5,2.4,-5.5,-4.1,2.8,-4.1,0x4a3320,false,{j:0.02});
    p.vigilPos={x:c.cx,z:c.cz};   // dentro da base: [E] Fazer vigia
    poiFlag(c,p,b+2.6,-b-1,7);
  },
  tavern(c,rng,p){   // térreo = taverna das cidades (balcão, fogão, mesas); escada interna até um andar com saguão e quartos (uma porta aberta, o resto falso)
    const r={x0:-9,x1:8,z0:-8,z1:4},D='S',doorU=8;   // 18 × 13; a porta fica no meio
    const f=makeBuilding(c,r,D,doorU,{floors:2,noFloors:true,wall:0xc89a62,glass:0x9ed4ff,roof:0x5a3a24,roofT:'gable',chimney:true,timber:true,shut:0x5a3d22,base:0xa88a5a},rng);
    const U=f.U,V=f.V,Y=3.6,SZ={u0:15.0,u1:17.0,v1:5.0};   // SZ: vão da escada no canto da frente, à direita
    buildTavern(c,f,D,doorU,rng,{stair:true,rows:[2.6,5.7],colStep:3.0,stairZone:{u0:SZ.u0,v1:SZ.v1},barStools:true});   // taverneiro e fregueses entram na fatia 2
    p.tavern=c.tavern;p.stove=c.stove;p.keepers=(c.keepers||[]).slice();   // balcão, fogão e taverneiro/fregueses (poigame.js)
    const W2=(u0,v0,u1,v1,y0,y1,col,s,o)=>FB(c,f,u0,v0,u1,v1,y0,y1,col,s,Object.assign({b:true},o||{}));
    // laje (piso do andar de cima / teto do térreo), com o vão da escada
    W2(0,SZ.v1,U,V,3.2,3.6,0x8a6a3a,true,{j:0.02});W2(0,0,SZ.u0,SZ.v1,3.2,3.6,0x8a6a3a,true,{j:0.02});W2(SZ.u1,0,U,SZ.v1,3.2,3.6,0x8a6a3a,true,{j:0.02});
    for(let j=0;j<4;j++)W2(SZ.u0+0.2,1.0+j,SZ.u1-0.2,2.0+j,0,0.9*(j+1),j%2?0x8a6a3a:0x7a5632,true,{j:0.03});   // degraus de 0,9 (o jogador sobe até 1,05)
    W2(SZ.u0-0.12,1.0,SZ.u0,SZ.v1,Y,Y+1.0,0x5a3d22,true);for(let v=1.2;v<SZ.v1;v+=1.0)W2(SZ.u0-0.1,v,SZ.u0+0.06,v+0.1,Y,Y+1.05,0x4a2f1a,false,{j:0});   // corrimão em volta do vão
    W2(SZ.u0,0.95,SZ.u1,1.07,Y,Y+1.0,0x5a3d22,true);
    // andar de cima: saguão (v 1 a 6,4) e 5 quartos ao fundo (v 6,7 a V-1)
    W2(1.2,1.4,3.6,2.8,Y,Y+0.05,0x7a2a2a,false,{j:0});W2(1.5,3.2,2.9,4.4,Y,Y+0.75,0x7a5632,true);W2(1.7,3.4,2.7,4.2,Y+0.75,Y+0.82,0xe8d8a8,false,{j:0});   // tapete e mesinha
    for(const u of[6.0,12.0]){W2(u,0.9,u+0.4,1.4,Y+2.2,Y+2.8,0xffe9a0,false,{j:0})}   // lampiões na parede da frente
    const PV=6.4,open=rng.int(0,4);p.roomDoor=open;
    let u0=1;
    for(let i=0;i<5;i++){
      const ra=1+i*3.2,rb=ra+3.2,uc=ra+1.6;
      if(i)W2(ra-0.15,PV,ra+0.15,V-1,Y,Y+3.0,0xb89a6a,true,{j:0.02});   // divisória entre quartos
      W2(u0,PV,uc-0.65,PV+0.3,Y,Y+3.0,0xb89a6a,true,{j:0.02});u0=uc+0.65;   // parede do corredor até o vão da porta
      if(i!==open){   // porta falsa: folha fechada com maçaneta e plaquinha com o número
        W2(uc-0.65,PV,uc+0.65,PV+0.2,Y,Y+2.5,0x5a3d22,true,{j:0.02});W2(uc+0.35,PV-0.05,uc+0.5,PV,Y+1.1,Y+1.25,0xe0b030,false,{j:0});W2(uc-0.2,PV-0.05,uc+0.2,PV,Y+1.9,Y+2.2,0xe8d8a8,false,{j:0});
      }else{
        W2(uc-0.65,PV+0.3,uc-0.5,PV+1.6,Y,Y+2.5,0x5a3d22,false,{j:0.02});   // folha aberta para dentro
        // quarto do jogador: cama, mesinha com vela, baú, tapete
        W2(uc-1.4,V-3.4,uc-0.2,V-1.1,Y,Y+0.5,0x6b4a2a,true,{j:0.02});W2(uc-1.3,V-3.1,uc-0.3,V-1.2,Y+0.5,Y+0.75,0xc03a3a,false,{j:0.02});W2(uc-1.3,V-1.6,uc-0.3,V-1.2,Y+0.75,Y+0.9,0xf0ece0,false,{j:0});
        W2(uc+0.5,V-2.6,uc+1.4,V-1.8,Y,Y+0.7,0x7a5632,true,{j:0.02});W2(uc+0.8,V-2.4,uc+1.0,V-2.2,Y+0.7,Y+0.95,0xfff0b0,false,{j:0});
        W2(uc+0.3,PV+1.0,uc+1.3,PV+1.8,Y,Y+0.7,0x7a4a22,true,{j:0.02});W2(uc-1.2,PV+1.0,uc+0.1,PV+2.6,Y,Y+0.04,0x7a2a2a,false,{j:0});
      }
    }
    W2(u0,PV,U-1,PV+0.3,Y,Y+3.0,0xb89a6a,true,{j:0.02});   // fecha o último trecho da parede
    {const uco=1+open*3.2+1.6,bm=f.map(uco-0.8,V-2.2);p.bed={x:c.cx+bm[0],z:c.cz+bm[1],y:c.y+3.6}}   // a cama do quarto aberto: [E] Dormir
    for(const [uu,vv] of[[3,V-1.3],[9,V-1.3]])W2(uu,vv,uu+0.5,vv+0.3,Y+2.2,Y+2.8,0xffe9a0,false,{j:0});
    // por fora: o caminho até a porta (u 6 a 12) fica livre; barris, banco e cocho nas laterais, placa na frente, lampiões
    W2(0.8,-1.8,1.7,-0.9,0,0.95,0x7a5a30,true);W2(0.8,-3.0,1.7,-2.1,0,0.95,0x7a5a30,true);W2(2.4,-1.5,4.4,-0.9,0.45,0.6,0x7a5632,true);W2(2.5,-1.5,2.7,-0.9,0,0.45,0x5a3d22,false,{j:0});W2(4.1,-1.5,4.3,-0.9,0,0.45,0x5a3d22,false,{j:0});
    W2(12.5,-2.2,16.5,-1.4,0,0.6,0x7a5632,true,{j:0.04});W2(12.6,-2.1,16.4,-1.5,0.6,0.7,0x3a7ad8,false,{j:0});
    W2(5.2,-0.6,5.32,-0.48,0,3.6,0x4a2f1a,false,{j:0});W2(5.2,-0.6,7.2,-0.48,3.3,3.6,0x4a2f1a,false,{j:0});W2(6.1,-0.6,7.2,-0.5,2.4,3.3,0x5a3d22,false,{j:0});W2(6.2,-0.5,7.1,-0.45,2.5,3.2,0xf0d890,false,{j:0});   // placa pendurada
    for(const uu of[5.0,13.0]){W2(uu,-1.2,uu+0.2,-1.0,0,3.2,0x2a2a2a,true,{j:0});W2(uu-0.15,-1.35,uu+0.35,-0.85,3.2,3.7,0xffe9a0,false,{j:0})}
    for(let v=-6;v<0;v++)for(let u=6;u<12;u++){const m=f.map(u+0.5,v+0.5);setTL(c,Math.floor(m[0]),Math.floor(m[1]),T_STREET)}   // chão batido na frente
    // área do ferreiro ao lado da taverna (leste): chão de pedra, telhado aberto, fornalha com chaminé, fuligem, bigorna, fole, barril de têmpera, ferramentas e carvão
    for(let i=0;i<6;i++)for(let j=0;j<6;j++)pBc(c,10+i,0,-7+j,11+i,0.07,-6+j,(i+j)%2?0x7a7a82:0x6a6a72,false,{j:0.02});
    for(const [x,z] of[[10.2,-6.8],[15.6,-6.8],[10.2,-1.4],[15.6,-1.4]])pBc(c,x,0,z,x+0.3,3.0,z+0.3,0x5a3d22,true,{j:0});
    for(let k=0;k<4;k++)pBc(c,9.8,3.0+k*0.2,-7.2+k*1.55,16.2,3.2+k*0.2,-5.5+k*1.55,k%2?0x4a3a2a:0x5a4a3a,false,{j:0.03});
    pBc(c,9.8,2.96,-7.2,16.2,3.0,-4.2,0x1a1a1e,false,{j:0});   // fuligem no forro, sobre a fornalha
    pBc(c,13.6,0,-6.6,15.8,1.7,-4.6,0x6a6a70,true,{j:0.03});pBc(c,14.2,1.7,-6.3,15.2,4.6,-5.4,0x5a5a60,true,{j:0.03});pBc(c,14.1,4.0,-6.4,15.3,4.6,-5.3,0x2a2a2e,false,{j:0});   // fornalha e chaminé (topo enegrecido)
    pBc(c,13.5,0.5,-6.1,13.62,1.2,-5.1,0x1a1a1a,false,{j:0});pBc(c,13.45,0.55,-5.95,13.6,0.95,-5.25,0xff7a1a,false,{j:0});pBc(c,13.42,0.6,-5.8,13.58,0.8,-5.4,0xffd84a,false,{j:0});   // boca da fornalha com brasa
    pBc(c,12.6,0.07,-6.9,13.5,0.1,-4.3,0x1a1a1a,false,{j:0.05});pBc(c,15.8,0.07,-6.9,16.1,0.1,-4.5,0x222226,false,{j:0.05});   // fuligem no chão
    pBc(c,13.8,0.3,-4.5,14.9,0.8,-3.9,0x6b4a2a,true,{j:0.03});pBc(c,14.9,0.4,-4.4,15.7,0.65,-4.0,0x3a2a1a,false,{j:0.02});   // fole
    pBc(c,11.0,0,-3.4,12.0,0.5,-2.4,0x6b4a2a,true,{j:0.04});pBc(c,10.85,0.5,-3.3,12.15,0.8,-2.5,0x2a2a2e,false,{j:0});pBc(c,12.15,0.55,-3.1,12.7,0.75,-2.7,0x2a2a2e,false,{j:0});   // bigorna sobre o cepo
    pBc(c,10.4,0,-6.3,11.6,0.7,-5.2,0x6b4a2a,true,{j:0.03});pBc(c,10.5,0.7,-6.2,11.5,0.78,-5.3,0x3a7ad8,false,{j:0});   // barril de têmpera
    poiRack(c,12.2,-1.5,true);poiSign(c,9.0,-1.2,0x4a4a52);
    for(let k=0;k<5;k++)pBc(c,15.1+k*0.15,0,-3.2+k*0.25,15.6+k*0.15,0.25+0.1*k,-2.8+k*0.25,0x2a2a2a,false,{j:0.1});   // carvão
    // caminho da porta da taverna até o ferreiro, com arbustos, flores, árvores pequenas, lampiões e bancos dos dois lados
    poiPath(c,-1,5.5,-1,9);poiPath(c,-1,9,12,9);poiPath(c,12,9,12,0.5);
    for(let x=1;x<=11;x+=2){const s=(x/2|0)%2?1:-1;   // alterna os lados do trecho de leste a oeste
      const bx=x+0.2,bz=9+s*1.7;
      pBc(c,bx,0,bz,bx+0.9,0.7,bz+0.8,rng.pick([0x3a7a2a,0x4a8a32,0x2f6a24]),false,{j:0.12});   // arbusto
      if(x%4===1)for(let k=0;k<3;k++)pBc(c,bx+k*0.3,0,bz+(s>0?0.9:-0.5),bx+k*0.3+0.2,0.35,bz+(s>0?1.1:-0.3),rng.pick([0xe0409a,0xf0d040,0xf0f0f0,0xe05a2a]),false,{j:0.04})}   // flores
    for(let z=1.5;z<=8;z+=2.2){const s=(z*2|0)%2?1:-1;pBc(c,12+s*1.8,0,z,12+s*1.8+0.9,0.7,z+0.8,rng.pick([0x3a7a2a,0x4a8a32]),false,{j:0.12});if(z>2)for(let k=0;k<3;k++)pBc(c,12-s*1.8+k*0.3,0,z+0.2,12-s*1.8+k*0.3+0.2,0.35,z+0.4,rng.pick([0xe0409a,0xf0d040,0xf0f0f0,0xe05a2a]),false,{j:0.04})}
    for(const [tx,tz] of[[3,11.5],[9,11.8],[14.5,6.5],[9.5,6.5]])tinyTree(c,tx,tz,rng);
    poiLampAt(c,2,7.8);poiLampAt(c,10,10.2);poiLampAt(c,13.4,4);
    poiBench(c,5,10.2,true);barrel(c,14.2,2.2);crate(c,14.4,3.4,1,0.9);
    p.svcSpec=[{kind:'smith',role:'smith',label:'Ferreiro: consertar arma',x:c.cx+11.5,z:c.cz-1.7,yaw:Math.PI}];
    const seat=p.keepers.find(k=>k.role==='patron');   // o mercenário ocupa o lugar de um freguês sentado à mesa (só na taverna do jogador; nas outras o freguês fica)
    if(seat){seat.merc=true;p.svcSpec.push({kind:'merc',label:'Mercenário: recrutar soldado',x:seat.x,z:seat.z,seat:true})}
    poiFlag(c,p,-11,6,9);
  },
  inn(c,rng,p){   // pousada: casa de um andar com balcão, duas camas e placa; o enfeite de fora muda com o tema do tile (poiRestTheme)
    poiHouse(c,-6,-8,12,8,'S',{h:4,wall:0xd8b888,roof:0x8a3a2a,chimney:true,timber:true,shut:0x4a3a2a},rng);
    pBc(c,-5.2,0,-5.4,-1.6,1.05,-4.7,0x7a5632,true,{j:0.03});pBc(c,-5.3,1.05,-5.5,-1.5,1.15,-4.6,0x9a6a3a,false,{j:0.02});   // balcão (o pousadeiro fica atrás)
    for(const [bx,sw] of[[0.6,0xc03a3a],[2.6,0x3a6ac0]]){pBc(c,bx,0,-6.9,bx+1.5,0.5,-4.5,0x6b4a2a,true,{j:0.02});pBc(c,bx+0.1,0.5,-6.8,bx+1.4,0.75,-5.2,sw,false,{j:0.02});pBc(c,bx+0.1,0.5,-5.2,bx+1.4,0.7,-4.6,0xf0ece0,false,{j:0})}   // camas
    pBc(c,-0.4,0,-7.0,0.2,0.7,-6.4,0x7a4a22,true,{j:0.02});pBc(c,-0.2,0.7,-6.9,0,0.95,-6.5,0xfff0b0,false,{j:0});   // criado-mudo com vela
    p.bed={x:c.cx+1.35,z:c.cz-5.6,y:c.y+0.1};   // a cama: [E] Dormir (com o quarto reservado)
    poiRestTheme(c,rng,p);
    poiPath(c,0,0,0,9);poiLampAt(c,2.8,1.5);poiLampAt(c,-2.8,1.5);poiSign(c,3.6,3.5,0x6a3a2a);poiWell(c,-8,4);
    for(const [tx,tz] of[[-10,-6],[9,-4],[9,8]])tinyTree(c,tx,tz,rng);
    p.keepers=[];p.svcSpec=[{kind:'inn',role:'merchant',label:'Pousadeiro: comida, remédios e quarto',x:c.cx-3.4,z:c.cz-6.2,yaw:0}];
    poiFlag(c,p,6.5,2,6);
  },
  lodge(c,rng,p){   // alojamento: barracão aberto com beliches, tendas e cozinha de campo (fogueira com panela, mesa, barris); rústico
    for(const [x,z] of[[-9,-9],[2,-9],[-9,-1],[2,-1],[-3.5,-1],[-3.5,-9]])pBc(c,x-0.18,0,z-0.18,x+0.18,3.4,z+0.18,0x5a3d22,true,{j:0.02});   // pilares
    pBc(c,-9,0,-9.2,2,3.4,-8.8,0x7a5632,true,{j:0.03});   // parede do fundo
    for(const s of[-9,2])pBc(c,s-0.1,0,-9,s+0.1,1.2,-1,0x7a5632,true,{j:0.04});   // muretas laterais
    roofOn(c,-9.8,-9.8,2.8,-0.2,3.4,'gable',0x6a5a3a,{trim:0x4a3320});
    for(const bx of[-8.2,-5.2,-2.4]){   // beliches: dois leitos empilhados com cobertas
      pBc(c,bx,0,-8.6,bx+1.5,0.5,-6.4,0x6b4a2a,true,{j:0.02});pBc(c,bx+0.1,0.5,-8.5,bx+1.4,0.7,-6.5,rng.pick([0x8a3a3a,0x3a5a8a,0x5a7a3a]),false,{j:0.03});
      pBc(c,bx,1.5,-8.6,bx+1.5,1.75,-6.4,0x6b4a2a,true,{j:0.02});pBc(c,bx+0.1,1.75,-8.5,bx+1.4,1.95,-6.5,rng.pick([0x8a3a3a,0x3a5a8a,0x5a7a3a]),false,{j:0.03});
      for(const [px,pz] of[[bx,-8.6],[bx+1.4,-8.6],[bx,-6.5],[bx+1.4,-6.5]])pBc(c,px,0,pz,px+0.12,1.5,pz+0.12,0x5a3d22,true,{j:0})}
    p.bed={x:c.cx-4.5,z:c.cz-5.4,y:c.y+0.1};
    const tent=(tx,tz,col)=>{for(let i=0;i<5;i++){const w=1.8-i*0.34;pBc(c,tx-w,i*0.5,tz-1.4,tx+w,i*0.5+0.5,tz+1.4,shadec(col,i%2?1.07:0.95),i<3,{j:0.06})}pBc(c,tx-0.5,0,tz+1.35,tx+0.5,1.5,tz+1.45,0x1f1710,false,{j:0})};
    tent(8,-7,0x8a7a4a);tent(-12,4,0x6a7a4a);tent(11.5,-1.5,0x9a8a5a);
    // cozinha de campo: anel de pedras, brasa, tripé com panela, mesa de preparo, bancos, barris e lenha
    for(let a=0;a<8;a++){const sx=6+Math.cos(a*0.785)*1.3,sz=3+Math.sin(a*0.785)*1.3;pBc(c,sx-0.3,0,sz-0.3,sx+0.3,0.4,sz+0.3,rng.pick(poiStone),true,{j:0.06})}
    pBc(c,5.4,0,2.4,6.6,0.25,3.6,0xff7a1a,false,{j:0.08});pBc(c,5.7,0.25,2.7,6.3,0.55,3.3,0xffd84a,false,{j:0.08});
    for(const [dx,dz] of[[-1.2,-1.2],[1.2,-1.2],[0,1.4]])pBc(c,6+dx*0.7-0.06,0,3+dz*0.7-0.06,6+dx*0.25+0.06,2.6,3+dz*0.25+0.06,0x4a3320,false,{j:0});
    pBc(c,5.5,1.5,2.5,6.5,2.2,3.5,0x2a2a2e,true,{j:0.04});pBc(c,5.6,2.2,2.6,6.4,2.35,3.4,0x8a6a3a,false,{j:0});   // panela com caldo
    pBc(c,2,0,5.2,6,0.95,6.4,0x7a5632,true,{j:0.03});for(let k=0;k<5;k++)pBc(c,2.3+k*0.75,0.95,5.4+(k%2)*0.4,2.8+k*0.75,1.2,5.8+(k%2)*0.4,rng.pick([0xc83a2a,0xe08a2a,0x5ab03a,0xd8d0b0]),false,{j:0.06});
    poiBench(c,2,7.6,true);poiBench(c,5,7.6,true);barrel(c,8.5,5.2);barrel(c,9.7,5.6);crate(c,9.2,3.4,1.1,1.1);
    for(let k=0;k<3;k++)pBc(c,-1+k*0.3,0,3+k*0.7,0.8+k*0.3,0.5+0.3*k,3.6+k*0.7,0x6b4a2a,true,{j:0.06});   // lenha
    poiRestTheme(c,rng,p);
    poiPath(c,0,0,0,8);poiLampAt(c,-2.5,3);poiSign(c,-3.5,1.2,0x6a4a2a);
    for(const [tx,tz] of[[-10,-12],[12,6],[-8,9]])tinyTree(c,tx,tz,rng);
    p.keepers=[];p.svcSpec=[{kind:'inn',role:'merchant',label:'Cozinheiro: cantina e cama',x:c.cx+1.8,z:c.cz+3.8,yaw:Math.PI*0.5}];
    poiFlag(c,p,-4,2,6);
  },
  ruinvil(c,rng,p){   // vila arrasada do tamanho de uma vila (raio POI_RUINVIL.r): casas em grade com paredes meio caídas, praça com poço seco, caminhos, entulho e mato; sem moradores nem serviços (não se reconstrói)
    const R=POI_DEFS.ruinvil.r,Q=POI_RUINVIL,cell=Q.cell;
    for(let gz=-R;gz<R;gz+=cell)for(let gx=-R;gx<R;gx+=cell){   // uma casa por célula da grade (algumas faltam: viram só mato)
      const w=rng.int(5,8),d=rng.int(5,7),x0=gx+rng.range(1,cell-w-1),z0=gz+rng.range(1,cell-d-1);
      if(Math.hypot(x0+w/2,z0+d/2)>R-w||Math.hypot(x0+w/2,z0+d/2)<Q.square||rng.chance(Q.empty))continue;
      pBc(c,x0,0,z0,x0+w,0.12,z0+d,0x6a5a46,false,{j:0.04});   // soleira de pedra
      for(const [ax,az,bx,bz] of[[x0,z0,x0+w,z0+0.7],[x0,z0+d-0.7,x0+w,z0+d],[x0,z0,x0+0.7,z0+d],[x0+w-0.7,z0,x0+w,z0+d]]){
        const n=Math.max(1,Math.round(Math.hypot(bx-ax,bz-az)/1.6));
        for(let k=0;k<n;k++){const h=rng.chance(0.35)?0:rng.range(0.6,2.8);if(h>0.05)pBc(c,ax+(bx-ax)*k/n,0,az+(bz-az)*k/n,ax+(bx-ax)*(k+1)/n,h,az+(bz-az)*(k+1)/n,rng.pick([0x9a8a70,0xa89878,0x8a7a62]),true,{j:0.07})}}
      for(let k=0;k<3;k++){const bx=x0+rng.range(0.5,w-2),bz=z0+rng.range(0.5,d-1);pBc(c,bx,0,bz,bx+rng.range(2,3.5),0.35,bz+0.35,0x2a1e16,false,{j:0.05})}   // vigas queimadas
      if(rng.chance(0.5))pBc(c,x0+w*0.5,0,z0+d*0.4,x0+w*0.5+0.7,rng.range(2.5,4),z0+d*0.4+0.7,0x3a2e26,true,{j:0.04});   // chaminé de pé
      if(rng.chance(0.4))poiFence(c,x0-1,z0+d+1.5,x0+w*0.6,z0+d+1.5);   // resto de cerca do quintal
    }
    poiPath(c,-R+6,0,R-6,0,0x7a6a50);poiPath(c,0,-R+6,0,R-6,0x7a6a50);   // caminhos de terra em cruz, até a praça
    pBc(c,-2.5,0,-2.5,2.5,0.55,2.5,0x8a8a90,true,{j:0.08});pBc(c,-1.6,0.5,-1.6,1.6,0.62,1.6,0x14243a,false,{j:0});   // poço quebrado, seco, no centro
    for(let k=0,n=Math.round(R*R*Q.debris);k<n;k++){
      const a=rng.range(0,6.283),r=Math.sqrt(rng.next())*(R-3),x=Math.cos(a)*r,z=Math.sin(a)*r,t=rng.next();
      if(t<0.4){const q=rng.range(0.4,1);pBc(c,x,0,z,x+q,q*0.7,z+q,rng.pick(poiStone),false,{j:0.1})}   // entulho
      else if(t<0.8)pBc(c,x,0,z,x+0.3,rng.range(0.3,0.9),z+0.3,rng.pick([0x3a7a2a,0x5a6a2a]),false,{j:0.1});   // mato
      else poiPole(c,x,z,rng.range(1.5,3),0x2a2018)}   // estacas queimadas
    p.keepers=[];p.svcSpec=[];
    poiFlag(c,p,4,4,6);
  },
  post(c,rng,p){   // entreposto comercial: galpão de mercado com balcão e prateleiras, banca de feira, carroças carregadas, pilhas de caixas e barris, poço e cavalos
    pBc(c,-9,0,-10,9,0.1,-0.5,0x8a6a3a,false,{j:0.03});   // piso de tábuas
    for(const [x,z] of[[-9,-10],[9,-10],[-9,-0.5],[9,-0.5],[-3,-0.5],[3,-0.5]])pBc(c,x-0.18,0,z-0.18,x+0.18,3.9,z+0.18,0x5a3d22,true,{j:0.02});   // pilares
    pBc(c,-9.2,3.5,-0.7,9.2,3.9,-0.3,0x4a3320,false,{j:0.02});   // viga da frente
    pBc(c,-9,0,-10.2,9,3.9,-9.8,0x7a5632,true,{j:0.03});   // parede do fundo
    for(const s of[-1,1]){pBc(c,s*9-0.1,0,-10,s*9+0.1,1.3,-0.7,0x7a5632,true,{j:0.04});pBc(c,s*9-0.1,2.5,-10,s*9+0.1,3.9,-0.7,0x6b4a2a,false,{j:0.04})}   // laterais: muro baixo e tábuas no alto
    for(let lv=0;lv<3;lv++){const y=0.9+lv*0.9;   // prateleiras do fundo com mercadorias (comida, munição, remédios, materiais)
      pBc(c,-8.6,y,-9.8,8.6,y+0.1,-8.7,0x6b4a2a,false,{j:0.02});
      for(let x=-8.2;x<8;x+=1.15)pBc(c,x,y+0.1,-9.5,x+0.9,y+0.1+rng.range(0.35,0.7),-8.9,rng.pick([0xc8a060,0xa03a3a,0x5a8a4a,0xd8d0b0,0x6a7a9a,0x8a6a3a]),false,{j:0.08})}
    pBc(c,-8.8,0,-4.4,8.8,1.1,-3.7,0x7a5632,true,{j:0.03});pBc(c,-9,1.1,-4.6,9,1.2,-3.5,0x9a6a3a,false,{j:0.02});   // balcão (fecha o galpão: o lojista fica atrás)
    for(const x of[-6.5,-2.5,3,6.5])pBc(c,x,1.2,-4.3,x+0.8,1.7,-3.8,rng.pick([0xd8c8a0,0xc8a060,0x8a5a3a]),false,{j:0.06});   // caixinhas e sacos no balcão
    pBc(c,-0.4,1.2,-4.2,0.4,1.35,-3.9,0xe0b030,false,{j:0.02});pBc(c,-0.1,1.35,-4.1,0.1,1.9,-4.0,0x3a3a3a,false,{j:0});   // balança
    roofOn(c,-9.8,-10.6,9.8,0.3,3.9,'gable',0x7a4a2a,{trim:0x4a3320});
    pBc(c,-2.6,2.5,-0.25,2.6,3.45,-0.05,0x3a2a1a,false,{j:0.02});pBc(c,-0.55,2.75,-0.05,0.55,3.25,0.05,0xe0b030,false,{j:0.02});pBc(c,-0.25,2.9,0.05,0.25,3.1,0.1,0x3a2a1a,false,{j:0});   // placa com uma moeda
    poiLampAt(c,-8,-6);poiLampAt(c,8,-6);
    // banca de feira à esquerda: balcão, toldo listrado e frutas
    for(const [x,z] of[[-14.4,2.6],[-9.6,2.6],[-14.4,6.2],[-9.6,6.2]])pBc(c,x-0.1,0,z-0.1,x+0.1,2.7,z+0.1,0x5a3d22,true,{j:0.02});
    pBc(c,-14,0,3.6,-10,1.0,4.4,0x7a5632,true,{j:0.03});
    for(let i=0;i<5;i++)pBc(c,-14.6+i*1.0,2.6+i*0.04,2.5,-13.6+i*1.0,2.8+i*0.04,6.3,i%2?0xc03a3a:0xf0ece0,false,{j:0.03});
    for(let k=0;k<7;k++)pBc(c,-13.7+k*0.55,1.0,3.7+(k%2)*0.4,-13.3+k*0.55,1.3,4.0+(k%2)*0.4,rng.pick([0xc83a2a,0xe08a2a,0xe0c030,0x5ab03a]),false,{j:0.05});
    // carroças carregadas, cavalos amarrados, caixas, barris, sacos e feno
    poiCart(c,8,3.5,true,0xc8a060);poiCart(c,8,7.5,true,0x8a5a3a);
    pBc(c,3.8,0.95,9.8,8.2,1.1,10.0,0x5a3d22,false,{j:0.02});for(const x of[3.8,6,8.2])pBc(c,x-0.1,0,9.8,x+0.1,1.4,10.0,0x4a3320,true,{j:0});
    poiAnimal(c,4.6,10.5,0x8a5a3a,true);poiAnimal(c,6.8,10.7,0xf0ece0,true);
    crate(c,-13.5,-8,1.2,1.2);crate(c,-12.1,-8,1.2,0.9);crate(c,-13.2,-6.6,1,1.0);barrel(c,-12.5,-4.6);barrel(c,-11.3,-4.4);
    for(let k=0;k<4;k++)pBc(c,11+(k%2)*1.1,0,-7+Math.floor(k/2)*0.9,12+(k%2)*1.1,0.7,-6.1+Math.floor(k/2)*0.9,0xd8c8a0,true,{j:0.1});   // sacos empilhados
    hay(c,12,-3.5);
    poiPath(c,0,0.5,0,13);poiWell(c,-6,9);poiBench(c,-4,3,true);poiLampAt(c,-3.4,2.2);poiLampAt(c,3.4,2.2);poiSign(c,-1.8,5,0x4a3a2a);
    for(const [tx,tz] of[[-13,8],[13,-5.5]])tinyTree(c,tx,tz,rng);
    p.keepers=[];p.svcSpec=[{kind:'shop',role:'merchant',label:'Lojista: comprar suprimentos',x:c.cx,z:c.cz-5.0,yaw:0}];   // o lojista nasce em poiCivSync (só com dono amigo)
    poiFlag(c,p,10.5,-1.5,7);
  },
  ruins(c,rng,p){   // muros quebrados, arco, colunas (algumas caídas), degraus até o altar com braseiros, entulho, mato e um baú
    for(let k=0;k<5;k++){const x=-7+k*3.4,h=rng.range(0.8,3.8);pBc(c,x,0,-6,x+2.4,h,-5,rng.pick(poiStone),true,{j:0.07});if(h>2)pBc(c,x+0.4,h,-6,x+1.6,h+0.6,-5,0x7a7a82,false,{j:0.1});if(rng.chance(0.5))pBc(c,x+0.2,h*0.5,-5.05,x+0.6,h*0.5+1.2,-4.95,0x3a7a2a,false,{j:0.1})}   // musgo
    pBc(c,-7,0,-6,-6,rng.range(1.5,3.5),3,0x8a8a90,true,{j:0.07});pBc(c,6,0,-6,7,rng.range(1,2.5),2,0x8a8a90,true,{j:0.07});
    pBc(c,-1.2,0,-6.2,-0.2,4.2,-4.8,0xa8a498,true,{j:0.04});pBc(c,2.2,0,-6.2,3.2,3.0,-4.8,0xa8a498,true,{j:0.04});pBc(c,-1.2,4.2,-6.3,1.6,4.8,-4.7,0xa8a498,false,{j:0.04});   // arco partido
    for(let k=0;k<4;k++){const x=-5+k*3.3,z=1+rng.range(0,2.5),h=k===2?1.3:rng.range(3,4.6);pBc(c,x-0.6,0,z-0.6,x+0.6,h,z+0.6,0xb8b4a8,true,{j:0.05});pBc(c,x-0.75,h,z-0.75,x+0.75,h+0.25,z+0.75,0xa8a498,false,{j:0.04});pBc(c,x-0.75,0,z-0.75,x+0.75,0.3,z+0.75,0x98948a,false,{j:0.03})}
    pBc(c,-1,0.3,4.6,3.6,0.9,5.5,0xb8b4a8,true,{j:0.04});pBc(c,2.2,0.2,2.6,5,0.7,3.1,0xb8b4a8,true,{j:0.04});
    for(let s=0;s<3;s++){const hx=3.0-s*0.6,hz=1.9-s*0.4;pBc(c,-hx,0,-2.4-hz,hx,0.3*(s+1),-2.4+hz,0xa8a498,true,{j:0.03})}   // degraus do altar (pirâmide)
    pBc(c,-0.9,0.9,-3.0,0.9,1.9,-1.8,0xb8b4a8,true,{j:0.03});pBc(c,-1.1,1.9,-3.1,1.1,2.05,-1.7,0x9a968a,false,{j:0.02});
    for(const x of[-2.0,2.0]){pBc(c,x-0.2,0.6,-3.0,x+0.2,1.2,-2.6,0x3a3a3a,false,{j:0});pBc(c,x-0.15,1.2,-2.95,x+0.15,1.6,-2.65,0xff7a1a,false,{j:0.1})}
    for(let k=0;k<4;k++){const x=rng.range(-6,6);pBc(c,x,0,-2.2,x+0.06,rng.range(0.6,1.4),-2.14,0x3aa0b0,false,{j:0})}   // runas apagadas
    for(let k=0;k<9;k++){const x=rng.range(-7,7),z=rng.range(-5,6),s=rng.range(0.4,1);pBc(c,x,0,z,x+s,s*0.7,z+s,rng.pick(poiStone),false,{j:0.1})}
    for(let k=0;k<7;k++){const x=rng.range(-8,8),z=rng.range(-6,7);pBc(c,x,0,z,x+0.3,rng.range(0.3,0.7),z+0.3,0x3a7a2a,false,{j:0.1})}   // mato
    p.chest=addChest(c.cx,c.y+2.05,c.cz-2.4,0,rng.int(40,120),null);p.chest.onOpen=()=>poiRuinLoot(p);   // 30% de chance de artefato (POIX.ruinRelic)
  },
  farm(c,rng,p){   // fazenda: uma única casa, campos de plantação (trigo e horta) e cercados de animais (vacas, ovelhas, porcos e galinhas), com poço, silos e carroça
    poiHut(c,-12,-14,9,7,'S',{chimney:true,timber:true,shut:0x3a5a3a},rng);   // a casa
    poiPath(c,-7.5,-6,-7.5,3);poiLampAt(c,-5.6,-5.4);
    for(let i=0;i<5;i++){const z=-14+i*1.7;pBc(c,0,0,z,14,0.15,z+1.0,0x5a3d22,false,{j:0.02});   // campo de trigo
      for(let x=0;x<14;x+=2.4)pBc(c,x,0.15,z+0.1,Math.min(14,x+2.2),0.9+0.25*rng.next(),z+0.8,rng.pick([0xd8b84a,0xe0c050,0xc8a83c]),false,{j:0.08})}
    poiPole(c,7,-9.5,2.2);pBc(c,5.9,1.5,-9.6,8.1,1.7,-9.4,0x4a3320,false,{j:0});pBc(c,6.7,2.2,-9.9,7.3,2.7,-9.1,0xb89048,false,{j:0.04});   // espantalho
    for(let i=0;i<3;i++){const z=-4+i*1.2;pBc(c,-14,0,z,-9,0.12,z+0.8,0x5a3d22,false,{j:0.02});   // horta ao lado da casa
      for(let x=-14;x<-9;x+=0.9)pBc(c,x+0.1,0.12,z+0.1,x+0.7,0.5+0.3*rng.next(),z+0.7,rng.pick([0x3a8a2a,0xc83a2a,0xe08a2a,0x5ab03a]),false,{j:0.1})}
    // cercado grande: vacas e ovelhas, com cocho e fardos
    pBc(c,-6,0,4,4,0.12,11,0x6a4a2e,false,{j:0.03});poiFence(c,-6.5,3.5,4.5,3.5);poiFence(c,-6.5,11.5,4.5,11.5);poiFence(c,-6.5,3.5,-6.5,11.5);poiFence(c,4.5,3.5,4.5,11.5);
    poiAnimal(c,-4,6,0xf0ece0,true);poiAnimal(c,-1.5,8.5,0x8a5a3a,true);poiAnimal(c,1.5,5.8,0xf0ece0,true);poiAnimal(c,2.5,9.2,0x3a2a22,true);
    pBc(c,-5.5,0,9.8,-2.5,0.6,10.6,0x7a5632,true,{j:0.04});pBc(c,-5.4,0.6,9.9,-2.6,0.7,10.5,0x3a7ad8,false,{j:0});hay(c,3,10.2);hay(c,-5.6,4.4);
    // cercado menor: porcos e galinheiro
    pBc(c,7,0,4,14,0.12,9,0x6a4a2e,false,{j:0.03});poiFence(c,6.5,3.5,14.5,3.5);poiFence(c,6.5,9.5,14.5,9.5);poiFence(c,6.5,3.5,6.5,9.5);poiFence(c,14.5,3.5,14.5,9.5);
    poiAnimal(c,8.5,5.5,0xf0b0b0,false);poiAnimal(c,10.5,7.6,0xf0b0b0,false);
    pBc(c,11.5,0,4.4,14,1.0,5.8,0x9a6a3a,true,{j:0.03});pBc(c,11.3,1.0,4.2,14.2,1.5,6.0,0x7a3a2a,false,{j:0.03});pBc(c,12.4,0,5.8,13.2,0.7,5.9,0x2a1a10,false,{j:0});   // galinheiro
    for(let k=0;k<2;k++)pBc(c,8+k*1.7,0,-4,9.5+k*1.7,3.4,-2.5,0xc8c8c8,true,{j:0.03});   // silos
    poiWell(c,-2,-4);poiCart(c,2,0,true,0xd8b84a);
    for(const [tx,tz] of[[-14,6],[-12,9.5],[-14,12]])tinyTree(c,tx,tz,rng);
    poiFlag(c,p,-10,5,6);
  },

  bridge(c,rng,p){   // posto de pedágio sobre a ponte da estrada (tabuleiro, corrimão e pilares vêm do terreno, `meshTerrain`): pórtico com uma cancela de cada lado (sobra um vão no meio para 2 passarem) e guarita ligada à ponte, afastada do pórtico (p.axis: direção da estrada)
    const A=p.axis==='x',o=0.5,   // o tabuleiro tem 5 tiles (u de -2 a 3 no mapa), então o eixo da pista fica em 0,5
      Q=(u0,v0,u1,v1,y0,y1,col,s,q)=>A?pBc(c,v0+o,y0,u0+o,v1+o,y1,u1+o,col,s,q):pBc(c,u0+o,y0,v0+o,u1+o,y1,v1+o,col,s,q);   // u: de lado a lado da estrada; v: ao longo dela
    for(const s of[-1,1]){Q(s*3.5-0.9,-0.9,s*3.5+0.9,0.9,-14,6,0x8a8a90,true,{j:0.04});Q(s*3.5-1.1,-1.1,s*3.5+1.1,1.1,5.6,6.2,0x7a7a82,false,{j:0.03});Q(s*3.5-0.3,-0.95,s*3.5+0.3,-0.9,1.2,3.0,0x1a1a1a,false,{j:0});Q(s*3.5-0.15,-1.4,s*3.5+0.15,-0.9,3.2,3.7,0xffe9a0,false,{j:0})}
    Q(-4.1,-0.5,4.1,0.5,5.2,6,0x6b4a2a,false,{j:0.03});
    for(const s of[-1,1]){const u0=s<0?-2.4:0.9,u1=s<0?-0.9:2.4;Q(u0,1.2,u1,1.5,1.0,1.2,0xc03a3a,true,{j:0});Q(s*2.4-0.15,1.1,s*2.4+0.15,1.6,0,1.2,0x4a3320,true,{j:0})}   // uma cancela de cada lado, com colisão
    // guarita no lado + da pista, a 5 blocos do pórtico, no sentido p.vs; a base de pedra desce até o leito e encosta no tabuleiro; a porta olha para a pista
    // e só ali o corrimão abre (3 tiles). p.vs: a guarita fica do lado +v (1) ou -v (-1) do pórtico
    const hw=5,vs=p.vs||1,hv=vs>0?5:-5-hw,hu=3.0,hx=A?hv:hu,hz=A?hu:hv;
    poiLand(c,hx-2,hz-2,hx+hw+2,hz+hw+2);
    Q(2.4,hv,hu+hw,hv+hw,-14,0,0x6a5a40,true,{j:0.02});
    poiHut(c,hx+o,hz+o,hw,hw,A?'N':'W',{h:3.6,wall:0x9a8a7a,roof:0x4a3a2a,timber:true},rng);
    const vc=hv+hw/2+o;   // centro da guarita ao longo da pista
    for(let tv=Math.floor(vc-1.5);tv<=Math.floor(vc+1.5);tv++)for(let u=0;u<=3;u++){const tx=Math.floor(c.cx+(A?tv:u)),tz=Math.floor(c.cz+(A?u:tv));WORLD.noRail.add(tz*W+tx)}   // vão do corrimão só em frente à porta
    poiFlag(c,p,A?o:-3.0,A?-3.0:o,8);
  },
  fortcamp(c,rng,p){   // acampamento fortificado: paliçada com torre de vigia, portão, tendas (uma de comando), fogueira, caixas, armas e bandeiras
    const R=10;
    for(let k=-R;k<=R;k+=0.9){for(const [x,z] of[[k,-R],[k,R],[-R,k],[R,k]]){if(z===R&&Math.abs(x)<2.4)continue;const h=2.6+((k*7)%3)*0.35;pBc(c,x-0.28,0,z-0.28,x+0.28,h,z+0.28,0x6b4a2a,true,{j:0.06});pBc(c,x-0.15,h,z-0.15,x+0.15,h+0.5,z+0.15,0x5a3d22,false,{j:0.04})}}
    for(let k=0;k<4;k++){const a=0.7+k*1.6,tx=Math.cos(a)*5.6,tz=Math.sin(a)*5.2-1,col=rng.pick([0x8a6a3a,0xa08a5a,0x7a3a2a,0x6a7a4a]);
      for(let i=0;i<5;i++){const w=1.8-i*0.34;pBc(c,tx-w,i*0.5,tz-1.4,tx+w,i*0.5+0.5,tz+1.4,shadec(col,i%2?1.07:0.95),i<3,{j:0.06})}pBc(c,tx-0.5,0,tz+1.35,tx+0.5,1.5,tz+1.45,0x1f1710,false,{j:0})}
    const tx=0,tz=-6;for(let i=0;i<6;i++){const w=3.0-i*0.5;pBc(c,tx-w,i*0.55,tz-2.2,tx+w,i*0.55+0.55,tz+2.2,[0x7a2a2a,0x8a3a3a][i%2],i<4,{j:0.05})}pBc(c,tx-0.06,3.3,tz-0.06,tx+0.06,4.6,tz+0.06,0x4a3320,false,{j:0});   // tenda de comando
    pBc(c,-0.5,0,-0.5,0.5,0.3,0.5,0x2a1a14,false,{j:0.05});pBc(c,-0.3,0.3,-0.3,0.3,0.7,0.3,0xff7a1a,false,{j:0.05});pBc(c,-0.15,0.6,-0.15,0.15,1.0,0.15,0xffd84a,false,{j:0.05});
    for(let k=0;k<4;k++){const a=k*1.57+0.4,x=Math.cos(a)*1.8,z=Math.sin(a)*1.8;pBc(c,x-0.5,0,z-0.2,x+0.5,0.4,z+0.2,0x6b4a2a,false,{j:0.04})}   // troncos
    crate(c,3,3,1,1.2);crate(c,4.2,3.4,1,0.9);barrel(c,-4,4);barrel(c,-3,4.4);poiRack(c,6,2,false);poiBench(c,-3,0,true);
    pBc(c,R-2.5,0,-R+0.6,R-0.5,6.5,-R+2.6,0x5a3d22,false,{j:0.03});pBc(c,R-3.1,6.5,-R+0.1,R,7.1,-R+3.1,0x6b4a2a,false,{j:0.03});for(let k=0;k<3;k++)pBc(c,R-3+k*0.9,7.1,-R+0.2,R-2.6+k*0.9,7.9,-R+0.5,0x5a3d22,false,{j:0.03});   // torre de vigia de madeira
    poiPole(c,-2.2,R+1.4,5);pBc(c,2.0,0,R+1.2,2.6,5,R+1.8,0x4a3320,true,{j:0});poiPath(c,0,R+2,0,3);
    poiFlag(c,p,0,-R+1,7);
  },
  trench(c,rng,p){   // trincheira escavada de verdade (2 blocos): trecho principal, ramal e abrigo coberto, com parapeitos, tábuas no fundo, sacos de areia, ouriços e arame farpado
    poiDig(c,-9,-1.3,9,1.3,2);poiDig(c,-9,-1.3,-8,1.3,1);poiDig(c,8,-1.3,9,1.3,1);   // trecho principal (as pontas são rampas de 1 bloco)
    poiDig(c,-1,1.3,1,6,2);poiDig(c,-2.5,6,2.5,9,2);poiDig(c,-1,1.3,1,2.3,1);          // ramal para o sul e abrigo no fim
    pBc(c,-9,-2,-1.3,9,-1.92,1.3,0x7a5632,false,{j:0.02});pBc(c,-1,-2,1.3,1,-1.92,6,0x7a5632,false,{j:0.02});pBc(c,-2.5,-2,6,2.5,-1.92,9,0x7a5632,false,{j:0.02});   // tábuas no fundo
    pBc(c,-9.5,0,-2.6,9.5,1.1,-1.3,0x6a4a2e,true,{j:0.08});pBc(c,-9.5,0,1.3,-1,1.1,2.6,0x6a4a2e,true,{j:0.08});pBc(c,1,0,1.3,9.5,1.1,2.6,0x6a4a2e,true,{j:0.08});   // parapeitos (a norte inteiro; a sul com a boca do ramal)
    pBc(c,-2.2,0,2.6,-1,1.1,6,0x6a4a2e,true,{j:0.08});pBc(c,1,0,2.6,2.2,1.1,6,0x6a4a2e,true,{j:0.08});pBc(c,-3.2,0,6,-2.5,1.1,9.8,0x6a4a2e,true,{j:0.08});pBc(c,2.5,0,6,3.2,1.1,9.8,0x6a4a2e,true,{j:0.08});pBc(c,-3.2,0,9,3.2,1.1,9.8,0x6a4a2e,true,{j:0.08});
    pBc(c,-2.8,0.9,6,2.8,1.5,9.3,0x5a3d22,true,{j:0.03});pBc(c,-2.6,1.5,6.2,2.6,1.8,9.1,0x6a4a2e,false,{j:0.08});   // teto do abrigo (terra sobre troncos)
    for(let k=0;k<5;k++)sandbag(c,-8.5+k*3.4,-3.9,true);for(const x of[-8,-4.5,3.5,6.5])sandbag(c,x,2.7,true);
    for(const x of[-8,-3,3,8])poiPole(c,x,-1.0,1.4,0x4a3320);   // escoras nas paredes
    for(const x of[-9,0,8]){pBc(c,x-0.9,0.4,-6.0,x+0.9,0.6,-5.8,0x5a5a62,true,{j:0.02});pBc(c,x-0.1,0.4,-6.8,x+0.1,0.6,-5.0,0x5a5a62,true,{j:0.02});pBc(c,x-0.1,0,-6.0,x+0.1,1.2,-5.8,0x5a5a62,true,{j:0.02})}   // ouriços
    for(let x=-10;x<11;x+=2.6){pBc(c,x-0.06,0,-8.45,x+0.06,1.6,-8.3,0x4a3320,true,{j:0});pBc(c,x,0.3,-8.4,x+2.6,1.45,-8.3,0x2a2a2a,true,{j:0});pBc(c,x,0.4,-8.44,x+2.6,0.45,-8.26,0x6a6a72,false,{j:0});pBc(c,x,0.8,-8.44,x+2.6,0.85,-8.26,0x6a6a72,false,{j:0})}   // arame farpado
    crate(c,-7.5,3.3,1,1.3);crate(c,-6.2,3.5,1,0.9);barrel(c,6.5,3.6);crate(c,8,-4.6,1,1.0);poiRack(c,4,-4.6,true);
    poiPole(c,9.5,-4.2,4);pBc(c,9.6,3.0,-4.2,11.4,3.9,-4.14,0xc03a3a,false,{j:0});
    poiFlag(c,p,-9,-5,5);
  },
  lookout(c,rng,p){   // atalaia de madeira: torre de 4 pernas com travessas e diagonais, plataforma com guarda-corpo, telhado em pirâmide, escada, braseiro e sacos de areia na base
    const H=7,L=1.8,wd=0x6b4a2a;
    for(const sx of[-1,1])for(const sz of[-1,1])pBc(c,sx*L-0.3,0,sz*L-0.3,sx*L+0.3,H,sz*L+0.3,wd,true,{j:0.05});   // pernas (com colisão)
    for(const y of[1.4,3.4,5.2])for(const s of[-1,1]){pBc(c,-L,y,s*L-0.08,L,y+0.25,s*L+0.08,0x5a3d22,false,{j:0.02});pBc(c,s*L-0.08,y,-L,s*L+0.08,y+0.25,L,0x5a3d22,false,{j:0.02})}   // travessas
    for(const s of[-1,1])for(let k=0;k<5;k++){const x=-L+0.2+k*0.65,y=1.5+k*0.75;pBc(c,x,y,s*L-0.07,x+0.5,y+0.9,s*L+0.07,0x4a3320,false,{j:0.02});pBc(c,-x-0.5,y,s*L-0.07,-x,y+0.9,s*L+0.07,0x4a3320,false,{j:0.02})}   // diagonais cruzadas (em degraus)
    pBc(c,-2.6,H,-2.6,2.6,H+0.3,2.6,0x7a5632,true,{j:0.03});   // plataforma
    for(const [x0,z0,x1,z1] of[[-2.6,-2.6,2.6,-2.45],[-2.6,-2.6,-2.45,2.6],[2.45,-2.6,2.6,2.6],[-2.6,2.45,-0.7,2.6],[0.7,2.45,2.6,2.6]]){pBc(c,x0,H+0.3,z0,x1,H+1.25,z1,0x6b4a2a,true,{j:0.03});pBc(c,x0,H+1.25,z0,x1,H+1.4,z1,0x5a3d22,false,{j:0.02})}   // guarda-corpo (a escada abre um vão na frente)
    for(const sx of[-1,1])for(const sz of[-1,1])pBc(c,sx*2.4-0.12,H+0.3,sz*2.4-0.12,sx*2.4+0.12,H+3.3,sz*2.4+0.12,wd,false,{j:0.03});   // pilares do telhado
    for(let k=0;k<4;k++){const w=3.3-k*0.8;pBc(c,-w,H+3.3+k*0.4,-w,w,H+3.7+k*0.4,w,k%2?0x6b4a2a:0x5a3d22,false,{j:0.05})}   // telhado em pirâmide
    for(const s of[-0.45,0.45])pBc(c,s-0.05,0,L+0.35,s+0.05,H+0.3,L+0.45,0x4a3320,false,{j:0});   // escada (só visual): laterais e degraus
    for(let y=0.6;y<H;y+=0.6)pBc(c,-0.45,y,L+0.33,0.45,y+0.1,L+0.47,0x5a3d22,false,{j:0});
    poiBrazier(c,1.7,-1.7,H+0.3);pBc(c,-1.9,H+0.3,-1.8,-0.9,H+0.8,-1.0,0x6b4a2a,true,{j:0.04});   // braseiro e uma caixa de munição na plataforma
    sandbag(c,-4.5,2.8,true);sandbag(c,1.8,3.4,true);crate(c,-4.8,-1.2,1,1.0);barrel(c,3.8,-2.4);
    poiFlag(c,p,3.6,-3.6,H+1);
  },
  barricade(c,rng,p){   // barricada de estrada: duas fileiras de sacos e toras desencontradas (chicana), cavalos de frisa, arame farpado, abrigo de guarda, caixas e braseiro. p.axis = direção da estrada ('x' ou 'z')
    const A=p.axis==='x',Q=(u0,v0,u1,v1,y0,y1,col,s,q)=>A?pBc(c,v0,y0,u0,v1,y1,u1,col,s,q):pBc(c,u0,y0,v0,u1,y1,v1,col,s,q);   // u: de lado a lado da estrada; v: ao longo dela
    const row=(u0,u1,v,col)=>{Q(u0,v-0.8,u1,v+0.8,0,1.4,col,true,{j:0.06});for(let u=u0+0.4;u<u1-1;u+=1.5)Q(u,v-0.55,u+1.2,v+0.55,1.4,1.9,0x6a4a2e,true,{j:0.07})};
    row(-6.6,1.2,-1.8,0xb8a06a);row(-1.2,6.6,1.8,0xa89460);   // sacos de areia com toras no topo
    for(const [u,v] of[[-5.5,-4.6],[-1.8,-4.6],[1.8,-4.6],[5.5,-4.6],[-5.5,4.6],[-1.8,4.6],[1.8,4.6],[5.5,4.6]]){   // cavalos de frisa
      Q(u-0.9,v-0.1,u+0.9,v+0.1,0.4,0.6,0x5a5a62,true,{j:0.02});Q(u-0.1,v-0.9,u+0.1,v+0.9,0.4,0.6,0x5a5a62,true,{j:0.02});Q(u-0.1,v-0.1,u+0.1,v+0.1,0,1.2,0x5a5a62,true,{j:0.02})}
    for(const v of[-6.2,6.2])for(let u=-6.6;u<6.6;u+=2.6){Q(u-0.06,v-0.06,u+0.06,v+0.06,0,1.5,0x4a3320,true,{j:0});Q(u,v-0.07,u+2.6,v+0.07,0.4,0.5,0x6a6a72,true,{j:0});Q(u,v-0.07,u+2.6,v+0.07,0.85,0.95,0x6a6a72,true,{j:0});Q(u,v-0.07,u+2.6,v+0.07,1.3,1.4,0x6a6a72,true,{j:0})}   // arame farpado (3 fios)
    Q(-6.5,2.8,-3.5,5.4,0,0.15,0x6a5a40,false,{j:0.03});for(const u of[-6.4,-3.6])Q(u-0.12,3.0,u+0.12,3.24,0,2.4,0x4a3320,true,{j:0.02});   // abrigo do guarda: chão, postes e telhado inclinado
    Q(-6.6,2.9,-3.4,4.2,2.4,2.7,0x5a3d22,false,{j:0.03});Q(-6.6,4.2,-3.4,5.5,2.1,2.4,0x6b4a2a,false,{j:0.03});Q(-6.5,5.3,-3.5,5.5,0,1.8,0x6a4a2e,true,{j:0.04});
    crate(c,A?4:4.5,A?-4.5:3.5,1,1.1);crate(c,A?4:5.7,A?-4.5:3.7,1,0.9);barrel(c,A?-5.5:5.2,A?5:-3.8);
    poiBrazier(c,A?-2:-5,A?4.2:-1.2);poiSign(c,A?0.5:2.8,A?4.8:-5.2);   // placa de "pare" ao lado da pista
    poiFlag(c,p,A?-5:5.5,A?-5.5:-5.5,5);
  },
  hospital(c,rng,p){   // hospital de campanha: tenda branca aberta na frente com 6 macas (NPCs deitados e médicos andando, poigame.js), cruz vermelha, gotejadores, tenda de suprimentos, carroça, maca no chão e lampiões
    const W0=-6.5,W1=6.5,Z0=-8.5,Z1=-1.5,cv=0xf0ece0;
    pBc(c,W0,0,Z0,W1,0.1,Z1,0xb8a888,false,{j:0.03});   // piso de tábuas claras
    pBc(c,W0,0,Z0,W1,2.7,Z0+0.15,cv,true,{j:0.02});for(const x of[W0,W1-0.15])pBc(c,x,0,Z0,x+0.15,2.7,Z1,cv,true,{j:0.02});   // paredes de lona (fundo e lados)
    for(let k=0;k<4;k++)pBc(c,W0+k*(W1-W0)/3-0.1,0,Z1-0.1,W0+k*(W1-W0)/3+0.1,2.9,Z1+0.1,0x6b4a2a,true,{j:0.02});   // postes da frente aberta
    for(let i=0;i<4;i++)pBc(c,W0-0.4,2.7+i*0.5,Z0-0.5+i*1.0,W1+0.4,3.2+i*0.5,Z1+0.5-i*1.0,i===3?0xc03030:[0xf4f2ea,0xe6e2d4][i%2],false,{j:0.03});   // telhado em degraus (cumeeira vermelha)
    p.beds=[];
    for(let k=0;k<6;k++){const x=-5.2+k*2.1,z0=-7.7,z1=-5.5;   // macas: armação, colchão, travesseiro e manta; nelas deitam os pacientes
      for(const [lx,lz] of[[-0.45,z0+0.1],[0.35,z0+0.1],[-0.45,z1-0.3],[0.35,z1-0.3]])pBc(c,x+lx,0,lz,x+lx+0.1,0.3,lz+0.2,0x6a6a72,false,{j:0});
      pBc(c,x-0.5,0.3,z0,x+0.5,0.6,z1,0xf2f2ee,true,{j:0.02});pBc(c,x-0.4,0.6,z0+0.1,x+0.4,0.75,z0+0.5,0xffffff,false,{j:0.02});
      if(k%2===0)pBc(c,x-0.52,0.6,z0+0.9,x+0.52,0.72,z1+0.02,rng.pick([0x6a8aa8,0x8a6a6a,0x6a9a7a]),false,{j:0.02});
      poiPole(c,x+0.75,z0+0.5,2.2,0xc0c0c8);pBc(c,x+0.62,1.6,z0+0.4,x+0.88,2.0,z0+0.6,0xb02a2a,false,{j:0});   // suporte de soro com bolsa vermelha
      p.beds.push({x:c.cx+x,z:c.cz+z1-0.2,y:poiBaseY(c,x,z1)+0.6})}
    pBc(c,-4.8,0.1,1.2,-3.6,0.25,3.4,0x7a5632,false,{j:0.02});pBc(c,-4.7,0.25,1.2,-3.7,0.35,3.4,0xd8d4c8,false,{j:0.02});   // maca no chão, ao ar livre
    p.beds.push({x:c.cx-4.2,z:c.cz+3.2,y:poiBaseY(c,-4.2,3.2)+0.35});
    for(const x of[-1.5,1.5])pBc(c,x-0.1,0,-0.6,x+0.1,4.9,-0.4,0x5a3d22,true,{j:0.02});   // placa da cruz vermelha, em dois postes
    pBc(c,-1.6,2.3,-0.55,1.6,4.9,-0.45,0xf4f4f0,false,{j:0.01});pBc(c,-0.4,2.5,-0.58,0.4,4.7,-0.42,0xcc2222,false,{j:0});pBc(c,-1.2,3.2,-0.58,1.2,4.0,-0.42,0xcc2222,false,{j:0});
    const tx=7.4,tz=2.6;for(let i=0;i<5;i++){const w=2.0-i*0.4;pBc(c,tx-w,i*0.5,tz-1.5,tx+w,i*0.5+0.5,tz+1.5,i%2?0xe6e2d4:0xf4f2ea,i<3,{j:0.04})}   // tenda de suprimentos
    pBc(c,tx-0.5,0,tz+1.45,tx+0.5,1.5,tz+1.55,0x1f1710,false,{j:0});
    poiCart(c,-1,2.4,true,0xf0f0ea);crate(c,2.2,1.6,1,0.9);crate(c,3.4,1.9,1,0.9);barrel(c,5,0.2);poiBench(c,0.5,-1.2,true);
    poiLampAt(c,-6,0.4);poiLampAt(c,5.6,-0.6);poiPath(c,0,0.6,0,7);
    p.medWalk=[{x:c.cx-3,z:c.cz-0.5},{x:c.cx+1,z:c.cz-0.5},{x:c.cx+4,z:c.cz+1.5},{x:c.cx-2,z:c.cz+3},{x:c.cx+3,z:c.cz+4}];   // por onde os médicos andam
    poiFlag(c,p,8.6,-4.2,6);
  },
  depot(c,rng,p){   // depósito de suprimentos: galpão aberto com pilhas de caixas, barris e sacas, lona sobre a carga, carroça, e barricadas de sacos e toras em volta com cavalos de frisa
    const X0=-7.5,X1=0.5,Z0=-8,Z1=-2;
    pBc(c,X0,0,Z0,X1,0.1,Z1,0x7a6a4a,false,{j:0.03});
    for(const [x,z] of[[X0,Z0],[(X0+X1)/2,Z0],[X1,Z0],[X0,Z1],[(X0+X1)/2,Z1],[X1,Z1]])pBc(c,x-0.15,0,z-0.15,x+0.15,3.2,z+0.15,0x6b4a2a,true,{j:0.03});   // postes do galpão
    for(let i=0;i<3;i++)pBc(c,X0-0.5,3.2+i*0.4,Z0-0.5+i*0.8,X1+0.5,3.6+i*0.4,Z1+0.5-i*0.8,i%2?0x6b4a2a:0x5a3d22,false,{j:0.05});   // telhado de tábuas
    pBc(c,X0,0,Z0,X1,2.4,Z0+0.2,0x6a4a2e,true,{j:0.04});   // parede dos fundos de tábuas
    for(let k=0;k<4;k++){const x=X0+0.6+k*1.9;crate(c,x,Z0+0.5,1.4,1.2);if(k%2===0)crate(c,x+0.1,Z0+0.6,1.2,2.3)}   // pilhas de caixas
    for(let k=0;k<4;k++)barrel(c,X0+0.6+k*1.1,Z1-2.1);   // fileira de barris
    for(let k=0;k<5;k++){const x=X0+0.5+k*1.2,z=Z0+3.3;pBc(c,x,0,z,x+1.0,0.55,z+0.8,rng.pick([0xc8b890,0xb8a880,0xd0c098]),true,{j:0.08});pBc(c,x+0.2,0.55,z+0.1,x+0.8,0.9,z+0.7,0xc8b890,false,{j:0.08})}   // sacas
    pBc(c,2.5,0,-6.5,6.5,1.0,-3.2,0x4a5a3a,true,{j:0.1});pBc(c,3.0,1.0,-6.0,6.0,1.6,-3.6,0x44543a,false,{j:0.1});   // carga coberta por lona
    for(const x of[3.4,5.2])pBc(c,x,0,-2.6,x+0.8,1.2,-1.8,0xa03a2a,true,{j:0.04});   // tambores de combustível
    poiCart(c,-6,3.4,true,0xc8a060);hay(c,-2.4,4.4);crate(c,0.8,1.4,1,1.0);
    for(const [x0,z0,x1,z1] of[[-9,6.2,-2.2,6.2],[2.2,6.2,9,6.2],[-9,6.2,-9,1],[9,6.2,9,0.5]])poiBarrierRow(c,x0,z0,x1,z1);   // barricadas com um portão de 4 blocos na frente
    for(const x of[-1.2,1.2]){pBc(c,x-0.9,0.4,7.4,x+0.9,0.6,7.6,0x5a5a62,true,{j:0.02});pBc(c,x-0.1,0.4,6.6,x+0.1,0.6,8.4,0x5a5a62,true,{j:0.02});pBc(c,x-0.1,0,7.4,x+0.1,1.2,7.6,0x5a5a62,true,{j:0.02})}
    poiLampAt(c,-2.8,4.8);poiLampAt(c,3.2,4.8);poiSign(c,0.2,8.2);
    poiFlag(c,p,8,-7.5,6);
  }
};
// fileira de barricada (sacos de areia com toras no topo) de (x0,z0) a (x1,z1), só alinhada aos eixos (usada pelo depósito)
function poiBarrierRow(c,x0,z0,x1,z1){
  const alongX=Math.abs(x1-x0)>=Math.abs(z1-z0),a=Math.min(alongX?x0:z0,alongX?x1:z1),b=Math.max(alongX?x0:z0,alongX?x1:z1);
  for(let k=a;k<b;k+=2.8){const e=Math.min(b,k+2.6);if(alongX){pBc(c,k,0,z0-0.5,e,1.2,z0+0.5,0xb8a06a,true,{j:0.06});pBc(c,k+0.2,1.2,z0-0.35,e-0.2,1.6,z0+0.35,0x6a4a2e,true,{j:0.06})}
    else{pBc(c,x0-0.5,0,k,x0+0.5,1.2,e,0xb8a06a,true,{j:0.06});pBc(c,x0-0.35,1.2,k+0.2,x0+0.35,1.6,e-0.2,0x6a4a2e,true,{j:0.06})}}
}

// ---------- decorações dormentes (frente da guerra): guardam o lugar de um POI de guerra; sem função, sem dono ----------
// Quatro decorações (raios em WAR_DORMANT); na declaração da guerra a decoração some e o POI de guerra nasce no mesmo lugar (warfront.js).
const DORM_BUILD={
  campfire(c,rng,d){   // fogueira igual à do acampamento de bandidos (buildCampFire, poi.js: pedras, brasas, tripé e chamas animadas), com toras de assento, caixa e barril
    d.flames=buildCampFire(c,rng);
    for(const [x,z,a] of[[-3.4,0.4,0],[3.4,-0.4,0],[0.4,3.4,1],[-0.4,-3.4,1]])pBc(c,a?x-0.4:x-1.1,0,a?z-1.1:z-0.4,a?x+0.4:x+1.1,0.55,a?z+1.1:z+0.4,0x6a4a2e,true,{j:0.05});   // toras de assento com colisão
    crate(c,5.2,-3.2,1,1.0);barrel(c,-5.2,3.4);
  },
  garden(c,rng){   // jardim: canteiros com hortaliças dentro de uma cerca baixa e um espantalho
    for(let i=0;i<3;i++){const z=-3.6+i*2.5;pBc(c,-4.5,0,z,4.5,0.2,z+1.4,0x5a3d22,false,{j:0.02});
      for(let x=-4.3;x<4.2;x+=0.9)pBc(c,x,0.2,z+0.2,x+0.6,0.5+0.35*rng.next(),z+1.2,rng.pick([0x3a8a2a,0xc83a2a,0xe08a2a,0x5ab03a]),false,{j:0.1})}
    poiFence(c,-5.6,-5,5.6,-5);poiFence(c,-5.6,4.6,5.6,4.6);poiFence(c,-5.6,-5,-5.6,4.6);poiFence(c,5.6,-5,5.6,4.6);
    poiPole(c,0,-7,2.2);pBc(c,-1.1,1.5,-7.1,1.1,1.7,-6.9,0x4a3320,false,{j:0});pBc(c,-0.3,2.2,-7.3,0.3,2.7,-6.7,0xb89048,false,{j:0.04});
  },
  well(c,rng){   // poço de pedra com banco, barril, caixa e feno
    poiWell(c,0,0);poiBench(c,3.6,2,true);barrel(c,-3.2,2.2);crate(c,4.2,-3.2,1,1.0);hay(c,-4.4,-3.2);
  },
  cairn(c,rng){   // marco de pedras empilhadas com uma estaca e um pano
    for(let s=0;s<4;s++){const h=1.5-s*0.35;pBc(c,-h,s*0.5,-h,h,s*0.5+0.5,h,rng.pick(poiStone),true,{j:0.08})}
    poiPole(c,0,0,3.2);pBc(c,0.1,2.3,-0.05,1.3,2.9,0.05,0xb03a3a,false,{j:0.03});
  }
};
// Constrói a decoração de d ({kind, x, z, y}) numa malha própria (como poiBuild, adaptada ao chão: a malha do terreno já existe).
function dormBuild(d){
  if(d.mesh||d.off)return;
  const c=poiArea(d.x,d.z,d.y,B[d.z*W+d.x]),rng=new RNG((WORLD.seed*59+d.i*101+5)>>>0);c.noDig=true;c.adapt=true;c.y=tH(d.x,d.z);d.sceneObjs=[];d.flames=null;   // c.y: as chamas da fogueira ficam no chão real
  BX_CAP={batch:new BoxBatch(),cols:[]};
  try{DORM_BUILD[d.kind](c,rng,d)}
  finally{const cap=BX_CAP;BX_CAP=null;const m=cap.batch.toMesh(MAT_TERRAIN);if(m){m.userData.cx=d.x;m.userData.cz=d.z;scene.add(m);d.mesh=m;d.sceneObjs.push(m)}d.cols=cap.cols;for(const f of d.flames||[])d.sceneObjs.push(f)}
}
function dormRemove(d){   // tira a decoração do mundo (malha e colisões)
  for(const o of d.sceneObjs||[]){scene.remove(o);const i=FIRES.indexOf(o);if(i>=0){FIRES.splice(i,1);o.material.dispose()}}   // chamas da fogueira saem de FIRES
  if(d.mesh)d.mesh.geometry.dispose();
  for(const b of d.cols||[])Col.remove(b);
  d.mesh=null;d.sceneObjs=[];d.cols=[];
}
// Interação: junto da fogueira dormente (a 4,6 blocos do centro: as toras de assento têm colisão) dá para cozinhar, como nas fogueiras de acampamento.
function dormScan(lines){
  for(const d of WORLD.dormant||[])if(d.kind==='campfire'&&d.mesh&&Math.hypot(P.x-d.x,P.z-d.z)<4.6&&Math.abs(P.y-d.y)<3){G.target={type:'fire'};lines.push('[E] Fogueira: cozinhar')}
}
const dormBuildAll=()=>{for(const d of WORLD.dormant||[])dormBuild(d)};   // idempotente: chamada por poiPopulateAll

// ---------- construção numa malha própria ----------
function poiBuild(p){
  const c=poiArea(p.cx,p.cz,p.y,p.biome),rng=new RNG((WORLD.seed*53+p.id*97+3)>>>0);p.sceneObjs=[];p.c=c;
  if(p.runtime){c.noDig=true;c.adapt=true}   // POI criado em jogo (frente da guerra): a malha do terreno não muda, então a construção é que se adapta ao chão (poiAdaptBc)
  BX_CAP={batch:new BoxBatch(),cols:[]};
  try{
    if(p.pad){const r=POI_DEFS[p.type].r;pBc(c,-r,-4,-r,r,0,r,0x6a5a40,true,{j:0.02})}   // base de terra (mapa manual: o chão não é aplainado)
    POI_BUILD[p.type](c,rng,p);
  }finally{const cap=BX_CAP;BX_CAP=null;const m=cap.batch.toMesh(MAT_TERRAIN);if(m){m.userData.cx=p.cx;m.userData.cz=p.cz;scene.add(m);p.mesh=m;p.sceneObjs.push(m)}p.cols=cap.cols}
  poiPaint(p);
}

// ---------- geração no mundo (depois de tudo o mais: usa os pontos livres e não mexe no sorteio dos outros POIs) ----------
// ponto livre de POIs, cavernas e baús perdidos? (usado pelos portais, que nascem em runtime). lax: tentativa folgada
function ambClash(x,z,lax){
  const g=lax?AMB_GAP*0.5:AMB_GAP;
  for(const p of WORLD.pois||[])if(Math.hypot(p.cx-x,p.cz-z)<POI_DEFS[p.type].r+g)return true;
  for(const q of WORLD.caves||[])if(Math.hypot(q.cx-x,q.cz-z)<11+g)return true;
  for(const q of wfReserved())if(Math.hypot(q.x-x,q.z-z)<POI_DEFS.fortcamp.r+g)return true;   // terrenos de guerra e dormentes (warfront.js)
  for(const q of WORLD.chests||[])if(Math.hypot(q.x-x,q.z-z)<3+g)return true;
  return false;
}
const POI_GAP=30;   // folga mínima, em blocos, entre a borda de um POI e a muralha de uma cidade ou a borda de outro POI: conquistá-lo na guerra tem de ser uma viagem
const poiNearR=(x,z,R,f)=>{for(let dz=-R;dz<=R;dz+=6)for(let dx=-R;dx<=R;dx+=6){const i=(z+dz)*W+x+dx;if(i>=0&&i<W*W&&f(i))return true}return false};
const poiNear=(x,z,f)=>{for(let dz=-18;dz<=18;dz+=9)for(let dx=-18;dx<=18;dx+=9){const i=(z+dz)*W+x+dx;if(i>=0&&i<W*W&&f(i))return true}return false};
// lugares possíveis para o pedágio no trecho de água de uma ponte (WORLD.bridges), do meio para as pontas: {x,z,axis,vs}.
// Exige ponte RETA (mesmo x ou mesmo z) de 2 tiles antes do pórtico até 11 depois, para a guarita caber ao lado do tabuleiro;
// vs (+1/-1) é o sentido, ao longo da estrada, em que a guarita fica.
function bridgeSpots(br){
  const T0=br.tiles,n=T0.length,mid=(br.wi+br.we)>>1,span=(br.we-br.wi)>>1,out=[];
  for(let o=0;o<=span;o++)for(const sg of o?[-1,1]:[1])for(const dir of[1,-1]){
    const i=mid+o*sg,c=T0[i],e=T0[i+11*dir],b0=T0[i-2*dir];if(!c||!e||!b0)continue;
    let sx=true,sz=true;for(let k=-2;k<=11;k++){const q=T0[i+k*dir];if(q.x!==c.x)sx=false;if(q.z!==c.z)sz=false}
    if(!sx&&!sz)continue;
    out.push({x:c.x,z:c.z,axis:sz?'x':'z',vs:Math.sign(sz?e.x-c.x:e.z-c.z)||1});
  }
  return out;
}
// ---------- geração por lugar (tarefa 9): anel, estrada e interior; tipo sorteado pelo bioma ----------
// Números de balanceamento: ring = quantos POIs por cidade; ringMin/Max = distância da muralha; roadMin = estrada curta fica sem POI;
// roadW = peso da Taverna e do Entreposto no lugar de estrada; sancRoad = distância mínima do Santuário a estradas; limit = máximo no mapa.
const POI_GEN={ring:[2,2,3,3],ringMin:30,ringMax:70,roadMin:80,interior:[3,5],fill:3,roadW:4,sancRoad:40,maxTyped:25,   // maxTyped: teto de POIs sorteados (com ruínas e pedágios o mapa fecha em até 30)
  bridgeToll:3,bridgeMin:12,bridgeGap:90,   // pontes com pedágio: no máximo, vão mínimo (blocos) e distância mínima entre elas
  limit:{farm:5,mine:4,sawmill:4,hunters:3,sanctuary:3,fort:3,tower:4,tavern:3,post:3},tavpost:[2,5],   // máximo por tipo no mapa; Taverna+Entreposto juntos
  min:{farm:2,mine:1,sawmill:1,hunters:2,sanctuary:1,fort:1,tower:2},   // mínimo por tipo (se houver lugar válido)
  biomeCap:{[BIO_PLAINS]:{farm:5},[BIO_FOREST]:{sawmill:4},[BIO_ROCK]:{mine:4}},snowCap:2,
  first:{plains:['farm',3],forest:['sawmill',3],mountain:['mine',3]}};   // o tipo principal do bioma dominante entra primeiro: com o mapa cheio, os grandes (Fazenda) não achavam mais lugar   // teto do tipo principal em cada bioma; neve e deserto: 2 por tipo
const POI_SORT=['farm','mine','sawmill','hunters','sanctuary','fort','tower','tavern','post'];   // a ponte e as ruínas não entram no sorteio
const POI_W={   // pesos por bioma (o que não está na tabela pesa 1)
  [BIO_PLAINS]:{farm:6,sawmill:4,hunters:3,sanctuary:2},
  [BIO_FOREST]:{sawmill:6,hunters:4,farm:3,tower:2},
  [BIO_ROCK]:{mine:6,tower:4,fort:3,sanctuary:2},
  [BIO_SNOW]:{farm:2,sawmill:2,hunters:2,sanctuary:2,mine:2,tower:2,fort:2}
};
POI_W[BIO_DESERT]=POI_W[BIO_SNOW];
// árvores só nascem depois dos POIs: a "floresta em volta" é medida pelo bioma (60% dos pontos num raio de 25)
const poiForested=(x,z)=>{let n=0,f=0;for(let dz=-25;dz<=25;dz+=5)for(let dx=-25;dx<=25;dx+=5){const i=(z+dz)*W+x+dx;if(i>=0&&i<W*W){n++;if(B[i]===BIO_FOREST)f++}}return f>=n*0.6};
function poiRuleOK(type,x,z,place){   // o lugar cumpre as regras do tipo?
  if(type==='tavern'||type==='post')return place==='road';   // só na beira de estrada entre cidades (uma por estrada: há 1 POI por estrada)
  if(type==='sanctuary')return place!=='road'&&!poiNearR(x,z,POI_GEN.sancRoad,i=>T[i]===T_ROAD);
  if(type==='mine')return poiNear(x,z,i=>B[i]===BIO_ROCK||H[i]>=SEA+12);
  if(type==='sawmill')return poiForested(x,z);
  return true;
}
const WANT_TRIES=90;   // tentativas insistindo no tipo sorteado antes de aceitar qualquer um que caiba
const POI_RANGE={mine:9,fort:7,tower:7,farm:16,tavern:16,post:16,sawmill:8};
const POI_BIG={farm:1,tavern:1,post:1};   // grandes: o terreno é aplainado com rampa maior (flattenArea) e a área livre checada é maior   // desnível aceito no terreno (blocos)
function poiInitOwner(p,rng){
  if(p.type==='ruins')return 'none';
  const hm=WORLD.home;if(hm&&Math.hypot(hm.cx-p.cx,hm.cz-p.cz)<170)return 'bandit';   // perto da cidade do jogador: tomado por bandidos
  let nc=null,bd=1e9;for(const k of WORLD.cities){const d=Math.hypot(k.cx-p.cx,k.cz-p.cz);if(d<bd){bd=d;nc=k}}
  return nc&&nc.fid!==undefined&&rng.chance(0.5)?nc.fid:'bandit';
}
// dry (modo reserva, js/reserve.js reservePois): só escolhe os lugares no terreno rascunho (nada é aplainado nem construído) e devolve a lista
// de POIs planejados; depois, com WORLD.poiPlan, esta função só instancia a lista (os reservados já têm o chão pronto; os outros são aplainados aqui).
function genWorldPois(cities,taken,dry){
  if(WORLD.showcaseMode){poiShowcaseGen();return}
  const rng=new RNG((WORLD.seed*131+7)>>>0);WORLD.pois=[];let id=300;const tc={},bc={},G=POI_GEN;let cap=true;
  const add=(type,x,z,y,extra)=>{
    const d=POI_DEFS[type],p=Object.assign({id:id++,type,cx:x,cz:z,y,biome:B[z*W+x],owner:'bandit'},extra||{});
    p.owner=poiInitOwner(p,rng);if(!dry)flattenArea(x,z,d.r,y,POI_BIG[type]?4:3);taken.push({x,z,r:d.r,poi:true});if(!dry)poiBuild(p);WORLD.pois.push(p);tc[type]=(tc[type]||0)+1;bc[p.biome+':'+type]=(bc[p.biome+':'+type]||0)+1;return p;
  };
  const nearestCity=(x,z)=>{let nc=null,bd=1e9;for(const k of cities){const d=Math.hypot(k.cx-x,k.cz-z);if(d<bd){bd=d;nc=k}}return nc};
  const wpick=o=>{let s=0;for(const e of o)s+=e[1];let r=rng.next()*s;for(const e of o){r-=e[1];if(r<0)return e[0]}return o[o.length-1][0]};
  const choose=(x,z,place)=>{   // sorteia o tipo pelo bioma do ponto; fora do sorteio: tipo no limite ou cujas regras o lugar não cumpre
    const w=POI_W[B[z*W+x]]||{},o=[];
    for(const t of POI_SORT){
      if((tc[t]||0)>=(G.limit[t]||99)||!poiRuleOK(t,x,z,place))continue;
      if((t==='tavern'||t==='post')&&(tc.tavern||0)+(tc.post||0)>=G.tavpost[1])continue;
      const b=B[z*W+x],bcap=(G.biomeCap[b]||{})[t]||(b===BIO_SNOW||b===BIO_DESERT?G.snowCap:99);if((bc[b+':'+t]||0)>=bcap)continue;
      o.push([t,place==='road'&&(t==='tavern'||t==='post')?G.roadW:(w[t]||1)]);
    }
    const out=[];while(o.length){const t=wpick(o);out.push(t);o.splice(o.findIndex(e=>e[0]===t),1)}
    return out;   // tipos na ordem sorteada: se o primeiro não cabe no terreno, tenta o seguinte
  };
  // folga: cidades, região das dungeons e outros POIs pedem POI_GAP (a guerra é uma viagem); acampamentos, grutas e baús perdidos só não podem encostar
  const crowd=(x,z,d)=>{for(let i=0;i<taken.length;i++){const t=taken[i],g=i<=cities.length||t.poi?POI_GAP:t.r>6?8:4;if(Math.hypot(t.x-x,t.z-z)<t.r+d.r+g)return true}return false};
  const tryAt=(x,z,place,off,t,want)=>{   // off: o ponto é da estrada, e o POI fica ao lado dela; t: tentativa (o desnível aceito sobe com ela); want: tipo sorteado que se insiste em colocar (sem isso os tipos pequenos, que cabem em qualquer lugar, venceriam sempre)
    x=Math.round(x);z=Math.round(z);if(x<40||z<40||x>W-40||z>W-40||(cap&&WORLD.pois.length>=G.maxTyped))return null;
    const ox=x,oz=z;
    let list=choose(ox,oz,place);if(want&&t<WANT_TRIES*(place==='interior'?6:1))list=list.includes(want)?[want]:[];
    for(const type of list){
      const d=POI_DEFS[type];x=ox;z=oz;
      if(off){const a=rng.range(0,6.283),k=d.r+off+rng.range(0,9);x=Math.round(ox+Math.cos(a)*k);z=Math.round(oz+Math.sin(a)*k)}
      if(x<40||z<40||x>W-40||z>W-40||crowd(x,z,d))continue;
      const y=spotOK(x,z,d.r+(POI_BIG[type]?2:1),[],0,(POI_RANGE[type]||4)+(t>10?4:0)+(t>25?4:0)+(t>45?6:0),POI_BIG[type]?0.15:0);
      if(y!==null)return{type,x,z,y};
    }
    return null;
  };
  const select=()=>{
  const roadPools=[];
  const fst=G.first[WORLD.dominant];   // 0) o tipo principal do bioma dominante, no anel de cidades sorteadas
  if(fst)for(let k=0;k<fst[1];k++)for(let t=0;t<250;t++){
    const c=rng.pick(cities),a=rng.range(0,6.283),dist=c.half+16+rng.range(G.ringMin,G.ringMax+30);
    const s=tryAt(c.cx+Math.cos(a)*dist,c.cz+Math.sin(a)*dist,'ring',0,t/2,fst[0]);if(s){add(s.type,s.x,s.z,s.y,{cityId:c.id});break}
  }
  // 1) estrada: 1 POI na beira de cada estrada longa entre duas cidades ligadas, perto do meio do caminho
  for(const lk of WORLD.links||[]){
    const A=cities[lk[0]],Bc=cities[lk[1]];if(!A||!Bc)continue;
    const dab=Math.hypot(A.cx-Bc.cx,A.cz-Bc.cz);if(dab-A.half-Bc.half<G.roadMin)continue;
    const cand=[],x0=Math.max(8,Math.min(A.cx,Bc.cx)-40),x1=Math.min(W-8,Math.max(A.cx,Bc.cx)+40);
    const z0=Math.max(8,Math.min(A.cz,Bc.cz)-40),z1=Math.min(W-8,Math.max(A.cz,Bc.cz)+40);
    for(let z=z0;z<z1;z+=3)for(let x=x0;x<x1;x+=3){
      if(T[z*W+x]!==T_ROAD)continue;const da=Math.hypot(x-A.cx,z-A.cz),db=Math.hypot(x-Bc.cx,z-Bc.cz);
      if(da+db>dab*1.15||da<A.half+POI_GAP+25||db<Bc.half+POI_GAP+25)continue;cand.push([x,z,Math.abs(da-db)]);
    }
    cand.sort((a,b)=>a[2]-b[2]);const pool=cand.filter(c=>c[2]<dab*0.3);   // o miolo do caminho
    roadPools.push({A,Bc,pool});let want=null;
    for(let t=0;t<200&&pool.length;t++){
      const c=pool[t<Math.min(12,pool.length)?t:rng.int(0,pool.length-1)];if(!want)want=choose(c[0],c[1],'road')[0];
      const s=tryAt(c[0],c[1],'road',7,t,want);
      if(s){add(s.type,s.x,s.z,s.y,{cityId:nearestCity(s.x,s.z).id,road:[A.id,Bc.id]});break}
    }
  }
  // 2) anel: de 1 a 3 por cidade (desigual de propósito), de 30 a 70 blocos da muralha, de preferência virados para uma cidade vizinha
  for(const c of cities){
    const nb=(WORLD.links||[]).filter(l=>cities[l[0]]===c||cities[l[1]]===c).map(l=>cities[l[0]]===c?cities[l[1]]:cities[l[0]]);
    for(let k=0,n=rng.pick(G.ring);k<n;k++)for(let t=0,want=null;t<160;t++){
      const o=nb.length&&rng.chance(0.6)?rng.pick(nb):null,a=o?Math.atan2(o.cz-c.cz,o.cx-c.cx)+rng.range(-0.7,0.7):rng.range(0,6.283);
      const dist=c.half+16+rng.range(G.ringMin,G.ringMax),px=Math.round(c.cx+Math.cos(a)*dist),pz=Math.round(c.cz+Math.sin(a)*dist);
      if(!want&&px>=40&&pz>=40&&px<=W-40&&pz<=W-40)want=choose(px,pz,'ring')[0];
      const s=tryAt(px,pz,'ring',0,t,want);
      if(s){add(s.type,s.x,s.z,s.y,{cityId:c.id});break}
    }
  }
  // 3) interior: de 2 a 4, longe das estradas
  for(let k=0,n=rng.int(G.interior[0],G.interior[1]);k<n;k++)for(let t=0,want=null;t<600;t++){
    const x=rng.int(40,W-40),z=rng.int(40,W-40);
    if(poiNearR(x,z,G.sancRoad,i=>T[i]===T_ROAD))continue;
    if(!want)want=choose(x,z,'interior')[0];
    const s=tryAt(x,z,'interior',0,t/6,want);if(s){add(s.type,s.x,s.z,s.y,{cityId:nearestCity(s.x,s.z).id});break}
  }
  // 4) preenchimento: se o mapa ficou com poucos POIs, tenta mais lugares de interior/anel até o mínimo (cidades × fill + 4)
  for(let t=0,want=null;WORLD.pois.length<Math.min(cities.length*G.fill+4,G.maxTyped)&&t<800;t++){
    const x=rng.int(40,W-40),z=rng.int(40,W-40);if(t%100===0)want=null;if(!want)want=choose(x,z,'interior')[0];
    const s=tryAt(x,z,'interior',0,t/8,want);if(s)add(s.type,s.x,s.z,s.y,{cityId:nearestCity(s.x,s.z).id});
  }
  // 5) mínimos: tipo abaixo do mínimo tenta de novo, mesmo acima do teto de sorteados (a variedade vale mais)
  cap=false;
  for(const type in G.min)for(let t=0;(tc[type]||0)<G.min[type]&&t<500;t++){
    const s=tryAt(rng.int(40,W-40),rng.int(40,W-40),'interior',0,t/6,type);if(s)add(s.type,s.x,s.z,s.y,{cityId:nearestCity(s.x,s.z).id});
  }
  for(let guard=0;(tc.tavern||0)+(tc.post||0)<G.tavpost[0]&&guard<2;guard++){   // Taverna/Entreposto: numa estrada que ainda não tem nenhum dos dois
    for(const rp of rng.shuffle(roadPools.slice())){
      if((tc.tavern||0)+(tc.post||0)>=G.tavpost[0])break;
      if(WORLD.pois.some(p=>(p.type==='tavern'||p.type==='post')&&p.road&&p.road[0]===rp.A.id&&p.road[1]===rp.Bc.id)||!rp.pool.length)continue;
      const want=rng.pick(['tavern','post']);
      for(let t=0;t<150;t++){const c=rng.pick(rp.pool),s=tryAt(c[0],c[1],'road',7,t,want);
        if(s){add(s.type,s.x,s.z,s.y,{cityId:nearestCity(s.x,s.z).id,road:[rp.A.id,rp.Bc.id]});break}}
    }
  }
  cap=true;
  // ruínas soltas pelo mapa
  for(let k=0,n=rng.int(2,3);k<n;k++){const s=findSpot(rng,POI_DEFS.ruins.r+1,POI_DEFS.ruins.r+POI_GAP,4,taken,3000);if(s)add('ruins',s.x,s.z,s.y)}
  };
  if(dry){select();const l=WORLD.pois;WORLD.pois=[];return l}
  if(WORLD.poiPlan){   // modo reserva: instancia os lugares já escolhidos (reservePois)
    for(const p of WORLD.poiPlan){
      const d=POI_DEFS[p.type],big=POI_BIG[p.type]?2:1;p.biome=B[p.cz*W+p.cx];
      if(!poiReserved(p.type)){   // não reservado: confere o lugar no terreno final e aplaina agora, como antes
        if(spotOK(p.cx,p.cz,d.r+big,[],0,30,POI_BIG[p.type]?0.15:0)===null){WORLD.reserve.poiDropped=(WORLD.reserve.poiDropped||0)+1;continue}
        reserveFlatDisc(p.cx,p.cz,Math.round(d.r*RESERVE.poiDisc),p.y,RESERVE.poiRampLate);   // disco como os reservados, com rampa curta (estradas e cidades já existem)
      }
      taken.push({x:p.cx,z:p.cz,r:d.r,poi:true});poiBuild(p);WORLD.pois.push(p);
    }
    id=300+WORLD.poiPlan.length;
  }else select();
  // pontes com pedágio (independentes das regras acima): só as mais longas, no máximo POI_GEN.bridgeToll; as outras pontes ficam sem POI
  const cand=WORLD.bridges.filter(br=>br.len>=POI_GEN.bridgeMin).sort((p,q)=>q.len-p.len);
  for(const br of cand){
    if(WORLD.pois.filter(p=>p.type==='bridge').length>=POI_GEN.bridgeToll)break;
    const sp=bridgeSpots(br).find(q=>!WORLD.pois.some(p=>p.type==='bridge'&&Math.hypot(p.cx-q.x,p.cz-q.z)<POI_GEN.bridgeGap)
      &&!taken.some(t=>Math.hypot(t.x-q.x,t.z-q.z)<t.r+14));   // (a região das dungeons e os POIs vizinhos também contam)
    if(!sp)continue;
    const y=H[sp.z*W+sp.x],p={id:id++,type:'bridge',cx:sp.x,cz:sp.z,y,biome:B[sp.z*W+sp.x],owner:'bandit',axis:sp.axis,vs:sp.vs,cityId:nearestCity(sp.x,sp.z).id};
    p.owner=poiInitOwner(p,rng);taken.push({x:sp.x,z:sp.z,r:POI_DEFS.bridge.r});poiBuild(p);WORLD.pois.push(p);br.toll=p.id;
  }
  // estradas de ligação: só Fazenda, Taverna e Entreposto (a ponte já está na estrada). Vão até a estrada MAIS PRÓXIMA, não até a cidade
  const pseudo=q=>({cx:q.cx,cz:q.cz,half:POI_DEFS[q.type].r,gates:[]});
  for(const p of WORLD.pois){
    if(p.type!=='farm'&&p.type!=='tavern'&&p.type!=='post')continue;
    let best=null,bd=1e9;
    for(let z=6;z<W-6;z+=3)for(let x=6;x<W-6;x+=3){
      const k=T[z*W+x];if(k!==T_ROAD&&k!==T_BRIDGE)continue;const d=Math.hypot(x-p.cx,z-p.cz);if(d<bd){bd=d;best=[x,z]}
    }
    if(!best||bd<POI_DEFS[p.type].r+6)continue;
    carveRoad(pseudo(p),{cx:best[0],cz:best[1],half:-3,gates:[]},cities.concat(WORLD.pois.filter(q=>q!==p&&q.type!=='bridge').map(pseudo)),{water:ROAD_WATER_OLD,noBridge:reserveOn(),pinEnds:reserveOn()});   // só por terra (no modo reserva nem ponte: as pontes vêm só do plano de js/reserve.js)
  }
  if(reserveOn())reserveGateLinks(cities);   // portões ainda sem estrada ligam-se à mais próxima, inclusive às estradas de POI (js/reserve.js)
  poiApply();
}

// ---------- mapa manual: todos os POIs lado a lado (abra com ?cenario=pois) ----------
// Em ?cenario=pois o mundo inteiro nasce plano (sem relevo, água nem árvores) e os 17 POIs (11 permanentes e 6 de guerra) são construídos no centro ANTES da malha do terreno, cada um com uma placa
// com o nome e o dono (por isso a trincheira pode ser escavada de verdade). As cidades ficam fora da área.
function poiShowcaseGen(){
  const types=POI_TYPES.concat(POI_WAR_TYPES).filter(t=>t!=='ruinvil'),dk=Object.keys(WAR_DORMANT),cols=5,gx=44,gz=44,rows=Math.ceil((types.length+dk.length)/cols);
  const x0=W/2-(cols-1)*gx/2,z0=W/2-(rows-1)*gz/2,Y=SEA+6;WORLD.pois=[];let id=900;
  const owners=['bandit',(WORLD.factions&&WORLD.factions[0])?WORLD.factions[0].id:'bandit','player'];
  types.forEach((type,i)=>{
    const x=Math.round(x0+(i%cols)*gx),z=Math.round(z0+Math.floor(i/cols)*gz),d=POI_DEFS[type];
    const p={id:id++,type,cx:x,cz:z,y:Y,biome:BIO_PLAINS,owner:type==='ruins'?'none':owners[i%3],show:true,axis:'z'};
    poiBuild(p);WORLD.pois.push(p);
    const lbl=d.n+' — '+poiOwnerName(p.owner);makeSign(lbl,Math.max(4,lbl.length*0.36+0.8),0.9,0x2a2a3a,0xf0e6c0,x,Y+4.4,z+d.r+1.2,'S');
  });
  {const d=POI_DEFS.ruinvil,x=Math.round(x0+(cols-1)*gx+gx/2+d.r+4),z=Math.round(W/2),   // a vila em escombros é grande: fica à direita da grade, não nela
      p={id:id++,type:'ruinvil',cx:x,cz:z,y:Y,biome:BIO_PLAINS,owner:'bandit',show:true,axis:'z'};
    poiBuild(p);WORLD.pois.push(p);const lbl=d.n+' — '+poiOwnerName(p.owner);makeSign(lbl,Math.max(4,lbl.length*0.36+0.8),0.9,0x2a2a3a,0xf0e6c0,x,Y+4.4,z+d.r+1.2,'S')}
  WORLD.dormant=[];   // decorações dormentes (frente da guerra), depois dos POIs: na vitrine não viram POI de guerra
  dk.forEach((kind,j)=>{
    const i=types.length+j,x=Math.round(x0+(i%cols)*gx),z=Math.round(z0+Math.floor(i/cols)*gz),d={i:j,x,z,y:Y,kind,r:WAR_DORMANT[kind].r};
    WORLD.dormant.push(d);dormBuild(d);
    const lbl='Dormente: '+WAR_DORMANT[kind].n;makeSign(lbl,Math.max(4,lbl.length*0.36+0.8),0.9,0x2a2a3a,0xf0e6c0,x,Y+4.4,z+d.r+1.2,'S');
  });
  WORLD.showcase={x:W/2,z:z0+(rows-1)*gz+30,y:Y};
  poiApply();
}
function poiShowcase(){   // chamado pelo cenário: só posiciona o jogador de frente para a primeira fileira
  const s=WORLD.showcase;if(!s)return;
  G.introBook=false;STATE.phase='commander';STATE.round=1;P.x=s.x;P.z=s.z;P.y=s.y+1;P.vx=P.vz=P.vy=0;P.camY=P.y;P.yaw=0;P.pitch=0;
}
