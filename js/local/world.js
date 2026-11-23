'use strict';
// ---------- Geração procedural do mundo ----------
const T_NAT=0,T_ROAD=1,T_STREET=2,T_PLAZA=3,T_FLOOR=4,T_BRIDGE=5,T_GARDEN=6,T_SOIL=7,T_WHEAT=8,T_OUT=9;   // T_OUT: fora da pegada da cidade, só durante buildCity (cityfoot.js)
const BIO_PLAINS=0,BIO_FOREST=1,BIO_DESERT=2,BIO_SNOW=3,BIO_ROCK=4;
// MAP = o mapa local ATIVO (terreno, cidades, rios, estradas...). WORLD é um alias temporário (mesmo objeto) para o código que ainda usa o nome antigo.
// Etapa 2 do plano do mapa mundi: o mapa mundi terá vários mapas locais; mapUse(m) troca o ativo (tamanho W, H/T/B e WORLD). Chunks, colisões e cena
// ainda são únicos (a troca completa vem na etapa 3); mapSync() guarda em MAP o estado de grade atual.
let MAP={cities:[],seed:0,home:null,chunkMeshes:[],mapCanvas:null,windmills:[],size:0};
let WORLD=MAP;
function mapSync(){MAP.size=W;MAP.H=H;MAP.T=T;MAP.B=B}
function mapUse(m){MAP=WORLD=m;if(m.size)mapSetSize(m.size);if(m.H){H=m.H;T=m.T;B=m.B}return m}
// Estradas sobre a água (números de balanceamento): custo extra do A* por célula de água (antes 6 = quase sempre contornava),
// ROAD_FILL_MAX: trecho de água de até esse tamanho (blocos) vira aterro e não ponte,
// vão máximo de água seguida (blocos; acima disso a estrada refaz o trajeto com o custo antigo) e cabeceira (blocos de terra com tabuleiro em cada ponta).
const ROAD_WATER=1,ROAD_WATER_OLD=6,ROAD_SPAN_MAX=48,ROAD_FILL_MAX=4,BRIDGE_HEAD=3,BRIDGE_R=2.5;   // BRIDGE_R: raio do tabuleiro (5 blocos de largura: cabem 2 personagens lado a lado)
const CHUNKS=[];
function chunkOf(x,z){const cx=clamp(Math.floor(x/CHK),0,NCH-1),cz=clamp(Math.floor(z/CHK),0,NCH-1);return CHUNKS[cz*NCH+cx]}
// Caixa estática (malha + colisão opcional) em coordenadas de mundo
// captura: quando definida, as caixas vão para uma malha própria (removível) em vez da malha do chunk
let BX_CAP=null,BX_LIFT=null;   // BX_LIFT: cidade multinível em construção (js/cityfoot.js): caixas e colisões sobem o nível local
function Bx(x0,y0,z0,x1,y1,z1,color,col,o){
  if(BX_LIFT){const d=cityLv(BX_LIFT,(x0+x1)/2-BX_LIFT.cx,(z0+z1)/2-BX_LIFT.cz);y0+=d;y1+=d}
  if(BX_CAP){BX_CAP.batch.box(x0,y0,z0,x1,y1,z1,color,o);if(col){const b={x0,y0,z0,x1,y1,z1};Col.add(b);BX_CAP.cols.push(b)}return}
  if(o&&o.lf){leafOf((x0+x1)/2,(z0+z1)/2).box(x0,y0,z0,x1,y1,z1,color,o);return}   // folhas: malha à parte, que fica translúcida quando o jogador está sob a copa
  chunkOf((x0+x1)/2,(z0+z1)/2).box(x0,y0,z0,x1,y1,z1,color,o);
  if(col)Col.add({x0,y0,z0,x1,y1,z1});
}
const LEAVES=[],LZ=new Map(),LEAF_U={uP:{value:new THREE.Vector3()},uOn:{value:0}};   // LZ: copas por célula de 8×8 (para saber se o jogador está sob uma)
const LEAF_MAT=new THREE.MeshLambertMaterial({vertexColors:true});
// folhas e neve (malha à parte): só os pedaços acima da cabeça e perto do jogador ficam "vazados" (tela quadriculada), então só a árvore em que ele está some
LEAF_MAT.onBeforeCompile=sh=>{
  sh.uniforms.uP=LEAF_U.uP;sh.uniforms.uOn=LEAF_U.uOn;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>','#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;uniform vec3 uP;uniform float uOn;').replace('void main() {','void main() {\n  if(uOn>0.5){vec2 d=vWP.xz-uP.xz;if(dot(d,d)<11.0&&vWP.y>uP.y+1.0){vec2 q=floor(gl_FragCoord.xy);if(mod(q.x+q.y,2.0)<1.0)discard;}}');
};
const TREEC=new Set();   // células com tronco de árvore (portais e outras coisas precisam de área limpa)
function treeNear(x,z,r){x=Math.floor(x);z=Math.floor(z);for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)if(TREEC.has((z+dz)*W+x+dx))return true;return false}
function leafOf(x,z){const cx=clamp(Math.floor(x/CHK),0,NCH-1),cz=clamp(Math.floor(z/CHK),0,NCH-1);return LEAVES[cz*NCH+cx]}
function leafZone(cx,cz,r,ty){const k=Math.floor(cx/8)+','+Math.floor(cz/8);let a=LZ.get(k);if(!a)LZ.set(k,a=[]);a.push([cx,cz,r+0.6,ty])}
function updateLeafFade(){   // liga o efeito quando o jogador está debaixo de uma copa
  let under=false;const gx=Math.floor(P.x/8),gz=Math.floor(P.z/8);
  for(let dx=-1;dx<=1&&!under;dx++)for(let dz=-1;dz<=1&&!under;dz++){const a=LZ.get((gx+dx)+','+(gz+dz));if(a)for(const t of a)if(Math.hypot(P.x-t[0],P.z-t[1])<t[2]&&P.y<t[3]+2.5){under=true;break}}
  LEAF_U.uOn.value=under?1:0;LEAF_U.uP.value.set(P.x,P.y,P.z);
}
function setT(x,z,t){if(x>=0&&z>=0&&x<W&&z<W)T[z*W+x]=t}
function getT(x,z){return(x>=0&&z>=0&&x<W&&z<W)?T[z*W+x]:0}

function biomeAt(x,z,h,nt,nm,nj){
  const j=(nj.v(x/5,z/5)-0.5)*0.07;
  const t=nt.fbm(x/130+90,z/130+40,3)+j,m=nm.fbm(x/110-70,z/110+25,3)-j;
  if(h>=SEA+17)return BIO_ROCK;
  if(t>0.545&&m<0.52)return BIO_DESERT;
  if(t<0.45)return BIO_SNOW;
  if(m>0.54)return BIO_FOREST;
  return BIO_PLAINS;
}

const NAME_A=['Vila','Porto','Monte','Campo','Pedra','Rio','Forte','Vale','Santa','Alto'];
const NAME_B={
  0:['Alvorada','Trigal','Esperança','Aurora','Carvalho','Lírios','Sabiá','Ventura'],
  1:['Pinheiral','Corvo','Musgo','Lobo','Cedro','Bosque','Orvalho','Samambaia'],
  2:['Areia','Dourada','Oásis','Escorpião','Miragem','Sol Ardente','Cacto','Duna'],
  3:['Gelo','Neblina','Cristal','Geada','Urso Branco','Nevasca','Aurora Fria','Pingo'],
  4:['Ferro','Granito','Trovão','Águia','Brasa','Rocha Viva','Cinza','Cume']
};
function cityName(rng,biome,used){
  for(let k=0;k<30;k++){const n=rng.pick(NAME_A)+' '+rng.pick(NAME_B[biome]);if(!used.has(n)){used.add(n);return n}}
  return 'Povoado '+rng.int(1,99);
}

