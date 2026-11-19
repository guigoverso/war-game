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

### POIs: fatia 1 (feita em 2026-11-18; falta jogar e ajustar)
- **Código:** `js/pois.js` (tipos em `POI_DEFS`, construtores em `POI_BUILD`, geração em `genWorldPois`, chamada no fim de `genPOIs`, `js/poi.js`). Cada POI é uma construção numa malha própria, com bandeira na cor do dono. Dono: `'bandit'`, número de facção, `'player'` ou `'none'` (ruínas). Só o que mudou vai em `STATE.pois` (`SAVE_VERSION = 20`, passo v20 em `migrateSave`). `poiSetOwner(p, dono)` troca o dono e repinta a bandeira.
- **Geração:** 0 a 4 POIs por cidade (de propósito desigual), de tipos que combinem com o bioma (2ª passada aceita qualquer lugar plano, menos mina e serraria), de 3 a 5 ruínas soltas e até 2 pontes (postos de pedágio em trechos de ponte da estrada). Usa um sorteio próprio (`seed*131+7`) e roda por último: não muda onde ficam os acampamentos, grutas e baús. Perto da capital (170 blocos) todos nascem com bandidos; os outros têm 50% de chance de ser da facção da cidade mais próxima.
- **Mapa manual:** `?cenario=pois` (com `&auto=1&mute=1`) constrói os 13 tipos lado a lado numa laje plana perto da capital, cada um com uma placa com o nome e o dono (bandidos, uma facção, você, sem dono). Também aparecem na aba 📍 Locais (seção 🏗 POIs).
- **Detalhes (revisão de 2026-11-18):** cada POI tem props e interior (casas mobiliadas, poço, carroça, cercas, animais, lampiões, braseiros, estantes de armas...). **Torre:** escada externa de degraus de 1 bloco (o jogador sobe 1,05 sozinho; a plataforma não tem beiral sobre a escada, senão a cabeça bate) até a plataforma. **Taverna:** térreo igual ao da taverna das cidades (`buildTavern`); andar de cima com corredor e 4 quartos, uma porta aberta (o quarto do jogador, `p.roomDoor`) e as outras fechadas; escada e varanda por fora, na parede norte (o térreo e o andar de cima são dois `makeBuilding` empilhados). **Árvores:** `genDecor` não planta nada a menos de `r+5` de um POI. **Estradas:** todo POI, menos ruínas (e ponte, que já está na estrada), ganha uma estrada até a cidade que o originou (`carveRoad`, aproveitando as existentes). **Mapas:** minimapa e mapa grande mostram os POIs como quadrados na cor do dono (o mapa grande, com o nome).
- **Revisão 2 (2026-11-18):** **mapa maior:** `W` (`js/phys.js`) passou de 640 para **896** por padrão (`?w=640` volta ao antigo; múltiplo de 32, de 640 a 1280). Com as folgas pedidas, 640 quase não comporta POIs (testado: 0 a 1 por mundo; 768 deu 13 numa semente de montanhas e 0 numa de ilhas/planície; 896 deu 12 a 15 mais 4 a 5 ruínas, para 7 cidades). Custo medido: geração de 5,1 s para 5,9 a 6,8 s; as cidades ficam mais afastadas (menor distância entre cidades de ~185 para 260 a 365 blocos: caravanas, raids e viagens ficam mais longos; reavaliar se achar demais). **Distâncias:** `POI_GAP = 30` blocos livres entre a borda de um POI e a muralha de uma cidade ou a borda de outro POI; 1 a 4 POIs por cidade e, se faltar, completa até ao menos `2×cidades+2`. **Mapa manual** (`?cenario=pois`): o mundo inteiro nasce plano (sem água, árvores nem cidades na área) e os POIs são construídos antes da malha do terreno (por isso a trincheira é escavada de verdade e os pisos aparecem). **Mapa do jogo:** o nome do POI aparece ao passar o mouse (com o dono); o botão "Nomes dos POIs" no caderno liga e desliga os nomes fixos (desligado por padrão). **Colisões:** cercas, cancela, parapeito e telhado da torre; mina com teto fechado; serraria com canal em vez de rampa; ponte com tabuleiro e guarda-corpo de aço e a guarita sobre base nivelada; taverna com escada interna, 5 quartos (1 aberto, 4 com porta falsa) e mais mesas. **Taverneiro e fregueses:** previstos na fatia 2 (dependem do dono do POI).
- **Revisão 3 (2026-11-18):** causa dos tetos e lajes "sumidos": `BoxBatch.box` não desenha a face de baixo sem `{b:true}`; `pBc` (e a `W2` da taverna) agora sempre desenham. **Mina:** virou cabana de madeira sobre uma rampa escavada (5 degraus de 1 bloco) com trilhos, vagonete descendo, torre do guincho e oficina. **Torre de vigia:** a ripa do parapeito sul batia na cabeça de quem chegava pela escada (removida); banco e mesa com colisão; **binóculo** no tripé (`p.binoc`, para achar POIs no futuro). **Forte:** topo das torres com colisão. **Ferraria:** pilares com colisão e teto visível. **Taverna:** sem mesa na ponta direita (caminho até o fogão). **Mapas:** borda magenta (`POI_BORDER`, cor que não existe no terreno); ruínas não aparecem nos mapas nem serão tomadas; botão de nomes no canto inferior direito do mapa do livro.
- **Revisão 4 (2026-11-18):** arame farpado e ouriços da trincheira com colisão (o arame tem 1,45 de altura: abaixo de 1,05 o jogador sobe nele); mina com chão de pedra e paredes pretas na rampa; **muralha do forte** com embasamento, fiadas e juntas alternadas nas duas faces, contrafortes, seteiras, corbéis, ameias só na face de fora, passadiço livre com escada interna (norte), pilastras e estandartes no portão, e torres com cunhais, cordões de pedra, seteiras e ameias; botão de nomes dos POIs na aba Mapa, fora do desenho do mapa (embaixo, à direita). **Folgas dos outros pontos do mapa:** `AMB_GAP = 22` (`js/pois.js`, menor que `POI_GAP = 30` + 8 de margem dos POIs) vale agora para acampamentos de bandidos, cavernas de animais, baús perdidos (`poi.js`) e portais (`dungeon.js`, via `ambClash`, que também os afasta dos POIs, cavernas e baús). Medido na semente 11: acampamentos 30 do muro e 35 dos POIs; cavernas 27 e 40; baús 21 e 33; portais 77 e 24 (borda a borda).
- **Decidido:** mapa **896** mantido e **mais cidades**: o número é proporcional à terra (terra ÷ 48 mil, entre 7 e 10; `?cid=N` força um número). Medido: semente 11 (montanhas) 10 cidades e 24 POIs (+3 ruínas); semente 3 (ilhas e planície) 8 cidades e 10 POIs (+3 ruínas).
- **Estudo: mais cidades com o mapa 896** (`?cid=N`, só para teste; o padrão continua 7): em mundo de montanha (semente 11), 11 cidades couberam (distância mínima entre cidades 220, média ao vizinho mais próximo 257), com 28 POIs (+4 ruínas), 4 facções e 7,0 s de geração; em mundo de ilhas e planície (semente 3, 53% de terra), 10 cidades couberam (mínima 192), mas só 13 POIs (+4 ruínas): ali a terra, e não o espaço, limita. Conclusão: 9 a 10 cidades cabem em 896 na maioria dos mundos; passar de 10 pede ~1024 (e mais tempo e memória). Sugestão: número de cidades proporcional à terra disponível (ex.: terra ÷ 48 mil, entre 7 e 10), mantendo POIs ≥ cidades. Falta jogar com mais cidades (equilíbrio da economia, caravanas e raids, nomes e facções).
- **Fatia 2 (feita em 2026-11-18; `js/poigame.js`, `SAVE_VERSION = 21`, números em `POIX`):**
  - **Bandidos:** todo POI com dono `bandit` (menos ruínas) tem uma guarnição (3 a 6 soldados e um cão), uma área `kind:'poi'` que reaproveita a IA dos acampamentos. Matar todos deixa o POI **livre** (cinza no mapa) e guarda a rodada em `STATE.poiX.clr`.
  - **Cartão "Terras livres"** (`poianexar`, entra na fila de `facDueList`, uma vez por POI livre, a partir da rodada seguinte): **A** anexar; **B** doar à facção vizinha fora de guerra (+1 de relação); **C** deixar para depois (na 2ª vez os bandidos voltam).
  - **Renda no início de cada rodada** (aparece no relatório): fazenda +3 comida, mina +3 minério, serraria +3 madeira, curtume +3 couro (na reserva do armazém) e ponte +◉30 no cofre. **Retomada pelos bandidos:** chance por rodada de 3% + 0,04% por bloco além de 150 da sua cidade mais próxima (máx. 35%).
  - **Efeitos:** celeiro −5% nas necessidades de todas as suas cidades (até 3); ferraria −15% no reparo de armas (até 2); forte +1 soldado temporário por batalha (até 3, some na rodada seguinte); ruínas com 10% de artefato (relíquia) no baú.
  - **Torre:** `[E]` dentro da base = **Fazer vigia** (1×/rodada, só no turno do comandante, avança 4 h e marca no mapa um acampamento, POI de bandidos ou ruínas a até 400 blocos: estrela laranja que some ao chegar ou na rodada seguinte). O binóculo na plataforma ainda só mostra uma mensagem.
  - **Taverna (POI seu):** taverneiro e fregueses aparecem; `[E]` no balcão reserva o quarto (◉20); `[E]` na cama do quarto aberto dorme (noite vira manhã, dia vira noite; recupera a vida).
  - **Como testar:** num mundo normal, mate a guarnição de um POI (`damageEnemy(e,99999,false)` em `p.gar.enemies`) e encerre a rodada. No mapa manual (`?cenario=pois`) dá para testar a taverna: `poiSetOwner(p,'player'); poiGarrisonSync(p)`.
