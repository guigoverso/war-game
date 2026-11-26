'use strict';
// Teste em Node dos nomes dos tiles (js/macro/tilename.js, etapa 6A). Uso (de dentro de tests/): node macro/nomes.js
const { erros, run } = require('./carregar')();
let falhas = 0; const ok = (c, n, w) => { if (!c) falhas++; console.log((c ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
ok(erros.length === 0, 'camada macro carrega (inclui tilename.js)', erros.join(' | '));
const formatos = run('WORLD_FIELD.formats'), temas = new Set();
for (const fm of formatos) for (const seed of [11, 5, 42]) {
  const R = run(`(()=>{
    const mk=()=>wgBuild(wfCreate(${seed},{format:'${fm}',dominant:'plains'}),{});
    const G=mk(),G2=mk(),a=G.nodes.map(n=>tileName(G,n)),b=G2.nodes.map(n=>tileName(G2,n));
    const F=wfCreate(${seed},{format:'${fm}',dominant:'plains'}),G3=wgUnpack(JSON.parse(JSON.stringify(wgPack(G))),F),c=G3.nodes.map(n=>tileName(G3,n));
    return{a,det:JSON.stringify(a)===JSON.stringify(b),pack:JSON.stringify(a)===JSON.stringify(c),uniq:new Set(a).size===a.length,
      vazio:a.some(s=>!s||/undefined|NaN/.test(s)),temas:G.nodes.map(n=>n.tema),romano:a.filter(s=>/ (II|III|IV|V|VI|VII|VIII|IX|X)$/.test(s)).length}})()`);
  R.temas.forEach(t => temas.add(t));
  ok(R.det && R.pack && R.uniq && !R.vazio, fm + '/' + seed + ': determinístico, igual após salvar/carregar, único, sem texto quebrado', 'romanos ' + R.romano + '; ex.: ' + R.a.slice(0, 4).join(' | '));
}
const cob = run(`(()=>{const o=[];for(const t of TILE_THEMES.concat(['mar']))for(let b=0;b<5;b++)for(const costa of[false,true]){const rg=new RNG(1+b),n={id:1,tema:t,costa,terr:{biomas:[0,0,0,0,0].map((_,i)=>i===b?1:0)}};for(let i=0;i<30;i++){const s=tileNameTry(n,rg);if(!s||/undefined/.test(s))o.push(t+b)}}return o})()`);
ok(cob.length === 0, 'todos os temas x biomas x costa geram nome', cob.slice(0, 5).join(','));
process.exit(falhas ? 1 : 0);
