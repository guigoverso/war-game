# Como as cidades são feitas hoje (sessão 4.0)

Documento de leitura para as sessões 4B (cidade enorme) e 4C (vila). Descreve o código **como está em 2026-11-23** (branch `mapa-mundi-update`, geração por reserva ligada por padrão). Nada aqui é mudança de código. Números de linha são aproximados; os nomes de função são o que vale. Onde algo é inferência e não foi medido, está marcado **(não medido)**.

## 1. Visão geral: do `genWorld` à cidade pronta

`genWorld` (`js/local/world.js`) é uma sequência de seis etapas, cada uma uma função `world*Stage` que recebe o contexto `X`:

| Etapa | Função | O que faz com as cidades |
|---|---|---|
| 0 | `worldInit` | zera o mapa, aloca `H` (altura), `T` (tipo de bloco), `B` (bioma); escolhe a janela do mundo se `?mundo=1`/`?cenario=tile` (`mapWindowPick`) |
| 1 | `worldReliefStage` | `genRelief(RP,null)`: terreno **rascunho** (sem reservas) |
| 2 | `worldCitiesStage` | acha candidatos, **sorteia locais**, cria os objetos de cidade, **reserva** (`reserveCities`), gera o relevo de novo com as cidades (`genRelief(RP,cities)`), define cidade inicial, rank, nome, facções e estilo |
| 3 | `worldRoadsStage` | `cityFootGates`, arestas de estrada, `reservePlanRoads`, `reservePois`, terceira passada `genRelief(RP,cities,plan,pois)`, `reservePaintRoads` |
| 4 | `worldBuildStage` | conta litoral, `cityTypePlan` (tipo econômico), **`buildCity`** de cada cidade |
| 5 | `worldNatureStage` | guarda `WORLD.snap`, POIs, árvores/pedras (`genDecor`) |
| 6 | `worldMeshStage` | `meshTerrain`, `makeMapCanvas` |

Depois da geração, `populateCities` (`js/local/entities.js`) cria moradores, guardas e soldados, e `buildNav` (`nav.js`) monta a grade de navegação.

**Regra central: "reservar primeiro, esculpir depois"** (feature 7, `7_cidades-por-reserva.md`). O terreno é gerado **três vezes** (cada `genRelief` roda `reliefTerrain` inteiro de novo, **não medido**, mas é a razão provável do custo do relevo):
1. rascunho, sem nada;
2. com a pegada das cidades como chão plano (`stamps`);
3. com os corredores de estrada, pontes e plataformas de POI.

A cidade só é *construída* (casas, muro) depois do terreno final. Tudo o que a cidade precisa do chão (altura `c.y`, pegada, níveis `c.lv`, borda, portões) já foi decidido nas etapas 2 e 3.

Com `?reserva=0` volta o gerador antigo (`cityFootPlan` + `cityFootFlatten` depois do relevo, `carveRoad` pintando na hora). `tileTestOn()` (`?cenario=batalha`) e `?cenario=pois` (`showcaseMode`) **desligam** a reserva e a pegada: a cidade é um **quadrado** (`c.foot=null`).

## 2. O objeto de cidade `c`

Criado em `worldCitiesStage` (≈ linha 276). Campos principais:
- Posição e tamanho: `cx,cz` (centro de mundo, **a praça**), `half` (raio da caixa quadrada), `half0` (raio sorteado, 36 a 45 por `rng.int(36,45)`; `half` cresce se a praça sai do centro da pegada).
- Dono/ordem: `id`, `owner` ('player'/'enemy'), `home`, `rank` (1 a 6, por distância à cidade inicial), `style` ('ordenada'/'mista'/'caotica'), `type` ('cidade' ou 'fortaleza' se rank ≥ 5), `ctype` (tipo econômico: fazenda, mina etc., de `cityTypePlan`), `biome`.
- Pegada e chão: `foot` (grade `(2*half+1)²` de 0/1, índice `(z+half)*N+x+half`, coordenadas **locais**, centro = praça), `poff` (deslocamento da praça), `y` (altura base do chão plano), `lv` (nível ±blocos de cada ponto, `Int8Array`, só com `CITY_MULTI.on`), `lvEdge`, `lvCap`, `lvLock`, `fdist`/`fM` (distância à pegada, em grade `NM=2M+1`), `mtn` (lados de montanha), `gedge`/`gland` (borda por eixo e portões abertos), `gates` (portões que ganharam estrada).
- Construção: `streets`, `houses`, `walk` (pontos de passeio), `specials`, `keepers`, `doors`, `towers`, `wall`, `hall/store/warehouse/shop/clinic/barracks/chapel` (posições dos serviços), `spawns`, `npcs`, `enemies`.

