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
- **L0 — Inventário (P) — FEITO em 2026-11-24, resultado na seção 7c:** ler `POI_BUILD` e listar as peças reaproveitáveis, âncoras e tamanhos dos 14 POIs; levantar quais `p.*` cada serviço lê. Saída: tabela de peças e contrato (seção 3) confirmados. Só leitura e documento.
- **L1 (dividido em L1a e L1b, decidido em 2026-11-24; o L2 foi feito antes, sobre o motor do protótipo).** Estado: o motor genérico (`legoBuild`, receitas por tipo e tamanho), `p.r` por instância e o giro de colisão/piso já saíram junto com o L2 (seção 7d); falta o resto abaixo.
  - **L1a — Âncoras e contrato (M, FEITO 2026-11-24, seção 7e):** `poiAnchorsXf(p,k,mir)` (âncoras em coordenadas do mapa giram junto, com `yaw`), `p.recipe = {id, seed, rot, mir, pieces, anchors}` no lugar de `p.lego`, `poiBuild` aceitando `p.recipe`, teste de nav por âncora (toda âncora funcional alcançável e dentro do raio). Só é exercitado de verdade nos POIs com serviço (L5).
  - **L1b — Frente, trilha e `offRoad` (M, FEITO 2026-11-24, seção 7f):** o item da anotação abaixo (frente para a estrada em taverna, entreposto, pousada e alojamento; trilha; 30% fora da estrada; entreposto sempre na estrada).
- **L1 — Motor (M), texto original:** `js/local/poilego.js`: tipos `Peça` e `Receita`, colocação por regras (seção 4), âncoras -> `p`, `poiBuild` aceita `p.recipe`. Pronto quando: uma receita de teste monta um POI qualquer no `?cenario=pois` e a galeria mostra 8 sementes diferentes da mesma receita.
- **L1b — anotação do usuário (2026-11-24): POIs de estrada, frente e trilha.** Entra no L1b (rotação nativa das receitas) e vale para **taverna, entreposto, pousada e alojamento** (e as fazendas, que já têm o portão para a estrada):
  1. **Frente virada para a estrada:** a frente (portão/porta principal) olha para a estrada mais próxima (`legoRotToward`, `p.legoFace`, já usado pela fazenda lego em `tcAdd`). Para os POIs antigos (pousada, alojamento, taverna, entreposto) o gancho `BC_XF` gira o desenho, **mas as âncoras** (`p.bed`/`p.beds`, `p.svcSpec`, `p.keepers`, `p.tavern`, `p.stove`, `p.vigilPos`) têm de girar junto (função única `poiAnchorsXf(p,k,mir)`) e só valem peças que desenham por `pBc`.
  2. **Trilha da estrada até a entrada:** uma trilha estreita sai da estrada e termina na frente do POI (`carveRoad` com `pinEnds`, como as estradas de ligação de `genWorldPois`; evitar as zonas de guerra, que entram como obstáculo).
  3. **Chance de ficar fora da estrada:** taverna, pousada e alojamento ficam **majoritariamente na estrada**, mas têm **30%** (valor inicial, modificador novo `TILE_PLACE.offRoad`) de nascer longe dela, com **bifurcação** da estrada e a trilha do item 2. **O entreposto nunca** (só na estrada, onde passa caravana). Alcance máximo da trilha a definir (proposta: 90 blocos); se a trilha não for possível (água, relevo), o POI volta para a beira da estrada.
  4. Testes: a frente aponta para a estrada (distância do portão menor que a do centro), a trilha liga o portão a um `T_ROAD`, nada na trilha bloqueia a porta, entreposto sempre na estrada. Galeria com os dois casos (na estrada e fora dela).
  Estado atual (4E): essas classes de POI já são `place: 'road'` (alojamento incluído desde 2026-11-24) e NÃO nascem se não há estrada por perto (`TILE_PLACE.roadFar`); não há trilha nem giro.
