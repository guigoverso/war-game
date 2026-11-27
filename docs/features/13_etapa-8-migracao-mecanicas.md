# Etapa 8: migração das mecânicas para o mundo novo (feature 13)

Documento de **levantamento e validação**. Cada seção é uma mecânica do jogo: o que ela é **hoje**, o que o mapa mundi **provavelmente muda** (previsão da IA, para o usuário revisar), o que já foi **decidido** e o que está **em aberto**. Nada aqui é implementação: o código só começa depois da sessão 0B (ver "Sessões" no fim).

Fontes: `docs/features/5_mapa-mundi.md` (decisões e tabela de impacto), `6_plano-mapa-mundi.md`, `12_batalha-no-tile.md`, `docs/ESTADO.md`, `docs/fase-6-guerra.md`, `docs/MAPA.md`. **É rascunho da IA**: onde a descrição do "hoje" estiver errada ou incompleta, o usuário corrige na validação.

> **Status (2026-11-26): sessão 0A concluída.** Todas as seções A a G têm veredito e decisões nas linhas "Notas". Pendências para o planejamento (0B) no fim do documento.

## Como o usuário valida (sessão 0A)
Em cada seção há uma linha **Veredito**. Marque uma:
- `[ ] Sem mudança`: a mecânica fica como está (a IA só confere que nada quebra no mundo novo).
- `[ ] Adaptar`: a regra fica, só muda a parte espacial; a IA propõe o jeito e o usuário aprova.
- `[ ] Conversar`: há decisão de design a tomar; vira pauta de conversa antes de implementar.
- `[ ] Descartar`: a mecânica sai do jogo.
- `[ ] Acrescentar`: o usuário quer algo novo ligado a ela (escrever em "Notas").

Legenda do **Impacto (IA)**: Alto = refeito; Médio = a regra fica e a parte espacial muda; Baixo = quase intacto; Novo = não existe hoje; ? = a decidir.

## Vocabulário rápido (confirmado em `5_mapa-mundi.md`)
**Rodada** = turno do Líder + turno do Comandante. **Ação** = interação com o mapa mundi (andar). **Tile** = um nó do grafo, com um mapa local de 384. **Batalhão** = unidade macro (até 3), soldados só existem no tile. Ver o mapa mundi 3D pela tecla **J**.

## Estado de partida (o que já existe quando a etapa 8 começa)
Pronto e testado em Node: grafo (`macro/graph.js`), nomes (`tilename.js`), estado do tile e produção (`tilestate.js`), batalhões (`battalion.js`), cerco/fadiga/cicatrizes (`tilewar.js`), turno no mapa mundi (`worldturn.js`), batalha no tile (`battle.js`), recrutamento. **Não ligado**: as rodadas do jogo atual (`rounds.js`/`endRound`) não conhecem o turno do mapa mundi; o grafo não é salvo (`wgPack` existe, falta `STATE`); a luta de verdade no tile só existe por cenário (no mapa mundi há o atalho "Resolver por número"); o jogo padrão ainda é o mundo antigo (704, cidades-quadradas). A etapa 8 é **ligar tudo isso** e migrar cada sistema.

---

# A. Fundação: o laço do jogo

