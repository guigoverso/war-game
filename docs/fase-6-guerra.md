# Fase 6 — Guerra: desenho consolidado (redesenho de 2026-11-18)

Fase só da guerra. Depende da Fase 5 (facções, relações, temperamentos): ver `docs/fase-5-facoes.md`.
**Estado (2026-11-20):** os **POIs** (paz) estão no código (seção "POIs", fatias 1 a 3 e revisão `docs/features/3_tarefas.md`, tarefas 1 a 9 feitas; falta a 10, fechamento) e as **pontes** também (última seção). **A guerra em si (operações, `WAR`, cabo de guerra, fadiga, espiões, aliados) ainda não está no código.** Onde o texto das fatias antigas conflitar com "Estado atual dos POIs", vale o estado atual. Este arquivo **substitui** o desenho antigo (frente linear de pontos de controle e fatiamento G1 a G5 de `docs/ideias-e-design.md`, seção 5D); onde houver conflito, vale este.
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
**Turno do Líder (planejar).** Gasta **pontos de líder** em operações. Pontos = **nível da facção** (`facLvl()`): começa em 1 e ganha **+1 durante a guerra** (perde ao acabar). Pode fazer mais de uma operação por rodada.
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
| Fazenda | +comida por rodada (1 + nível do dono, no armazém) | reduz o acréscimo de suprimento de comida |
| Mina | +minério (1 + nível) | reduz o acréscimo de suprimento de minério |
| Serraria | +madeira (1 + nível) | reduz o acréscimo de suprimento de madeira |
| Acampamento de caçadores | +couro (1 + nível); baú de 1 a 3 carnes ao conquistar | −0,08 na pontuação de couro de cada facção inimiga (`poiHuntPen`) |
| Santuário | 50% de a cidade sem suprimento não ficar Descontente; 30% de adiar 1 rodada uma rebelião (não acumula) | reduzir fadiga (30% de falhar) fica parado até a fadiga existir |
| Ponte | pedágio ◉20 × nível | desfaz a caravana inimiga que passava por ela (sem desvio) |
| Forte | +1 soldado que surge para lutar com você | igual |
| Torre de vigia | **"Fazer vigia"** (única ação; 1 uso por torre por rodada, 4 h, raio 300, marca um "?") | menos chance de a sabotagem do espião inimigo dar certo |
| Taverna | quarto, ferreiro (conserto por ouro ou sucata + 60% em ouro), mercenário (só se for sua) | recruta soldados |
| Entreposto comercial | loja (comida, munição, remédios e materiais, +10%; **materiais com estoque limitado**: `POST_STOCK_MULTIPLIER` (0,5) × loja da cidade, renovado por rodada) e renda ◉40 × nível por caravana sua que passa | só em guerra entre as duas facções: impede as caravanas do outro lado que passariam por ele |
| Ruínas antigas | sem dono; 5 guardiões que voltam, baú único com 30% de artefato | igual |