**Convenções de coordenadas:** *local* = relativo a `(cx,cz)`, usado por `cityIn`, `setTL`, `Bc`, `fillT`; *mundo* = índice de `H`/`T`. `Bc(c,x0,y0,z0,x1,y1,z1,...)` desenha caixas em coordenadas locais com y relativo a `c.y`; com `BX_LIFT=c` (ligado dentro de `buildCity`) `Bx` e `addCol` somam o nível `c.lv` do ponto, então as casas acompanham as plataformas.

Tipos de bloco (`T`, `world.js` linha 3): `T_NAT` natural, `T_ROAD`, `T_STREET` (rua da cidade), `T_PLAZA`, `T_FLOOR`, `T_BRIDGE`, `T_GARDEN`, `T_SOIL`, `T_WHEAT`, `T_OUT` (**temporário**, ver §4).

## 3. Reserva e pegada (`reserve.js`, `cityfoot.js`)

### 3.1 Escolha do local (`worldCitiesStage`)
- Candidatos `cand`: pontos aleatórios com ≤ 10 amostras molhadas num raio de 40 e desnível ≤ 28 (relaxa ×1,6 até haver 700).
- `pickSites(MIND=220)`: o primeiro é aleatório; os seguintes maximizam a distância às já escolhidas, com penalidade de desnível (`c.rough * RESERVE.roughPenalty` = 0,15) e bônus de água (`reserveWaterScore`, até `RESERVE.waterBonus` = 60; 70% das cidades preferem margem a 12 blocos). Se não couberem `MINC` (6), a distância mínima desce de 10 em 10 até 64. Último recurso: ponto qualquer em terra.
- Número de cidades: terra ÷ 48 mil, entre 6 e 8 (`?cid=N` força).
- Com janela de tile (`X.win.tile`): **1 cidade**, `mapTileSite` (centro da janela ou o candidato mais perto do centro).

### 3.2 Pegada (`cityFootPlan`, `cityfoot.js`)
1. Procura o melhor chão: testa deslocamentos do centro até `CITY_FOOT.nudge` = 40 (passo 4) e escolhe o que tem mais células boas (`cityFootCell`: terra, desnível ≤ `maxDev` × fator, `beach` blocos de terra até a água). O **núcleo** (`coreX`=16 × `coreZ`=23, ≈ praça + prédios dos cantos) tem de ser inteiro terra firme. `CITY_FOOT.relax` afrouxa em 4 etapas.
2. **Praça fora do centro:** `plazaOff` = 0,5 (com 2 intensidades, 0,5 e 0,3). O contorno é centrado num ponto deslocado `(ox,oz)`; `half = half0 + max(|ox|,|oz|)`.
3. **Contorno irregular:** raio relativo `shapeBase + shapeNoise*(ruído-0,5)` limitado a `[shapeMin,1]`, norma 4 (quase quadrado arredondado). O núcleo sempre entra.
4. Limpeza: só o pedaço ligado ao centro; abertura (tira pontas e fios de 1 bloco) e devolve uma camada. Resultado em `c.foot`.

### 3.3 Verificação no rascunho (`reserveCities`, `reserve.js`)
Para cada cidade com mais de `RESERVE.maxInvented` = 15% da pegada+faixa plana (`apron` = 4) em água no rascunho (`reserveInvented`): encolhe de 4 em 4 até `minHalf` = 28 (`half0`), depois tenta outro ponto candidato (`cityFootRelocate`: até 300 tentativas, a ≥ 140 das outras), até `maxRounds` = 5. As que sobram ruins são removidas se ainda sobra `MINC`. Resumo em `WORLD.reserve`.

`reserveMountains`: lados onde o terreno além da borda é ≥ 6 (`mtnRise`) mais alto que a cidade podem ficar **sem rampa** (montanha natural, até 2 lados, 80% de chance); portão fechado nesses lados.

