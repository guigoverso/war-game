'use strict';
// ---------- Modificadores: batalha no tile (feature 12, docs/features/12_batalha-no-tile.md, seções 4A e 4B) ----------
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo.
// Parâmetros de URL do cenário ?cenario=batalha&modo=nucleo: ?inim=N (reserva inimiga), ?reserva=N (reserva do jogador), ?alia=N (soldados de elite),
// ?vivos=N (cota de vivos do inimigo), ?vivosalia=N (cota do jogador), ?lote=3-5 (ou ?lote=4), ?atraso=S (segundos entre lotes), ?semente=N (sorteio dos lotes
// reproduzível), ?raios=0 (esconde os raios no chão). Modo choque (?modo=choque): também ?cobertura=N (total de peças de cobertura; 0 = nenhuma).

const BATTLE_MOD = {
  // Máximo de soldados inimigos vivos ao mesmo tempo, somando todos os geradores (definido em 2026-11-25). Padrão: 30
  liveCap: 30,
  // Máximo de soldados do jogador em campo ao mesmo tempo (valor próprio, 4B-11; o doc não fixa o número: proposta, independente do número de elites (BAT.elite), como no exemplo do
  // placar, para a reposição vir "à medida que morrem"). Padrão: 10
  allyLiveCap: 10,
  // Reserva inicial do inimigo (soldados ainda não lançados; 4A). Padrão: 100
  enemyReserve: 100,
  // Tamanho do batalhão do jogador: TETO que não pode ser ultrapassado (elites + comuns em campo e na reserva). A reserva dele é este total menos as elites
  // (50 = 5 elites + 45 comuns; eram 10 + 40 até 2026-11-26). ?reserva=N pode só diminuir a reserva. Padrão: 50
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
  // Cenário ?modo=choque (4B-9 e 4B-14), coordenadas do mapa de teste de 320: centro da batalha e seu raio; 3 postos do jogador (oeste) e 3 do inimigo (leste), cada
  // um a ~85 do centro, na faixa livre acima das cidades; raio em que o soldado recém-saído do posto já reage (engage), distância do centro a partir da qual ele
  // para de marchar (hold); anel de nascimento em volta do posto. Padrão: centro 205,60 raio 30; postos z 28/60/92 em x 120 (jogador) e 290 (inimigo); engage 40; hold 10
  choque: { center: { x: 205, z: 60 }, centerR: 30, playerPosts: [{ x: 120, z: 28 }, { x: 114, z: 60 }, { x: 120, z: 92 }],
    enemyPosts: [{ x: 290, z: 28 }, { x: 296, z: 60 }, { x: 290, z: 92 }], engage: 40, hold: 10, postRing: [3, 6], playerStart: { x: 132, z: 60 } },
  // Peças de cobertura do Choque (4B-14): total sorteado entre mín e máx (mesma quantidade para os dois lados: pares espelhados em volta do centro; se ímpar, uma
  // fica no eixo central), faixa de distância ao centro (mín, máx) onde nascem e folga mínima, em blocos, em relação às rotas dos postos ao centro (para não bloquear).
  // Padrão: 8 a 15 peças, distância 8 a 28, folga 6
  cover: { count: [8, 15], ring: [8, 28], routeGap: 6 },
  // Cenário ?modo=defesa (4B-10), coordenadas do mapa de teste de 320: centro do POI defendido (o jogador nasce nele, "teletransportado") e meia-pegada dele;
  // raio da área de defesa = meia-pegada + radiusPad, limitado a [radiusMin, radiusMax]; largura da zona cinza além da borda (aviso; atravessá-la = fuga = derrota);
  // distância dos 3 postos atacantes além do raio (para o tile de 384 comportá-los) e seus ângulos em graus; raio em que o soldado recém-saído do posto já reage
  // (engage) e distância do centro em que ele para de marchar (hold). Padrão: centro 205,60; pegada 20; pad 25; raio 45 a 140; cinza 20; postos a 40 além do raio, ângulos 0/150/210
  defesa: { center: { x: 205, z: 60 }, footprint: 20, radiusPad: 25, radiusMin: 45, radiusMax: 140, gray: 20, postDist: 40, postAngles: [0, 150, 210],
    engage: 40, hold: 10 },
  // Cenário ?modo=ataque (regra de 2026-11-25), coordenadas do mapa de teste de 320: POI alvo e a abertura da trilha (início; ?pos=trilha faz o jogador nascer nela, senão ele nasce na sua cidade e caminha; é onde nasce a reposição dele); guarnição do alvo sem batalhão no tile
  // (?batalhao=0) e com batalhão (completada até este teto, = cota de vivos, com soldados tirados da reserva do inimigo: total = reserva + guarnição); ?guarnicao=N força o número. Raio de alerta da guarnição (acorda e persegue; coleira x leashMul);
  // satélites: faixa de distância ao alvo dos POIs reais aceitos e postos temporários [graus, distância] em arco, que mandam reforços em lotes ao alvo; raio da área do
  // alvo (soldado de reforço preso além dele é teleportado), distância de reação (engage) e de parada (hold) dos reforços. A guarnição é conquistada ao matar o último dela.
  // Padrão: alvo 150,55; início 100,55; guarnição 12 (completada até 30 com batalhão); alerta 40; satélites a 100-150 ([-25,105], [0,125], [25,105]); área 45; engage 40; hold 10
  ataque: { center: { x: 150, z: 55 }, start: { x: 100, z: 55 }, garrison: 12, garrisonBattalion: 30, alert: 40, satRange: [100, 150],
    satTemp: [[-25, 105], [0, 125], [25, 105]], retakeR: 45, engage: 40, hold: 10 },
  // Cenário ?modo=pequena (4B-7 e 4B-16), coordenadas do mapa de teste de 320: POI principal do tile (mesmo ponto do Ataque; o jogador nasce na sua cidade); defesa local fixa
  // (?guarnicao=N força) com vida multiplicada (POI principal mais forte, 1,5 a 2x); só as elites entram (até `elites`), sem reposição; raio de alerta da defesa
  // (vale até a conquista); conquista = defesa morta. Padrão: alvo 150,55; defesa 10 com vida x1,75; elites 5; alerta 40
  pequena: { center: { x: 150, z: 55 }, garrison: 10, hpMul: 1.75, elites: 5, alert: 40 },
  // Meia-largura, em blocos, da área onde os soldados patrulham quando deixam de seguir o jogador (fim da batalha, ou antes de a defesa acordar na pequena); o
  // círculo de patrulha fica a half+5 do ponto. Padrão: 4
  standHalf: 4,
  // Cor da borda da área de defesa e da zona cinza, no chão e no Mapa M. Padrão: 0x4ac0ff e 0x9a9a9a
  defesaColor: 0x4ac0ff, defesaGrayColor: 0x9a9a9a,
  // Soldado de posto preso fora da área (Choque e Defesa): se marchando ao centro ele anda menos de `move` blocos em `time` segundos, é teleportado para `offset`
  // blocos além da borda da área, na direção em que está; se travar de novo, recua (sai da batalha e conta como baixa). Padrão: 8 s, 1 bloco, 4 blocos
  stuck: { time: 8, move: 1, offset: 4 },
  // Cor dos marcadores de cobertura no Mapa M e dos postos do inimigo (o do jogador usa a cor da facção). Padrão: '#c8c8c8'
  coverMark: '#c8c8c8',
  // Teclas de ajuste em tempo real no cenário de teste: tamanho do lote (menos, mais) e atraso entre lotes (menos, mais). Padrão: BracketLeft/BracketRight, Minus/Equal
  keys: { lotDown: 'BracketLeft', lotUp: 'BracketRight', delayDown: 'Minus', delayUp: 'Equal' },
  // Passo do ajuste do atraso em segundos e limites do lote ajustável. Padrão: 0.5, lote de 1 a 15
  delayStep: 0.5, lotLimit: [1, 15],
  // Cores dos números do placar: bandidos têm cor fixa; mortos usam a mesma cor com esta transparência. Padrão: '#d05a4a' e 0.55
  scoreBandit: '#d05a4a', scoreDeadAlpha: 0.55
};
// Verdadeiro quando o cenário de teste está no modo de batalha pedido por ?modo= (nucleo, choque, defesa, ataque, pequena).
const battleMode = () => tileTestOn() ? (new URLSearchParams(location.search).get('modo') || '') : '';

