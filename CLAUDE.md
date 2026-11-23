# Fronteira Cúbica (war-game)

Jogo de guerra e economia em voxels, no navegador (Three.js r128 via CDN). Sem build, sem dependências locais: `index.html` carrega os scripts de `js/` na ordem listada no fim do arquivo. Tudo é JS "global" (sem módulos): as funções e constantes são compartilhadas entre arquivos.

## Antes de começar qualquer sessão
1. Leia as seções relevantes do **`docs/ESTADO.md`** (o que foi feito por último, o que está pendente e o que fazer em seguida) e consulte **`docs/MAPA.md`** para achar arquivos, funções, UIs, ganchos e números de balanceamento sem varrer o código.
2. Rode `git pull` na branch de trabalho antes de editar (o usuário alterna entre PCs; o GitHub é a ponte).
3. Ao terminar, rode a skill **`/encerrar-sessao`** (ver `docs/skills/`): ela atualiza `docs/ESTADO.md`, commita e envia.

## Antes e durante as implementações
Consulte **`docs/MAPA.md` para achar arquivos, funções, UIs, ganchos e números de balanceamento sem varrer o código.

## Editar código
Ao editar código: mantenha novas funções com linhas de até ~120 caracteres e quebre expressões longas em várias linhas; não escreva sobrescritas de funções de outros arquivos (edite a definição original); consulte docs/MAPA.md antes de buscar no código.

## Como rodar e testar
- Abra `index.html` (de preferência por um servidor estático: `python3 -m http.server 8000`).
- Parâmetros de URL: `?auto=1` (modo criativo, com truques de teste), `?auto=normal`, `?mute=1` (sem som), `?seed=11` (semente do mundo), `?bio=N` (bioma), `?load=1` (carrega o espaço de save 1). `?cenario=caravanas` abre um cenário controlado de caravanas e facções (ver `docs/fase-5-facoes.md`). `?cenario=pois` abre o mapa manual com todos os POIs da Fase 6 (mundo plano; ver `docs/fase-6-guerra.md`). `?w=640` usa o mapa antigo (o padrão é 704). `?cid=N` força o número de cidades (o padrão é proporcional à terra, de 6 a 8).
- Modo criativo: pausa (Tab/O/Esc) tem abas de teste. Na aba **Rodadas**, "Invocar evento" dispara uma política específica no turno do Líder.
- Os roteiros de teste de cada fase estão em `docs/fase-N-testes.md`. **`docs/fase-4-testes.md` é o mais completo e atual** (regras de rodadas, economia, políticas, raids).
- Não há suíte de testes automática completa. Testar = jogar no navegador.
- Teste de fumaça (Node + Playwright, só para desenvolvimento): na primeira vez `cd tests && npm install && npx playwright install chromium`; depois `node tests/smoke.js`.
  Ele abre `?auto=1&mute=1&seed=11` e `?cenario=pois&auto=1&mute=1` e imprime OK/FALHA para carga sem erros, POIs, serviços, binóculo, moradores e Negociação.

## Mapa do código (`js/`)
- Pastas (etapa 2 do mapa mundi): `js/core`, `js/macro` (sem Three.js/DOM; teste `node tests/macro/run.js`), `js/local`, `js/ui`; o que mistura camadas segue na raiz de `js/`. Lista por pasta em `docs/MAPA.md`; a ordem de carga é a do `index.html`.
- Mundo/render: `util`, `modifiers/` (constantes e regras ajustáveis pelo usuário, por categoria), `texts/` (textos do jogo, por categoria), `render`, `voxel`, `phys`, `world` (geração por semente), `city` (cidades e prédios), `nav`.
- Entidades: `entities` (NPCs, inimigos, IA), `allies` (soldados do jogador, escolha de alvo `pickTarget`), `weapons`, `ambient`.
- Jogo: `game` (laço principal, entrada, interação `doInteract`/`updateInteract`, painéis), `state` (STATE serializável, Ledger de recursos, Hooks), `save` (salvar/carregar com versão).
- Sistemas: `econ` (economia — números em `ECON`), `rounds` (rodadas), `policies` (política locais/eventos), `raids` (raids em ondas e emboscada de caravana), `warehouse` (armazém), `store`/`inventory`/`cooking`/`fishing`, `quests`, `dungeon`, `poi`, `data` (tabelas de itens e loot).

