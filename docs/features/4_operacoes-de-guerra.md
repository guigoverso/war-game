# Operações de guerra: tarefas

Origem: item 5 (e partes do 6 e do 10) de `docs/fase-6-guerra.md`. Desenho fechado com o usuário em 2026-11-22. Depende da frente da guerra (`docs/features/3_frente-da-guerra.md`, feita): usa `warFrontLine`, `warFrontReleased` e `warFrontCanConquer` de `js/warfront.js`.
**Resumo:** no turno do Líder o jogador gasta **pontos de líder** em operações (por ora só **Ataque** a POI ativo; Defesa, Sabotagem e Outros ficam prontos na estrutura, desativados). No turno do Comandante ele cumpre no mapa o que lançou. O que não for cumprido vira falha. Tudo aparece na aba **Guerra** do livro, com um **log narrativo** da guerra.

## Regras decididas (do usuário)
- **Pontos:** são as ações do líder já existentes (`STATE.rd.actions`, teto `maxActions()`). Em guerra o teto soma `WAR.leaderPointsBonus` (+1). Evoluir facção ou cidade gasta do mesmo pool.
- **Custos:** ataque a POI 1 ponto; **ataque à cidade 2 pontos** (fixo). A cidade só é atacável com o POI mais perto da sua cidade e o mais perto da cidade inimiga já seus, **de antes** (nunca na mesma rodada) e nunca em cadeia. A operação da cidade existe mas fica desativada até a batalha final (item 9).
- **Autoexcludentes:** nenhuma. Só: não repetir a mesma operação no mesmo alvo e o teto de ataques por rodada (`WAR.maxAttacksPerRound`, padrão 2).
- **Anexação automática:** todo POI conquistado **da trilha** (inclusive de bandidos) é anexado na hora, sem o cartão "Terras livres". Só POI fora da trilha libera o cartão.
- **Ataque encadeado (até 2 por rodada):** um POI é atacável se for adjacente a um POI seu **ou ao alvo de outra operação de ataque lançada na rodada**. A segunda nasce `aguarda` e vira `ativa` quando o POI anterior troca de dono. Se a primeira falhar, a segunda também falha e o ponto não volta.
- **Fadiga:** cada ataque soma `attackPoi` (2) e o **segundo ataque da rodada** soma `attackExtra` (+1); falha de operação soma `opFailed`. Só acumulam em `STATE.war.fat`, sem efeito até o item 13.
- **Guarnição do alvo:** ao ficar `ativa`, o POI inimigo ganha no mínimo **10 soldados de tipos variados** (`WAR.garrisonMin`, reaproveitando a máquina da guarnição dos bandidos; tipos por nível da facção inimiga e distância). POI de bandidos já tem 10 ou mais.
- **Blindagem (substitui o ÷10 de dano):** só **em guerra**, POIs e cidades **da facção inimiga e da trilha** sem operação `ativa` não morrem (animação de acerto, vida nunca zera), nem pelo jogador, nem por bandidos ou animais. Vale para POI de bandidos no meio da trilha (só se toma por operação). O jogador continua levando ×10 dos guardas. Operação `aguarda` também fica blindada. Fora da guerra, nada muda.
- **Morte do jogador:** encerra o turno do Comandante (`respawn` já chama `endRound`); operações não cumpridas viram `falha`: ponto não volta, POI não muda, fadiga sobe, entra no log.
- **Aviso ao encerrar o turno do Líder:** em guerra, com pontos sobrando e nenhuma operação lançada, popup "Encerrar mesmo assim / Voltar".
- **Ordem da rodada:** início do turno do Líder mostra o resultado; o log recebe as entradas ao fechar a rodada.

## Aba Guerra do livro (`LB.tab === 'guerra'`, hoje `warBookPages` em `js/warfront.js`)
**Esquerda:** cabeçalho "Guerra contra [facção alvo]"; bandeira do jogador × bandeira da facção alvo; "Alvo: [cidade ou POI]" com botão de ver no mapa; botões **Resumo da guerra**, **Lançar operações**, **Territórios**.
**Direita, por botão:**
- **Resumo:** tabela de lados (nome do jogador × inimigo; aliado do jogador × aliado do inimigo), a **mesma da rebelião** (localizar no código e reaproveitar). Abaixo, o **log** por rodada, mais recente primeiro (`WAR.logMax`, padrão 30 rodadas).
- **Lançar operações:** "Operações lançadas" (botões descritivos, ex.: "Ataque à Fazenda contra Bandidos", abrem o resumo da operação) e "Operações disponíveis" com abas **Ataque | Defesa | Sabotagem | Outros**; cada operação é um botão habilitado ou não pelas regras acima (desativado mostra o motivo). Clicar abre um **popup de detalhes** (onde atacar, o que defender...); confirmar move a operação para "lançadas". A aba **Defesa** tem uma **bolinha vermelha** quando há ataque pendente (`STATE.war.inc`).
- **Territórios:** quatro blocos (jogador, aliado do jogador, facção alvo, aliado do inimigo) com cidades e POIs permanentes e botão de ver no mapa (reaproveita `G.poiFocus`). Território conquistado passa a aparecer no bloco do jogador na hora (a lista é calculada ao abrir). Sem ruínas e sem POIs de bandidos.

