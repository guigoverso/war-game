# POIs procedurais "lego" (feature 11; só planejamento, nenhum código de jogo até a aprovação)

Origem: teste da 4E (2026-11-24). Os tiles ficam vazios e repetir os mesmos 14 POIs não resolve: cada tipo tem **um desenho fixo** (`POI_BUILD` em `js/local/pois.js`, uma função por tipo, ~890 linhas), do mesmo tamanho (raio 6 a 18) e com os mesmos prédios. O usuário propõe POIs **gerados proceduralmente, montados como lego**. Este documento só planeja; decide-se antes de implementar.
Convenção: **[PROPOSTA]** sugestão da IA; **[ABERTO]** pergunta ao usuário; **[DECIDIDO]** confirmado. Documentos relacionados: `8_tiles-e-vilas.md` (tiles), `9_plano-implementacao-tiles.md` (plano 4A a 4G), `docs/ideias-futuras-pois.md`.

## 0. Protótipo da fazenda (2026-11-24, FEITO; `?lego=1`)
- **Onde:** `js/modifiers/lego-modifiers.js` (`LEGO_FARM`: 5 esqueletos, tabela de peças por vaga, tamanhos mínimos, paleta), `js/local/poilego.js` (`legoFarm`, `LEGO_PIECES`, giro/espelho `legoXf`), gancho `BC_XF` em `Bc` (`city.js`) e `POI_BUILD.farm` (`pois.js`: com `?lego=1` chama `legoFarm`; sem ele a fazenda é a antiga). Na composição do tile (`tcAdd`) o portão da fazenda lego olha para a estrada mais próxima (o principal, para a abertura mais próxima).
- **Como funciona:** esqueleto sorteado (fileira, pátio fechado, curral grande, em L, pomar) -> giro (0 a 3) e espelho -> cada vaga (casa, apoio, campo, curral, pátio) recebe uma peça que caiba (casa, celeiro, silos, galinheiro, curral, pomar, trigo, horta, milho, nada) -> cerca com portão, caminho do portão à porta, bandeira. A casa é a âncora: `p.lego.house`/`gate` guardam onde ficam (para serviços futuros).
- **Descobertas:** (1) giro/espelho de TUDO sai de graça pelo gancho em `Bc`, **mas** só vale para o que passa por `Bc`/`pBc`: `hay` e `tinyTree` (city.js) escrevem direto e não giram, então o lego tem `legoHay`/`legoTree`; `poiFlag` (malha direta) é chamada com o ponto já girado. Regra para novas peças: só desenhar por `pBc`. (2) As peças parametrizadas (`poiHouse`, cercas, campos) se ajustam ao retângulo da vaga, então o mesmo esqueleto serve a tamanhos diferentes. (3) 5 esqueletos x giro x espelho x sorteio de peças já dá fazendas bem diferentes (galeria).
- **Teste/galeria:** `cd tests && node macro/lego.js` (geometria dos esqueletos: dentro da área, sem sobreposição, portão livre), `node lego-galeria.js [n]` (carga sem erros, âncoras, 8 fotos aéreas) e `cenarios-lego.html`; `LEGO=1 node tile-compose.js 11 fazenda` roda o tile com a fazenda lego.
- **Fora do protótipo:** tamanhos pequeno/micro, as outras receitas, terraços, serviços (a fazenda não tem), receitas de guerra. A pergunta é se o resultado visual convence antes de seguir para L1/L2.

## 1. O problema, medido
- Densidade: um tile de 384 (147 mil blocos²) leva hoje **5 a 12 POIs** (raio médio 14, ~2 500 blocos² cada, mais folga de 30) e ocupa **~15%** da área. Espaço sobra; o conteúdo, não.
- Variedade: toda fazenda é a mesma fazenda; a única variação é cor/enfeite por tema (`poiRestTheme`). Mais POIs "do mesmo" só repete.
- Escala: cada POI novo (pousada, alojamento, vila em escombros na 4D) custou uma sessão de construção manual.
- A tabela de composição (`TILE_COMPOSE`) já pede variantes que **não existem**: fazenda menor, plantação, mina menor, serraria menor, caçadores menor, vila de trabalhadores, vila de apoio, pesca, relíquia, guardiões. Hoje entram substitutos (`pend`).

## 2. A ideia
Um POI deixa de ser uma função fixa e vira uma **receita**: um conjunto de **módulos** (peças pequenas, cada uma uma construção ou um enfeite) colocados numa **área** por **regras de encaixe**, sorteados pela semente. Mesma receita, sementes diferentes, POIs diferentes. Duas camadas:
1. **Peças** (módulos): casa, celeiro, silo, curral, campo de cultivo, poço, tenda, fogueira, cerca, portão, torre, depósito, forja, bancada de serra, boca de mina com trilhos, pilha de toras, varal, estande de caça, altar, estátua, tumba, escombro...
2. **Receitas**: "fazenda" = 1 casa principal + 0 a 2 celeiros + 1 a 3 campos + poço + cerca; "mina" = boca de mina + 1 a 3 galpões + trilhos + pilha de minério...

