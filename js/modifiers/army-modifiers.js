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