- **L2 — Migrar 3 POIs (M) — FEITO em 2026-11-24 (seção 7d):** fazenda, mina e serraria como receitas (as 3 de recurso; variam em quantidade de prédios e campos). Os tamanhos pequeno/médio saem do **mesmo** desenho. Serviços e anexação intactos (smoke).
- **L3 — Micro-POIs (M) — PARTE 1 FEITA em 2026-11-24 (seção 7g):** 12 micro-POIs novos, cenário lego limpo e lista completa. **Falta:** a coluna **vida** da composição (`TILE_COMPOSE`), que fica com o L4.
- **L3.5 — Montar como lego os POIs "bons candidatos" e "possíveis" (G) — FEITO em 2026-11-24 (seção 7i; sem validação visual: o usuário confere no jogo):** caçadores, santuário, ruínas, forte, torre, pousada, alojamento, entreposto, plantação, vila de pesca e vila de trabalhadores como receitas (M e P, 4 esqueletos cada). **Falta:** encaixe no tile (L4), `TILE_POI_MAP` das 3 novas e tornar o lego o padrão.
- **L4 — Encaixe no tile (M):** `tilecompose.js` lê classe e vida; sobe a densidade; galeria e teste de 25 POIs/tile; medir tempo.
- **L5 — Resto e revisão (M):** migrar os demais (pousada, taverna, entreposto, forte, caçadores, santuário), vila de trabalhadores, plantação, pesca; remover os substitutos `pend`.
**Sessões (decidido em 2026-11-24).** Regra: sessão nova com contexto limpo quando o passo é grande, só precisa do que está no repositório e nos docs, ou quando o contexto anterior já está pesado; mesma sessão quando o passo é curto e usa o que acabou de ser lido.
| Passo | Sessão | Por quê |
|---|---|---|
| L0 inventário | **Mesma** (esta, ainda leve) ou nova, tanto faz | Só leitura; a saída é uma tabela no próprio doc, então o L1 não depende da memória do L0. |
| L1a âncoras e contrato | **Nova**, junto com o L5 (taverna) ou antes dele | Só vale com POIs de serviço; precisa de `poilego.js`, `poigame.js` e do teste de nav. |
| L1b frente, trilha e `offRoad` | **Nova** | Mexe em `tilecompose.js`, estradas e `carveRoad`; independente do L1a. |
| L2 migrar fazenda, mina, serraria | **Nova** | Só precisa do motor pronto e testado do L1; contexto do L1 seria ruído. |
| L3 micro-POIs | **Nova** | Independente do L2 nos assuntos, mas edita `poilego.js` e modificadores: rodar depois do L2, não em paralelo. |
| L3.5a sem serviço (caçadores, santuário, ruínas) | **Nova** | Edita `poilego.js` e `lego-modifiers.js`; só precisa do motor do L2 e do doc. |
| L3.5b novos (forte, plantação, pesca, vila de trabalhadores) | **Nova** | Receitas inteiras e peças novas; depois do 3.5a, não em paralelo (mesmos arquivos). |
| L3.5c com serviço (pousada, alojamento, entreposto, torre) | **Nova** | Exercita `legoAnchor`, `poigame.js` e o teste de alcance de âncora; contexto próprio. |
| L4 encaixe no tile | **Nova** | Lê `tilecompose.js` e mede tempo; precisa de L2 e L3 prontos. |
| L5 resto e revisão | **Nova** (uma por grupo, se for grande) | Muitas migrações; fechar cada grupo com smoke. |
| 4G revisão | **Nova** (já decidido) | Fechamento com olhar limpo. |
Cada sessão termina com `/encerrar-sessao` (ESTADO.md, commit e push), que é a ponte entre elas.
Dependências: L1 antes de tudo; L2/L3 podem andar juntas depois; a 4F (estado do tile) não depende deste plano, mas `WORLD.tileWar` e a lista de POIs precisam sobreviver (a receita guarda só a **semente**, não as peças).
- 4G. Revisão e fechamento (P) — **SESSÃO NOVA, depois dos POIs lego (decidido em 2026-11-24)**
Roda o smoke, joga um tile de cada tema, confere o tempo de geração e atualiza `docs/MAPA.md`, `docs/ESTADO.md` e `docs/features/6_plano-mapa-mundi.md`.

## 7c. L0 — Inventário (FEITO 2026-11-24; só leitura de `pois.js`, `poigame.js`, `city.js`, `poilego.js`)
**20 construtores** em `POI_BUILD` (14 permanentes + 6 de guerra) e **4 decorações dormentes** em `DORM_BUILD` (`pois.js:612`: fogueira, jardim, poço, marco). As dormentes **já são micro-POIs** (só cenário, sem dono, 1 função de ~5 linhas, raios em `WAR_DORMANT`): servem de modelo para o L3.

**Peças soltas reaproveitáveis (todas já desenham por `pBc`, logo giram/espelham pelo gancho `BC_XF`):**
| Peça | Onde | Tamanho | Observação |
|---|---|---|---|
| `poiHouse` / `poiHut` (casa; com mobília) | `pois.js:37`, `:104` | G (parametrizada: x0,z0,w,d,porta,estilo) | Já se ajusta ao retângulo; é a base de casa/galpão/quartel/alojamento. |
| `poiFence`, `poiWall`, `poiCrenels`, `poiBarrierRow` | `:58`, `:51`, `:52`, `:604` | linear | Limite. Só alinhadas aos eixos (ok com giro de 90°). |
| `poiWell`, `poiCart`, `poiBench`, `poiBrazier`, `poiRack`, `poiSign`, `poiAnimal`, `poiPath` | `:85` a `:103` | P | Enfeites; `poiCart` e `poiAnimal` aparecem em 4+ POIs. |
| `crate`, `barrel`, `hay`, `tinyTree` | `city.js:53` a `:76` | P | **`hay` e `tinyTree` escrevem direto e não giram** (já achado no protótipo: `legoHay`/`legoTree`). |
| `tent` | **local** em `hunters` (`:128`) e `lodge` (`:383`), duplicada | M | Extrair para peça única. |
| `buildCampFire` | `poi.js:96` | P | Regra do CLAUDE.md: fogueira de POI = esta, sempre funcional. |
| campos, curral, pomar, celeiro, silos | `poilego.js` (`LEGO_PIECES`) | M a G | Só a fazenda; já peças. |
| `poiFlag` | `:43` | P | Malha direta (`scene.add`): recebe ponto já girado; guarda `p.flagMat`. |
| `poiDig`, `poiLand` | `:77`, `:81` | terreno | Escavam/nivelam só na geração (rampa da mina, trincheira, ponte). |
| prédios da cidade: `makeBuilding`, `furnishHouse` | `city.js:204`, `:165` | G | A taverna usa o **térreo da taverna das cidades** (`c.tavern`, `c.stove`, `c.keepers` gravados em `city.js:412-413`): é uma peça-âncora monolítica, difícil de montar em partes. |