[PROPOSTA] Reaproveitar o que já existe em vez de reescrever: `pBc`, `poiHouse`, `poiPole`, `poiFlag`, `buildCampFire` e os desenhos atuais viram as primeiras peças (extraídos das funções de `POI_BUILD`), e os 14 POIs de hoje viram a primeira geração de receitas.

## 3. O que um POI precisa expor ao jogo (contrato, não pode quebrar)
Tudo isso hoje é preenchido por cada `POI_BUILD`; a montagem por receita tem de preencher igual:
| Campo | Para quê | Quem usa |
|---|---|---|
| `p.sceneObjs`, `p.mesh`, `p.cols` | malha e colisões | `poiBuild`, `wfUnmake` |
| `p.flagMat` (bandeira do dono) | cor do dono | `poiPaint` |
| `p.svcSpec`, `p.keepers` | serviços (lojista, ferreiro, pousadeiro) | `poigame.js` (`poiCivSync`) |
| `p.bed` / `p.beds`, `p.medWalk` | cama, leitos de hospital | `svcInn`, `poiMedSync` |
| `p.vigilPos`, `p.tavern`, `p.stove` | vigia, balcão, fogão | `poiVigil`, `svcTavern` |
| raio (`POI_DEFS[t].r`) | folga, mapa, aplainamento | geração, 4E, mapas |
| `p.road`, `p.axis` | estrada e direção (barricada, ponte) | caravanas, guerra |
[PROPOSTA] Cada peça declara **âncoras** (onde nasce o balcão, a cama, o ponto de serviço, a vigia, a bandeira) e o montador junta as âncoras no `p` final. Assim o jogo não precisa saber que o POI é procedural.

## 4. Gramática de montagem [PROPOSTA]
- **Área de montagem**: disco/retângulo do tamanho da classe (ver 5), já aplainado pelo 4E. Terreno desnivelado = a receita usa **terraços** (a peça reserva uma plataforma plana e o resto desce em rampa), como `cityLot` faz nas cidades.
- **Eixo e acesso**: toda receita tem um **ponto de entrada** (de onde vem a estrada, `p.road`) e um **eixo**; peças se alinham ao eixo (ruas de fazenda, trilhos de mina), o que dá cara de "lugar" e não de peças soltas.
- **Camadas de colocação** (como o gerador de cidades, "reservar primeiro, esculpir depois"): 1) peça âncora (casa principal, boca da mina); 2) peças de serviço (as que carregam âncoras funcionais); 3) peças de apoio (celeiro, galpão, depósito); 4) terreno de trabalho (campos, pátio, pilhas); 5) cerca/limite; 6) enfeites por tema e bioma.
- **Regras de encaixe** (por peça): tamanho `w×d`, face da porta, afastamento mínimo, "precisa de": estrada, água, árvore, pedra, declive; "proíbe": vizinhança de outra peça. Colocação por tentativa com a mesma `rng` da semente (determinístico).
- **Variação**: quantidade e escolha de peças por sorteio; **rotação/espelho**; paleta por bioma (`PAL`); **estado** (nível do dono: mais edifícios; abandonado: peças quebradas; em guerra: paliçada).
- **Sem bloqueio**: toda peça deixa passagem de pelo menos 3 blocos (nav `buildNav`, NPCs) e a porta voltada a um caminho livre.

## 4b. Classificação das peças [PROPOSTA]
Uma peça tem **papel** (para que serve na receita), **tamanho** e **efeito no jogo**. O papel decide em que vaga ela entra.
| Papel | O que é | Exemplos (fazenda hoje) | Efeito |
|---|---|---|---|
| **Âncora** | a peça que define o POI; sempre existe, uma só | casa, boca da mina, serraria principal | carrega as âncoras funcionais (cama, balcão, serviço, vigia) |
| **Apoio** | prédios menores que complementam | celeiro, silos, galinheiro, galpão, forja | só visual e colisão; alguns carregam serviço (forja = ferreiro) |
| **Terreno de trabalho** | área aberta de uso | campo (trigo, horta, milho), pomar, curral, pilha de toras ou minério | cenário; pode ter animais ou inimigos |
| **Limite** | fecha ou separa | cerca, muro, paliçada, portão | colisão; define o portão (entrada) |
| **Circulação** | liga as peças | caminho, trilha, ponte pequena | cenário; precisa chegar à porta da âncora |
| **Enfeite** | dá vida, sem função | poço, carroça, fardo, lampião, banco, espantalho | cenário (pode ter colisão) |
| **Vivo** | ocupantes e animais | animais do curral, civis, guardas, patrulha | nascem pelo sistema existente (`poiCivSync`, guarnição) |
Por **tamanho**: **P** até 3×3 (enfeites), **M** 4 a 8 (apoios, silos, galinheiro), **G** 9 a 16 (casa, celeiro, campo, curral). Por **efeito**: *funcional* (tem âncora usada pelo jogo; precisa de teste de alcance), *sólida* (tem colisão) e *decorativa*.
Um **micro-POI** é uma peça sozinha ou 2 a 3 peças (ex.: poço + carroça + 2 bandidos), sem âncora funcional, dono nem serviço.