- **Fatia 2, revisão (2026-11-18):** **guarnição** de no mínimo 10 bandidos (forte 12, acampamento fortificado 11), +1 a cada 140 blocos da sua capital (até 22); a cada 200 blocos sobe o nível (brutamontes, robôs, franco-atiradores) e a vida cresce até +120% (`POIX.garrison`). **Retomada:** 3% + 0,15% por bloco além de 150 da sua cidade mais próxima, **teto de 75%** (POI longe fica inviável). **Fortes:** ao menos um para cada duas cidades. **Taverna** só nasce com estrada existente a até 30 blocos, em nenhuma passada de relaxamento. **Ruínas** têm 5 guardiões (aranhas e brutamontes) e o baú só abre depois de eliminá-los (`STATE.poiX.done`). **Cartão Terras livres:** botão "Ver o POI no mapa" (fecha o cartão, abre o mapa com o POI em destaque, `G.poiFocus`); opções A anexar, **D1 a D4 doar** (relação **+3**) e **V1 a V4 vender** (mínimo ◉3000, até +50% para quem está perto; preço por tipo em `POI_PRICE`) a cada facção fora de guerra, com a distância da cidade mais próxima dela ao POI, e Z deixar para depois. **Moradores:** POIs de facção ou seus têm 2 guardas (4 no forte e no acampamento fortificado) na cor do dono, e a taverna, o taverneiro e os fregueses. Trabalhadores civis (fazendeiros, mineiros) ficam para depois.
- **Fatia 2, revisão 2 (2026-11-18):** o cartão tem 4 opções (A anexar, **D doar**, **V vender**, Z deixar); D e V abrem um popup (`op.pick` em `policies.js`) com a bandeira, o nome e a distância de cada facção (e o preço, na venda). O mapa aberto pelo botão do cartão tem **"↩ Voltar ao evento"** (à esquerda, embaixo do mapa). Borda dos POIs mais fina. **Batalha no POI:** ao primeiro aggro (`wildAggro`, `kind:'poi'`), seus soldados aparecem (`armyAssault`) e voltam para casa ao fim ou se você recuar (`poiTick`). **Mapa:** fora do modo criativo, os POIs só aparecem (mapa e minimapa) depois que você chega a `POIX.reveal` (80) blocos da borda deles (`STATE.poiX.seen`, com aviso "Você avistou"); no modo criativo aparecem todos.
- **Fatia 2, revisão 3 (2026-11-18):** **lista de políticas:** com mais de uma política a decidir, abrir o cartão mostra primeiro a lista da rodada (`polListWin`, `policies.js`, com `listLabel` opcional); só ao clicar em "Abrir" vem a janela da política. **Anexações autoexcludentes:** anexar, doar ou vender um POI faz os outros cartões "Terras livres" da rodada sumirem (`STATE.poiX.decided`); os POIs continuam livres e os cartões voltam na rodada seguinte. Adiar (Z) não conta. **Bandidos dos POIs:** mesma aparência dos de acampamento (bandana e roupas marrons). **Tipos novos** (`EDEF`, `entities.js`): Saqueador (95 de vida, fuzil de rajada longa), Metralhador (190, rajada de 12 tiros), Atirador de Elite (75, tiro de 32 a 115 de alcance) e Chefe dos Bandidos (650, espingarda em rajada); entram por nível de distância (2: saqueadores e brutamontes; 3: metralhadores, atiradores de elite e drones; 4: um chefe). **Forte:** o lado esquerdo da entrada ganhou uma pista de treino (escada de pedra até o passadiço oeste, degraus de caixotes até uma plataforma de madeira a 3 de altura, toras e sacos de areia, tudo com colisão), no lugar da tenda e dos barris; a tenda que sobrou também tem colisão.
- **Ainda não tem:** sucata na ferraria, o binóculo achando POIs, efeitos de guerra (suprimento e sabotagem), doar ou negociar POIs pela tela de Negociações, renda, efeitos de paz e de guerra, taverneiro, quartos para dormir, torre com "Fazer vigia", ferraria e celeiro funcionando, chance de artefato nas ruínas (hoje o baú só dá ouro), POIs de guerra gerados nos buracos do mapa (os dois já existem no mapa manual), bandeira nas ruínas.

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
