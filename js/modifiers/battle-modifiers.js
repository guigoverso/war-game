'use strict';
// ---------- Modificadores: batalha no tile (feature 12, docs/features/12_batalha-no-tile.md, seções 4A e 4B) ----------
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo.
// Parâmetros de URL do cenário ?cenario=batalha&modo=nucleo: ?inim=N (reserva inimiga), ?reserva=N (reserva do jogador), ?alia=N (soldados de elite),
// ?vivos=N (cota de vivos do inimigo), ?vivosalia=N (cota do jogador), ?lote=3-5 (ou ?lote=4), ?atraso=S (segundos entre lotes), ?semente=N (sorteio dos lotes
// reproduzível), ?raios=0 (esconde os raios no chão).

const BATTLE_MOD = {
  // Máximo de soldados inimigos vivos ao mesmo tempo, somando todos os geradores (definido em 2026-11-25). Padrão: 30
  liveCap: 30,
  // Máximo de soldados do jogador em campo ao mesmo tempo (valor próprio, 4B-11; o doc não fixa o número: proposta, igual às 10 elites, como no exemplo do
  // placar, para a reposição vir "à medida que morrem"). Padrão: 10
  allyLiveCap: 10,
  // Reserva inicial do inimigo (soldados ainda não lançados; 4A). Padrão: 100
  enemyReserve: 100,
  // Tamanho do batalhão do jogador: TETO que não pode ser ultrapassado (elites + comuns em campo e na reserva). A reserva dele é este total menos as elites
  // (50 = 10 elites + 40 comuns, decisão de 2026-11-25). ?reserva=N pode só diminuir a reserva. Padrão: 50
  allyTotal: 50,
  // Tamanho do lote de reposição: sorteio inteiro entre mín e máx, refeito a cada lote (4A). Padrão: [3, 5]
  lot: [3, 5],
  // Atraso, em segundos, entre um lote e o seguinte (a calibrar jogando, 4A). Padrão: 3
  lotDelay: 3,
  // Raio de ativação do gerador, em blocos (4B-1). Ao entrar nele o gerador acorda; ao sair do raio x leashMul, dorme. Padrão: 60
  genRadius: 60,
  // Coleira (4B-2): os soldados lançados só perseguem até raio x este fator e voltam ao gerador. Padrão: 1.3
  leashMul: 1.3,
  // Distância ao gerador (mín, máx, em blocos) em que o soldado nasce, em volta dele. Padrão: [3, 7]
  spawnRing: [3, 7],
  // Quando um soldado em retorno chega a esta distância do gerador (blocos), fica parado ali. Padrão: 6
  homeDist: 6,
  // Tipo de inimigo lançado pelo gerador (ver EDEF em entities.js). Padrão: 'soldier'
  enemyType: 'soldier',
  // Raios visíveis no chão (4B-1, só nos testes): liga/desliga e cores (ativação, coleira). Padrão: ligado, 0xff3030 e 0xff9a30
  showRings: true, ringColor: 0xff3030, leashColor: 0xff9a30,
  // Meia-largura da área de batalha (para a música de combate e as buscas por "batalha por perto"); a área acompanha o jogador. Padrão: 30
  areaHalf: 30,
  // Cenário ?modo=nucleo: onde fica o gerador, onde o jogador começa (blocos do mapa de teste de 320) e quanto andar antes do gerador acordar. Padrão: gerador 200,60; jogador 130,60
  nucleo: { gen: { x: 200, z: 60 }, start: { x: 130, z: 60 } },
  // Teclas de ajuste em tempo real no cenário de teste: tamanho do lote (menos, mais) e atraso entre lotes (menos, mais). Padrão: BracketLeft/BracketRight, Minus/Equal
  keys: { lotDown: 'BracketLeft', lotUp: 'BracketRight', delayDown: 'Minus', delayUp: 'Equal' },
  // Passo do ajuste do atraso em segundos e limites do lote ajustável. Padrão: 0.5, lote de 1 a 15
  delayStep: 0.5, lotLimit: [1, 15],
  // Cores dos números do placar: bandidos têm cor fixa; mortos usam a mesma cor com esta transparência. Padrão: '#d05a4a' e 0.55
  scoreBandit: '#d05a4a', scoreDeadAlpha: 0.55
};
// Verdadeiro quando o cenário de teste está no modo de batalha pedido por ?modo= (nucleo, choque, defesa, ataque, pequena).
const battleMode = () => tileTestOn() ? (new URLSearchParams(location.search).get('modo') || '') : '';