**Papéis por POI (4b) e o que cada um grava em `p` (as âncoras do contrato):**
| POI | Raio | Âncora | Apoio / terreno de trabalho | Grava em `p` |
|---|---|---|---|---|
| farm | 18 | casa | celeiro, curral, campos, poço, carroça (lego: já em peças) | `flagMat`, `lego` |
| mine | 15 | galpão sobre rampa (`poiDig`) | guincho, oficina, trilhos, minério | `flagMat` (`keepers=[]`, `svcSpec=[]`) |
| sawmill | 14 | galpão aberto + serra | roda d'água, toras, carroça, escritório | `flagMat` |
| hunters | 13 | fogueira + tendas | varais, troféus, armadilhas | `flagMat` |
| sanctuary | 14 | capela | torre do sino, canteiros, poço, bancos | `flagMat` (`keepers=[]`, `svcSpec=[]`) |
| fort | 15 | muralha + quartel | torres, estábulo, treino, tendas | `flagMat` |
| tower | 8 | torre | braseiro | `flagMat`, **`vigilPos`** |
| tavern | 17 | taverna 2 andares | ferreiro, mesas, quartos | `flagMat`, **`tavern`, `stove`, `keepers`, `bed`, `svcSpec`** (ferreiro, mercenário) |
| inn | 13 | casa 1 andar | enfeite por tema (`poiRestTheme`) | `flagMat`, **`bed`, `svcSpec`** (pousadeiro) |
| lodge | 14 | barracão com beliches | tendas, cozinha de campo | `flagMat`, **`bed`, `svcSpec`** (cozinheiro) |
| post | 16 | galpão de mercado | banca, carroças, cavalos | `flagMat`, **`svcSpec`** (lojista) |
| ruins, ruinvil | 9 / `POI_RUINVIL.r` | muros e altar / casas em grade | entulho, mato, baú | `flagMat` (sem moradores) |
| bridge | 9 | pórtico com cancelas | guarita | `flagMat`, lê **`axis`** |
| fortcamp, trench, lookout, depot | 12, 11, 6, 10 | (guerra) | paliçada, abrigo, torre, galpão | `flagMat` |
| barricade | 7 | chicana | frisa, arame | `flagMat`, lê **`axis`** |
| hospital | 10 | tenda | macas, lampiões, carroça | `flagMat`, **`beds`, `medWalk`** |

**Quem lê o quê (contrato real, confirmado):**
- `p.svcSpec` / `p.keepers`: `poiCivSync` (`poigame.js:295-313`: nascem lojista, ferreiro, taverneiro, mercenário) e o alvo `[E]` (`:572`). `p.bed`: `[E] Dormir` (`:566`). `p.tavern`, `p.stove`: balcão e fogão (`:564-565`). `p.vigilPos`: vigia (`:561`). `p.beds`, `p.medWalk`: `poiMedSync` (`:284-293`). `p.road`: entreposto (`:224`).
- `p.cols`, `p.sceneObjs`, `p.mesh`: só `poiBuild` e o desmonte da guerra (`warfront.js:736-739`).
- `p.axis`: `bridge` e `barricade` (guerra e caravanas).

**Descobertas que mudam o L1 (não estavam no plano):**
1. **Coordenadas misturadas.** `svcSpec`, `bed`, `beds`, `medWalk`, `vigilPos`, `tavern`, `stove` são em **coordenadas do mapa** (`c.cx + x`), com `y` próprio em `bed`/`beds`; já `poiFlag(c,p,x,z,h)` e as peças recebem coordenadas **relativas**. A função `poiAnchorsXf(p,k,mir)` da anotação do L1 precisa converter só as absolutas (relativas ao centro, subtrair `c.cx`/`c.cz`, girar, somar de volta) e levar `yaw` junto (`svcSpec.yaw`, `keepers[].yaw`).
2. **Raio por tipo, não por POI.** `POI_DEFS[p.type].r` é lido por `poiCivSync` (anel de moradores e guardas, `:302`), por `ambClash` (`pois.js:668`), pela geração e pela composição. Com tamanhos pequeno/médio do mesmo tipo (L2), o raio tem de virar **`p.r` por instância** (`POI_DEFS` só como padrão). Sem isso moradores nascem fora do POI pequeno ou dentro de paredes.
3. **Moradores por tipo:** `POIX.civ` e `POIX.guards` (`poigame.js:22-23`) são por tipo; não dependem de peças, então a receita não precisa mexer neles (só no raio acima).
4. **Taverna e hospital são os dois POIs de âncora pesada** (balcão, fogão, quartos; 6 macas). Fazenda, mina e serraria (alvo do L2) não têm serviço: são os mais seguros para provar o motor, como decidido. Pousada, alojamento e entreposto têm 1 serviço e 1 cama: viram receitas simples de "âncora única".
5. **Bandeira:** posição fixa por POI hoje (`poiFlag` com coordenadas escritas à mão); na receita deve ser âncora da peça âncora (ou do portão).
6. **Mina, trincheira, ponte, hospital** usam `poiDig`/`poiLand` (alteram terreno na geração). Em receita, isso é uma peça "terraço/escavação" que roda **antes** de desenhar; compatível com os níveis ±2 decididos, mas só vale em POIs não adaptados (`c.noDig`/`c.adapt` dos POIs de guerra em runtime).
7. **Sem teste de nav por âncora hoje.** O doc propõe "toda âncora funcional alcançável"; ainda não existe nenhum helper para isso (não verifiquei `buildNav`; fica para o L1).

