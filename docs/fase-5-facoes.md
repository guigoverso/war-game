# Fase 5 — Facções: decisões de design

Decisões tomadas em conversa, antes de implementar. Nada daqui está no código ainda (existe só `STATE.factions` vazio, reservado em `js/data.js`).
O desenho mais amplo (reuniões, guerra, ideias) está em `docs/ideias-e-design.md`; este arquivo manda onde houver conflito.

## Quantidade e geração
- De **2 a 4 facções NPC**, mais a do jogador: **3 a 5 no total**.
- O número é definido pela **semente do mundo**.
- **Não existem cidades independentes:** toda cidade pertence a uma facção (pode ser uma facção de uma cidade só). Uma facção precisa ter **pelo menos 1 cidade**.
- O dono da cidade passa a ser um `factionId` (em vez de `owner:'enemy'|'player'`).
- Todas as relações com o jogador **começam neutras**.

## Identidade
- No turno do líder, o jogador define **nome**, **cor principal** e **bandeira** (pixel art desenhada por ele).
- O **nome** pode ser mudado a qualquer momento.
- A **cor principal** é a cor dos soldados da facção.
- As facções NPC escolhem cor **depois** do jogador, nunca repetindo a dele. Nome e bandeira são sorteados: cerca de **20 bandeiras prontas**, trocando só a cor principal.
- O jogador pode trocar de cor, mas **não pode pegar uma em uso**, a menos que aquela facção tenha sido destruída (a cor volta a ficar livre). Serve para não confundir uniformes. Se o jogador pega uma cor que uma NPC usava (só possível se ela já foi destruída), não há conflito.
- Paleta com cerca de **8 a 10 cores**, para sobrar opção com 5 facções.

## Temperamento
Um campo por facção: **pacífica**, **neutra** ou **agressiva**. Não há "tipo" de facção nem "foco" (por enquanto).

O temperamento é um **multiplicador sobre a variação de relação**, aplicado num só lugar (a função que altera a relação):

| | Ganho | Perda |
|---|---|---|
| Pacífica | ×1,5 | ×0,5 |
| Neutra | ×1 | ×1 |
| Agressiva | ×0,5 | ×1,5 |

Exemplo: ação de 20 pontos → ganho de +30 / +20 / +10; perda de −10 / −20 / −30.

- A **pacífica nunca declara guerra** (nem por aliado).
- O sorteio por temperamento ainda precisa ser definido (sugestão do design antigo: ao menos uma pacífica e uma agressiva quando houver 4 facções).
- O resto do comportamento de guerra/aliança por temperamento (design antigo, seção 18) **não está decidido**: ver "A decidir".

## Relações
Escala de **0 a 10**, começando em **5**. Seis status (decididos na F2):

| Status | Quando | Efeito |
|---|---|---|
| **Aliado** | relação 10 (pré-requisito) + **acordo** | lojas dela **−20%** |
| **Favorável** | 8 a 10 | lojas dela **−10%** |
| **Neutro** | 4 a 7 | preços normais |
| **Desfavorável** | 1 a 3 | lojas dela **+30%**; caravanas permitidas |
| **Inimiga** | 0 | **não pode entrar nas cidades** (os guardas atiram) |
| **Em guerra** | por **declaração**; a relação passa a 0 (não é pré-requisito) | só entra nas cidades **atacando-as** |

- Aliado e Em guerra são marcadores (`ally`, `war`), não faixas. Cair abaixo de 10 desfaz a aliança.
- Caravanas de **Desfavorável para cima** (a reparação pendente não bloqueia mais); ao virar inimiga/em guerra (ou perder a aliança) as caravanas com ela acabam.
- A relação **inicia em 5** com todas. A paz de verdade é da Fase 6; hoje só o modo criativo faz a paz.
- Atenção na F4: os exemplos do multiplicador de temperamento (20 pontos) foram pensados para uma escala maior; com 0 a 10 uma ação "pequena" vale 1 ponto (`relChange` já arredonda com mínimo de 1).

## Crime e território
- **Entrar na cidade é livre.** O crime é **atirar nos NPCs dentro dela**.
- Hoje só vale como crime se a cidade for de facção **inimiga ou em guerra** com o jogador; em cidades neutras/favoráveis/aliadas atirar nos NPCs gera **queda de relação** (a ser detalhada).
- Efeitos do crime em cidade inimiga/em guerra:
  - os guardas **atiram** no jogador (só dentro da cidade; ao redor é tranquilo);
  - o jogador pode revidar, mas **não conquista** a cidade, **não aparecem seus soldados** e **não usa os serviços**;
  - o jogador leva **3× mais dano** enquanto comete o crime;
  - a relação **cai bruscamente** (ver abaixo).
- A **invasão de cidades fica desativada por enquanto** (o código deve continuar existindo).
- Exceções futuras: ajudar a repelir uma invasão (tiros acidentais em aliados não punem). **Não implementar agora.** Por enquanto, o jogador não pode sair atirando em NPCs inocentes.

### Queda brusca de relação (qualquer temperamento)
Cada crime rebaixa **um degrau**, **no máximo uma vez por rodada por facção** (evita que um massacre derrube tudo de uma vez).

| Estado | Resultado |
|---|---|
| Aliada | perde a aliança, as caravanas e os benefícios; vira **neutra** (relação 5) |
| Favorável | vira **inimiga** |
| Neutra | perde as caravanas e vira **inimiga** |
| Desfavorável | vira **inimiga** |
| Inimiga | **guerra na rodada seguinte** (exceto facção pacífica, que não declara guerra) |

