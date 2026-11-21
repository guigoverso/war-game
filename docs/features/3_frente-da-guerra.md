# Frente da guerra: tarefas

Origem: feature 36 e item 4b de `docs/fase-6-guerra.md`. Desenho fechado com o usuário em 2026-11-21. Este arquivo separa a 4b em tarefas, na ordem de implementação.
**Resumo:** ao declarar guerra o jogador escolhe no mapa uma **cidade** (ou um **POI**) da facção inimiga. O jogo traça uma **rota por terra** da cidade sua mais próxima até o alvo, monta a **cadeia de POIs** no caminho e, se houver espaço, preenche os vazios com **POIs de guerra** (acampamento e trincheira). A cidade só é liberada para a batalha final quando o POI mais perto de cada lado da cadeia está sob controle.

## Regras decididas (do usuário)
- **Alvo:** qualquer cidade do inimigo principal, ou um POI permanente dele (guerra por POI: o POI-alvo faz o papel da cidade). Cidade de aliado do inimigo só vira alvo se o aliado entrar na guerra e você conquistar a cidade de quem declarou.
- **Escolha:** na Declaração de Guerra (Negociação) abre o mapa, o jogador clica no alvo, o jogo calcula a rota e mostra a **previsão** (linha tracejada, POIs no caminho, POIs de guerra novos); o jogador **confirma ou escolhe outro alvo**.
- **Rota:** da cidade sua mais próxima do alvo. **Desvia** de cidades e POIs de quem está fora da guerra. Vão de água só é aceito se **não ocupar o espaço de um POI** (o vão curto é Ok; o longo é negado e a rota contorna).
- **Cadeia:** POIs permanentes na faixa da rota, em ordem. POI de bandidos entra; POI seu na cadeia já conta como controlado. POI de terceiros fora da guerra não entra.
- **Conquista só de território adjacente** (do POI seguinte da cadeia). A operação **Conquista de Cidade** só é liberada se o POI mais perto da sua cidade e o mais perto da cidade inimiga estão sob seu controle. Se você já tem todos e não há espaço para POI de guerra, a invasão da cidade começa na rodada 1.
- **POIs de guerra:** traça-se um quadrado do tamanho do raio de cada POI existente e de cada POI de guerra na linha; os quadrados livres são preenchidos. **Mais perto da cidade: mais chance de acampamento; mais perto dos POIs do inimigo: mais chance de trincheira.** Nascem **na declaração** e somem quando a guerra acaba.
- **Inimigo ataca também** (operações de defesa para você). **Retomada:** quem perde uma operação de retomada fica **2 rodadas** sem poder tentar de novo (vale para os dois lados). POI recém-conquistado pode ser atacado no turno seguinte.
- **Cidade com mais POIs restantes tem mais soldados.**
- **Ordem da rodada:** (1) início do turno do Líder: resultado do que o Comandante fez; (2) turno do Líder: decisão das operações; (3) fim do turno do Líder: consequência das decisões do Líder e dos NPCs.
- **POIs fora da frente** (de bandidos ou de aliado que entrou depois): os guardas atiram se você chega perto, **sem buffs e sem o aviso de proibido**; dá para **saquear**, mas não conta como conquista. Ficam vazios até o fim do conflito ou são tomados por bandidos (chance baixa); só recebem soldados se uma nova frente passar por eles.
- **Cidades coladas (raro):** na rodada 1 o invasor recebe o card de Conquista de Cidade; se repelido, o defensor recebe o dele (ou o de paz), alternando até alguém vencer.
- **Perder a cidade:** card de rendição; a guerra para. **Ganhar a cidade:** na rodada seguinte, um card para continuar ou não e outro para o destino dos terrenos (detalhes definidos na hora). Se continuar, escolhe outra cidade e a frente é remontada.
- **Guerra por POI** segue o mesmo fluxo, com os mesmos dois cards ao conquistar o POI-alvo.
- **Cenário `?cenario=guerra`:** alvo padrão = a cidade inimiga mais próxima de você.

