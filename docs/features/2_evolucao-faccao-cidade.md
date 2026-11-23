# Evolução da facção e das cidades: tarefas

Origem: pedido de 2026-11-21 (feature 16 e 35 de `docs/fase-6-guerra.md`: "nível do líder com efeito"). Escrito em 2026-11-21.
**Resumo:** hoje o jogador paga para evoluir a **capital** (`rd.lvl`, 1 a 4, dá ações por rodada) e as outras cidades (`rd.clv`, 1 a 3, só desconto nas lojas). Passa a valer: o jogador evolui a **facção** (nível 1 a 5, que dá as ações e, na guerra, os pontos de líder) e, à parte, **cada cidade sua** (inclusive a capital) evolui de nível, mudando de aparência (cerca, muros de madeira, atiradores, muralha de pedra) e rendendo mais.

## Regras decididas (do usuário)
**Nível da facção (jogador), 1 a 5.** Requisitos cumulativos para subir:
| De → para | Requisito (soma o anterior) |
|---|---|
| 1 → 2 | ouro (quantia grande) + recursos |
| 2 → 3 | ouro + recursos + **2 POIs** seus |
| 3 → 4 | idem + **2 cidades a mais** (3 cidades suas, contando a capital) |
| 4 → 5 | idem + **3 cidades no nível máximo** (contando a capital) |

**Nível da cidade (jogador).** Paga ouro + recursos; a cidade muda de aparência e rende mais recursos e impostos. A capital começa no mais simples (**sem cerca**) e pode chegar a **muralha de pedra com atiradores**.
**Limites:** **1 nível de facção por rodada**; **1 nível de cidade por rodada, em 1 cidade só**. **NPCs não evoluem cidade.**

## Decisões minhas (a confirmar; pode mudar sem refazer o plano)
- **Níveis de cidade: 1 a 5** (`LVL.cityMax = 5`, definido pelo usuário em 2026-11-21): 1 sem muros · 2 cerca · 3 muros de madeira (paliçada, sem atiradores) · 4 muros de madeira **com atiradores** · 5 muros de pedra com atiradores. [OK]
- **Cidades NPC (aparência, não evoluem):** rank 1-2 → nível 1, rank 3-4 → nível 2, rank 5-6 → nível 4 se o muro sorteado for paliçada ou **5** se for pedra. Hoje todas as paliçadas já têm torres com atiradores, então o nível 3 (paliçada sem atiradores) só existe para o jogador. [OK]
- **Cidade anexada** (hoje só pelo modo criativo, `polTakeCity`) começa no nível pelo mesmo mapeamento do `rank` (e pelo muro que ela já tem) e **a aparência não regride**; só muda ao evoluir. [OK]
- **`rd.lvl` continua sendo o nível da facção** (agora 1 a 5, `LVL.facMax`; `maxActions()` segue = nível). Não precisa migrar saves: nível ≤ 4 continua válido. `rd.clv[id]` passa a valer também para a **capital** (antes ela usava `rd.lvl`); capital sem entrada em `clv` herda o `rd.lvl` antigo (1 a 4) na primeira leitura (migração preguiçosa). [OK]
- **Evoluir não gasta ação do líder** (o freio passa a ser o limite de 1 por rodada); `ECON.act.capital` e `ECON.act.city` vão para 0. Se preferir manter o gasto de 1 ação, é só trocar o número. -> Gasta sim. Mas se o jogador tiver 2 ações do líder e recursos para evoluir a cidade ou facção 2 vezes ou mais, não poderá, fica o limite de 1. Ele pode evoluir cidade e facção na mesma rodada.
- **Efeito da cidade por nível acima de 1:** + produção e + imposto (como se o nível fosse o `rank` que as NPC têm hoje: `prodRank` 1 e `taxRank` 10) (**sem desconto de loja**: o buff foi retirado em 2026-11-21, `ECON.cityDisc` e o efeito `clv` não existem mais). Números iniciais em `LVL`, a calibrar. [OK]
- **Números iniciais (sugestão, calibrar jogando):** facção: 1→2 ◉900 + 20 comida + 20 minério · 2→3 ◉1800 + 40 + 40 · 3→4 ◉3000 + 40 madeira + 40 couro (além dos anteriores) · 4→5 ◉4500 + 60 de cada. Cidade: 1→2 ◉400 + 10 madeira · 2→3 ◉800 + 20 madeira · 3→4 ◉1200 + 30 madeira + 10 minério · 4→5 ◉2000 + 30 madeira + 40 minério. Como o máximo agora é a muralha de pedra, o requisito "3 cidades no nível máximo" (facção 4→5) fica bem mais caro: **calibrar**. Ficam num objeto `LVL` em `js/econ.js`, perto do `ECON`. -> [OK]
- **Aviso de risco:** os requisitos 3→4 e 4→5 exigem **mais cidades**, e hoje só o modo criativo anexa cidade (a conquista vem com a guerra). Até a guerra existir, esses dois níveis só se alcançam no modo criativo (`?auto=1`). Não bloqueia as tarefas abaixo. -> [OK]

