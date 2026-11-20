# Tarefas: estradas sobre a água e pontes

**Status:** tarefas 1 a 5 feitas em 2026-11-20; regras finais e como testar em `fase-6-guerra.md`, seção "Pontes e estradas sobre a água" (largura 5, pedágio só em trecho reto, 0 a 3 por mapa).

## Problema
- Hoje a estrada só atravessa água se não houver jeito (o A* de `carveRoad` cobra 7× por célula de água, `world.js:305`).
- A "ponte" da estrada (`T_BRIDGE`) é um aterro sólido de altura `SEA+1`, com som de madeira, sem pilares nem corrimão.
- O POI Ponte (`pois.js`, `bridge`) é um posto de pedágio de tamanho fixo (±12 blocos) sobre um tile `T_BRIDGE` aleatório, no máximo 2 por mapa.

## O que queremos
- Estradas que atravessam a água quando é o caminho mais curto, com ponte do tamanho que o vão pedir.
- **Dois tipos de ponte:** com pedágio e sem pedágio.
- **Ponte com pedágio = POI.** No máximo **3** por mapa. As demais pontes **não são POI** e não gastam a cota de POIs.
- **A ponte pode tomar um pedaço da terra** nas pontas para completar o visual (cabeceiras, encontros, rampas).

## Como ler a coluna "Sessão"
- **Nova** = conversa nova (contexto limpo). **Continua** = mesma conversa da tarefa anterior.

## Ordem

| # | Tarefa | Tam. | Sessão |
|---|---|---|---|
| 1 | **Estrada atravessa a água** | M | Nova |
| 2 | **Registro das pontes** (`WORLD.bridges`) | P | Continua da 1 |
| 3 | **Visual da ponte** (tabuleiro, pilares, cabeceiras na terra) | G | Nova |
| 4 | **Pedágio: no máximo 3, tamanho variável** | M | Continua da 3 |
| 5 | **Verificação em várias sementes e fechamento** | P | Continua da 4 |

P = pequeno, M = médio, G = grande.

## O que fazer em cada tarefa

### 1. Estrada atravessa a água (`js/world.js`, `carveRoad`)
- Trocar o `+6` de `hv<SEA` por um custo bem menor, em constante nomeada no topo (ex.: `ROAD_WATER`), junto dos números de balanceamento. Ponto de partida: 0,5 a 1,5.
- Limitar o vão máximo (ex.: ~40 blocos de água seguidos). O A* é por célula, então o mais simples é traçar e, se o vão passar do limite, refazer com o custo antigo. Alternativa: custo crescente com a distância da margem.
- Amostrar mais de um ponto por célula de 4 blocos para não perder rios finos (hoje só o centro conta).
- Parâmetro novo em `carveRoad` (ex.: `opts.water`): as estradas de ligação dos POIs (`pois.js:616`: Fazenda, Taverna, Entreposto) **continuam só por terra** (custo alto).
- Cuidado: o multiplicador `0.35` de estrada existente faz as rotas se juntarem; conferir que isso não puxa várias estradas para a mesma ponte.
- Teste: `?seed=11&bio=forest` (o caso que gerou o pedido) e uma semente de ilhas (`seed=3`). Todas as cidades continuam ligadas (garantia da Fase 4H).

### 2. Registro das pontes (`js/world.js`)
- Ao fim de `carveRoad`, agrupar os tiles `T_BRIDGE` contínuos de cada estrada e gravar em `WORLD.bridges`: `{id, tiles:[{x,z}], len, axis ('x'|'z'|'diag'), road:[idA,idB], toll:null}`.
- Pontes de estradas diferentes que se encostam viram uma só (mesclar).
- Sem estado salvo: é regenerado pela semente (sem mexer em `SAVE_VERSION`).
- Esta lista é a base das tarefas 3 e 4.