**Revisão dos tipos (tarefa 2, 2026-11):** Curtume, Ferraria e Celeiro foram **removidos** (a Fazenda herdou o desenho do celeiro; a aba "Soldados" do curtume saiu do desenho). Ferreiro e bigorna vivem na Taverna; o reparo do colete é no Quartel. **Nível do dono** (`poiLvl`): jogador = nível do líder; facção NPC = maior nível entre as cidades dela. São 10 tipos de POI mais as ruínas; o mapa tem de ~21 a 30 POIs.

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
- **(Superado pela revisão seguinte; hoje o mapa é 704 com 6 a 8 cidades.)** Mapa **896** mantido e **mais cidades**: o número é proporcional à terra (terra ÷ 48 mil, entre 7 e 10; `?cid=N` força um número). Medido: semente 11 (montanhas) 10 cidades e 24 POIs (+3 ruínas); semente 3 (ilhas e planície) 8 cidades e 10 POIs (+3 ruínas).
- **Revisto (mapa menor):** o 896 cansava de atravessar. Mapa **704** (`js/phys.js`), **6 a 8 cidades** pela mesma fórmula da terra (`NC` em `js/world.js`) e **220 blocos** de distância mínima entre os centros (`MIND`); se não couberem 6 cidades (ilhas), a distância desce de 10 em 10 até 64. Testar: `?auto=1&mute=1&seed=11` (terra contínua: 8 cidades bem afastadas) e `seed=3` (ilhas: a distância cai e ainda nascem 6). `?w=896` volta ao tamanho anterior.
- **Estudo: mais cidades com o mapa 896** (`?cid=N`, só para teste; o padrão continua 7): em mundo de montanha (semente 11), 11 cidades couberam (distância mínima entre cidades 220, média ao vizinho mais próximo 257), com 28 POIs (+4 ruínas), 4 facções e 7,0 s de geração; em mundo de ilhas e planície (semente 3, 53% de terra), 10 cidades couberam (mínima 192), mas só 13 POIs (+4 ruínas): ali a terra, e não o espaço, limita. Conclusão: 9 a 10 cidades cabem em 896 na maioria dos mundos; passar de 10 pede ~1024 (e mais tempo e memória). Sugestão: número de cidades proporcional à terra disponível (ex.: terra ÷ 48 mil, entre 7 e 10), mantendo POIs ≥ cidades. Falta jogar com mais cidades (equilíbrio da economia, caravanas e raids, nomes e facções).
- **Fatia 2 (feita em 2026-11-18; `js/poigame.js`, `SAVE_VERSION = 21`, números em `POIX`):**
  - **Bandidos:** todo POI com dono `bandit` (menos ruínas) tem uma guarnição (3 a 6 soldados e um cão), uma área `kind:'poi'` que reaproveita a IA dos acampamentos. Matar todos deixa o POI **livre** (cinza no mapa) e guarda a rodada em `STATE.poiX.clr`.
  - **Cartão "Terras livres"** (`poianexar`, entra na fila de `facDueList`, uma vez por POI livre, a partir da rodada seguinte): **A** anexar; **B** doar à facção vizinha fora de guerra (+1 de relação); **C** ignorar (o POI segue livre; ao encerrar o turno do Líder ele é sempre retomado: bandidos ou a facção mais perto, inclusive em guerra (pesos 50%/50% em `BANDIT_RETAKE_FREE_POI` e `FACTION_TAKE_FREE_POI`, `js/modifiers/`); gancho `leaderEnd`, `poiFreeRetake`). Teste: `?auto=1&mute=1&seed=11`, esvaziar um POI e encerrar duas vezes sem decidir; coberto no smoke.
  - **Renda no início de cada rodada** (aparece no relatório): fazenda +3 comida, mina +3 minério, serraria +3 madeira, curtume +3 couro (na reserva do armazém) e ponte +◉30 no cofre. **Retomada pelos bandidos:** chance por rodada de 3% + 0,04% por bloco além de 150 da sua cidade mais próxima (máx. 35%).
  - **Efeitos:** celeiro −5% nas necessidades de todas as suas cidades (até 3); ferraria −15% no reparo de armas (até 2); forte +1 soldado temporário por batalha (até 3, some na rodada seguinte); ruínas com 10% de artefato (relíquia) no baú.
  - **Torre (histórico; ver tarefa 3 de `docs/features/1_atualizacoes-POIs.md`: vigia e binóculo foram fundidos em `poiVigil`, 1 uso por torre por rodada, marcas "?" em `G.poiMarks`):** `[E]` dentro da base = **Fazer vigia** (1×/rodada, só no turno do comandante, avança 4 h e marca no mapa um acampamento, POI de bandidos ou ruínas a até 400 blocos: estrela laranja que some ao chegar ou na rodada seguinte). O binóculo na plataforma ainda só mostra uma mensagem.
  - **Taverna (POI seu):** taverneiro e fregueses aparecem; `[E]` no balcão reserva o quarto (◉20); `[E]` na cama do quarto aberto dorme (noite vira manhã, dia vira noite; recupera a vida).
  - **Como testar:** num mundo normal, mate a guarnição de um POI (`damageEnemy(e,99999,false)` em `p.gar.enemies`) e encerre a rodada. No mapa manual (`?cenario=pois`) dá para testar a taverna: `poiSetOwner(p,'player'); poiGarrisonSync(p)`.
