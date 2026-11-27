# Plano de implementação: Mapa Mundi + Mapas Locais (feature 6)

Decisões e análises: `docs/features/5_mapa-mundi.md` (fonte da verdade das mecânicas). Este arquivo é só a **ordem de implementação**. Branch: `mapa-mundi-update`. A guerra (features 3 e 4) segue **pausada** até a etapa 10.

## Princípios
- **Cada etapa deixa o jogo jogável** e termina com: `node tests/smoke.js` OK, teste na tela pelo usuário, `docs/MAPA.md` e `docs/ESTADO.md` atualizados, commit.
- **O mundo novo nasce atrás de um parâmetro de URL** (`?mundo=1`) e o jogo atual continua o padrão até a etapa 8 chegar à paridade; só então o padrão vira o mundo novo (com `SAVE_VERSION` novo e migração).
- **Números e textos novos** vão para `js/modifiers/` e `js/texts/` (categoria `map-`, `army-`...), como pede o `CLAUDE.md`.
- Tamanho relativo: **P** (uma sessão curta), **M** (uma sessão), **G** (várias sessões).

## Etapa 0: feito
Decisões das rodadas 1 a 14, cenário `?cenario=batalha` (mapa de 320, 30 inimigos x 10 soldados), `docs/MAPA.md` atualizado. **Falta** o usuário jogar o cenário e dizer se 30 x 10 está bom.

## Etapa 1: melhorias locais independentes do mapa mundi (testáveis no jogo atual e em `?cenario=batalha`)
Arquivos que não se sobrepõem entre si; uma sessão para cada (1A e 1C podem ir juntas).
- **1A. Ordem de movimento dos soldados (P).** O jogador clica num ponto do chão e os soldados vão até lá, formam em volta e atacam o que estiver ao alcance; uma tecla cancela e eles voltam a seguir o jogador.
  - Arquivos: `js/allies.js` (novo estado de ordem em `updateAlly`, destino por slot, `navMove`), `js/game.js` (tecla e clique; ponto pelo raio da câmera, `rayWorld`), marcador visual do destino, `js/modifiers/army-modifiers.js` (tecla, raio de formação, distância máxima de perseguição) e `js/texts/army-texts.js` (avisos).
  - Cuidados: coexistir com o estado `assault` (seguir o jogador), orçamento de caminhos por quadro (`NAV.budget`), ordem não salva (temporária).
  - Teste: `?cenario=batalha`, mandar os 10 soldados para o outro lado da cidade inimiga.
- **1B. Cidades em blocos e com formatos variados (G).** Hoje a cidade é um quadrado de meia-largura `half` com muitos lotes vazios.
  - Passo 0: ler `city.js` (1229 linhas) e levantar os usos de `c.half`, muro (`cityWall*`), portões (`c.gates`, `raidSidePos`), `c.walk` e `c.keepers`.
  - Forma da cidade: máscara de pegada (quadrado, L, T, cruz, oval, irregular por ruído), sempre contida na caixa `half` (que continua valendo como raio máximo, para não quebrar o resto).
  - Montagem em blocos: malha de ruas que acompanha a pegada, quarteirões preenchidos com casas coladas (menos lotes vazios), praças e prédios de serviço nos pontos certos; muro e portões seguindo a pegada.
  - Tamanhos novos (cidade de 200 de lado) são o caso principal. Teste: `?cenario=batalha`, `?cenario=pois` e partida normal; conferir moradores, nav e raid.
- **1C. Pistola inquebrável e munição em dívida (P).** Pistola sem desgaste; só a munição da pistola pode ser comprada em dívida até **-9999** (exceção ao bloqueio de `Ledger.anyDebt()` em `store.js`); morte nunca gera dívida; kit do comandante novo (pistola, munição, cura) fica para a etapa 7. Números em `economy-modifiers.js`/`army-modifiers.js`.

## Etapa 2: arquitetura em camadas, sem mudar o jogo (G; sessão própria) — FEITA em 2026-11-23 (ver `docs/MAPA.md`, seção Camadas; faltou separar os arquivos mistos da raiz de `js/`, que acontece nas etapas 5 a 8)
Objetivo: preparar o terreno. Conflita com quase tudo, então **nada em paralelo**.
1. Pastas `js/core`, `js/macro`, `js/local`, `js/ui`, mantendo scripts globais e a ordem de carga em `index.html`; regra: `macro` não usa Three.js nem DOM.
2. `WORLD` e `W` passam a ser "o mapa local ativo" (`MAP`), com alias temporário; `W` deixa de ser `const` (tamanho por tile); `scene` passa a ser trocável (cena do mapa local e cena do mapa mundi).
3. `genWorld` dividido em etapas chamáveis (relevo, rios, biomas, cidades, estradas, natureza), cada uma recebendo parâmetros.
4. Ferramenta de teste em Node para a camada `macro` (rodadas, economia, facções sem navegador).
- Pronto quando: smoke igual ao de antes, partida normal idêntica, `docs/MAPA.md` reescrito por camada.

