# Fronteira Cúbica (war-game)

Jogo de guerra e economia em voxels, no navegador (Three.js r128 via CDN). Sem build, sem dependências locais: `index.html` carrega os scripts de `js/` na ordem listada no fim do arquivo. Tudo é JS "global" (sem módulos): as funções e constantes são compartilhadas entre arquivos.

## Antes de começar qualquer sessão
1. Leia **`docs/ESTADO.md`**: o que foi feito por último, o que está pendente e o que fazer em seguida.
2. Rode `git pull` na branch de trabalho antes de editar (o usuário alterna entre PCs; o GitHub é a ponte).
3. Ao terminar, rode a skill **`/encerrar-sessao`** (ver `docs/skills/`): ela atualiza `docs/ESTADO.md`, commita e envia.

## Como rodar e testar
- Abra `index.html` (de preferência por um servidor estático: `python3 -m http.server 8000`).
- Parâmetros de URL: `?auto=1` (modo criativo, com truques de teste), `?auto=normal`, `?mute=1` (sem som), `?seed=11` (semente do mundo), `?bio=N` (bioma), `?load=1` (carrega o espaço de save 1).
- Modo criativo: pausa (Tab/O/Esc) tem abas de teste. Na aba **Rodadas**, "Invocar evento" dispara uma política específica no turno do Líder.
- Os roteiros de teste de cada fase estão em `docs/fase-N-testes.md`. **`docs/fase-4-testes.md` é o mais completo e atual** (regras de rodadas, economia, políticas, raids).
- Não há suíte de testes automática. Testar = jogar no navegador (ou script com Playwright).

## Mapa do código (`js/`)
- Mundo/render: `util`, `render`, `voxel`, `phys`, `world` (geração por semente), `city` (cidades e prédios), `nav`.
- Entidades: `entities` (NPCs, inimigos, IA), `allies` (soldados do jogador, escolha de alvo `pickTarget`), `weapons`, `ambient`.
- Jogo: `game` (laço principal, entrada, interação `doInteract`/`updateInteract`, painéis), `state` (STATE serializável, Ledger de recursos, Hooks), `save` (salvar/carregar com versão).
- Sistemas: `rounds` (rodadas, economia — números em `ECON`), `policies` (política locais/eventos), `raids` (raids em ondas e emboscada de caravana), `warehouse` (armazém), `store`/`inventory`/`cooking`/`fishing`, `quests`, `dungeon`, `poi`, `data` (tabelas de itens e loot).

## Convenções importantes
- **Fim de linha: os arquivos `.js` e `index.html` usam CRLF.** Ao editar por script, preserve CRLF (um `read/write` em modo texto no Python converte para LF e o diff mostra o arquivo inteiro alterado). Confira com `git diff --stat` depois de editar: só as linhas mudadas devem aparecer. Os `.md` de `docs/` usam LF.
- Estilo do código: denso, uma função por bloco, comentários curtos em português explicando o "porquê". Mantenha esse estilo.
- Textos do jogo, comentários e docs em **português do Brasil**.
- Estado que precisa sobreviver ao salvar fica em `STATE` (JSON puro). Se a mudança altera o estado salvo: some 1 a `SAVE_VERSION` (`js/state.js`), acrescente um passo `if(d.v<N)` em `migrateSave` (`js/save.js`) e só **acrescente** campos (ausentes = padrão).
- Números de balanceamento ficam juntos: economia em `ECON` (`js/rounds.js`), políticas em `POL` (`js/policies.js`), raids em `RAID_WAVES`/`RAID_GAP` (`js/raids.js`). Ajuste ali em vez de espalhar constantes.
- Ao concluir uma mudança de regra, documente-a na seção da fase em `docs/fase-4-testes.md` (regra + como testar), como já é feito.

## Conceitos do jogo (resumo; detalhes em `docs/fase-4-testes.md`)
- **Rodadas:** rodada 0 é preparação. A partir da 1, cada rodada tem o **turno do Líder** (escritório: livro de decisões, caravanas, porto, evoluir cidade, política sorteada) e o **turno do Comandante** (buscar e entregar suprimentos, combate, recrutar).
- **Suprimentos:** comida, minério, madeira e couro (itens 1 para 1). Cada cidade tem necessidades sorteadas por rodada (100/150/200%). Faltar gera debuffs, humor "descontente" e, depois de 4 rodadas seguidas, rebelião (a capital não se rebela). Armazém e cofre são compartilhados entre as cidades suas.
- **Políticas locais:** 10 eventos com 3 opções (A/B/C), 30% de chance por rodada; os efeitos duram só a rodada (`POL.dur=1`).
- **Raids:** 3 ondas (5, 10 e 15 bandidos) com 30 s de intervalo. Durante uma onda os serviços da cidade ficam fechados; bandidos vão sempre atrás do jogador e dos soldados (não perseguem civis).

## Git
- Branch de trabalho atual: **`factions-update`**. Não faça push em outra branch sem o usuário pedir. Não crie pull request sem pedido.
- Commits em português, descrevendo o "o quê" e o "porquê" em poucas linhas.