- **Fatia 2, revisão (2026-11-18):** **guarnição** de no mínimo 10 bandidos (forte 12, acampamento fortificado 11), +1 a cada 140 blocos da sua capital (até 22); a cada 200 blocos sobe o nível (brutamontes, robôs, franco-atiradores) e a vida cresce até +120% (`POIX.garrison`). **Retomada:** 3% + 0,15% por bloco além de 150 da sua cidade mais próxima, **teto de 75%** (POI longe fica inviável). **Em guerra** a chance é multiplicada por `WAR_RETAKE_MULTIPLIER` (0,5; `js/modifiers/`); o cartão "Terras livres" mostra o valor já com o redutor. **Fortes:** ao menos um para cada duas cidades. **Taverna** só nasce com estrada existente a até 30 blocos, em nenhuma passada de relaxamento. **Ruínas** têm 5 guardiões (aranhas e brutamontes) e o baú só abre depois de eliminá-los (`STATE.poiX.done`). **Cartão Terras livres:** botão "Ver o POI no mapa" (fecha o cartão, abre o mapa com o POI em destaque, `G.poiFocus`); opções A anexar, **D1 a D4 doar** (relação **+3**) e **V1 a V4 vender** (mínimo ◉3000, até +50% para quem está perto; preço por tipo em `POI_PRICE`) a cada facção fora de guerra, com a distância da cidade mais próxima dela ao POI, e Z deixar para depois. **Moradores:** POIs de facção ou seus têm 2 guardas (4 no forte e no acampamento fortificado) na cor do dono, e a taverna, o taverneiro e os fregueses. Trabalhadores civis (fazendeiros, mineiros) ficam para depois.
- **Fatia 2, revisão 2 (2026-11-18):** o cartão tem 4 opções (A anexar, **D doar**, **V vender**, Z deixar); D e V abrem um popup (`op.pick` em `policies.js`) com a bandeira, o nome e a distância de cada facção (e o preço, na venda). O mapa aberto pelo botão do cartão tem **"↩ Voltar ao evento"** (à esquerda, embaixo do mapa). Borda dos POIs mais fina. **Batalha no POI:** ao primeiro aggro (`wildAggro`, `kind:'poi'`), seus soldados aparecem (`armyAssault`) e voltam para casa ao fim ou se você recuar (`poiTick`). **Mapa:** fora do modo criativo, os POIs só aparecem (mapa e minimapa) depois que você chega a `POIX.reveal` (80) blocos da borda deles (`STATE.poiX.seen`, com aviso "Você avistou"); no modo criativo aparecem todos.
- **Fatia 2, revisão 3 (2026-11-18):** **lista de políticas:** com mais de uma política a decidir, abrir o cartão mostra primeiro a lista da rodada (`polListWin`, `policies.js`, com `listLabel` opcional); só ao clicar em "Abrir" vem a janela da política. **Anexações autoexcludentes:** anexar, doar ou vender um POI faz os outros cartões "Terras livres" da rodada sumirem (`STATE.poiX.decided`); os POIs continuam livres e os cartões voltam na rodada seguinte. Adiar (Z) não conta. **Bandidos dos POIs:** mesma aparência dos de acampamento (bandana e roupas marrons). **Tipos novos** (`EDEF`, `entities.js`): Saqueador (95 de vida, fuzil de rajada longa), Metralhador (190, rajada de 12 tiros), Atirador de Elite (75, tiro de 32 a 115 de alcance) e Chefe dos Bandidos (650, espingarda em rajada); entram por nível de distância (2: saqueadores e brutamontes; 3: metralhadores, atiradores de elite e drones; 4: um chefe). **Forte:** o lado esquerdo da entrada ganhou uma pista de treino (escada de pedra até o passadiço oeste, degraus de caixotes até uma plataforma de madeira a 3 de altura, toras e sacos de areia, tudo com colisão), no lugar da tenda e dos barris; a tenda que sobrou também tem colisão.
- **Fatia 3 (2026-11-19; `js/poigame.js`, `js/negoc.js`; números em `POIX`; sem mudar o save: só campos novos em `STATE.poiX`):**
  - **Binóculo** (histórico; hoje é `poiVigil`, só na torre sua): `[E]` avança 1 h, até 3 usos por rodada, raio de 300 blocos; sorteia **uma** coisa por uso entre o que existe no raio e ainda não foi achado nesta rodada, com pesos do mais raro ao mais comum (`POIX.binoc.w`): **POI 10 < ruínas 15 < baú escondido 20 < portal de dungeon 25 < acampamento de bandidos / caverna de animais 30** (categoria sem candidatos fica fora do sorteio). Marca no mapa (estrela laranja, a mesma da vigia) e, se for POI, ele passa a aparecer no mapa. Os baús perdidos ganharam a marca `ch.lost`.
  - **Moradores:** POI de **você ou de facção** ganha soldados e civis; se foi conquistado na rodada N, eles aparecem na **N+1** (`POIX.civDelay`, `STATE.poiX.since`). **Limpado na N e anexado na N+1:** os moradores já aparecem ao anexar (a contagem parte da rodada da limpeza, `STATE.poiX.conq`), não só na N+2. Soldados: forte e acampamento fortificado 4, ponte 3, torre e os outros 2. Civis (caminham por pontos do POI): fazenda, mina, serraria e celeiro 3, forte 3, curtume 2, ferraria 1. **Ponte e torre: só soldados.** Taverna: taverneiro e fregueses como antes.
  - **POIs de guerra** (acampamento fortificado e trincheira): só valem **durante a guerra** (`poiWarOn`: alguma facção em guerra com você; no mapa manual `?cenario=pois` ficam sempre ligados). Fora dela não aparecem nos mapas, não têm guarnição nem moradores, não entram no cartão Terras livres nem rendem. Ainda não são gerados no mundo normal: isso vem com a guerra (operações).
  - **NPCs de serviço** (só com os moradores já presentes, em POI seu ou de facção que não seja inimiga nem esteja em guerra com você; os preços usam a cidade da facção mais próxima, ou a capital se for seu): **Taverneiro** `[E]` abre um menu com 🍲 comprar comida (a mesma loja da taverna) e 🛏 alugar quarto (◉20 com os modificadores de preço da taverna). **Ferreiro** (ferraria): tela parecida com a do armeiro, paga o conserto de cada arma (mesmo preço e efeitos, incluindo o desconto da ferraria sua). **Bigorna** (ferraria sua): repara a arma de graça gastando **sucata**, proporcional ao que falta (mínimo 1); sucata para 100%: pistola 3, 2ª arma 3, 3ª 7, 4ª 5, 5ª 12, 6ª 18 (`POIX.anvil`). **Curtidor** (curtume): repara o **colete** por ◉ (35% do preço de um colete novo, ◉63 para 0→100, com os modificadores de colete) ou por couro (5 para 100%, `POIX.vest`).
  - **Negociação** (`negoc.js`): na aba 🏴 Facções, no resumo da facção, os botões de aliança, guerra, paz e melhorar relação saíram e entrou o botão **🤝 Negociação**. Ele troca a página por um menu estilo app de celular (sem popup, com animação de deslize): **⬅** no topo volta uma tela; as telas são Aliança, Melhorar a relação (→ Doar ouro, Doar relíquia, Rota comercial), Pedir paz (só em guerra) e **Guerra, com as cores invertidas** (botão claro com letra e borda marrons). A declaração de guerra agora é feita na tela Guerra (sem popup de confirmação). As regras e os textos de bloqueio são os de antes. Estado da navegação em `LB.neg` (não salvo).
  - **Como testar:** `?cenario=pois&auto=1&mute=1` (mapa manual; moradores e serviços surgem na hora): `poiSetOwner(p,'player')` na ferraria/curtume/taverna e ficar perto do ferreiro, da bigorna, do curtidor ou do balcão. Mundo normal (`?auto=1&seed=11`): anexe um POI e passe a rodada para ver os moradores; torre sua: `poiVigil(p)` (turno do Comandante). Negociação: pausa/`B` → Livro → 🏴 Facções → uma facção → Negociação.
