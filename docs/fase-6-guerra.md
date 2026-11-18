# Fase 6 — Guerra: desenho consolidado (redesenho de 2026-11-18)

Fase só da guerra. Depende da Fase 5 (facções, relações, temperamentos): ver `docs/fase-5-facoes.md`.
**Nada daqui está no código ainda.** Este arquivo **substitui** o desenho antigo (frente linear de pontos de controle e fatiamento G1 a G5 de `docs/ideias-e-design.md`, seção 5D); onde houver conflito, vale este.
Números de balanceamento ficam juntos em um objeto `WAR` (como `ECON`, `POL`, `RAID_WAVES`). Os valores citados aqui são ponto de partida.

## Ideia central
A guerra é uma **campanha**: o **Líder planeja** operações com pontos de líder e o **Comandante executa** no mapa. O mapa tem **POIs** (lugares com função) que mudam de dono, e o placar é o **cabo de guerra** (quem controla mais POIs). O que impede a guerra de durar para sempre é a **fadiga de guerra**. Só termina com um **Acordo de Paz**.

## Como a guerra começa
- **Crime contra facção inimiga:** a guerra começa na **rodada seguinte**. A facção **pacífica nunca declara guerra** (fica sem comércio e exige reparação em ouro, regra da Fase 5).
- **Declaração do jogador** (hoje uma política; passa para a tela de **Negociações**).
- **Facção declara guerra ao jogador ou a um aliado dele:** vira **guerra de defesa** (abaixo). O jogador também pode entrar ao lado do defensor por vontade própria.
- **Aliados entram** na guerra do aliado (soldados lutam; ver Aliados). Agressiva declara por "questão de tempo" (2 a 4 rodadas) e entra na hora; neutra entra pagando; pacífica nunca (decidir os números na implementação).
- Facções NPC entre si em guerra: mesma máquina, com fadiga de NPC.
- **Efeitos já decididos:** crime em cidade em guerra vale como crime (guardas atiram, 3× de dano no jogador, sem conquista, sem soldados, sem serviços). A invasão antiga de cidades está **desativada** (o código continua); a guerra é o caminho para conquistar.

## O ciclo da rodada
**Turno do Líder (planejar).** Gasta **pontos de líder** em operações. Pontos = **nível do líder**: começa em 1 e ganha **+1 durante a guerra** (perde ao acabar). Pode fazer mais de uma operação por rodada.
- **Ataque:** alvo é um POI ou a cidade. Custa 1 ponto (a cidade final custa mais e exige controlar a **maioria** dos POIs).
- **Defesa:** só aparece quando o inimigo atacou; custa 1 ponto. Se o jogador não escolher: POI tomado, caravana desfeita.
- **Sabotagem:** não toma POI, aplica **debuff** a soldados, POIs ou cidades, e pode desfazer caravanas. Custa 1 ponto, **resolve sozinha** com chance (ver Espiões).
- **Reduzir fadiga:** operações que prolongam um pouco a guerra (ver Fadiga).
- **Retaliação** (só na guerra de defesa, abaixo).

**Turno do Comandante (executar).** O jogador vai ao mapa cumprir as operações planejadas.
- **Locais proibidos:** o freio no turno do Comandante (substitui a ideia de "ferimentos", descartada por ser redundante). Chegar perto de um POI ou cidade que **não está numa operação** mostra o aviso "território proibido"; se insistir, os guardas atiram. Atacar mesmo assim dá **×10 de dano ao jogador e ÷10 ao inimigo**.

## POIs (mecânica nova)
- **Permanentes** (ponte, forte, fazenda, mina...): têm dono, efeito e **conquistam-se**. Contam no cabo de guerra. Cerca de **2 por cidade, perto dela** (um de produção e um de passagem ou defesa), uns 8 a 12 no mapa. A frente usa os 3 ou 4 entre as duas cidades.
- **Removíveis** (acampamentos, trincheiras): nascem com a guerra, somem quando acaba. **Destroem-se**, não se tomam; tirar um acampamento reduz as patrulhas do inimigo, uma trincheira enfraquece a defesa do POI atrás. Não contam no cabo.
- **Conquistar** = limpar os soldados; o POI troca de dono sozinho (reaproveita acampamentos com dono). Sair antes de limpar devolve o POI ao inimigo na rodada seguinte, com reforço.
- **Uso na paz:** (1) renda pequena ao dono (fazenda comida, mina minério, serraria madeira, curtume couro); (2) rotas de caravana passam por ponte e forte (dono dá segurança ou pedágio); (3) POI vazio é ocupado por bandidos e limpar vira missão com recompensa (missões de acampamento e matilha); (4) bandeira do dono visível.
- **Cabo de guerra** = proporção de POIs permanentes controlados por cada lado.