## Etapa 3: campo do mundo e mapa local por janela (G) — CÓDIGO PRONTO em 2026-11-23, falta o teste na tela (roteiro em `docs/etapa-3-testes.md`; resumo em `docs/MAPA.md`, seção Etapa 3)
- Mundo como **função de posição** (altura, água, bioma, rios) e os 4 formatos: continentes, pangeia, arquipélagos, grande lago (`landMask` em escala de mundo).
- Gerador local recebe uma janela do campo (tile de 320 de cidade, 256 de natureza), com borda orgânica fechada por árvores e aberturas só onde há trilha para um vizinho.
- Estrada local a partir das aberturas (hash da aresta); costa, baía, ilha e rios vindos do campo.
- Cenário `?cenario=tile&...` para ver um tile qualquer e conferir continuidade com o vizinho. Atrás de `?mundo=1`.

## Etapa 4: tiles ricos, vilas e cidades maiores (G; **primeiro só especificação, depois implementação**)
**Ainda não foi discutida.** Esta etapa tem **duas fases e a segunda só começa depois da primeira aprovada pelo usuário**:
1. **Especificação (conversa e documento, sem código de jogo):** decidir tudo abaixo e escrever em `docs/features/` (um arquivo novo, ex.: `8_tiles-e-vilas.md`) e atualizar `5_mapa-mundi.md`.
2. **Implementação:** só depois da aprovação, quebrada em sessões (cidades maiores; tipos de tile; vilas; lógica do mundo de tile).

> **Andamento (2026-11-23):** especificação em `8_tiles-e-vilas.md` (tile 384, cidades enormes 5 a 7, vilas até 10%, temas de tile, POIs pousada e alojamento); plano da fase de implementação em `9_plano-implementacao-tiles.md` (sessões 4.0 a 4G).

> **Andamento (2026-11-24):** 4A a 4G **feitas** (4G = revisão após o lego; resultado em `9_plano-implementacao-tiles.md`). Falta só a conferência visual no jogo e `5_mapa-mundi.md`.

Assuntos da etapa:
- **Cidades maiores e de tamanhos variados.** Inclui o "passo 4 da 1B" (cidades de 200 de lado e calibragem, hoje raio de 36 a 45) e a relação com o tile de 320 da etapa 3. Medir tempo de geração e ajustar `CITY_FOOT`/`CITY_MULTI`.
- **Novos tipos de tile** (fazenda, mineradora, serraria e outros): quais existem, onde nascem no grafo da etapa 5, o que cada um produz/consome e como se relacionam com os POIs atuais (`POI_DEFS`).
- **Especificação do que vai dentro de cada tile:** tamanho do mapa local, o que é fixo e o que é sorteado, prédios, NPCs, recursos, bordas e aberturas, o que o jogador pode fazer ali.
- **Vilas em tiles (antigas cidades):** no sistema novo as cidades atuais passam a ser **vilas**, cada uma ocupando um tile; definir o que é "cidade" (maior, em vários tiles ou tamanho próprio) e o que muda para facções, economia, muro e raids.
- **Lógica de mundo de tile:** como um tile guarda estado (dono, produção, população, construções), o que acontece quando o jogador não está nele (simulação resumida) e como tiles se ligam (estradas, rodadas, economia por tile).

> **LEMBRETE (obrigatório antes de implementar as vilas): documentar como as cidades são feitas HOJE para replicar na vila.** Salvar em um arquivo (ex.: `docs/features/8_como-as-cidades-sao-feitas-hoje.md`) o processo atual de ponta a ponta: `genWorld` (`world.js`) -> reserva (`reserve.js`: pegada, faixa plana, montanha, água, laço de verificação) -> `cityfoot.js` (pegada, `cityHeightMap`/níveis da fase 6, `cityLot`, `cityStreetLevels`) -> `buildCity` (`city.js`: ruas, praça, serviços espalhados, casas, muro e portões, decoração) -> `carveRoad`/estradas e pontes -> serviços e NPCs; com os modificadores (`CITY_FOOT`, `RESERVE`, `CITY_MULTI`) e a regra "reservar primeiro, esculpir depois" (`docs/features/7_cidades-por-reserva.md`). A vila nova deve reproduzir isso em escala de tile.

