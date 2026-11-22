# Estado do projeto

Bilhete de passagem entre sessões e PCs: **leia no início, atualize no fim** (`/encerrar-sessao`). No máximo 40 linhas; o histórico detalhado fica nos `docs/fase-N-*.md` e no `git log`.

## Agora
- **Branch:** `mapa-mundi-update` (saiu da `factions-update`). **Save:** `SAVE_VERSION = 22` (inalterado).
- **Fase atual:** redesenho do jogo em **Mapa Mundi + Mapas Locais** (feature 5/6). **A guerra (features 3 e 4 em `docs/features/`) está PAUSADA** até a etapa 9 do plano. Fases 4 (rodadas) e 5 (facções) prontas.
- **Última atualização:** 2026-11-22 (sessão local): sessão de **design**, sem mudar regras do jogo normal. Decisões em `docs/features/5_mapa-mundi.md` (fonte da verdade das mecânicas, rodadas 1 a 14); **plano de implementação em `docs/features/6_plano-mapa-mundi.md`** (etapas 0 a 10; mundo novo atrás de `?mundo=1`).
- **Código novo:** cenário de teste `?cenario=batalha` (`js/tiletest.js`, `js/modifiers/map-modifiers.js`, `js/texts/map-texts.js`; `tests/batalha.js`): mapa de 320, sua cidade pequena no canto, cidade grande de outra facção com 30 soldados, 10 soldados seus, guerra declarada ao iniciar. Pequenos ganchos em `phys.js` (`W`), `world.js` (`tileTestOn`), `factions.js` (`genFactions` sem cidades NPC), `game.js` (`tileTestSample` em `frame`), `scenario.js`.
- **Teste de fumaça:** `node tests/smoke.js` passou com o cenário novo no código. O usuário jogou `?cenario=batalha` e disse que funcionou bem (soldados aparecem ao atacar).

## Onde está o histórico
- Fase 4: `docs/fase-6-guerra.md` (o `fase-4-testes.md` não existe mais) e `docs/politicas-locais.md`. Fase 5: `docs/fase-5-reunioes.md` e `docs/features/`. Fase 6 (POIs, guerra): `docs/fase-6-guerra.md`.
- Design do mapa mundi: `docs/features/5_mapa-mundi.md` (decisões, análises, tabela de mecânicas e impacto) e `6_plano-mapa-mundi.md` (ordem).

## Pendências
- **1A (código pronto, NÃO testado na tela):** ordem de movimento dos soldados. **V** manda todos ao ponto mirado (anel azul), **X** cancela; perseguem só inimigos a até 25 blocos do ponto; invasão (`armyAssault`) cancela a ordem. Por ora vale para todos (grupos ficam para depois). Smoke OK; meu teste automático de movimento travou, então testar em `?cenario=batalha&mute=1`. Ajustes em `js/modifiers/army-modifiers.js`.
- **1C (código pronto, NÃO testado na tela):** pistola inquebrável (sempre 100%) e munição dela comprável em dívida até -9999 (loja de armas e entreposto). Morte sem dívida e kit do comandante ficam para a etapa 6.
- **Próxima etapa:** 1B (cidades em blocos).
- **1B:** cidades em blocos e com formatos variados (hoje quadrado com muitos lotes vazios): primeiro ler `city.js` e levantar usos de `c.half`. **1C:** pistola inquebrável e munição da pistola em dívida até -9999 (exceção ao bloqueio de `Ledger.anyDebt()`).
- **Cenário `?cenario=batalha`:** jogador fica invencível (modo criativo); falta medir com placa de vídeo real; sem faixa de árvores na borda; HUD mostra "Cidades: 1/7" no mapa de 2 cidades. `node tests/batalha.js` foi ajustado depois das duas cidades e **não foi rodado de novo**.
- **Aberto no design:** tamanho do exército de raid, preço do aluguel de navio (início 100), ilha inicial pequena vira porto, dungeons/portais no mundo novo, quanto a torre de vigia nova alcança. Tarefa futura: percorrer todas as mecânicas depois que a mudança estabilizar.
- **Do jogo atual, ainda sem jogar na tela:** POIs, frente da guerra (edição da rota, mapa), F5d, caravanas, rebelião, reuniões, eventos, evolução (`LVL`, `CITY_UP_COST`), raids fáceis demais, pontes. Detalhes em `docs/fase-6-guerra.md`.

## Próximo passo
Nova sessão (uma por etapa) na `mapa-mundi-update`: "Leia docs/ESTADO.md, docs/features/5_mapa-mundi.md e docs/features/6_plano-mapa-mundi.md e comece a etapa 1A".
Roteiro rápido: `index.html?cenario=batalha&mute=1` (batalha 30 x 10; `?pos=portao`, `?pos=centro`, `?inim=N`, `?alia=N`), `?auto=1&mute=1&seed=11` (criativo), `?cenario=pois&auto=1&mute=1`. Recarregue com Ctrl+F5.

## Entre PCs
O contexto viaja por este arquivo, `CLAUDE.md` e `docs/`. No outro PC: `git pull` na `mapa-mundi-update`. O `CLAUDE.md` ainda cita a `factions-update` como branch de trabalho.