## Código envolvido (achado em 2026-11-21)
- `js/econ.js`: `CAP_MAX_LVL=4`, `CITY_MAX_LVL=3` (passam a `LVL.facMax=5` e `LVL.cityMax=5`), `cityLvl`, `cityUpCost`, `capCost`, `maxActions`, `prodOf`/`taxOf`/`shopFull` (usam `c.rank`; capital tem `rank=0` e conta como 1), `ECON.act`, `ECON.cityUp`, `ECON.cityDisc`, `addPriceFx('clv')`.
- `js/book.js`: tela da cidade (linhas ~73-76, "Evoluir a cidade"), tela da capital (~113-115) e os cliques `cap`/`cityup` (~161-167).
- `js/city.js` `buildCity` (~836-900): muro decidido por `c.rank`/`c.home` na **geração do mundo**, desenhado em lote (`Bc`/`Bx`) junto com o resto da cidade e com colisões (`addCol`). **Não há como redesenhar uma cidade em jogo hoje**: é o ponto mais arriscado do plano.
- Quem lê `rd.lvl` ou `cityLvl` e precisa ser revisto: `factions.js:199` (poder da facção), `missions.js:22` (`msLevel`), `poigame.js:37` (`poiLvl`), `rebellion.js:258` (força `lvl=2`), `scenario.js:32` (cenário com `lvl=3`), `game.js:290` (botão de teste `cActions`).

## Regras gerais
- Só **acrescentar** campos; ausentes = padrão. Mudar o save? Só se a migração preguiçosa da capital não bastar (então somar 1 a `SAVE_VERSION` e passo em `migrateSave`).
- Números novos em `LVL` (`js/econ.js`); textos novos em `js/texts.js` (feature nova, mas siga o padrão do CLAUDE.md para o que for criado); atualizar `docs/MAPA.md`.
- **Avisos na tela:** cada tarefa lista os que vão aparecer; não criar outros. Eventos vão para o relatório da rodada (`rdNow`), sem toast; só o clique do jogador tem toast.
- Terminar cada tarefa com `node tests/smoke.js`.

## Ordem

| # | Tarefa | Tam. | Sessão |
|---|---|---|---|
| 1 | **Modelo de dados: níveis, custos e requisitos** | M | Nova |
| 2 | **Efeito do nível da cidade (produção, imposto, desconto)** | P | Continua da 1 |
| 3 | **Visual da cidade por nível (muros e atiradores)** | G | Nova |
| 4 | **Evolução de cidade (tela e ação, 1 por rodada)** | M | Nova |
| 5 | **Evolução da facção (tela e ação, 1 por rodada)** | M | Continua da 4 |
| 6 | **Fechamento** | P | Continua da 5 |