## Etapa 4B: POIs procedurais "lego" e densidade dos tiles (G; decidida em 2026-11-24; vem **logo depois da 4F** e **antes da etapa 5**)
Os tiles da 4E ficaram vazios e cada tipo de POI tem um desenho fixo. Esta etapa troca isso por **receitas** (esqueleto com vagas + peças: âncora, apoio, terreno de trabalho, limite, circulação, enfeite, vivo), a classe de tamanho do POI (micro, pequeno, médio, grande), **micro-POIs** (só cenário, sem dono) e a densidade do tile. Especificação e passos L0 a L5 em `docs/features/11_pois-procedurais-lego.md`; protótipo da fazenda já feito (`?lego=1`). Inclui a nota do L1: POIs de estrada (taverna, pousada, alojamento, fazendas) com a frente virada para a estrada, trilha até a entrada e 30% fora dela (entreposto sempre na estrada).
- **Por que antes da etapa 5:** o grafo só escolhe tema e terreno; não depende das peças. Mas a 4G (revisão do tile: tempo de geração e contagem de POIs) só faz sentido com a densidade final, então a **4G passa a vir depois desta etapa**. A etapa 8 (POIs viram sítios) herda as receitas.
- **Pode andar em paralelo** com o protótipo da batalha (item abaixo), pois mexem em arquivos diferentes.

## Etapa 4C: núcleo da batalha no tile (protótipo; antes da etapa 7)
Os POIs de guerra por zona foram descartados (`8_tiles-e-vilas.md`, Pendente): com batalha num ponto de um mapa aberto o jogador contornaria a resistência. Nova direção em `docs/features/12_batalha-no-tile.md`: POIs/acampamentos **geradores de inimigos** com raio, **contador com reposição** (reserva total x vivos ao mesmo tempo), modos Defesa, Ataque e Choque, **batalhão em três partes** (Comandante, Elites, Comuns) e arredores de defesa (trincheira, barricadas; dependem da 4B). **Atualização (2026-11-25):** decisões 1 a 18 fechadas e ordem revisada (11 passos, com sessão e cenário de teste por passo, galeria `cenarios-batalha.html`; o 11 é o recrutamento com limites por rodada: cidade 50, vila 15) em `12_batalha-no-tile.md`, seções 4B e 5; entra também a IA dos atiradores (cobertura e carregador). Ordem original: protótipo do núcleo no `?cenario=batalha` (pode ser em paralelo com a 4B) -> Defesa -> Ataque -> **especificação fechada e batalhão no estado** (obrigatórios **antes da etapa 7**, que define batalhões e ações) -> Choque -> arredores -> integração com o tile e a etapa 10.

## Etapa 5: camada macro, o grafo (M a G) — CÓDIGO PRONTO em 2026-11-26 (`js/macro/graph.js`, teste `tests/macro/grafo.js`; decisões na rodada 15 de `5_mapa-mundi.md`; faltam salvar no `STATE`, ligar ao mapa local e a conferência visual)
- Pontos com distância mínima (~256 a 300), vizinhança por triangulação, trilhas, **cidades**, **estradas** (e tiles de ponte onde a estrada cruza água), classificação dos tiles (terreno x água x papel), conectividade garantida.
- **Tema de cada tile (acrescentado em 2026-11-24, a pedido do usuário: fazenda em montanha não faz sentido):** o grafo passa a atribuir o tema (`TILE_THEMES`) por **adequação ao terreno** (`tileFit`, `macro/tile.js`; tabela `TILE_THEME_BIOMES`), respeitando a proporção do mundo (`TILE_THEME_WEIGHT`, `?temas=N`, rodada 6 de `8_tiles-e-vilas.md`: 5 a 7 cidades, 7 a 9 vilas, ~10 de recurso, 2 a 3 fortalezas, 2 a 3 pontes, 1 a 2 ruínas); ponte onde a estrada cruza água estreita; fortaleza em gargalo e entre territórios; tile sem tema (passagem) fora das rotas de caravana. Hoje (`tileThemeFor`) o tema sai de um sorteio por semente que ignora o terreno.
  **(Decidido em 2026-11-26: limite 0,5; o mundo tem no mínimo 1 tile de cada tema, forçado no de maior adequação; vizinho do mesmo tema perde peso, não é proibido; distância mínima 384.)** **A decidir ANTES da etapa 5 (o usuário aprovou definir a regra antes e calibrar durante):** (1) limite mínimo de adequação ao terreno para um tema valer; (2) o que fazer quando o mundo não tem tile bom para um tema (ex.: sem floresta para serraria): tema não nasce, nasce com adequação menor ou troca por outro?; (3) se o mesmo tema pode se repetir em tiles vizinhos. Números (pesos, limites) ficam em `map-modifiers.js` e se calibram com o grafo pronto.