## A1. Rodadas: turno do Líder e turno do Comandante
- **Hoje:** `rounds.js` (151 linhas). Rodada 0 é preparação; a partir da 1: turno do Líder no escritório (políticas, operações, evolução), depois turno do Comandante (suprimentos, combate, andar pelo mapa). `endRound` fecha a rodada: economia (`econ.js`), humor, eventos, raids, relatório (`rdNow`, duas partes: anterior e atual).
- **Muda (IA):** o turno do Comandante vira o turno no mapa mundi (pool de ações, NPCs dão um passo por ação, `wtEnd` fecha). Falta **fazer `endRound` e `wtEnd` serem o mesmo fim de rodada** (hoje o turno só vive no mapa mundi) e decidir quando o tempo "passa" para o resto (economia, humor, raids contam por rodada).
- **Impacto (IA):** Médio. **Decidido:** ações que sobram viram passos dos NPCs (`wtEnd`); resumo da rodada no livro por `rdNow`. **Em aberto:** o pool de ações é provisório (6/8/10/12/15 por nível); ritmo do mundo "corre" mais quando o pool cresce?
- Veredito: `[x]` Sem mudança `[ ]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: fluxo igual ao atual, começa no turno do Líder. **Fim único**: `endRound` e `wtEnd` viram o mesmo fim de rodada. **Etapa 0 (preparação):** sem declarar guerra e com pool reduzido de **4 ações**; depois volta ao normal (6/8/10/12/15). **Ritmo do mundo escala com o pool:** NPC anda 1 tile por ação e o jogador pode andar mais de 1, e isso é o que equilibra (o jogador consegue interceptar um raid). **Mapa mundi em modo Líder:** abre a mesma tela (J) dentro do escritório, só para ver e criar/doar batalhões; **o Líder não move nem marca destino de batalhão**, quem move é só o Comandante. Único destino que o Líder marca: **rota da caravana** e **cidade a conquistar** (em guerra). Criar batalhão em outra cidade: paga o recrutamento, ou passa soldados do batalhão do Comandante (completo) para lá, e o do Comandante volta a 0.

## A2. Ações do Líder (`actCost`, `canAct`)
- **Hoje:** pontos que o Líder gasta no escritório por rodada (`econ.js`). Não confundir com as **ações do mapa** (andar).
- **Muda (IA):** continuam; ganha a criação de batalhões (`wtCreate`: primeiro grátis, depois 10 soldados + 100 de ouro) e doações (`wtDonate`).
- **Impacto (IA):** Baixo. **Em aberto:** a criação de batalhão gasta ponto de Líder ou só ouro/soldados?
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: **Criar batalhão** (turno do Líder, se houver vaga): custa **1 ponto de Líder + 1.000 de ouro** (sem o custo de 10 soldados; o ouro contrata os soldados e o comandante), nasce com 10 soldados e cresce por recrutamento; o Líder escolhe **qualquer cidade da facção** para ele nascer. **Limite de batalhões é por facção** (máx. 3 no total). **Doar/dividir:** só com o batalhão doador **dentro de uma cidade ou vila da facção**; pode doar até deixar o doador em 0 (serve para dividir um batalhão de 50 e criar outro já grande, sem recomeçar de 10). **Criar rota/caravana** (a caravana criada): custa **1 ponto de Líder**. **O primeiro batalhão continua grátis; se o jogador perder todos, cria um no turno do Líder sem ouro, só o ponto de ação.**

## A3. Entrar e sair do tile (mapa mundi <-> mapa local)
- **Hoje (código):** o mapa mundi 3D abre com J; o tile abre por `?cenario=tile`; o jogador não "viaja" de verdade entre os dois.
- **Muda (IA):** é a **ponte de tudo**: entrar no tile do mapa mundi gera o mapa local da semente do tile (`mapwin`/`tileCompose`) com o estado salvo (`STATE.tiles`), mostra o jogador e o(s) batalhão(ões) presente(s), e sair devolve ao mapa mundi (gastando ação). Define o que acontece com NPCs e soldados quando o jogador não está no tile (simulação resumida).
- **Impacto (IA):** Novo/Alto. **Em aberto:** transição visual (carregando, ~1 a 4 s de geração), pontos de entrada por abertura, "Explorar o tile" (já existe como adiar os NPCs).
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: **Entrar é escolha do jogador:** botão direito no tile > "Entrar no tile"; se não quiser, só passa por cima. **Entrar gasta 1 ação; sair não gasta** (senão quem gasta a última ação ao entrar ficaria preso). **Entrada pelo ponto da estrada de onde veio** (chegou pelo sul, começa no ponto sul; pelo norte, no norte). **Tile sem o jogador não "roda":** só os cálculos por eventos (ex.: bandidos saqueando geram contas de saque), sem simular NPCs. **Tela de carregamento:** 3 soldados correndo sem sair do lugar, no centro, e "carregando" embaixo (texto a listar antes de criar). **Só o Comandante entra** (o que o jogador controla); outros soldados só aparecem no tile se houve invasão de POI ou batalha grande.

## A4. Salvar e carregar
- **Hoje:** `save.js`, `SAVE_VERSION` 27, espaços de save, `migrateSave` com passos `if(d.v<N)`. O mundo antigo regenera da semente e grava só diferenças.
- **Muda (IA):** salvar o grafo (`wgPack`/`wgUnpack`), `STATE.tiles`, `STATE.bat`, `STATE.wt` (atores, batalhões, ações), e as diferenças por tile; save no meio da batalha grava a foto de antes dela (`batSnapshot`, já feito). Saves antigos **não casam** (decidido); o mundo novo vira padrão com `SAVE_VERSION` novo.
- **Impacto (IA):** Alto. **Em aberto:** permitir salvar com batalhão em marcha? salvar dentro do tile?
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: salvar o grafo, `STATE.tiles/bat/wt` e as marcas por tile. **Pode salvar com batalhão em marcha e dentro do tile** (grava a posição e o estado do tile). Saves antigos: **avisar que são de versão antiga e não carregam** (não somem calados). **Terreno base vem da semente; o jogador NÃO quebra nem coloca blocos** (não é Minecraft), então o save guarda só as **marcas do que foi feito** nos tiles visitados (baús abertos, acampamento limpo, inimigos mortos, coletados). Progresso do tile persiste ao carregar. **Corpos somem depois de um tempo da batalha** (poucas rodadas). **Estragos de cerco duram até a próxima rodada**; depois o tile reconstrói pelos pontos fixos de regeneração ao ser aberto de novo. **Tile nunca visitado** só tem estado leve e nasce "virgem" ao entrar pela 1ª vez.

## A5. Morte do jogador e do batalhão
- **Hoje:** morte do jogador no mapa tem penalidades do jogo antigo; dívida podia surgir.
- **Muda (IA):** já decidido: morte **nunca gera dívida**; o batalhão é destruído (perde soldados, ouro até 150, munição); sem batalhão, nasce um grátis na capital com o kit do comandante (`wtDeath`). Batalha pequena tem derrota branda (recua ao tile de origem); fuga na Defesa.
- **Impacto (IA):** Novo (macro pronto). **Falta:** punição de ouro/munição da derrota grande no tile (não é macro), ligar à tela de morte.
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: **Correção:** na **Defesa não existe fuga**; sair do raio de defesa = perder a batalha e **morrer** ("os inimigos o perseguiram"). Sem dívida nunca; sem batalhão nasce um grátis (A2). **Três formas de morrer do comandante:** (1) **tile neutro ou luta contra bandidos sem tropas junto:** perde ouro e **parte dos itens**, volta ao mapa mundi e **gasta uma ação**; (2) **batalha de POI** (com soldados invocados/repostos na luta): sofre as perdas e volta ao mapa mundi **perdendo 10 soldados do batalhão** (o batalhão sobrevive); (3) **batalha grande** (raid de bandidos ou ataque inimigo, qualquer dos 3 modos): **o batalhão se desfaz** (o comandante morreu; perde soldados, ouro até 150 e munição). Na forma 3: se houver **outro batalhão**, o jogador continua o turno do Comandante com ele; se **não houver**, o turno do Comandante acaba, a rodada passa e vai para o turno do Líder. **Derrota grande no tile:** mantém as mesmas perdas da destruição do batalhão. **Forma 1 perde:** ouro carregado, parte da munição e **alguns itens sorteados** (mantém armas/equipamento principal). **Tela de morte = tela narrativa**, sem listar o que perdeu, com texto por tipo: forma 1 (soldados o acharam desacordado no campo e o resgataram; inimigos saquearam o corpo); forma 2 (batalha de POI perdida, mas o sacrifício dos soldados o fez recuar em segurança); forma 3 (narração da batalha longa conforme o tipo dela, dizendo que morreu). **Conversão:** morrer em batalha de POI **sem soldados junto** não tem como punir 10 soldados, então vira **morte do batalhão** (forma 3), com outra mensagem (atacou sozinho e morreu); sem outro batalhão, acaba o turno do Comandante. Textos exatos: listar para aprovação antes de criar.

---

# B. Economia, cidades e facções

## B1. Economia das cidades (necessidades, produção, impostos, preços, humor, armazém, suprimentos)
- **Hoje:** `econ.js` + `economy-modifiers.js` (`ECON`). Por cidade: consumo de comida/madeira/minério/couro, produção própria, imposto, preço por escassez, humor (Satisfeito/Descontente/rebelde), armazém (`warehouse.js`) e suprimentos do turno do Comandante.
- **Muda (IA):** a regra é por cidade e fica; muda **de onde vêm as cidades** (tiles de cidade/vila do grafo) e onde entra a produção dos tiles de recurso (`TILE_PROD`: recurso = base + nível; `TILE_TAX`: imposto da vila 12 + 5 x rank). Já existe `STATE.tiles`, falta ligar ao `endRound`.
- **Impacto (IA):** Baixo. **Em aberto:** a produção de um tile de recurso vai para o armazém de qual cidade (todas do dono, como os efeitos de POI hoje?); tile de recurso longe das suas cidades rende igual?
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: **Um único armazém** liga todas as cidades da facção; a produção dos tiles de recurso vai para ele. **No livro**, o jogador **vê** o conteúdo do armazém (só consulta; para retirar, precisa entrar no armazém). **UI do armazém muda:** ganha uma área de **últimos ganhos da rodada**. **Ouro vira um saldo geral único**, sempre disponível (imposto e renda entram direto nele); **sai do armazém** (acaba "depositar/tirar ouro" como item). **Tile de recurso longe das cidades rende igual** (faz parte do território), mas por estar longe é **mais fácil de saquear** (interpretação minha: sem penalidade de distância na renda, só mais exposto; confirmar). **Renda vem por tipo de tile, não por POI:** tile de fazenda dá o bônus que antes a fazenda dava, qualquer que seja o POI dentro dele; **POI vira só ponto de interesse para explorar** (sem renda própria; sem dupla contagem).

## B2. Armazém e suprimentos
- **Hoje:** `warehouse.js` guarda recursos por cidade; suprimentos = reabastecimento do Comandante (comida, munição, remédios).
- **Muda (IA):** soldados em batalhão precisam de suprimento? Hoje o soldado do jogador é do exército local; no mundo novo há batalhões marchando.
- **Impacto (IA):** ? **Em aberto:** batalhão consome comida/ouro por rodada em marcha? Armazém fica só na cidade (sim, provavelmente).
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: **Batalhão em marcha não consome nada** (sem gerenciar comida/ouro para andar). **Suprimento:** o Comandante reabastece do armazém único ao entrar em **cidade ou vila da facção**. **Vilas hoje não geram armazém:** precisa de uma regra para a vila ter acesso/gerar armazém, e **nem toda vila consegue** (regra a definir). **Armazém único** para a facção. **Inventário único do Comandante, compartilhado por todos os batalhões** (entrar com o batalhão 1 ou 2 usa o mesmo inventário; ganhos compartilhados). **Lotação:** todos os quadrados preenchidos e pilha até **99** por item; o que não couber é **descartado** (**mantém os 24 slots atuais** do armazenamento compartilhado, `WH_SLOTS` em `warehouse.js`; o descarte é **silencioso**, sem aviso). **Vila com armazém: por nível da vila** (a partir de um rank a definir, número a escolher na implementação). O cofre de ouro (`vault`) some com o ouro geral (B1).

## B3. Evolução da cidade e da facção (`LVL`, muro, `CITY_UP_COST`)
- **Hoje:** o jogador gasta recursos para subir o nível da cidade/facção (muro maior, mais soldados, desbloqueios); `facLvl()`.
- **Muda (IA):** o nível da facção define **ações por rodada** e **quantos batalhões** (1/2/3); cidade de tile enorme e muro pela pegada (já feito no local).
- **Impacto (IA):** Médio. **Em aberto:** custo de evoluir, conflito entre pool de ações e outros usos do nível.
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: o nível da facção define **ações por rodada** (6/8/10/12/15) e **máx. de batalhões** (1/2/3), além do que já dava. **Custos de evolução mantidos.** **Evoluir a facção gasta 1 ponto de Líder.** **Evolução da cidade (muro, torres) independente** do nível da facção. **Vila não evolui** por enquanto (ideia para o futuro); o rank da vila é o que o grafo gera (afeta imposto e armazém).

## B4. Políticas locais e eventos
- **Hoje:** `policies.js` (435 linhas) e `docs/politicas-locais.md`: cartões por cidade decididos no turno do Líder; eventos sorteados (também "Invocar evento" no modo criativo).
- **Muda (IA):** quase nada; são cartões por cidade. Eventos que citam lugar físico (raid, caravana, rebelião) precisam do tile.
- **Impacto (IA):** Baixo.
- Veredito: `[x]` Sem mudança `[ ]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: **cartões de política continuam só por cidade** e gastam ponto de Líder como hoje. **Evento que cita lugar marca o tile no mapa mundi** enquanto estiver ativo (sem notificação nova). **Raids também podem ter como alvo vilas e outros tiles** (não só cidades): em vez de mexer no humor, **o jogador perde o tile para os bandidos** (ver C2). A conferir: se existem outros eventos parecidos com raid.

