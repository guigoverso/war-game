'use strict';
// Teste em Node do descritor de tile (js/macro/tile.js, etapa 4A). Uso (de dentro de tests/): node macro/tile.js [semente]
// Confere: TILE_SIZE 384, temas e tabela de composição, proporção de temas por ?temas, descritor e batalhas.
const {erros,run}=require('./carregar')();
let falhas=0;const ok=(c,n,w)=>{if(!c)falhas++;console.log((c?'OK    ':'FALHA ')+n+(w?' — '+w:''))};
ok(erros.length===0,'camada macro carrega (inclui tile.js)',erros.join(' | '));
const seed=+(process.argv[2]||11);
ok(run('TILE_SIZE')===384&&run('TILE_SIZE%32')===0,'TILE_SIZE = 384, múltiplo de 32');
ok(run('WORLD_FIELD.spacing')===384,'a grade usa o TILE_SIZE como distância');
ok(run('TILE_THEMES.length')===10&&run('TILE_THEMES.every(t=>TILE_COMPOSE[t]&&t in TILE_THEME_BIOMES)'),'10 temas, todos com composição e biomas');
ok(run('TILE_THEMES.filter(t=>t!=="passagem").every(t=>TILE_COMPOSE[t].main&&TILE_COMPOSE[t].theme[1]>=TILE_COMPOSE[t].theme[0])'),'temas temáticos têm POI principal; passagem não',run('JSON.stringify(TILE_COMPOSE.passagem.main)'));
// proporção de temas: ?temas=N (pesos da tabela; o resto é passagem)
for(const pct of [0,30,70,100]){
  const r=run(`(()=>{let n=0,t=0;const c={};for(let j=0;j<60;j++)for(let i=0;i<60;i++){const k=tileThemeFor(${seed},i,j,${pct});n++;if(k!=='passagem')t++;c[k]=(c[k]||0)+1}return{f:t/n*100,c}})()`);
  ok(Math.abs(r.f-pct)<=5,'temas='+pct+': '+r.f.toFixed(0)+'% dos tiles têm tema',JSON.stringify(r.c));
}
ok(run(`tileThemedPct(undefined)`)===70&&run(`tileThemedPct('abc')`)===70&&run(`tileThemedPct(150)`)===100&&run(`tileThemedPct(-5)`)===0,'?temas: padrão 70, limites 0 e 100');
ok(run(`tileThemeFor(${seed},3,4,70)===tileThemeFor(${seed},3,4,70)`),'tema do tile é determinístico');
// descritor
const d=run(`(()=>{const F=wfCreate(${seed},{format:'pangeia'}),t=wfPickTile(F,384),n=wfNode(F,t.i,t.j),w=wfWindow(F,n.x,n.z,384);w.openings=wfOpenings(F,w,t.i,t.j);
  const b=tileBattle(w.openings,'defesa','L'),x=tileDescribe(F,w,{tema:'fazenda',batalha:b});
  return{x,ab:w.openings.map(o=>o.dir),soma:x.terreno.biomas.reduce((a,v)=>a+v,0),ok1:tileBattle(w.openings,'inexistente','L')===null,
    ch:tileBattle(w.openings,'choque','N','S','defensor')}})()`);