- **Ainda não tem (2026-11-20):** efeitos de guerra (suprimento e sabotagem; só o entreposto, os caçadores e o santuário têm gancho de guerra), doar, vender ou trocar POIs pela tela de Negociação (falta o menu), POIs de guerra gerados nos buracos do mapa (existem no mapa manual), bandeira nas ruínas. O resto da lista antiga (renda, torre, binóculo, taverneiro, quarto, ruínas com artefato) **está pronto**.
- **Resumo das fatias 1 a 3 (vindo do `docs/ESTADO.md` em 2026-11-19):** código em `js/pois.js` (tipos, construtores, geração) e `js/poigame.js` (guarnição, renda, usos, moradores, serviços, binóculo), números em `POIX`. 11 tipos + acampamento fortificado e trincheira, com dono e bandeira, estradas e folgas (`POI_GAP`, `AMB_GAP`); mapa 896 e 7 a 10 cidades pela terra; guarnição de bandidos (10+, 4 tipos novos de bandido), cartão "Terras livres" (anexar/doar/vender), renda por rodada, retomada pelos bandidos (até 75%), celeiro/ferraria/forte/ruínas, torre (vigia, binóculo) e quarto da taverna; POIs só aparecem no mapa depois de avistados. Fatia 3 no commit 8ec79f1, testada por script e na tela da Negociação; falta jogar.
- **Limpeza (2026-11-19):** `js/poiserv.js` foi fundido em `js/poigame.js` (uma só definição de `poiAct`, `poiScan`, `poiGarrisonSync`, `poiCivSync`; campos da fatia 3 dentro do `POIX`); apagados os ramos mortos `poibinoc`/`poibar` antigos em `poiAct` e o `'fwar'` em `bookClick` (hoje em `js/book.js`; nenhum botão o gerava). Validado no `?cenario=pois` (ferreiro, bigorna, curtidor, taverneiro, quarto e cama, binóculo) e na Negociação, sem erros. Não testado: POI de guerra sem guerra (no cenário a guerra fica sempre ligada; equivalência só por leitura).
- **Teste de fumaça (2026-11-19):** `tests/smoke.js` (Node + Playwright, com `tests/package.json`; `node_modules` fora do git) sobe um servidor estático e abre `?auto=1&mute=1&seed=11` e `?cenario=pois&auto=1&mute=1`. Confere: carga sem erros, POIs gerados, `svcSmith`/`svcAnvil`/`svcTanner`/`svcTavern`, `poiBinoc`, moradores (conquista na rodada N sem moradores, `endRound` → aparecem na N+1; só no mundo normal, porque no mapa manual os POIs são `show` e os moradores surgem na hora) e a Negociação (livro na aba `facs`, todas as telas por `negnav`/`negback`, sem fechar aliança nem declarar guerra). As 14 verificações passam (~20 s). Não cobre: interação por tecla E, combate, POIs de guerra sem guerra.
- **Entreposto comercial (tarefa 7, 2026-11-19):** tipo `post` (ícone 🏪, preço ◉4500, `POIX.post`). Dono bandido: sem lojista e sem renda. **Lojista** (`svcPost`, `[E]` atrás do balcão; dono amigo): comida, munição, remédios e materiais, preço +10% somado à relação da cidade de referência (`postPrice`). **Renda:** `◉40 × nível (poiLvl) × caravanas suas que passam por ele`, no cofre a cada rodada, sem aviso (aparece na aba Efeitos, `poiPostEffects`). **"Passa por ele"** = entreposto a até `POIX.post.reach` (45) da linha entre as duas cidades da rota (`poiOnRoute`; a tarefa 9 pode gravar `p.road=[idA,idB]`, que vale no lugar da distância). **Guerra** (só entre você e uma facção): o entreposto de um lado impede as caravanas do outro que passariam por ele (`poiRouteBlocked`): não dá para criar a rota (mapa e `buyCaravan`), as NPC não nascem (`fgPickRoute`) e as já existentes caem no início da rodada. Seu entreposto não impede as suas. **Como testar:** `?cenario=pois`, `svcPost(p)`; `tests/smoke.js` cobre lojista, renda e bloqueio. Terreno provisório (perto de estrada) em `POI_PRED` até a tarefa 9.
- **Geração nova (tarefa 9, 2026-11-19):** `genWorldPois` coloca POIs em 3 lugares: **estrada** (1 na beira do meio de cada estrada entre cidades ligadas com 80+ blocos; grava `p.road`), **anel** (1 a 3 por cidade, de 30 a 70 blocos da muralha, 60% virados para uma cidade vizinha) e **interior** (2 a 4, a 40+ blocos de estrada); depois ruínas e pontes (independentes). O tipo é sorteado pelo bioma do lugar (`POI_W`: 6/4/3/2/1; Taverna e Entreposto só na estrada, peso 4). Regras em `poiRuleOK`: Serraria com floresta em volta (as árvores nascem depois, então mede-se o bioma), Taverna/Entreposto só em estrada, Santuário longe de estrada, Mina com pedra ou morro. Limites no mapa: Santuário 3, Forte 3, Torre 4 (`POI_GEN.limit`). Cada slot insiste no tipo sorteado por até `WANT_TRIES` tentativas (senão os pequenos, que cabem em qualquer terreno, venceriam sempre). Estradas de ligação só para Fazenda, Taverna e Entreposto, até a estrada **mais próxima**. **A geração roda antes dos acampamentos, grutas e baús** (`genPOIs`, `poi.js`), que se desviam dos POIs. Grandes (`POI_BIG`: Fazenda, Taverna, Entreposto) aceitam desnível até 16 e são aplainados com rampa de 5. Passada de preenchimento até `min(cidades × POI_GEN.fill + 4, maxTyped=25)` POIs. **Limites** (`POI_GEN`): máximo por tipo (`limit`: Fazenda 5, Mina 4, Serraria 4, Caçadores 3, Santuário 3, Forte 3, Torre 4, Taverna 3, Entreposto 3; Taverna+Entreposto de 2 a 5), mínimo por tipo (`min`, tentado numa passada final se houver lugar válido) e teto do tipo principal por bioma (`biomeCap`: Planície Fazenda 5, Floresta Serraria 4, Montanha Mina 4; neve e deserto 2 por tipo, `snowCap`). Com ruínas e pontes o mapa fecha em até ~30 (de 23 a 29 em 18 testes de semente × bioma dominante). `POI_GEN.first`: o tipo principal do bioma dominante (3 unidades) entra antes de tudo; Fazenda, Taverna e Entreposto aceitam até 15% de água na área (`spotOK`, parâmetro `wet`: o nivelamento aterra a poça). Teste: `?auto=1&mute=1&seed=11` (de 21 a 29 POIs nas sementes testadas; ajuste `POI_RANGE`/`POI_GEN`).
- **Falta jogar:** balanceamento (bandidos, preços, renda), bandidos novos atirando, interiores novos e o forte em tela.
- **Pontas soltas:** negociar POIs (comprar/trocar/doar) na tela de Negociação (a tela existe; falta o menu de POIs), POIs de guerra nos buracos do mapa (com a guerra).