### Reparação
- Depois de um crime, a facção exige uma **reparação em ouro bem pesada** para voltar a neutra, **além do corte do comércio**. O valor depende do que ela era antes do crime:

| Era | Reparação |
|---|---|
| Aliada | 1000 |
| Favorável | 1500 |
| Neutra | 2000 |
| Inimiga | 4000 (serve para ela **não entrar em guerra**; **não vale com as agressivas**) |

- Para a pacífica, a reparação substitui a guerra: ela fica inimiga, sem comércio, até receber o pagamento (ela nunca declara guerra).
- Os 4000 de quem já era inimiga evitam a guerra da "rodada seguinte"; com a agressiva a guerra acontece mesmo pagando.

## Guerra
Tudo sobre guerra (como começa, alvo, tipos, fatiamento) está em `docs/fase-6-guerra.md`.

## Sorteio e geração (fechado na F0)
- **Temperamentos:** com 3 ou 4 facções NPC, pelo menos 1 pacífica e 1 agressiva, o resto sorteado (25/50/25); com 2 NPC, sorteio livre.
- **Nº de facções NPC:** 2 a 4 pela semente, limitado pelo número de cidades (cada facção com pelo menos 1).
- **Paleta:** 10 cores distintas, definidas na F1.
- **Queda por crime:** só pelos degraus acima, sem número de pontos.

## A decidir (em cada fase que precisar)
- **F3:** grafo de relações **entre** as facções NPC e a propagação.
- **F4:** tamanho dos ganhos e perdas por ação (rota, doação, relíquia) na escala 0 a 10, e decaimento.
- **Fase 6:** limiar de guerra e comportamento de guerra por temperamento (`docs/fase-6-guerra.md`).

## Pré-implementação: rastreio de preços
Antes da F1: a loja mostra o **total em % de desconto ou acréscimo** e um botão **"?"** que abre um popup listando cada coisa que afeta o preço. Detalhes e testes na seção da Fase 5 em `docs/fase-4-testes.md` (ou aqui, quando feito).

## Ideia futura de teste
**Cenário controlado:** em vez de começar um jogo do zero e apertar botões, uma rota fechada com eventos pré-definidos (ambiente de teste previsível). **Só faz sentido depois que houver uma implementação**, então fica para depois da F1/F2.

## Fatiamento sugerido
1. **F1** — facções no mundo (geração, `factionId`, cor, nome, bandeira, save e migração).
2. **F2** — relações com o jogador e tela de diplomacia; crime e território.
3. **F3** — grafo entre as facções NPC e propagação de relação.
4. **F4** — ações que mexem na relação e decaimento.
5. **F5** — simulação abstrata por rodada.

## F1 — Facções no mundo (feito)
- **Onde:** `js/factions.js` (novo). O gerador do mundo chama `genFactions()` logo depois de criar as cidades.
- **Geração (pela semente):** 2 a 4 facções NPC (nunca mais que as cidades NPC). Cada facção tem uma cidade-semente (as mais afastadas entre si) e as demais cidades vão para a semente mais próxima, então toda facção tem pelo menos 1 cidade. Com 3 ou 4 NPC há ao menos uma pacífica e uma agressiva. Cores sem repetir a do jogador, bandeiras e nomes sem repetição (verificado em 300 sementes).
- **Dono da cidade:** `c.owner` continua ('player' | 'enemy') para não quebrar nada; `c.fid` (derivado) diz de qual facção a cidade é: 0 = jogador, 1.. = NPC. Conquista vira `fid 0`; rebelião devolve a cidade à facção de origem (`c.ofid`). Tirar o `owner` de vez fica para quando as relações (F2) precisarem.
- **Visual:** a bandeira da cidade é uma textura 8×5 com o desenho da facção (20 prontos, cor principal + contraste). O uniforme dos soldados e guardas de cidade, o quadrado do minimapa/mapa e as caravanas usam a cor da facção; os soldados do jogador usam a cor da sua facção. Bandidos, acampamentos e animais não mudam. **A cor deixou de indicar o nível da cidade** (antes era uma cor por nível).
- **HUD e mapa:** ao entrar na cidade aparece "(cidade — Nome da facção)"; o mapa grande (M) tem legenda com cor, nome, temperamento e nº de cidades de cada facção.
- **Save:** `SAVE_VERSION = 10`. Só a identidade do jogador vai no save (`STATE.fac = {name, color, flag}`; padrão "Minha facção", azul, bandeira 0). As NPC vêm da semente.
- **Como testar:** `?auto=1&mute=1&seed=11` → abrir o mapa (M): legenda com 4 facções (Império do Lobo tem 3 cidades). Entrar numa cidade e ver o nome da facção no topo e o uniforme na cor dela. No console: `WORLD.factions`, `facCities(3)`.
- **Limites conhecidos (F1b em diante):** o jogador ainda não edita nome, cor e bandeira (e as NPC escolhem a cor sem esperar a escolha dele, evitando só o azul padrão); a desenho da bandeira só aparece na textura da bandeira da cidade; "facção destruída" (cor liberada) ainda não é tratado.