- Mar: tiles de mar entre ilhas; **ilha inicial** conferida e, se pequena, a cidade inicial vira **porto**.
- Estrutura salva do grafo (rascunho do `SAVE_VERSION`), testes em Node.

## Etapa 6: mapa mundi em 3D (G) — CÓDIGO PRONTO em 2026-11-26 (`js/ui/mundo3d.js`; abre com J ou `?cenario=mundo3d`; falta o usuário olhar na tela; ver `docs/MAPA.md`)
- (Feito em 2026-11-26, com várias rodadas de ajuste visual do usuário: ilha limpa em degraus, linhas translúcidas, placa sob o modelo, dia e noite, ondas, câmera livre, herói que anda; **tiles de ponte** passaram a nascer no meio do vão de água, no grafo, e o formato continentes sorteia de 2 a 5 massas.)
- Diorama em voxels (terreno em colunas, penhascos laterais, mar, estrada clara, trilha tracejada), modelos por tipo de tile, bonecos (batalhão com cor da facção), câmera inclinada com giro e zoom limitados, clique por raio, prévia do caminho com o custo em ações.
- Só visual e seleção; sem atores ainda. Abre pelo livro/atalho e sai para o mapa local.

## Etapa 6A: gerador de nomes dos tiles — CÓDIGO PRONTO em 2026-11-26 (`js/macro/tilename.js`, `TILE_NAME`, `TXT_NAME_*`, teste `tests/macro/nomes.js`; rótulo e painel do mapa mundi 3D já usam; falta só o usuário olhar na tela) (P; pedido do usuário em 2026-11-26; depois do mapa mundi 3D e antes da etapa 7)
Hoje o rótulo do tile é só o tema ("Fazenda", "Fortaleza"). Passa a ter um **nome próprio**, por exemplo "Fazenda de Santa Maria", "Mina do Corvo", "Serraria do Pinhal", "Ponte do Rio Fundo".
- **Determinístico:** o nome sai da semente do mundo e do id do tile (`RNG` já usado em `graph.js`), então não vai para o save e a mesma semente dá os mesmos nomes; a etapa 8 só grava o nome se o jogador puder renomear.
- **Usa o terreno** (decidido: sim): bioma dominante, costa, altura e água do tile (`n.terr`, `n.costa`, `n.agua` do grafo). Ex.: serraria em floresta -> "do Pinhal/Bosque/Carvalhal"; mina em rocha -> "da Pedra/Serra/Rochedo"; vila de costa -> "do Porto/Cais/Maré"; ponte sobre vão -> "do Vão/Estreito"; deserto -> "da Areia/Oásis"; neve -> "do Gelo/Neve".
- **Padrão por tema** (listas em `js/texts/map-texts.js`, constantes com comentário; nada de string solta na lógica): cidade e vila = nome próprio (santo, sobrenome, sufixo de lugar: "Vila Trovão", "São Jorge do Vale"); recursos = "<Tema> <preposição> <nome do terreno ou santo/família>"; fortaleza = "Forte <nome>"; ruínas = "Ruínas de <nome>"; passagem = "Passo do <acidente>". Nunca repetir nome no mesmo mundo (reroll por tentativa).
- **Onde aparece:** rótulo no mapa mundi 3D (`wm3Label`), painel do tile (`txtWm3Info`), resumo da rodada no livro e, mais tarde, no cabeçalho do mapa local. Integra com os nomes de cidade já existentes (`c.name` das cidades do jogo atual) na etapa 8.
- **Função:** `tileName(G, n)` na camada macro (`js/macro/`, sem Three.js/DOM) + teste em Node (`tests/macro/`: determinismo, unicidade, todos os temas e biomas cobertos).
- **Custo:** uma sessão curta, só texto e uma função; nenhum risco de regressão.

| Passo | Sessão | Por quê |
|---|---|---|
| 6A (gerador de nomes) | **Nova**, com contexto limpo | Só precisa do repositório e deste doc; não depende do que foi lido no mapa mundi 3D. |