**Log narrativo (eventos):** resultado de operações do jogador, resultado de operações do inimigo, POI da trilha tomado por bandidos, eventos da guerra (aliado ou inimigo entrou ou saiu). `STATE.war.log` guarda `{round, id, args, result}` e o texto é montado na hora a partir de `WAR_EVENT_TEXTS` (assim editar a frase muda também as rodadas já registradas). Só os três primeiros têm emissor agora; "aliado entrou ou saiu" fica com texto e estrutura prontos (item 17).
**Textos:** todos em `js/texts/`: `war-event-texts.js` (frases do log, estrutura `WAR_EV` + `WAR_EVENT_TEXTS` + `warEventText(ev)`, com `success` / `failed` por evento) e `war-book-texts.js` (cabeçalhos, botões, abas, rótulos e os dois popups). Os `TXT_WAR_TAB_*` de `war-texts.js` migram para o novo arquivo.

## Regras gerais
- Só **acrescentar** campos em `STATE.war` (`ops`, `inc`, `fat` já existem; entra `log`). Conferir em `save.js` se basta `warApply`; senão somar `SAVE_VERSION` (hoje 22) e passo em `migrateSave`.
- Números em `WAR` (`war-modifiers.js`), textos em `js/texts/`, estilo denso, linhas até ~120 caracteres, português, LF. Não escrever sobrescritas de funções de outros arquivos.
- **Avisos na tela** (listar para validar): popup de pontos sobrando, popup de detalhes da operação, toast de operação lançada/cancelada, toast de "território proibido", bolinha de defesa. Resultados de operação vão ao log e ao relatório (`rdNow`), sem toast.
- Terminar cada tarefa com `node tests/smoke.js` e atualizar `docs/MAPA.md` ao criar função, arquivo ou modificador. Regras e como testar entram em `docs/fase-4-testes.md` e `docs/fase-6-guerra.md`.

## Ordem

| # | Tarefa | Tam. | Sessão |
|---|---|---|---|
| 1 | **Fundação:** números em `WAR`, estado (`ops`, `log`), `maxActions()` com o bônus de guerra, `WAR.ops`, e os dois arquivos de texto com a estrutura do log | M | **Nova** (contexto limpo; brief cita este arquivo) |
| 2 | **Lógica das operações** (`js/warops.js`): elegibilidade, cadeia, teto, planejar/cancelar, estados e ativação pela troca de dono, anexação automática da trilha | G | **Continua da 1:** usa os nomes e números recém-criados |
| 3 | **Aba Guerra do livro:** as três páginas, abas de operação, popup de detalhes, bolinha de defesa, popup de aviso | G | **Nova:** é interface, testada na tela com o navegador |
| 4 | **Execução no turno do Comandante:** guarnição de 10+, blindagem, aviso de território proibido, conclusão da operação ao limpar | G | **Nova:** é a parte de combate e mexe em `entities`/`poigame`; contexto limpo evita misturar com a interface |
| 5 | **Fechamento da rodada:** falhas (inclusive por morte), fadiga, entradas do log, retomada por bandidos de POI da trilha no log, relatório | M | **Continua da 4:** usa o estado das operações e da blindagem |
| 6 | **Cenário, smoke e documentação:** `?cenario=guerra` com operações, `tests/smoke.js`, `docs/MAPA.md`, `docs/fase-4-testes.md`, `docs/fase-6-guerra.md` | P | **Continua da 5:** fechamento, precisa de tudo no contexto |

## Tarefa 1: fundação
- **O que fazer:** em `war-modifiers.js`: `opCost.city` = 2; `maxAttacksPerRound` (2); `garrisonMin` (10); `fatigue.gain.attackExtra` (1) e `opFailed`; `logMax` (30); tabela `ops` por tipo (`attack` ativo; `defense`, `sabotage`, `reduceFatigue` desativados com o motivo). `forbiddenFactor` e `majority` ficam, com comentário do novo uso. Em `war.js`: `log` em `warNew`, `warLog(id, args, result)`. `maxActions()` (`js/econ.js`) soma `WAR.leaderPointsBonus` quando `warActive()`. Em `js/texts/`: `war-event-texts.js` e `war-book-texts.js` (esqueleto com os textos já conhecidos), com a linha `<script>` em `index.html`. Remover o uso de `pts`.
- **Como testar:** console: `warLog('attackPoi', ['A','B','Fazenda'], 'success')`, `warEventText(...)`; com guerra, `maxActions()` sobe 1; carregar e salvar mantém o log.
- **Sessão nova:** a conversa atual é longa e de desenho; o brief só precisa deste arquivo.

