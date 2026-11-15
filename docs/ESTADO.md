# Estado do projeto

Arquivo de passagem entre sessões e entre computadores. **Leia no início de cada sessão; atualize no fim** (skill `/encerrar-sessao`, em `docs/skills/`).
Mantenha curto: o histórico detalhado das regras fica em `docs/fase-4-testes.md` (rodadas, economia, políticas, raids) e `docs/fase-5-facoes.md` (facções).

## Resumo
- **Branch de trabalho:** `factions-update` (commitada e enviada).
- **Fase atual:** 5 (facções). A Fase 4 (rodadas, prefeitura, livro, caravanas, 10 políticas locais) está pronta. A guerra é a Fase 6 (`docs/fase-6-guerra.md`).
- **Save:** `SAVE_VERSION = 13`.
- **Última atualização:** 2026-11-15.

## Facções (Fase 5): o que existe
Decisões e números completos em `docs/fase-5-facoes.md`. Código principal: `js/factions.js`, `js/flageditor.js`, `js/scenario.js`.
- **F0 rastreio de preços:** os efeitos somam em % (`priceOf` em `state.js`); cada item das lojas, a venda e as recompensas mostram o total com um "?" que explica. Buffs e debuffs de suprimento valem só para as **suas** cidades.
- **F1 / F1b identidade:** 2 a 4 facções NPC pela semente (`c.fid`), bandeiras, cores, uniformes e temperamento (pacífica, neutra, agressiva). Tela de criação antes do mundo (`?auto=1` pula; `&fac=1` força) e editor de bandeira em pixel art. Mastros nas entradas e na prefeitura.
- **F2 relações:** 0 a 10, seis status (aliado, favorável, neutro, desfavorável, inimiga, em guerra), preços por status, território inimigo, crime (queda de degrau), reparação (valor guardado = preço da paz), aliança paga (como ação do líder), declaração de guerra e pedido de reparação **como políticas** (fila no mesmo turno, nunca sorteadas), paz paga, soldados repostos quando a guerra começa. Invasão de cidade só em guerra.
- **F4:** doação de ouro (◉500 +1, ◉1000 +2; só a mais cara aparece se o ganho for igual) e de relíquia (+3) e rota comercial (+1) sobem a relação, cada uma gasta 1 ação do líder, 1 vez por rodada por facção; multiplicador de temperamento. Decaimento de 1 ponto em direção a 5 (2 rodadas; agressiva 3).
- **Caderno:** abas Bolsa, Livro (inclui **🏴 Facções**) e Mapa. Atalhos **B** (bolsa), **L** (livro), **M** (mapa); sem pedido explícito abre no Livro. O mapa ocupa as duas páginas.
- **Caravanas:** guardas são NPCs reais com ronda num círculo de 7 m, reagem a tiros (hostis até 38 m), não ressurgem se mortos pelo jogador, carroça com colisão, **saque** quando não sobra guarda (item do produto + ◉), carroças de rotas desfeitas ficam até o fim do turno do comandante. Uma caravana por cidade (vale para NPC). Caravanas de Desfavorável para cima.
- **Rodada 0 (preparação):** começa no turno do líder, sem decisões; cidade contente, sem facções/missões/portais; máx. 5 acampamentos e 5 baús soltos (a rodada 1 devolve tudo). Ver `docs/fase-4-testes.md`.
- **Missões (passo 2):** `js/missions.js`. Cidade: nível × 2 por rodada na prefeitura, várias aceitas, recompensa em ouro/recursos/mista. Facção: no máx. 2 ofertas a cada 3 rodadas (não em guerra), entregas e relatórios feitos na prefeitura do alvo, aceitar = 1 ação do líder, falha no fim da rodada (−1 relação), +1 relação ao cumprir (máx. +2 por facção por rodada). Tipos: acampamento, refém, pacote, matilha, entregar recurso, entregar relíquia. Aba **📋 Missões** no livro, mapa em popup, uma missão ativa. Detalhes em `docs/fase-5-facoes.md`.
- **F3 (relações entre as facções NPC, `js/facgraph.js`):** grafo por semente (temperamento + vizinhança), propagação fixa ±1 das suas ações para aliadas/rivais, deriva, caravanas entre NPC (uma por rodada: necessidades → aliança → relações) e aba 🕊 Diplomacia (diagrama de cordas). Relatório da propagação no modo criativo. Detalhes em `docs/fase-5-facoes.md`.
- **Modo criativo:** pausa → aba **🏴 Facções** muda o status de cada facção; no livro há botões de relação. **Cenário controlado:** `index.html?cenario=caravanas` (3 rotas: aliada, favorável, neutra; botões "Ir até a caravana" na mesma aba).

## Pendências e problemas conhecidos
- **Missões:** falta jogar de verdade (só testado por script) e ajustar números (`MS` em `missions.js`). Proteger caravanas e resgatar cidadãos ainda não são tipos de missão.
- **F5:** NPC mudam de relação entre si por rodada; depois eventos globais e reuniões. **Fase 6:** guerra completa (frente, ondas, economia, paz por andamento, recusa de paz da agressiva).
- **Facção destruída:** a cor volta a ficar livre, mas não está tratado de ponta a ponta; falta a nova facção criada por rebelião.
- **Aliado que sofre crime** vira neutro com reparação pendente e nenhuma política cobre esse caso.
- **Não visto na tela, só por script:** guardas de caravana patrulhando e atirando; mastro da prefeitura (só confirmado por teste); o jogo normal sem criativo. Vale jogar e conferir.
- **Pacotão de correções:** ver `docs/futuras-correcoes.md` (portal dourado durante batalha, lojas durante invasão, árvores com folhas opacas, NPCs presos nas folhas, balanceamento das raids).
- **Raid fácil demais:** o jogador venceu as 3 ondas com a arma inicial e ◉100 de cura nos intervalos. Ideias (nada implementado): 1) cura limitada no raid; 2) composição por onda; 3) escalar com a rodada e o nível da cidade; 4) cura mais cara durante o raid; 5) onda chefe, flanco, ameaça ao armazém. As duas últimas mudanças de raid (serviços fechados durante a onda; bandidos não perseguem civis) **ainda não foram testadas no jogo**.
- Efeitos do humor nos níveis 0 e −1 ainda são iguais aos do nível 1.
- Não testado em tempo real: a luta entre as tropas na disputa do portal dourado.
- Balanceamento da economia (`ECON`) e dos números das facções (`ECON.ally`, `FAC_*`, `REL_REP`) depende de teste jogando.

## Próximo passo sugerido
1. Pacotão de correções (`docs/futuras-correcoes.md`), depois a F5.

Roteiro rápido para ver o estado atual: `index.html?cenario=caravanas&mute=1` (caravanas e relações) e `index.html?auto=1&mute=1&seed=11` (modo criativo normal).

## Como trabalhamos entre PCs
Conversas locais ficam salvas só no PC onde ocorreram; o contexto viaja por este arquivo, pelo `CLAUDE.md` e por `docs/`. Antes de trocar de PC: `/encerrar-sessao` (commita e envia). No outro PC: `git pull` na `factions-update`.