### Tipos de POI (decidido)
**Regra de efeito:** todo efeito de POI vale para **todas as cidades do dono** (sem cidade-âncora para efeitos); em compensação os bônus são **pequenos**. A distância até a cidade do dono mais próxima só serve para o **risco de bandidos** tomarem o POI.

| POI | Paz | Guerra |
|---|---|---|
| Fazenda | +comida por rodada | reduz o acréscimo de suprimento de comida |
| Mina | +minério por rodada | reduz o acréscimo de suprimento de minério |
| Serraria | +madeira por rodada | reduz o acréscimo de suprimento de madeira |
| Curtume | +couro por rodada | soldados do dono mais fortes; exige a **aba nova "Soldados"** no livro (quantidade, arma que pode ser trocada, buffs e debuffs) |
| Ponte | pedágio em ◉ | desfaz a caravana inimiga que passava por ela (sem desvio) |
| Forte | +1 soldado que surge para lutar com você | igual |
| Torre de vigia | ação "Fazer vigia" 1×/rodada: avança 4 h e marca um ponto de interesse no mapa (some ao resolver ou no fim da rodada) | menos chance de a sabotagem do espião inimigo dar certo |
| Taverna | quarto no 2º andar (falar com o taverneiro, reservar, subir; noite→manhã e vice-versa) | recruta soldados |
| Ruínas antigas | baú com 10% de chance de artefato | igual |
| Ferraria | desconto no reparo de armas, ou uso de sucata | igual |
| Celeiro | reduz as necessidades de suprimento das cidades do dono | igual |

- Também entram no sistema de POIs, como já existem: **cavernas de animais** e **portais**; mais as **ruínas** (novas).
- **POIs de guerra** (acampamento fortificado e trincheira): só pontos de controle, **sem bônus**; são gerados onde houver um grande buraco sem POIs.
- **Distribuição:** aleatória, com sentido de terreno (fazenda na planície, mina na pedra, serraria na floresta, ponte sobre água...); algumas cidades têm mais POIs e outras menos.
- **Posse:** no começo o jogador não tem POI; algumas cidades NPC têm, a maioria está com **bandidos**, e os **perto da cidade do jogador nascem tomados por bandidos**. Limpar (sem missão) abre, na rodada seguinte, um evento para escolher um POI para anexar. Cidades NPC têm pequena chance de conquistar POIs de bandidos, trocar ou vender. Na tela de Negociações o jogador compra, troca ou doa (facções vizinhas aceitam com mais facilidade). POI não sofre raid: há **chance de bandidos o tomarem**, maior quanto mais longe das cidades do dono (um POI longe das suas cidades é alvo constante).

## Pressão do inimigo
- O inimigo ataca no **fim da rodada** (POIs sem defesa ou caravanas); o ataque vira operação de **Defesa** no turno do Líder seguinte. A frequência depende do temperamento (agressiva quase toda rodada, neutra de vez em quando). Vários ataques competem pelos mesmos pontos: o jogador pode ter que deixar um cair.
- POIs de aliados também sofrem ataques (com menos chance que os do jogador).

## Guerra de defesa
Vem quando uma facção declara guerra ao jogador ou a um aliado, ou quando o jogador escolhe ficar do lado do defensor.
- Objetivo: **desgastar o inimigo até ele aceitar a paz**. Operações de defesa mais abundantes.
- **Retaliação limitada:** ataca só POIs que o inimigo tomou (retomar) e acampamentos e trincheiras de onde saem os ataques; nunca a cidade. Retomar POIs e vencer batalhas sobe a fadiga do inimigo.
- **Prêmio padrão:** paz com vantagem, com **indenização em ouro** e relação melhor.
- **Virar a ofensiva:** opção explícita e rara, só depois de retomar todos os POIs e com a fadiga do inimigo em marco alto (ex.: 10 ou mais). Vira guerra de ataque, com frente e cidade-alvo.
- **Fadiga do defensor:** usa a fadiga **simples dos NPC** (sem marcos). Se virar atacante, passa a ter a fadiga completa de 0 a 20.

