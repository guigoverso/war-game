# Estado do projeto

Bilhete de passagem entre sessões e PCs: **leia no início, atualize no fim** (`/encerrar-sessao`). No máximo 40 linhas; o histórico detalhado fica nos `docs/fase-N-*.md` e no `git log`.

## Agora
- **Branch:** `factions-update`. **Save:** `SAVE_VERSION = 21`.
- **Fase atual:** 6 (guerra), revisão dos POIs pronta; "Atualizações dos POIs" (`docs/features/1_atualizacoes-POIs.md`) com as tarefas 1 a 5 feitas. Fases 4 (rodadas) e 5 (facções) prontas.
- **Última atualização:** 2026-11-20 (sessão local): Atualizações dos POIs: retomada de POI livre sem decisão (50% bandidos/50% facção) e redutor de guerra na retomada; torre com "Fazer vigia" único (`poiVigil`, 1 uso por torre por rodada, marca o POI mais perto, "?" salvos em `STATE.poiX.marks`); entreposto com estoque limitado, abas, Venda e "?" de preço (`postStockLeft`, `postSellTab`, `postPriceTag`); moradores contados da rodada da limpeza (`STATE.poiX.conq`). Números novos em `js/modifiers.js`, textos em `js/texts.js`. Antes: pontes.
- **Teste de fumaça:** `node tests/smoke.js` (instalação: ver `CLAUDE.md`). Rode depois de mexer em POIs, serviços, rodadas ou Negociação.

## Onde está o histórico
- Fase 4 (rodadas, economia, políticas, raids, divisão de `rounds.js`, `carry`): `docs/fase-4-testes.md`.
- Fase 5 (facções, missões, F3, F5a–F5d): `docs/fase-5-facoes.md` (seção "Resumo do que existe") e `docs/fase-5-{rebeliao,eventos,reunioes,globais}.md`.
- Fase 6 (POIs, Negociação, smoke, desenho da guerra): `docs/fase-6-guerra.md`.

## Pendências
- **Quase tudo foi checado só por script/console; falta jogar na tela:** POIs (bandidos novos atirando, interiores, forte, balanceamento de renda e preços), F5d (destruição, stamina, queda, pulo, sala do líder), guardas de caravana, missões, rebelião, eventos NPC, reuniões, eventos globais, `carry`, divisão de `rounds.js`.
- **Entreposto:** "no caminho" = a até `POIX.post.reach` (45) da linha entre as cidades; a geração grava `p.road=[idA,idB]` nos POIs de estrada. Estoque, abas e venda do lojista: `docs/fase-6-guerra.md`. A venda usa o comprador (`getVendor`) da cidade de referência, sem desconto próprio.
- **POIs:** negociar POIs na tela de Negociação (falta o menu); POIs de guerra nos buracos do mapa (com a guerra); POI de guerra sem guerra não testado.
- **Raids fáceis demais** (ideias em `docs/fase-4-testes.md`, "Pendências da fase"); mudanças recentes de raid não testadas.
- Humor nos níveis 0 e −1 igual ao nível 1. Contador "16/36" na batalha de rebelião sem causa achada.
- **Pendente do usuário:** lista de novas mecânicas de caravana e desenho do espião.
- Detalhes por fase: seções "Pendências" em `docs/fase-4-testes.md` e `docs/fase-5-facoes.md`; "Falta jogar"/"Pontas soltas" em `docs/fase-6-guerra.md`.

- **Pontes:** feitas e vistas na tela só na seed 11 (floresta); 0 furos no terreno por raios em 5 sementes. Falta jogar: andar e correr na ponte, NPCs no corrimão (colisão de 2,4), nadar por baixo (coluna invisível), pesca perto. Mapas com 0 a 3 pedágios (pontes curtas ou tortas ficam sem). Saves antigos: o mundo é regenerado pela semente, então estradas e POIs mudam de lugar (sem `SAVE_VERSION`).
- **Não testado na tela:** vigia da torre ("?" no minimapa e mapa, salvar/carregar), abas e venda do entreposto, moradores ao anexar na N+1; só smoke e leitura. Smoke estável (a falha de `civNext` era o sorteio de retomada).
- **Geração de POIs:** Mina quase não nasce em planície (sem pedra), Serraria e Entreposto saem pouco; ajuste `POI_GEN`/`POI_RANGE`. Mapas de 6 cidades ficam em ~23. Dá para jogar com `?seed=11&bio=plains` (o bioma é nome: `plains`, `forest`, `mountain`, `snow`, `desert`).

## Próximo passo
1. **Jogar** POIs, rebelião e eventos NPC para balancear (`POIX`, `REB`, `rebWaveSpec`, `FEV`, `FSUP`, `ECON`).
2. **Guerra (Fase 6):** nível do líder com efeito, objeto `WAR` (migração de save), `?cenario=guerra`, operações, cabo de guerra, fadiga, espiões, aliados (ordem em `docs/fase-6-guerra.md`).

Roteiro rápido: `index.html?auto=1&mute=1&seed=11` (criativo), `?cenario=pois&auto=1&mute=1` (POIs), `?cenario=caravanas&mute=1` (caravanas). Recarregue com Ctrl+F5.

## Entre PCs
O contexto viaja por este arquivo, `CLAUDE.md` e `docs/`. Antes de trocar: `/encerrar-sessao`. No outro PC: `git pull` na `factions-update`.
