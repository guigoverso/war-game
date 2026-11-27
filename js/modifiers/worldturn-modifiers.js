'use strict';
// ---------- Modificadores: turno do Comandante no mapa mundi (etapa 7 de docs/features/6_plano-mapa-mundi.md; camada macro, js/macro/worldturn.js) ----------
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo. Valores PROVISÓRIOS: a etapa 11 calibra.

const WT = {
  // AÇÕES do mapa por rodada, por nível da facção (índice 0 = nível 1; o último vale para os níveis acima). Uma ação = o batalhão marcha o que o movimento da
  // ação alcança e SÓ DEPOIS os NPCs dão um passo cada. Sem limite por batalhão. Padrão: 3, 4, 5, 6 e 8
  poolByLevel: [3, 4, 5, 6, 8],
  // AÇÕES da rodada 0 (preparação), no lugar do pool por nível (etapa 8.1, rodada 16 de 5_mapa-mundi.md). Padrão: 4
  prepPool: 4,
  // Ações gastas para ENTRAR no tile onde o batalhão ativo está (sair é grátis; etapa 8.1). Padrão: 1
  enterCost: 1,
  // Relógio único (etapa 8.1): o mapa mundi tem 4 partes do dia (0 Madrugada 00-06, 1 Manhã 06-12, 2 Tarde 12-18, 3 Noite 18-00) e o Campo tem horas.
  // mvPerPart = pontos de movimento gastos no mapa mundi para passar uma parte do dia (dia = 4 x isso); skipMv = movimento que "Encerrar ação" conta
  // (o tempo passa como numa marcha); look = hora (fração do dia, 0,5 = meio-dia) com que o mapa mundi desenha a luz de cada parte. Padrão: 4, 4,
  // [0.22, 0.38, 0.64, 0.88] (madrugada com o sol subindo tímido, manhã clara, tarde com o sol descendo, noite escura)
  clock: { mvPerPart: 4, skipMv: 4, look: [0.22, 0.38, 0.64, 0.88] },
  // MOVIMENTO de cada ação: o custo do terreno de cada tile é descontado dele; sem movimento para o caminho todo, o batalhão para onde deu (1 tile sempre cabe). Padrão: 6
  movePerAction: 6,
  // Custo de uma aresta do grafo em pontos de movimento = máx(1, teto(custo x multiplicador / costPerAction)). Padrão: 2.5
  costPerAction: 2.5,
  // Multiplicador do custo da estrada (a trilha vale 1): a estrada é mais barata. Padrão: 0.6
  roadMul: 0.6,
  // Batalhões (etapa 8.2): soldados do PRIMEIRO batalhão do jogo (grátis, com o kit; o comandante sozinho já é um batalhão), do batalhão de resgate (sem nenhum batalhão: só custa o ponto do Líder,
  // nasce sem soldados) e do batalhão contratado no turno do Líder (custa o ouro abaixo, mais o ponto). Padrão: 0, 0, 10
  firstSoldiers: 0, rescueSoldiers: 0, newSoldiers: 10,
  // Ouro do contrato de um batalhão novo (a tropa e o comandante; nunca vira dívida). O ponto do Líder está em ECON.act.battalion. Padrão: 1000
  newGold: 1000,
  // Doação entre batalhões na mesma cidade ou vila sua: quantos soldados passam por clique de "doar um pouco" (o outro botão passa todos). Padrão: 10
  donateStep: 10,
  // Morte do comandante: ouro perdido (o que houver, até este valor; nunca dívida) e fração do que o batalhão levava (munição) que se perde. Padrão: 150, 1
  deathGold: 150, deathAmmo: 1,
  // Morte do comandante (etapa 8.3, três formas; wtDeath). Forma 1 (tile neutro/bandidos sem tropas) e forma 2 (batalha de POI com soldados): fração da munição do
  // batalhão que se perde (o batalhão sobrevive), fração dos itens da bolsa que se perde (sorteio; armas e equipamento principal ficam) e, só na forma 2,
  // quantos soldados morrem. Padrão: 0.5, 0.25 e 10
  deathAmmoPart: 0.5, deathItems: 0.25, deathPoiSoldiers: 10,
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
// wtPoolNow: o da rodada atual (a rodada 0 usa prepPool).
const wtPoolMax = lvl => WT.poolByLevel[Math.max(0, Math.min(WT.poolByLevel.length - 1, (lvl || 1) - 1))];
const wtEdgeCost = e => Math.max(1, Math.ceil((e.custo || e.len / TILE_SIZE * 2.2) * (e.kind === 'estrada' ? WT.roadMul : 1) / WT.costPerAction));
const wtPoolNow = lvl => (typeof STATE !== 'undefined' && STATE.round < 1 ? WT.prepPool : wtPoolMax(lvl));