const DOM_NAMES={plains:'Planícies',forest:'Florestas',mountain:'Montanhas',snow:'Neve',desert:'Deserto'};
// Relevo, rios e biomas (H e B). P = {seed,dominant,shape,sAng,bayA}; stamps = reservas (cidades) aplicadas depois da suavização e antes dos biomas
// (js/reserve.js); roads = corredores de estrada (fase 2). Sem stamps o resultado é o mesmo do gerador antigo. Não consome o RNG do mundo: tudo sai da semente.
// Relevo em etapas (cada uma chamável sozinha; a ordem é a de genRelief): reliefTerrain (altura base, costa e rios), reservas das cidades/POIs/estradas, reliefBiomes.
function genRelief(P,stamps,roads,pois){
  reliefTerrain(P);
  if(stamps)for(const c of stamps)c.foot?cityFootFlatten(c,RESERVE.apron):citySquareFlatten(c);   // reservas: pegada e faixa plana + rampa (js/reserve.js)
  if(pois)reservePoisRelief(pois);   // POIs grandes reservados (fase 3, js/reserve.js)
  if(roads)reserveRoadsRelief(roads);   // corredores de estrada e pontes (js/reserve.js)
  reliefBiomes(P);
}
// Etapa relevo (+ rios): preenche H a partir do campo de altura, da forma do mapa (landMask), da costa e dos rios.
function reliefTerrain(P){
  if(P.win){reliefField(P);return}   // janela do campo do mundo (?mundo=1, ?cenario=tile; js/mapwin.js): altura vem de wfHeight, sem forma de ilha própria
  const {seed,dominant,shape,sAng,bayA}=P;
  const nz=new Noise(seed),nt=new Noise(seed+11),nm=new Noise(seed+23),nr=new Noise(seed+37),nd=new Noise(seed+51),nj=new Noise(seed+77);
  const wn=new Noise(seed+131);
  const landMask=(x,z)=>{
    const u=(x-W/2)/(W/2),v=(z-W/2)/(W/2);
    if(tileTestOn())return 1-smooth(0.97,1,Math.max(Math.abs(u),Math.abs(v)));   // mapa de teste (?cenario=batalha): terra até quase a borda, sem forma de ilha
    const wx=wn.fbm(x/110,z/110,3)-0.5,wz=wn.fbm(x/110+50,z/110-30,3)-0.5;
    const box=(a,b)=>Math.pow(Math.pow(Math.abs(a),4)+Math.pow(Math.abs(b),4),0.25);
    switch(shape){
      case 0:return 1-smooth(0.7,1,box(u+wx*0.4,v+wz*0.4));
      case 1:return 1-smooth(0.6,0.95,Math.hypot(u+wx*0.9,v+wz*0.9)*0.95);
      case 2:{const a=u+wx*0.3,b=v+wz*0.3;return(1-smooth(0.74,1,box(a,b)))*smooth(0.14,0.32,Math.hypot(a,b))}
      case 3:{const a=u+wx*0.3,b=v+wz*0.3,db=Math.hypot(a-Math.cos(bayA)*0.5,b-Math.sin(bayA)*0.5);return(1-smooth(0.72,1,box(a,b)))*smooth(0.26,0.5,db)}
      default:{const a=u+wx*0.3,b=v+wz*0.3,ru=a*Math.cos(sAng)+b*Math.sin(sAng),rv=-a*Math.sin(sAng)+b*Math.cos(sAng);return 1-smooth(0.72,1,Math.hypot(ru/1.1,rv/0.72))}
    }
  };
  // relevo: fora do modo montanhas as serras são raras e baixas; planícies/desertos/florestas ficam suaves, com praias e margens de rio graduais
  const mtnW=dominant==='mountain'?[0.3,0.55]:[0.64,0.86],amp=dominant==='mountain'?[27,22]:[19,16];
  const HF=new Float32Array(W*W),MT=new Float32Array(W*W);
  let baseV=0,mtnV=0,edgeV=0;
  // relevo de um ponto sem rios (altura bruta); guarda base, serra e borda nas variáveis acima para o resto da conta
  const preH=(x,z)=>{
    edgeV=1-landMask(x,z);
    baseV=nz.fbm(x/100,z/100,4);
    mtnV=smooth(mtnW[0],mtnW[1],nm.fbm(x/140+5,z/140+9,3));
    const ridge=1-Math.abs(2*nr.fbm(x/55,z/55,3)-1);
    return SEA+6+(baseV-0.5)*amp[0]+mtnV*(ridge*amp[1]+4)+(nd.fbm(x/10,z/10,2)-0.5)*(dominant==='mountain'?3.4:2);
  };
  const coast=h=>{   // o relevo desce devagar até a praia e então afunda no mar
    h=lerp(h,SEA+1.2+(baseV-0.5)*3,smooth(0.02,0.5,edgeV)*(1-mtnV*0.5));
    return h-smooth(0.45,0.95,edgeV)*6;
  };
  reliefRivers(P,preH,coast);   // rios desenhados (js/rivers.js): calculados uma vez por mundo
  const RV=P.drawn?P.rivers:null;
  for(let z=0;z<W;z++)for(let x=0;x<W;x++){
    const i=z*W+x;let h=preH(x,z);
    if(RV){   // rio desenhado: aplicado depois da costa (senão a praia entope a foz): vale suave em volta do leito, depois o leito
      h=coast(h);
      if(h>=SEA){   // o vale só mexe na terra (no mar ele levantava o fundo)
        if(dominant!=='mountain')h=lerp(h,SEA+2,RV.RVAL[i]*0.7*(1-mtnV*0.6));
        else h=lerp(h,SEA+3,RV.RVAL[i]*0.55);
      }
      HF[i]=Math.min(h,lerp(h,SEA-2.5,RV.RCH[i]));MT[i]=mtnV;continue;   // o leito só desce (a foz no mar não levanta o fundo)
    }else{
      const rv=Math.abs(nr.fbm(x/80+200,z/80-120,3)-0.5);
      if(dominant!=='mountain')h=lerp(h,SEA+2,smooth(0.16,0.05,rv)*0.6*(1-mtnV));       // vale aberto em volta do rio
      h=lerp(h,SEA-2.5,smooth(0.07,0.014,rv)*(1-mtnV*0.85));                            // margem em declive suave
    }
    HF[i]=coast(h);MT[i]=mtnV;
  }
  // suavização das áreas que não são serra (duas passadas de média 3x3)
  for(let pass=0;pass<1;pass++){
    const src=HF.slice();
    for(let z=1;z<W-1;z++)for(let x=1;x<W-1;x++){
      const i=z*W+x,k=1-Math.min(1,MT[i]*1.4);if(k<=0.02)continue;
      let s=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)s+=src[i+dz*W+dx];
      HF[i]=src[i]+(s/9-src[i])*k;
    }
  }
  for(let i=0;i<W*W;i++)H[i]=Math.max(SEA-3,Math.round(HF[i]));
}
// Etapa rios (só no modo reserva): polilinhas e mapas de leito/vale, uma vez por mundo, guardados em P.rivers e WORLD.rivers.
function reliefRivers(P,preH,coast){
  if(P.drawn&&!P.rivers){P.rivers=genRivers(P,(x,z)=>coast(preH(x,z)));WORLD.rivers=P.rivers.paths}
}
// Etapa biomas: temperatura/umidade por percentil sobre o relevo já pronto (depois das reservas), rocha por altura e distância entre deserto e neve.
function reliefBiomes(P){
  if(P.win){reliefFieldBiomes(P);return}   // bioma do campo do mundo (mapwin.js)
  const {seed,dominant}=P;
  const nt=new Noise(seed+11),nm=new Noise(seed+23),nj=new Noise(seed+77);
  // biomas por percentil: garante variedade em qualquer semente
  const TT=new Float32Array(W*W),MM=new Float32Array(W*W),ts=[],ms=[];
  for(let z=0;z<W;z++)for(let x=0;x<W;x++){
    const i=z*W+x,j=(nj.v(x/5,z/5)-0.5)*0.07;
    TT[i]=nt.fbm(x/95+90,z/95+40,3)+j;MM[i]=nm.fbm(x/85-70,z/85+25,3)-j;
    if(H[i]>=SEA&&(x+z)%3===0){ts.push(TT[i]);ms.push(MM[i])}
  }
  ts.sort((a,b)=>a-b);ms.sort((a,b)=>a-b);
  // faixas de temperatura/umidade por bioma dominante. Deserto (quente) e neve (frio) ficam nas pontas opostas
  // da temperatura, sempre separados por uma faixa de planície/floresta.
  const q=(a,f)=>a[Math.min(a.length-1,Math.floor(a.length*f))];
  const CUT={plains:[0.08,0.92,0.85],forest:[0.08,0.92,0.34],mountain:[0.15,0.85,0.7],snow:[0.58,0.95,0.8],desert:[0.05,0.42,0.9]}[dominant];
  const tLo=q(ts,CUT[0]),tHi=q(ts,CUT[1]),mHi=q(ms,CUT[2]);
  // altura a partir da qual o relevo vira rocha; no modo montanhas ela desce para a rocha cobrir ~55% da terra
  let rockH=SEA+17;
  if(dominant==='mountain'){const hs=[];for(let i=0;i<W*W;i+=7)if(H[i]>=SEA)hs.push(H[i]);hs.sort((a,b)=>a-b);rockH=clamp(q(hs,0.45),SEA+8,SEA+17)}
  WORLD.rockH=rockH;
  for(let i=0;i<W*W;i++){
    const h=H[i];
    B[i]=h>=rockH?BIO_ROCK:TT[i]>tHi?BIO_DESERT:TT[i]<tLo?BIO_SNOW:MM[i]>mHi?BIO_FOREST:BIO_PLAINS;
  }
  // garante distância mínima entre deserto e neve: o bioma 'perdedor' (neve, ou deserto no modo neve) perto demais do outro vira planície
  { const GB=8,N=W/GB,dg=new Uint8Array(N*N),keep=new Uint8Array(N*N),win=dominant==='snow'?BIO_SNOW:BIO_DESERT,lose=dominant==='snow'?BIO_DESERT:BIO_SNOW;
    for(let i=0;i<W*W;i++)if(B[i]===win)dg[((i/W|0)>>3)*N+((i%W)>>3)]=1;
    const R=6;
    for(let bz=0;bz<N;bz++)for(let bx=0;bx<N;bx++)if(dg[bz*N+bx])for(let dz=-R;dz<=R;dz++)for(let dx=-R;dx<=R;dx++){const x=bx+dx,z=bz+dz;if(x>=0&&z>=0&&x<N&&z<N)keep[z*N+x]=1}
    for(let i=0;i<W*W;i++)if(B[i]===lose&&keep[((i/W|0)>>3)*N+((i%W)>>3)])B[i]=BIO_PLAINS;
  }
  if(WORLD.showcaseMode){for(let i=0;i<W*W;i++){H[i]=SEA+6;B[i]=BIO_PLAINS}}   // mapa manual dos POIs (?cenario=pois): toda a superfície apagada e plana
}
// Geração em etapas (cada uma recebe o contexto X criado por worldInit e pode ser chamada sozinha, na ordem abaixo; os testes em Node e a etapa 3 do plano
// do mapa mundi geram só o que precisam). opts.size = lado do mapa local em blocos (padrão: o W atual). X = {seed,rng,nd,RP,cities,cand,RES,MINC,edges}.
async function genWorld(seed,status,dominant,opts){
  const X=worldInit(seed,dominant,opts);
  await worldReliefStage(X,status);   // 1) relevo, rios e biomas
  await worldCitiesStage(X,status);   // 2) locais, reserva, facções e terreno das cidades
  await worldRoadsStage(X,status);    // 3) estradas e pontes
  await worldBuildStage(X,status);    // 4) litoral, tipos e prédios das cidades
  await worldNatureStage(X,status);   // 5) POIs, árvores, pedras e flores
  await worldMeshStage(X,status);     // 6) malha do terreno e minimapa
  return WORLD;
}
// Etapa 0: zera o mapa ativo, define o tamanho e aloca H/T/B/chunks. Devolve o contexto X.
function worldInit(seed,dominant,opts){
  if(opts&&opts.size)mapSetSize(opts.size);
  // bioma dominante: escolhido pelo jogador ou sorteado pela semente
  if(!DOM_NAMES[dominant])dominant=['plains','forest','mountain','snow','desert'][new RNG(seed+999).int(0,4)];
  const win=mapWindowPick(seed,dominant);   // janela do campo do mundo (null no jogo normal; js/mapwin.js): o mapa local passa a ser um pedaço do mundo
  if(win&&win.size!==W)mapSetSize(win.size);
  WORLD.win=win;WORLD.dominant=dominant;WORLD.seed=seed;WORLD.cities=[];WORLD.chunkMeshes=[];WORLD.windmills=[];WORLD.bt=new Map();WORLD.bridges=[];WORLD.poiPlan=null;WORLD.rivers=null;WORLD.dgSite=null;WORLD.noRail=new Set();WORLD.showcaseMode=new URLSearchParams(location.search).get('cenario')==='pois';
  Col.map.clear();Col.all.length=0;for(const a of CRITTERS)scene.remove(a.g);CRITTERS.length=0;
  const rng=new RNG(seed);
  const nz=new Noise(seed),nt=new Noise(seed+11),nm=new Noise(seed+23),nr=new Noise(seed+37),nd=new Noise(seed+51),nj=new Noise(seed+77);TNOISE=new Noise(seed+303);
  H=new Int16Array(W*W);T=new Uint8Array(W*W);B=new Uint8Array(W*W);
  TREEC.clear();CHUNKS.length=0;LEAVES.length=0;LZ.clear();for(let i=0;i<NCH*NCH;i++){CHUNKS.push(new BoxBatch());LEAVES.push(new BoxBatch())}
  const RES=reserveOn()&&!WORLD.showcaseMode&&!(win&&win.empty);   // RES: modo reserva (js/reserve.js)
  const X={seed,rng,nd,RES,MINC:win&&win.tile?1:6,cities:[],cand:[],edges:[],RP:null,win};   // tile do campo do mundo: uma cidade só
  mapSync();
  return X;
}
// Etapa 1: relevo, rios e biomas (função genRelief)
async function worldReliefStage(X,status){
  const {seed,rng}=X;
  const SHAPES=['Ilha irregular','Continente recortado','Anel com mar interno','Península com baía','Faixa de terra diagonal'];
  const shape=rng.int(0,4),sAng=rng.range(0,6.283),bayA=rng.range(0,6.283);   // forma do mapa varia por semente
  WORLD.shapeName=X.win?X.win.F.fmtName:SHAPES[shape];
  status('Esculpindo montanhas, rios e lagos...');await tick();
  const RP=X.RP={seed,dominant:WORLD.dominant,shape,sAng,bayA,drawn:reserveOn()&&!WORLD.showcaseMode&&RIVER.on&&!X.win,win:X.win};   // drawn: rios desenhados (fase 5)
  genRelief(RP,null);
}
// Etapa 2: locais das cidades, reserva (modo reserva), cidade inicial, facções, estilos e terreno sob cada cidade.
async function worldCitiesStage(X,status){
  const {seed,rng,RES,RP,cand}=X;
  // nº de cidades proporcional à terra do mapa (terra ÷ 48 mil, entre 6 e 8); ?cid=N força um número (estudo)
  let landN=0;for(let i=0;i<W*W;i+=9)if(H[i]>=SEA+1)landN++;
  const NC=tileTestOn()?2:(X.win&&X.win.tile)?1:Math.max(4,Math.min(16,+(new URLSearchParams(location.search).get('cid'))||Math.max(6,Math.min(8,Math.round(landN*9/48000)))));   // mapa de teste: duas cidades
  const inShow=(x,z)=>WORLD.showcaseMode&&Math.abs(x-W/2)<210&&Math.abs(z-W/2)<170;   // área reservada aos POIs do mapa manual: sem cidades
  // 2) Locais das cidades
  status('Escolhendo locais para as cidades...');await tick();
  // candidatos planos em terra; depois escolhe pontos o mais afastados possível entre si
  for(let relax=1;relax<=6&&cand.length<700;relax*=1.6){
    cand.length=0;
    for(let t=0,nT=Math.round(34000*(W/640)*(W/640));t<nT;t++){   // (mais tentativas num mapa maior)
      const x=rng.int(76,W-76),z=rng.int(76,W-76);
      let mn=99,mx=-99,wet=0;
      for(let dz=-40;dz<=40;dz+=8)for(let dx=-40;dx<=40;dx+=8){const h=H[(z+dz)*W+x+dx];if(h<SEA+1){wet++;continue}if(h<mn)mn=h;if(h>mx)mx=h}
      const ok=wet<=10&&H[z*W+x]>=SEA+1;
      if(ok&&!inShow(x,z)&&mx-mn<=28*relax)cand.push({x,z,b:B[z*W+x],rough:mx-mn});
    }
  }
  // O número de cidades depende da área útil: uma cidade tem até 90 blocos de lado, mais a faixa de terreno aplainado em volta. Se a terra (ilha pequena, faixa
  // estreita, deserto recortado) não comporta 7 cidades afastadas, o mundo ganha MENOS cidades em vez de cidades coladas (a construção e o aplainamento se atropelavam).
  const sites=[],MIND=220,MINC=X.MINC;   // MIND: distância mínima entre os centros; só desce (de 10 em 10, até 64) se não couberem ao menos MINC cidades
  if(tileTestOn())for(const k of[TILE_TEST.home,TILE_TEST.big])sites.push({x:k.x,z:k.z,b:B[k.z*W+k.x]});   // mapa de teste: a sua cidade (pequena, num canto) e a da outra facção (grande)
  else if(X.win&&X.win.tile){const k=mapTileSite(cand);if(k)sites.push(k)}   // tile do campo do mundo: a cidade no centro da janela (js/mapwin.js)
  else if(cand.length)sites.push(cand[rng.int(0,cand.length-1)]);
  const wRng=new RNG((seed*71+5)>>>0);if(RES)reserveWaterDist(cand);   // distância de cada candidato até a água do rascunho (fase 4)
  const pickSites=floorD=>{
    while(sites.length<NC&&cand.length){
      const ww=RES&&wRng.chance(RESERVE.waterBias);   // esta cidade prefere margem de água? (sorteio por semente, js/reserve.js)
      let bestC=null,bs=-1e9,bmd=0;
      for(const c of cand){
        let md=1e9;for(const s of sites){const d=Math.hypot(s.x-c.x,s.z-c.z);if(d<md)md=d}
        const same=sites.filter(s=>s.b===c.b).length;
        const sc=md-(same>=3?10:0)-c.rough*(RES?RESERVE.roughPenalty:0.35)+rng.range(0,3)+(ww?reserveWaterScore(c):0);
        if(sc>bs){bs=sc;bestC=c;bmd=md}
      }
      if(bmd<floorD)break;   // o melhor lugar que sobrou já é perto demais: não cabe mais cidade
      if(ww)bestC=Object.assign({},bestC,{ww:true});
      sites.push(bestC);
    }
    // último recurso (poucos candidatos): sempre em terra firme, afastado das outras; relaxa a distância até o piso se não achar
    for(let tries=0,minD=Math.max(floorD,120);sites.length<NC&&tries<20000;tries++){
      if(tries&&tries%2000===0)minD=Math.max(floorD,minD-12);
      const x=rng.int(76,W-76),z=rng.int(76,W-76);
      if(H[z*W+x]>=SEA+1&&!inShow(x,z)&&sites.every(s=>Math.hypot(s.x-x,s.z-z)>minD))sites.push({x,z,b:B[z*W+x]});
    }
  };
  if(!tileTestOn()){pickSites(MIND);
    for(let fl=MIND-10;sites.length<MINC&&fl>=64;fl-=10)pickSites(fl)}
  const used=new Set();
  const cities=sites.map((s,i)=>{
    const bio=B[s.z*W+s.x];
    return{id:i,wantWater:!!s.ww,cx:s.x,cz:s.z,half:tileTestOn()?(i===0?TILE_TEST.home.half:TILE_TEST.big.half):rng.int(36,45),biome:bio,owner:'enemy',state:'idle',home:false,rank:0,
      enemies:[],npcs:[],walk:[],spawns:[],towers:[],gates:[],flags:[],props:[],aliveEnemies:0,totalEnemies:0};
  });
  if(RES){   // reserva: verifica no rascunho, depois gera o terreno final em volta das pegadas (passada 2)
    status('Reservando o chão das cidades...');await tick();
    const t0=performance.now();
    reserveCities(cities,cand,seed,MINC);cities.forEach((c,i)=>c.id=i);
    for(const c of cities)reserveMountains(c,seed);
    genRelief(RP,cities);
    for(const c of cities)if(c.foot)c.biome=B[c.cz*W+c.cx];
    WORLD.reserve.ms=Math.round(performance.now()-t0);console.log('reserva:',JSON.stringify(WORLD.reserve));
  }
  // cidade inicial: a mais próxima do centro do mapa
  const home=tileTestOn()?cities[0]:cities[rng.int(0,cities.length-1)];home.home=true;home.owner='player';home.state='conquered';WORLD.home=home;   // (mapa de teste: a cidade pequena do canto é a sua)
  const others=cities.filter(c=>c!==home).sort((a,b)=>Math.hypot(a.cx-home.cx,a.cz-home.cz)-Math.hypot(b.cx-home.cx,b.cz-home.cz));
  others.forEach((c,i)=>c.rank=i+1);
  for(const c of cities){c.name=cityName(rng,c.biome,used)}
  WORLD.cities=cities;genFactions();   // facções NPC e dono de cada cidade (js/factions.js)
  // Regras por nível (rank): tier A = ordenada, B = mista, C = caótica
  //  1-2: sem muralha, caótica (10% mista) | 3-4: cerca, entre caótica e mista (mais mista no 4)
  //  5: muralha, qualquer tier (chances iguais) | 6: muralha, ordenada
  // a cidade inicial é 'cidade' de estilo misto (ruas largas o bastante para o início do jogo)
  for(const c of cities){
    const r=c.rank;
    c.type=r>=5?'fortaleza':'cidade';
    if(c.home)c.style='mista';
    else if(r<=2)c.style=rng.chance(0.1)?'mista':'caotica';
    else if(r===3)c.style=rng.chance(0.3)?'mista':'caotica';
    else if(r===4)c.style=rng.chance(0.7)?'mista':'caotica';
    else if(r===5)c.style=rng.pick(['caotica','mista','ordenada']);
    else c.style='ordenada';
  }
  // aplaina o terreno sob cada cidade
  for(const c of cities){
    if(RES||(X.win&&X.win.empty))continue;   // tile vazio (4A): sem cidade para aplainar; modo reserva: o terreno final já tem o chão de todas as cidades (genRelief)
    if(cityFootPlan(c,seed)||cityFootRelocate(c,cities,cand,seed)){cityFootFlatten(c);continue}   // a cidade se adapta ao terreno (cityfoot.js); sem chão: troca de lugar; sem alternativa: quadrado antigo
    citySquareFlatten(c);
  }

  X.cities=cities;
}
// Etapa 3: estradas ligando as cidades (e pontes; no modo reserva o terreno final nasce com os corredores).
async function worldRoadsStage(X,status){
  const {seed,RES,RP,cities}=X;
  if(X.win&&X.win.empty)return;   // tile vazio (4A): sem estradas entre cidades
  for(const c of cities)cityFootGates(c);   // onde a pegada de cada cidade termina em cada eixo (portões e pontas de estrada)
  // 3) Estradas ligando as cidades (MST + atalhos)
  status('Traçando estradas e pontes...');await tick();
  const edges=X.edges=roadEdges(cities);
  WORLD.links=edges.map(e=>[e[0],e[1]]);
  if(RES){   // reserva (js/reserve.js): rotas e pontes sobre o terreno já aplainado, corredor reservado, terreno final em volta
    const t1=performance.now(),plan=reservePlanRoads(cities,edges);await tick();
    WORLD.poiPlan=reservePois(cities,plan);   // POIs grandes: lugares no rascunho, plataforma no terreno final (fase 3)
    genRelief(RP,cities,plan,WORLD.poiPlan);for(const c of cities)cityFootGates(c);
    reservePaintRoads(plan);WORLD.reserve.msRoads=Math.round(performance.now()-t1);
  }else for(const e of edges){carveRoad(cities[e[0]],cities[e[1]],cities);await tick()}
}
// Etapa 4: litoral (quem pode ser porto), tipo de cada cidade e construção dos prédios.
async function worldBuildStage(X,status){
  const {seed,cities}=X;
  // litoral: conta água nas redondezas de cada cidade (anel de 4 a 45 blocos além da muralha). É o que decide quem pode ser o porto.
  for(const c of cities){
    let wet=0;
    for(let dz=-(c.half+45);dz<=c.half+45;dz+=3)for(let dx=-(c.half+45);dx<=c.half+45;dx+=3){
      if(Math.max(Math.abs(dx),Math.abs(dz))<c.half+4)continue;
      const x=c.cx+dx,z=c.cz+dz;if(x>=0&&z>=0&&x<W&&z<W&&H[z*W+x]<SEA)wet++;
    }
    c.coast=wet;c.coastal=wet>=12;
  }

  WORLD.ctype=cityTypePlan(cities,seed,{});   // tipo (economia) de cada cidade, decidido já aqui: a cidade ganha o edifício do tipo (city.js)
  // 4) Cidades
  if(X.win&&X.win.empty){for(const c of cities)Object.assign(c,{half:1,S:1,P:1,gateSpots:[],keepers:[]});return}   // tile vazio (4A): a cidade-âncora (o jogo exige uma) fica sem prédios
  for(const c of cities){
    status('Construindo '+c.name+'...');await tick();
    buildCity(c,new RNG(seed*31+c.id*977+5));
  }

}
// Etapa 5: natureza e POIs (guarda a cópia do terreno em WORLD.snap antes dos POIs mexerem no chão).
async function worldNatureStage(X,status){
  const {rng,nd,cities}=X;
  status('Escondendo baús, grutas e acampamentos...');await tick();
  if(X.win){tileTrailLinks(cities);tileBorderPlan()}   // janela do campo do mundo: estrada das trilhas até as aberturas e plano da borda de árvores (mapwin.js)
  WORLD.snap={H:H.slice(),T:T.slice(),B:B.slice()};
  if(X.win&&X.win.empty){WORLD.camps=[];WORLD.caves=[];WORLD.chests=[];WORLD.packs=[];WORLD.pois=[];WORLD.areas=cities.slice();FIRES.length=0}   // tile vazio (4A): sem POIs (a 4E os põe)
  else genPOIs(rng,cities);
  status('Plantando árvores, pedras e flores...');await tick();
  genDecor(rng,nd,cities);
  if(X.win)tileBorderBuild();   // árvores densas e parede de colisão na borda, menos nas aberturas (mapwin.js)
}
// Etapa 6: malha do terreno e minimapa; fecha o mapa ativo (mapSync guarda H/T/B/tamanho em MAP).
async function worldMeshStage(X,status){
  status('Montando blocos...');await tick();
  meshTerrain();
  makeMapCanvas();
  mapSync();
}