## F1b — Identidade do jogador, editor de bandeira, livro e mapa (feito)
- **Criação da facção:** numa partida nova, **antes de gerar o mundo**, abre a tela "Crie a sua facção" (nome, cor principal, bandeira). Assim as NPC já escolhem a cor **depois** da do jogador e nunca repetem. `?auto=1` pula a tela (testes); `?auto=1&fac=1` força. Ao carregar um save, a identidade e as cores das NPC (`STATE.fac.npcColors`) valem já na geração do mundo, sem abrir a tela.
- **Edição na sala do líder:** livro → aba **🏴 Facções** → "Editar nome, cor e bandeira". O **nome** muda a qualquer momento; **cor e bandeira só no turno do líder**. Cores usadas por facções NPC que ainda têm cidades ficam bloqueadas (mostra "em uso por ..."); facção sem cidades libera a cor.
- **Editor (`js/flageditor.js`, feito à mão):** não achei pacote que traga polígono, borracha com tamanho, balde e desfazer juntos, e o jogo não tem build. Grade 32×20; lápis, borracha (1×1 a 6×6), balde, linha, polígono (com ou sem preencher; duplo clique, Enter ou o primeiro ponto fecham; Esc cancela), desfazer/refazer (botões, Ctrl+Z, Ctrl+Y), limpar, 16 cores + cor livre, 20 desenhos prontos como ponto de partida. Apagar devolve o pixel à cor principal.
- **Livro, aba Facções:** lista de facções à direita; resumo à esquerda (nome, bandeira, personalidade **só no modo criativo**, cidades). A relação entra na F2. Uma cidade com caravana mostra 🛒; o mouse sobre ele mostra de qual cidade sua sai, para onde vai e o efeito.
- **Mapa:** saiu a legenda de facções; as cores ficam nas cidades e o mouse sobre uma cidade mostra a facção dona (e a personalidade, no modo criativo). O mapa agora é a aba 🗺 Mapa do caderno (tecla M); a página da direita lista as cidades com facção e status.
- **Bandeiras no mundo:** dois **mastros** com a bandeira da facção ladeando cada uma das 4 entradas de toda cidade (as bandeiras apontam para o centro da entrada) e um mastro ao lado da porta da prefeitura.
- **Uniformes:** os guardas do portão e do quartel usam a cor principal da facção dona da cidade; os soldados do jogador, a cor da facção dele. `facReskin()` (`js/factions.js`) troca o modelo de guardas e de todos os soldados vivos quando a cor muda (nova cor, conquista, rebelião, carregar save), mantendo pose, balão de fala e colete. Só a pele varia entre os soldados.
- **Save:** `STATE.fac = {name, color, flag, px, npcColors}` (`px` = 640 números, -1 = cor principal).
- **Como testar:** `?seed=11&fac=1&auto=1&mute=1` → tela de criação; teste as ferramentas, confirme e olhe o livro (aba Facções) e o mapa (M).
- **Limites conhecidos:** o mastro da prefeitura foi conferido só por teste (vale olhar jogando); o editor não tem apagador de polígono por vértice nem seleção/mover.