**Contrato confirmado (substitui a tabela da seção 3 como referência do L1):** a receita monta `p.sceneObjs/mesh/cols` (via `poiBuild`, sem mudança), `p.flagMat` (uma bandeira), e as âncoras funcionais em **coordenadas do mapa**; `p.r` (novo) por instância; `p.lego` vira `p.recipe = {id, seed, rot, mir, pieces, anchors}` (só semente e parâmetros, nunca as peças).

## 7d. L2 — Fazenda, mina e serraria como receitas (FEITO 2026-11-24)
- **Cenário novo `?cenario=lego`:** mundo super plano (`WORLD.showcaseMode`, como o `pois`) só com os POIs lego: **3 tipos x 2 tamanhos (M médio, P pequeno) x 4 variações = 24 POIs** em grade (`poiLegoShowGen`, `LEGO_SHOW`). A variação *i* usa o esqueleto *i* (giro, espelho, peças e enfeites vêm da semente), então as 4 são visivelmente diferentes; cada POI tem placa com tipo, tamanho, número e esqueleto. Tecla N liga o voo.
- **Motor generalizado:** `legoBuild` (antes `legoFarm`) lê `LEGO_RECIPES[tipo][tamanho]` (`half`, `gate`, `fence`, `flag`, `decorN`, esqueletos), `LEGO_PICK` (peça por vaga e tipo), `LEGO_MIN`, `LEGO_DECOR`, `LEGO_PAL`. Quadro local de peça com frente (`legoLoc`/`legoDraw`, compõe com o giro do POI).
- **Peças novas:** mina: `boca` (morro de pedra escalonado com portal, lanternas, trilhos e vagonete, **sem escavar**: gira com o POI), `oficina`, `guincho`, `deposito`, `minerio`, `carvao`, `entulho`; serraria: `serra` (âncora), `escritorio`, `tabuas`, `toras`, `canal` com roda d'água, `entulho`. Esqueletos: fazenda 5 M + 4 P, mina 4 M + 4 P, serraria 4 M + 4 P.
- **Raio por instância (`p.r`, achado 2 da L0):** `poiR(p)` em `pois.js` (padrão `POI_DEFS[tipo].r`) usado por geração, composição, guerra, reserva e moradores/guarnição (`poigame.js`). `p.legoSize`, `p.legoSk` e `p.legoFace` controlam tamanho, esqueleto e frente.
- **Correção no gancho `BC_XF`:** `setTL` e a nova `acL` (colisão de `crate`, `barrel`, `hay` e do telhado de `roofOn`) agora giram junto; antes a colisão e o piso (T_FLOOR) de peças giradas ficavam no lugar errado (já no protótipo da fazenda).
- **Gatilho:** `legoOn()` = `?lego=1` ou `?cenario=lego`; sem eles, fazenda, mina e serraria continuam as antigas (nada muda no jogo normal). **Pendente para decidir:** tornar o lego o padrão (e o tile 4E, que hoje sempre constrói o tamanho M; pequeno entra na L4 com `TILE_COMPOSE`).
- **Não feito/fora do L2:** serviços (os 3 POIs não têm), `poiDig` da mina antiga (a boca lego não escava), nav por âncora (L1b).
- **Testes:** `cd tests && node macro/lego.js` (geometria das 6 receitas), `node lego-galeria.js [semente]` (carga, 24 POIs, âncoras, esqueletos distintos, fotos em `docs/img/lego/<tipo>-<tamanho>-<n>.png` e `cenarios-lego.html`); `smoke.js` e `tile-compose.js` seguem OK.

