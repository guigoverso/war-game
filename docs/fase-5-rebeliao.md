# Rebelião de cidades NPC

Desenho fechado com o usuário. Código: `js/rebellion.js`. A base (humor das cidades NPC e contador `ups`) está em `docs/fase-5-facoes.md` ("F5a base").

## Etapas
1. **Núcleo sem batalha (feito, `js/rebellion.js`):** gatilho, cartões de decisão e de resultado, apoio financeiro, sorteio do resultado, Negociação, nova facção (save v14), anexações, cenário de teste.
2. **Batalhas (feito, falta jogar):** apoiar os rebeldes (raid adaptado) e combater a rebelião (invasão adaptada), com reforços (`rebSupportStart`, `rebCombatStart`).
3. **Visual (feito, só aparência):** cidade destruída enquanto dura a rebelião (ver "Etapa 3" abaixo).

## Cenário de teste (`?cenario=rebeliao`)
`index.html?auto=1&mute=1&seed=11&cenario=rebeliao`: rodada 3, ◉20000, comida e minério 40, 5 soldados, você de frente para a cidade que vai se rebelar (Vila Cume na semente 11) e uma rebelião já na fila. Pausa (Tab) → aba **Facções** tem o painel 🧪 (`rebScenarioHtml`):
- 📍 Ir até a cidade • ⏭ Encerrar a rodada • 🔥 Nova rebelião • ↻ Recomeçar.
- Apoiadoras: 0, 1 ou 2 facções do lado dos rebeldes (muda a tabela, os reforços e o sorteio).
- Sorteio forçado (rebeldes vencem, perdem ou aleatório): vale para as escolhas sem batalha (C, D, E).
- Batalha: ☠ matar os inimigos (acelera ondas e invasão), ♥ curar tudo, +5 soldados.
- Ouro 0 (testa dívida e "Anexar a crédito"), ouro 20000, e **Limite de facções (8)** para testar o caminho sem reconhecer.
Roteiro: encerrar a rodada → cartão A–E → turno do comandante (A e B levam à batalha) → encerrar a rodada → resultado. Repita com A (vencer, fugir a 50 blocos, morrer), B (vencer, morrer), C/D/E e as opções de Negociação.

## Como testar a etapa 1
- `index.html?auto=1&mute=1&seed=11&cenario=rebeliao`: rodada 3, ◉20000, comida e minério 40, uma rebelião já na fila. Encerre a rodada (prefeitura ou pausa → Rodadas): no turno do líder o cartão aparece (livro na mesa, tecla E).
- Pausa → aba Facções (modo criativo): estado da rebelião, cidades descontentes e o botão **🔥 Forçar uma rebelião**.
- Testar cada caminho: C (não se envolver), D/E (apoio financeiro), e no turno seguinte as opções do resultado; recarregar o save no meio (a facção nova e a cidade em chamas voltam).

## Gatilho (`rebCheck`)
- Cidade NPC com `ups` (rodadas seguidas descontente) ≥ limite: pacífica 4, neutra 3, agressiva 3. Um valor maior vem com a guerra/sabotagem no futuro.
- A partir da rodada 3; no máximo uma rebelião por vez e 2 rodadas de folga depois de cada uma.
- A capital da facção (cidade de maior nível; empate: menor id) nunca se rebela; facção de uma cidade só também não (seria destruída).
- Apoiadoras (`rebSupporters`): facção neutra com cidade a menos de 130 blocos tem 40% de chance de apoiar os rebeldes; rival da dona (relação ≤ 3 no grafo da F3) tem 60%; aliada ou amistosa nunca. No limite de 8 facções há sempre ao menos uma (a mais próxima).

## Linha do tempo
- **Fim da rodada X−1:** a rebelião entra na fila. Prioridade dos eventos da rodada: raid de bandidos > rebelião > emboscada de caravana > dungeon dourada (a rebelião na fila só perde para o raid sorteado, e espera a próxima rodada).
- **Rodada X, turno do líder:** cartão "Rebelião" (`rebAnnounce`): a cidade pega fogo, a bandeira vira a dos rebeldes, os serviços fecham, as caravanas dela (suas e NPC) acabam, as missões que a envolvem são canceladas (sem penalidade) e nenhuma nova é gerada para ela. O líder escolhe; o turno do comandante age de acordo.
- **Fim da rodada X:** a rebelião é resolvida (`rebRound`).
- **Rodada X+1, turno do líder:** se os rebeldes venceram, cartão "Rebelião: resultado" com a Negociação; se perderam, só uma linha no relatório e a cidade volta à dona.

