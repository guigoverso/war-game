// Nomes próprios dos tiles do mapa mundi (etapa 6A do plano). Sem Three.js nem DOM. Determinístico: só depende da semente do mundo, do id e do terreno do tile
// (n.terr, n.costa, n.tema), então NÃO vai para o save. Listas em js/texts/map-texts.js (TXT_NAME_*), números em TILE_NAME (map-modifiers.js).
// tileName(G, n) devolve o nome; o mundo inteiro é nomeado de uma vez (G.nomes, na ordem dos ids) para nunca repetir nome.

const tileDomBiome = n => n.terr.biomas.reduce((b, v, i, a) => v > a[b] ? i : b, 0);
// Um nome candidato para o tile n, sorteado em rg.
function tileNameTry(n, rg) {
  const K = TILE_NAME, T = n.tema, B = TXT_NAME_BASE[T], terr = () => rg.pick(TXT_NAME_TERRAIN[tileDomBiome(n)]);
  const santo = () => rg.pick(TXT_NAME_SAINTS), casa = () => rg.pick(TXT_NAME_HOUSES), costa = () => rg.pick(TXT_NAME_COAST);
  const dono = () => rg.chance(0.5) ? 'de ' + santo() : casa();
  if (T === 'cidade') return santo() + ' ' + (n.costa && rg.chance(K.coast) ? costa() : terr());
  if (T === 'vila') return rg.chance(K.villaPlain) ? 'Vila ' + rg.pick(TXT_NAME_VILLAGES) : santo() + ' ' + (n.costa && rg.chance(K.coast) ? costa() : terr());
  if (T === 'ponte') return B + ' ' + rg.pick(TXT_NAME_BRIDGE);
  if (T === 'mar') return rg.pick(TXT_NAME_SEA_BASE) + ' ' + rg.pick(TXT_NAME_SEA);
  if (T === 'passagem') return B + ' ' + terr();
  // fazenda, mina, serraria, animais, fortaleza, ruínas: terreno ou dono; ruínas já traz o "de"
  const sufixo = rg.chance(K.terrain) ? terr() : dono();
  return T === 'ruinas' ? B + ' ' + sufixo.replace(/^de /, '') : B + ' ' + sufixo;
}
// Nomeia todos os pontos do grafo (uma vez) e guarda em G.nomes[id].
function tileNamesBuild(G) {
  const usados = new Set(); G.nomes = [];
  for (const n of G.nodes) {
    let nome = null;
    for (let t = 0; t < TILE_NAME.tries && !nome; t++) {
      const c = tileNameTry(n, new RNG((G.seed * 7919 + n.id * 104729 + t * 15485863 + 5) >>> 0));
      if (!usados.has(c)) nome = c;
    }
    if (!nome) { let i = 0; const c0 = tileNameTry(n, new RNG((G.seed + n.id) >>> 0)); do nome = txtNameRepeat(c0, i++); while (usados.has(nome)) }
    usados.add(nome); G.nomes[n.id] = nome;
  }
  return G.nomes;
}
const tileName = (G, n) => (G.nomes || tileNamesBuild(G))[n.id];