## Fadiga de guerra
A guerra só acaba com acordo; a fadiga impede que dure para sempre.

**Jogador (barra 0 a 20, sobe enquanto a guerra dura):**
- Marcos em **5, 10 e 15**: cada um aumenta a necessidade de suprimentos das cidades (**é a logística da guerra**: não somar outro acréscimo à parte; sugestão +15%, +30%, +45%, a calibrar). Usa as necessidades de 100/150/200% que já existem; faltar gera debuff e descontentamento como hoje.
- Quanto sobe, do maior para o menor: **sabotagem sofrida (feita pelo inimigo) > ataque a POIs inimigos > defesa de POIs conquistados > defesa de POIs** (quase nada). A sabotagem que o jogador faz sobe a fadiga do **inimigo** (e vice-versa).
- Operações para **reduzir** a fadiga prolongam um pouco a guerra.
- Em **20**: acabam as operações de ataque, de sabotagem e de reduzir fadiga, e o jogador **perde metade dos pontos de líder** (arredondado para baixo). Sobra a defesa. **Aos 20 a paz sempre existe**, com custo alto, para a regra "só acaba com acordo" nunca travar o jogo.
- **Aliados não têm fadiga.**

**Inimigo e outros NPCs (simples, sem buffs nem debuffs):**
- Sobe: perder POIs, perder batalhas de conquista, sofrer sabotagem. Desce: ganhar batalhas.
- Serve só para a **negociação de paz**: com fadiga alta aceita acordos igualitários.
- Aliado do inimigo com fadiga alta pode ser convencido a sair; aliado do jogador com fadiga alta pode ser convencido pelo inimigo.
- Sugestão: a chance de uma facção **neutra** sair mantendo territórios sobe com a fadiga dela (em vez de sorteio puro).

## Espiões e sabotagem (mecânica nova, desenho a fazer)
- Resolve **sozinha** no fim do turno do Líder, com chance.
- Parâmetros: **nível do espião** (mecânica nova), **nível do líder/facção** (mecânica a mudar: hoje não é um número com efeito) e **estado da guerra** (quem está perdendo tem mais chance de cumprir a sabotagem).
- Vale igual para os NPC. Debuffs possíveis: tirar suprimento, enfraquecer soldados de um POI, desfazer caravana, baixar o moral de uma cidade.
- Extra opcional: o jogador infiltrar pessoalmente, com bônus.
- **Falta desenhar** (como o espião sobe de nível, custo, limites, o que o inimigo pode fazer contra o jogador).

## Aliados e outras facções na guerra
- Cada guerra tem **um inimigo principal** (a frente). Os demais entram como **reforço**, sem frente própria; o cabo de guerra conta só entre o jogador e o inimigo principal.
- **Aliado do jogador:** os soldados aparecem nas batalhas e lutam junto; 10% do espólio. Entra 1 a 2 rodadas depois.
- **Aliado do inimigo:** soldados dele aparecem na batalha (mais contingente), aumenta a guarnição dos POIs e pode mandar ataques extras. Os POIs dele também podem ser conquistados.
- Aliada: seus soldados lutam nas guerras da aliada e os dela nas suas (já decidido na F2). Pacífica: nunca declara, nem por aliado.

## Fim da guerra e negociação
**A negociação de paz afeta todas as facções em guerra.** Com a fadiga é possível **tirar uma facção** do lado inimigo (ou aliado):
- Pedir que saia **devolvendo os POIs conquistados**: aceita na hora.
- Pedir que saia **mantendo os POIs**: pacífica aceita, neutra é sorteada (ver sugestão na fadiga), agressiva recusa sempre.

**Vencendo uma guerra do jogador (não de NPC)**, para cidade e/ou POIs, escolhendo no mapa (clicando):
- **Devolver por dinheiro** ou **ao dono original** (o dono original pode não ser o inimigo principal: um POI de aliado dele volta ao aliado; a tela mostra o dono de cada POI).
- **Anexar.**
- **Negociar com aliados** por dinheiro, ou **doar** a aliados.