## Decisão do cartão (turno X)
| Opção | Efeito |
|---|---|
| **A. Apoiar os rebeldes** | batalha ao lado deles (ver Batalhas); vira **inimigo** da dona |
| **B. Combater a rebelião** | invasão da cidade (ver Batalhas); sai da lista se a dona está em guerra com você |
| **C. Não me envolver** | resultado sorteado |
| **D. Apoiar financeiramente os rebeldes** | paga ◉(600 + 200 × nível), (6 + 2 × nível) de comida e de minério; relação com a dona −2; rebeldes ganham +20 pontos no sorteio |
| **E. Apoiar financeiramente a facção** | mesmo custo; relação com ela +2; ela ganha +20 pontos |
- Sorteio (sem batalha): 50% de os rebeldes vencerem, +10 pontos por facção que os apoia, ±20 do apoio financeiro (mínimo 10%, máximo 90%). Apoiar financeiramente não garante vitória.
- Com batalha (etapa 2) o resultado vem dela. Se o jogador morre, **perde o lado em que estava**.
- Pagar sem ter o ouro vira dívida (ouro negativo), como nas outras decisões.

## Negociação (cartão do turno X+1, rebeldes venceram)
Preço de anexação (`rebJoinCost`): ◉2000 + ◉1000 por nível da cidade + ◉1500 por facção interessada (+◉2000 se o jogador não se envolveu).
- **Se apoiou os rebeldes (direto ou financeiramente):**
  - **Reconhecer a nova facção:** nasce na cor dos rebeldes; relação **Favorável**.
  - **Propor que se junte à sua facção:** paga o preço. Sem o ouro a proposta é recusada (sem cobrar): sorteio entre nascer uma facção **neutra** ou uma facção interessada **anexar** (a mais próxima).
  - **Anexar a crédito:** só aparece sem o ouro; a cidade passa a ser sua e o saldo fica negativo.
- **Se não se envolveu (ou apoiou a dona e os rebeldes venceram):** Propor que se junte (preço +◉2000, com as mesmas regras de falta de ouro), **Ignorar** (nasce a facção, mas o jogador fica "Desfavorável" com ela) ou **Não reconhecer** (a facção nasce **inimiga**).
- **No limite de 8 facções (você incluída):** não há reconhecer nem não reconhecer; "Ignorar" faz a facção interessada mais próxima anexar a cidade (empate: sorteio).
- **Se o jogador morreu combatendo (etapa 2):** só Ignorar (a nova facção ficaria descontente) e Não reconhecer (ela vira inimiga); sem a opção de juntar. Reconhecer, nesse caso: relação neutra e perde relação com a facção que perdeu a cidade.

## Nova facção (`rebNewFaction`)
- Nome (sem substantivo repetido), cor e bandeira livres, temperamento sorteado; cor da rebelião = cor da facção. Guardada em `STATE.reb.nfacs` e recolocada ao carregar (`rebApply`); a cidade troca de facção via `STATE.reb.cfid`.
- Relações entre as NPC: rival da dona (valor 2), aliada das rivais da dona (8), neutra com o resto (5). Entra no diagrama de Diplomacia.
- **Save v14.**