P = pequeno, M = médio, G = grande.
**Dependências:** 2, 3 e 4 dependem da 1. A 4 só mostra a mudança visual depois da 3 (antes dela a evolução funciona, mas a cidade não muda de cara). A 5 depende da 1 e do `cityLvl` unificado. **A 3 mexe só em `city.js` e as outras em `econ.js`/`book.js`: pode ser feita em paralelo com a 2, 4 e 5 em outra sessão** (se houver paralelismo, cada uma em uma worktree).
**Por quê:**
- **1 (Nova):** é a fundação; contexto limpo, lendo `econ.js`, `state.js` e `save.js`.
- **2 (Continua da 1):** mesmas funções (`prodOf`, `taxOf`, `cityLvl`) já lidas.
- **3 (Nova):** área totalmente diferente (geração de cidade em `city.js`, malhas, colisões, guardas); a mais pesada e a única com risco técnico real. Ao começar, investigar primeiro como remover malhas e colisões de uma cidade e só então desenhar.
- **4 (Nova):** UI do livro (`book.js`) e ações do líder; não aproveita nada da 3.
- **5 (Continua da 4):** mesma tela e mesmos arquivos; reaproveita a checagem de limite por rodada.
- **6 (Continua da 5):** só docs e smoke, com o que foi feito ainda na conversa.

## O que fazer em cada tarefa

### 1. Modelo de dados: níveis, custos e requisitos
- Criar o objeto `LVL` em `js/econ.js`: `facMax` (5), `cityMax` (5), tabelas `facCost[lvl]` e `cityCost[lvl]` (ouro + recursos, no formato que `Ledger.spend` já aceita: `{gold, food, ore, wood, leather}`), `facReq[lvl]` (POIs, cidades, cidades no máximo), e os efeitos por nível de cidade (`cityProd`, `cityTax`; o desconto continua `ECON.cityDisc`). Remover `ECON.capital`/`ECON.cityUp` e as constantes `CAP_MAX_LVL`/`CITY_MAX_LVL` (substituir por `LVL`; atualizar quem as usa).
- **`cityLvl(c)`** passa a servir **todas** as cidades do jogador, capital incluída: `STATE.rd.clv[c.id]`, com padrão 1 (capital sem entrada herda `rd.lvl` antigo (1 a 4); cidade anexada herda pelo `rank`/muro, ver acima). NPC devolve 1 (não evoluem). Gravar na primeira leitura para não flutuar.
- **Funções de regra** (todas puras, sem tela): `facLvl()` (= `rd.lvl`), `facCostOf()`, `facReqState()` (lista de requisitos com ✔/✘ e o texto de cada um, para a tela), `canFacUp()` (nível < máximo, requisitos ok, pode pagar, sem dívida, **não evoluiu a facção nesta rodada**), `cityCostOf(c)`, `canCityUp(c)` (cidade sua, nível < máximo, pode pagar, **nenhuma cidade evoluiu nesta rodada**). Contadores: POIs do jogador (`poiMine`), cidades do jogador (`WORLD.cities` com `owner==='player'`), cidades no nível máximo.
- **Limite por rodada:** campos novos em `STATE.rd`: `facUpR` e `cityUpR` (número da rodada em que evoluiu; ausente = nunca). `canFacUp`/`canCityUp` comparam com `STATE.round`.
- **Ações:** `ECON.act.capital` e `ECON.act.city` = 0 (ver decisões).
- Ajustar os consumidores de `rd.lvl`/`cityLvl` para os nomes novos, sem mudar comportamento ainda: `factions.js:199` (poder: o nível de cada cidade do jogador vem de `cityLvl`, inclusive a capital), `missions.js:22`, `poigame.js:37` (continua `rd.lvl` = nível da facção), `rebellion.js:258`, `scenario.js:32`, `game.js:290` (botão de teste passa a subir o nível da facção até `LVL.facMax`).
- **Avisos:** nenhum (só lógica).
- **Teste:** no console, `canFacUp()`/`facReqState()` com e sem POIs e cidades (`polTakeCity` no criativo); `cityLvl(WORLD.home)` em save antigo (nível 3 vira 3). Acrescentar ao smoke.