### 3.4 Terreno final (`cityFootFlatten`, `genRelief`)
Cada `genRelief(RP,cities)` chama `cityFootFlatten(c,RESERVE.apron)`:
- chanfro (distância aproximada) até a pegada (`d`) e até a água (`dw`) numa grade `NM = 2(half + ramp 20 + apron 4) + 1`;
- `c.y` = média da pegada, limitada por `SEA+2` e pela distância da água (`shoreSlope` = 1 bloco/bloco);
- com `CITY_MULTI.on`: `cityHeightMap` gera `c.lv` (ondulação ±4 por ruído de valores, praça plana de 13, borda de 7 blocos de volta ao 0, bairro baixo na margem, inclinação ≤ 0,3, e sobe em direção a lados de montanha);
- dentro da pegada `H = c.y + lv`; faixa plana (apron) em `c.y`; depois **rampa de 20 blocos** ligando ao relevo (ou encosta íngreme nos lados de montanha).
O ruído é determinístico (`WORLD.seed`, `c.id`), por isso repetir a passada dá o mesmo resultado.

`cityFootGates` (chamada em worldRoadsStage e de novo depois da 3ª passada): `c.gedge` = distância do centro até a borda em cada eixo (E/W/S/N); `c.gland` = portão com ≥ 8 blocos de terra do lado de fora e sem montanha; sempre sobra ao menos um aberto. `cityGatePos(c,d,off)` dá o ponto de mundo `off` blocos além da borda.

## 4. Estradas e pontes (`reservePlanRoads`, `carveRoad`)
- `roadEdges`: árvore geradora mínima + até 2 atalhos curtos + garantia de conexão.
- Por aresta, `roadTiles` (A* numa grade de 4 blocos, custo por desnível, água e proximidade de cidade) escolhe **o portão** de cada ponta: o eixo que mais aponta para a outra cidade **e** está aberto (`c.gland`), a 3 blocos da borda (`gates.push({dir})`).
- `reservePlanRoads` (modo reserva) não pinta nada: monta o corredor (altura suavizada, janela de 11, ±1 por bloco; ponte com tabuleiro reto, `BRIDGE_HEAD` blocos de cabeceira; água curta ≤ `ROAD_FILL_MAX` = 4 vira aterro). Portões abertos sem estrada ligam-se à estrada mais próxima (até `RESERVE.gateLinkMax` = 40, sem ponte). `reservePaintRoads` pinta `T_ROAD`/`T_BRIDGE` depois.
- Sem reserva: `carveRoad` faz o mesmo pintando na hora.
- Em tile de janela: `tileTrailLinks` (`mapwin.js`) liga cada abertura da borda a um portão aberto.

## 5. `buildCity(c,rng)` passo a passo (`js/local/city.js`, ≈ linhas 573 a 1125)

Entradas: `c.half`, `c.foot`, `c.y`, `c.lv`, `c.gedge`, `c.gland`, `c.gates`, `c.style`, `c.rank`, `c.ctype`. Semente: `RNG(seed*31 + id*977 + 5)`.