## B5. Facções: relações, grafo de relações, oferta e escassez, eventos, reuniões, eventos globais
- **Hoje:** `factions.js`, `facgraph.js`, `facevents.js`, `globalev.js`, `meeting.js`, `fase-5-reunioes.md`. Relações, temperamento (agressiva/neutra/pacífica), comércio, oferta/escassez, negociação (`negoc.js`), reuniões na sala (espaço à parte).
- **Muda (IA):** a lógica é de dados e fica. Mudam as **rotas** (`fgRoutes`) que passam a ser arestas do grafo, e eventos com resgate/espaço físico. Facções NPC passam a ter **territórios** (cidades/vilas/tiles de recurso com dono).
- **Impacto (IA):** Baixo a Médio. **Em aberto:** tamanho das facções vs 5 a 7 cidades e 7 a 9 vilas do grafo; facção NPC agindo no mapa (atores) já na etapa 8 ou só na 10?
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: lógica de dados continua; rotas viram arestas do grafo. **Início:** o jogador começa com **uma única cidade**; os NPCs começam com **tiles próximos anexados**. **Facções NPC agem no mapa já na etapa 8, com caravanas e batalhões:** os batalhões vão **conquistar tiles** ou **caçar bandidos**, e podem **se juntar ao jogador numa batalha grande contra bandidos**. **Conquista de tile: no máximo um por rodada**, o tile onde o batalhão parou por último, **a não ser que o jogador esteja no mesmo tile** (aí vira encontro/batalha). **Tile conquistado muito distante** do território da facção pode **ficar independente**. Eventos com resgate/espaço físico: marcam o tile (como na B4). **NPC conquista só tiles neutros e de bandidos** (conquistar de outra facção é guerra, etapa 10).