### Estado atual dos POIs (2026-11-20, vindo de `docs/ESTADO.md` e `docs/MAPA.md`)
- **Código:** `js/pois.js` (`POI_DEFS`, `POI_TYPES`, `POI_BUILD`, `genWorldPois`, `bridgeSpots`, `POI_GEN`/`POI_W`/`POI_RANGE`) e `js/poigame.js` (`POIX`, `POI_PRICE`, `poiLvl`, serviços `SVC`, entreposto `poiPosts`/`poiRouteBlocked`, santuário `poiHasSanc`/`poiSancPeace`/`poiSancDelay`, caçadores `poiHuntLoot`/`poiHuntPen`); Negociação em `js/negoc.js`. `SAVE_VERSION = 21`.
- **Tarefa 10 (fechamento) pendente:** tabela de tipos (feita acima), `?cenario=pois` com os tipos lado a lado, smoke e roteiro de teste.
- **Entreposto:** "no caminho" = a até `POIX.post.reach` (45) da linha entre as cidades; a geração grava `p.road=[idA,idB]` nos POIs de estrada. Materiais do lojista com estoque limitado (`POST_STOCK_MULTIPLIER`, `postStockLeft`); tela em abas com Venda (`postSellTab`) e "?" de preço (`postPriceTag`); preços e valor de venda seguem a facção da cidade de referência.
- **Atualizações dos POIs (2026-11-20, `docs/features/1_atualizacoes-POIs.md`, tarefas 1 a 5 feitas):** retomada de POI livre sem decisão e redutor de guerra, torre com vigia única (`poiVigil`, `STATE.poiX.marks`), estoque do entreposto, e moradores contados da rodada da limpeza (`STATE.poiX.conq`). Números novos em `js/modifiers/` e textos em `js/texts/`.
- **Geração:** Mina quase não nasce em planície (sem pedra); Serraria e Entreposto saem pouco; mapas de 6 cidades ficam em ~23 POIs. Ajuste `POI_GEN`/`POI_RANGE`. Teste: `?seed=11&bio=plains` (biomas: `plains`, `forest`, `mountain`, `snow`, `desert`).
- **Saves antigos:** o mundo é regenerado pela semente, então estradas e POIs mudam de lugar (sem `SAVE_VERSION`).
- **Smoke:** a falha intermitente de "moradores na rodada N+1" era o sorteio de retomada dos bandidos durante o `endRound`; o teste agora fixa `Math.random`.
- **Quase tudo checado só por script/console; falta jogar:** bandidos novos atirando, interiores, forte, balanceamento de renda e preços; POI de guerra sem guerra não testado.

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
**Próximo passo:** fechar a tarefa 10 dos POIs e jogar para balancear (`POIX`, `REB`, `rebWaveSpec`, `FEV`, `FSUP`, `ECON`); depois a guerra, a partir do item 2.
Legenda: ✅ implementado · 🔶 parcial · ⬜ não implementado. (Atualizado em 2026-11-20; "implementado" = checado por script ou console, quase nada foi jogado na tela.)