// Arredores de defesa do POI principal do tile (feature 12, passo 8; tilecompose.js `tcSurround`). Só tile de FACÇÃO (dono numérico) cujo principal é de um tipo
// de `types`: ganha uma trincheira em quadrado em volta (cenário permanente, cobertura e ambiente, sem dono nem serviço) e, onde uma estrada cruza o quadrado, uma
// barricada (só se `tileSurrWar()`; sem guerra a estrada fica livre). Tile de bandidos, neutro ou do jogador não ganha nada.
// types: tipos de principal que valem (padrão fort, fortcamp); gap: distância do quadrado à borda do POI, em blocos (9; o anel vai até 24); step: comprimento de um
// trecho (14 = os dois micro-POIs `trincheira_defesa` e `barricada_defesa`); slope: desnível máximo do chão sob um trecho (5; acima disso o trecho não nasce);
// roadClear: folga em blocos em volta de uma estrada onde o trecho vira passagem (2); testFaction: dono de facção de ?dono=faccao (1, só para testar).
// Barricadas de estrada intermediárias (só em guerra; tcSurroundRoads): roadPosts = frações do trecho entre a trincheira e a abertura onde cada estrada ganha uma (0.35 e 0.7,
// ou seja, 2 por estrada); postGap = distância mínima entre duas barricadas, em blocos (36); roadMin = folga da trincheira ao primeiro ponto possível (10).
const BATTLE_SURR = { types: ['fort', 'fortcamp'], gap: 9, step: 14, slope: 5, roadClear: 2, testFaction: 1,
  roadPosts: [0.35, 0.7], postGap: 36, roadMin: 10 };
// Há guerra entre o dono do tile e o jogador? ?guerra=1|0 força (testes); sem o parâmetro, vale a guerra ativa (warActive); a camada macro entra no passo 10.
const tileSurrWar = () => { const q = new URLSearchParams(location.search).get('guerra'); return q ? q === '1' : typeof warActive === 'function' && warActive() };
