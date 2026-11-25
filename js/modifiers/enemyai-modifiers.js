'use strict';
// ---------- Modificadores: IA dos atiradores humanos (feature 12, passo 5, 4B-15; docs/features/12_batalha-no-tile.md) ----------
// Vale para todo inimigo com def.ranged (soldado, franco-atirador, saqueador, metralhador, atirador de elite, brutamontes, chefe) no jogo todo.
// Comparar nos testes: ?abrigo=0 desliga a cobertura e ?carregador=0 desliga o carregador (o comportamento antigo volta).
// Todo modificador tem um comentário acima: para que serve e o valor padrão.
const ENEMYAI = {
  // Cobertura ligada (?abrigo=0 desliga). Padrão: ligada
  cover: new URLSearchParams(location.search).get('abrigo') !== '0',
  // Carregador e recarga ligados (?carregador=0 desliga). Padrão: ligado
  magazine: new URLSearchParams(location.search).get('carregador') !== '0',
  // Só procura abrigo quem prefere lutar de longe: def.pref mínimo (o brutamontes, pref 8, e o chefe, pref 14, avançam de espingarda). Padrão: 18
  minPref: 18,
  // Anéis de busca de abrigo em volta do atirador, em blocos (alcance curto, ~20) e quantas direções por anel. Padrão: [4,7,10,13,16,20] e 14
  rings: [4, 7, 10, 13, 16, 20], dirs: 14,
  // Altura (acima do chão) do ponto do corpo que precisa estar escondido do alvo: o abrigo cobre o corpo e o atirador mira por cima. Padrão: 0.7
  bodyY: 0.7,
  // Orçamento por quadro: pontos avaliados por todos os atiradores juntos (cada busca custa rings x dirs); quem não cabe tenta no quadro seguinte. Padrão: 200
  probeBudget: 200,
  // Cache da busca (chave = quadrado de 8 blocos do atirador + quadrado de 8 do alvo): quanto tempo vale, em segundos. Padrão: 2.5
  cacheTtl: 2.5,
  // Quantos atiradores dividem o mesmo abrigo (1 a 2) e a distância, em blocos, que separa um abrigo de outro. Padrão: 2 e 2.2
  perCover: 2, coverGap: 2.2,
  // De quanto em quanto tempo (s) o abrigo é conferido de novo (o alvo andou? o abrigo ainda esconde?) e a espera (s) antes de tentar de novo sem abrigo. Padrão: 1.2 e 1.5
  recheck: 1.2, retry: 1.5,
  // Tempo máximo (s) andando até o abrigo antes de desistir (parede no caminho, preso). Padrão: 6
  walkMax: 6,
  // Fica no abrigo até o alvo sumir de vista por este tempo (s, sorteio entre mín e máx); aí avança com cuidado até o último ponto visto. Padrão: [10, 15]
  holdUnseen: [10, 15],
  // Velocidade do avanço cuidadoso (fração da velocidade) e a que distância (blocos) do último ponto visto ele termina. Padrão: 0.5 e 3
  carefulSpeed: 0.5, carefulEnd: 3,
  // Carregador por tipo (EDEF em entities.js): tiros, sorteio entre mín e máx (cada tiro da rajada gasta 1). Padrão: soldado 8-12, saqueador 18-24, metralhador 24-36
  mag: {
    soldier: [8, 12], raider: [18, 24], gunner: [24, 36], sniper: [5, 7], marksman: [5, 7], brute: [4, 6], warlord: [6, 8]
  },
  // Carregador de quem não está na tabela acima. Padrão: [8, 12]
  magDefault: [8, 12],
  // Recarga, em segundos (sorteio entre mín e máx); sem tiro durante ela e, de preferência, feita no abrigo. Padrão: [2, 3]
  reload: [2, 3]
};
const enemyAiRand = r => r[0] + Math.random() * (r[1] - r[0]);

// ---------- Sair da água (inimigos, NPCs e soldados do jogador; vale no jogo todo) ----------
const WATER_ESCAPE = {
  // Liga/desliga (?agua=0 desliga, para comparar). Padrão: ligado
  on: new URLSearchParams(location.search).get('agua') !== '0',
  // Altura de degrau, em blocos, que quem está na água consegue subir ao sair (a margem costuma ser mais alta que o fundo). Padrão: 9
  stepH: 9,
  // Raio máximo, em blocos, da busca pela terra firme mais perto, passo entre os anéis e direções por anel. Padrão: 60, 2 e 16
  maxR: 60, ringStep: 2, dirs: 16,
  // Distância mínima da água, em blocos, do ponto de destino (terra seca em volta nessa distância, não só a margem). Padrão: 6
  inland: 6,
  // Segundos até procurar o destino de novo se ainda estiver molhado (multiplica a cada tentativa) e tempo máximo, em segundos, tentando chegar. Padrão: 1 e 15
  retry: 1, giveUp: 15
};
// Custo de andar por um quadradinho de água no A* dos NPCs (nav.js) em relação a terra (1): quanto maior, mais eles contornam lagos em vez de atravessar. Padrão: 10
const NAV_WATER_COST = 10;
