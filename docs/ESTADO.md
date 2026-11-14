# Estado do projeto

Arquivo de passagem entre sessões e entre computadores. **Leia no início de cada sessão; atualize no fim** (skill `/encerrar-sessao`, em `docs/skills/`).
Mantenha curto: o histórico detalhado das regras fica em `docs/fase-4-testes.md`.

## Resumo
- **Branch de trabalho:** `factions-update`
- **Fase atual:** 4 (rodadas, prefeitura, livro, caravanas, políticas locais). As 10 políticas locais já estão implementadas.
- **Save:** `SAVE_VERSION = 11`.
- **Última atualização:** 2026-11-13 (sessão na nuvem).

## Feito recentemente
- Raids: durante uma onda (bandidos vivos), os serviços da cidade atacada ficam fechados (loja, quartel, clínica, armazém, taverna, fogão, prefeitura) e a opção `[E]` nem aparece; abrem no intervalo de 30 s entre as ondas. Janela de serviço aberta fecha quando a onda chega. (`raidLocked` em `js/raids.js`, `updateInteract`/`doInteract` em `js/game.js`.)
- Raids: bandidos não perseguem mais civis. Antes, a mais de 14 m do jogador eles miravam nos cidadãos, o que permitia se esconder e eliminá-los aos poucos. Agora vão sempre atrás do jogador e dos soldados (`pickTarget` em `js/allies.js`). Animais (bandos) continuam disputando civis.
- Criados `CLAUDE.md`, este arquivo e a skill `/encerrar-sessao`.

## Pendências e problemas conhecidos
- **Raid fácil demais:** o jogador venceu as 3 ondas com a arma inicial e ◉100 de cura nos intervalos. Ideias discutidas (nada implementado), em ordem de recomendação:
  1. Cura limitada no raid (clínica cura só parte da vida ou com cooldown; intervalo menor nas ondas finais).
  2. Composição por onda (onda 2 com brutos, onda 3 com atiradores/brutos, usando tipos já existentes).
  3. Escalar o raid com a rodada e o nível da cidade (mais bandidos por lado, mais vida).
  4. Cura mais cara durante o raid (×2 ou ×3).
  5. Onda chefe (golem) na onda 3; flanco por portão não vigiado; ameaça ao armazém/prefeitura; mostrar poder recomendado no cartão.
- Efeitos do humor nos níveis 0 e −1 ainda são iguais aos do nível 1 (a mudar depois).
- Não testado em tempo real: a luta entre as tropas na disputa do portal dourado.
- Balanceamento da economia (`ECON`) depende de teste jogando: se faltar tempo para suprir 4+ cidades, aumente a produção; se sobrar ouro, diminua o imposto ou suba os preços.
- As duas últimas mudanças de raid foram só verificadas por sintaxe, **ainda não testadas no jogo**.

## Facções (Fase 5)
Decisões em `docs/fase-5-facoes.md`; correções anotadas em `docs/futuras-correcoes.md`. Guerra fica na Fase 6 (`docs/fase-6-guerra.md`).
- **F0 feita:** valores decididos e rastreio de preços (efeitos somam em %, indicador "?" dentro da caixa de cada item, na venda e nas recompensas).
- **F1 feita:** facções NPC pela semente, `c.fid`, bandeiras/uniformes/mapa com a cor da facção, `SAVE_VERSION = 10`. Falta testar jogando mais (conquista, save/load).
- **F1b feita:** tela de criação antes do mundo, editor de bandeira (`js/flageditor.js`), aba Facções no livro, mapa com hover, bandeiras nas entradas e na prefeitura.
- **F2 feita:** relações 0 a 10 com 6 status (aliado, favorável, neutro, desfavorável, inimiga, em guerra), preços por status, entrar em território inimigo, crime e reparação, aliança e guerra, `SAVE_VERSION = 11`. Invasão só em guerra.
- **F4 feita:** doação de ouro/relíquia e rota comercial sobem a relação (cada uma gasta 1 ação do líder), decaimento em direção a 5.
- **Mapa no caderno:** o mapa grande virou a aba **🗺 Mapa** do caderno (Bolsa, Livro, Mapa). **M** abre o caderno nessa aba (com o caderno aberto troca para o mapa; no mapa, fecha). A escolha de origem e destino da caravana também acontece ali. A tela de mapa antiga foi removida.
- **Próximo:** F3 (relações entre as facções NPC) e missões do líder (sobem a relação).

## Próximo passo sugerido
Testar no navegador as duas mudanças de raid (roteiro abaixo) e, depois, implementar a dificuldade do raid (pendência 1 a 3 acima).

Roteiro rápido: `index.html?auto=1&mute=1&seed=11` → Continuar → pausa (Tab) → aba Rodadas → ir ao escritório do líder → Invocar evento "Raid de bandidos" → opção A. Conferir: sem `[E]` nos serviços durante a onda, serviços de volta no intervalo, bandidos indo atrás de você mesmo quando você se esconde.

## Como trabalhamos entre PCs
Conversas locais ficam salvas só no PC onde ocorreram; o contexto viaja por este arquivo, pelo `CLAUDE.md` e por `docs/`. Antes de trocar de PC: `/encerrar-sessao` (commita e envia). No outro PC: `git pull` na `factions-update`.
