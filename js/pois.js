'use strict';
// ---------- Fase 6: POIs permanentes (fazenda, mina, serraria...) e POIs de guerra (acampamento fortificado, trincheira) ----------
// Fatia 1: gerar, mostrar e guardar o dono. Efeitos, limpeza e anexação vêm nas fatias seguintes (ver docs/fase-6-guerra.md).
// Cada POI é uma construção de blocos numa malha própria (como os acampamentos). O dono (bandidos, uma facção ou o jogador) aparece na bandeira.
// Dono: 'bandit' | número de facção | 'player' | 'none' (ruínas). Só o que mudou vai para STATE.pois (o mundo é refeito pela semente).
const POI_DEFS={
  farm:{n:'Fazenda',ic:'🌾',r:14},mine:{n:'Mina',ic:'⛏',r:15},sawmill:{n:'Serraria',ic:'🪚',r:14},tannery:{n:'Curtume',ic:'🧴',r:14},
  bridge:{n:'Ponte',ic:'🌉',r:9},fort:{n:'Forte',ic:'🏰',r:15},tower:{n:'Torre de vigia',ic:'🗼',r:8},tavern:{n:'Taverna',ic:'🍺',r:13},
  ruins:{n:'Ruínas antigas',ic:'🏛',r:9},forge:{n:'Ferraria',ic:'⚒',r:10},granary:{n:'Celeiro',ic:'🌽',r:13},
  fortcamp:{n:'Acampamento fortificado',ic:'⛺',r:12,war:true},trench:{n:'Trincheira',ic:'🪖',r:11,war:true}
};
const POI_TYPES=['farm','mine','sawmill','tannery','bridge','fort','tower','tavern','ruins','forge','granary'];
Hooks.on('resetState',()=>{STATE.pois={}});