// Quais cidades se ligam por estrada: árvore geradora mínima, até 2 atalhos curtos e a garantia de que o grafo é conexo.
function roadEdges(cities){
  const edges=[],inT=new Set([0]);
  while(inT.size<cities.length){
    let best=null,bd=1e9;
    for(const a of inT)for(let j=0;j<cities.length;j++){if(inT.has(j))continue;
      const d=Math.hypot(cities[a].cx-cities[j].cx,cities[a].cz-cities[j].cz);if(d<bd){bd=d;best=[a,j]}}
    edges.push(best);inT.add(best[1]);
  }
  const extra=[];
  for(let i=0;i<cities.length;i++)for(let j=i+1;j<cities.length;j++){
    if(edges.some(e=>(e[0]===i&&e[1]===j)||(e[0]===j&&e[1]===i)))continue;
    extra.push([i,j,Math.hypot(cities[i].cx-cities[j].cx,cities[i].cz-cities[j].cz)]);
  }
  extra.sort((a,b)=>a[2]-b[2]);
  for(let k=0;k<2&&k<extra.length;k++)if(extra[k][2]<150)edges.push([extra[k][0],extra[k][1]]);
  // garantia (Fase 4H): todas as cidades precisam estar ligadas por estrada/ponte. A árvore geradora acima já cobre isso;
  // se alguma sobrar isolada (ex.: poucas cidades no mapa), liga o par mais próximo entre os grupos.
  {
    const par=cities.map((_,i)=>i),find=i=>{while(par[i]!==i){par[i]=par[par[i]];i=par[i]}return i};
    for(const e of edges)par[find(e[0])]=find(e[1]);
    for(;;){
      let best=null,bd=1e9;
      for(let i=0;i<cities.length;i++)for(let j=i+1;j<cities.length;j++){
        if(find(i)===find(j))continue;const d=Math.hypot(cities[i].cx-cities[j].cx,cities[i].cz-cities[j].cz);if(d<bd){bd=d;best=[i,j]}}
      if(!best)break;edges.push(best);par[find(best[0])]=find(best[1]);
    }
  }
  return edges;
}
// Traça a rota de estrada entre duas cidades (portões escolhidos aqui, A* na grade de 4 blocos) e devolve os blocos em linha reta entre os pontos.
// opts.water: custo extra por célula de água; opts.dirA: força o portão da cidade a; opts.pinEnds (carveRoad): pontas e cruzamentos ficam na altura do chão atual; opts.noBridge (carveRoad): desiste se o trajeto precisar de ponte; opts.isRoad(k): célula que já é estrada (custo menor). Não pinta nada.
function roadTiles(a,b,cities,opts){
  const C=4,N=W/C,wc0=(opts&&opts.water!==undefined)?opts.water:ROAD_WATER,isRoad=(opts&&opts.isRoad)||(k=>T[k]===T_ROAD);
  const gate=(c,o)=>{const dx=o.cx-c.cx,dz=o.cz-c.cz;
    // o portão é o eixo que mais aponta para a outra cidade e tem terra do lado de fora (c.gland, cityfoot.js)
    const pref=[['E',dx],['W',-dx],['S',dz],['N',-dz]].sort((p,q)=>q[1]-p[1]);
    const d=(opts&&opts.dirA&&c===a)?opts.dirA:(pref.find(p=>!c.gland||c.gland[p[0]])||pref[0])[0];c.gates.push({dir:d});
    const [x,z]=cityGatePos(c,d,3);return{x,z}};   // 3 blocos além da borda da pegada
  const ga=gate(a,b),gb=gate(b,a);
  const cityPen=(x,z)=>{let p=0;for(const c of cities){const d=Math.max(Math.abs(x-c.cx),Math.abs(z-c.cz));
    if(c===a||c===b){if(cityNear(c,x,z,2))p+=30}else if(cityNear(c,x,z,9))p+=30}return p};
  const s=((ga.z/C)|0)*N+((ga.x/C)|0),goal=((gb.z/C)|0)*N+((gb.x/C)|0),gx=goal%N,gz=(goal/N)|0;
  const eh=v=>Math.max(v,SEA+1);   // a água conta como altura de ponte: o fundo do lago não vira "ribanceira" no custo
  // A* na grade de 4 blocos; wc = custo extra por célula de água
  const route=wc=>{
    const g=new Float32Array(N*N).fill(1e9),came=new Int32Array(N*N).fill(-1),closed=new Uint8Array(N*N);
    const hp=new Heap();g[s]=0;hp.push(0,s);
    while(hp.size){
      const u=hp.pop()[1];if(closed[u])continue;closed[u]=1;if(u===goal)break;
      const ux=u%N,uz=(u/N)|0;
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dz)continue;const vx=ux+dx,vz=uz+dz;if(vx<1||vz<1||vx>=N-1||vz>=N-1)continue;
        const v=vz*N+vx;if(closed[v])continue;
        const hx=vx*C+2,hz=vz*C+2,hv=H[hz*W+hx],hu=H[(uz*C+2)*W+ux*C+2];
        let cost=(dx&&dz?1.414:1)*C;const dh=Math.abs(eh(hv)-eh(hu));
        cost*=1+dh*dh*0.9+(hv<SEA?wc:0)+cityPen(hx,hz);
        if(isRoad(hz*W+hx))cost*=0.35;
        const ng=g[u]+cost;
        if(ng<g[v]){g[v]=ng;came[v]=u;hp.push(ng+Math.hypot(gx-vx,gz-vz)*C*0.35,v)}
      }
    }
    const cl=[];for(let u=goal;u!==-1&&u!==undefined;u=came[u])cl.push(u);return cl.reverse();
  };
  // maior trecho de água seguida (em blocos) de um trajeto de células
  const maxWet=cl=>{let m=0,r=0;for(const u of cl){if(H[(((u/N)|0)*C+2)*W+(u%N)*C+2]<SEA){r++;if(r>m)m=r}else r=0}return m*C};
  let cells=route(wc0);
  if(wc0<ROAD_WATER_OLD&&maxWet(cells)>ROAD_SPAN_MAX)cells=route(ROAD_WATER_OLD);   // vão grande demais: volta ao custo antigo (contorna se der)
  const pts=[ga];
  for(let k=1;k<cells.length-1;k++)pts.push({x:(cells[k]%N)*C+2,z:((cells[k]/N)|0)*C+2});
  pts.push(gb);
  const tiles=[];
  for(let k=0;k<pts.length-1;k++){
    let x0=Math.round(pts[k].x),z0=Math.round(pts[k].z);const x1=Math.round(pts[k+1].x),z1=Math.round(pts[k+1].z);
    const dx=Math.abs(x1-x0),dz=Math.abs(z1-z0),sx=x0<x1?1:-1,sz=z0<z1?1:-1;let err=dx-dz;
    for(;;){tiles.push({x:x0,z:z0});if(x0===x1&&z0===z1)break;const e2=2*err;if(e2>-dz){err-=dz;x0+=sx}if(e2<dx){err+=dx;z0+=sz}}
  }
  return tiles;
}
function carveRoad(a,b,cities,opts){
  const tiles=roadTiles(a,b,cities,opts);
  const n=tiles.length;
  const h0=tiles.map(t=>H[t.z*W+t.x]),bridge=h0.map(h=>h<SEA);
  // trechos curtos de água (até ROAD_FILL_MAX blocos seguidos) viram aterro de estrada comum, não ponte: sem o chão alternando entre estrada e ponte
  for(let i=0;i<n;){
    if(!bridge[i]){i++;continue}
    let e=i;while(e+1<n&&bridge[e+1])e++;
    if(e-i+1<=ROAD_FILL_MAX)for(let k=i;k<=e;k++)bridge[k]=false;
    i=e+1;
  }
  if(opts&&opts.noBridge&&bridge.some(Boolean))return false;   // (estradas de POI no modo reserva: sem ponte, a estrada simplesmente não é aberta)
  let hs=h0.map(h=>Math.max(h,SEA+1));
  for(let pass=0;pass<3;pass++){const nx=hs.slice();for(let i=0;i<n;i++){let s2=0,c2=0;for(let k=-5;k<=5;k++){const j=i+k;if(j>=0&&j<n){s2+=hs[j];c2++}}nx[i]=s2/c2}hs=nx}
  hs=hs.map(Math.round);
  for(let i=0;i<n;i++)if(bridge[i])hs[i]=Math.max(hs[i],SEA+1);
  // opts.pinEnds: as pontas e os tiles sobre estrada que já existe ficam na altura atual do chão (a estrada nova emenda sem degrau; sem isto a média
  // móvel puxava a ponta para outra altura e aparecia uma parede de 2 ou mais blocos no portão e no cruzamento)
  const pin=(opts&&opts.pinEnds)?tiles.map((t,i)=>i===0||i===n-1||T[t.z*W+t.x]===T_ROAD||T[t.z*W+t.x]===T_BRIDGE):null;
  if(pin)for(let i=0;i<n;i++)if(pin[i])hs[i]=Math.max(h0[i],SEA+1);
  for(let i=1;i<n;i++)if(!pin||!pin[i])hs[i]=clamp(hs[i],hs[i-1]-1,hs[i-1]+1);
  for(let i=n-2;i>=0;i--)if(!pin||!pin[i])hs[i]=clamp(hs[i],hs[i+1]-1,hs[i+1]+1);
  const BT=WORLD.bt;
  for(let i=0;i<n;i++){
    const h=hs[i],px=tiles[i].x,pz=tiles[i].z;
    for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
      const x=px+dx,z=pz+dz;if(x<1||z<1||x>=W-1||z>=W-1)continue;
      const d=Math.hypot(dx,dz),k=z*W+x;
      if(d<=(bridge[i]?BRIDGE_R:1.5)){if(T[k]!==T_ROAD&&T[k]!==T_BRIDGE){if(bridge[i])BT.set(k,{h0:H[k]});H[k]=h;T[k]=bridge[i]?T_BRIDGE:T_ROAD}}
      else if(d<=2.6&&T[k]===T_NAT&&!bridge[i]&&H[k]>=SEA)H[k]=clamp(H[k],h-1,h+1);   // (sobre a água não há barranco: o vão fica aberto)
    }
  }
  // fecha furos do tabuleiro: água com tabuleiro em 3 dos 4 lados (curvas da ponte deixam reentrâncias de 1 bloco)
  for(let i=0;i<n;i++){
    if(!bridge[i])continue;
    for(let dz=-4;dz<=4;dz++)for(let dx=-4;dx<=4;dx++){
      const x=tiles[i].x+dx,z=tiles[i].z+dz;if(x<2||z<2||x>=W-2||z>=W-2)continue;
      const k=z*W+x;if(T[k]===T_BRIDGE||H[k]>=SEA)continue;
      if((T[k-1]===T_BRIDGE)+(T[k+1]===T_BRIDGE)+(T[k-W]===T_BRIDGE)+(T[k+W]===T_BRIDGE)>=3){BT.set(k,{h0:H[k]});H[k]=hs[i];T[k]=T_BRIDGE}
    }
  }
  // pontes: cada trecho de água vira um registro (WORLD.bridges) e ganha cabeceira de BRIDGE_HEAD blocos de terra em cada ponta
  for(let i=0;i<n;i++){
    if(!bridge[i]||(i>0&&bridge[i-1]))continue;
    let e=i;while(e+1<n&&bridge[e+1])e++;
    const s0=Math.max(0,i-BRIDGE_HEAD),e0=Math.min(n-1,e+BRIDGE_HEAD);
    for(let j=s0;j<=e0;j++){if(bridge[j])continue;
      for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
        const x=tiles[j].x+dx,z=tiles[j].z+dz;if(x<1||z<1||x>=W-1||z>=W-1||Math.hypot(dx,dz)>BRIDGE_R)continue;
        const k=z*W+x;   // a cabeceira é tão larga quanto a ponte: pega também um pouco de terra ao lado da estrada
        if(T[k]===T_ROAD){BT.set(k,{h0:H[k]});T[k]=T_BRIDGE}else if(T[k]===T_NAT){BT.set(k,{h0:H[k]});H[k]=hs[j];T[k]=T_BRIDGE}
      }}
    WORLD.bridges.push({id:WORLD.bridges.length,tiles:tiles.slice(s0,e0+1).map(t=>({x:t.x,z:t.z})),len:e-i+1,
      wi:i-s0,we:e-s0,road:[a.id===undefined?-1:a.id,b.id===undefined?-1:b.id],toll:null});
    i=e;
  }
  return true;
}