**A. Fundação**
1. ✅ POIs permanentes com dono, efeito e uso na paz
2. ✅ Nível da facção (1 a 5, `rd.lvl`) e nível de cada cidade sua (1 a 5, `rd.clv`) com efeito; evoluir pelo livro (2026-11-21, ver features 16 e 35). Os pontos de líder da guerra ainda faltam (usarão `facLvl()`)
3. ✅ Objeto `WAR` (`js/modifiers/war-modifiers.js`) e estado `STATE.war` (`js/war.js`, `SAVE_VERSION = 22`); só dados, sem comportamento ainda
4. ⬜ Cenário `?cenario=guerra` (rota fechada)

**B. Núcleo (a campanha jogável)**
5. ⬜ Operações no turno do Líder (ataque, defesa)
6. ⬜ Locais proibidos
7. ⬜ Cabo de guerra
8. 🔶 POIs removíveis / de guerra (existem no mapa manual; falta gerar no mundo)
9. ⬜ Batalha final da cidade com pontos de nascimento escolhidos
10. ⬜ Relatório e aviso de guerra

**C. Pressão**
11. ⬜ Defesa reativa
12. ⬜ IA do inimigo por temperamento
13. ⬜ Condição de derrota; fadiga do jogador e dos NPC

**D. Economia e espionagem** (pode ficar depois da E)
14. ⬜ Logística (marcos da fadiga)
15. ⬜ Espiões e sabotagem
16. ⬜ Sabotagem dos NPC

**E. Aliados e diplomacia** (a Negociações é útil sozinha e pode vir antes)
17. ⬜ Soldados aliados e do inimigo nas batalhas
18. ⬜ POIs de aliados
19. ⬜ Destino dos POIs no fim da guerra
20. 🔶 Tela de Negociações (existe: aliança, relação, paz, guerra; falta o menu de POIs)
21. 🔶 Mover declaração de guerra e paz das políticas (já estão na Negociação; falta remover as políticas antigas)
22. ⬜ Novas mecânicas de caravana (falta a lista do usuário)
23. ⬜ Caminho por terra, se preciso

### Lista de features (tabela numerada)

| # | Feature | Estado | O que falta |
|---|---|---|---|
| 1 | Tipos de POI (fazenda, mina, serraria, caçadores, santuário, ponte, forte, torre, taverna, entreposto, ruínas), com dono e bandeira | ✅ | Feito |
| 2 | Geração por anel, estrada e interior, com limites e pesos por bioma | ✅ | Ajustar mina em planície e serraria e entreposto, que saem pouco |
| 3 | Mapa 704, com 6 a 8 cidades | ✅ | Feito |
| 4 | Guarnição de bandidos (4 tipos novos), retomada pelos bandidos (POI livre sem decisão: 50% bandidos, 50% facção mais perto; POIs seus: sorteio por distância, ×0,5 em guerra) | ✅ | Jogar: bandidos atirando e balanceamento da retomada (`WAR_RETAKE_MULTIPLIER`) |
| 5 | Cartão "Terras livres" (anexar, doar, vender, ignorar) | ✅ | Negociar POIs na tela de Negociação (comprar, trocar, doar) |
| 6 | Renda e produção por rodada (1 + nível) e pedágio da ponte (20 × nível) | ✅ | Balancear (a produção pode ficar alta com o nível do líder) |
| 7 | Moradores e serviços (ferreiro, bigorna, mercenário, taverneiro, lojista) | ✅ | Ok |
| 8 | Torre (vigia e binóculo) e quarto da taverna | ✅ (torre: vigia única, 1 uso por torre por rodada, marca o ponto mais perto, marcas "?" salvas) | Ok |
| 9 | Entreposto (loja em abas, venda, "?" de preço, estoque limitado de materiais, renda por caravana, bloqueio em guerra) | ✅ | Ok |
| 10 | Santuário (humor e rebelião) | ✅ | Efeito de guerra parado até a fadiga existir |
| 11 | Ruínas (guardiões que voltam, baú único com 30% de artefato) | ✅ | Ok |
| 12 | Caçadores (couro, carne, penalidade em guerra) | ✅ | O efeito de guerra depende do suprimento de guerra |
| 13 | Reparo do colete no Quartel | ✅ | Ok |
| 14 | Pontes sobre a água (estrada atravessa, pilares, corrimão, pedágio em trecho reto) | ✅ | Ok |
| 15 | Negociação (menu estilo celular: aliança, relação, paz, guerra) | ✅ | Menu de POIs |
| 16 | Nível da facção com efeito (ações por rodada; pontos de líder, +1 em guerra) | 🔶 | Ações por rodada prontas; faltam os pontos de líder da guerra |
| 17 | Objeto `WAR` e estado de guerra | ✅ | Só dados; os números são ponto de partida e as operações vão usá-los |
| 18 | Cenário `?cenario=guerra` | ⬜ | Tudo |
| 19 | Operações no turno do Líder (ataque, defesa, sabotagem, reduzir fadiga) | ⬜ | Tudo |
| 20 | Locais proibidos no turno do Comandante | ⬜ | Tudo |
| 21 | Cabo de guerra (proporção de POIs controlados) | ⬜ | Tudo |
| 22 | POIs de guerra (acampamento fortificado e trincheira) | 🔶 | Existem só no mapa manual; gerar nos buracos do mapa e testar sem guerra |
| 23 | Conquistar POI limpando soldados | 🔶 | Só para POIs de bandidos; falta para POIs inimigos |
| 24 | Batalha final da cidade | ⬜ | Tudo |
| 25 | Pressão do inimigo e defesa reativa | ⬜ | Tudo |
| 26 | Guerra de defesa e retaliação limitada | ⬜ | Tudo |
| 27 | Fadiga de guerra (jogador 0 a 20; simples para NPC) | ⬜ | Tudo |
| 28 | Logística da guerra (marcos 5, 10 e 15 aumentam as necessidades) | ⬜ | Tudo |
| 29 | Espiões e sabotagem | ⬜ | O desenho em si |
| 30 | Aliados e inimigo com soldados nas batalhas | ⬜ | Tudo |
| 31 | Fim da guerra (destino dos POIs, paz que afeta todas as facções) | ⬜ | Tudo |
| 32 | Condição de derrota | ⬜ | Definir regras |
| 33 | Novas mecânicas de caravana | ⬜ | Falta a lista do usuário |
| 34 | Mover declaração de guerra e paz das políticas para a Negociação | 🔶 | Já estão na Negociação; falta remover as políticas antigas |
| 35 | Evolução da facção e das cidades | ✅ | Balancear `LVL` jogando. Regras abaixo.