### 2. Efeito do nível da cidade (produção, imposto, desconto)
- `prodOf` e `taxOf` (`econ.js`) somam, **só para cidade do jogador**, `LVL.cityProd × (nível − 1)` e `LVL.cityTax × (nível − 1)`; o `rank` das NPC e das cidades ainda não evoluídas segue como hoje. A mesma conta alimenta o estoque da loja (`shopFull`, que usa a produção) e o poder da facção.
- Não há desconto de loja por nível (retirado).
- A aba **Efeitos** e a tela da cidade mostram o ganho do nível atual (produção e imposto) para o jogador ver o que ganhou.
- **Avisos:** nenhum novo (o ganho aparece no relatório da rodada como já aparece a produção e o imposto).
- **Teste:** `?auto=1&mute=1&seed=11`; subir o nível da capital no console (`STATE.rd.clv[WORLD.home.id]=3`) e conferir `prodOf`/`taxOf` antes e depois, e que as NPC não mudaram. Acrescentar ao smoke.

### 3. Visual da cidade por nível (muros e atiradores)
- **Primeiro investigar** (2 coisas): (a) como os atiradores das torres existentes são criados hoje (`c.towers`, `spawnEnemy(..., sentry)` em `entities.js`; hoje **paliçada e pedra já têm torres com atiradores**, só a cerca não) para reaproveitar; (b) como separar o muro do lote principal da cidade (`buildCity`, `city.js` ~836-900) para poder **removê-lo e refazê-lo**: um lote próprio por cidade (`c.wallMesh`), colisões registradas à parte (guardar as caixas de `addCol` do muro para removê-las), bandeiras e luzes do muro também. O que foi feito para acampamentos em `poi.js` (~436, `scene.remove`, `geometry.dispose`, `c.sceneObjs`, `c.cols`) é o modelo.
- Extrair o trecho do muro para `buildCityWall(c, nivel)`. Níveis: **1** nenhum · **2** cerca · **3** paliçada (portões e torres de canto de enfeite, **sem atiradores**) · **4** paliçada com torres e **atiradores** · **5** muralha de pedra com torres e atiradores. Hoje torres, portões e atiradores vêm juntos em todo muro que não é cerca (`wt!=='fence'`): separar em duas condições (muro de madeira ou pedra × torres ocupadas). Na geração, o nível inicial vem de `cityLvl` (capital começa em 1 = **sem cerca**; hoje ela nasce com cerca); NPC continua pelo `rank` (a função mapeia rank 1-2 → 1, 3-4 → 2, 5-6 → 4 se paliçada ou 5 se pedra, para as NPC ficarem como estão).
- `cityWallRebuild(c)`: remove o muro atual e constrói o do nível novo, sem recarregar o mundo, e atualiza `c.wallType`. Cidade desenhada fora da vista (chunks/estado) precisa ficar coerente: testar evoluir de longe e depois ir até lá.
- **Atiradores (níveis 4 e 5):** guardas nas torres, na cor do jogador, que atiram em quem ataca a cidade; reaproveitar os que as cidades NPC com paliçada ou pedra já têm. Sugestão: o nível 5 tem mais atiradores ou mais vida que o 4 (decidir ao ver o código). O nível 3 tem as torres mas nenhum atirador. Verificar que raids e rebelião (`raids.js`, `rebellion.js`, que usam `c.rank`, portões e `rebGatePosts`) continuam funcionando com a cidade sem muro e com o muro novo.
- **Avisos:** nenhum (só visual).
- **Teste:** `?auto=1&mute=1&seed=11`; no console `STATE.rd.clv[WORLD.home.id]=N; cityWallRebuild(WORLD.home)` para N de 1 a 5; olhar a cidade de dentro e de fora, atravessar o portão, rodar um raid. Repetir numa cidade anexada (`polTakeCity`). Medir o tempo da reconstrução.