> **Pendência da ponte (pedido do usuário, 2026-11-26; fica para depois, junto da etapa 8 / POIs viram sítios):** no mapa mundi 3D a ponte do tile é **reta, com arcos nas pontas** (`wm3BridgeBuild`; as bifurcações foram descartadas por ficarem quebradas). O **tile local** de ponte (`tcBridge`, `tilecompose.js`) ainda tem uma ponte simples: deve ganhar o mesmo modelo com ramos, um por abertura/estrada que chega ao vão.

## Etapa 7: batalhões, ações e turno alternado (G) — CÓDIGO PRONTO em 2026-11-26 (`js/macro/worldturn.js`, `js/ui/mundoturno.js`, teste `tests/macro/worldturn.js`; falta ligar a batalha real no tile e as rodadas do jogo; ver `docs/ESTADO.md`)
- Pool de **ações** por rodada (cresce com o nível da facção), custo por terreno, **até 3 batalhões**, **comandante único** que troca de batalhão de graça, criação de batalhões no **turno do Líder** (primeiro grátis, depois guarnição cheia, com doação de soldados em cidade), morte (perde soldados, ouro, munição; nunca dívida), kit do comandante.
- **Turno alternado:** jogador age -> NPCs dão **um passo** -> ...; atores com ficha comum; encontro no mesmo tile = batalha (sempre jogada para o jogador; por número entre NPCs); **resumo no livro**.
- Layouts de batalha: campo, defesa da cidade, invasão da cidade (reaproveitar a invasão antiga). Tamanho do exército de raid vem do teste 30 x 10.

## Etapa 8: migração dos sistemas para o mundo novo (G; uma sessão por item)
**Levantamento validado em `docs/features/13_etapa-8-migracao-mecanicas.md`** (seções A a G, com as notas do usuário) e **decisões resumidas na rodada 16 de `5_mapa-mundi.md`**. Sessões 0, 0A e **0B feitas (2026-11-26)**. A ordem abaixo é a final.

**Regras de todas as sessões da etapa 8:**
- Tudo atrás de `?mundo=1` até a 8.12; o jogo padrão continua o mundo antigo e não pode quebrar (smoke atual OK em toda sessão).
- Sessão que muda o estado salvo: +1 em `SAVE_VERSION` e passo `if(d.v<N)` em `migrateSave`, como sempre; a 8.12 só fecha o save e troca o padrão.
- Números novos em `js/modifiers/`, textos em `js/texts/`; **notificações e textos novos são listados e aprovados na própria sessão antes de criar** (tela de carregamento na 8.1, tela de morte na 8.3, popup do pedágio na 8.5, seção "Mundo" na 8.10).
- Regras da camada `macro` ganham teste em Node (`tests/macro/`); cada sessão termina com teste na tela pelo usuário, `docs/MAPA.md` e `docs/ESTADO.md` atualizados e commit.
- Os dois atalhos criativos aprovados entram onde passam a ser úteis: **anexar/desanexar tile** na 8.4 e **bandidos dominam o tile** na 8.7. Os outros (rodada 16, [PROPOSTA]) são oferecidos ao usuário na sessão em que fariam sentido.

### 8.1 Fundação: rodada única, entrar/sair do tile, relógio, grafo salvo (G) — doc 13: A1, A3, A4 (parte), E6
> **CÓDIGO PRONTO em 2026-11-26** (falta o teste na tela pelo usuário; resumo em `docs/MAPA.md`, "Etapa 8.1"). Limites conhecidos: a economia do `endRound` ainda é a das cidades do mapa local carregado (8.4); tile sem cidade não tem escritório, então o turno do Líder abre só o livro (modo Líder no mapa mundi: 8.2); a cidade de todo tile ainda nasce sua (dono por tile: 8.4).
- `endRound` e `wtEnd` viram **um só fim de rodada** (`rounds.js` chama o fechamento do turno do mapa mundi; o turno do Comandante passa a ser o turno no mapa mundi). Rodada 0 com pool de 4 ações e sem declarar guerra (`WT`).
- Grafo no `STATE` (`wgPack`/`wgUnpack`), `STATE.wt` e `STATE.bat` salvos; salvar em marcha e dentro do tile (posição + marcas do tile, ainda só as que já existem).
- Entrar no tile: botão direito > "Entrar no tile" (1 ação), geração pelo `mapwin`/`tileCompose` com o estado do tile, início no ponto da estrada de onde veio; sair grátis. Tela de carregamento (3 soldados correndo + texto a aprovar). Tile sem o jogador não simula NPCs.
- Relógio único: partes do dia no mapa mundi (4 de movimento = 1 parte), horas no Campo; entrada no início da faixa e volta pela hora de saída (substitui `WORLD3D.actionsPerDay`).
- Arquivos: `rounds.js`, `save.js`, `state.js`, `worldturn.js`, `mapwin.js`, `mundo3d.js`, `mundoturno.js`. Teste: entrar e sair de vários tiles, fechar rodadas, salvar e carregar em marcha e dentro do tile.