**Depois de conquistar uma cidade**, os NPC contrários tentam fazer as pazes. O jogador pode recusar e continuar (escolhe outra cidade no mapa; a fadiga dele segue subindo). Se todas as facções foram destruídas, o evento nem aparece. Cidade conquistada entra em crise (descontentamento e rebelião: aproveitar `js/rebmine.js`).

## Tela de Negociações (nova)
Botão **Negociações** na tela de Facções: criar caravana, declarar guerra, negociar paz, doação de dinheiro, doação de artefatos. Declaração de guerra e paz deixam de ser políticas e passam para cá. Útil mesmo sem guerra.

## Caravanas (novas mecânicas, **lista a receber do usuário**)
Aguardando as ideias. Ligações já previstas: caravana de suprimento como alvo de sabotagem; rotas por ponte e forte.

## Ainda em aberto
- Derrota do jogador: se a frente é empurrada até o fim (perder cidade, tributo; capital = fim de jogo "por enquanto").
- Quantos pontos a cidade final custa e quantos POIs mínimos são "maioria".
- Verificar se 2 pontos por rodada em guerra dão uma guerra de 3 a 4 rodadas de ataque.
- Caminho por terra entre as cidades na geração do mundo (só se algum cenário ficar sem rota; guerra naval é ideia futura).
- Números exatos de `WAR` (marcos da fadiga, custo de operação, chance de sabotagem).

## Para implementar depois (fora da guerra)
- **Vários eventos na mesma rodada** (ex.: reunião e rebelião): melhorar a UI de decisões. Com mais de uma política, o jogador clica num botão para abrir cada uma, usando a UI do livro **sem criar abas novas** (com botão "Voltar").
- **Número de cidades pela área útil** (feito): o sorteio de locais em `js/world.js` exige distância mínima de 104 entre centros (`MIND`) e, se a terra não comporta 7 cidades, o mundo ganha menos (mínimo 4, o piso desce de 10 em 10 até 64). Antes o último recurso relaxava até 40 e as cidades ficavam coladas (ex.: seed 824978181 com bioma deserto, `?seed=824978181&bio=desert`, tinha pares a 83 e 84 blocos).
- **Edifício do tipo da cidade** (moinho, forja, serraria, curtume, casa da moeda, alfândega; sem placa, cada um com formato próprio: moinho de vento com pás, forja com chaminé de pedra, serraria em galpão aberto, curtume com varais, casa da moeda com cúpula e pórtico, alfândega com mastro): **feito** em 2026-11-18 (`buildWorks` em `js/city.js`; o tipo vem de `cityTypePlan`, `js/rounds.js`, e é decidido já em `world.js`). Para ver: modo criativo → pausa → aba **📍 Locais** (teleporte para cada edifício de tipo, cidade, acampamento, gruta e portal; os POIs novos da guerra entram nessa lista quando forem criados).

## Ordem de implementação (prioridade)
**A. Fundação:** (1) POIs permanentes com dono, efeito e uso na paz; (2) nível do líder e da facção como número com efeito; (3) objeto `WAR` e estado de guerra (exige somar 1 ao `SAVE_VERSION` e passo em `migrateSave`); (4) cenário `?cenario=guerra` (rota fechada).
**B. Núcleo (a campanha jogável):** (5) operações no turno do Líder (ataque, defesa); (6) locais proibidos; (7) cabo de guerra; (8) POIs removíveis; (9) batalha final da cidade com pontos de nascimento escolhidos; (10) relatório e aviso de guerra.
**C. Pressão:** (11) defesa reativa; (12) IA do inimigo por temperamento; (13) condição de derrota; fadiga do jogador e dos NPC.
**D. Economia e espionagem:** (14) logística (marcos da fadiga); (15) espiões e sabotagem; (16) sabotagem dos NPC.
**E. Aliados e diplomacia:** (17) soldados aliados e do inimigo nas batalhas; (18) POIs de aliados; (19) destino dos POIs no fim; (20) tela de Negociações; (21) mover declaração de guerra e paz das políticas; (22) novas mecânicas de caravana; (23) caminho por terra, se preciso.
A fase D pode ficar depois da E; a Negociações (20) é útil sozinha e pode vir antes.

## Ideia de teste
O **cenário controlado** (rota fechada com eventos pré-definidos), anotado na Fase 5, é ainda mais útil aqui: guerra é difícil de testar começando do zero. Ver `?cenario=caravanas` como modelo.
