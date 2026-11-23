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
console.log(falhas?'\n'+falhas+' FALHA(S)':'\nTudo OK');process.exit(falhas?1:0);