1. **Paleta e proporções** (por bioma e estilo): `S` (meia-largura da rua principal: 2 ordenada, 1 caótica, 1 a 3 mista) e `P` (meia-largura da praça, 8 a 11).
2. **Reservas dos cantos:** quatro retângulos `spRects` ao redor da praça onde ruas não passam.
3. **Ruas** (`streets`, lista de retângulos `{x0,x1,z0,z1}`): sempre uma cruz central da borda à borda da **caixa** `half`; mais conforme o `layout`: `grid` (ruas paralelas a cada 16-18 blocos, ordenada), `ring` (anéis), `double`, `cross`, `organic` (braços que serpenteiam ±6 e 12 a 18 ramais de 8 a 20 blocos). Estilo ordenada → grid/ring; caótica → organic/cross; mista → qualquer.
4. **Rede única:** componentes soltos são ligados ao principal por corredores em L (laço de até 30 voltas, comparação par a par de pontos).
5. **`cityMarkOut`:** todo bloco natural **fora da pegada** vira `T_OUT` até o fim (nada é construído ali; `outAny` consulta isso). **`cityUnmarkOut`** devolve no fim.
6. **Pintura:** `fillT(...,T_STREET,inFoot)` só dentro da pegada; pontas de estrada fora do portão (`T_ROAD`, 4 blocos) só nos portões com estrada (`used`); praça (quadrada ou redonda) com borda de rua; rua reta da praça a cada portão aberto; **`cityStreetLevels`** nivela cada rua na largura inteira (cada rua trava os níveis, `lvLock`).
7. **Praça:** peça central (fonte, estátua, poço ou árvore), bancos sorteados, canteiros, lampiões; lampiões ao longo das ruas (se não for organic).
8. **`res`** é a lista de retângulos reservados (ruas, praça, entradas). Princípio: nada novo se constrói sobre `res` nem sobre `houses` (+ vão `houseGap` = 2).
9. **Quatro prédios especiais** (loja/armeiro `shop`, clínica, capela, quartel), um por canto: com pegada, `spreadLot` sorteia um lote longe da praça (≥ `P+6`) e dos outros serviços (≥ `serviceSpread` = 18), até 1500 tentativas; sem lote cai no canto da praça. `cityLot` cria a plataforma plana do lote (no modo multinível). `makeBuilding` + interior; guardam `c.shop`, `c.clinic`, `c.barracks`, `c.chapel` e **guardiões** `c.keepers` (lojista, enfermeira, guarda).
10. **Serviços de grande porte** procurados **antes** das casas, em lotes sorteados: prefeitura (`hall`, 11×9 de 2 andares, senão 9×7), `store`, `warehouse`, `tavern` (12×9 etc.), e o edifício do tipo (`works`, `WORKS[ctype]`). Se algum não couber, vira peça solta na praça (quadro de avisos, caixotes, barraca de mercador) mais seu guardião.
11. **Casas:** meta `target = área da pegada ÷ CITY_FOOT.density` (150). (a) ordenada: fileiras regulares ao longo das ruas; (b) demais: fachadas ao longo das ruas com recuos e larguras variados, depois até 3000 sorteios de lotes aleatórios `lotAt` dentro de `fcs` (lista de blocos da pegada) até `houses.length ≥ target + 4`. `tryHouse(r,sp)` aplica as regras (§6) e constrói.
12. **Última checagem de ruas soltas** (até 12 voltas, caminho em L ou busca em largura).
13. Moinho (planície/floresta), **`cityDecor`** (lavouras, cercados com animais, piquenique, lagoa, jardim, feira, etc. nos espaços livres).
14. **Muro:** `cityWallBuild` → `cityWallDraw`: anel de blocos **fora da pegada, colados a ela** (inclusive diagonal), em terra, fora dos portões e fora de estrada/ponte (o muro abre onde há estrada). Tipo por nível (`CITY_WALL_BY_LEVEL`) ou por rank na geração (rank ≥ 5 pedra/paliçada; 3 e 4 cerca; 1 e 2 nada; capital nasce sem muro). Portões = dois pilares e viga em cada eixo aberto; torres 3×3 (`towerGap` 24, `towerMax` 20) nos portões e ao longo do anel. `cityWallDrawBox` é o muro quadrado antigo (sem pegada). O muro fica numa malha própria, para poder ser refeito ao evoluir (`cityWallRebuild`).
15. Mastros com bandeira da facção nos portões; adereços (caixas, barris, sacos, feno) nas ruas e na praça; árvores e arbustos soltos; campos de trigo fora do muro (planície/floresta).
16. **Fim:** `BX_LIFT=null`, `cityUnmarkOut`. **`c.walk`**: um ponto a cada 2 blocos sobre `T_STREET`/`T_PLAZA` sem colisão. `c.gateSpots` (um ponto por portão aberto), `c.specials`.

## 6. Regras de colocação (`tryHouse`, `lotDoor`)
Um lote `r` só é aceito se: (1) cabe a ≥ 3 blocos da caixa `half` (`rej(1)`); (2) não toca `res` (`rej(2)`); (3) tem vão `houseGap` dos outros prédios (`rej(3)`); (4) não pisa em `T_OUT` (`rej(8)`); (5) `lotDoor` acha uma rua a ≤ `maxBd` blocos (9 caótica, 8 mista, 5,5 ordenada) e traça um caminho até ela sem passar por outra casa nem por `T_OUT` (`rej(4,5,6,7)`); (6) para serviços, respeita `svcFar`. `c.rej` guarda as contagens por motivo (útil para medir).

## 7. Moradores, soldados e serviços (`entities.js`, `allies.js`)
`populateCities` (por cidade, semente `seed*13 + id*101 + 9`):
- `c.keepers` viram NPCs parados (lojista, enfermeira, guarda do quartel, líder, taverneiro).
- **Civis:** 26 a 34 na capital, 14 a 20 nas outras, sorteados em `c.walk` a ≥ 3,2 de outro.
- **Capital:** guardas nos `gateSpots`.
- **Outras cidades:** `8 + 3*rank` inimigos: atiradores nas torres (`rank ≥ 3`: 4, ou 8 com `rank ≥ 4`), golens (rank ≥ 4), resto sorteado entre soldado, cão, aranha, brutamonte, robô e atirador (pesos por rank), colocados em `c.walk`.
Os números do plano 4B/4C (cidade enorme com 10 soldados fora de guerra; vila com 3 a 6) **substituem** essa fórmula; ela é local a `populateCities`.