// ---------- Natureza ----------
function nearCity(x,z,m,cities){for(const c of cities)if(cityNear(c,x,z,m))return true;return false}   // com pegada: perto = a até m blocos dela
function clearAround(x,z){for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(getT(x+dx,z+dz)!==T_NAT)return false;return true}
function leafCol(rng,base){return shadec(base,rng.range(0.85,1.12))}
// copa em blobs: cubos de tamanhos e posições irregulares, mais escuros embaixo e claros em cima
function canopy(rng,cx,cz,ty,base,n,spread,smin,smax,up){
  for(let k=0;k<n;k++){
    const a=rng.range(0,6.283),r=Math.sqrt(rng.next())*spread,ox=Math.cos(a)*r,oz=Math.sin(a)*r;
    const oy=rng.range(-0.9,up)*(1-r/(spread*1.6)),s=rng.range(smin,smax),sy=s*rng.range(0.7,0.95);
    const f=0.82+clamp((oy+0.9)/(up+0.9),0,1)*0.3;
    Bx(cx+ox-s/2,ty+oy-sy/2,cz+oz-s/2,cx+ox+s/2,ty+oy+sy/2,cz+oz+s/2,shadec(leafCol(rng,base),f),false,{j:0.1,b:true,lf:true});
  }
  leafZone(cx,cz,spread+smax*0.5,ty+up);
  // folhas soltas nas bordas
  for(let k=0;k<3;k++){const a=rng.range(0,6.283),r=spread*rng.range(0.9,1.3),s=rng.range(0.4,0.7);
    Bx(cx+Math.cos(a)*r-s/2,ty+rng.range(-1.3,0.3),cz+Math.sin(a)*r-s/2,cx+Math.cos(a)*r+s/2,ty+rng.range(-1.3,0.3)+s,cz+Math.sin(a)*r+s/2,leafCol(rng,base),false,{j:0.12,b:true,lf:true})}
}
function addTree(x,z,y,type,rng){
  TREEC.add(z*W+x);
  const cx=x+0.5,cz=z+0.5,jw=rng.range(-0.14,0.14);
  if(type==='oak'||type==='birch'){
    const bi=type==='birch',th=bi?rng.int(5,7):rng.int(4,6),tw=bi?0.3:0.4,tc=bi?0xd8d4c8:0x6b4a2a,lc=bi?(rng.chance(0.5)?0x93b83a:0xb5c845):(rng.chance(0.25)?0x3a7a24:0x2a6a24);
    Bx(cx-tw,y,cz-tw,cx+tw,y+th,cz+tw,tc,true,{j:0.05});
    if(!bi){   // base alargada, casca com listras e galho
      Bx(cx-0.55,y,cz-0.55,cx+0.55,y+0.7,cz+0.55,shadec(tc,0.85),false,{j:0.06});
      for(const s of[[1,0],[-1,0],[0,1],[0,-1]])if(rng.chance(0.6)){
        const q=rng.range(0.4,th*0.7),ex=cx+s[0]*0.43,ez=cz+s[1]*0.43,wx=s[0]?0.03:0.12,wz=s[1]?0.03:0.12;
        Bx(ex-wx,y+q,ez-wz,ex+wx,y+q+rng.range(0.8,1.6),ez+wz,shadec(tc,0.72),false,{j:0.04})}
      const bs=rng.chance(0.5)?1:-1;Bx(cx+(bs>0?0.35:-1.2),y+th-1.3,cz-0.2,cx+(bs>0?1.2:-0.35),y+th-0.8,cz+0.2,tc,false,{j:0.05});
    }else{
      for(let k=0;k<4;k++){const q=rng.range(0.5,th-0.6),sd=rng.pick([-1,1]);Bx(cx+(sd>0?0.3:-0.35),y+q,cz-0.12,cx+(sd>0?0.35:-0.3),y+q+0.25,cz+0.12,0x2a2a28,false,{j:0.02})}
    }
    const t=y+th+rng.range(0,0.1);
    canopy(rng,cx,cz,t+0.2,lc,bi?rng.int(6,8):rng.int(9,12),bi?1.3+jw:1.9+jw,bi?1.1:1.4,bi?1.7:2.2,bi?2:1.8);
  }else if(type==='bigoak'){
    const th=rng.int(7,10),t=y+th;
    Bx(cx-0.55,y,cz-0.55,cx+0.55,y+th,cz+0.55,0x5a3d22,true,{j:0.05});
    Bx(cx-0.8,y,cz-0.8,cx+0.8,y+0.9,cz+0.8,0x4a3320,false,{j:0.06});
    for(const s of[[1,0],[-1,0],[0,1],[0,-1]])if(rng.chance(0.7)){const q=rng.range(0.6,th*0.7),ex=cx+s[0]*0.58,ez=cz+s[1]*0.58,wx=s[0]?0.03:0.14,wz=s[1]?0.03:0.14;Bx(ex-wx,y+q,ez-wz,ex+wx,y+q+rng.range(1,2.2),ez+wz,0x3a2a1a,false,{j:0.04})}
    canopy(rng,cx,cz,t+0.3,rng.chance(0.3)?0x3a7a24:0x2f6a22,rng.int(14,17),2.7,1.7,2.7,2.6);
  }else if(type==='spruce'){
    const th=rng.int(5,8),lc=0x1f4a2e,t=y+th,snow=B[z*W+x]===BIO_SNOW;
    Bx(cx-0.35,y,cz-0.35,cx+0.35,y+th,cz+0.35,0x4a3320,true,{j:0.05});
    const n=rng.int(5,6);
    for(let k=0;k<n;k++){
      const w=2.5-k*0.38+jw,yy=y+1.2+k*((th+0.6)/n)*0.95;
      Bx(cx-w,yy,cz-w,cx+w,yy+0.8,cz+w,leafCol(rng,k%2?0x2a5a3a:lc),false,{j:0.08,b:true,lf:true});
      Bx(cx-w*0.68,yy+0.8,cz-w*0.68,cx+w*0.68,yy+1.4,cz+w*0.68,leafCol(rng,lc),false,{j:0.08,lf:true});
      if(snow)Bx(cx-w*0.95,yy+0.8,cz-w*0.95,cx+w*0.95,yy+0.95,cz+w*0.95,0xf4f8fb,false,{j:0.03,lf:true});
    }
    Bx(cx-0.3,t+0.6,cz-0.3,cx+0.3,t+2.0,cz+0.3,0x1f4a2e,false,{b:true,lf:true});
    leafZone(cx,cz,2.4,t+2);
  }else if(type==='cactus'){
    const th=rng.int(2,4),g=0x3f8a3a,g2=0x2f7030;
    Bx(cx-0.4,y,cz-0.4,cx+0.4,y+th,cz+0.4,g,true,{j:0.08});
    for(const s of[[0.4,0],[-0.4,0],[0,0.4],[0,-0.4]])Bx(cx+s[0]*1.0-(s[0]?0.03:0.12),y+0.2,cz+s[1]*1.0-(s[1]?0.03:0.12),cx+s[0]*1.0+(s[0]?0.03:0.12),y+th-0.1,cz+s[1]*1.0+(s[1]?0.03:0.12),g2,false,{j:0.02});
    if(th>2&&rng.chance(0.7)){Bx(cx+0.4,y+1.2,cz-0.25,cx+1.2,y+1.9,cz+0.25,g,false);Bx(cx+0.9,y+1.9,cz-0.25,cx+1.3,y+2.8,cz+0.25,g,false)}
    if(th>2&&rng.chance(0.5)){Bx(cx-1.2,y+0.9,cz-0.25,cx-0.4,y+1.5,cz+0.25,g,false);Bx(cx-1.2,y+1.5,cz-0.25,cx-0.8,y+2.3,cz+0.25,g,false)}
    if(rng.chance(0.4))Bx(cx-0.18,y+th,cz-0.18,cx+0.18,y+th+0.3,cz+0.18,rng.pick([0xf06aa0,0xf2d13d]),false,{j:0});
  }
}
// pedras: aglomerado de blocos, com musgo/neve no topo
function addRock(x,z,y,rng,snow,biome){
  const cx=x+0.5+rng.range(-0.3,0.3),cz=z+0.5+rng.range(-0.3,0.3);
  const pal=biome===BIO_DESERT?[0xb89a68,0xa88a58,0xc8aa78]:[0x8a8a8a,0x7a7a7a,0x9a9890,0x6f6f6f];
  const w=rng.range(0.9,1.7),d=rng.range(0.9,1.7),h=rng.range(0.7,1.5),c=shadec(rng.pick(pal),rng.range(0.9,1.1));
  Bx(cx-w/2,y,cz-d/2,cx+w/2,y+h,cz+d/2,c,true,{j:0.1});
  Bx(cx-w/2-0.06,y,cz-d/2-0.06,cx+w/2+0.06,y+0.35,cz+d/2+0.06,shadec(c,0.88),false,{j:0.06});   // base mais larga
  if(rng.chance(0.55)){const w2=w*0.55,d2=d*0.55,h2=rng.range(0.4,0.9),ox=rng.range(-0.2,0.2);Bx(cx-w2/2+ox,y+h,cz-d2/2,cx+w2/2+ox,y+h+h2,cz+d2/2,shadec(c,1.07),true,{j:0.1})}
  if(rng.chance(0.6)){const s=rng.range(0.45,0.8),sh=s*rng.range(0.5,0.9),a=rng.range(0,6.283);
    Bx(cx+Math.cos(a)*(w/2+s*0.2)-s/2,y,cz+Math.sin(a)*(d/2+s*0.2)-s/2,cx+Math.cos(a)*(w/2+s*0.2)+s/2,y+sh,cz+Math.sin(a)*(d/2+s*0.2)+s/2,shadec(c,rng.range(0.9,1.1)),true,{j:0.1})}
  if(snow)Bx(cx-w/2,y+h,cz-d/2,cx+w/2,y+h+0.15,cz+d/2,0xf4f8fb,false);
  else if(biome!==BIO_DESERT&&biome!==BIO_ROCK&&rng.chance(0.5))Bx(cx-w/2+0.1,y+h,cz-d/2+0.1,cx+w/2-0.3,y+h+0.1,cz+d/2-0.2,0x4a8a2e,false,{j:0.1});   // musgo
}
function addBush(x,z,y,rng,col){
  const n=rng.int(2,3);
  for(let k=0;k<n;k++){const s=rng.range(0.55,0.95),ox=rng.range(0,0.5),oz=rng.range(0,0.5),sy=s*rng.range(0.6,0.9);
    Bx(x+0.1+ox,y,z+0.1+oz,x+0.1+ox+s,y+sy,z+0.1+oz+s,leafCol(rng,col),false,{j:0.1,b:true})}
  if(rng.chance(0.25)){const a=rng.pick([0xd8344a,0x8a3ad0,0xe8a020]);Bx(x+0.3,y+0.6,z+0.2,x+0.42,y+0.72,z+0.32,a,false,{j:0});Bx(x+0.7,y+0.4,z+0.6,x+0.82,y+0.52,z+0.72,a,false,{j:0})}
}
function addGrass(x,z,y,rng,col){   // tufo: 3 lâminas finas de alturas diferentes
  for(let k=0;k<3;k++){const ox=rng.range(0.1,0.8),oz=rng.range(0.1,0.8),hh=rng.range(0.3,0.75);
    Bx(x+ox,y,z+oz,x+ox+0.09,y+hh,z+oz+0.09,leafCol(rng,col),false,{j:0.12})}
}
function addFlower(x,z,y,rng){
  const fc=rng.pick([0xe8454f,0xf2d13d,0xffffff,0xb06ae0,0xff8fb0]),ox=rng.range(0.2,0.6),oz=rng.range(0.2,0.6),hh=rng.range(0.4,0.7);
  Bx(x+ox,y,z+oz,x+ox+0.09,y+hh,z+oz+0.09,0x3f8a2a,false);
  Bx(x+ox-0.09,y+hh,z+oz-0.09,x+ox+0.18,y+hh+0.14,z+oz+0.18,fc,false,{j:0});
  Bx(x+ox-0.01,y+hh+0.14,z+oz-0.01,x+ox+0.1,y+hh+0.22,z+oz+0.1,0xf2c030,false,{j:0});
  if(rng.chance(0.5))Bx(x+ox+0.09,y+0.12,z+oz,x+ox+0.3,y+0.2,z+oz+0.09,0x3f8a2a,false);
}
function addFern(x,z,y,rng){
  for(let k=0;k<5;k++){const a=k*1.26+rng.range(-0.3,0.3),dx=Math.cos(a),dz=Math.sin(a),cx=x+0.5,cz=z+0.5,col=leafCol(rng,0x3a8a30);
    Bx(cx+dx*0.15-0.05,y,cz+dz*0.15-0.05,cx+dx*0.15+0.05,y+0.35,cz+dz*0.15+0.05,col,false,{j:0.08});
    Bx(cx+dx*0.4-0.05,y+0.3,cz+dz*0.4-0.05,cx+dx*0.4+0.05,y+0.5,cz+dz*0.4+0.05,col,false,{j:0.08});
    Bx(cx+dx*0.65-0.05,y+0.2,cz+dz*0.65-0.05,cx+dx*0.65+0.05,y+0.38,cz+dz*0.65+0.05,col,false,{j:0.08})}
}
function addPebbles(x,z,y,rng,col){for(let k=0;k<rng.int(2,4);k++){const ox=rng.range(0,0.8),oz=rng.range(0,0.8),s=rng.range(0.12,0.25);Bx(x+ox,y,z+oz,x+ox+s,y+s*0.7,z+oz+s,shadec(col,rng.range(0.85,1.1)),false,{j:0.05})}}
function addMushroom(x,z,y,rng){const ox=rng.range(0.2,0.6),oz=rng.range(0.2,0.6);Bx(x+ox,y,z+oz,x+ox+0.1,y+0.22,z+oz+0.1,0xeeeadc,false,{j:0});Bx(x+ox-0.08,y+0.22,z+oz-0.08,x+ox+0.18,y+0.32,z+oz+0.18,rng.chance(0.5)?0xd8344a:0xb07a3a,false,{j:0})}
function addLog(x,z,y,rng){const al=rng.chance(0.5),L=rng.range(1.6,2.6);
  if(al)Bx(x+0.2,y,z+0.4,x+0.2+L,y+0.5,z+0.9,0x5a3d22,true,{j:0.06});else Bx(x+0.4,y,z+0.2,x+0.9,y+0.5,z+0.2+L,0x5a3d22,true,{j:0.06});
  if(al)Bx(x+0.2+L,y+0.04,z+0.44,x+0.26+L,y+0.46,z+0.86,0xb08a58,false,{j:0.02});else Bx(x+0.44,y+0.04,z+0.2+L,x+0.86,y+0.46,z+0.26+L,0xb08a58,false,{j:0.02})}