### 8.2 Batalhões como duplicados do jogador e turno do Líder (M) — A2, C7, E2, E3 (modo Líder básico)
- Batalhão = boneco do jogador (vida, inventário, buffs e upgrades compartilhados; só os soldados variam). Limite por facção (1/2/3).
- Criar no turno do Líder: 1 ponto + 1.000 de ouro, nasce com 10 em qualquer cidade da facção; 1º grátis; sem nenhum, um grátis com 0 soldados. Doar/dividir em cidade ou vila da facção, até zerar. Kit só no resgate.
- Recrutamento e mercenário entram no batalhão presente (cidade 25, vila 15, neutro 5; teto 50).
- Mapa mundi em modo Líder no escritório (tecla M e livro; o mapa na mesa fica para a 8.11): ver, criar e doar; sem mover.
- Arquivos: `battalion.js`, `worldturn.js`, `office.js`, `mundoturno.js`, recrutamento (`battle.js`/quartel). Teste: Node (`tests/macro/worldturn.js`) + criar, dividir e recrutar na tela.

### 8.3 Encontro vira batalha de verdade e morte (G) — C5, C6, A5
- O encontro no mapa mundi abre a batalha real no tile: Choque, Defesa (sem fuga: sair do raio = morrer) ou Ataque (só no POI principal; fugir pausa). Batalhões somados (30 x 10 em campo), baixas divididas, encontro espera o jogador mover os outros batalhões. Ao vencer, continua no tile. Entre NPCs por número, com intervenção do jogador escolhendo um lado. Sai o atalho "Resolver por número" (fica só no modo criativo).
- Morte em três formas (+ conversão "atacou sozinho"), tela de morte narrativa (textos a aprovar), troca para outro batalhão ou fim do turno do Comandante.
- Arquivos: `battle.js`, `worldturn.js`, `tilewar.js`, `game.js` (morte), `mundoturno.js`. Depende da 8.1 (entrar no tile) e da 8.2 (batalhão = boneco).

### 8.4 Economia e cidades por tile (G) — B1, B2, B3, B6, D6
- Ouro geral único (`vault` some), **armazém único** da facção (24 slots, pilha 99, descarte silencioso), consulta no livro, área de "últimos ganhos". Renda por tipo de tile (`TILE_PROD`/`TILE_TAX`) entrando no `endRound`; POI deixa de render.
- Vila: rank 1 a 3 sorteado no grafo, armazém no rank 2+, sempre cura e prefeitura, outros serviços por chance; independência de vila distante (nunca se vizinha de tile do dono). Humor/rebelião só nas cidades.
- Nível da facção define pool de ações e máx. de batalhões; evoluir facção = 1 ponto de Líder. Suprimento ao entrar em cidade/vila da facção; marcha não consome.
- Cidade do tile: estado salvo (nível, muro, construções, POIs limpos, baús, lojas, armazém); moradores gerados a cada entrada. Atalho criativo: anexar/desanexar tile.
- Arquivos: `econ.js`, `warehouse.js`, `tilestate.js`, `graph.js` (rank da vila), `city.js`, `book.js` (aba do armazém). Teste: Node para renda e rank; tela para armazém e suprimento.

### 8.5 POIs viram sítios, torre nova, ponte e fortaleza (G) — D1, D2, D3, D4, G7, E4 (binóculo)
- Dono por POI; POI principal define o dono do tile e é o único com guarnição; sem efeitos globais nem renda. Baú de recompensa por tipo (tabela [PROPOSTA] da rodada 16, confirmar com o usuário). Loja de POI volta na rodada seguinte à conquista. Santuário por dízimo. Entreposto e Taverna com Comprar / Vender; cura à venda neles.
- Torre nova (3 usos por rodada, tile + vizinhos, 50% de falha, dungeon e marca por uma rodada); o "?" e o raio 300 saem; o binóculo não acha baús. Dungeons deixam de nascer sozinhas.
- Pedágio no tile de ponte e de fortaleza (neutro 100, outra facção 150 x relação, NPC paga ao jogador, bandidos tomam em 2 a 3 ações e passar custa 500), popup com "Não mostrar novamente" + opção nas configurações (texto a aprovar). `tcBridge` com ramos por abertura (pendência da etapa 6).
- Arquivos: `pois*.js`, `poigame.js`, `poilego*.js`, `tilecompose.js`, `svcshop.js`, `worldturn.js` (cobrança ao cruzar), `poi-modifiers.js`.