## 5. Classes de tamanho [PROPOSTA]
| Classe | Raio | Papel no tile | Exemplos |
|---|---|---|---|
| **Micro** | 3 a 7 | preencher e dar vida; sem serviço | poço, estande de caça, altar solitário, ruína de torre, acampamento abandonado, carroça quebrada, monólito, cabana de ermitão |
| **Pequeno** | 8 a 12 | complementares do tema | fazenda menor, mina menor, serraria menor, caçadores, pousada, atalaia |
| **Médio** | 13 a 18 | principal de recurso | fazenda, mina, serraria, taverna, entreposto, forte |
| **Grande** | 30 a 45 | principal raro | vila em escombros, vila de trabalhadores, fortaleza |
**Micro** é o que mais resolve o "vazio": cabem 10 a 20 por tile (raio 5 + folga 10 = ~700 blocos²) e dão encontros curtos (uma carroça saqueada, um baú com guarda, um poço com bandidos) sem ser "conquistáveis". [ABERTO] ver 8.

## 6. Como entra na composição do tile (4E) [PROPOSTA]
- `TILE_POI_MAP` passa de "id -> um tipo fixo" para "id -> **receita + classe**": `fazenda_pequena` = receita `fazenda` classe pequena; `plantacao` = receita nova (campos + casa); `pesca` = receita nova (cais + barcos); `vila_trabalhadores` = receita grande.
- `TILE_COMPOSE` ganha uma 4ª coluna **vida** (micro-POIs): quantidade e lista por tema (mina: carrinho de minério, lanterna perdida, galeria desabada; floresta: cabana de ermitão, armadilha, toras caídas).
- O sorteio de lugar (`tcPick`) já entende classe por raio e lugar (`road`, `far`, `main`); micro entra com folga menor (`AMB_GAP`/12) e regras próprias: perto de estrada ("na beira"), perto de água, no limite de floresta.
- **Orçamento de tempo**: cada POI de hoje constrói em ~10 a 40 ms. Micro precisam ficar em ~2 a 5 ms. Meta: tile com 25 POIs (5 a 12 normais + 10 a 15 micro) em ≤ 4 s no total (limite atual).
- **Nav/FPS**: micro-POIs sem NPC próprio nem guarnição; só colisão e, às vezes, 1 baú/inimigo (usa `genPacks`/hideout).

## 7. Passos [PROPOSTA]
Cada um, uma sessão; todos na `mapa-mundi-update`.
- **L0 — Inventário (P):** ler `POI_BUILD` e listar as peças reaproveitáveis, âncoras e tamanhos dos 14 POIs; levantar quais `p.*` cada serviço lê. Saída: tabela de peças e contrato (seção 3) confirmados. Só leitura e documento.
- **L1 — Motor (M):** `js/local/poilego.js`: tipos `Peça` e `Receita`, colocação por regras (seção 4), âncoras -> `p`, `poiBuild` aceita `p.recipe`. Pronto quando: uma receita de teste monta um POI qualquer no `?cenario=pois` e a galeria mostra 8 sementes diferentes da mesma receita.
- **L1 — anotação do usuário (2026-11-24): POIs de estrada, frente e trilha.** Entra no L1 (rotação nativa das receitas) e vale para **taverna, entreposto, pousada e alojamento** (e as fazendas, que já têm o portão para a estrada):
  1. **Frente virada para a estrada:** a frente (portão/porta principal) olha para a estrada mais próxima (`legoRotToward`, `p.legoFace`, já usado pela fazenda lego em `tcAdd`). Para os POIs antigos (pousada, alojamento, taverna, entreposto) o gancho `BC_XF` gira o desenho, **mas as âncoras** (`p.bed`/`p.beds`, `p.svcSpec`, `p.keepers`, `p.tavern`, `p.stove`, `p.vigilPos`) têm de girar junto (função única `poiAnchorsXf(p,k,mir)`) e só valem peças que desenham por `pBc`.
  2. **Trilha da estrada até a entrada:** uma trilha estreita sai da estrada e termina na frente do POI (`carveRoad` com `pinEnds`, como as estradas de ligação de `genWorldPois`; evitar as zonas de guerra, que entram como obstáculo).
  3. **Chance de ficar fora da estrada:** taverna, pousada e alojamento ficam **majoritariamente na estrada**, mas têm **30%** (valor inicial, modificador novo `TILE_PLACE.offRoad`) de nascer longe dela, com **bifurcação** da estrada e a trilha do item 2. **O entreposto nunca** (só na estrada, onde passa caravana). Alcance máximo da trilha a definir (proposta: 90 blocos); se a trilha não for possível (água, relevo), o POI volta para a beira da estrada.
  4. Testes: a frente aponta para a estrada (distância do portão menor que a do centro), a trilha liga o portão a um `T_ROAD`, nada na trilha bloqueia a porta, entreposto sempre na estrada. Galeria com os dois casos (na estrada e fora dela).
  Estado atual (4E): essas classes de POI já são `place: 'road'` (alojamento incluído desde 2026-11-24) e NÃO nascem se não há estrada por perto (`TILE_PLACE.roadFar`); não há trilha nem giro.