## F2 — Relações, crime, reparação, aliança e guerra (feito)
- **Onde:** `js/factions.js` (seção "Relações" e "território"), `STATE.rel[fid] = {v, ally, war, debt:{amt,from}, warAt, crimeRd}`, `SAVE_VERSION = 11` (ausente = todas neutras).
- **Preços:** `addPriceFx('rel')`: aliado −20%, favorável −10%, desfavorável +30%, aparece no "?" como "Relação com X: Favorável". O antigo "cidade inimiga ×2" saiu (neutro é normal). **Venda espelhada:** aliado paga +20%, favorável +10%, desfavorável −30% (o antigo "paga metade" saiu).
- **Entrar:** em cidade de facção **inimiga**, entrar (dentro dos muros) faz os guardas atirarem (hostil: sem serviços, sem conquista, sem soldados seus, **3× de dano** no jogador). Perto de uma cidade inimiga aparece "🚫 Território de X". Em **guerra**, entrar já é atacar e `[F] ATACAR` aparece perto da cidade. Nos outros status entrar é livre. **Invasão só em guerra**: sem guerra não há como conquistar uma cidade.
- **Crime:** ferir um cidadão ou soldado numa cidade fora de guerra faz a cidade reagir e derruba a relação **um degrau por rodada por facção** (aliado → neutro 5 • favorável/neutro/desfavorável → inimiga 0 • inimiga → **guerra na rodada seguinte**, exceto a pacífica). Ao zerar os soldados da cidade em crime, ela **não é conquistada**.
- **Esvaziar a cidade = guerra:** se o jogador elimina todos os soldados de uma cidade fora de guerra (crime), a facção **declara guerra na rodada seguinte**: ao encerrar o turno do comandante, no turno do líder ela já está em guerra. A **pacífica** não declara (só exige reparação) e a agressiva recusa a reparação. Pagar a reparação de uma não agressiva cancela a guerra.
- **Declaração de guerra = política** (`declguerra`, em `js/factions.js`): quando uma facção vai declarar guerra (massacre ou crimes repetidos), a declaração **não é mais automática**. No começo do turno do líder ela vira a **política da rodada** (substitui o sorteio, aparece no livro e na notificação, e o turno só encerra depois de resolvida). Opções: **A. Pagar reparação** (o valor da reparação; relação vai a Desfavorável) • **B. Pagar reparação e pedido público de desculpas** (o dobro; relação vai a Neutro) • **C. Aceitar a declaração** (a guerra começa e os soldados são repostos). A facção **agressiva** recusa A e B. Pagar sem ter o ouro vira dívida, como nas outras políticas. Não é sorteada (`noRoll`); no modo criativo dá para **invocá-la** (a pausa prepara uma declaração se não houver).
- **Pedido de reparação = política** (`reparacao`): igual à declaração de guerra, mas para sair do estado de **inimiga**. Aparece no turno do líder quando uma facção está inimiga por um crime (guardas feridos, mas nem todos os soldados mortos), sem guerra a caminho. Opções: **A. Pagar reparação** (relação → Desfavorável) • **B. Pagar reparação e pedido público de desculpas** (o dobro; relação → Neutro) • **C. Recusar** (continua inimiga e volta a pedir em `FAC_REP_COOL` = 3 rodadas). Aqui a agressiva **pode** pagar (o objetivo é sair de inimiga, não evitar a guerra). Se houver guerra a caminho, a declaração de guerra vem primeiro. Também não é sorteada e pode ser invocada pelo modo criativo.
- **Mais de uma política no mesmo turno:** se houver uma declaração de guerra (ou várias) e um pedido de reparação devidos no mesmo turno do líder, **todos viram cartões**: o primeiro abre e os outros ficam na fila (`STATE.pol.extra`); ao resolver um, o próximo abre sozinho. As declarações de guerra vêm antes dos pedidos de reparação. O livro mostra "(+1 depois: ...)" e o turno só encerra com a fila vazia.
- **Soldados que renascem:** a guerra, quando começa (por você ou por eles), **repõe na hora** os soldados mortos da facção, então o próximo turno do comandante começa com a cidade guarnecida (não dá mais para conquistar sem luta). Além disso, no começo de cada rodada, as cidades de facções **em guerra** (que não estão em combate) trocam os soldados mortos por novos, nos postos de origem (`facRespawnGuards`). Fora de guerra, soldados mortos num crime ficam mortos.
- **Sem soldados, sem alarme:** cidade sem soldados vivos não reage mais a invasor nem a crime (corrigido o alarme que tocava a cada quadro quando você ficava dentro de uma cidade já inimiga e esvaziada).
- **Reparação (valor guardado):** o crime registra uma dívida (aliado 1000 • favorável 1500 • neutro/desfavorável 2000 • inimiga 4000) em `STATE.rel[fid].debt`. **Não há botão para pagá-la**: ela é resolvida pela política de declaração de guerra (opções A/B) ou, em guerra, é o **valor cobrado para pedir paz**. Uma guerra declarada sem dívida registra o valor do status anterior. Futuramente (Fase 6) será a base do preço da paz conforme o andamento da guerra.
- **Aliança (paga) / guerra / paz:** no livro → Facções → decisões, **só no turno do líder**. **Negociar aliança** exige relação 10 e custa ouro: `◉1500 × (poder deles ÷ seu poder)`, limitado entre 0,4× (você muito mais forte, ◉600) e 3× (muito mais fraco, ◉4500), arredondado a ◉50. **Poder** = soma de (1 + nível) das cidades; o jogador usa o nível da capital e das cidades evoluídas, as NPC o nível pelo rank (rank 1–6 → nível 1–3). Os números ficam em `ECON.ally`. **Declarar guerra** pede confirmação (relação 0, aliança e caravanas acabam). **Pedir paz** custa o valor da reparação registrada; a relação volta a 5. A facção agressiva não recusa a paz por enquanto (a recusa por temperamento é da Fase 6).
- **Livro / mapa / HUD:** a aba Facções mostra status, relação, texto do efeito, reparação e guerra pendentes; a lista à direita mostra o status de cada facção; o mouse sobre uma cidade no mapa mostra a relação; o HUD mostra o status ao entrar na cidade.
- **Modo criativo (pausa):** aba **🏴 Facções** com um seletor de status por facção (`facForceStatus`): aplica o status direto, zera reparação e guerra pendente (aliado = relação 10, guerra = declaração) e desfaz as caravanas quando o status pede.
- **Modo criativo (livro):** na aba Facções, botões −1/+1 (pesam pelo temperamento), valores diretos (0, 2, 5, 8, 10) e "🕊 Paz".
- **Limites:** não há ações que subam a relação (F4), nem relação entre NPCs (F3); a paz é só criativa até a Fase 6.

## F4 — Ações do líder que sobem a relação e decaimento (feito)
- **Onde:** `js/factions.js` (seção "F4"), UI no livro → Facções ("Melhorar a relação"), caravana em `js/rounds.js`. Números: `FAC_GOLD`, `FAC_RELIC_GAIN`, `FAC_ROUTE_GAIN`, `FAC_DECAY` e `ECON.act`.
- **Ações (cada uma gasta 1 ação ◆ do líder, vale uma vez por rodada por tipo e por facção, e o ganho passa pelo multiplicador de temperamento):**
  - **Rota comercial:** criar uma caravana com uma cidade dela dá **+1**. Agora **criar caravana gasta 1 ação** (`ECON.act.caravan = 1`) além dos ◉300. Exige relação **Desfavorável ou melhor** (inimiga e em guerra não).
  - **Doação de ouro:** ◉500 = **+1**, ◉1000 = **+2**. Vale com qualquer status, menos guerra (é o caminho para sair de inimiga).
  - **Doação de relíquia:** **+3**. A relíquia pode estar na bolsa do comandante ou no armazém.