### 4. Evolução de cidade (tela e ação, 1 por rodada)
- **Tela:** a página da cidade em `book.js` (~73-76) passa a valer para **todas as cidades do jogador, capital incluída** (a página "Evoluir a capital" sai; o conteúdo dela vira a página da facção, tarefa 5). Mostra nível atual/máximo, o que o próximo nível dá (produção, imposto e o muro que ela terá) e o custo em ouro e recursos, com cada item em ✔/✘ conforme você tem ou não.
- **Botão** `cityup` → `canCityUp(c)`; ao pagar: `rd.clv[c.id]++`, `rd.cityUpR = STATE.round`, `cityWallRebuild(c)`. Botão desabilitado com o motivo ao lado: "Você já evoluiu uma cidade nesta rodada", "Nível máximo", "Faltam recursos", "Só no turno do Líder", "Com dívida não é possível comprar".
- **Só nas suas cidades**; cidades NPC não têm o botão.
- **Avisos:** toast de confirmação ao clicar ("🏘 <Cidade> evoluiu para o nível N: <muro> e mais produção e imposto"). Relatório da rodada (`rdNow`): "🏘 <Cidade> evoluiu para o nível N." Nenhum outro.
- **Teste:** turno do Líder, evoluir a capital e conferir recursos gastos, muro novo e `rd.cityUpR`; tentar uma 2ª evolução na mesma rodada (bloqueada, com o motivo); na rodada seguinte funciona; nível máximo; cidade anexada. Acrescentar ao smoke.

### 5. Evolução da facção (tela e ação, 1 por rodada)
- **Tela:** a página que era "a capital" vira **"Facção"** (nome e bandeira do jogador): nível `N / 5`, ações por rodada (`maxActions()`), pontos de líder e o que o próximo nível exige, em **checklist** (✔/✘) vindo de `facReqState()`: ouro, cada recurso, POIs (`tem 1 de 2`), cidades (`tem 1 de 3`), cidades no nível máximo, o 5 (`tem 0 de 3`). Texto curto explicando que cada nível dá +1 ação por rodada, a partir da próxima.
- **Botão** `fac` → `canFacUp()`; paga, `rd.lvl++`, `rd.facUpR = STATE.round`. Botão desabilitado com o motivo ("Já evoluiu a facção nesta rodada", "Faltam POIs", ...).
- O nível da facção no HUD/relatório onde hoje aparece "nível da capital" (`book.js` ~114, `texts.js` se houver) passa a dizer "nível da facção".
- `poiLvl` do jogador continua = nível da facção (a produção de POIs sobe com ela: conferir no balanceamento).
- **Avisos:** toast de confirmação ("🚩 Sua facção evoluiu! Nível N: mais ações a partir da próxima rodada"). Relatório: "🚩 Sua facção chegou ao nível N." Nenhum outro.
- **Teste:** com ouro e recursos, sem POIs, nível 2 → 3 bloqueado (falta POI); anexar 2 POIs e subir; 3 → 4 e 4 → 5 com `polTakeCity`/criativo; uma evolução por rodada. Acrescentar ao smoke.

### 6. Fechamento
- `docs/fase-6-guerra.md`: feature 16 e 35 da tabela e o item 2 da "Ordem de implementação" (nível do líder e da facção) viram ✅ com a regra nova escrita ("Descrição e regras das features": a feature 35 hoje diz "especificado abaixo" e não tem texto). A seção "Ciclo da rodada" (pontos de líder = nível, +1 em guerra) passa a ler "nível da facção".
- `docs/ESTADO.md` e `docs/MAPA.md` (`LVL`, `cityLvl`, `canFacUp`, `canCityUp`, `buildCityWall`, `cityWallRebuild`, novos textos), `docs/fase-4-testes.md` (regra e como testar).
- Roteiro de teste em `docs/fase-4-testes.md`: evoluir cidade e facção, limite por rodada, requisitos de POIs e cidades, save antigo.
- Smoke completo e uma partida curta (rodadas 1 a 5) jogando: custo vs. renda (balanceamento de `LVL`).