## Batalhas (etapa 2, implementada)
- **Apoiar os rebeldes:** no turno do comandante o jogador é teleportado; funciona como o raid de uma cidade sua, mas as ondas são de soldados da cor da facção dona e inimigos variados (soldados, golems, drones...), cada onda mais difícil. Seus reforços: **+1 soldado rebelde por nível da cidade** e **+1 por facção que apoia** (nível de soldado comum); ex.: cidade nível 3, você com 5 soldados e uma facção apoiando = 9 lutando. Os soldados extras funcionam como soldados do jogador. Aviso ao sair do raio da cidade (seguir adiante perde a batalha). Morrer encerra a rodada.
- **Combater a rebelião:** invasão normal; o jogador começa perto, fora da cidade. Os soldados da cidade viram os rebeldes (a dificuldade é a da invasão). Reforços da facção dona do seu lado; se outra facção apoia os rebeldes, soldados dela do outro lado. Só há dois lados: rebeldes e facção.
- **Apoio financeiro** (D/E) entra no mesmo cálculo da batalha como "buff" do lado apoiado (não garante vitória), com cidade em chamas e sem serviços no turno do comandante.
- Relações: apoiar a batalha leva a dona a "Inimiga"; reprimir sobe +3 com a dona; reconhecer sem apoio: neutra e −2 com a dona.

## Sabotagem
Fase 6 (guerra). Gancho: `fsupHit` (facsupply.js) reduz o suprimento de uma facção por algumas rodadas; o limite de rebelião e o preço de anexação sobem com ela.

## Ajustes após o primeiro teste
- O cartão, o aviso, o relatório e o modo criativo dizem quem **apoia os rebeldes** e quem fica **contra** (a dona e as facções aliadas ou amistosas dela no grafo da F3): `rebSides`/`rebSidesTxt`.
- Enquanto está em rebelião, a facção da cidade aparece só como **"Rebeldes"** (dica do mapa, informação da cidade, lista do livro). O nome real só existe depois do fim da rebelião (facção nova).
- **Caravanas para cidade em rebelião** não são permitidas (jogador e NPC); no mapa de escolha a cidade aparece com um **círculo vermelho com X**.
- O cartão mostra os lados numa **tabela** (rebeldes e apoiadoras à esquerda, a dona e quem fica com ela à direita, um "X" no meio de cada linha), com a cor da facção ao lado de cada nome (`rebSidesTable`; cartões ganharam o campo `extra`, um bloco em HTML depois do texto).

## Etapa 2 — como ficou
- **Guarnição:** ao estourar a rebelião os soldados da cidade são expulsos (somem). Voltam como rebeldes na batalha de repressão, como tropa da dona (rebelião esmagada) ou como tropa da facção que ficou com a cidade (`rebGarrisonRemove/Spawn/Restore`; cada soldado usa a cor em `c.uniform`, `entities.js`). Se você anexa a cidade, ela fica sem guarnição inimiga.
- **Apoiar (A):** no começo do turno do comandante (`onStart` do cartão) você é levado à cidade. São **3 ondas** de soldados da cor da dona, cada uma mais difícil (1: soldados; 2: soldados, drones e brutamontes; 3: soldados, brutamontes, drones e golem; mais inimigos conforme o nível da cidade), com o intervalo de 30 s das raids. Reforço: **soldados rebeldes = nível da cidade + 1 por facção que apoia**, na cor dos rebeldes, soldados comuns, fora do limite do seu exército e removidos no fim. Sair a mais de 25 blocos da muralha dá aviso; a mais de 50, a batalha é perdida. Vencer as 3 ondas = rebeldes vencem; morrer ou fugir = perdem. Reusa o raid (`RAID.reb`, `raidWaveCount`).
- **Combater (B):** você começa a 30 blocos da muralha, numa entrada. A guarnição vira os rebeldes (cor deles), mais 2 soldados por facção que os apoia (na cor dela). Reforço: soldados da dona = nível da cidade. É uma invasão normal (`startAttack`), mas ao vencer (`checkConquest` → `rebCombatWon`) a cidade **não é conquistada**: a rebelião é esmagada e a relação com a dona sobe (+3, com o multiplicador de temperamento).
- **Morrer** (nos dois lados) encerra a rodada ao reaparecer (`rebAfterRespawn`): quem você apoiava perde. Combatendo e morrendo, os rebeldes vencem e a Negociação traz Reconhecer (neutro; −2 com a dona), Ignorar e Não reconhecer (sem anexar).
- Se a batalha não puder começar (outro evento em curso) ou você terminar a rodada sem lutar, o resultado é sorteado.
- Teste: `index.html?auto=1&mute=1&seed=11&cenario=rebeliao`, encerrar a rodada, escolher A ou B no cartão e passar para o turno do comandante.
- **Ainda não é visual:** buracos/corpos/prédios queimados (etapa 3). Também falta jogar de verdade: o balanço das ondas e dos reforços só foi testado por script (matando os inimigos e avançando o tempo).