- **Bloqueios:** só no turno do líder, sem guerra, relação abaixo de 10, com ação disponível e sem repetir o tipo na mesma rodada. O botão mostra o motivo ao passar o mouse.
- **Missões:** ações do comandante em campo (bandidos, escolta, resgate) **não** sobem relação diretamente; virarão missões que o líder escolhe (e escolher missão será uma ação). Fica para depois.
- **Decaimento:** a relação esfria **1 ponto em direção a 5** depois de **2 rodadas sem mudar** (facção agressiva: **3**), nos dois lados (amizade e inimizade). Qualquer mudança (ação, crime, política) reinicia o relógio. **Não esfria:** em guerra, aliada, com guerra a caminho, nem inimiga com reparação pendente. Aparece no relatório da rodada.
- **Sem propagação:** ganhar com uma facção não afeta as outras (isso é da F3).
- **Como testar:** ver o roteiro na resposta da implementação; no console `relOf(fid)`, `facGiveGold(fid,500)`, `facGiveRelic(fid)`.

## Ajustes após testes (F4)
- **Aliança é uma ação do líder:** `ECON.act.ally = 1` (além do ouro). O botão mostra "◉X + 1 ação".
- **Doação com o mesmo ganho:** se duas doações dão exatamente o mesmo ganho (já contando o teto 10 e o multiplicador de temperamento, por exemplo a facção agressiva: ◉500 e ◉1000 dão +1), **só a mais cara existe** e a mais barata nem aparece (`facGoldHidden`).
- **Preços das outras cidades:** entregas e faltas de suprimento (e a falta de madeira na venda) valem **só para as suas cidades**; lojas de cidades NPC não mudam com a sua economia. O humor da própria cidade NPC (simulado) continua valendo.
- **Caravanas:** os 3 guardas de cada caravana são **NPCs reais** (`spawnNpc`, papel `guard`, 70 de vida, na cor da facção da cidade dona, filhos do grupo da caravana) e a carroça e o cavalo têm **colisão** (`car.cols`). Atirar nos guardas de uma caravana que **não é sua** é crime (`facCaravanCrime`): a facção dona e, se for outra NPC, a do outro lado da rota perdem a aliança, viram inimigas com reparação registrada e a rota acaba; no próximo turno do líder aparece o pedido de reparação. Atirar na sua própria caravana não tem efeito de relação. Detalhes do comportamento na seção "Guardas e saque de caravanas" abaixo.
- **Uma caravana por cidade:** já valia para as NPC também (a rota ocupa as duas pontas, então uma cidade NPC com rota não aceita outra).
- **Mapa:** a aba Mapa ocupa as duas páginas do livro (sem legenda); o livro sempre abre no Livro, a menos que se peça a Bolsa (B) ou o Mapa (M).
- **Correção:** um comentário que entrou junto com a F4 em `js/rounds.js` desligava `ECON.cityUp` e `ECON.cityDisc`, o que deixava todo preço em NaN. Corrigido.
- **Atalhos do caderno:** **L** abre direto no Livro, **M** no Mapa e **B** na Bolsa; com o caderno aberto, cada tecla troca para a sua aba e, se já está nela, fecha. Sem pedido explícito o caderno abre no Livro.

## Cenário controlado: caravanas (`?cenario=caravanas`)
- **O que é:** um mundo fixo (semente 11, modo criativo, sem tela de criação) já montado para testar caravanas, guardas e relações. Código em `js/scenario.js`; nada roda no jogo normal.
- **Montagem:** você tem 3 cidades (capital + 2 conquistadas), ◉20000, 2 relíquias e 3 ações do líder (capital nível 3). Há **3 rotas**, cada uma com uma facção NPC diferente: **aliada (relação 10)**, **favorável (9)** e **neutra (5)**, o que dá 6 caravanas (3 suas e 3 de NPCs), cada uma com guardas reais. Você começa no turno do comandante, de frente para uma caravana de NPC.
- **Botões:** pausa (Tab) → aba **🏴 Facções** → seção "Cenário de caravanas": "Ir até a caravana" para cada uma e "Recomeçar o cenário".
- **O que testar:** guardas visíveis e na cor da facção; colisão da carroça; atirar nos guardas de uma caravana de NPC (a aliada cai para inimiga, a reparação fica registrada e as caravanas dela somem; no turno do líder aparece o pedido de reparação); atirar nos guardas de uma caravana sua (nada acontece); criar uma segunda rota com uma cidade que já tem caravana (recusado).
- **Correção:** os guardas de caravana não apareciam porque ficavam em (0,0,0): a função que posiciona os NPCs a cada quadro não roda para eles, e eu não dava a posição na criação.

## Guardas e saque de caravanas
- **Ronda:** os guardas ficam num **círculo de 7 m com a caravana no centro** (`GUARD_PATROL_R`): dão pequenos passos, fazem rondas por pontos do círculo (nunca dentro da carroça, na água ou em barrancos) e olham para o jogador quando ele chega perto (< 6 m). Ao falar com um guarda (E) ele vira para o jogador e para por uns 4 s.
- **Reação:** atirar num guarda de uma caravana de **outra facção** deixa **todos os guardas dela hostis**: eles vão atrás do jogador (até 38 m do centro) e atiram (8 de dano, 60% de acerto, a cada ~1,4 s). Acalmam se o jogador morre ou foge para longe. Atirar na caravana **sua** não os deixa hostis.
- **Sem guardas, sem ressurgir:** guardas mortos pelo jogador **não ressurgem** (a caravana fica marcada como atacada); os mortos por bandidos e animais ainda ressurgem fora da vista depois de ~6 s.
- **Saquear:** com todos os guardas de uma caravana de NPC mortos, perto dela aparece **`[E] Saquear a caravana de X`**. Dá **6 unidades de um dos produtos da rota** (sorteado entre os dois; se for ouro, só moedas) **e ◉40 + ◉15 por nível da cidade dona** (`ECON.loot`). Saquear também é crime contra a facção e **destrói a caravana**: a rota acaba na hora.
- **O modelo fica até o fim do turno:** rotas desfeitas por crime, por saque ou pela perda de aliança **não removem mais as carroças na hora**; elas ficam "condenadas" (`car.doomed`) e somem quando o **turno do comandante termina** (`purgeDoomedCaravans`). Antes, o crime desfazia a rota e as carroças sumiam no primeiro tiro.