## Decisões técnicas (minhas, a confirmar)
- **POIs de guerra em tempo de jogo não aplainam nem escavam o terreno** (a malha do terreno só é feita na geração do mundo). Ficam sobre uma base de terra (`p.pad`) em lugar já quase plano (desnível até `WAR.front.slope` = 4, sem água, sem árvore); a trincheira em jogo não é escavada, só tem parapeitos (`c.noDig`). Se o lugar não serve, o quadrado fica vazio.
- **Rota:** busca A* numa grade de 8 blocos, com custo extra na água e bloqueio de cidades e POIs fora da guerra; se o vão de água passar de `WAR.front.waterMax`, refaz sem água; se ainda assim não houver caminho, o alvo é recusado.
- **Estado salvo:** só acrescenta campos em `STATE.war.camps[fid].front` (`kind`, `targetId`, `originId`, `path`, `chain`, `war`). Os POIs de guerra são reconstruídos ao carregar (`warFrontRestore`). Sem somar `SAVE_VERSION` se `camps` já for salvo inteiro (conferir na tarefa 5).
- **Código novo:** `js/warfront.js` (carregado depois de `war.js`); números em `WAR.front` e `warCampChance`/`warCanTarget` (`war-modifiers.js`); textos em `war-texts.js`.

## Regras gerais
- Só **acrescentar** campos; ausentes = padrão. Estilo denso, linhas até ~120 caracteres, textos em português, LF.
- **Avisos na tela** (os únicos desta feature): faixa do mapa na escolha do alvo, faixa da previsão, toast "Frente montada", toast "Frente desmontada" e o toast de alvo inválido / sem rota. Eventos de rodada vão ao relatório (`rdNow`), sem toast.
- Terminar cada tarefa com `node tests/smoke.js` e atualizar `docs/MAPA.md` ao criar função, arquivo ou modificador.

## Ordem

| # | Tarefa | Tam. | Sessão |
|---|---|---|---|
| 1 | **Números e textos** (`WAR.front`, regras de chance e de alvo, textos) | P | Continua desta (já feita) |
| 2 | **Rota e cadeia** (cálculo puro, sem UI) | G | Nova |
| 3 | **POIs de guerra em jogo** (planejar vazios, construir, remover, salvar/restaurar) | G | Continua da 2 |
| 4 | **Declaração com mapa** (escolher alvo, previsão, linha tracejada, confirmar) | M | Nova |
| 5 | **Guerra por POI e cenário** (alvo POI, `?cenario=guerra` com frente, "Conquistar POI" na ordem da cadeia) | M | Continua da 4 |
| 6 | **Teste de fumaça e documentação** | P | Continua da 5 |

## Tarefa 1: números e textos (feita em 2026-11-21)
- `WAR.front` (`cell`, `band`, `avoid`, `waterMax`, `waterCost`, `slope`, `maxWarPois`, `side`), `warCampChance(t, nearEnemy)` e `warCanTarget(fid, kind, ref)` em `js/modifiers/war-modifiers.js`.
- Textos da declaração, previsão, aviso de frente montada e desmontada em `js/texts/war-texts.js`.
- **Por que continua desta sessão:** já está no código, só falta commitar com a 2.

## Tarefa 2: rota e cadeia
- **O que fazer:** em `js/warfront.js`: `warFrontPlan(fid, kind, ref)` devolve `{origin, path, chain, war:[]}` sem tocar no mundo. Origem = cidade sua mais próxima do alvo (`playerCities()`). Bloqueios = cidades e POIs de terceiros fora da guerra (raio + `WAR.front.avoid`). A* em grade (`Heap` de `util.js`), água com custo e, se o vão passar de `waterMax`, uma segunda busca sem água. Cadeia = POIs permanentes (sem ruínas, sem POI de guerra, sem o alvo) a até `band` da rota, ordenados pela posição na rota; dono permitido: você, bandidos, livre ou o inimigo.
- **Como testar:** `?cenario=guerra&auto=1&mute=1`, no console `warFrontPlan(WARSCN.fid,'city',cidadeInimiga)`: conferir `path`, ordem da cadeia e que a rota desvia de cidades neutras. Semente 3 (ilhas): alvo do outro lado da água devolve `null`.
- **Sessão nova:** é uma lógica isolada e grande; começar do zero dá contexto limpo. O brief precisa citar `docs/features/3_frente-da-guerra.md` e `js/warfront.js`.

