# F5b — Reuniões das facções (desenho do usuário)

Referências antigas: `docs/ideias-e-design.md` (seções 16, 17 e 19). **Este arquivo manda onde houver conflito.** Código: `js/meeting.js` (sala, líderes, conversa, votação, fluxo) e `js/meetfx.js` (as 12 propostas e os efeitos). Save v17 (`STATE.meet`).

## Gatilho e fluxo
- A cada **5 rodadas** (turno do líder). Aparece como um **cartão de política** com **uma única opção: "Ir para a reunião"**.
- **O turno do líder só pode ser encerrado depois de resolver a reunião.**
- Ao fim da votação o jogador **volta à sala do líder**.

## A sala (cenário próprio)
- Sala com **mesa redonda**. Em cada lugar, o **líder de uma facção** com roupa nas cores dela e **guardas** dela (inclusive os do jogador). Facções novas (rebelião) ganham lugar e voto; facções que deixaram de existir não votam.
- **NPCs diversificados** (não um modelo único); o jogo **guarda o modelo** de cada líder para as próximas reuniões (salvar no `STATE`).
- Os líderes ficam em pé, **andando pela sala**, até o início da votação.

## Etapa 1: o tema
- Uma **mesa no canto com um livro**: o jogador escolhe a proposta (tema) que irá à votação (sorteio de 3 entre as 12).

## Etapa 2: negociar
- O jogador anda pela sala e **fala com os líderes**. Ao clicar abre uma **caixa de diálogo centralizada na parte de baixo da tela**, com uma fala do líder que vai de **agressiva a receptiva** conforme a relação.
- Ali o jogador **negocia votos**. **Votos são caros**. A negociação mostra **quantos votos** o líder vale. **Não há negociação com facções inimigas ou em guerra.**
- Na mesa do jogador há o **livro** (o mesmo livro do líder).

## Etapa 3: votar
- O jogador clica na **sua cadeira** e senta; os NPCs andam até suas cadeiras e sentam. Abre a **tela de votação** e o jogador vota.
- **Aprovar e reprovar têm, cada um, seus buffs e debuffs** (para o jogador nem sempre querer aprovar).
- **Peso do voto dos NPCs:** compra de votos, aliança, se a proposta os beneficia ou prejudica, relação.
- **Só ouro** para comprar apoio (não gasta ação).
- Os **efeitos duram 5 rodadas**. Não precisa explicar tudo isso no jogo: o importante são os buffs e debuffs.

## F5c (a anotar para depois): eventos globais
Eventos que afetam uma ou mais facções e em que **o jogador pode intervir** (ex.: Grande chuva, Colheita farta, Sequestro de uma pessoa importante; ver seção 16 de `ideias-e-design.md`). Vêm numa **etapa depois** das reuniões.

## Decisões fechadas (resposta às dúvidas)
- Só a sua proposta vai à votação (as NPC não propõem). Empate **reprova**. O efeito vale para **todas** as facções (e soma com políticas locais); dura 5 rodadas e é **substituído** pelo da próxima reunião.
- Facções inimigas e em guerra ficam na sala, votam, mas não negociam. Dica de postura do líder (a favor / indeciso / contra), nunca o voto exato: **a favor é mais barato, contra mais caro**. Aliada: "não é necessário comprar o meu voto".
- **Só ouro** (sem ação do líder). Votos caros: `MEET.price` (◉600) × peso (nº de cidades) × relação × postura × prejuízo (`meetPrice`).
- Voto das NPC (`meetScore`): compra (+10) + aliança (+2,5) + benefício/prejuízo da proposta (−2 a +2) + relação ((v−5)/2,5); a favor se > 0. Peso = nº de cidades. Vota quem ainda existe (facções novas votam).
- Depois da votação: quem votou como você sobe (+1), quem votou contra desce (−1; −1 a mais se a proposta o prejudica muito e você aprovou).