## B6. Humor e rebeldia por cidade
- **Hoje:** humor da cidade (suprimento, política, saque) leva à rebelião.
- **Muda (IA):** por tile de cidade/vila; a vila também tem humor? (hoje só há imposto de vila).
- **Impacto (IA):** Baixo. **Em aberto:** vila tem humor/rebelião?
- Veredito: `[x]` Sem mudança `[ ]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: **humor e rebelião continuam só por cidade, iguais a hoje.** **Vila não tem humor nem rebelião.** A vila só pode ser **perdida (independência) se estiver muito longe** do dono; se **faz fronteira com um tile do dono, não há chance de independência** (vale também para as facções NPC).

---

# C. Movimento, atores e conflito

## C1. Caravanas
- **Hoje:** `caravans.js` (239 linhas): rota entre cidades (`fgRoutes`), guarda, compra/venda, saque, emboscada por bandidos (`raids.js`).
- **Muda (IA):** viram **atores no grafo**, andando por arestas de estrada e voltando (já há caravana ator em `worldturn.js`). Ao entrar no tile da caravana ela aparece na estrada (decidido), mais para decoração ou saque.
- **Impacto (IA):** Alto. **Em aberto:** o comércio real (oferta/escassez, ouro) acontece quando ela chega ao tile da cidade destino; emboscada = bandido e caravana no mesmo tile (encontro); jogador pode escoltar?
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: caravana vira **ator no grafo** (arestas de estrada, ida e volta); criada pelo Líder (1 ponto, A2). **Suprimento: enquanto a caravana existir, as cidades são supridas** (não depende de chegar ao destino; interpretação minha: as cidades da rota). **Emboscada:** bandidos e caravana no mesmo tile; **os bandidos demoram 2 ações para conseguir saquear**, dando tempo de o jogador interceptar (sem o jogador, resolve por número). **Sem escolta** por enquanto. Custo em ouro e guardas próprios da caravana (sem tirar de batalhão). **Cada cidade pode ter apenas 1 caravana.** **Aparece no Campo:** ao entrar num tile com caravana, aparece uma representação dela na estrada.

## C2. Raids (ondas de bandidos contra a cidade)
- **Hoje:** `raids.js` (242 linhas), `RAID_WAVES`/`RAID_GAP`, `RAID_LOSS_*`: ondas que chegam à cidade; emboscada de caravana.
- **Muda (IA):** decidido (rodadas 8 a 10): bandidos surgem perto da cidade e chegam em **3 a 5 ações**; o jogador tem de **interceptar**; ao chegar ficam 2 a 3 turnos; se o jogador entra, cidade **em chamas** e a luta é como **invasão** (reaproveitar a antiga, hoje desativada); não resolver = perde, saque (`RAID_LOSS_*`); visual de rebelião (fumaça, corpos) na rodada N e N+1; origem em bandidos soltos e na política.
- **Impacto (IA):** Médio. **Em aberto:** tamanho do exército de raid (do teste 30 x 10); o que a cidade perde exatamente; cidade em chamas ao perder.
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: (vindo da B4) o alvo de um raid pode ser **vila ou outro tile**, não só cidade; nesses, **perder = o tile passa para os bandidos** (sem efeito de humor). **Correção:** os bandidos ficam **2 a 3 ações** no alvo (não "turnos") antes de concluir o saque. **Exército do raid: 30 a 60 bandidos.** **Qual batalha:** bandidos e jogador se encontram num tile que **não é o alvo** = **Choque**; bandidos chegam ao alvo e o jogador **já está lá** = **Defesa**; bandidos **já estão saqueando** e o jogador chega = **Ataque**. **Cidade saqueada:** perde parte do ouro geral e dos itens do armazém (`RAID_LOSS_*`) **e o humor também diminui**; não muda de dono (só vila e tiles se perdem). **Cidade em chamas:** visual de rebelião por 2 rodadas e volta ao normal. **Raid em vila/tile:** mesma regra de chegada (3 a 5 ações) e permanência. **Sem limite de raids por rodada** (nem simultâneos).

## C3. Bandidos soltos e acampamentos
- **Hoje:** acampamentos de bandidos como POIs, donos "bandidos"; a maioria dos POIs começa com eles; limpar é combate local.
- **Muda (IA):** atores de bando no mapa mundi (já há bandido que caça à vista); tiles dominados por bandidos; "limpar" um tile pode passar a ser a batalha de Ataque.
- **Impacto (IA):** Médio.
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: **Bandidos soltos** andam 1 passo por ação e **tendem a ir para caravanas, vilas e cidades**, com preferência pelo **mais perto**; em empate, do **mais fraco para o mais forte** (caravana, vila, cidade); ainda empatado, **sorteio**. **Limpar tile de bandidos** = vencer a batalha de Ataque; **o tile passa a ser do jogador**, mas os **outros POIs seguem com bandidos**, sem contar para a conquista do tile e sem serem disparados por um raio grande. **Bandidos reaparecem** por sorteio em tiles neutros/abandonados e, com chance menor, em **tiles anexados**, **nunca no POI principal**; **sem aviso** se um POI do jogador cair no sorteio. **Missão nova:** limpar POIs tomados por bandidos em território do jogador (ou de outra facção, dando relação); se não houver POI que se encaixe, **o jogo toma um POI para os bandidos**. **Início: a maioria dos tiles não ocupados** tem bandidos. **Origem dos soldados nas batalhas (Ataque, Defesa, Choque):** os soldados saem de um POI do jogador no tile; se o tile só tem POIs de bandidos, **o jogo conquista automaticamente um para o jogador** como ponto de saída; **ao vencer, esses POIs continuam do jogador e os POIs que os bandidos usavam também são limpos**. **Batalha para tomar o tile só ocorre dentro do POI principal** e o jogador precisa **atacar ativamente**; **fugir dela não é derrota** (sem mensagem de perda): a batalha só pausa e os inimigos voltam ao lugar, como hoje no POI; **fugir não gera perda de soldados** (só os que morreram). Obs.: isso vale para o Ataque; na **Defesa não há fuga** (A5).

## C4. Rebelião (batalha, mina, ruínas)
- **Hoje:** `rebellion.js` (603 linhas), `rebmine.js`: cidade rebelde vira batalha local; missão da mina; ruínas.
- **Muda (IA):** a batalha vai para o tile da cidade; a mina e as ruínas viram sítios ou tiles. A cidade destruída reaproveita o visual da raid.
- **Impacto (IA):** Médio. **Em aberto:** rebelião de vila; mina como tile temático de mina ou sítio no tile.
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: **Erro do levantamento:** `rebmine.js` não é "mina": é a rebelião em cidade **do jogador** (nome do arquivo me enganou); **mina e ruínas não têm ligação com a rebelião** (ficam na D1/D5). **Batalha da rebelião = Ataque** no tile da cidade; **os rebeldes não ficam limitados a 30**, podem ser mais. **Cidade rebelde que o jogador não retoma é perdida**: pode **virar uma facção nova ou ser anexada por uma facção próxima** (já é a regra atual em `rebmine.js`); **vale também para as cidades NPC**. Visual da cidade destruída: reaproveita o do raid (fumaça, corpos, 2 rodadas).

## C5. Batalha (os layouts)
- **Hoje (pronto):** `battle.js` com modos Núcleo, Choque, Defesa, Ataque, pequena; geradores com raio; arredores; batalhão em 3 partes; cerco e fadiga (`tilewar.js`).
- **Falta ligar:** o **encontro no mapa mundi** (mesmo tile) abre a batalha de verdade com os batalhões; layouts decididos: campo, defesa da cidade, invasão da cidade. Entre NPCs a batalha é por número.
- **Impacto (IA):** Médio. **Em aberto:** transição ao perder/ganhar (devolver ao mapa mundi), 30 x 10 aprovado pelo usuário?
- Veredito: `[ ]` Sem mudança `[ ]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: **Veredito geral: Adaptar** (ligar o encontro do mapa mundi à batalha de verdade). **Ao vencer o jogador continua no tile** (anda ou sai); perda grande segue a A5. **Entre NPCs a batalha é por número**, **a não ser que o jogador intervenha e escolha um lado** para lutar. **Batalha pequena / morte numa invasão de POI:** o jogador recebe a consequência da morte (A5), **volta ao mapa mundi e continua em cima do mesmo tile** (não recua ao tile de origem); entrar em Campo de novo custa **mais uma ação**. Ex.: sai da cidade (1 ação) até a Fazenda de Santa Cândida, entra em Campo (outra ação), invade a Torre de Vigia e morre: volta ao mapa mundi ainda na fazenda. **O jogador controla só o Comandante**, soldados na ordem V/X como hoje. Limites 30 inimigos x 10 soldados aprovados. **Batalhões no mesmo tile se somam:** dois batalhões de 50 viram uma batalha de 100, mantendo os limites de campo (máx. **30 inimigos** e **10 soldados do jogador**); vale para os dois lados. **Baixas divididas igualmente** entre os batalhões (morreram 28: 14 de cada). **Encontro não começa de imediato:** se o jogador tem 2 batalhões e um entra em tile de batalha, a luta espera; ele gasta os movimentos desse batalhão e pode mover o outro, para se posicionar em outro ponto ou juntar os dois na batalha.

