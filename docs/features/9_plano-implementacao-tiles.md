# Plano de implementação da etapa 4: tiles, vilas e cidades enormes (feature 9)

Especificação: `docs/features/8_tiles-e-vilas.md` (fonte da verdade). Este arquivo só define **ordem, escopo e em que sessão cada parte roda**. Branch: `mapa-mundi-update`. Tudo atrás de `?mundo=1`; o jogo atual continua o padrão. A guerra segue pausada.

## Estado da especificação
**Fechada em 2026-11-23** (`8_tiles-e-vilas.md`, rodadas 1 a 9). Ficam para depois, anotados lá: ligação do tile com rodadas e economia (etapas 7 e 8), anexação e carne/couro do tile Animais (etapa 8), POIs de guerra por zona (etapa 10). Linha de base medida: mapa 704 gera em 7,7 a 10,9 s; previsão do tile de 384, ~2,2 s; limite proposto 4 s (tile) e 5 s (cidade enorme). Em caso de dúvida de uma sessão, vale o `8_tiles-e-vilas.md`; este arquivo só ordena o trabalho.

## Princípios (iguais aos do plano 6)
- Cada sessão termina com: `node tests/smoke.js` OK, teste na tela pelo usuário, `docs/MAPA.md` e `docs/ESTADO.md` atualizados, commit.
- Números em `js/modifiers/map-modifiers.js` e textos em `js/texts/map-texts.js` (ou categorias novas `tile-`), como pede o `CLAUDE.md`. Notificação nova só com aprovação.
- Nenhum tile depende do grafo (etapa 5): o **tema** do tile vem por parâmetro de URL (`?cenario=tile&tema=fazenda`) até o grafo existir. Na etapa 5 o grafo passa a escolher o tema.
- Tamanho: **P** (uma sessão curta), **M** (uma sessão), **G** (várias).

## Sessões

### 4.0 Documentar como as cidades são feitas hoje (P) — **SESSÃO NOVA**
É o lembrete obrigatório do plano 6. Só leitura de código mais um documento: `docs/features/10_como-as-cidades-sao-feitas-hoje.md`, de ponta a ponta (`genWorld` -> `reserve.js` -> `cityfoot.js` -> `buildCity` -> `carveRoad`/pontes -> serviços e NPCs; modificadores `CITY_FOOT`, `RESERVE`, `CITY_MULTI`; regra "reservar primeiro, esculpir depois"). Sessão nova porque o contexto desta conversa não ajuda e a leitura do código é grande (`city.js` tem ~1200 linhas). Pode rodar **em paralelo** com a especificação.

### 4A. Base do tile (M) — **SESSÃO NOVA**
`TILE_SIZE` 384 (um só valor), lista de temas (cidade, vila, fazenda, mina, serraria, animais, ponte, fortaleza, ruínas, passagem), tabela de composição por tema e proporção de temas na criação do mundo (por URL, `?temas=70`, até haver menu), tudo em `map-modifiers.js`. Descritor de tile `{seed, tema, terreno, saídas, dono}` e `?cenario=tile&tema=...&tam=384`. Revisar `mapwin.js`, `worldfield.js` e `tiletest.js` para a janela de 384. Pronto quando: um tile de qualquer tema abre vazio (só terreno e bordas) com continuidade para o vizinho.

**Acréscimos da rodada 7:** o descritor guarda as aberturas (posição por hash da aresta); a entrada nasce na abertura de onde o jogador veio; sair = andar até uma abertura (confirmação) ou abrir o mapa mundi, ambos gastam ações do mapa. Layout fixo pela semente; o que renova (acampamentos, grutas, bandos) entra na 4F como diferença da semente.

**Acréscimos da rodada 8:** o descritor de tile aceita um **descritor de batalha** opcional `{tipo: conquista|defesa|choque, entradaAtacante, entradaDefensor, estacionado}`; `?cenario=tile&batalha=defesa&entrada=L` para testar. Nesta sessão só o descritor; a montagem vem na 4E.

### 4B. Cidade enorme (G) — **SESSÃO NOVA**, depois da 4A e da etapa 1B
Pegada de lado 243 a 297 (40% a 60% do tile), `CITY_FOOT`, ruas em blocos, muro e portões na pegada. Medir tempo de geração (a 4A mede a linha de base do mapa atual; o limite do tile será essa referência), população, nav (`NAV.budget`) e FPS; ajustar `CITY_MULTI`. **Dependência:** a 1B está feita até o multinível; o que falta dela (formatos, cidade não esticada) é feito nesta sessão e na 4C. Conflita com 4C em `city.js`/`cityfoot.js`: **não rodar em paralelo**.