### 8.6 Caravanas (M) — C1
- Caravana como ator do grafo, criada no modo Líder (1 ponto, marca a rota), 1 por cidade; suprimento das cidades da rota enquanto existir; emboscada com 2 ações para saquear (sem o jogador, por número); representação na estrada ao entrar no tile; caravana não paga pedágio.
- Arquivos: `caravans.js`, `worldturn.js`, `mundo3d.js`/`mundoturno.js`. Depende da 8.4 (suprimento) e da 8.5 (pedágio no mesmo `worldturn.js`).

### 8.7 Raids e bandidos (G) — C2, C3, B4 (raid em vila/tile)
- Bandidos soltos (1 passo por ação, alvo mais perto, desempate caravana/vila/cidade), reaparecimento por sorteio, maioria dos tiles livres com bandidos no início.
- Raid de 30 a 60, chegada em 3 a 5 ações, 2 a 3 ações no alvo; Choque/Defesa/Ataque conforme quem chega primeiro; cidade saqueada (ouro, armazém, humor, chamas por 2 rodadas); vila/tile passa aos bandidos.
- Limpar tile = Ataque no POI principal; POI de saída dos soldados (automático se faltar); POIs secundários seguem com bandidos. Atalho criativo: bandidos dominam o tile.
- Arquivos: `raids.js`, `worldturn.js`, `tilestate.js`, `battle.js`. Depende da 8.3 (batalha), 8.5 (POI principal) e 8.6 (caravana como alvo).

### 8.8 Missões (M) — E1
- Prazo em rodadas, quadro na prefeitura, entrega entrando no tile e indo à prefeitura, destinos = cidades e tiles com POI principal livre; vilas com até 3 missões do próprio tile; missão "limpar POIs tomados por bandidos" (no território do jogador ou de outra facção, dando relação; se não houver POI, o jogo toma um).
- Arquivos: `missions.js`, `quests.js`. Depende da 8.7.

### 8.9 Rebelião e dungeons (M) — C4, D5
- Rebelião = Ataque no tile da cidade (rebeldes podem passar de 30); cidade não retomada vira facção nova ou é anexada (também para NPC); visual reaproveitado do raid.
- Dungeon achada pela torre: marca no mapa mundi, no minimapa e no Mapa M; portal dentro do tile; sem fim de turno lá dentro; portal dourado só por evento.
- Arquivos: `rebellion.js`, `rebmine.js`, `dungeon.js`. Depende da 8.5 (torre) e 8.7 (visual da cidade saqueada).

### 8.10 Facções NPC no mapa e o livro (G) — B4, B5, E5
- NPCs começam com tiles próximos anexados; têm caravanas e batalhões que conquistam neutros e bandidos (1 tile por rodada, onde pararam; se o jogador estiver lá, vira encontro), caçam bandidos e podem se juntar ao jogador contra bandidos; tile conquistado longe pode ficar independente. Rotas (`fgRoutes`) viram arestas do grafo. Evento que cita lugar marca o tile.
- Seção **"Mundo"** na parte "anterior" do relatório (lista de eventos e textos a aprovar).
- Arquivos: `factions.js`, `facgraph.js`, `facevents.js`, `worldturn.js`, `book.js`, `rounds.js` (`rdNow`). Depende da 8.6 e 8.7.

### 8.11 Mapas, UI e acabamento (M) — E3, E4 (final), G8, D6 (vizinho)
- Teclas finais (J mapa mundi; M = Mapa M no Campo e mapa mundi no escritório), mapa na mesa do escritório, Caderno > Mapa abre o 3D, minimapa só do tile, marcas de evento e dungeon no mapa mundi.
- Nome do tile editável (gravado no save). Visão simples do tile vizinho além da borda.
- Arquivos: `mundo3d.js`, `office.js`, `bookmap.js`, `game.js` (teclas), `tilename.js`.