## C6. Combate local: armas, inimigos, IA, aliados, quartel, mercenário
- **Hoje:** `weapons.js`, `entities.js`, `allies.js`, `battle.js`; IA de cobertura e carregador feitas; ordem V/X dos soldados.
- **Muda (IA):** quase nada; vive no mapa local. Pistola inquebrável e munição em dívida (1C) entram.
- **Impacto (IA):** Baixo.
- Veredito: `[x]` Sem mudança `[ ]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: vive no mapa local. **Kit do comandante** (pistola, munição, cura) só é dado quando o jogador **não tem nada** (resgate); **o kit não dá soldados**; **o batalhão grátis nasce com 0 soldados** (comandante sozinho já é um batalhão; ver C7). Quartel só na cidade e mercenário na Taverna, como hoje.

## C7. Recrutamento e exército
- **Hoje (pronto, passo 11):** teto 50 por batalhão (`ARMY.max`), limite por rodada por lugar (cidade 50, vila 15, neutra 5), barraca de alistamento na vila, Quartel só na cidade.
- **Muda (IA):** liga aos batalhões (`batCreate/Gain`) e às rodadas (o limite "renova" por rodada).
- **Impacto (IA):** Baixo (já em código).
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: **Definição importante (vale para o jogo todo): batalhão = comandante = o boneco que o jogador controla no mapa.** Comandante com 10 soldados é um batalhão; comandante com 0 soldados também. Cada batalhão é **um personagem duplicado do jogador**: no tile e na batalha o jogador controla o personagem daquele batalhão, e **todos compartilham inventário, informações e upgrades**. O que muda entre batalhões é só a **quantidade de soldados**. Não há diferença entre "comandante" e "batalhão". **Criar batalhão (1.000 de ouro) = pôr mais um boneco no mapa para mover.** **Recrutamento entra no batalhão que está no tile** (ex.: B2 entra na Vila Cinza e recruta lá: entra no B2). **Limite de recrutamento da cidade cai para 25 por rodada** (vila 15, neutra 5 mantidos). **Lugar neutro mantém o limite 5**, recrutado pelo batalhão presente. O contrato de 1.000 cria o batalhão e o recrutamento normal o enche até 50.

---

# D. Lugares

## D1. POIs (10+ tipos): anexação, guarnição, renda, pedágio, efeitos
- **Hoje:** `pois.js`, `poigame.js`, `poimicro.js`, `poilego*.js`: fazenda, mina, serraria, caçadores, santuário, ponte, forte, torre, taverna, entreposto, ruínas, pousada, alojamento, vila em escombros. Têm dono, renda e efeitos para **todas as cidades do dono**; anexáveis por conquista; "no caminho" de rotas.
- **Muda (IA):** decidido: viram **sítios dentro de um tile** (receitas lego já prontas). Efeitos globais do dono ficam pequenos; renda passa a ser **produção do tile** (`TILE_PROD`)? Há dupla contagem a evitar (POI de fazenda e tile de fazenda).
- **Impacto (IA):** Alto. **Em aberto:** o que sobra de "POI com dono" quando o tile inteiro tem dono; guarnição do POI vs guarnição do tile.
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: **Cada POI mantém o seu dono**; o tile só é do jogador quando o **POI principal** é dele. **Efeitos globais saem** (só serviço local fica) e **renda sai** (vem do tipo de tile). **Torre de vigia:** passa a **procurar dungeons**; elas **deixam de ser geradas aleatoriamente** e só aparecem quando o jogador usa a torre; **máx. 3 torres por rodada**, independente de quantas tenha. **Santuário:** cura no altar **mediante dízimo**, menor que a cura do hospital e **sem sofrer buffs/debuffs**. **Só o POI principal tem guarnição** que defende o tile. **Conquistar POI secundário** dá o serviço (loja, taverna, fogueira) sem tomar o tile. **Baú de recompensa em POI tomado por bandidos**, por tipo (fazenda: comida, mina: minério, torre: munição): o baú aparece fechado e só abre com o POI livre; **reabastece** (uma vez por ocupação) se os bandidos retomam; escala com o tipo de tile. **A recompensa do POI é o próprio baú** (sem bônus/efeito além do serviço local); **caçadores: só o baú**. No futuro, minigames de atividades mudam isso um pouco. **Tabela tipo de POI > loot: a IA envia sugestão quando for implementar.** **Forte** = POI principal de tile de fortaleza e **vila em escombros** = POI de ruína (assumidos aprovados). **POI com loja:** na rodada seguinte à conquista, quando é repovoado, **a loja funciona normalmente, afetada por buffs e debuffs**.

## D2. Serviços dos comerciantes (lojas, taverna, pousada, entreposto)
- **Hoje:** `svcOpen`/`svcShopView`, Armeiro, Loja, Taverna (quarto, ferreiro, mercenário), Pousada, Alojamento, Entreposto; ouro do comerciante renovado por rodada.
- **Muda (IA):** nada, só onde estão (dentro de tile). Estoque de materiais do entreposto por rodada continua.
- **Impacto (IA):** Baixo. A regra "Comprar / Vender" primeiro (Entreposto e Taverna ainda não seguem) pode ser adaptada aqui.
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: regras iguais, só muda onde ficam. **Entreposto e Taverna passam a seguir o menu Comprar / Vender** (e abas quando houver categorias). **Ouro do comerciante continua limitado e renovado por rodada**, separado do ouro único do jogador. **Mercenário contratado entra no batalhão presente no tile**, respeitando o teto de 50. Lojas de POI funcionam normalmente na rodada seguinte à conquista, com buffs e debuffs (D1).

## D3. Torre de vigia
- **Hoje:** "Fazer vigia": 1 uso por torre por rodada, raio 300 (maior que um tile), marca "?" no mapa.
- **Muda (IA):** decidido: mecânica atual **deixa de fazer sentido**. Proposta do usuário: a torre nova marca um **tile com tesouro/dungeon por uma rodada**. Ideias da IA: revelar atores nos tiles vizinhos; avisar de onde vem um raid e por qual trilha.
- **Impacto (IA):** Novo. **Em aberto:** alcance (vizinhos? 2 saltos?), o que revela, efeito na sabotagem de espião (guerra, pausada).
- Veredito: `[ ]` Sem mudança `[ ]` Adaptar `[ ]` Conversar `[x]` Descartar `[x]` Acrescentar. Notas: a mecânica atual (raio 300, "?" no mapa) é **descartada**. **Torre nova:** máx. **3 usos por rodada** (D1); alcance = **tile da torre e vizinhos (1 salto)**; cada uso revela **uma** dungeon, com **50% de chance de não revelar nada**; sem dungeon no alcance ou no sorteio ruim, **gasta o uso e não acha nada**; a dungeon aparece **marcada no tile do mapa mundi**, e a **marca dura só aquela rodada**; **a dungeon também some junto com a marca** (janela de oportunidade de uma rodada, não acumula no save). **Sem revelar atores nem raids** (o jogador já vê tudo o que acontece no mapa). Sabotagem de espião fica para a etapa 10.

## D4. Ponte e pedágio
- **Hoje:** POI ponte cobra pedágio ◉20 x nível; rota de caravana passa por ela.
- **Muda (IA):** **tile de ponte** do grafo (nasce no vão); o modelo local `tcBridge` ainda é simples e deve ganhar ramos por abertura/estrada (pendência da etapa 6).
- **Impacto (IA):** Médio.
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: **tile de ponte** do grafo; o pedágio sai do POI e vai para o tile. **Pedágio base: 100** (sobe de ◉20 por nível). **Só o batalhão paga** (do jogador ou NPC); **caravanas não pagam**. **Ponte da facção do jogador: de graça para ele**; quando um **NPC** passa por ponte do jogador, **entra o dinheiro automaticamente** (100 + buffs/debuffs). **Ponte neutra cobra** igual (a neutra é como uma facção local que não entra em guerras). **Ponte de outra facção: 150** + **modificadores pela relação** (aliado paga menos, rixa/inimigo paga mais). **Jogador pode ficar em dívida** ao pagar. **Popup:** na primeira tentativa de passar, aparece "tem que pagar"; o jogador **paga ou recusa**; se recusar **fica parado no POI da ponte**, com as opções **voltar** ou **tentar cruzar de novo** (mesmo popup). O popup tem **"Não mostrar novamente"**; ativado, o pagamento é automático; **nas configurações há um botão para mostrar/ocultar** o popup. **Só se paga ao atravessar para o lado oposto** ao de onde veio (quem está em cima da ponte e volta não paga). **Bandidos não pagam**: tentam **tomar a ponte em 2 a 3 ações** e ficam lá; o jogador pode passar sem enfrentá-los pagando **500 moedas**. Modelo local `tcBridge` (ramos por abertura/estrada): assumido para a 8.5. Textos do popup e valores por relação: listar/aprovar na implementação (modificadores em `poi-modifiers.js`).

## D5. Dungeons, portais, veios, lendárias, portal dourado
- **Hoje:** `dungeon.js` (425 linhas): espaço à parte acessado por portal; veios, lendárias e portal dourado.
- **Muda (IA):** decisão em aberto: espaço à parte (como hoje) ou sítio de tile; o tile de **ruína** e a torre de vigia nova ligam a tesouros/dungeons.
- **Impacto (IA):** ? (a decidir).
- Veredito: `[ ]` Sem mudança `[ ]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: **Dungeon continua espaço à parte** (como hoje), aberta por portal. **Só se acessa depois de entrar no tile em Campo:** achada pela torre, o jogador sai do Campo, vai ao tile da dungeon no mapa mundi, **entra no tile (1 ação, a de entrar em Campo)** e aí procura o portal; **entrar na dungeon não gasta ação extra**. **Não dá para encerrar o turno dentro da dungeon** (como hoje). **A dungeon é marcada no mapa mundi e também no mapa local** (minimapa e Mapa M). **Veios e lendárias ficam como hoje** na dungeon; **portal dourado** surge só **por evento**, em qualquer tile do jogador ou neutro (não está ligado a ruína/tile de ruína). **Baús de dungeon sem mudança.** **Definição de ruínas (vinda da C5):** tile, cidade ou vila de ruínas é um lugar antigo, destruído por algo e **nunca mais habitado**. **Nenhum tile/cidade/vila vira ruína, e ruína nunca é reconstruída** para virar cidade ou vila; ela fica **estática** (valem também para raid e rebelião: cidade destruída é só visual temporário, não vira ruína).