**Acréscimo (rodada 9):** a 1B foi feita até o multinível; **entram aqui** as cidades que **não sejam uma vila grande esticada** (formatos, blocos, praças próprias). Cidade com 10 soldados fora de guerra.

### 4C. Vila (M) — **SESSÃO NOVA**, depois da 4B
Vila de até 10% do tile (lado até ~121): sem ruas, estradas ligando as casas; só cercas; menos soldados; prédios de serviço reduzidos. Reaproveita o gerador da cidade com parâmetros de vila. **Acréscimo (rodada 9):** **vilas de formatos variados** (restante da 1B). **3 a 6 soldados.**

### 4D. POIs novos e adaptados (M) — **SESSÃO NOVA**, pode ir em paralelo com 4B/4C
Arquivos diferentes (`pois.js`, `poigame.js`). Pousada (camas `poibed` + lojinha), alojamento de trabalhadores com cantina, vila em escombros (ruínas anexáveis, não reconstruíveis), versão rara da vila de trabalhadores, variações visuais por tema. Torre de vigia sem a mecânica nova (fica para a etapa 8). Atualizar `POI_DEFS`/`POI_TYPES`.

### 4E. Composição do tile (G) — **SESSÃO NOVA**, depois de 4A e 4D (4B/4C para os temas de cidade e vila)
Gerador que preenche o tile: principal no centro (marcado no mapa como as cidades), tema perto da estrada, ambiente longe, baús, entreposto só onde passa caravana, passagem com poucas construções. Usa a regra "reservar primeiro" e as folgas `POI_GAP`/`AMB_GAP`. **Acréscimos da rodada 8:** (1) **posição do POI principal** por arquétipo sorteado pela semente (central ~30%, deslocado, beira da estrada, fundo, encosta, margem), com restrições (≥ 70 da borda, ≥ ~80 das aberturas, estrada ligando principal e aberturas; tile de 1 entrada = principal no fundo; cidade enorme com deslocamento máximo `(384 − lado)/2 − 8`); (2) **zonas de guerra reservadas** (uma por abertura, um anel em volta do principal e uma praça de encontro no cruzamento mais próximo do centro), vazias até haver batalha; (3) **montagem dos POIs de guerra por batalha** a partir do descritor da 4A, deixando-os enquanto durar o conflito. Os tipos e a quantidade de POIs de guerra por zona ficam para a etapa 10: aqui entra só a infraestrutura (zonas, montagem com POIs de teste, reposicionamento). Teste: um cenário por tema, tabela de contagem de POIs e uma batalha de cada tipo (conquista, defesa, choque) em tiles de 1, 2 e 4 entradas.

### 4F. Estado e economia do tile (M) — **SESSÃO NOVA**, pode ir em paralelo com 4E
Camada `macro` (sem Three.js): dono do tile = dono do POI principal, diferenças da semente, lista de POIs de guerra do tile `{tipo, zona, dono}`, produção resumida por rodada (comida/recurso nos de recurso; imposto `12 + 5 × rank` na vila), bônus que substitui o dos POIs de hoje. Teste em Node (`node tests/macro/run.js`). Se mexer no estado salvo: `SAVE_VERSION` e `migrateSave`. A anexação detalhada fica para a etapa 8.

### 4G. Revisão e fechamento (P) — **SESSÃO NOVA**
Roda o smoke, joga um tile de cada tema, confere o tempo de geração e atualiza `docs/MAPA.md`, `docs/ESTADO.md` e `docs/features/6_plano-mapa-mundi.md`.

## Ordem e paralelismo
`4.0` (leitura) em paralelo com a especificação -> `4A` -> (`4B` -> `4C`) em paralelo com `4D` e `4F` -> `4E` -> `4G`.
Só `4B` e `4C` mexem nos mesmos arquivos; as demais não se sobrepõem entre si.

## Sessão nova ou a atual?
- **Todas as sessões de implementação (4.0 a 4G) rodam em sessão nova**, sem código de jogo na sessão de especificação. Prompt de abertura sugerido: "Leia docs/ESTADO.md, docs/features/8_tiles-e-vilas.md e docs/features/9_plano-implementacao-tiles.md e comece a sessão 4X". Todas na branch `mapa-mundi-update`, com `git pull` no início e `/encerrar-sessao` no fim.
- Primeiras a abrir: **4.0** (leitura) e **4A**, em paralelo.