## 7e. L1a — Âncoras e contrato (FEITO 2026-11-24)
- **Âncoras:** peça declara com `legoAnchor(A, tipo, valor)` no quadro do esqueleto (relativo ao centro, y relativo ao chão); `legoBuild` converte (giro/espelho) e grava em `p.bed/tavern/stove/vigilPos/chestPos` e `p.beds/medWalk/keepers/svcSpec` em coordenadas do mapa (`poiAnchorsMap`). `yaw` segue o giro (frente = (-sen yaw, -cos yaw)).
- **`poiAnchorsXf(p, k, mir)`:** gira âncoras **já em coordenadas do mapa** em torno do centro; é o que a L1b usa nos POIs antigos (taverna, pousada...). Não cobre `p.chest` (baú criado com `addChest`; coordenadas absolutas no mundo).
- **`p.recipe`** no lugar de `p.lego`: `{id, lego:true, size, skeleton, seed, rot, mir, pieces, anchors:{house, gate, door}}`. `poiBuild` com `p.recipe` pronto refaz o mesmo POI (peças e colisões iguais), ignorando `legoSk`/`legoFace`. Os 3 sorteios de esqueleto, giro e espelho agora sempre ocorrem, para a sequência da `rng` não depender de haver receita.
- **Nav:** `legoReach(p, x, z)` (preenchimento da grade `NAV.blocked` a partir de 2 blocos fora do portão, dentro do raio+3). A galeria exige portão e porta da âncora alcançáveis nos 24 POIs e tem um controle (porta emparedada dá falso).
- **Testes** (`cd tests && node lego-galeria.js`): `poiAnchorsXf` igual ao caminho relativo em 4 giros x espelho (pontos, y, yaw), receita refaz o POI, alcance. **Limite:** fazenda, mina e serraria não têm âncoras de serviço, então só a máquina foi testada (com âncoras sintéticas) e o alcance só vale para porta e portão; a primeira peça com serviço real (L5) deve declarar a sua âncora e entrar no teste de alcance.

## 7f. L1b — Frente para a estrada, trilha e `offRoad` (FEITO 2026-11-24)
- **Frente:** `tcAdd` (tilecompose.js) põe `p.legoFace` (0 a 3, `tcFaceFor`: rotação que leva o portão, ao sul, para a estrada mais próxima; o principal olha para a abertura mais próxima) nos tipos de `LEGO_FACE_TYPES` (taverna, entreposto, pousada, alojamento) e, com lego ligado, fazenda, mina e serraria. Os **POIs antigos** giram inteiros: `poiBuild` chama `legoOldBuild` (poilego.js), que liga o gancho `BC_XF` ao redor do construtor de sempre e depois gira as âncoras com `poiAnchorsXf` (inclui `p.firePos`, a fogueira do alojamento). Para isso `poiFlag` e `tinyTree` passaram a seguir o gancho (`bcPt`, city.js), e a fogueira do alojamento é posta no ponto já girado. `p.faceGate` = portão do POI antigo, relativo ao centro; `legoGateRel(p)` devolve o portão de qualquer POI virado.
- **Trilha:** `tcTrail` abre, depois de construir o POI, uma estrada comum (`carveRoad`, `pinEnds`, sem ponte, `dirA` = lado da frente) do portão (centro + raio + 3 na direção da frente) até o ponto de estrada mais perto dele, mais um trecho de terra de estrada até a borda do POI. Obstáculos: cidades, POIs e zonas de guerra (`tcObst`; não o anel do principal). Cada trecho reserva `TILE_PLACE.trailTaken` blocos contra outros POIs. Se o portão já está a menos de `trailGap` blocos da estrada, não há trilha (`p.trail.near`). `p.trail = {ok, to, n}`. Sem estrada (o principal) não há trilha.
- **`offRoad`:** taverna, pousada e alojamento (`TILE_PLACE.offRoadTypes`) têm 30% (`TILE_PLACE.offRoad`) de nascer longe da estrada, a 40 a 90 blocos da borda (`offNear`; `tcPick` com `q.off`), mas só onde a trilha é possível (`tcTrailPlan`, simulação sem pintar: a rota não pode cruzar água). Sem lugar, o POI volta para a beira da estrada. `p.offRoad` marca os casos. O **entreposto nunca** (não está em `offRoadTypes`).
- **Testes:** `cd tests && node tile-face.js [sementes]` (7 temas por semente; `LEGO=1` liga o lego): frente olha para a estrada (portão mais perto dela que o centro), trilha liga o portão à estrada (flood-fill sobre `T_ROAD`), nada bloqueia o portão (nav), âncoras dentro do raio, entreposto nunca fora da estrada, todo POI fora da estrada tem trilha. `node tile-face-foto.js semente tema tipo` tira fotos aéreas pelo lado da frente (`tests/tile-face-out`). Passam também `tile-compose.js`, `smoke.js` e `lego-galeria.js`.
- **Limites:** a trilha dos POIs perto da estrada é de melhor esforço: se a rota cruza água, o POI fica sem trilha (`p.trail.ok = false`) e o teste acusa (não aconteceu nas amostras). Só o compositor do tile vira POIs; os do mapa antigo (`genWorldPois`) continuam sem giro.

- **Chão do POI lego (2026-11-24):** o piso próprio por bioma (terra batida, manchas, `LEGO_FLOOR`, `LEGO_FLOOR_BARE`) foi **removido**: o POI lego usa o chão do cenário, como os outros POIs. Ficam só os chãos das peças (pilha de minério, serragem, canteiros).