## D6. Cidade e vila (geração, muro, portões, moradores)
- **Hoje (pronto no local):** cidades enormes em tile 384 (7 formatos), vilas (`CITY_VILLAGE`), muro/torres pela pegada, estradas dos portões; moradores, guardas e soldados.
- **Muda (IA):** o mundo antigo gera 6 a 8 cidades quadradas; o novo gera 5 a 7 cidades + 7 a 9 vilas pelo grafo. **Falta** cidade vizinha do tile e o estado salvo ligado.
- **Impacto (IA):** Alto, mas em boa parte feito.
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: **Mundo novo gera 5 a 7 cidades + 7 a 9 vilas** pelo grafo. **Cidade/tile vizinho visível além da borda:** o usuário **quer, se for possível** (previsão da IA enviada; decidir se entra na 8.9). **Moradores são gerados toda vez que o jogador entra no tile** (sem NPC único, só lojistas), **sem guardar estado deles**. **Estado salvo da cidade:** o que o jogador mudou (nível, muro, construções) **+ POIs limpos, baús abertos, inventário das lojas e armazém**; o resto vem da semente. **Vila pequena** (`CITY_VILLAGE`): **sempre tem cura e prefeitura**; os demais serviços (barraca de alistamento, taverna etc.) **têm chance de aparecer ou não**.

---

# E. Missões, jogador e interface

## E1. Missões (quadro, entrega, facção)
- **Hoje:** `missions.js`, `quests.js`: quadro de missões, entregas, missões de facção, "levar a" entre cidades.
- **Muda (IA):** decidido: viajar gasta **ações normais**; entregar = **entrar no tile e ir até a prefeitura**. Destinos viram tiles.
- **Impacto (IA):** Médio. **Em aberto:** prazo em rodadas ou ações; missão para tile que o jogador nunca viu (fog).
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: viajar gasta ações normais; **entregar = entrar no tile e ir até a prefeitura**. **Prazo em rodadas**, e a missão é **executada no turno do Comandante**. **Sem fog de guerra: todos os tiles já são revelados** (nunca foi decidido ter fog; a ideia G1 está descartada). **Vilas têm missões, mas poucas (máx. 3) e só do próprio tile** (sem entrega). **Missões de cidade** podem ser de entrega para **qualquer cidade ou tile cujo POI principal não esteja tomado por bandidos**. **Quadro de missões fica na prefeitura.** **Missões de facção** têm como destino tiles de outras facções (limpar POI de bandidos em território de outra facção dá relação). Missão nova da C3: limpar POIs tomados por bandidos em território do jogador.