Serviços do jogador (`c.store`, `c.warehouse`, `c.tavern`, `c.hall`, `c.shop`, `c.clinic`, `c.barracks`, `c.chapel`) são posições que as telas e interações (`game.js` `doInteract`, `store.js`, `warehouse.js`) consultam; a cidade precisa de **todos** para o loop do jogo funcionar (os fallbacks da praça existem por isso).

## 8. Navegação e colisão
Prédios, muros e torres registram caixas de colisão `Col`; `buildNav` (`nav.js`) bloqueia, na grade `W×W`, qualquer célula coberta por uma caixa que atrapalha (altura entre `h+0,45` e `h+1,8`). A* (`findPath`) com **orçamento de `NAV.budget` = 3 buscas por quadro** (`nav.js`, linha 3). Degrau máximo na linha de visão: 1 bloco, por isso `CITY_MULTI` limita ruas e plataformas a ±1 por bloco. NPCs só aparecem a ≤ 120 blocos do jogador, inimigos a ≤ 150 (`updateActors`).

## 9. Modificadores e onde estão
- `js/modifiers/city-modifiers.js`: **`CITY_FOOT`** (pegada, densidade, vãos, torres, serviços, `plazaOff`), `CITY_WALL_BY_LEVEL`, `CITY_SENTRY_*`, `CITY_UP_COST`/`cityCostOf`.
- `js/modifiers/reserve-modifiers.js`: **`RESERVE`** (reserva, montanha, água, POIs), **`RIVER`**, **`CITY_MULTI`** (relevo da cidade), `reserveOn()`, `poiReserved()`.
- Números **soltos no código** (não são modificadores, são o que 4B/4C vão precisar parametrizar): `rng.int(36,45)` do tamanho (world.js ≈ 278); `S` 1 a 3 e `P` 8 a 11; dimensões fixas dos 4 serviços (`shop` 9×7, clínica 8×7, capela 7×8, quartel 9×7); lotes de prefeitura (11×9...), armazém (8×6...), taverna (12×9...); `stepO` 16 a 18 e ramais 8 a 20 das ruas; `P+12`/`Hc-4` nos passos dos layouts; busca de lote até `Hc-3` da caixa; 4 campos de trigo a `Hc+7..9`; `10 + ...` de adereços (`propMax` 90/24/70, `treeN` 140/30/110); recorte `-Hc+3`/`Hc-3` em vários lugares. Tudo isso foi calibrado para `half` 36 a 45 (caixa de 73 a 91 de lado).

## 10. O que muda para uma cidade enorme (lado 243 a 297) e para a vila

Observações de leitura, para orientar 4B e 4C. **Nada foi medido** aqui; os números de tempo vêm da linha de base do `ESTADO.md` (mapa 704 gera em 7,7 a 10,9 s).

**Custo que cresce com a área (cidade enorme: caixa ≈ 3 a 4 vezes mais larga, área ≈ 9 a 16 vezes maior):**
- `genRelief` roda 3 vezes; `cityFootFlatten`, `cityHeightMap` e o chanfro são `O(NM²)` por cidade e rodam em **cada** passada.
- `cityFootPlan`: o teste de núcleo e de células cresce com a caixa; o laço de deslocamento (21×21 pontos) multiplica.
- `buildCity`: (a) o laço de componentes de rua compara todos os pares de pontos de dois pedaços (`O(n·m)` por volta); (b) `res.some(ovr)` e `houses.some(ovr)` são varreduras lineares dentro de laços de milhares de tentativas, e a lista cresce com a cidade; (c) as listas de candidatos da prefeitura/serviços (`for hx,hz`) têm `(2Hc)²` itens, embaralhadas e cortadas em 700; (d) `cityLot`/`cityLvRing` fazem janelas de `(2R+3)²` por lote; (e) `fcs` guarda todos os blocos da pegada.
- `NAV.budget` fixo em 3 buscas por quadro e A* (não verifiquei se há teto de distância): mais NPCs e caminhos mais longos pesam no quadro. `c.walk` cresce com a área (um ponto a cada 2 blocos).
- A pegada, o `lv`, o `fdist` e `lvEdge` são arrays de `N²`/`NM²` por cidade (para half 150: `N` = 301, `NM` = 349).

