# Estado do projeto

Arquivo de passagem entre sessões e entre computadores. **Leia no início de cada sessão; atualize no fim** (skill `/encerrar-sessao`, em `docs/skills/`).
Mantenha curto: o histórico detalhado das regras fica em `docs/fase-4-testes.md`.

## Resumo
- **Branch de trabalho:** `factions-update`
- **Fase atual:** 4 (rodadas, prefeitura, livro, caravanas, políticas locais). As 10 políticas locais já estão implementadas.
- **Save:** `SAVE_VERSION = 9`.
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

## Próximo passo sugerido
Testar no navegador as duas mudanças de raid (roteiro abaixo) e, depois, implementar a dificuldade do raid (pendência 1 a 3 acima).

Roteiro rápido: `index.html?auto=1&mute=1&seed=11` → Continuar → pausa (Tab) → aba Rodadas → ir ao escritório do líder → Invocar evento "Raid de bandidos" → opção A. Conferir: sem `[E]` nos serviços durante a onda, serviços de volta no intervalo, bandidos indo atrás de você mesmo quando você se esconde.

## Como trabalhamos entre PCs
Conversas locais ficam salvas só no PC onde ocorreram; o contexto viaja por este arquivo, pelo `CLAUDE.md` e por `docs/`. Antes de trocar de PC: `/encerrar-sessao` (commita e envia). No outro PC: `git pull` na `factions-update`.