## E2. Jogador: vida, inventário, buffs, durabilidade, lojas, cura, pesca, culinária
- **Hoje:** `inventory.js`, `cooking.js`, `fishing.js`, `store.js`; pistola inquebrável e munição em dívida (1C).
- **Muda (IA):** nada, além do kit do comandante novo (pistola, munição, cura) para o batalhão grátis.
- **Impacto (IA):** Baixo.
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: **vida única e compartilhada** entre todos os batalhões (é o mesmo personagem duplicado), junto com inventário, buffs e upgrades. **Buffs e debuffs em rodadas, como já está implementado.** **Cura:** cidade, vila (sempre tem), santuário (dízimo) seguem cada um a sua regra; **tavernas e entrepostos também devem vender itens de cura**. **Pesca e culinária** continuam só em Campo. Kit do comandante, pistola inquebrável e munição em dívida entram como previsto.

## E3. Escritório do Líder e sala de reunião
- **Hoje:** `office.js`, `meeting.js`: espaços à parte (turno do Líder, reuniões de facção).
- **Muda (IA):** continuam espaços à parte; o escritório ganha a entrada para o mapa mundi (criar batalhões).
- **Impacto (IA):** Baixo.
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: escritório e sala de reunião **continuam espaços à parte**; não gastam ação (como hoje). **No escritório o mapa mundi (modo Líder) abre pela tecla M** (a conferir como isso convive com a J e o Mapa M do Campo), **por um mapa na mesa** e também **pelo livro**. **Reuniões só ocorrem no evento em que as facções se reúnem**, como hoje.

## E4. Mapas e navegação (minimapa, mapa grande, caderno, escolha no mapa, binóculo)
- **Hoje:** minimapa, mapa grande (M), caderno > Mapa, `bookmap.js`, `warbook.js`; binóculo.
- **Muda (IA):** o **mapa mundi 3D** substitui o mapa grande; o minimapa mostra só o tile; o caderno resume a rodada e mostra o grafo. (Termos: Campo, Mapa M, Minimapa, Mapa mundi; não dizer só "mapa".)
- **Impacto (IA):** Alto.
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: **mapa mundi 3D substitui o mapa grande como visão do mundo.** **Teclas:** J abre o mapa mundi; **no escritório (modo Líder) a M abre o mapa mundi**; no Campo a M continua abrindo o **Mapa M**, que **só existe dentro do tile, em Campo**. **Minimapa** mostra só o tile. **Caderno > Mapa abre o 3D** (sem mapa separado). **Binóculo:** é a peça da **Torre de Vigia** (tripé no alto), então vale **somente a regra da D3** (não é item à parte e **não acha mais os baús escondidos**; nenhuma regra nova para eles). **Mapa mundi mostra todos os atores** (caravanas, bandos), sem fog.

## E5. Livro/caderno e relatório da rodada
- **Hoje:** `book.js`, `rdNow` (relatório em duas partes: anterior e atual).
- **Muda (IA):** recebe o **resumo do mundo** (o que os NPCs fizeram, chegadas, cercos) em tom narrativo.
- **Impacto (IA):** Médio.
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: o livro recebe o **resumo do mundo**, **só de uma rodada para a outra**. Entra **só o que importa**: raid chegando/saqueando, tile conquistado ou perdido, caravana saqueada, ponte tomada, batalha entre NPCs, **+ mudanças nas relações entre facções, caravanas criadas e caravanas desfeitas**. Aparece numa **seção "Mundo" dentro da parte "anterior"** do relatório. **Tom narrativo**; textos em arquivo de texto da categoria, com a lista aprovada antes. **Sem notificações novas** (tudo no livro; assumido confirmado).

## E6. Mundo físico: geração, dia/noite, clima, som, animais
- **Hoje:** `world.js` (704, sementes), dia/noite, clima, `ambient.js`, animais, pesca.
- **Muda (IA):** geração por janela do campo (feito); dia/noite e clima: **dia por ações** já aparece no mapa mundi; clima por tile?
- **Impacto (IA):** Baixo a Médio. **Em aberto:** dia/noite do tile acompanha o relógio do mapa mundi?
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: **relógio único: o horário do mapa mundi e o do Campo são o mesmo.** Ao entrar no tile o Campo parte do horário do mapa mundi, e **ao sair o mapa mundi assume o horário em que o jogador saiu** (entrou às 08h e saiu às 19h: o mapa mundi fica de noite). **O mapa mundi não tem hora, tem partes do dia; o Campo tem horas.** Tabela: **Manhã 06h~12h, Tarde 12h~18h, Noite 18h~00h, Madrugada 00h~06h.** Ao entrar, o Campo parte da hora correspondente à parte do dia (hora exata de entrada: a definir; sugestão: início da faixa); ao sair, a hora do Campo vira a parte do dia do mapa mundi. Luz: manhã mais ensolarada, tarde com o sol começando a descer, noite escura, madrugada com o sol subindo timidamente. **Tempo dentro do tile não gasta ação.** **Clima: não existe no jogo e não será criado** (o termo veio de uma linha do levantamento de `5_mapa-mundi.md`, "Dia/noite, clima, som, animais, pesca"; o único parente é o evento global "grande chuva" em `globalev.js`, que é de facções). **Som e animais** sem mudança: vivem no Campo, sorteados na entrada, sem estado salvo.

---

# F. Pausadas e futuras (só conferir que a etapa 8 não as bloqueia)