**Coisas que não escalam sozinhas (precisam de regra nova):**
- Ruas: cruz central + layouts calibrados para 73 a 91. Para blocos e várias praças (4B) o plano é novo; hoje a única praça fica em `(0,0)`.
- Serviços: 4 prédios especiais + 5 grandes ficam espalhados por `serviceSpread` = 18 num quadrado ≈ 80; numa cidade de 270 ficariam amontoados perto do centro ou exigiriam outro valor.
- Muro e torres: `towerMax` 20 e `towerGap` 24 dão pouca torre para o perímetro de uma cidade enorme.
- `populateCities`: civis 14 a 20 em 80×80 viram quase ninguém em 270×270; a fórmula de população é por rank, não por área.
- `target = área ÷ 150` já escala a quantidade de casas, mas as 3000 tentativas de preenchimento (e `houses.length < target + 4`) podem não bastar.
- Mapa maior que o tile: o tile da etapa 4 tem 384 de lado; uma cidade com `half` até ~150 + rampa 20 + faixa 4 ocupa 40% a 60% dele. `cityFootPlan` exige `cx,cz` ≥ 80 da borda do mapa (`c.cx<80||...>W-80`) e `cityFootCell` ≥ 4: com tile de 384 e cidade de 297 isso **não cabe**; o limite de 80 precisa virar função do tamanho da cidade.
- `RESERVE.minHalf` = 28 e o sorteio 36 a 45 são hard-coded para cidades pequenas.
- `reserveInvented` varre `(2Hc+2A+1)²` com `cityIn` aninhado (`near`), `O(N²·A²)` na pior hipótese: para a cidade enorme precisa de uma versão com chanfro.

**Vila (4C):** a maior parte de `buildCity` assume rua + praça + quatro serviços. Uma vila sem ruas (só estradas de terra ligando as casas e cercas) pula os passos 3, 4, 6 (parte), 7 e 14 e troca o muro por cercas; a prefeitura/armazém/loja/taverna precisam existir em versão reduzida (a regra de fallback na praça já cobre isso). O gerador de casas (`tryHouse`) e de lotes (`lotDoor`) depende de ter uma rua (`streets`) para ancorar a porta: numa vila a "rua" é a estrada, então vale reaproveitar a lista `streets` com retângulos finos de estrada em vez de reescrever `lotDoor`.

## 11. Armadilhas conhecidas
- Dois lugares conhecem o tipo de muro por nível: `CITY_WALL_BY_LEVEL` (nível) e o sorteio por rank em `buildCity`. A capital nasce sem muro.
- `c.half` **não é** o raio da pegada: é o raio da caixa (POIs, raids, missões e `cityNear` usam a caixa). A pegada pode ter buracos e cantos recortados.
- `cityMarkOut` é temporário: qualquer erro no meio de `buildCity` deixa `T_OUT` no mapa (a função não tem `try/finally`).
- `BX_LIFT` é global: tem de voltar a `null` ao final (o `buildCity` não tem `try/finally`).
- `genRelief` com `stamps` reaplica `cityFootFlatten`; `cityLot` e `cityStreetLevels` mexem em `H` e `c.lv` **depois**, em `buildCity`. Quem mexer no chão da cidade tem de respeitar essa ordem (e `lvLock`).
- `cityFootPlan` **move** `c.cx/c.cz` (até 40 blocos): nenhum código pode guardar o centro antes da reserva.
- Cenários (`?cenario=batalha`, `?cenario=pois`) e `?reserva=0` seguem caminhos antigos (cidade quadrada): qualquer mudança em `buildCity` deve continuar funcionando com `c.foot=null`.

## 12. Para medir antes de mexer (sugestão para a 4B)
1. Tempo por etapa de `genWorld` (já há `WORLD.reserve.ms`, `msRoads`, `msPois`; falta o tempo de cada `buildCity`).
2. `c.rej` por cidade, contagem de casas e serviços achados (`tests/reserva/foot-check.js`).
3. Tamanho de `Col.all` e tempo de `buildNav` com uma cidade enorme.
4. FPS com a cidade cheia (população de 10 soldados + civis proporcionais).