### 3. Visual da ponte (`js/world.js` `meshTerrain`, novo desenho em `js/pois.js` ou arquivo próprio)
- **Regra de física a manter:** o terreno (`H`) continua sólido na altura do tabuleiro (`SEA+1`). Assim jogador, NPCs, caravanas e navegação continuam funcionando sem mudar nada.
- A ponte passa a ser **só visual por cima disso**: em `meshTerrain`, não desenhar topo e laterais das colunas `T_BRIDGE` sobre a água; desenhar o tabuleiro (madeira) a `SEA+1`, **pilares** a intervalos regulares até o leito, vigas e **corrimão**. A água fica visível por baixo.
- **Pegar terra nas pontas:** estender o tabuleiro 3 a 4 tiles sobre a terra em cada ponta, com cabeceira/encontro de pedra e rampa. Esses tiles viram `T_BRIDGE` (som de madeira) e a terra ao redor é nivelada ao tabuleiro. Os tiles estendidos entram em `WORLD.bridges[i].tiles`.
- Pontes diagonais: o tabuleiro segue a lista de tiles, não uma reta.
- Atenção ao custo de render (número de caixas por bloco de ponte); medir em um vão de 40 blocos.
- Minimapa (`makeMapCanvas`): `T_BRIDGE` continua com a cor de estrada.
- Som: madeira só no tabuleiro de verdade (hoje o aterro inteiro soa assim).
- Teste: andar, correr e pular sobre a ponte, cavalgar/caravana passando, pescar perto, ver de baixo (nadando).

### 4. Pedágio: no máximo 3, tamanho variável (`js/pois.js`, `genWorldPois`)
- Substituir o trecho "pontes" (`pois.js:594-606`): escolher até **3** entre `WORLD.bridges`, com vão mínimo para ter pedágio (ex.: ≥ 12 tiles), afastadas entre si (hoje 90 blocos) e dos outros POIs. Preferir as mais longas.
- Só tem pedágio a ponte escolhida: gravar `bridge.toll=poiId`. As outras **não viram POI** (não entram em `WORLD.pois`, não contam em `POI_GEN.limit`/`maxTyped`).
- O posto fica no **meio** do vão, num trecho reto (hoje exige eixo X ou Z).
- Tamanho variável: `p.len` (metade do vão + margem) usado no laço do tabuleiro de `POI_BUILD.bridge` (`pois.js:392`, hoje `-12..12`). Se a tarefa 3 já desenha o tabuleiro, o POI vira só cancela, pórticos e guarita sobre a ponte (e o laço some).
- `POI_DEFS.bridge.r` (hoje 9): conferir os usos (`taken`, `poiNear`, `poiScan`, `poiGarrisonSync`) e decidir se cresce com `p.len`.
- Número do teto (3) em `POI_GEN` (ex.: `bridgeToll:3`), junto dos outros.
- Atualizar o comentário de `POI_GEN.maxTyped` ("com ruínas e pontes o mapa fecha em até 30").
- Teste: `?cenario=pois` (ponte com pedágio aparece), `?seed=11&bio=forest`: pedágio cobrado no `round` (`poigame.js:187`), compra, guarnição.

### 5. Verificação em várias sementes e fechamento
- Rodar 6 sementes × 3 biomas: nº de pontes, vão máximo, nº de pedágios (≤ 3), cidades todas ligadas, nenhum POI dentro de água ou em cima da ponte sem querer, tempo de geração.
- Saves antigos: o mundo é regenerado pela semente, então estradas, POIs e caravanas **mudam de lugar**. Decidir se bumpa `SAVE_VERSION` com aviso ou aceita (o projeto já disse que saves antigos não importam por enquanto; confirmar).
- `tests/smoke.js`: acrescentar checagem de `WORLD.bridges` e do teto de 3 pedágios.
- `docs/MAPA.md` (`WORLD.bridges`, funções novas), `docs/fase-6-guerra.md` (tabela de tipos: Ponte), roteiro de teste, `/encerrar-sessao`.

## Dependências
- **2** depende de **1**; **3** e **4** dependem de **2**.
- **3** e **4** mexem em `POI_BUILD.bridge`: fazer a 3 antes evita retrabalho na 4.
- **5** é a última.

## Riscos
- **Visual (tarefa 3)** é a parte grande e a mais arriscada: o terreno é mapa de alturas, então o vão aberto é só aparência. Por isso a física continua no aterro.
- **Mudar o custo da água muda as estradas de todas as sementes** (mundos diferentes dos que você já conhece).
- **Pesca:** ponte longa corta lagos e pontos de pesca (`genFishSpots`); conferir.
- **Estradas se juntando** na mesma ponte (multiplicador `0.35`) pode concentrar o trânsito de caravanas em um ponto.
- **Raid/emboscada em ponte** (caravanas) não foi estudado: conferir `roadSpot` e `caravanAttacked` com vãos longos.