ok(d.x.tema==='fazenda'&&d.x.seed===seed,'descritor tem seed e tema');
ok(d.x.saidas.length===d.ab.length&&d.x.saidas.every(s=>s.side&&s.dir),'descritor guarda as aberturas ('+d.x.saidas.length+')');
ok(Math.abs(d.soma-1)<1e-6||d.soma===0,'biomas somam 100% da terra');
ok(d.x.adequacao>=0&&d.x.adequacao<=1,'adequação ao tema entre 0 e 1 ('+d.x.adequacao.toFixed(2)+')');
ok(d.ok1,'tipo de batalha inexistente = sem batalha');
ok(d.x.batalha&&d.x.batalha.tipo==='defesa'&&d.x.batalha.entradaDefensor===null,'defesa: atacante entra pela abertura, defensor no principal');
ok(d.ch&&d.ch.tipo==='choque'&&d.ch.estacionado==='defensor','choque aceita 2 entradas e batalhão estacionado');
ok(run(`tileEntrance([],'L')`)===null,'sem aberturas, sem entrada');
// ---------- 4E: posição do POI principal por arquétipo (tileMainPlan) ----------
// Varre tiles de várias sementes: restrições (borda, aberturas, terra), 1 entrada = fundo, cidade enorme dentro do deslocamento máximo, determinismo, mistura de arquétipos.
const mp=run(`(()=>{const out={n:0,bad:[],arq:{},um:0,umFundo:0,det:true,bigBad:0,big:0,semMain:0};
  for(const sd of [3,11])for(const fmt of ['continentes','pangeia']){
    const F=wfCreate(sd,{format:fmt});
    for(let j=1;j<5;j++)for(let i=1;i<5;i++){
      const n=wfNode(F,i,j),w=wfWindow(F,n.x,n.z,384,{tile:true,ti:i,tj:j,neighbors:[],openings:[]});w.openings=wfOpenings(F,w,i,j);
      for(const tema of ['cidade','vila','fazenda','mina','serraria','animais','ponte','fortaleza','ruinas','passagem']){
        const big=tema==='cidade'?100:tema==='vila'?55:0,p=tileMainPlan(F,w,tema,{half:big});
        if(tema==='passagem'){if(p)out.bad.push('passagem com principal');else out.semMain++;continue}
        out.n++;out.arq[p.arq]=(out.arq[p.arq]||0)+1;
        const lo=big?big+TILE_MAIN.bigEdge:TILE_MAIN.margin;
        if(!p.caiu&&(p.x<lo||p.z<lo||p.x>384-lo||p.z>384-lo))out.bad.push(sd+':'+i+','+j+' '+tema+' fora da faixa '+p.x+','+p.z);
        if(!p.caiu&&w.openings.some(a=>Math.hypot(a.x-p.x,a.z-p.z)<(big?big+TILE_MAIN.bigOpen:TILE_MAIN.openGap)-0.5))out.bad.push(sd+':'+i+','+j+' '+tema+' perto de abertura');
        if(big&&!p.caiu){out.big++;const m=(384-2*big)/2-TILE_MAIN.bigEdge;if(Math.abs(p.x-192)>m+1||Math.abs(p.z-192)>m+1)out.bigBad++}
        if(w.openings.length===1&&!p.caiu){out.um++;if(p.arq==='fundo')out.umFundo++}
        const q=tileMainPlan(F,w,tema,{half:big});if(q.x!==p.x||q.z!==p.z||q.arq!==p.arq)out.det=false;
      }
    }}
  return out})()`);
ok(mp.n>200,'tileMainPlan: '+mp.n+' tiles temáticos medidos');
ok(mp.bad.length===0,'principal respeita borda, aberturas e terra',mp.bad.slice(0,3).join(' | '));
ok(mp.bigBad===0,'cidade/vila dentro do deslocamento máximo ('+mp.big+' casos)');
ok(mp.um>0&&mp.umFundo===mp.um,'tile de 1 entrada: principal no fundo ('+mp.umFundo+' de '+mp.um+')');
ok(mp.det,'tileMainPlan é determinístico');
ok(Object.keys(mp.arq).length>=5,'vários arquétipos aparecem',JSON.stringify(mp.arq));
const cen=(mp.arq.central||0)/mp.n*100;ok(cen>=10&&cen<=45,'central em ~30% (a entrada única e a margem puxam para baixo): '+cen.toFixed(0)+'%');
console.log(falhas?'\n'+falhas+' FALHA(S)':'\nTudo OK');process.exit(falhas?1:0);
