'use strict';
// Teste em Node do grafo do mundo (js/macro/graph.js, etapa 5). Uso (de dentro de tests/): node macro/grafo.js [--resumo] [--svg pasta] [--pct N]
// Confere, para 4 formatos x 4 sementes: determinismo, distância mínima, conectividade (grafo inteiro e cidades), grau de vizinhos, 1 tile de cada tema,
// adequação (>= limite, ou FORÇADO), passagem fora das estradas, ilha inicial, aberturas, salvar/carregar e tempo. --resumo imprime a tabela de cada mundo.
// --svg pasta escreve um SVG por mundo (pontos por tema, estrada grossa, trilha fina, mar tracejado).
const fs = require('fs'), path = require('path');
const { erros, run } = require('./carregar')();
let falhas = 0; const ok = (c, n, w) => { if (!c) falhas++; console.log((c ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
ok(erros.length === 0, 'camada macro carrega (inclui graph.js)', erros.join(' | '));
const A = process.argv, resumo = A.includes('--resumo'), svgDir = A.includes('--svg') ? A[A.indexOf('--svg') + 1] : null, pct = A.includes('--pct') ? +A[A.indexOf('--pct') + 1] : undefined;
const seeds = [11, 5, 42, 970901248, 7, 99], formatos = run('WORLD_FIELD.formats'), temas = run('Object.keys(TILE_THEME_WEIGHT)');
const COR = { cidade: '#e53935', vila: '#fb8c00', fazenda: '#c0ca33', mina: '#8d6e63', serraria: '#2e7d32', animais: '#6d4c41', ponte: '#1e88e5', fortaleza: '#6a1b9a', ruinas: '#9e9e9e', passagem: '#ffffff', mar: '#1565c0' };

function svg(G) {
  const S = G.S, bio = ['#9ccc65', '#388e3c', '#fff176', '#eceff1', '#78909c'];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="900" height="900"><rect width="${S}" height="${S}" fill="#0d47a1"/>`;
  const cells = run(`(()=>{const F=wfCreate(${G.seed},{format:'${G.fmt}',dominant:'${G.dominant}'}),o=[];for(let z=0;z<F.S;z+=48)for(let x=0;x<F.S;x+=48){const h=wfHeight(F,x+24,z+24);o.push(h<wfSea()?-1:wfBiome(F,x+24,z+24,h))}return o})()`);
  const n = Math.ceil(S / 48); cells.forEach((b, i) => { if (b >= 0) s += `<rect x="${(i % n) * 48}" y="${Math.floor(i / n) * 48}" width="48" height="48" fill="${bio[b]}"/>` });
  for (const e of G.edges) { const a = G.nodes[e.a], b = G.nodes[e.b]; s += `<line x1="${a.x}" y1="${a.z}" x2="${b.x}" y2="${b.z}" stroke="${e.kind === 'estrada' ? '#3e2723' : e.kind === 'mar' ? '#bbdefb' : '#5d4037'}" stroke-width="${e.kind === 'estrada' ? 14 : 5}" ${e.kind === 'mar' ? 'stroke-dasharray="14 12" opacity=".6"' : ''}/>` }
  for (const v of G.nodes) {
    const r = v.mar ? 26 : v.tema === 'cidade' ? 52 : 38;
    s += `<rect x="${v.x - TS / 2}" y="${v.z - TS / 2}" width="${TS}" height="${TS}" fill="none" stroke="#000" stroke-opacity=".12"/><circle cx="${v.x}" cy="${v.z}" r="${r}" fill="${COR[v.tema]}" stroke="${v.forcado ? '#ff1744' : '#000'}" stroke-width="${v.forcado ? 8 : 3}"/>`;
    s += `<text x="${v.x}" y="${v.z + (v.tema === 'cidade' ? 80 : 66)}" font-size="34" text-anchor="middle" fill="#000">${v.tema}${v.home ? ' ★' : ''}${v.porto ? ' ⚓' : ''}</text>`;
  }
  return s + '</svg>';
}
const TS = run('TILE_SIZE');

let total = 0;
for (const fm of formatos) for (const seed of seeds) {
  const nome = fm + '/' + seed, opt = pct === undefined ? '{}' : `{pct:${pct}}`;
  const R = run(`(()=>{
    const F=wfCreate(${seed},{format:'${fm}',dominant:'plains'}),G=wgBuild(F,${opt}),G2=wgBuild(wfCreate(${seed},{format:'${fm}',dominant:'plains'}),${opt});
    const K=WORLD_GRAPH,N=G.nodes.length,land=G.nodes.filter(n=>!n.mar);
    let minD=1e9;for(let a=0;a<N;a++)for(let b=a+1;b<N;b++){const d=Math.hypot(G.nodes[a].x-G.nodes[b].x,G.nodes[a].z-G.nodes[b].z);minD=Math.min(minD,(G.nodes[a].ponteNode||G.nodes[b].ponteNode)?d/WORLD_GRAPH.bridgeDist:d)}
    // conectividade do grafo inteiro e das cidades por terra dentro de cada ilha
    const seen=new Set([0]),q=[0];for(let i=0;i<q.length;i++)for(const x of G.adj[q[i]])if(!seen.has(x.to)){seen.add(x.to);q.push(x.to)}
    const deg=land.map(n=>wgLandAdj(G,n.id).length),cont={};for(const n of G.nodes)cont[n.tema]=(cont[n.tema]||0)+1;
    const pack=wgPack(G),G3=wgUnpack(JSON.parse(JSON.stringify(pack)),F),pack3=wgPack(G3);
    let abOk=true,abN=0;for(const n of land)for(const o of wgOpenings(G,F,n.id)){abN++;if(!(o.x>=0&&o.x<=TILE_SIZE&&o.z>=0&&o.z<=TILE_SIZE)||!['E','W','N','S'].includes(o.side))abOk=false}
    return {N,nLand:land.length,minD:Math.round(minD),conn:seen.size===N,deg:{min:Math.min(...deg),max:Math.max(...deg),avg:deg.reduce((a,b)=>a+b,0)/deg.length},cont,
      det:JSON.stringify(wgPack(G))===JSON.stringify(wgPack(G2)),rt:JSON.stringify(pack)===JSON.stringify(pack3),abOk,abN,quotas:G.quotas,forc:G.forcados,
      ilhas:G.ilhas,inicio:G.inicio,ms:G.ms,pontes:G.nodes.filter(n=>n.ponteNode).length,
      pontesOk:G.nodes.filter(n=>n.ponteNode).every(n=>{const v=wgLandAdj(G,n.id).map(x=>G.nodes[x.to]);if(v.length!==2||v.some(o=>o.mar||o.ponteNode))return false;const ax=Math.cos(n.ang),az=Math.sin(n.ang);if(wgWaterLen(F,v[0],v[1])>WORLD_GRAPH.bridgeMax+WORLD_GRAPH.bridgeExtra+16)return false;return v.every(o=>Math.hypot(o.x-n.x,o.z-n.z)>0)&&((v[0].x-n.x)*ax+(v[0].z-n.z)*az)*((v[1].x-n.x)*ax+(v[1].z-n.z)*az)<0}),
      semAdeq:land.filter(n=>n.tema!=='passagem'&&!n.forcado&&n.fit<K.softFit-1e-9&&!n.extra&&n.tema!=='cidade').length,
      passRoad:land.filter(n=>n.tema==='passagem'&&n.onRoad).length,
      estradas:G.edges.filter(e=>e.kind==='estrada').length,trilhas:G.edges.filter(e=>e.kind==='trilha').length,mar:G.edges.filter(e=>e.kind==='mar').length,
      cidadesIlha:G.nodes.filter(n=>n.tema==='cidade').map(n=>n.ilha),G:null}
  })()`);
  total += R.ms;
  const G = run(`(()=>{const G=wgBuild(wfCreate(${seed},{format:'${fm}',dominant:'plains'}),${opt});return {seed:G.seed,fmt:G.fmt,dominant:G.dominant,S:G.S,edges:G.edges,nodes:G.nodes.map(n=>({x:n.x,z:n.z,mar:n.mar,tema:n.tema,forcado:n.forcado,home:n.home,porto:n.porto}))}})()`);
  if (svgDir) { fs.mkdirSync(svgDir, { recursive: true }); fs.writeFileSync(path.join(svgDir, fm + '-' + seed + '.svg'), svg(G)) }
  const c = R.cont, linha = temas.concat(['passagem', 'mar']).map(t => t + ' ' + (c[t] || 0)).join(', ');
  if (resumo) console.log(`\n[${nome}] ${R.N} pontos (${R.nLand} terra), arestas: ${R.estradas} estrada, ${R.trilhas} trilha, ${R.mar} mar; ${R.ms} ms\n   ${linha}\n   forçados: ${R.forc.join(',') || '-'}; ilha inicial: ${R.inicio ? R.inicio.tiles + ' tiles, ' + R.inicio.cidades + ' cidades' + (R.inicio.porto ? ' (PORTO)' : '') : '-'}`);
  ok(R.nLand >= 40, nome + ': ao menos 40 tiles de terra', R.nLand + ' de terra');
  ok(R.minD >= run('WORLD_GRAPH.minDist') - 1, nome + ': distância mínima (arredondada) ' + R.minD + ' >= ' + run('WORLD_GRAPH.minDist'));
  ok(R.conn, nome + ': grafo inteiro conectado');
  ok(R.det, nome + ': determinístico');
  ok(R.rt, nome + ': salvar -> carregar -> salvar igual');
  ok(R.abOk, nome + ': aberturas na borda (' + R.abN + ')');
  ok(R.pontesOk, nome + ': tile de ponte com exatamente 2 vizinhos de terra, um antes e um depois (' + R.pontes + ' pontes)');
  ok(R.deg.max <= 6, nome + ': vizinhos de terra por tile entre ' + R.deg.min + ' e ' + R.deg.max + ' (média ' + R.deg.avg.toFixed(1) + ')', 'máximo 6 (a árvore geradora não limita; era 5 antes dos tiles de ponte)');
  ok(R.nLand >= temas.length ? temas.every(t => c[t] >= 1 || t === 'ponte') : true, nome + ': ao menos 1 tile de cada tema', temas.filter(t => !c[t]).join(','));
  ok(R.semAdeq === 0, nome + ': todo tema com adequação >= limite brando (ou forçado)', R.semAdeq + ' fora');
  ok(R.passRoad === 0, nome + ': nenhuma passagem em tile com estrada');
  ok(R.ms < 4000, nome + ': gerou em ' + R.ms + ' ms (< 4000)');
}
console.log('\ntempo médio de geração: ' + Math.round(total / (formatos.length * seeds.length)) + ' ms');
process.exit(falhas ? 1 : 0);
