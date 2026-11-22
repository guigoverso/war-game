# Plano de implementação: Mapa Mundi + Mapas Locais (feature 6)

Decisões e análises: `docs/features/5_mapa-mundi.md` (fonte da verdade das mecânicas). Este arquivo é só a **ordem de implementação**. Branch: `mapa-mundi-update`. A guerra (features 3 e 4) segue **pausada** até a etapa 9.

## Princípios
- **Cada etapa deixa o jogo jogável** e termina com: `node tests/smoke.js` OK, teste na tela pelo usuário, `docs/MAPA.md` e `docs/ESTADO.md` atualizados, commit.
- **O mundo novo nasce atrás de um parâmetro de URL** (`?mundo=1`) e o jogo atual continua o padrão até a etapa 7 chegar à paridade; só então o padrão vira o mundo novo (com `SAVE_VERSION` novo e migração).
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
- **1C. Pistola inquebrável e munição em dívida (P).** Pistola sem desgaste; só a munição da pistola pode ser comprada em dívida até **-9999** (exceção ao bloqueio de `Ledger.anyDebt()` em `store.js`); morte nunca gera dívida; kit do comandante novo (pistola, munição, cura) fica para a etapa 6. Números em `economy-modifiers.js`/`army-modifiers.js`.

## Etapa 2: arquitetura em camadas, sem mudar o jogo (G; sessão própria)
Objetivo: preparar o terreno. Conflita com quase tudo, então **nada em paralelo**.
1. Pastas `js/core`, `js/macro`, `js/local`, `js/ui`, mantendo scripts globais e a ordem de carga em `index.html`; regra: `macro` não usa Three.js nem DOM.
2. `WORLD` e `W` passam a ser "o mapa local ativo" (`MAP`), com alias temporário; `W` deixa de ser `const` (tamanho por tile); `scene` passa a ser trocável (cena do mapa local e cena do mapa mundi).
3. `genWorld` dividido em etapas chamáveis (relevo, rios, biomas, cidades, estradas, natureza), cada uma recebendo parâmetros.
4. Ferramenta de teste em Node para a camada `macro` (rodadas, economia, facções sem navegador).
- Pronto quando: smoke igual ao de antes, partida normal idêntica, `docs/MAPA.md` reescrito por camada.

## Etapa 3: campo do mundo e mapa local por janela (G)
- Mundo como **função de posição** (altura, água, bioma, rios) e os 4 formatos: continentes, pangeia, arquipélagos, grande lago (`landMask` em escala de mundo).
- Gerador local recebe uma janela do campo (tile de 320 de cidade, 256 de natureza), com borda orgânica fechada por árvores e aberturas só onde há trilha para um vizinho.
- Estrada local a partir das aberturas (hash da aresta); costa, baía, ilha e rios vindos do campo.
- Cenário `?cenario=tile&...` para ver um tile qualquer e conferir continuidade com o vizinho. Atrás de `?mundo=1`.

## Etapa 4: camada macro, o grafo (M a G)
- Pontos com distância mínima (~256 a 300), vizinhança por triangulação, trilhas, **cidades**, **estradas** (e tiles de ponte onde a estrada cruza água), classificação dos tiles (terreno x água x papel), conectividade garantida.
- Mar: tiles de mar entre ilhas; **ilha inicial** conferida e, se pequena, a cidade inicial vira **porto**.
- Estrutura salva do grafo (rascunho do `SAVE_VERSION`), testes em Node.

## Etapa 5: mapa mundi em 3D (G)
- Diorama em voxels (terreno em colunas, penhascos laterais, mar, estrada clara, trilha tracejada), modelos por tipo de tile, bonecos (batalhão com cor da facção), câmera inclinada com giro e zoom limitados, clique por raio, prévia do caminho com o custo em ações.
- Só visual e seleção; sem atores ainda. Abre pelo livro/atalho e sai para o mapa local.

## Etapa 6: batalhões, ações e turno alternado (G)
- Pool de **ações** por rodada (cresce com o nível da facção), custo por terreno, **até 3 batalhões**, **comandante único** que troca de batalhão de graça, criação de batalhões no **turno do Líder** (primeiro grátis, depois guarnição cheia, com doação de soldados em cidade), morte (perde soldados, ouro, munição; nunca dívida), kit do comandante.
- **Turno alternado:** jogador age -> NPCs dão **um passo** -> ...; atores com ficha comum; encontro no mesmo tile = batalha (sempre jogada para o jogador; por número entre NPCs); **resumo no livro**.
- Layouts de batalha: campo, defesa da cidade, invasão da cidade (reaproveitar a invasão antiga). Tamanho do exército de raid vem do teste 30 x 10.

## Etapa 7: migração dos sistemas para o mundo novo (G; uma sessão por item)
Caravanas (atores nas estradas, saque no tile), raids (contagem de 3 ações, visual N/N+1/N+2 como rebelião, origem em bandidos soltos e na política), POIs viram **sítios** dentro de tiles, missões (viagem e entrega na prefeitura), **torre de vigia nova** (marca um tile com tesouro/dungeon por uma rodada), rebelião e mina, economia e humor por tile de cidade, dungeons/portais (decidir), **salvar/carregar** (`SAVE_VERSION` + `migrateSave`), cenários de teste e smoke. Ao fim, o mundo novo vira o padrão.

## Etapa 8: mar (M a G)
Aluguel de navio (início 100, grátis com cidade de porto), embarque em qualquer ponto com trilha ao mar, arena naval (dois navios ligados por tábuas, barreira invisível), piratas. **Só depois** de o teste 30 x 10 estar aprovado.

## Etapa 9: guerra no mundo novo (G)
Retomar `docs/features/3_*` e `4_*` como movimento de batalhões pela trilha até a cidade alvo, cabo de guerra, fadiga, espiões, aliados, paz.

## Etapa 10: revisão geral (M)
Percorrer **todas as mecânicas** (tabela em `5_mapa-mundi.md`) para ver o que ainda muda ou vale adicionar, e calibrar números (`ECON`, `POIX`, `REB`, `FEV`, pool de ações, preço do navio).

## Como conduzir as sessões
- Uma sessão nova por etapa (a 2 e a 7 em várias), todas na branch `mapa-mundi-update`, com `git pull` no início e `/encerrar-sessao` no fim.
- Prompt de abertura sugerido: "Leia docs/ESTADO.md, docs/features/5_mapa-mundi.md e docs/features/6_plano-mapa-mundi.md e comece a etapa N".
- O `docs/ESTADO.md` precisa citar a branch `mapa-mundi-update`, a guerra pausada e a etapa atual.