## Tarefa 3: POIs de guerra em jogo
- **O que fazer:** preencher os vazios da rota (quadrados de raio + `POI_GAP`, até `maxWarPois`); escolher tipo por `warCampChance` e dono pelo vizinho da cadeia (senão pela metade da rota); achar terreno válido perto do ponto (desnível, água, árvore, cidades e `ambClash`). Em `js/pois.js`: `poiDig` e `poiLand` não fazem nada se `c.noDig`; `poiBuild` liga `c.noDig` quando `p.runtime`. `warFrontBuild`, `warFrontClear` (remove malha, colisões, guarnição, moradores e entradas de `STATE.pois`/`seen`), `warFrontRestore` (chamada em `applySave`, depois de `rel`), e `facPeace` chama a limpeza.
- **Como testar:** `warFrontBuild(plan)` no console: POIs aparecem na rota (ver o mapa, aba 📍 Locais), jogador anda sobre a base sem buraco na malha; salvar e carregar (`?load=1`) reconstrói igual; `facPeace(fid)` os remove sem deixar colisão nem soldado.
- **Continua da 2:** usa o plano da 2 e o contexto do desenho dos quadrados; separar custaria reexplicar a rota.

## Tarefa 4: declaração com mapa
- **O que fazer:** na tela Guerra da Negociação (`js/negoc.js`) o botão passa a abrir o mapa (`WF.pick`). `bookmap.js`: faixa de escolha em `mapPages`. Clique em cidade (`pickCityAt`) ou POI (`pickPoiAt`) válido (`warCanTarget`) calcula o plano e mostra a previsão com os botões **Confirmar** e **Escolher outro alvo**. `drawBigMap` ganha `warFrontDraw` (linha tracejada da rota e quadrados dos POIs de guerra previstos; depois de declarada a guerra, a frente fica sempre desenhada). Confirmar: `facDeclareWar`, grava `STATE.war.camps[fid].front` e chama `warFrontBuild`.
- **Como testar:** `?cenario=guerra&auto=1&mute=1` com `WAR.scenario.startAtWar=false`: Negociação → Guerra → escolher alvo → ver tracejado e previsão → confirmar; trocar de alvo antes de confirmar; fechar o caderno cancela sem declarar.
- **Sessão nova:** é a parte de interface, independente da lógica já pronta; testa-se na tela com o navegador.

## Tarefa 5: guerra por POI e cenário
- **O que fazer:** alvo POI (o POI-alvo substitui a cidade no fim da cadeia); `warScenario` passa a montar a frente contra a cidade inimiga mais próxima em vez de dividir os POIs pela metade; o botão **Conquistar POI** do painel só aceita o POI adjacente da cadeia; o painel mostra a cadeia e o estado de "Conquista de Cidade liberada" (condição: POI mais perto de cada lado sob seu controle).
- **Como testar:** `?cenario=guerra`: conquistar em ordem libera o card; pular um POI é recusado; guerra por POI com `warFrontPlan(...,'poi',p)`.
- **Continua da 4:** reaproveita a UI e o estado já montados.

## Tarefa 6: teste de fumaça e documentação
- **O que fazer:** `tests/smoke.js`: plano da rota (cadeia ordenada, desvio), construção e remoção dos POIs de guerra, ida e volta de save. Atualizar `docs/fase-6-guerra.md` (feature 36 para ✅ ou 🔶, item 4b, "Ainda em aberto") e `docs/MAPA.md` (arquivo `warfront.js`, `WAR.front`, textos). Rodar `/encerrar-sessao`.
- **Continua da 5:** é fechamento e usa tudo o que está no contexto.

## Fora desta feature (ficam para os itens seguintes)
Operações de ataque e defesa, retomada com espera de 2 rodadas, ataques do inimigo, soldados da cidade pelo número de POIs, locais proibidos, cabo de guerra, batalha final, cards de rendição / continuar / destino dos terrenos e a ordem da rodada em três fases: itens 5, 6, 7, 9, 11 e 19 de `docs/fase-6-guerra.md`.