## Como está implementado
- **Cartão** `reuniao` (rodadas 5, 10, 15...; `meetDue`): uma opção, "Ir para a reunião". O turno do líder só termina depois (`finishLeaderTurn` reapresenta o cartão).
- **Sala** (`genMeetHall`): região do escritório, mundo de baixo (`DG.rx+58, DG.rz+75`, 32×19). Mesa redonda, mesa do canto com o livro do tema, uma cadeira na cor de cada facção e 2 guardas por facção (os seus incluídos). Líderes com visual diverso, **sorteado uma vez e salvo** (`STATE.meet.models`); andam em círculo até você sentar.
- **Fluxo:** livro do canto (3 propostas sorteadas, `meetDraw`) → conversar (E, caixa de diálogo centralizada embaixo) e comprar votos → sentar na sua cadeira (E) → os líderes sentam → votação → resultado → volta ao escritório. O livro do líder abre perto da sua cadeira.
- **As 12 propostas** (`MPROPS`): Livre-comércio, Valorização, Guilda Mercantil, Guarda Unificada, Festival Continental, Reforma Agrária, Regulamento de Armas, Fundo de Reconstrução, Liga de Estradas, Convenção de Recrutamento, Pacto de Não Agressão, Feira das Nações. Cada uma tem ganho e custo ao aprovar e ao reprovar (texto na tela da proposta e no Resumo do livro).
- **Ganchos** (um por sistema): preços (`addPriceFx('meet')`, venda em `sellEffects`), imposto, produção de ouro e necessidades (`needOf`), custo de caravanas, estoque das lojas, suprimento das NPC (`facsupply.js`), acampamentos (`poi.js`), recompensas (`rewardFx`), peso do "Ataque às caravanas" (`policies.js`), declaração de guerra e rebeliões (Pacto), taxas e manutenção no fim da rodada (`meetRoundEnd`).
- **Relatório:** linhas em "Rodada atual" com o resultado, os votos e o efeito; e quando o efeito acaba.

## Notificações desta fase
- Aviso do canto "Política a decidir: Reunião das facções" e o aviso padrão ao escolher ("📜 Reunião das facções: A. Ir para a reunião.").
- Tentar encerrar o turno sem reunião: o aviso padrão "Decida a política desta rodada..." e o cartão reabre.
- Dentro da sala: só as caixas de diálogo e a votação, mais a dica de interação em baixo da tela. Sem outros toasts (comprar voto e votar não notificam).
- Resultado e fim do efeito: só no relatório.

## Como testar
Modo criativo: pausa → Rodadas → "Invocar evento" → **Reunião das facções** (ou Mediação) no turno do líder. Ou `?auto=1&mute=1&seed=11`: avance até a rodada 5 (encerrar rodada e turno do líder) e escolha "Ir para a reunião". Por script: `meetEnter()`, `meetS().draw`, `meetApplyEffect({id:'livre',a:{res:'ore'}},'ok',[])`.

## Ajustes após o primeiro teste
- **Sala:** mais clara e decorada (teto e piso claros, candelabro sobre a mesa, cortinas, quadros, estantes de livros, plantas, tochas, tapetes) e uma **bandeira de cada facção** nas paredes laterais. As cadeiras estavam fora da sala (coordenada local usada como mundo); agora ficam em volta da mesa.
- **Mesa baixa** (tampo a 0,8 m; a colisão é mais alta para não dar para subir nela). Ao sentar você **não se agacha**: a visão é a mesma de ficar de pé perto da mesa.
- **Livros mais perto:** o seu fica na borda da mesa, na frente da cadeira; o do tema, na frente da mesa do canto (alcance maior).
- **Falar:** o líder vira para você (devagar) e só então abre o diálogo.
- **Mouse:** as janelas da sala (tema, conversa, votação, resultado) soltam o cursor de novo logo depois de abrir (a janela anterior pedia o mouse de volta).
- **Livro, aba ✨ Efeitos:** buffs (esquerda) e debuffs (direita) ativos: bônus de entrega e faltas de suprimento, efeitos de políticas locais, efeito da reunião, comidas, humor das cidades e repressão (`buffsPages`, `meetfx.js`).