## 7g. L3 — Micro-POIs e cenário lego limpo (FEITO 2026-11-24; sem validação visual: o usuário confere no jogo)
- **Micro-POIs (só cenário, decisão 1):** `js/local/poimicro.js`, `MICRO_PIECES` (12 funções pequenas, raio 5 a 7): carroça quebrada, acampamento abandonado (sem fogueira: regra do CLAUDE.md), estande de caça, altar solitário, ruína de torre, monólito, cabana de ermitão, carrinho de minério perdido, toras caídas, armadilha de caça, tumba, estátua quebrada. Cada um sorteia giro e espelho pela semente (`MICRO_BUILD`, gancho `BC_XF`); só usa peças que passam por `pBc`. Dados (lista, raio, nome da placa, posição do bloco) em `LEGO_MICRO` (`lego-modifiers.js`); placa em `poiMicroLabel` (`poi-texts.js`).
- **Ecos de conflito antigo (5, pedido do usuário):** campo de batalha esquecido (fuzis cravados com capacete, sepulturas, estojos; armas de fogo, não medievais), barricada derrubada, trincheira abandonada, vala comum com marco e paliçada tombada. Helpers `microRifleStuck`, `microRifleLying`, `microHelmet`. Total: 17 novos + 4 que já existiam = 21 no cenário.
- **Mesma máquina das dormentes:** `dormBuild` (`pois.js`) lê `DORM_BUILD[kind] || MICRO_BUILD[kind]`; os novos ficam em `WORLD.micros` (os 4 dormentes seguem em `WORLD.dormant`, a fogueira dormente continua cozinhando). Nenhum entra em `WORLD.pois` (sem dono, anexação nem mapa). `poiTent` foi extraída de `hunters` e `lodge` (peça única, L0).
- **Lista completa no cenário:** bloco de 16 (4 colunas, `gap` 28) ao leste da grade, **os 4 que já existiam** (fogueira, jardim, poço, marco; placa "(já existia)") **e os 12 novos**.
- **Cenário limpo:** em `?cenario=lego` não nascem acampamentos, grutas, baús, bandos nem terrenos de guerra (`genPOIs`, `poi.js`) e a área sem cidades cresceu para `LEGO_SHOW.area` (245 x 215 de meia-largura; as muralhas ficam fora da grade e do bloco). **Limite:** as cidades do mundo continuam existindo, longe, nos cantos (o jogo exige a cidade inicial); a masmorra (região abaixo do mapa) e a fauna ambiente não foram tocadas.
- **Galeria de links (`cenarios-pois.html`, gerada por `cd tests && node cenarios-pois.js`, como `cenarios-tiles.html`):** três grupos: POIs sem variações (`?cenario=pois`), POIs procedurais (um link por tipo: `?cenario=lego&tipo=<tipo>`, lê `LEGO_SHOW.types`, então tipos novos entram sozinhos) e micro-POIs (`?cenario=lego&micro=1`). A vista vem de `legoShowView` (`lego-modifiers.js`); sem `tipo` nem `micro`, o cenário lego mostra tudo.
- **Testes:** `cd tests && node lego-galeria.js 11 nofoto` confere 4 + 17 micros montados (malha e colisões), todos diferentes, sem sobreposição, sem acampamentos/grutas/baús/bandos e nenhuma cidade na área. `smoke.js` e `tile-compose.js` seguem OK.