## F1. Guerra (frente, operações, POIs de guerra, cabo de guerra, fadiga, espiões, aliados, paz)
- **Hoje:** `war.js`, `warfront.js` (801 linhas), `warops.js`, `docs/fase-6-guerra.md`; **pausada** até a etapa 10. A fadiga e o cerco já entraram nas consequências da batalha (`tilewar.js`).
- **Muda (IA):** refeita como batalhões no grafo; ficam só os ganchos (declaração, cerco, `tileWarFatigue`).
- **Impacto (IA):** Alto (etapa 10).
- Veredito: `[x]` Sem mudança `[ ]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: guerra **continua pausada até a etapa 10**; **declarar guerra bloqueado até a 10** (e já na etapa 0). **Cerco e fadiga** seguem nas batalhas de Ataque e Defesa. **Facções NPC não fazem guerra entre si na etapa 8** (só conquistam neutros e bandidos). Ficam só os ganchos (declaração, cerco, `tileWarFatigue`).

## F2. Mar: navio, arena naval, piratas
- **Hoje:** não existe. Etapa 9: aluguel (início 100, grátis com cidade de porto), embarque, arena naval, piratas.
- **Impacto (IA):** Novo. A etapa 8 só precisa não bloquear (ilha inicial/porto já no grafo).
- Veredito: `[x]` Sem mudança `[ ]` Adaptar `[ ]` Conversar `[ ]` Descartar `[ ]` Acrescentar. Notas: **sem mar na etapa 8** (travessias por mar só na etapa 9); a etapa 8 só não bloqueia. **Cidade/tile de porto é acessível normalmente** (é um tile de terra como os outros; só o embarque e o mar ficam para a 9). Tiles de mar não são acessíveis por ora.

## F3. Cenários de teste, modo criativo, smoke
- **Hoje:** `scenario.js`, cenários `?cenario=...`, abas de teste na pausa, `tests/smoke.js`, galerias `cenarios-*.html`.
- **Muda (IA):** cenários por tile; smoke novo para o mundo novo (`?mundo=1`); atalhos criativos no mapa mundi.
- **Impacto (IA):** Médio.
- Veredito: `[ ]` Sem mudança `[x]` Adaptar `[ ]` Conversar `[ ]` Descartar `[x]` Acrescentar. Notas: **atalhos criativos no mapa mundi:** **anexar/desanexar um tile** e **fazer bandidos dominarem o tile** (os outros atalhos sugeridos pela IA, como ouro, pool de ações, batalhão grátis, teleportar, invocar raid/caravana, ficam como opção a confirmar na implementação). **Cenários novos**, feitos por tile; **os antigos vão para uma pasta de cenários, subpasta `legado`** (a criar). **Mundo antigo fica atrás de `?mundo=0`** por enquanto, para comparação, e é removido numa etapa final. **Smoke novo** para o mundo novo (`?mundo=1`).

---

# G. Ideias para acrescentar (a IA sugere, o usuário aprova ou corta)
1. **Fog de guerra / exploração** no mapa mundi (tile desconhecido aparece como silhueta; torre de vigia e binóculo revelam).
2. **Eventos de tile** (tempestade, peste, feira, saque), citados em `5_mapa-mundi.md` como "mundo dinâmico".
3. **Escolta de caravana** (jogador acompanha e ganha pagamento).
4. **Estalagem como ponto de descanso** (recupera ações? hoje só dorme no tile).
5. **Mercado entre tiles** (preços por distância e estrada), ligando oferta/escassez à malha.
6. **Reputação por território** (vilas neutras favorecem quem protege suas estradas).
7. **Pedágios e passagem** em tiles de fortaleza e ponte, com relação por facção.
8. **Nome do tile editável** (o jogador renomeia; é o caso em que a etapa 8 grava o nome).

**Vereditos (usuário):** **7 (pedágio em fortaleza) e 8 (nome do tile editável) entram na etapa 8.** **1 descartada** (sem fog), **3 descartada por ora** (escolta), **2, 4, 5 e 6 ficam fora** (2 e 4 não; 5 e 6 para depois da etapa 8).

---

# Pendências deixadas para a 0B (planejamento)
- Hora exata de entrada no Campo por parte do dia (sugestão: início da faixa) e quantas ações avançam uma parte do dia.
- Rank mínimo da vila para ter acesso ao armazém.
- Tabela tipo de POI para loot do baú (a IA envia sugestão) e escala pelo tipo de tile.
- Valores de relação do pedágio da ponte (aliado paga menos, rixa paga mais) em `poi-modifiers.js`.
- Textos a listar e aprovar: tela de carregamento, tela de morte (3 tipos), popup do pedágio, seção "Mundo" do livro.
- Atalhos criativos além de anexar/desanexar tile e bandidos dominarem o tile.
- Pasta de cenários com subpasta `legado` e `?mundo=0` para o mundo antigo.
- Visão do tile vizinho além da borda: versão simples na 8.9 (acabamento).
- Fortaleza com pedágio (G7) entra: reaproveitar a regra da ponte (D4) no tile de fortaleza, forte como POI principal (D1).
- Nome do tile editável (G8): gravar o nome no save.

---

# Sessões (regra do `CLAUDE.md`: dizer se é mesma sessão ou nova)

| Passo | Quem | Sessão | Por quê |
|---|---|---|---|
| **0. Correções do mapa mundi** | usuário (+ IA para corrigir) | **Nova**, contexto limpo | Lista de coisas que o usuário quer mudar no mapa; depende do que ele observar, não deste levantamento. Edita `mundo3d.js`/`graph.js`; **não rodar em paralelo** com nada que mexa neles. |
| **0A. Validação do levantamento** | usuário (conversa com a IA) | **Nova**, só precisa deste arquivo e do `5_mapa-mundi.md` | Marcar o Veredito de cada seção e conversar as marcadas `Conversar`/`Acrescentar`. Sem código. |
| **0B. Plano da etapa 8** | IA | **Mesma** da 0A se o contexto estiver leve; senão nova | Transformar vereditos em decisões fechadas, atualizar `5_mapa-mundi.md` e escrever a ordem final (8.1 a 8.n) em `6_plano-mapa-mundi.md`. Só texto. |
| 8.1 Fundação (A1 a A5, E4 básico) | IA | **Nova** | É a ponte de tudo (rodadas <-> mapa mundi, entrar/sair do tile, salvar o grafo); mexe em `rounds.js`, `save.js`, `state.js`, `worldturn.js`, `mapwin.js`. Tem de vir **primeiro** e sozinha. |
| 8.2 Economia e cidades por tile (B1 a B3, B6, D6) | IA | **Nova**, depois da 8.1 | Usa `STATE.tiles` e o `endRound` ligado. |
| 8.3 Caravanas (C1) | IA | **Nova** | Mexe em `caravans.js`, `worldturn.js`; depende da 8.2. Pode ir em paralelo com a 8.5 (arquivos diferentes). |
| 8.4 Raids e bandidos (C2, C3) | IA | **Nova** | Mexe em `raids.js` e `worldturn.js`: **não** em paralelo com a 8.3. |
| 8.5 POIs viram sítios e torre nova (D1 a D4) | IA | **Nova** | Mexe em `pois*.js`, `tilecompose.js`; independente de 8.3/8.4. |
| 8.6 Missões (E1) | IA | **Mesma** da 8.5 se curta, senão nova | Pequena, usa viagem e prefeitura. |
| 8.7 Rebelião e mina (C4) e dungeons (D5) | IA | **Nova** | Depende das decisões D5 e de 8.4 (visual de cidade destruída). |
| 8.8 Facções e eventos no espaço (B4, B5, E5) | IA | **Nova** | Rotas e resumo do livro. |
| 8.9 Mapas, UI e livro (E3, E4 final) | IA | **Nova** | Tela e conferência visual. |
| 8.10 Salvar/carregar completo, smoke, virar padrão (A4 final, F3) | IA | **Nova, por último** | `SAVE_VERSION` novo, `migrateSave`, smoke do mundo novo e troca do padrão; conflita com tudo, **sozinha**. |

Ordem proposta: **0 -> 0A -> 0B -> 8.1 -> 8.2 -> (8.3 | 8.5 em paralelo) -> 8.4 -> 8.6 -> 8.7 -> 8.8 -> 8.9 -> 8.10**. A ordem final sai da 0B, depois dos vereditos.