- **L2 — Migrar 3 POIs (M):** fazenda, mina e serraria como receitas (as 3 de recurso; variam em quantidade de prédios e campos). Os tamanhos pequeno/médio saem do **mesmo** desenho. Serviços e anexação intactos (smoke).
- **L3 — Micro-POIs (M):** 10 a 12 peças/receitas micro (lista na seção 5) e a coluna **vida** da composição.
- **L4 — Encaixe no tile (M):** `tilecompose.js` lê classe e vida; sobe a densidade; galeria e teste de 25 POIs/tile; medir tempo.
- **L5 — Resto e revisão (M):** migrar os demais (pousada, taverna, entreposto, forte, caçadores, santuário), vila de trabalhadores, plantação, pesca; remover os substitutos `pend`.
Dependências: L1 antes de tudo; L2/L3 podem andar juntas depois; a 4F (estado do tile) não depende deste plano, mas `WORLD.tileWar` e a lista de POIs precisam sobreviver (a receita guarda só a **semente**, não as peças).
- 4G. Revisão e fechamento (P) — **SESSÃO NOVA, depois dos POIs lego (decidido em 2026-11-24)**
Roda o smoke, joga um tile de cada tema, confere o tempo de geração e atualiza `docs/MAPA.md`, `docs/ESTADO.md` e `docs/features/6_plano-mapa-mundi.md`.

## 8. Perguntas para decidir
1. **[ABERTO] Micro-POIs viram POIs do jogo?** Opção A: só cenário (decoração, baú, bandidos), sem dono nem anexação. Opção B: entram em `WORLD.pois` (têm dono, aparecem no mapa, são anexáveis). Recomendo **A**: evita explodir mapa, guerra e preço de POIs; o conteúdo vem de baús, bandos e encontros.
2. **[ABERTO] Quantos POIs por tile?** Hoje 5 a 12 (+ ambiente). Meta proposta: 12 a 14 "de verdade" (spec) **mais** 10 a 15 micro. Confirma?
3. **[ABERTO] Prioridade das receitas:** começar pelos de recurso (fazenda, mina, serraria) ou pelos que faltam (plantação, vila de trabalhadores, pesca)? Recomendo os de recurso (L2), porque dão a maior variação visível e provam o motor.
4. **[ABERTO] Interação com a guerra/etapa 10:** POIs de guerra (acampamento, trincheira, hospital) também viram receitas? Recomendo **depois**, quando a etapa 10 definir tipos e quantidades.
5. **[ABERTO] Terreno:** aceitar terraços (plataformas em níveis) nos POIs montados ou manter sempre um só nível aplainado como hoje? Recomendo níveis simples (±2) em POIs médios e grandes.
6. **[ABERTO] Tema do tile x terreno** (feedback: fazenda em montanha): isso é da etapa 5 (o grafo escolhe o tema); decidir se antecipamos um sorteio que pese o tema pela adequação ao terreno (`tileFit`). Independe deste plano.

## 9. Riscos
- **Qualidade visual**: peças aleatórias podem parecer "sopa". Mitigação: eixo, alinhamento, paleta fixa por receita e **galerias por receita** (como `cenarios-tiles.html`) antes de plugar no jogo.
- **Tempo de geração**: ver orçamento (seção 6); medir por receita.
- **Compatibilidade com saves**: o POI é refeito pela semente; a receita tem de ser **determinística** (mesma `rng`, sem `Math.random`) e a semente do POI (`p.id` + semente do mundo) fixa. Mudar uma receita muda os POIs de saves antigos (aceitável: o mundo já muda de semente a semente nesta branch).
- **Serviços**: âncoras mal posicionadas quebram `[E]`. Teste automático por receita: toda âncora funcional alcançável (nav) e dentro do raio.