function genDecor(rng,dn,cities){
  if(WORLD.showcaseMode)return;   // mapa manual: sem árvores, pedras nem plantas
  const dens=new Noise(WORLD.seed+91);
  for(let z=3;z<W-3;z+=2)for(let x=3;x<W-3;x+=2){
    const px=x+rng.int(0,1),pz=z+rng.int(0,1),i=pz*W+px;
    if(T[i]!==T_NAT)continue;const h=H[i];if(h<SEA+1)continue;
    if(WORLD.win&&WORLD.win.band&&WORLD.win.band[i])continue;   // faixa da borda: quem planta é tileBorderBuild
    if(nearCity(px,pz,4,cities))continue;
    if(WORLD.camps.some(k=>Math.hypot(px-k.cx,pz-k.cz)<13.5))continue;   // acampamentos ficam sem árvores, pedras e plantas ao redor
    if(WORLD.pois&&WORLD.pois.some(k=>Math.hypot(px-k.cx,pz-k.cz)<POI_DEFS[k.type].r+5))continue;   // POIs também (a margem deixa as copas das árvores de fora)
    if(wfReserved().some(k=>Math.hypot(px-k.x,pz-k.z)<POI_DEFS.fortcamp.r+5))continue;   // e os terrenos de guerra e dormentes reservados (warfront.js)
    if(!clearAround(px,pz))continue;
    const b=B[i],cl=dens.fbm(px/22,pz/22,2);
    let r=rng.next();
    if(b===BIO_FOREST){
      const p=clamp((cl-0.3)*1.2,0.08,0.75)*0.62*(WORLD.dominant==='forest'?1.3:1);
      if(r<p)addTree(px,pz,h,rng.pick(['oak','oak','oak','birch','spruce','bigoak']),rng);
      else if(r<p+0.03)addRock(px,pz,h,rng,false,b);
      else if(r<p+0.1)addBush(px,pz,h,rng,0x25601f);
      else if(r<p+0.112)addLog(px,pz,h,rng);
      else if(r<p+0.125)addMushroom(px,pz,h,rng);
      else if(rng.chance(0.18))addGrass(px,pz,h,rng,0x3f8a2a);
      else if(rng.chance(0.22))addFern(px,pz,h,rng);
    }else if(b===BIO_PLAINS){
      const p=cl>0.58?0.2:0.012;
      if(r<p)addTree(px,pz,h,'oak',rng);
      else if(r<p+0.012)addRock(px,pz,h,rng,false,b);
      else if(r<p+0.03)addBush(px,pz,h,rng,0x3f8a2a);
      else if(rng.chance(0.4))addGrass(px,pz,h,rng,0x4f9a30);
      if(rng.chance(0.08))addFlower(px,pz,h,rng);
    }else if(b===BIO_SNOW){
      const p=cl>0.5?0.22:0.035;
      if(r<p)addTree(px,pz,h,'spruce',rng);
      else if(r<p+0.025)addRock(px,pz,h,rng,true,b);
      else if(r<p+0.04)addPebbles(px,pz,h,rng,0x8a8a8a);
    }else if(b===BIO_DESERT){
      if(r<0.016)addTree(px,pz,h,'cactus',rng);
      else if(r<0.03)addRock(px,pz,h,rng,false,b);
      else if(r<0.05)addPebbles(px,pz,h,rng,0xb89a68);
      else if(rng.chance(0.03))Bx(px+0.2,h,pz+0.2,px+0.8,h+0.4,pz+0.8,0x8a6a3a,false);
    }else{
      if(r<0.1)addRock(px,pz,h,rng,h>SEA+24,b);
      else if(r<0.13&&h<SEA+24)addTree(px,pz,h,'spruce',rng);
    }
  }
}

