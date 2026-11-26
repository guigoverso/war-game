'use strict';
// ---------- Modificadores: turno do Comandante no mapa mundi (etapa 7 de docs/features/6_plano-mapa-mundi.md; camada macro, js/macro/worldturn.js) ----------
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo. Valores PROVISÓRIOS: a etapa 11 calibra.

const WT = {
  // AÇÕES do mapa por rodada, por nível da facção (índice 0 = nível 1; o último vale para os níveis acima). Uma ação = o batalhão marcha o que o movimento da
  // ação alcança e SÓ DEPOIS os NPCs dão um passo cada. Sem limite por batalhão. Padrão: 3, 4, 5, 6 e 8
  poolByLevel: [3, 4, 5, 6, 8],
  // MOVIMENTO de cada ação: o custo do terreno de cada tile é descontado dele; sem movimento para o caminho todo, o batalhão para onde deu (1 tile sempre cabe). Padrão: 6
  movePerAction: 6,
  // Custo de uma aresta do grafo em pontos de movimento = máx(1, teto(custo x multiplicador / costPerAction)). Padrão: 2.5
  costPerAction: 2.5,
  // Multiplicador do custo da estrada (a trilha vale 1): a estrada é mais barata. Padrão: 0.6
  roadMul: 0.6,
  // Soldados do batalhão grátis (o primeiro, ou o novo quando o jogador ficou sem nenhum) e do batalhão pago no turno do Líder; preço de cada soldado
  // do pago (o total sai do ouro; nunca vira dívida). Padrão: 10, 10, 100
  freeSoldiers: 10, newSoldiers: 10, soldierPrice: 100,
  // Morte do comandante: ouro perdido (o que houver, até este valor; nunca dívida) e fração do que o batalhão levava (munição) que se perde. Padrão: 150, 1
  deathGold: 150, deathAmmo: 1,
  // Kit do comandante novo (batalhão grátis ou criado no turno do Líder): munição da pistola e curas, na bolsa do batalhão (b.mun). Padrão: 30 e 2
  kit: { pistol: 30, heal: 2 },
  // Atores do mundo: bandidos soltos e caravanas. count = quantos nascem na rodada 0; str = [mín, máx] de soldados do bandido; sight = alcance de visão do
  // bandido em saltos de aresta; roam = chance de o bandido solto andar a cada passo. Padrão: bandidos 3, caravanas 3, força 6 a 14, visão 2, 0.5
  bandits: 3, caravans: 3, str: [6, 14], sight: 2, roam: 0.5,
  // Força de uma caravana (guardas), usada quando bandido a alcança no caminho. Padrão: 3
  caravanStr: 3,
  // O que as caravanas carregam (sorteado por caravana; só aparece no painel do mapa por enquanto). Padrão: food, ore, wood
  cargo: ['food', 'ore', 'wood'],
  // Força do exército que cerca uma cidade/vila quando o batalhão chega a tempo (a defesa vira batalha). Padrão: 20
  siegeStr: 20,
  // Ações que sobram no fim do turno viram passos dos NPCs (o tempo sempre passa; 1 = sim, 0 = o mundo só anda com as ações gastas). Padrão: 1
  idleSteps: 1,
  // Luta resolvida por número (NPC contra NPC): fração da força do perdedor que o vencedor também perde, e peso do acaso (0 = vence o maior). Padrão: 0.5, 0.25
  autoLoss: 0.5, autoNoise: 0.25,
  // Layout da batalha no tile do encontro -> modo do cenário de batalha (js/local/battle.js): campo = exércitos se encontrando; defesa = inimigo entra na
  // sua cidade; invasao = você entra na cidade onde o inimigo está estacionado. Padrão: choque, defesa, ataque
  // Velocidades que o botão de configuração do mapa alterna (multiplicador da marcha e dos NPCs) e a inicial. Padrão: 0.5, 1, 2, 4 e 1
  speeds: [0.5, 1, 2, 4], speedDefault: 1,
  layoutMode: { campo: 'choque', defesa: 'defesa', invasao: 'ataque' }
};
// Regras: ações do pool no nível `lvl` e custo em ações de uma aresta do grafo.
const wtPoolMax = lvl => WT.poolByLevel[Math.max(0, Math.min(WT.poolByLevel.length - 1, (lvl || 1) - 1))];
const wtEdgeCost = e => Math.max(1, Math.ceil((e.custo || e.len / TILE_SIZE * 2.2) * (e.kind === 'estrada' ? WT.roadMul : 1) / WT.costPerAction));