## Missões da cidade e das facções (`js/missions.js`)
Tudo em `STATE.ms` (salvo; `SAVE_VERSION = 12`; as missões antigas são descartadas). Números em `MS` (`missions.js`).
- **Missões da cidade** (prefeitura, `[E]`): o quadro de cada cidade sua tem **nível da cidade × 2** missões por rodada (capital: nível do líder). **Só renova na rodada seguinte**. Dá para aceitar **várias** (sem limite) e as aceitas **não expiram**. Nem todas pagam em dinheiro: sorteio entre só ouro (50%), só recursos (30%) ou os dois (20%). Tipos: eliminar acampamento, resgatar refém, entregar pacote.
- **Missões das facções:** **no máximo 2 ofertas de facção a cada 3 rodadas** (sorteadas por semente: 2 das 3 rodadas e uma facção para cada; nunca as em guerra; a inimiga só oferece missões ao ar livre, porque não deixa entrar nas cidades). O **líder escolhe** no livro (1 ação ◆, `ECON.act.mission`), pode aceitar várias se tiver ações, e o comandante cumpre na mesma rodada. **Recompensa:** ◉60 + ◉20 por nível da cidade dela e **+1 de relação** (multiplicador de temperamento), no máximo **+2 por facção por rodada** vindo de missões. **Se a rodada acabar sem cumprir, falha: −1 de relação.** Abandonar também conta como falha.
- **Tipos novos (facção):** **matilha** (um ponto do mapa a 60–140 m da cidade; ao chegar a 55 m aparece uma matilha aleatória que deve ser eliminada), **recurso** (entregar N unidades de madeira, minério, couro ou comida da bolsa na prefeitura da facção, `[E]`), **relíquia** (se não houver portal de relíquia o jogo transforma um portal em um, ou gera as dungeons; entregar a relíquia na prefeitura da facção; **vender a relíquia faz a missão falhar**, e agora a relíquia pode ser vendida). Além de acampamento, refém e pacote, que são os mesmos das cidades.
- **Ativa:** várias aceitas ao mesmo tempo, **uma só ativa** (estrela no minimapa e no mapa, linha no HUD com "+N"). A **primeira aceita é a ativa** por padrão; no livro dá para **⭐ Ativar** outra.
- **Livro, aba 📋 Missões:** esquerda = missões da cidade (disponíveis por prefeitura e aceitas); direita = ofertas e aceitas das facções (separadas, nunca misturadas). Cada missão tem **📍 Ver no mapa** (o mapa abre como **popup**, sem trocar de aba), **⭐ Ativar** e **Abandonar**.
- **Como testar:** `?auto=1&mute=1&seed=11` → prefeitura da capital ([E]) para aceitar várias missões da cidade; turno do líder (pausa → Rodadas → "Ir ao escritório do líder") → livro → Missões → aceitar uma de cada facção; cumprir no turno do comandante ou encerrar a rodada para ver a falha.

### Onde a missão termina (prefeitura)
- **Entregas** (pacote), **recurso** e **relíquia** são entregues com **[E] na prefeitura da cidade alvo** (não basta chegar perto). Se a cidade é sua, o quadro da prefeitura mostra o botão "Entregar".
- **Missões de facção de acampamento, refém e matilha:** ao cumprir o objetivo aparece "Objetivo cumprido"; depois é preciso **reportar na prefeitura da facção** ([E]). Só então paga e sobe a relação. Missões de cidade desses tipos concluem na hora.
- O **indicador** (minimapa, mapa, HUD) vai para a **prefeitura** quando falta entregar/reportar. No minimapa a estrela fica **no aro**, como as letras da rosa dos ventos, e **por cima** delas. O 📍 "Ver no mapa" usa uma estrela **azul-clara** (a ativa é amarela).
- Partida nova começa no **turno do líder** (rodada 0, sem decisões): feche o livro, encerre o turno do líder e jogue a preparação como comandante.
- **Símbolos:** a missão **ativa** usa a estrela amarela com o rótulo "Missão ativa" (mapa e minimapa); "Ver no mapa" de uma missão que não é a ativa usa a estrela azul-clara com o rótulo "Missão". Se a missão vista é a ativa, mostra o símbolo da ativa. No minimapa a estrela fica no aro enquanto longe e passa para o local real ao chegar perto (sempre por cima dos ícones das cidades).