## 7h. L3.5 — Montar os "bons candidatos" e os "possíveis" (plano de 2026-11-24; feito, ver 7i)
Regras comuns (do L2/L1a): cada POI vira `LEGO_RECIPES[tipo][tamanho]` (esqueletos, `half`, `gate`, `flag`, `decorN`), `LEGO_PICK`, `LEGO_MIN`, `LEGO_DECOR` e peças em `LEGO_PIECES`; só desenha por `pBc`; grava `p.r` e `p.recipe`; com lego desligado o POI continua o desenho antigo (`POI_BUILD`), e os POIs antigos giram para a estrada pelo `legoOldBuild` até migrarem. Peça com serviço declara a âncora com `legoAnchor` e entra no teste de alcance (`legoReach`). Fogueira de POI = `buildCampFire`, sempre funcional; ela é malha direta, então vai ao ponto já girado (como a cozinha do alojamento). Raio do POI = `p.r`, não `POI_DEFS`.
**L3.5a — Sem serviço (M, risco baixo).**
| POI | Âncora | Apoio / terreno de trabalho | Tamanhos e esqueletos | Observação |
|---|---|---|---|---|
| Caçadores | fogueira (`buildCampFire`) + tenda maior | tendas (`poiTent`), varais de couro, poste de troféu, lenha, armadilhas | M e P, 4 esqueletos cada (círculo de tendas, fileira, clareira, lado a lado) | `p.chestPos` (baú da conquista) vira âncora; fogueira fora do giro (ponto já girado) |
| Santuário | capela (vitrais, altar) | torre do sino, canteiros, bancos, poço, braseiros de caminho | M e P, 4 cada (eixo central, pátio lateral, claustro, capela isolada) | sem moradores (`keepers=[]`); braseiro é fogo decorativo já existente no desenho antigo |
| Ruínas | muros e altar quebrados | entulho, mato, baú | P e M, 4 cada | sem dono (`owner:'none'`); reusa `entulho` da mina; a vila em escombros (Grande) fica para o L4/4D |
**L3.5b — Novos e grandes (G).**
| POI | Âncora | Apoio / terreno de trabalho | Observação |
|---|---|---|---|
| Forte | muralha com portão + quartel | torres, estábulo, campo de treino, tendas, ameias (`poiWall`, `poiCrenels`, só alinhadas aos eixos) | M e P; muralha como "limite" fechando o esqueleto (cerca do motor vira muralha); `p.r` por instância |
| Plantação | casa pequena | campos grandes (trigo, milho, horta), espantalhos, galpão | variante da fazenda com mais campo e menos prédio; reaproveita `legoCrop` |
| Pesca | cais e cabana | barcos, redes, varais de peixe, barris | só em margem de água: precisa de regra de lugar (`TILE_PLACE`); testar em plano e na 4E |
| Vila de trabalhadores | casa maior | 4 a 8 casas pequenas em fileira, poço, celeiro | classe Grande; usa `poiHut` em vagas em grade |
**L3.5c — Com serviço (M, risco médio; ordem: pousada, alojamento, entreposto, torre).**
| POI | Âncora funcional | Grava em `p` | Peças |
|---|---|---|---|
| Pousada | casa de 1 andar (pousadeiro) | `bed`, `svcSpec` (pousadeiro), `keepers` | casa-âncora, estábulo, mesa externa, `poiRestTheme` (feira, minério ou toras por tema) como peça de enfeite |
| Alojamento | barracão com beliches (cozinheiro) | `bed`, `svcSpec`, `firePos` | barracão, tendas, cozinha de campo (`buildCampFire`), lenha |
| Entreposto | galpão de mercado (lojista) | `svcSpec` (lojista) | galpão, banca, carroças e cavalos; **sempre na estrada** (`TILE_PLACE.offRoadTypes` não o inclui) |
| Torre | torre de vigia | `vigilPos` | torre, braseiro, cerca; tamanho único (pouca variação: só P) |
- **Cenário:** uma fileira por tipo (colunas: 3 variações em M e 3 em P). Com ~14 tipos a grade de 46 x 46 não cabe nos 430 blocos de z de `LEGO_SHOW.area`: a fileira vira "um tipo por vez" via `?lego=<tipo>` ou várias grades lado a lado. **[ABERTO]** qual das duas.
- **Contrato com o jogo:** `poigame.js` lê `svcSpec`, `keepers`, `bed`, `vigilPos`, `chestPos` em coordenadas do mapa (já cobertas por `poiAnchorsMap`); moradores e guarnição pelo `POIX.civ/guards` por tipo (não mudam); `p.r` por instância.
- **Frente e trilha:** a receita gira nativamente com `p.legoFace` (L1b), então pousada, alojamento e entreposto deixam de passar pelo `legoOldBuild`; a trilha e o `offRoad` seguem iguais.
- **Testes:** `macro/lego.js` ganha as receitas novas (geometria: dentro da área, sem sobreposição, portão livre); `lego-galeria.js` conta os POIs do cenário (hoje fixa em 24), confere âncoras e alcance (porta, portão e cada âncora de serviço) e `p.recipe` refazendo o POI; `tile-face.js`, `tile-compose.js` e `smoke.js` (serviços, taverna e moradores) seguem OK com lego ligado e desligado.
- **Riscos:** (1) âncora de serviço mal posta quebra `[E]`: o teste de alcance é obrigatório por receita; (2) a pousada e o alojamento são alvo da anexação e do estoque (4F): `p.recipe` guarda só a semente, não as peças; (3) o forte e a vila de trabalhadores são Grandes: aplainamento e tempo de geração (medir; orçamento da seção 6); (4) pesca depende de água perto: sem lugar, não entra no sorteio.
- **Pronto quando:** cada POI do grupo tem 4 esqueletos por tamanho no cenário lego, passa nos testes acima e, com lego ligado, o tile 4E o usa no lugar do desenho antigo (a troca para padrão continua a decidir do usuário; seção 7d).