## Tarefa 2: lógica das operações
- **O que fazer:** `js/warops.js` (depois de `warfront.js` no `index.html`): `warOpCanAttack(fid, p)`, `warOpPlan`, `warOpCancel`, `warOpCost`, estados `aguarda | ativa | ok | falha`, ativação da dependente num gancho de `poiSetOwner`, anexação automática dos POIs da trilha (sem cartão "Terras livres"), operação da cidade registrada e desativada.
- **Como testar:** `?cenario=guerra&auto=1&mute=1`: planejar 2 ataques encadeados (a segunda `aguarda`), conquistar o primeiro com o painel e ver a segunda virar `ativa`; tentar o 3º ataque, repetir alvo e atacar POI não adjacente (todos recusados); cancelar devolve o ponto.
- **Continua da 1:** usa os números e nomes criados lá.

## Tarefa 3: aba Guerra do livro
- **O que fazer:** reescrever `warBookPages` (hoje em `js/warfront.js`; mover para `js/warbook.js`, novo) com Resumo, Operações e Territórios; estado da navegação em `LB`; reaproveitar a tabela de lados da rebelião; popup de detalhes (`op.pick` de `policies.js` como modelo); popup de aviso em `finishLeaderTurn`; bolinha de defesa; botões "ver no mapa" (`G.poiFocus` e foco de cidade).
- **Como testar:** `?cenario=guerra&auto=1&mute=1`, turno do Líder: lançar um ataque, ver o botão descritivo, abrir o resumo; encerrar o turno sem operação e com pontos (popup); `STATE.war.inc.push(...)` mostra a bolinha; conquistar um POI e vê-lo em Territórios do jogador. Verificar no navegador com captura de tela.
- **Nova:** é interface, independente da lógica e testada visualmente.

## Tarefa 4: execução no turno do Comandante
- **O que fazer:** ao iniciar o turno, POIs com operação `ativa` ganham guarnição de `WAR.garrisonMin` ou mais (`poiGarrisonSync`, `kind:'poi'`); `warBlindado(alvo)` (guerra, facção inimiga e trilha, sem operação ativa) no caminho do dano (`damageEnemy` e guardas): animação sem morte; aviso "território proibido" e ×10 dos guardas ao jogador; limpar a guarnição conclui a operação (`ok`), anexa o POI e ativa a dependente.
- **Como testar:** `?cenario=guerra`: atacar guarda de POI sem operação (não morre, aparece aviso), lançar a operação e ver 10+ soldados variados; limpar e ver o POI virar seu; guardas atiram ×10.
- **Nova:** mexe em combate e entidades; contexto limpo.

## Tarefa 5: fechamento da rodada
- **O que fazer:** no início do turno do Líder (depois de `endRound`, inclusive o chamado por `respawn`), operações não cumpridas viram `falha` (fadiga `opFailed`, dependente também falha); entradas no log (resultado de operação do jogador e do inimigo, retomada por bandidos de POI da trilha); linha no relatório (`rdNow`); fadiga do ataque duplo.
- **Como testar:** lançar 2 ataques, morrer no primeiro (as duas falham, log narrativo, fadiga sobe); cumprir um e deixar outro (um `ok`, um `falha`); encerrar a rodada duas vezes com bandidos retomando POI da trilha.
- **Continua da 4:** usa o estado das operações e da blindagem.

## Tarefa 6: cenário, smoke e documentação
- **O que fazer:** painel do `?cenario=guerra` com operações no lugar do "Conquistar POI"; smoke: encadeamento, teto, anexação automática, blindagem, falha por morte, log e popup de aviso; atualizar `docs/MAPA.md`, `docs/fase-4-testes.md`, `docs/fase-6-guerra.md` (itens 5, 6 parcial e 10 parcial); rodar `/encerrar-sessao`.
- **Continua da 5:** fechamento.

## Fora desta feature (ficam para os itens seguintes)
Defesa reativa e ataques do inimigo (item 11), IA por temperamento (12), fadiga com efeitos e derrota (13), logística (14), espiões e sabotagem (15 e 16), aliados nas batalhas (17 e 18), batalha final da cidade (9), cabo de guerra (7) e fim da guerra (19). Para os desativados, a estrutura (`WAR.ops`, aba, popup, `STATE.war.inc`) já existe.