## F3 — relações entre as facções NPC (`js/facgraph.js`)
- **Grafo:** cada par de facções NPC tem um valor de 0 a 10 (mesma escala e limiares das suas relações; "aliadas" só em 10, que a F3 não gera). O valor inicial vem da **semente**: peso do temperamento (pacífica +2, neutra 0, agressiva −2, somados) ×1,25 se são vizinhas (a mais próxima uma da outra) ou ×0,5 se distantes, ±1 de sorteio. **Agressiva nunca é amistosa e é rival (≤ 3) da vizinha.** Começa sem guerra. Só o que mudou fica salvo (`STATE.frel`); ausente = valor da semente. **Rivais** = valor ≤ 3, **aliadas/amistosas** = valor ≥ 8 (`FG`).
- **Propagação (valores fixos):** quando **sua** relação com X muda (missão, doação, rota, crime), as aliadas de X mudam **no mesmo sentido** e as rivais de X **no sentido oposto**, **±1** (sem multiplicador de temperamento), no máximo ±2 por facção por rodada. Não avisa o jogador (descobrir jogando); fica registrada no **modo criativo** (pausa → 🏴 Facções → "Relatório de propagação" e a lista dos valores dos pares, também `STATE.flog`).
- **Deriva:** a cada 2 rodadas cada par anda 1 ponto em direção ao valor-alvo (temperamento + vizinhança). Na F3 o grafo quase não muda sozinho; as mudanças de verdade (sorteios, eventos, mediação) ficam para a F5.
- **Caravanas entre NPC:** mesma regra do jogador (uma caravana por cidade, focos diferentes, facções que não são inimigas entre si). **Uma nova por rodada**, a partir da rodada 1, escolhida por **necessidades → aliança → relações** (quanto cada cidade precisa do que a outra produz; mesma facção > aliadas > amistosas; depois o valor da relação). Ficam em `rd.nroutes`, com os mesmos guardas e saque; acabam se a cidade é tomada ou as facções viram inimigas. **Sem efeito em preços** e sem efeito por "aliada da sua aliada" (por ora). Futuro: o jogador poderá tomar a caravana pagando mais.
- **Livro, aba 🕊 Diplomacia (diagrama de cordas):** todas as facções, **você incluída**, num círculo; cada corda é a relação do par (azul aliadas, verde amistosas, amarela neutras, laranja rivais, vermelha inimigas). **Passar o mouse** numa facção apaga as outras cordas; **clicar** mostra na página da direita as relações dela com cada facção e as caravanas dela (formato `■ Cidade 🌽 <-> 🪵 Cidade ■`, com a cor da facção e o produto que cada lado envia). Sem seleção, a direita lista todas as caravanas. Números só no modo criativo.
- **Ordem das abas do livro:** Resumo, Cidades, Capital, Missões, Caravanas, Facções, Diplomacia.
- **Como testar:** `?auto=1&mute=1&seed=11`; no console, `relChange(1,1)` e veja `STATE.flog`; `Hooks.emit('round',N)` repetido cria uma caravana NPC por rodada. Save v13.


## F5a (base) — suprimento das facções NPC (`js/facsupply.js`)
Decisões do usuário: o suprimento é **sorteado por rodada** (70% situação, 30% sorte); o humor das cidades NPC serve para **preço/estoque**, **rebelião** (fase própria: `docs/fase-5-rebeliao.md`) e **sabotagem** (Fase 6, só o gancho `fsupHit`).
- **Estado por facção e recurso** (`STATE.rd.fsup[fid][res]`): `short` (em falta), `ok`, `abund` (abundante), refeito a cada `endRound` (depois de sortear as necessidades). Pontuação = 0,7 × base + 0,3 × sorte. Base = 0,28 (mercado interno) até 0,8 (metade das cidades da facção produz o recurso), +0,25 se uma caravana (sua ou NPC) traz o recurso para uma cidade dela. Abaixo de 0,30 é em falta; acima de 0,62, abundante. Números em `FSUP`.
- **Humor das cidades NPC:** peso das necessidades em falta (pct/100) ≥ 3 → descontente; sem falta e (algum recurso abundante entre as necessidades ou 10% de sorte) → próspera; senão contente. Na semente 11 (500 rodadas simuladas): ~21% descontente, ~6% próspera. `ups` conta as rodadas seguidas descontente (a rebelião NPC, em fase futura, usa).
- **Preço de venda:** facção em falta do recurso paga ×1,3 pelo item que conta como esse recurso; abundante paga ×0,85 (entra no "?" da venda, `sellEffects`).
- **Estoque da loja:** o item de um recurso abundante tem o dobro de unidades, em falta tem metade (`refreshShops`).
- **Capital:** o humor das cidades das facções não depende da capital; a regra "capital não se rebela" vale na fase da rebelião.
- **Gancho:** `fsupHit(fid, d, rodadas)` tira `d` da pontuação da facção por algumas rodadas (sabotagem, eventos).
- **Como testar:** modo criativo, pausa → aba Facções: "Suprimento das facções NPC" e "Humor das cidades NPC". Encerre rodadas e veja os estados mudarem; venda uma carne para uma cidade de facção com comida em falta/abundante e confira o preço e o "?"; compare o estoque da loja.
- Sem estado novo fora de `rd` (que já é salvo inteiro): `SAVE_VERSION` continua 13.

### Preços das cidades NPC (nova tabela) e livro
- **Serviços das cidades de facção** (todos os tipos de preço): Aliado +0%, Favorável +10%, Neutro +20%, Desfavorável +30% (`REL_ST.price`; antes eram −20/−10/0/+30). Cidade NPC **descontente**: +20% em todos os serviços (`FSUP.upsetPrice`; as curas continuam com o ×2 próprio), próspera −10% (já existia). Efeitos somam em %.
- **O que a facção paga pelo que você vende** continua com a tabela antiga, agora separada (`REL_ST.sell`: aliado +20%, favorável +10%, neutro 0, desfavorável −30%), mais o efeito de falta/abundância do recurso.
- **Abundância** mexe na quantidade à venda (estoque), não no preço.
- **Livro, aba Facções:** a lista de cidades mostra o ícone do que cada uma produz ao lado do nome. No modo criativo mostra também o humor e, se há variação de preço, um "?" que abre a lista de variações (o mesmo popup das lojas).