// ---------- Malha do terreno ----------
function natCol(h,b){
  if(h<SEA)return h>=SEA-1?0xcdbf8a:0x8d8a7e;
  if(h<=SEA+1&&b!==BIO_SNOW)return 0xdccf96;
  if(b===BIO_FOREST)return 0x468f30;
  if(b===BIO_DESERT)return 0xe0cf90;
  if(b===BIO_SNOW)return 0xf3f7fb;
  if(b===BIO_ROCK)return h>SEA+26?0xf0f4f8:0x8c8c8c;
  return 0x68b043;
}
// variação natural do terreno: manchas de duas tonalidades por bioma, ondulações na areia e pontinhos
const NAT_ALT={[BIO_PLAINS]:[0x5ea63c,0x7cc050],[BIO_FOREST]:[0x3f8a2c,0x5aa23a],[BIO_DESERT]:[0xd6c27c,0xeadba0],[BIO_SNOW]:[0xe2edf7,0xffffff],[BIO_ROCK]:[0x7c7c82,0x9a9a92]};
let TNOISE=null;
function natVar(x,z,h,b,r){
  const c0=natCol(h,b);
  if(!TNOISE||h<=SEA+1||(b===BIO_ROCK&&h>SEA+26))return c0;
  const alt=NAT_ALT[b];if(!alt)return c0;
  const pn=TNOISE.fbm(x/7,z/7,2),pm=TNOISE.fbm(x/23+40,z/23-17,2);
  let c=mixc(c0,alt[pn>0.5?1:0],Math.min(1,Math.abs(pn-0.5)*3.2));
  if(b===BIO_DESERT)c=shadec(c,1+0.045*Math.sin((x*0.8+z*0.5)*0.9+pm*9));
  else c=shadec(c,0.94+pm*0.12);
  if(r>0.93)c=shadec(c,r>0.97?1.1:0.9);
  return c;
}
function mixc(a,b,t){const ar=a>>16&255,ag=a>>8&255,ab=a&255;return((ar+((b>>16&255)-ar)*t)<<16)|((ag+((b>>8&255)-ag)*t)<<8)|(ab+((b&255)-ab)*t)|0}
function tileColor(x,z,i){
  const h=H[i],t=T[i],b=B[i],r=hash2(x,z,7),v=0.93+r*0.14;
  let c;
  switch(t){
    case T_ROAD:c=((x*5+z*3)%4===0)?0x8c6f48:0x9b7d52;break;
    case T_STREET:c=((x*7+z*13)%3===0)?0x777777:0x8f8f8f;break;
    case T_PLAZA:c=((x+z)&1)?0xb99f7a:0xa88e6a;break;
    case T_FLOOR:c=(x&1)?0xa07a48:0x946f3f;break;
    case T_BRIDGE:c=(z&1)?0x7b5a33:0x6d4f2c;break;
    case T_GARDEN:c=r>0.88?(b===BIO_SNOW?0x6a9ad8:0xe8454f):r>0.8?(b===BIO_DESERT?0xc87a3a:0xf2d13d):shadec(natCol(h,b),0.9);break;
    case T_SOIL:c=0x5a3b22;break;
    case T_WHEAT:c=(x+z)%2?0xd8b64a:0xcfa93c;break;
    case T_CAVE:c=0x55555a;break;
    case T_WILD:c=shadec(natCol(h,b),WILD_SHADE);break;   // chão de acampamento e baú escondido: levemente mais escuro (modifiers/city-modifiers.js)
    default:c=natVar(x,z,h,b,r);
  }
  return shadec(c,v);
}function subColor(x,z,i){
  const t=T[i],b=B[i],r=hash2(x,z,3),v=0.9+r*0.2;
  let c;
  if(t===T_STREET||t===T_PLAZA||t===T_FLOOR||t===T_CAVE)c=0x777777;
  else if(t===T_ROAD)c=0x7a6240;   // lados da estrada: terra batida, na cor do caminho (antes pegava a cor do bioma, ex.: amarelo no deserto)
  else if(t===T_BRIDGE)c=0x7d7d84;   // lado da cabeceira (a ponte em terra): pedra
  else if(b===BIO_DESERT)c=0xc9b777;
  else if(b===BIO_ROCK)c=0x777777;
  else c=0x7a5636;
  return shadec(c,v);
}
// ---------- Pontes (visual): a física continua na coluna de terra (H); aqui só se desenha o tabuleiro, o corrimão e os pilares ----------
const BR_DIRS=[[1,0,0],[-1,0,1],[0,1,4],[0,-1,5]];
// corrimão fino nas bordas do tabuleiro (onde o vizinho não é ponte nem estrada); a boca da ponte fica aberta
function bridgeRails(bt,x,z,i,h){
  const G=WORLD.bt;
  for(const d of BR_DIRS){
    const nx=x+d[0],nz=z+d[1];if(nx<0||nz<0||nx>=W||nz>=W)continue;
    const ni=nz*W+nx,t=T[ni];if(WORLD.noRail.has(i)||G.has(ni)||t===T_ROAD||t===T_STREET||t===T_PLAZA||t===T_FLOOR)continue;
    const X=d[0]?[d[0]>0?x+0.88:x,d[0]>0?x+1:x+0.12]:[x,x+1],Z=d[1]?[d[1]>0?z+0.88:z,d[1]>0?z+1:z+0.12]:[z,z+1];
    Col.add({x0:X[0],y0:h,z0:Z[0],x1:X[1],y1:h+2.4,z1:Z[1]});   // o corrimão barra o caminho (a caixa é mais alta que o desenho: NPCs e jogador não sobem nela nem pulam para a água)
    bt.box(X[0],h+0.78,Z[0],X[1],h+0.92,Z[1],0x6a4a28,{j:0.03});
    bt.box(X[0],h+0.38,Z[0],X[1],h+0.46,Z[1],0x6a4a28,{j:0.03});
    if((x+z)%2===0){const px=d[0]?X:[x+0.43,x+0.57],pz=d[1]?Z:[z+0.43,z+0.57];bt.box(px[0],h,pz[0],px[1],h+0.92,pz[1],0x5e4326,{j:0.03})}
  }
}
// tile de ponte sobre a água: tabuleiro de tábuas (topo, bordas e fundo), leito visível por baixo, pilares nas bordas e corrimão
function meshBridgeWater(bt,x,z,i,h,bi){
  const G=WORLD.bt,tc=hex2rgb(tileColor(x,z,i)),sd=hex2rgb(0x6a4c2a),bed=hex2rgb(natCol(bi.h0,B[i])),th=0.45;
  bt.face(2,x,h,z,x+1,h,z+1,tc[0],tc[1],tc[2]);
  bt.face(3,x,h-th,z,x+1,h-th,z+1,sd[0]*0.7,sd[1]*0.7,sd[2]*0.7);
  bt.face(2,x,bi.h0,z,x+1,bi.h0,z+1,bed[0],bed[1],bed[2]);
  let edge=false;
  for(const d of BR_DIRS){
    const nx=x+d[0],nz=z+d[1];if(nx<0||nz<0||nx>=W||nz>=W)continue;
    if(G.has(nz*W+nx))continue;edge=true;
    bt.face(d[2],x,h-th,z,x+1,h,z+1,sd[0],sd[1],sd[2]);
  }
  for(const d of BR_DIRS){   // paredes do vizinho que ficam voltadas para o vão (a coluna de terra não existe mais: sem isto o vizinho mais alto fica furado)
    const nx=x+d[0],nz=z+d[1];if(nx<0||nz<0||nx>=W||nz>=W)continue;
    const ni=nz*W+nx,nb=G.get(ni),nh=(nb&&nb.h0<SEA&&T[ni]===T_BRIDGE)?nb.h0:H[ni],top=Math.min(nh,h);if(top<=bi.h0)continue;
    const c=hex2rgb(H[ni]>=SEA?subColor(nx,nz,ni):natCol(nh,B[ni])),opp=[1,0,0,0,5,4][d[2]];
    bt.face(opp,nx,bi.h0,nz,nx+1,top,nz+1,c[0],c[1],c[2]);
  }
  for(const d of BR_DIRS){   // parede do leito voltada para um vizinho mais fundo (que não é ponte): sem ela o fundo fica aberto e se vê através do terreno
    const nx=x+d[0],nz=z+d[1];if(nx<0||nz<0||nx>=W||nz>=W)continue;
    const ni=nz*W+nx,nb=G.get(ni);if(nb&&nb.h0<SEA&&T[ni]===T_BRIDGE)continue;
    if(H[ni]<bi.h0)bt.face(d[2],x,H[ni],z,x+1,bi.h0,z+1,bed[0]*0.85,bed[1]*0.85,bed[2]*0.85);
  }
  if(edge&&(x+z)%6===0)bt.box(x+0.12,bi.h0,z+0.12,x+0.88,h-th,z+0.88,0x6d4f2c,{j:0.03});
  bridgeRails(bt,x,z,i,h);
}
function meshTerrain(){
  for(let cz=0;cz<NCH;cz++)for(let cx=0;cx<NCH;cx++){
    const bt=CHUNKS[cz*NCH+cx];
    for(let z=cz*CHK;z<(cz+1)*CHK;z++)for(let x=cx*CHK;x<(cx+1)*CHK;x++){
      const i=z*W+x,h=H[i],bi=T[i]===T_BRIDGE?WORLD.bt.get(i):null;
      if(bi&&bi.h0<SEA){meshBridgeWater(bt,x,z,i,h,bi);continue}   // ponte sobre a água: tabuleiro aberto, sem coluna de terra
      const tc=hex2rgb(tileColor(x,z,i));
      bt.face(2,x,h,z,x+1,h,z+1,tc[0],tc[1],tc[2]);
      const dirs=[[1,0,0],[-1,0,1],[0,1,4],[0,-1,5]];
      for(const dd of dirs){
        const nx=x+dd[0],nz=z+dd[1];if(nx<0||nz<0||nx>=W||nz>=W)continue;
        const nh=H[nz*W+nx];if(nh>=h)continue;
        const sc=hex2rgb(subColor(x,z,i)),gf=(T[i]===T_NAT&&B[i]!==BIO_ROCK&&h>=SEA)?0.82:1;
        const top=Math.min(0.3,h-nh);
        if(T[i]===T_NAT&&h>=SEA&&B[i]!==BIO_ROCK&&B[i]!==BIO_DESERT)bt.face(dd[2],x,h-top,z,x+1,h,z+1,tc[0]*gf,tc[1]*gf,tc[2]*gf);
        else bt.face(dd[2],x,h-top,z,x+1,h,z+1,sc[0],sc[1],sc[2]);
        if(h-nh>top)bt.face(dd[2],x,nh,z,x+1,h-top,z+1,sc[0],sc[1],sc[2]);
      }
      if(bi)bridgeRails(bt,x,z,i,h);   // cabeceira em terra: só o corrimão
    }
    const m=bt.toMesh(MAT_TERRAIN);
    if(m){m.userData.cx=(cx+0.5)*CHK;m.userData.cz=(cz+0.5)*CHK;scene.add(m);WORLD.chunkMeshes.push(m)}
    const lm=LEAVES[cz*NCH+cx].toMesh(LEAF_MAT);
    if(lm){lm.userData.cx=(cx+0.5)*CHK;lm.userData.cz=(cz+0.5)*CHK;scene.add(lm);WORLD.chunkMeshes.push(lm)}
  }
}
function mapColorAt(x,z){
  const i=z*W+x,h=H[i];let c;
  if(h<SEA)return h>=SEA-1?0x4a86d8:0x2f63b8;
  c=tileColor(x,z,i);if(T[i]===T_ROAD||T[i]===T_BRIDGE)c=0xd8c08a;if(T[i]>=T_STREET&&T[i]<=T_FLOOR)c=0xbdbdbd;
  return shadec(c,0.8+Math.min(1,(h-SEA)/30)*0.35);
}
function makeMapCanvas(){
  // o mapa usa uma cópia do terreno de antes de acampamentos, cavernas e baús, então eles não deixam marcas
  const sH=H,sT=T,sB=B;
  if(WORLD.snap){H=WORLD.snap.H;T=WORLD.snap.T;B=WORLD.snap.B}
  const cv=document.createElement('canvas');cv.width=W;cv.height=W;
  const g=cv.getContext('2d'),img=g.createImageData(W,W);
  for(let z=0;z<W;z++)for(let x=0;x<W;x++){
    const c=mapColorAt(x,z),o=(z*W+x)*4;img.data[o]=c>>16&255;img.data[o+1]=c>>8&255;img.data[o+2]=c&255;img.data[o+3]=255;
  }
  g.putImageData(img,0,0);WORLD.mapCanvas=cv;
  H=sH;T=sT;B=sB;
}