### Descrição e regras das features
4. Os bandidos podem tomar os POIs nas seguintes condições:
- Se o jogador esvaziou e não fez nada com o POI depois (anexou, vendeu ou doou). Ao encerrar o turno do Líder ele é retomado (50% bandidos, 50% a facção mais perto) do POI que não é a do jogador.
Exemplo 1: na rodada 3 o Comandante esvaziou um POI de torre de de forte. Depois encerrou o turno e começou a rodada 4. Como ele só conseguia escolher um POI para fazer uma ação, optou por anexar o Forte, fazendo com que o card para decidir sobre a torre sumisse. Então o jogo decide que aquele POI vai ser retomado por bandidos e, ao encerrar o turno do líder, os inimigos reaparecem no POI da torre. 
Exemplo 2: mesmo exemplo, só que a facção mais próxima toma o POI para si.
- Se o POI está muito longe da cidade mais próxima da facção, a chance aumentará dela ser tomada por bandidos. O cálculo já é feito no código.
Exemplo 1: na rodada 3 o Comandante conquistou um Santuário do outro lado do mapa e encerra o turno. Na rodada do Líder ele opta por anexar aquele POI. Porém passa ao passar as rodadas, há uma grande chance de bandidos tomarem aquele POI de volta. 
Exemplo 2: na rodada 3 o Comandante conquistou uma Taverna perto de uma cidade sua e encerra o turno. Na rodada 4, no Líder, ele não consegue anexar por faltar pontos ou por já ter decidido sobre outro POI. Ao encerrar o turno do Líder, uma facção assume aquele POI ao invés dos bandidos. Entretanto, por sua cidade estar muito longe, a chance de bandidos tomarem o POI aumenta e na rodada 6 ele é capturado. 
- Simplesmente tomarem por sorteio. O cálculo já existe no código. Inclusive esse sorteio deve acontecer na guerra também (com chances menores), afetando os lados.

8. A torre de vigia atualmente está podendo encontrar 3 POIs por rodadas. Se eu tiver 2, posso encontrar 6. Quero limita-la para apenas 1 por torre por rodada. Então cada torre poderá ser usada apenas uma vez. Se o jogador tiver 2 torres, poderá ir em uma, marcar o POI, então ela ficará inutilizável, depois ir em outra e fazer o mesmo.

16 e 35. **Evolução da facção e das cidades (2026-11-21; plano em `docs/features/2_evolucao-faccao-cidade.md`).**
- **Facção (nível 1 a 5, `rd.lvl`, `LVL.facMax`):** dá +1 ação do líder por rodada por nível (`maxActions()`), a partir da próxima rodada. Subir custa ouro e recursos (`LVL.facCost`) e exige (`LVL.facReq`, soma os anteriores): 2→3 **2 POIs**; 3→4 **3 cidades** (com a capital); 4→5 **3 cidades no nível máximo**. Até a guerra existir, 3→4 e 4→5 só no modo criativo (`polTakeCity`). Regras em `js/modifiers/`: `facReqState`, `facUpWhy`, `canFacUp`, `facCostOf`.
- **Cidade (nível 1 a 5, `rd.clv[id]`, `LVL.cityMax`):** só do jogador, capital incluída (NPC não evolui). Visual: 1 sem muros, 2 cerca, 3 paliçada sem atiradores, 4 paliçada com atiradores, 5 muralha de pedra com atiradores (`CITY_WALL_BY_LEVEL`, `CITY_SENTRY_COUNT`). Cada nível acima do 1 dá +`LVL.cityProd` de produção e +◉`LVL.cityTax` de imposto (também no estoque da loja e no poder). Custo: `CITY_UP_COST` (`cityCostOf`). Capital sem entrada em `clv` herda o `rd.lvl` antigo.
- **Limites:** 1 nível de facção por rodada (`rd.facUpR`) e 1 nível de cidade por rodada, em 1 cidade só (`rd.cityUpR`); cada evolução gasta 1 ação do líder (`ECON.act.capital`/`city`), só no turno do Líder e sem dívida. Pode evoluir facção e cidade na mesma rodada.
- **Telas:** aba **Facção** (checklist ✔/✘ de custo e requisitos, botão `cap`) e aba **Cidades** (bloco "Evoluir a cidade", botão `cityup`, que refaz o muro na hora com `cityWallRebuild`). Avisos: toast ao clicar e linha no relatório da rodada (`rdNow`); textos em `js/texts/`.
- **Como testar:** `?auto=1&mute=1&seed=11`, turno do Líder: evoluir a capital (muro novo, ouro e recursos gastos, `rd.cityUpR`); tentar uma 2ª cidade na mesma rodada (bloqueia) e na seguinte (pode); facção 2→3 sem POIs (bloqueia com "Faltam requisitos"), anexar POIs/cidades e subir; nível máximo (sem botão); save antigo (capital nível 3 vira 3). Smoke: `lvl`, `lvlFx`, `cityUp`, `facUp`. Falta jogar uma partida (rodadas 1 a 5) para calibrar `LVL`/`CITY_UP_COST` contra a renda.

