'use strict';
// ---------- Operações de guerra: lógica (feature operações de guerra; docs/features/4_operacoes-de-guerra.md) ----------
// No turno do Líder o jogador gasta pontos de líder (STATE.rd.actions) em operações; no do Comandante cumpre no mapa o que lançou.
// Operação em STATE.war.ops: {id, type, fid, target (id do POI), of (dono quando lançou), cost, state, after (id da operação de que depende), round}.
//  state: 'aguarda' (depende de outro ataque da rodada) | 'ativa' | 'ok' (cumprida) | 'falha'
// Por ora só o Ataque a POI está ativo (WAR.ops); a estrutura de Defesa, Sabotagem e cidade já existe, desativada.
// Execução no mapa (guarnição, blindagem) é a tarefa 4; fechamento da rodada (falhas, fadiga, log) é a tarefa 5.

const warOpCost = type => WAR.opCost[type] || 1;
const warOpById = id => warX().ops.find(o => o.id === id);
// Operações da rodada atual que ainda valem (aguarda ou ativa), de um tipo (sem tipo: todas).
const warOpsLive = type => warX().ops.filter(o => o.round === STATE.round && (o.state === 'aguarda' || o.state === 'ativa')
  && (!type || o.type === type));
// Alvo (POI) de uma operação; undefined se o POI não existe mais.
const warOpPoi = op => (WORLD.pois || []).find(p => p.id === op.target);
// Todas as operações da rodada atual de um tipo, inclusive as já cumpridas (contam para o teto de ataques).
const warOpsRound = type => warX().ops.filter(o => o.round === STATE.round && o.type === type && o.state !== 'falha');
// A operação de ataque lançada na rodada que tem p como alvo (ou null).
const warOpOn = p => warOpsLive('attack').find(o => o.target === p.id) || null;
// POI p está na trilha de alguma guerra do jogador? Devolve a facção da frente (ou undefined).
function warOpTrailFid(p) {
  for (const f of Object.keys(warX().camps)) {
    const ln = warFrontLine(+f);
    if (ln && ln.pois.includes(p)) return +f;
  }
}

// Regra do ataque a POI: devolve null se pode lançar agora, ou o motivo (texto de TXT_WAR_OP_WHY). Não olha a fase do turno
// (a interface mostra os botões só no turno do Líder; warOpPlan confere).
// Pode atacar p se: está na trilha, é do inimigo ou de bandidos, a frente liberou (alvo-POI), não repete alvo, cabe no teto e
// nos pontos, e é adjacente a um POI seu ou ao alvo de outra operação de ataque da rodada.
function warOpCanAttack(fid, p) {
  const W = TXT_WAR_OP_WHY, ln = warFrontLine(fid);
  if (!ln) return W.noFront;
  if (!WAR.ops.attack.on) return WAR.ops.attack.off;
  const i = ln.pois.indexOf(p);
  if (i < 0 && p !== ln.target) return W.notOnLine;
  if (p.owner === 'player') return W.mine;
  if (p.owner !== fid && p.owner !== 'bandit') return W.notEnemy;
  if (warOpOn(p)) return W.repeated;
  if (warOpsRound('attack').length >= WAR.maxAttacksPerRound) return W.maxAttacks(WAR.maxAttacksPerRound);
  if (STATE.rd.actions < warOpCost('attack')) return W.noPoints(warOpCost('attack'));
  if (p === ln.target) return warFrontReleased(ln) ? null : W.notReleased;
  return warOpLink(ln, i) ? null : W.notAdjacent;
}
// Como o POI de índice i da linha se liga ao que é seu: {after: null} (vizinho de POI seu ou da cidade), {after: id} (vizinho do
// alvo de outra operação de ataque da rodada) ou null (não é adjacente).
function warOpLink(ln, i) {
  const nb = [ln.pois[i - 1], ln.pois[i + 1]];
  if (i === 0 || nb.some(q => q && q.owner === 'player')) return { after: null };
  for (const q of nb) {
    const o = q && warOpOn(q);
    if (o) return { after: o.id };
  }
  return null;
}

// Lança um ataque a p. Devolve {ok:true, op} ou {ok:false, why}. Gasta os pontos de líder; a que depende de outra nasce 'aguarda'.
function warOpPlan(fid, p) {
  if (!isLeader()) return { ok: false, why: TXT_WAR_OP_WHY.notLeader };
  const why = warOpCanAttack(fid, p);
  if (why) return { ok: false, why };
  const ln = warFrontLine(fid), i = ln.pois.indexOf(p), link = i >= 0 ? warOpLink(ln, i) : { after: null };
  const W = warX(), cost = warOpCost('attack');
  const op = { id: 1 + Math.max(0, ...W.ops.map(o => o.id || 0)), type: 'attack', fid, target: p.id, of: p.owner, cost,
    state: link.after ? 'aguarda' : 'ativa', after: link.after, round: STATE.round };
  STATE.rd.actions -= cost; W.ops.push(op);
  toast(txtWarOpPlanned(POI_DEFS[p.type].n, !!link.after), 3000);
  return { ok: true, op };
}
// Cancela uma operação do turno do Líder e devolve o ponto; as que dependem dela caem junto. Só no turno do Líder.
function warOpCancel(id) {
  const op = warOpById(id);
  if (!op || !isLeader() || (op.state !== 'aguarda' && op.state !== 'ativa')) return false;
  for (const d of warX().ops.filter(o => o.after === id && o.state === 'aguarda')) warOpCancel(d.id);
  STATE.rd.actions += op.cost;
  warX().ops.splice(warX().ops.indexOf(op), 1);
  return true;
}

// Ataque à cidade: registrado e desativado até a batalha final (item 9). Devolve o motivo.
const warOpCanCity = () => WAR.ops.city.on ? null : WAR.ops.city.off;

// Gancho de poiSetOwner (pois.js): o POI p mudou de dono para o.
//  - POI da trilha que ficou livre (limpo de bandidos) com guerra em curso: anexado na hora, sem o cartão "Terras livres".
//  - POI do jogador que era alvo de ataque ativo: a operação vira 'ok' e as que aguardavam por ela ficam 'ativa'.
function warOpOwnerChanged(p, o) {
  if (!STATE.war || typeof warActive !== 'function' || !warActive()) return;
  if (o === 'free' && warOpTrailFid(p) !== undefined) { poiSetOwner(p, 'player'); return; }
  if (o !== 'player') return;
  const op = warOpsLive('attack').find(x => x.target === p.id && x.state === 'ativa');
  if (!op) return;
  op.state = 'ok';
  for (const d of warX().ops) if (d.after === op.id && d.state === 'aguarda') d.state = 'ativa';
}