## Relação: no máximo ±1 por decisão
Uma **decisão** sua (doação de ouro, relíquia, rota, missão, apoio na rebelião, mediação...) muda a relação com a facção em **1 ponto** (sempre ±1): sem multiplicador de temperamento e sem depender do valor da relação (`relChange`, `factions.js`; `relPreview` mostra +1/−1). A doação de ◉1000 deixou de aparecer enquanto der o mesmo ganho que a de ◉500. Exceção: **efeitos que mexem nas relações** (Festival Continental, Pacto reprovado, votos da reunião) passam `fixed=true` e valem o valor exato, **somam** com o resto e não dependem da relação nem da personalidade. A propagação (±1 para aliadas e rivais) e o esfriamento por tempo não mudaram. `FAC_TEMPER.gain/loss` ficou sem uso.

## F5d: o que sobrou
- **Facção destruída:** NPC sem nenhuma cidade é apagada (`facDestroy`/`facReap`, no início da rodada, após conquista e ao fim de rebelião). Sai de `WORLD.factions`, relações, grafo, missões e suprimentos; `STATE.deadFacs` refaz a remoção ao carregar. A facção nova (rebelião) começa do zero, só com as relações criadas na rebelião. Relatório: "💀 X foi destruída". Teste: tire todas as cidades de uma facção e passe a rodada.
- **Aliada ofendida:** crime contra aliada não derruba a aliança na hora; no turno do líder vem o cartão `reparaliada`: A paga → neutra; B paga o dobro + desculpas → favorável; C ignora → desfavorável. Modo criativo: "Invocar evento".
- **Reparação de inimigo:** pedida uma vez só por crime (`repDone`).
- **Mina dourada:** opção B rende ◉50 por rodada durante 5 rodadas.
- **Resumo:** seção "Eventos em andamento" com rodadas restantes e descrição ao passar o mouse.
- **Stamina:** barra sob a vida; correr gasta (`STAM`), zerou trava até 25; recarrega parado/andando.
- **Pulo:** 1 bloco no máximo. **Queda:** acima de 3 blocos, 8 de dano por bloco extra (`FALL`); água anula.
- **NPCs de serviço e líder:** imortais, não fogem (`NPC_FIXED`); tiros os atravessam.
- Save v19.

## F5d (2): ajustes e rebelião em cidade do jogador
- **Dungeon dourada:** opção B custa ◉100 (e o pagamento de consolo, ◉100). O portal só vale no turno do comandante em que surge: ao fim da rodada some do mapa/minimapa e a disputa é desfeita (`expireGolden`, `js/dungeon.js`). As tropas da disputa vêm de até 2 facções NPC **diferentes e existentes** (cidade do jogador não manda tropa).
- **Morte do comandante:** morrer (respawn) na rodada ≥ 1 encerra o turno e vai para o líder (`respawn`, `js/game.js`).
- **Modo invencível:** não gasta estamina.
- **Sala do líder:** o soldado usa a cor da facção do jogador e as bandeiras (2 na parede, 1 de mastro ao lado da mesa) usam a bandeira dela; atualiza ao mudar a identidade (`officeLook`, `js/rounds.js`).
- **Rebelião em cidade sua (`js/rebmine.js`):** usa a mesma máquina das rebeliões NPC (`STATE.reb.cur` com `owner:0`). No turno do líder a cidade pega fogo, ganha a bandeira dos rebeldes e vem o cartão "Rebelião na sua cidade". A) Lutar: no comandante, a invasão começa ao chegar perto (só seus soldados contra os rebeldes); vencendo, a cidade volta a ser sua na hora e fica 5 rodadas sem se rebelar, sem pós-rebelião; se você cair, ela fica independente (sem cartão). B) Reconhecer a independência: nasce facção nova (relação Favorável) ou uma que apoiou anexa (60%); as outras cidades suas ganham +1 de descontentamento. Chance de apoio por relação (`REBM.sup`): guerra 80%, inimiga 40%, desfavorável 30%, neutra 20%, favorável/aliada 0%. Se já há outra rebelião em andamento, a cidade se rebela do jeito antigo (guarnição para reconquistar). Teste: modo criativo → Invocar evento → Rebelião na sua cidade.
- **Correções da rebelião em cidade sua:** `facOf` devolve um substituto ("Facção extinta") para ids sem facção (antes `.name` quebrava o jogo quando a cidade vinha de uma facção destruída); `facCities` ignora cidades em rebelião (elas são dos "Rebeldes"); facção nova nunca reaproveita o id de uma destruída; o cartão mostra a tabela de lados (rebeldes × você e aliadas); se os rebeldes acabam e a vitória não foi registrada, `rebWatch` a registra (evita "rebelião pendente"); se outra rebelião está em andamento, a cidade espera a próxima rodada; o contador "Aliados" não aparece na batalha em cidade sua.
- **Efeitos (aba de buffs/debuffs):** só o que afeta o jogador; sumiram caravanas entre NPCs, choques de suprimento de facções NPC e embargos entre NPCs.
- **Rebelião em cidade sua começa já no fim da rodada:** `rebelCity` chama `rebAnnounce` na hora (fogo, ruínas, bandeira dos rebeldes, rotas cortadas). Antes a rebelião ficava "na fila" até o sorteio do turno do líder; se outra política ou um raid passasse na frente, a cidade ficava sem dono visível, com a facção extinta no mapa e sem destruição. Testado: rebelar → salvar/carregar no meio → reconhecer independência → salvar/carregar (a facção nova persiste).
