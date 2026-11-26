'use strict';
// ---------- Modificadores: soldados do jogador (ordem de movimento; etapa 1A do plano em docs/features/6_plano-mapa-mundi.md) ----------
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo.

// Tecla que manda TODOS os soldados para o ponto do chão que você está mirando. Padrão: 'KeyV'
const ORDER_KEY_GO = 'KeyV';
// Tecla que cancela a ordem (os soldados voltam a acompanhar você). Padrão: 'KeyX'
const ORDER_KEY_CANCEL = 'KeyX';
// Botão do mouse que dá a ordem (1 = botão do meio/roda). Padrão: 1
const ORDER_MOUSE_BUTTON = 1;
// Distância máxima, em blocos, do ponto que dá para mirar com a ordem. Padrão: 120
const ORDER_MAX_DIST = 120;
// Raio da formação em volta do ponto da ordem, em blocos (cada soldado ocupa um anel pelo número do seu lugar). Padrão: 3
const ORDER_RING = 3;
// Depois de chegar ao ponto, quanto o soldado se afasta dele para perseguir um inimigo, em blocos. Durante o deslocamento a ordem manda (ele atira andando). Padrão: 25
const ORDER_CHASE = 25;
// Cor do marcador do destino no chão. Padrão: 0x4ab0ff (azul)
const ORDER_MARK_COLOR = 0x4ab0ff;
// Regra: dá para ordenar? Só com soldados vivos e sem posto fixo (batalha de rebelião manda neles). Padrão: pelo menos 1 solto
function canOrderAllies() { return ALLIES.some(a => a.alive && !a.post); }

// ---------- Recrutamento com regras e limites (feature 12, passo 11; 4B-4 e 4B-19) ----------
// Teto de soldados do jogador (sem reserva: ganho além do teto se perde; quem morre sai do exército). Padrão: 50
const ARMY_MAX_SOLDIERS = 50;
// Teto de soldados recrutados por RODADA em cada lugar (renova a cada rodada): cidade, vila sua e vila neutra. O teto do exército vale por cima. Padrão: 50, 15 e 5
const RECRUIT_ROUND_CAP = { city: 50, village: 15, neutral: 5 };
// Recompensa em ouro que o refém libertado dá quando o exército está cheio e ele não pode se juntar. Padrão: 100
const HOSTAGE_FULL_REWARD = 100;
// Onde dá para recrutar: 'city' = cidade sua (Quartel); 'village' = vila sua; 'neutral' = vila neutra (não dominada por facção); null = em lugar nenhum.
// Cidade de outra facção e vila dominada por facção não recrutam.
function recruitPlace(c) {
  if (!c) return null;
  if (!c.vila) return c.owner === 'player' ? 'city' : null;
  return c.owner === 'player' ? 'village' : !c.fid ? 'neutral' : null;
}
// Quantos soldados ainda dá para recrutar em c nesta rodada (teto do lugar menos o que já foi recrutado; o teto do exército não entra aqui)
function recruitLeft(c) {
  const k = recruitPlace(c), R = ARMY.recr;
  if (!k) return 0;
  return Math.max(0, RECRUIT_ROUND_CAP[k] - (R && R.r === STATE.round && R.n[c.id] || 0));
}
// Conta um recrutamento em c na rodada atual (zera a conta quando a rodada muda)
function recruitCount(c) {
  if (!ARMY.recr || ARMY.recr.r !== STATE.round) ARMY.recr = { r: STATE.round, n: {} };
  ARMY.recr.n[c.id] = (ARMY.recr.n[c.id] || 0) + 1;
}

// Tamanho (px) da foto do modelo da arma usada como ícone na barra, na bolsa e nas lojas (weapons.js, weaponIconUrl). Padrão 96.
const WEAPON_ICON_PX=96;

// Soldados do jogador também miram inimigos de POI, de acampamento e de matilha (lobos, cães) que estejam em combate (aggro, ou mirando você ou um soldado)
// a esta distância (blocos) do soldado. Antes só mirava inimigos de raid/cidade e ignorava os demais. Padrão 40.
const ALLY_THREAT_RANGE=40;