## Ajustes após o segundo teste
- **Aviso de cidade inimiga:** cidade em rebelião não mostra o "Território de X: não entre" nem é patrulhada (`updateInteract`, `facPatrol`). Ferir alguém nela não é crime (`facHostileAct`).
- **Um só aviso:** "[Cidade] se rebelou contra [Facção]." (`rebAnnounce`); sumiram o aviso extra e o de "há uma rebelião a decidir".
- **Rever a política decidida:** o livro (Resumo) tem "Ver a política decidida" (`showPolicy(entradaDoLog)`): botões desativados, a escolhida em destaque. O log de políticas guarda `data` (save v15).
- **Seu nome na tabela:** depois de escolher, a sua facção entra no lado certo da tabela (apoiar/financiar rebeldes: esquerda; combater/financiar a facção: direita).
- **Sons:** cidade em rebelião não tem conversas, martelo nem sino (`ambient.js`).
- **Novo fluxo das batalhas (substitui o teleporte):** você nasce na sua cidade no turno do comandante; um **marcador vermelho** (minimapa e mapa do livro) mostra a cidade em rebelião. Apoiando os rebeldes, a batalha começa quando você chega ao **centro** da cidade (`REB.centerR`=8); combatendo, a invasão começa quando você chega a menos de `REB.nearR`=35 blocos da muralha (`rebWatch`, a cada quadro). Seus soldados começam nos portões, repartidos entre eles (`rebAlliesToGates`).
- **Só encerra a rodada depois de resolver** (`rebPending`): decidiu apoiar ou combater e a batalha ainda não terminou (vitória, derrota, morte ou fuga). Sem sorteio de fallback para A e B. C, D e E continuam sorteados.
- **Apoiar:** 10 s antes da 1ª onda (`REB.startWait`, contagem no HUD). Reforço: **5 rebeldes fixos (`REB.extra`) + nível da cidade + 1 por facção que apoia**, na cor dos rebeldes, fora do limite do seu exército, somem no fim. (O quartel dos rebeldes foi desfeito: os serviços ficam fechados na rebelião.)
- **Menos mensagens:** sem aviso de começo, de soldados nem de "onda vencida" na rebelião.
- **Som espacial:** `sfx(nome,dist,x,z)` ganhou posição opcional (estéreo pelo lado em que o som nasce); usado em explosões (drone, granada), tiros e pancadas.
- **Cenário:** o painel ganhou "Perto da cidade" e "Centro da cidade" para disparar as batalhas.
- **Encerrar com rebelião pendente:** abre um popup ("Ok" / "Ir para o local da rebelião"; `rebEndPopup`). Apoiando os rebeldes, o botão leva ao centro da cidade; combatendo, ao entorno dela (logo fora do raio da invasão).
- **Correção do livro:** depois de resolver o cartão de resultado (a rebelião some do estado), o Resumo tentava reescrever o texto da política decidida e dava erro, o que quebrava o livro e as abas (e deixava o mapa preso). Os textos de política já resolvida agora são lidos com proteção (`polSafe`).
- **Combater, tropas (substitui o reforço de soldados da dona):** seus soldados aparecem em volta de você e seguem para a cidade (`rebArmyAround`). A facção dona envia `REB.troop`=10 soldados e cada aliada dela (você não conta) manda mais `REB.troopAlly`=2, cada um na cor da própria facção, num anel em torno da cidade (10 blocos fora da muralha) e atacando (`rebTroops`). Tipos humanos (`ALLY_KINDS`, `allies.js`): normal, **pesado** (vida ×2,2, colete, maior), **atirador** (tiro ×2, lento, de longe) e **metralhador** (tiro ×0,7, cadência ×2). Somem no fim da batalha e não contam no seu limite.
- **Posições dentro da cidade (`rebGatePosts`):** na batalha de apoio os rebeldes e os seus soldados vão para **postos dentro da muralha, perto das entradas**, repartidos entre elas (`rebPostAllies`; `a.post` em `allies.js` troca a patrulha em volta da cidade por um posto fixo), e já não saem para patrulhar fora. Ao combater, os rebeldes (e os soldados das facções que os apoiam) também nascem dentro, perto das entradas.
- **Apoiou e perdeu:** a relação com a dona deixa de ser "Inimiga". Se antes era neutra ou melhor, fica **Desfavorável** (`REL_UNF`=2); se antes já era pior, volta ao que era (`r.prevRel`). Sai uma linha no relatório da rodada.
- **Aliados nos postos lutam:** parados no posto (olhando para fora), eles vão atrás de qualquer inimigo a menos de 45 blocos (sem passar de 45 do posto) e voltam depois (`updateAlly`, `a.post`). Lobos, bandidos e outros que entrem no meio da batalha e ataquem você ou os soldados passam a ser alvo deles (`allyFindTarget`, "intruder"). Os inimigos da facção e dos rebeldes já reagem a animais por conta própria (`wildFoe`, quando o jogador está vendo).
- **Seus soldados na batalha de apoio:** durante a contagem de 10 s eles continuam em casa; quando a 1ª onda começa aparecem atrás de você e entram na luta, como na invasão de cidades (`armyAssault` com filtro, em `rebSpawnWave`). Só os rebeldes (reforços temporários) ficam nos postos desde o começo.
- **Aliados atirando se mexem:** em batalha de rebelião, quem está atirando anda de lado a intervalos e recua se o alvo chega perto (como os inimigos), em vez de ficar plantado.