## 7i. L3.5 — Implementação (FEITO 2026-11-24; sem validação visual: o usuário confere no jogo)
- **Onde:** receitas e tabelas em `js/modifiers/lego-poi-modifiers.js` (novo; `LEGO_RECIPES`, `LEGO_PICK`, `LEGO_MIN`, `LEGO_DECOR`, `LEGO_PAL` estendidos; atalho `LS(tipo,x,z,w,d,frente,chance)` para as vagas), peças em `js/local/poilego2.js` (novo; ~45 peças em `LEGO_PIECES` e os ajudantes `legoFit`, `legoSpot`, `legoYaw`, `legoFire`, `legoHouse`, `legoLine`, `legoWall`), rótulos de serviço em `poi-texts.js` (`txtLegoSvc`). Raios M/P: caçadores 13/10, santuário 14/11, ruínas 11/9, forte 15/13, torre 11/8, pousada 14/11, alojamento 14/12, entreposto 16/12, plantação 18/12, pesca 14/12, vila de trabalhadores 23/16.
- **Ligação com o jogo:** `POI_BUILD.hunters/sanctuary/ruins/fort/tower/inn/lodge/post` chamam `legoBuild` com `legoOn()` (sem lego, o desenho antigo, intacto). **Tipos novos** `plantation`, `fishery` e `workers` entram em `POI_DEFS` e têm só a receita lego; **ainda fora de `POI_TYPES`/`TILE_POI_MAP`** (nada os gera no jogo; é a L4). Com lego ligado, `legoFaceOn` deixa pousada, alojamento e entreposto girarem pela própria receita (`legoBuild` com `p.legoFace`), sem passar por `legoOldBuild` (que giraria as âncoras duas vezes).
- **Motor (`poilego.js`):** receita com `fence` (chance de cerca ou `'wall'` = muralha de pedra com portão e torres de canto, `legoWall`), `path:false` (sem caminho do portão à porta) e `noflag:true` (ruínas, que não têm bandeira); vagas novas `agua` (lago da pesca) e `cozinha` (alojamento); âncoras novas `binoc` (binóculo da torre) e `chestAt` (baú das ruínas, criado com `addChest` e 30% de relíquia, como no desenho antigo); `A.objs` junta as malhas diretas (fogueira) a `p.sceneObjs`; `A.p` dá o POI às peças (tema da pousada: `poiRestTheme` ganhou origem opcional). Decoração nova `braseiro` e `pedra`. O cenário calcula o espaçamento da grade pelo maior POI da vista (vila: 54 blocos).
- **Âncoras (contrato):** caçadores `firePos` e `chestPos`; torre `vigilPos` e `binoc`; pousada `bed` e `svcSpec` (pousadeiro); alojamento `bed`, `firePos` (cozinha) e `svcSpec` (cozinheiro); entreposto `svcSpec` (lojista); ruínas `chest`. Fogueira = `buildCampFire`, funcional (`[E] Fogueira: cozinhar`).
- **Cenário e galeria:** `LEGO_SHOW.types` tem os 14 tipos (um link por tipo em `cenarios-pois.html`: `?cenario=lego&tipo=<tipo>`, 4 variações em M e em P); a vista sem `tipo` mostra só fazenda, mina e serraria (`LEGO_SHOW.base`) mais os micros. Respostas às [ABERTO] da 7h: um tipo por vez (decidido assim, pois 14 tipos x 2 tamanhos não cabem na grade).
- **No tile:** `tcFaced` só vira (frente para a estrada e trilha) pousada, alojamento, entreposto, taverna e, com lego, fazenda/mina/serraria (`LEGO_FACE_RECIPES`); os 8 tipos que não são de estrada ficam como estavam (sorteio de giro) até a L4.
- **Testes:** `cd tests && node macro/lego.js` (28 receitas: geometria, e agora um corredor do portão de pelo menos 3 blocos entre as peças sólidas; 2 já fechou o caminho na nav), `node lego-l35.js [semente] [tipo]` (novo: cada um dos 11 tipos em `?cenario=lego&tipo=`: 8 POIs, 4 esqueletos por tamanho, malha, colisões, bandeira, âncoras certas por tipo dentro do raio e alcançáveis, `p.recipe` refaz o POI; passa nas sementes 3, 5, 7, 8, 11, 23, 31 e 99), `lego-galeria.js`, `smoke.js`, `tile-compose.js` e `tile-face.js` (com e sem `LEGO=1`) seguem OK. **Limite da nav:** ela bloqueia o interior das casas, então uma âncora dentro de um prédio vale se a porta é alcançável e ela está a até 10 blocos dela; as ao ar livre (fogueira, cozinheiro) usam a nav de verdade (`legoReach`). `tile-face.js` com `LEGO=1` nas sementes 23/31 acusa "trilha impossível" em alguns POIs (pousada, alojamento, entreposto): é o limite de melhor esforço da trilha (7f), que já aparecia sem lego.
- **Não feito / a decidir:** o visual (peças novas só testadas por geometria, colisões e nav: o usuário confere no jogo; ajustar peças e esqueletos conforme o que aparecer); `TILE_POI_MAP` e regras de lugar das 3 novas (pesca precisa de margem de água); tornar o lego o padrão; a taverna e o hospital continuam de desenho fixo.

- **Ajustes após o teste no jogo (2026-11-24):** (1) `legoFaceFor` agora só mantém a frente do esqueleto se ela dá num pátio (senão escolhe a melhor: pátio, chão livre, campo) e os canteiros do santuário não têm colisão (porta da cela tampada); (2) forte pequeno `p-frente` virou `p-campos` (a casa ficava junto do portão); (3) a **mina lego voltou ao desenho da antiga**: galpão de madeira sobre uma rampa de 3 degraus que desce de verdade (`legoDig` escava girando com o POI), trilhos e vagonete embaixo, no lugar da boca em morro de pedra; (4) vila de trabalhadores: POI novo (conquistável, 4 a 8 choupanas, poço, celeiro, campos), pedida na tabela da composição do tile; **não** substitui as cidades.

## 8. Perguntas para decidir
**[DECIDIDO] 2026-11-24** (todas conforme a recomendação):
- Protótipo da fazenda convenceu: seguir para o L1.
- 1: micro-POIs são **só cenário** (opção A): sem dono, anexação nem mapa.
- 2: **12 a 14 POIs de verdade + 10 a 15 micro** por tile (meta de até 25 POIs em ≤ 4 s).
- 3: o L2 começa pelas receitas de **recurso** (fazenda, mina, serraria).
- 4: POIs de guerra viram receitas **depois da etapa 10**.
- 5: terraços de **níveis simples ±2** em POIs médios e grandes; pequenos e micro em um nível só.
- 6: tema x terreno (`tileFit`) fica para a **etapa 5**.
- L1 (estrada): `TILE_PLACE.offRoad` = **30%** (taverna, pousada, alojamento); alcance máximo da trilha **90 blocos**; **entreposto sempre na estrada**.
Texto original das perguntas, para referência:
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
