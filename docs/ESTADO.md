# Estado do projeto

Bilhete de passagem entre sessões e PCs: **leia no início, atualize no fim** (`/encerrar-sessao`). No máximo 40 linhas; o histórico detalhado fica nos `docs/fase-N-*.md` e no `git log`.

## Agora
- **Branch:** `factions-update`. **Save:** `SAVE_VERSION = 21`.
- **Fase atual:** 6 (guerra), revisão dos POIs em andamento (`docs/features/3_tarefas.md`: tarefas 1 a 9 feitas; falta só a 10, fechamento). Fases 4 (rodadas) e 5 (facções) prontas.
- **Última atualização:** 2026-11-20 (sessão local): estradas sobre a água e pontes (`docs/features/5_pontes.md`, tarefas 1 a 5): estrada atravessa água (`ROAD_WATER`), pontes de 5 blocos com tabuleiro aberto, pilares, corrimão com colisão e cabeceiras (`world.js`), `WORLD.bridges`, pedágio só em trecho reto, até 3 por mapa (`bridgeSpots`, `pois.js`), caravanas decorativas não param em ponte. Antes: geração nova dos POIs (tarefa 9).
- **Teste de fumaça:** `node tests/smoke.js` (instalação: ver `CLAUDE.md`). Rode depois de mexer em POIs, serviços, rodadas ou Negociação.

## Onde está o histórico
- Fase 4 (rodadas, economia, políticas, raids, divisão de `rounds.js`, `carry`): `docs/fase-4-testes.md`.
- Fase 5 (facções, missões, F3, F5a–F5d): `docs/fase-5-facoes.md` (seção "Resumo do que existe") e `docs/fase-5-{rebeliao,eventos,reunioes,globais}.md`.
- Fase 6 (POIs, Negociação, smoke, desenho da guerra): `docs/fase-6-guerra.md`.

## Pendências
- **Quase tudo foi checado só por script/console; falta jogar na tela:** POIs (bandidos novos atirando, interiores, forte, balanceamento de renda e preços), F5d (destruição, stamina, queda, pulo, sala do líder), guardas de caravana, missões, rebelião, eventos NPC, reuniões, eventos globais, `carry`, divisão de `rounds.js`.
- **Entreposto:** "no caminho" = a até `POIX.post.reach` (45) da linha entre as cidades; a geração grava `p.road=[idA,idB]` nos POIs de estrada. Materiais do lojista sem estoque limitado.
- **POIs:** negociar POIs na tela de Negociação (falta o menu); POIs de guerra nos buracos do mapa (com a guerra); POI de guerra sem guerra não testado.
- **Raids fáceis demais** (ideias em `docs/fase-4-testes.md`, "Pendências da fase"); mudanças recentes de raid não testadas.
- Humor nos níveis 0 e −1 igual ao nível 1. Contador "16/36" na batalha de rebelião sem causa achada.
- **Pendente do usuário:** lista de novas mecânicas de caravana e desenho do espião.
- Detalhes por fase: seções "Pendências" em `docs/fase-4-testes.md` e `docs/fase-5-facoes.md`; "Falta jogar"/"Pontas soltas" em `docs/fase-6-guerra.md`; `docs/futuras-correcoes.md`.

- **Pontes:** feitas e vistas na tela só na seed 11 (floresta); 0 furos no terreno por raios em 5 sementes. Falta jogar: andar e correr na ponte, NPCs no corrimão (colisão de 2,4), nadar por baixo (coluna invisível), pesca perto. Mapas com 0 a 3 pedágios (pontes curtas ou tortas ficam sem). Saves antigos: o mundo é regenerado pela semente, então estradas e POIs mudam de lugar (sem `SAVE_VERSION`).
- **Smoke intermitente:** "moradores na rodada N+1" falha de vez em quando num POI de mina (`civNext`); não investigado, parece independente das pontes.
- **Geração de POIs:** Mina quase não nasce em planície (sem pedra), Serraria e Entreposto saem pouco; ajuste `POI_GEN`/`POI_RANGE`. Mapas de 6 cidades ficam em ~23. Dá para jogar com `?seed=11&bio=plains` (o bioma é nome: `plains`, `forest`, `mountain`, `snow`, `desert`).

## Próximo passo
1. **Fechar `docs/features/3_tarefas.md`** (tarefa 10: tabela de tipos em `fase-6-guerra.md`, `?cenario=pois`, smoke, roteiro de teste) e **jogar** POIs, rebelião e eventos NPC para balancear (`POIX`, `REB`, `rebWaveSpec`, `FEV`, `FSUP`, `ECON`).
2. **Guerra (Fase 6):** nível do líder com efeito, objeto `WAR` (migração de save), `?cenario=guerra`, operações, cabo de guerra, fadiga, espiões, aliados (ordem em `docs/fase-6-guerra.md`).

Roteiro rápido: `index.html?auto=1&mute=1&seed=11` (criativo), `?cenario=pois&auto=1&mute=1` (POIs), `?cenario=caravanas&mute=1` (caravanas). Recarregue com Ctrl+F5.

## Entre PCs
O contexto viaja por este arquivo, `CLAUDE.md` e `docs/`. Antes de trocar: `/encerrar-sessao`. No outro PC: `git pull` na `factions-update`.