9. O estoque deve ser limitado, menor que os das lojas inclusive.

O restante ainda será especificado a medida que forem sendo implementados.



## Ideia de teste
O **cenário controlado** (rota fechada com eventos pré-definidos), anotado na Fase 5, é ainda mais útil aqui: guerra é difícil de testar começando do zero. Ver `?cenario=caravanas` como modelo.

## Pontes e estradas sobre a água
- **Estrada:** `carveRoad` (`world.js`) atravessa a água quando compensa: custo extra por célula de água `ROAD_WATER` (1; antes 6). Se o trecho de água passar de `ROAD_SPAN_MAX` (48 blocos), refaz o trajeto com o custo antigo (`ROAD_WATER_OLD`, contorna se der). As ligações dos POIs (Fazenda, Taverna, Entreposto) continuam só por terra.
- **Registro:** cada trecho de água vira um item de `WORLD.bridges` `{id, tiles, len, wi, we, road, toll}`; `tiles` inclui a cabeceira (`BRIDGE_HEAD`, 3 blocos de terra em cada ponta); `wi`/`we` = primeiro/último tile de água. `WORLD.bt` (mapa `índice → {h0}`) marca os tiles `T_BRIDGE` e guarda a altura original do leito.
- **Física × visual:** o terreno (`H`) continua sólido na altura do tabuleiro (`SEA+1`): jogador, NPCs e caravanas andam como antes (nadar embaixo esbarra numa coluna invisível). `meshTerrain` não desenha a coluna: `meshBridgeWater` faz tabuleiro de tábuas, borda e fundo, leito por baixo, pilares nas bordas (a cada 6 tiles) e as paredes do vizinho voltadas para o vão (sem elas o terreno ao lado ficava furado); `bridgeRails` faz o corrimão **com colisão** (`Col.add`; `WORLD.noRail` abre vãos, ex.: em frente à guarita). Na cabeceira (terra) só o corrimão, com lateral de pedra. **Largura: 5 tiles** (`BRIDGE_R` 2,5; cabem 2 personagens lado a lado); a cabeceira tem a mesma largura e nivela um pouco de terra ao lado.
- **Pedágio:** só as `POI_GEN.bridgeToll` (3) pontes mais longas, com vão mínimo `bridgeMin` (12) e distância mínima `bridgeGap` (90), viram POI `bridge` (`bridgeSpots`, `pois.js`): no meio do vão, de preferência num pedaço reto; grava `WORLD.bridges[i].toll = id do POI`. As outras pontes não são POI e não gastam a cota. O POI desenha só o pórtico (uma cancela de cada lado, vão de 1,8 no meio) e a guarita, 7 blocos depois do pórtico, no lado + da pista, sobre base de pedra que desce até o leito e vira calçada colada ao tabuleiro; a porta olha para a pista e o corrimão abre ali.
- **Falta jogar:** visto na tela só na seed 11 (floresta). Andar e correr na ponte, NPCs no corrimão (colisão de 2,4), nadar por baixo (coluna invisível) e pesca perto. Mapas com 0 a 3 pedágios. Detalhes de teste abaixo.
- **Como testar:** `?auto=1&mute=1&seed=11&bio=forest`; no console `WORLD.bridges` (len, toll) e `WORLD.pois.filter(p=>p.type==='bridge')` (no máximo 3). Dar um passeio sobre a ponte e olhar de baixo (nadando). `node tests/smoke.js` confere o registro e o teto.
- **Corrimão e caravanas:** a caixa de colisão do corrimão tem 2,4 de altura (o desenho tem 0,9): ninguém sobe nele nem pula para a água. As caravanas decorativas (`roadSpot`, `caravans.js`) só param em estrada de terra (`T_ROAD`), nunca sobre ponte, por enquanto.
- **Pedágio só em trecho reto:** `bridgeSpots` exige ponte reta de 2 tiles antes do pórtico até 11 depois (a guarita fica a 5 blocos do pórtico, no sentido `p.vs`, encostada no tabuleiro); o vão do corrimão tem 4 tiles, só em frente à porta. Com isso algumas pontes curtas ou tortas ficam sem pedágio (há mapas com 0 a 3). `meshBridgeWater` também fecha a parede do leito voltada para vizinhos mais fundos (antes ficava aberta). Verificação feita com raios (THREE.Raycaster) contra as malhas do terreno: 0 furos em 5 sementes.