// ---------- dono e bandeira ----------
const poiColor=o=>o==='free'?0xcfcfcf:o==='bandit'?0x2a2a2a:o==='player'?0x2a6aff:typeof o==='number'?(facColor(o)||0x888888):0x888888;
const AMB_GAP=22;   // folga (borda a borda) de portais, acampamentos de bandidos, baús perdidos e cavernas de animais em relação a cidades e POIs: menor que a dos POIs (POI_GAP)
const POI_BORDER='#ff2bd6';   // borda dos quadrados dos POIs nos mapas: magenta, uma cor que não existe no terreno
const poiCss=o=>'#'+poiColor(o).toString(16).padStart(6,'0');
function poiOwnerName(o){return o==='free'?'Livre (limpo)':o==='bandit'?'Bandidos':o==='player'?'Você':o==='none'?'Sem dono':typeof o==='number'?((facOf(o)||{}).name||'Facção'):'?'}
function poiPaint(p){if(p.flagMat)p.flagMat.color.setHex(poiColor(p.owner))}
function poiSetOwner(p,o){p.owner=o;if(!p.show){STATE.pois=STATE.pois||{};STATE.pois[p.id]=o}poiPaint(p);if(typeof poiGarrisonSync==='function')poiGarrisonSync(p)}   // (guarnição e moradores acompanham o dono)
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
  poiPole(c,x,z,h,0x3a3a3a);pBc(c,x-0.18,h,z-0.18,x+0.18,h+0.3,z+0.18,0xe0b030,false,{j:0});
  p.flagMat=new THREE.MeshLambertMaterial({color:poiColor(p.owner)});
  const m=new THREE.Mesh(GEO_BOX,p.flagMat);m.scale.set(1.7,1.05,0.08);m.position.set(c.cx+x+0.95,c.y+h-0.65,c.cz+z);scene.add(m);p.sceneObjs.push(m);
  const t=new THREE.Mesh(GEO_BOX,p.flagMat);t.scale.set(0.6,0.4,0.08);t.position.set(c.cx+x+2.1,c.y+h-0.5,c.cz+z);scene.add(t);p.sceneObjs.push(t);
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
function poiDig(c,x0,z0,x1,z1,d){   // escava o terreno (só vale na geração, antes da malha): rebaixa d blocos e deixa terra batida
  for(let iz=Math.floor(c.cz+z0);iz<Math.ceil(c.cz+z1);iz++)for(let ix=Math.floor(c.cx+x0);ix<Math.ceil(c.cx+x1);ix++){if(ix<1||iz<1||ix>=W-1||iz>=W-1)continue;H[iz*W+ix]=c.y-d;T[iz*W+ix]=T_WILD}
}
function poiLand(c,x0,z0,x1,z1){   // nivela a terra (não a água) à altura do POI
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

// ---------- construtores (frente = +z) ----------
const POI_BUILD={
  farm(c,rng,p){   // casa de fazenda mobiliada, campo de trigo e horta, curral com animais, galinheiro, pomar, poço, carroça e silos
    poiHut(c,-12,-12,8,6,'S',{chimney:true,timber:true,shut:0x3a5a3a},rng);
    for(let i=0;i<7;i++){const z=-10+i*1.7;pBc(c,-3,0,z,11,0.15,z+1.0,0x5a3d22,false,{j:0.02});
      for(let x=-3;x<11;x+=2.4)pBc(c,x,0.15,z+0.1,Math.min(11,x+2.2),0.9+0.25*rng.next(),z+0.8,rng.pick([0xd8b84a,0xe0c050,0xc8a83c]),false,{j:0.08})}
    for(let i=0;i<3;i++){const z=2.6+i*1.2;pBc(c,-3,0,z,3,0.12,z+0.8,0x5a3d22,false,{j:0.02});for(let x=-3;x<3;x+=0.9)pBc(c,x+0.1,0.12,z+0.1,x+0.7,0.5+0.3*rng.next(),z+0.7,rng.pick([0x3a8a2a,0xc83a2a,0xe08a2a,0x5ab03a]),false,{j:0.1})}   // horta
    pBc(c,5,0,2.5,11,0.12,5.5,0x6a4a2e,false,{j:0.03});poiAnimal(c,6,3.2,0xf0ece0,true);poiAnimal(c,8.4,3.8,0x8a5a3a,true);poiAnimal(c,9.8,2.9,0xf0b0b0,false);poiFence(c,4.5,2,11.5,2);poiFence(c,4.5,6,11.5,6);poiFence(c,4.5,2,4.5,6);poiFence(c,11.5,2,11.5,6);   // curral
    pBc(c,-12,0,-5,-9,1.1,-3.6,0x9a6a3a,true,{j:0.03});pBc(c,-12.2,1.1,-5.2,-8.8,1.7,-3.4,0x7a3a2a,false,{j:0.03});pBc(c,-11.5,0,-3.6,-10.5,0.7,-3.5,0x2a1a10,false,{j:0});   // galinheiro
    hay(c,-8,-4.5);hay(c,-6.5,-4.5);hay(c,-7.2,-3.2);
    for(const [tx,tz] of[[-12,5],[-9.5,6.5],[-14,2]])tinyTree(c,tx,tz,rng);
    poiWell(c,-6,3);poiCart(c,-1,-4,true,0xd8b84a);
    poiPole(c,9,-3.6,2.2);pBc(c,7.9,1.5,-3.7,10.1,1.7,-3.5,0x4a3320,false,{j:0});pBc(c,8.7,2.2,-4,9.3,2.7,-3.2,0xb89048,false,{j:0.04});pBc(c,8.55,2.7,-4.1,9.45,2.85,-3.1,0x6b4a2a,false,{j:0});   // espantalho
    for(let k=0;k<2;k++)pBc(c,6+k*1.7,0,-12,7.5+k*1.7,3,-10.5,0xc8c8c8,true,{j:0.03});   // silos
    poiPath(c,-8,-6,-8,2);poiLampAt(c,-9.5,-5.2);poiFence(c,-14,7.5,12,7.5);
    poiFlag(c,p,-14,4,6);
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
  tannery(c,rng,p){   // cabana mobiliada, varais altos de couro, fossos de cal, tinas, estaca de raspar, poço e carroça de peles
    poiHut(c,-12,-12,7,6,'S',{wall:0xc4703a,roof:0x4a2a1a,timber:true,shut:0x4a3a2a},rng);
    for(let r=0;r<2;r++){const z=-2+r*3.2;poiPole(c,-1,z,3.6,0x7a5632);poiPole(c,9,z,3.6,0x7a5632);pBc(c,-1,3.4,z-0.1,9,3.6,z+0.1,0x7a5632,false,{j:0});
      for(let x=0;x<8.4;x+=0.9)pBc(c,x,1.0,z-0.05,x+0.7,3.4,z+0.05,rng.pick([0xe0b888,0xd0a070,0xc89860,0xe8c898]),false,{j:0.03})}
    for(let k=0;k<3;k++){const x=-9+k*3;pBc(c,x,0,3.4,x+2.2,0.9,5.6,0x6a4a2a,true);pBc(c,x+0.2,0.9,3.6,x+2,1.0,5.4,[0x5a7a3a,0x7a5a2a,0xd8d0b0][k],false,{j:0})}   // tinas
    for(let k=0;k<2;k++){const x=-9+k*3.2;pBc(c,x,-0.4,7,x+2.4,0,9,0x4a3a2a,false,{j:0});pBc(c,x+0.1,0.0,7.1,x+2.3,0.08,8.9,k?0xd8d8c0:0x8a8a58,false,{j:0})}   // fossos de cal
    pBc(c,-2,0.4,-9.5,-0.6,1.7,-8.5,0x7a5632,true,{j:0.03});pBc(c,-1.6,1.7,-9.4,-1.0,2.6,-8.6,0x7a5632,false,{j:0.03});   // estaca de raspar
    pBc(c,3,0,6,5,0.5,7.4,0xc09060,false,{j:0.06});poiCart(c,7,5.5,true,0xc89860);poiWell(c,-3.5,6.5);
    barrel(c,5.5,-10);barrel(c,6.7,-10);poiBench(c,2,-10,true);poiPath(c,-8.5,-5.5,-8.5,2);poiLampAt(c,-5,-4.8);poiFence(c,-13,9.5,11,9.5);
    poiFlag(c,p,10,6,6);
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
    poiFlag(c,p,10.5,-6,9);
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
    p.chest=addChest(c.cx,c.y+2.05,c.cz-2.4,0,rng.int(40,120),null);p.chest.onOpen=()=>poiRuinLoot(p);   // 10% de chance de artefato
  },
  forge(c,rng,p){   // ferraria: oficina mobiliada com chaminé, anexo aberto com esmeril e bigorna, barril de têmpera, estante de armas, carvão e ferraduras
    poiHut(c,-8,-8,8,6,'S',{h:4,wall:0x8a8a90,roof:0x33333a,chimney:true,timber:false},rng);
    pBc(c,-5,0,-9.6,-3.4,6,-8.0,0x6a6a70,true,{j:0.04});pBc(c,-5.2,6,-9.8,-3.2,6.6,-7.8,0x55555c,false,{j:0.03});   // chaminé alta, encostada na parede dos fundos
    // anexo aberto (telhado de uma água sobre pilares)
    for(const [x,z] of[[1,0],[6,0],[1,4.5],[6,4.5]])pBc(c,x,0,z,x+0.3,2.8,z+0.3,0x5a3d22,true,{j:0});for(let k=0;k<4;k++)pBc(c,0.6,2.8+k*0.2,k*1.2-0.2,6.8,3.0+k*0.2,k*1.2+1.4,k%2?0x4a3a2a:0x5a4a3a,false,{j:0.03});
    pBc(c,2,0,1.5,3.1,0.5,2.7,0x3a3a3a,true);pBc(c,1.9,0.5,1.4,3.2,0.8,2.8,0x2a2a2a,false,{j:0});pBc(c,3.1,0.2,1.8,3.5,0.55,2.4,0x2a2a2a,false,{j:0});   // bigorna
    pBc(c,4.2,0,1,5.6,0.6,2.4,0x6b4a2a,true,{j:0.03});pBc(c,4.3,0.6,1.1,5.5,0.7,2.3,0x3a7ad8,false,{j:0});   // barril/cocho de têmpera
    pBc(c,4.2,0.7,3.2,4.9,1.4,3.5,0x7a7a82,true,{j:0.03});pBc(c,4.4,1.4,3.0,4.7,1.9,3.7,0xb0b0b8,false,{j:0});pBc(c,4.5,0.2,3.3,4.6,0.7,3.4,0x4a3320,false,{j:0});   // esmeril
    poiRack(c,-7,4.4,true);poiRack(c,-4.8,4.4,true);
    for(let k=0;k<5;k++)pBc(c,7+k*0.35,0,2+k*0.25,7.9+k*0.35,0.25+0.12*k,2.7+k*0.25,0x2a2a2a,false,{j:0.1});   // carvão
    for(let k=0;k<4;k++)pBc(c,-1.6,0.5+k*0.4,5.6+0.0,-1.0,0.65+k*0.4,5.7,0x9a9aa2,false,{j:0});   // ferraduras
    poiPole(c,-1.3,5.5,2.2);poiBench(c,-3.5,5.4,true);poiPath(c,-4,-1.5,-4,5);poiLampAt(c,-0.5,-1);poiSign(c,-5.5,6.6,0x4a4a52);
    poiFlag(c,p,8,7,6);
  },
  granary(c,rng,p){   // celeiro vermelho com porta larga e claraboia do palheiro, silos, carroça, galinheiro, cocho, cata-vento e fardos
    poiHut(c,-7,-9,13,9,'S',{h:5,wall:0xa83a2a,roof:0x5a3a2a,timber:true,shut:0xe8e0d0},rng);
    pBc(c,-2.5,4.4,0.2,0.5,4.8,0.5,0xe8e0d0,false,{j:0});for(const s of[-2.5,0.5])pBc(c,s-0.1,0,0.15,s+0.1,4.4,0.5,0xe8e0d0,false,{j:0});   // moldura da porta larga (X branco)
    pBc(c,-1.9,5.4,-0.1,-0.1,6.6,0.1,0x1a1008,false,{j:0});pBc(c,-2.1,5.3,-0.15,0.1,5.4,0.1,0xe8e0d0,false,{j:0});   // janela do palheiro
    hay(c,8,0);hay(c,9.4,0);hay(c,8.7,1.4);hay(c,-9,2);hay(c,-9,3.4);hay(c,-8.2,2.6);
    for(let k=0;k<7;k++)pBc(c,6.5,k*1.1,-8.5,9.5,k*1.1+1.1,-5.5,k%2?0xc8c8c8:0xd8d8d8,k===0,{j:0.02});
    pBc(c,6.4,7.7,-8.6,9.6,8.1,-5.4,0x7a4a2a,false,{j:0});pBc(c,7,8.1,-8,9,8.7,-6,0x7a4a2a,false,{j:0});
    for(let k=0;k<5;k++)pBc(c,9.8,k*1.1,-4.4,11.6,k*1.1+1.1,-2.6,k%2?0xc8c8c8:0xd8d8d8,k===0,{j:0.02});pBc(c,9.7,5.5,-4.5,11.7,5.9,-2.5,0x7a4a2a,false,{j:0});   // silo menor
    poiCart(c,5,4,true,0xd8b84a);poiAnimal(c,-5,5.2,0xf0ece0,true);poiAnimal(c,-3,6,0x8a5a3a,true);poiFence(c,-7,4.4,-1.5,4.4);poiFence(c,-7,8,-1.5,8);poiFence(c,-7,4.4,-7,8);poiFence(c,-1.5,4.4,-1.5,8);
    pBc(c,2,0,6.4,5,0.6,7.2,0x7a5632,true,{j:0.04});pBc(c,2.1,0.6,6.5,4.9,0.7,7.1,0x3a7ad8,false,{j:0});
    poiPole(c,-1,-4.5,11);pBc(c,-1.9,10.6,-4.7,-0.1,10.9,-4.3,0x3a3a3a,false,{j:0});pBc(c,-0.2,10.4,-4.8,0.5,11.1,-4.2,0x3a3a3a,false,{j:0});   // cata-vento
    for(let k=0;k<4;k++)pBc(c,-12+k*0.0,0,-6+k*1.0,-11,0.4+k*0.0,-5.4+k*1.0,0xe8dcc0,false,{j:0.05});   // sacos
    poiPath(c,0,1.2,0,6);poiLampAt(c,2.8,1.8);
    poiFlag(c,p,-9,6,6);
  },
  bridge(c,rng,p){   // posto de pedágio de aço: tabuleiro metálico com guarda-corpo, pórtico, cancela (com colisão) e guarita mobiliada sobre base própria (p.axis: direção da estrada)
    const A=p.axis==='x',Q=(u0,v0,u1,v1,y0,y1,col,s,o)=>A?pBc(c,v0,y0,u0,v1,y1,u1,col,s,o):pBc(c,u0,y0,v0,u1,y1,v1,col,s,o);   // u: de lado a lado da estrada; v: ao longo dela
    for(let v=-12;v<=12;v++){   // tabuleiro de chapas de aço e guarda-corpo, acompanhando a altura de cada trecho da estrada
      const tx=Math.round(c.cx+(A?v:0)),tz=Math.round(c.cz+(A?0:v));
      for(let u=-1;u<=1;u++){const ix=A?tx:tx+u,iz=A?tz+u:tz,tt=T[iz*W+ix];if(tt!==T_ROAD&&tt!==T_BRIDGE)continue;const hy=H[iz*W+ix]-c.y;
        pBc(c,ix-c.cx,hy,iz-c.cz,ix-c.cx+1,hy+0.16,iz-c.cz+1,(v+u+9)%2?0x4a5058:0x5c636e,false,{j:0.01});
        if(!((v+u+9)%3))pBc(c,ix-c.cx+0.35,hy+0.16,iz-c.cz+0.35,ix-c.cx+0.65,hy+0.2,iz-c.cz+0.65,0x8a929c,false,{j:0})}   // rebites
      const hc=H[tz*W+tx]-c.y;for(const s of[-1,1]){const u=s*2.6;Q(u-0.07,v,u+0.07,v+1,hc+0.9,hc+1.05,0x6a727c,true,{j:0});Q(u-0.07,v,u+0.07,v+1,hc+0.3,hc+0.42,0x6a727c,true,{j:0});if(v%3===0)Q(u-0.1,v,u+0.1,v+0.2,hc,hc+1.1,0x7a828c,true,{j:0})}}
    for(const s of[-1,1]){Q(s*3.6-0.9,-0.9,s*3.6+0.9,0.9,-4,6,0x8a8a90,true,{j:0.04});Q(s*3.6-1.1,-1.1,s*3.6+1.1,1.1,5.6,6.2,0x7a7a82,false,{j:0.03});Q(s*3.6-0.3,-0.95,s*3.6+0.3,-0.9,1.2,3.0,0x1a1a1a,false,{j:0});Q(s*3.6-0.15,-1.4,s*3.6+0.15,-0.9,3.2,3.7,0xffe9a0,false,{j:0})}
    Q(-3.8,-0.5,3.8,0.5,5.2,6,0x6b4a2a,false,{j:0.03});
    Q(-3.2,1.2,0,1.5,1.0,1.2,0xc03a3a,true,{j:0});Q(-3.2,1.2,-2.6,1.5,0,1.2,0x4a3320,true,{j:0});   // cancela levantada pela metade da pista (a outra metade fica livre), com colisão
    const hx=A?-3:6,hz=A?6:-3,hw=5;
    poiLand(c,hx-2,hz-2,hx+hw+2,hz+hw+2);pBc(c,hx,-8,hz,hx+hw+0.5,0,hz+hw+0.5,0x6a5a40,true,{j:0.02});   // nivela a terra e dá uma base de terra: a guarita nunca fica no ar nem enterrada
    poiHut(c,hx,hz,hw,hw,A?'N':'W',{h:3.6,wall:0x9a8a7a,roof:0x4a3a2a,timber:true},rng);
    Q(5.6,2.2,7.2,3.2,0,0.9,0x7a5a30,true,{j:0.04});Q(7.6,2.4,8.6,3.2,0,1.3,0x8a6a3a,true,{j:0.04});Q(-8.5,2.5,-6,4.5,0,1,0x6b4a2a,true,{j:0.05});
    Q(-6,1,-4.9,2.2,0,0.8,0x8a8a90,true,{j:0.04});
    const fx=A?0:-3.6,fz=A?-3.6:0;poiFlag(c,p,fx,fz,8);
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
  }
};

// ---------- construção numa malha própria ----------
function poiBuild(p){
  const c=poiArea(p.cx,p.cz,p.y,p.biome),rng=new RNG((WORLD.seed*53+p.id*97+3)>>>0);p.sceneObjs=[];p.c=c;
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
  for(const q of WORLD.chests||[])if(Math.hypot(q.x-x,q.z-z)<3+g)return true;
  return false;
}
const POI_GAP=30;   // folga mínima, em blocos, entre a borda de um POI e a muralha de uma cidade ou a borda de outro POI: conquistá-lo na guerra tem de ser uma viagem
const poiNearR=(x,z,R,f)=>{for(let dz=-R;dz<=R;dz+=6)for(let dx=-R;dx<=R;dx+=6){const i=(z+dz)*W+x+dx;if(i>=0&&i<W*W&&f(i))return true}return false};
const poiNear=(x,z,f)=>{for(let dz=-18;dz<=18;dz+=9)for(let dx=-18;dx<=18;dx+=9){const i=(z+dz)*W+x+dx;if(i>=0&&i<W*W&&f(i))return true}return false};
const POI_PRED={
  farm:(x,z)=>B[z*W+x]===BIO_PLAINS||B[z*W+x]===BIO_DESERT,
  mine:(x,z)=>poiNear(x,z,i=>B[i]===BIO_ROCK||H[i]>=SEA+12),
  sawmill:(x,z)=>B[z*W+x]===BIO_FOREST,
  tannery:(x,z)=>B[z*W+x]===BIO_PLAINS||B[z*W+x]===BIO_FOREST,
  fort:(x,z)=>H[z*W+x]>=SEA+6,
  tower:(x,z)=>H[z*W+x]>=SEA+8,
  tavern:(x,z)=>poiNearR(x,z,30,i=>T[i]===T_ROAD),   // taverna só perto de estrada (em nenhuma passada)
  ruins:()=>true,
  forge:()=>true,
  granary:(x,z)=>B[z*W+x]===BIO_PLAINS
};
const POI_RANGE={mine:9,fort:7,tower:7};
function poiInitOwner(p,rng){
  if(p.type==='ruins')return 'none';
  const hm=WORLD.home;if(hm&&Math.hypot(hm.cx-p.cx,hm.cz-p.cz)<170)return 'bandit';   // perto da cidade do jogador: tomado por bandidos
  let nc=null,bd=1e9;for(const k of WORLD.cities){const d=Math.hypot(k.cx-p.cx,k.cz-p.cz);if(d<bd){bd=d;nc=k}}
  return nc&&nc.fid!==undefined&&rng.chance(0.5)?nc.fid:'bandit';
}
function genWorldPois(cities,taken){
  if(WORLD.showcaseMode){poiShowcaseGen();return}
  const rng=new RNG((WORLD.seed*131+7)>>>0);WORLD.pois=[];let id=300;
  const add=(type,x,z,y,extra)=>{
    const d=POI_DEFS[type],p=Object.assign({id:id++,type,cx:x,cz:z,y,biome:B[z*W+x],owner:'bandit'},extra||{});
    p.owner=poiInitOwner(p,rng);flattenArea(x,z,d.r,y);taken.push({x,z,r:d.r});poiBuild(p);WORLD.pois.push(p);return p;
  };
  const nearestCity=(x,z)=>{let nc=null,bd=1e9;for(const k of cities){const d=Math.hypot(k.cx-x,k.cz-z);if(d<bd){bd=d;nc=k}}return nc};
  const place=(type,pass,pick)=>{   // acha um lugar para o tipo; pick() devolve [x,z] sorteado
    const d=POI_DEFS[type];
    for(let t=0;t<260;t++){
      const [x,z]=pick();if(x<40||z<40||x>W-40||z>W-40)continue;
      if((!pass||type==='tavern')&&!POI_PRED[type](x,z))continue;
      const y=spotOK(x,z,d.r+1,taken,d.r+POI_GAP,(POI_RANGE[type]||4)+(t>100?4:0)+(t>190?6:0));if(y===null)continue;   // o desnível aceito sobe se não achar lugar
      return{x,z,y};
    }
    return null;
  };
  // 1 a 4 POIs por cidade (distribuição desigual de propósito), longe da muralha, de tipos que combinem com o terreno
  const tc={},counts=[1,2,2,3,3,4],pool0=POI_TYPES.filter(t=>t!=='bridge'&&t!=='ruins');
  for(const c of cities){
    const n=rng.pick(counts),pool=rng.shuffle(pool0.slice()).sort((a,b)=>(tc[a]||0)-(tc[b]||0));let made=0;const mine=new Set();if(rng.chance(0.55)){pool.splice(pool.indexOf('fort'),1);pool.unshift('fort')}   // tipos menos usados no mapa primeiro (sem encher o mundo de torres)
    for(const pass of[0,1])for(const type of pool){   // 2ª passada: o que não achou terreno ideal aceita qualquer lugar plano (menos mina e serraria, que dependem do terreno)
      if(made>=n)break;if(mine.has(type)||(pass&&(type==='mine'||type==='sawmill')))continue;
      const d=POI_DEFS[type],s=place(type,pass,()=>{const a=rng.range(0,6.283),dist=rng.range(c.half+d.r+POI_GAP+10,c.half+d.r+POI_GAP+130);return[Math.round(c.cx+Math.cos(a)*dist),Math.round(c.cz+Math.sin(a)*dist)]});
      if(s){add(type,s.x,s.z,s.y,{cityId:c.id});mine.add(type);made++;tc[type]=(tc[type]||0)+1}
    }
  }
  // o ideal é ter mais POIs do que cidades: se faltou, completa com sorteio no mapa todo
  for(let guard=0;WORLD.pois.length<cities.length*2+2&&guard<40;guard++){
    const type=pool0.slice().sort((a,b)=>(tc[a]||0)-(tc[b]||0))[guard%3],d=POI_DEFS[type],s=place(type,guard>pool0.length?1:0,()=>[rng.int(40,W-40),rng.int(40,W-40)]);
    if(s){const nc=nearestCity(s.x,s.z);add(type,s.x,s.z,s.y,{cityId:nc?nc.id:undefined});tc[type]=(tc[type]||0)+1}
  }
  // fortes devem aparecer mais: pelo menos um para cada duas cidades
  for(let guard=0;WORLD.pois.filter(p=>p.type==='fort').length<Math.ceil(cities.length/2)&&guard<14;guard++){
    const s=place('fort',guard>4?1:0,()=>[rng.int(40,W-40),rng.int(40,W-40)]);
    if(s){const nc=nearestCity(s.x,s.z);add('fort',s.x,s.z,s.y,{cityId:nc?nc.id:undefined});tc.fort=(tc.fort||0)+1}
  }
  // ruínas soltas pelo mapa
  for(let k=0,n=rng.int(3,5);k<n;k++){const s=findSpot(rng,POI_DEFS.ruins.r+1,POI_DEFS.ruins.r+POI_GAP,4,taken,3000);if(s)add('ruins',s.x,s.z,s.y)}
  // pontes: postos de pedágio em trechos de ponte da estrada (até 2, afastados entre si)
  const bt=[];for(let z=6;z<W-6;z+=3)for(let x=6;x<W-6;x+=3)if(T[z*W+x]===T_BRIDGE)bt.push([x,z]);
  rng.shuffle(bt);
  for(const [x,z] of bt){
    if(WORLD.pois.filter(p=>p.type==='bridge').length>=2)break;
    if(WORLD.pois.some(p=>p.type==='bridge'&&Math.hypot(p.cx-x,p.cz-z)<90))continue;
    if(taken.some(t=>Math.hypot(t.x-x,t.z-z)<t.r+14))continue;
    const roadZ=[T_ROAD,T_BRIDGE].includes(getT(x,z+4))&&[T_ROAD,T_BRIDGE].includes(getT(x,z-4));
    const roadX=[T_ROAD,T_BRIDGE].includes(getT(x+4,z))&&[T_ROAD,T_BRIDGE].includes(getT(x-4,z));
    if(!roadZ&&!roadX)continue;
    const y=H[z*W+x],p={id:id++,type:'bridge',cx:x,cz:z,y,biome:B[z*W+x],owner:'bandit',axis:roadZ?'z':'x'};
    p.owner=poiInitOwner(p,rng);taken.push({x,z,r:POI_DEFS.bridge.r});poiBuild(p);WORLD.pois.push(p);   // (sem aplainar: o terreno da ponte já é a estrada)
  }
  // estradas: cada POI (menos ruínas e pontes) ganha uma estrada até a cidade que o originou (o traçado reaproveita as estradas que já existem)
  const pseudo=q=>({cx:q.cx,cz:q.cz,half:POI_DEFS[q.type].r,gates:[]});
  for(const p of WORLD.pois){
    if(p.type==='ruins'||p.type==='bridge'||p.cityId===undefined)continue;
    const city=cities.find(k=>k.id===p.cityId);if(!city)continue;
    carveRoad(pseudo(p),{cx:city.cx,cz:city.cz,half:city.half,gates:[]},cities.filter(k=>k!==city).concat(WORLD.pois.filter(q=>q!==p&&q.type!=='bridge').map(pseudo)));
  }
  poiApply();
}

// ---------- mapa manual: todos os POIs lado a lado (abra com ?cenario=pois) ----------
// Em ?cenario=pois o mundo inteiro nasce plano (sem relevo, água nem árvores) e os 13 POIs são construídos no centro ANTES da malha do terreno, cada um com uma placa
// com o nome e o dono (por isso a trincheira pode ser escavada de verdade). As cidades ficam fora da área.
function poiShowcaseGen(){
  const types=POI_TYPES.concat(['fortcamp','trench']),cols=5,gx=44,gz=44,rows=Math.ceil(types.length/cols);
  const x0=W/2-(cols-1)*gx/2,z0=W/2-(rows-1)*gz/2,Y=SEA+6;WORLD.pois=[];let id=900;
  const owners=['bandit',(WORLD.factions&&WORLD.factions[0])?WORLD.factions[0].id:'bandit','player'];
  types.forEach((type,i)=>{
    const x=Math.round(x0+(i%cols)*gx),z=Math.round(z0+Math.floor(i/cols)*gz),d=POI_DEFS[type];
    const p={id:id++,type,cx:x,cz:z,y:Y,biome:BIO_PLAINS,owner:type==='ruins'?'none':owners[i%3],show:true,axis:'z'};
    poiBuild(p);WORLD.pois.push(p);
    const lbl=d.n+' — '+poiOwnerName(p.owner);makeSign(lbl,Math.max(4,lbl.length*0.36+0.8),0.9,0x2a2a3a,0xf0e6c0,x,Y+4.4,z+d.r+1.2,'S');
  });
  WORLD.showcase={x:W/2,z:z0+(rows-1)*gz+30,y:Y};
  poiApply();
}
function poiShowcase(){   // chamado pelo cenário: só posiciona o jogador de frente para a primeira fileira
  const s=WORLD.showcase;if(!s)return;
  G.introBook=false;STATE.phase='commander';STATE.round=1;P.x=s.x;P.z=s.z;P.y=s.y+1;P.vx=P.vz=P.vy=0;P.camY=P.y;P.yaw=0;P.pitch=0;
}