## Convenções importantes
- **Fim de linha: todos os arquivos usam LF** (garantido por `.gitattributes` e `.editorconfig`). Confira com `git diff --stat` depois de editar: só as linhas mudadas devem aparecer.
- Estilo do código: denso, uma função por bloco, comentários curtos em português explicando o "porquê". Mantenha esse estilo.
- Textos do jogo, comentários e docs em **português do Brasil**.
- Estado que precisa sobreviver ao salvar fica em `STATE` (JSON puro). Se a mudança altera o estado salvo: some 1 a `SAVE_VERSION` (`js/state.js`), acrescente um passo `if(d.v<N)` em `migrateSave` (`js/save.js`) e só **acrescente** campos (ausentes = padrão).
- **Modificadores (pasta `js/modifiers/`, um arquivo por categoria):** todo número de balanceamento e toda regra pequena de decisão (ex.: `canWatch(n)` que compara com `MAX_WATCH_PER_TOWER`) **novos** vão para o arquivo da categoria: `poi-modifiers.js`, `city-modifiers.js`, `raid-modifiers.js`, `faction-modifiers.js`, `economy-modifiers.js`, `policy-modifiers.js` e `war-modifiers.js` (objeto `WAR`). Categoria nova = arquivo novo `<categoria>-modifiers.js` e uma linha `<script>` no `index.html`, junto dos outros (todos carregam antes dos demais scripts de `js/`). Nomes descritivos em MAIÚSCULAS (constantes); você decide quais criar, salvo se o usuário pedir um específico. Cada um leva um comentário acima com **para que serve e o valor padrão**. O restante do código só consulta o modificador (nada de número solto na lógica), para o usuário ajustar sem pedir. Não migre os modificadores antigos (`ECON`, `POL`, `POIX`, ...) a menos que seja pedido. Atualize o `docs/MAPA.md` ao criar um.
- **Textos (pasta `js/texts/`, um arquivo por categoria):** toda mensagem nova (toast, relatório da rodada via `rdNow`, cartão, texto de livro) e toda função que monta texto (string com nome ou número no meio) vão para o arquivo da categoria: `poi-texts.js`, `city-texts.js`, `faction-texts.js`, `economy-texts.js`, `policy-texts.js` e `war-texts.js`. Categoria nova = arquivo novo `<categoria>-texts.js` e uma linha `<script>` no `index.html`. Constante ou função com nome descritivo, em português do Brasil, com um comentário acima dizendo **onde aparece e para que serve**. O restante do código só chama o texto (nada de string solta na lógica), para o usuário ajustar sem pedir. Não migre os textos antigos a menos que seja pedido. Atualize o `docs/MAPA.md` ao criar um.
- Números de balanceamento (antigos) ficam juntos: economia em `ECON` (`js/econ.js`), políticas em `POL` (`js/policies.js`), raids em `RAID_WAVES`/`RAID_GAP` (`js/raids.js`). Ajuste ali em vez de espalhar constantes.
- Ao concluir uma mudança de regra, documente-a na seção da fase em `docs/fase-4-testes.md` (regra + como testar), como já é feito.

## Conceitos do jogo (onde ler)
Cada rodada (a partir da 1; a 0 é preparação) tem o **turno do Líder** (decisões no escritório) e o **turno do Comandante** (suprimentos, combate). Regras e números ficam nos docs, não aqui:
- Rodadas, suprimentos, humor, políticas e raids: `docs/fase-4-testes.md` e `docs/politicas-locais.md`.
- Facções, relações, missões, rebelião, eventos, reuniões: `docs/fase-5-*.md`.
- Guerra e POIs: `docs/fase-6-guerra.md`. Ideias soltas: `docs/ideias-e-design.md`.

## Como responder
- **Notificações (toast, aviso na tela, relatório da rodada):** nenhuma notificação nova entra sem aprovação do usuário. Antes de criar, diga qual é o **gatilho** e qual é a **mensagem** e espere a aprovação; sem ela, a ação fica silenciosa.
- Quando o usuário perguntar se algo é possível ("tem como...?", "dá para...?"), responda com uma **previsão** (viabilidade, como ficaria, custo e riscos) e **não implemente** até ele pedir.

## Git
- Branch de trabalho atual: **`factions-update`**. Não faça push em outra branch sem o usuário pedir. Não crie pull request sem pedido.
- Commits em português, descrevendo o "o quê" e o "porquê" em poucas linhas.