## Etapa 3 — a cidade destruída (`rebRuinsEnsure`, `rebellion.js`)
- **Buracos de verdade, o resto só visual.** Os buracos mudam a altura do terreno (`H`), então a física, os tiros e o chão de quem anda os enxergam; o resto (fuligem, entulho, corpos) não tem colisão. Aparece quando a rebelião é anunciada (`rebAnnounce`) e some, desfazendo tudo, quando ela acaba (`rebClear`); volta igual ao carregar um save (tudo vem da id da cidade, `hash2`).
- **Prédios queimados:** ~75% das casas ganham fuligem nas paredes, telhado chamuscado, entulho e, em alguns, brasas que tremem (`RUIN.burn`, `RUIN.fires`). O entulho e as brasas ficam sobre o telhado de verdade: a altura sai das caixas de colisão (`rebTopAt`), e a altura da parede vem de `c.houses[i].bh` (gravada em `makeBuilding`, `city.js`).
- **Buracos (`rebPitDig`):** forma irregular (de ~6 a ~20 ladrilhos) que cresce a partir de um ladrilho central de rua ou praça plano e livre de prédio e objetos: o miolo (ladrilhos com os 8 vizinhos no buraco) desce 2 blocos e a borda 1 (`PIT`), então nunca há degrau maior que 1 e dá para sair andando. A malha do chunk é ajustada: a face de cima de cada ladrilho desce e escurece, e entram paredes de terra em volta. Entulho em volta (`RUIN.craters` = 3 + 1 por nível). O mapa e o minimapa não mostram os buracos.
- **Corpos:** soldados dos rebeldes e da facção dona (na cor de cada um) e civis caídos, com poça de sangue (`RUIN.bodies` = 7 + 3 por nível).
- Os números ficam juntos em `RUIN`. Teste: `?cenario=rebeliao`, encerrar a rodada, ir até a cidade (painel do cenário).
- **Apoiadores na batalha de apoio:** os soldados de cada facção que apoia os rebeldes (`REB.supTroop`=2) aparecem na cor dela, além dos rebeldes (5 + nível da cidade) e dos seus soldados. Antes só os rebeldes e os seus apareciam.
- **Fuligem:** só os prédios de verdade (com `c.houses[i].bh`) ganham a caixa escura; currais e campos (também em `c.houses`) ganhavam uma "parede" translúcida que parecia névoa.