### 8.12 Salvar completo, cenários, smoke e troca do padrão (M) — A4 (final), F3
- `SAVE_VERSION` final do mundo novo; save antigo mostra aviso de versão antiga e não carrega. Mundo novo vira o padrão; o antigo fica em `?mundo=0` (removido numa etapa final).
- Cenários antigos para `cenarios/legado`, cenários novos por tile, smoke novo do mundo novo.
- Arquivos: `save.js`, `state.js`, `scenario.js`, `index.html`, `tests/smoke.js`, galerias `cenarios-*.html`.

| Passo | Sessão | Por quê |
|---|---|---|
| 8.1 Fundação | **Nova** | Grande e é a ponte de tudo; só precisa do repositório e dos docs. Mexe em `rounds/save/state/worldturn/mapwin`: **sozinha**. |
| 8.2 Batalhões e Líder | **Nova** | Contexto da 8.1 já pesado; usa `worldturn.js` (não em paralelo com a 8.1 nem a 8.3). |
| 8.3 Batalha real e morte | **Nova** | Grande; usa `battle.js`, `worldturn.js` e a morte em `game.js`. Depende da 8.1 e da 8.2. |
| 8.4 Economia e cidades | **Nova** | Grande e em outros arquivos (`econ/warehouse/city`). Poderia rodar junto da 8.3, mas o pool de ações pelo nível da facção mexe em `worldturn.js`: vem depois. |
| 8.5 POIs, torre, ponte | **Nova** | Grande, em `pois*`/`tilecompose`; a cobrança do pedágio entra em `worldturn.js`, por isso não em paralelo com a 8.6. |
| 8.6 Caravanas | **Nova** | Média; precisa do suprimento da 8.4 e do pedágio da 8.5. |
| 8.7 Raids e bandidos | **Nova** | Grande; `raids.js` + `worldturn.js`. Depende da 8.3, 8.5 e 8.6. |
| 8.8 Missões | **Nova** (pode rodar **em paralelo com a 8.9**) | Pequena, mas a 8.7 deixa o contexto pesado; arquivos próprios (`missions/quests`). |
| 8.9 Rebelião e dungeons | **Nova** (em paralelo com a 8.8) | Arquivos próprios (`rebellion/rebmine/dungeon`), sem sobreposição com a 8.8. |
| 8.10 Facções NPC e livro | **Nova** | Grande; volta a `worldturn.js` e `rounds.js`. Depois da 8.8 e da 8.9 terminarem. |
| 8.11 Mapas e UI | **Nova** | Tela e conferência visual; precisa de tudo ligado. |
| 8.12 Save final e padrão | **Nova, por último, sozinha** | Conflita com tudo (`save/state/index/smoke`). |

Ordem: **8.1 -> 8.2 -> 8.3 -> 8.4 -> 8.5 -> 8.6 -> 8.7 -> (8.8 | 8.9) -> 8.10 -> 8.11 -> 8.12**. Prompt de abertura: "Leia docs/ESTADO.md, a rodada 16 de docs/features/5_mapa-mundi.md, docs/features/13_etapa-8-migracao-mecanicas.md e a etapa 8 de docs/features/6_plano-mapa-mundi.md e comece a 8.N".

## Etapa 9: mar (M a G)
Aluguel de navio (início 100, grátis com cidade de porto), embarque em qualquer ponto com trilha ao mar, arena naval (dois navios ligados por tábuas, barreira invisível), piratas. **Só depois** de o teste 30 x 10 estar aprovado.

## Etapa 10: guerra no mundo novo (G)
Retomar `docs/features/3_*` e `4_*` como movimento de batalhões pela trilha até a cidade alvo, cabo de guerra, fadiga, espiões, aliados, paz.

## Etapa 11: revisão geral (M)
Percorrer **todas as mecânicas** (tabela em `5_mapa-mundi.md`) para ver o que ainda muda ou vale adicionar, e calibrar números (`ECON`, `POIX`, `REB`, `FEV`, pool de ações, preço do navio).

## Como conduzir as sessões
- Uma sessão nova por etapa (a 2 e a 8 em várias), todas na branch `mapa-mundi-update`, com `git pull` no início e `/encerrar-sessao` no fim.
- Prompt de abertura sugerido: "Leia docs/ESTADO.md, docs/features/5_mapa-mundi.md e docs/features/6_plano-mapa-mundi.md e comece a etapa N".
- O `docs/ESTADO.md` precisa citar a branch `mapa-mundi-update`, a guerra pausada e a etapa atual.
