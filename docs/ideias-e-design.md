# Fronteira Cúbica — Ideias e design (rascunho vivo)

Este arquivo reúne as ideias da próxima grande fase do jogo, com análise de dificuldades, alternativas e perguntas em aberto.
**Nada aqui foi implementado.** Será atualizado conforme as próximas conversas (rodadas, relações entre facções e guerra ainda serão descritas).

---

## 0. Estado atual do jogo (base de partida)

- Mundo procedural a partir de uma semente: 7 cidades (a do jogador + 6 inimigas com nível 1–6), acampamentos de bandidos, grutas, baús escondidos, bandos de animais selvagens (lobo, urso, aranha, javali, escorpião).
- Guerra "do nada": o jogador escolhe uma cidade inimiga, aperta F e invade. Cidade conquistada vira do jogador.
- Economia simples: moedas, loja do armeiro, clínica, quartel (recrutar e melhorar soldados), quadro de missões (acampamento, refém, entrega).
- Preço varia por cidade (cidade inimiga ×2, conquistada com desconto). **O novo sistema de suprimentos substitui esses descontos.**
- Sem inventário, sem itens, sem salvar/carregar (o mundo é regerado pela semente).
- Modos: normal e criativo (truques de teste só no criativo).

---

## 1. Fundações (precisam existir antes do resto)

### 1.1 Estado do jogo serializável + salvar/carregar
Hoje tudo nasce da semente. Com inventário, suprimentos, facções e rodadas, **é obrigatório salvar o estado**.

- Criar um objeto único `STATE` (JSON puro): inventário, moedas, rodada atual, facções, relações, estoques por cidade, rotas comerciais, durabilidade das armas, missões ativas, cidades conquistadas, acampamentos limpos etc.
- Salvar = semente + `STATE` (+ "deltas" do mundo: o que despawnou, o que mudou de dono).
- Persistência: `localStorage` (limite ~5 MB, suficiente) ou exportar/importar arquivo.
- **Dificuldade:** objetos de cena (meshes, NPCs, inimigos) não são serializáveis; o estado precisa ser a fonte de verdade e a cena ser reconstruída a partir dele. Vale desenhar isso desde o início.

### 1.2 Tabelas de dados (data-driven)
`ITEMS`, `RECIPES`, `RESOURCES`, `FACTIONS`, `BUILDINGS`, `QUEST_TYPES`. Facilita balancear sem mexer em lógica.

### 1.3 Base de UI
Hoje os painéis são DOM puro, um a um. Com inventário, comércio, gestão de cidade, diplomacia e mapa estratégico serão muitos painéis. Vale criar helpers (janela, grade de slots, tooltip, abas) e CSS compartilhado.

### 1.4 Teclas
Já em uso: WASD, Shift, Espaço, C, R, E, F, M, K, U, 1–6, Esc/Tab/O (pausa). Criativo: G, I, N, P.
Sugestão: **B** ou **I** para inventário (a tecla I do "invisível" passaria a outra letra, já que é só do criativo).

---

## 2. Sistemas de jogador (itens, inventário, cura, cozinha, durabilidade)

### 2.1 Inventário
- Grade de slots (ex.: 30) com pilhas; peso opcional (provavelmente desnecessário).
- Barra rápida para consumíveis (teclas 7–9 ou Q).
- **Dificuldade:** baixa/média; é a base de tudo (itens, cura, cozinha, pesca, venda).
- Ícones: no início, emoji ou ícones pintados em canvas; depois, miniaturas dos modelos voxel renderizadas em canvas.

### 2.2 Sistema de itens
Tipos sugeridos:
- **Matéria-prima:** peixe cru, carne, grãos, madeira, minério, couro, ervas.
- **Consumíveis:** curas, comidas cozidas.
- **Troféus/loot:** dropam de animais e bandidos; servem para **vender** ou **melhorar equipamentos** (componentes de upgrade).
- **Itens de missão.**
- **Alternativa:** manter itens de upgrade separados (peças de arma) ou usar um recurso genérico "sucata". Mais tipos = mais variedade e mais balanceamento.

### 2.3 Itens de cura
- Bandagem (cura rápida, pouca), kit médico, ervas (cura lenta ao longo do tempo), poções/chás, comidas cozidas.
- Hoje a vida **não regenera** e só a clínica cura. Itens trazem autonomia, mas é preciso cuidar para não banalizar a clínica (ex.: itens limitados, uso com tempo de animação, ou cura parcial).
- Ligação com suprimentos: dinheiro zerado bloqueia a clínica ⇒ itens de cura viram o plano B.

### 2.3 Cozinhar
- Receitas combinam matéria-prima em pratos com **bônus**: cura maior, resistência, velocidade, estamina, dano contra animais, etc. Bônus temporários (buffs) com duração.
- Locais: fogueira de acampamento, taverna, cozinha de casa/cidade.
- Pode ser uma pequena interação (ex.: colocar ingredientes e esperar/mexer) sem minigame complexo.
- **Dificuldade:** média (receitas + buffs + UI). Os buffs exigem um sistema de efeitos temporários (hoje só existe veneno do escorpião).

### 2.4 Durabilidade das armas
- Cada arma perde durabilidade ao atirar; baixa durabilidade ⇒ mais travamento/menos dano/menos precisão; zero ⇒ quebrada.
- Conserto no armeiro custa **minérios** (regra do sistema de suprimentos) ou itens.
- **Cuidado de design:** é a mecânica que mais gera frustração. Sugestão: perda lenta, aviso claro, quebrar só em casos extremos, reparo barato nas cidades próprias.

---

## 3. Atividades que não são tiro (dar "vida" ao personagem)

Ideia central: **cada atividade alimenta um recurso do sistema de cidades**, assim elas têm propósito:

| Recurso | Atividades que produzem |
|---|---|
| Alimentos | Pesca, caça, colheita nas plantações, cozinhar |
| Madeira | Cortar árvores, serraria |
| Minérios | Mineração em grutas/dungeons, ferreiro |
| Dinheiro | Missões, vender itens, comércio, jogos de taverna |

### 3.1 Pesca
- Já existem água, rios e mar. Minigame simples: lançar, esperar a mordida (sinal visual/sonoro), puxar no tempo (barra de tensão).
- Peixes por bioma/água/hora do dia (rio vs mar vs lago; raros à noite).
- Vara de pescar como "arma" na barra rápida.
- Peixe cru ⇒ vender, cozinhar, alimentar a cidade.
- **Dificuldade:** média (modelos de peixe, minigame, UI). Sons já têm ambiente de água (o som foi removido por irritar, mas o sistema existe).

### 3.2 Outras atividades possíveis
- Cortar lenha, minerar, colher plantas/ervas, cultivar na horta da cidade.
- Caçar (já existem animais e a briga com NPCs).
- Entregar encomendas, escoltar carroças, jogos na taverna (dados/cartas), festivais (gastar dinheiro).
- Consertar casas (madeira), treinar soldados, pequenos desafios de corrida/tiro ao alvo.
- Fotografar animais (colecionável) — barato e charmoso.

---

## 4. Mundo e conteúdo

### 4.1 Mais edifícios úteis
Taverna (cozinhar, descansar, boatos, missões), armazém (estoque e rotas), mercado (vender itens), serraria, mina, fazenda/moinho, ferreiro (reparar/melhorar), estábulo/estação de carroças, cais de pesca, torre de vigia (avisa raids), templo (festival), salão de diplomacia (decisões do líder).
- **Dificuldade:** geração de cidade já é complexa (vagas especiais, `spRects`, `cityDecor`). Cada prédio novo precisa de modelo, vaga, interação e lógica. Sugestão: poucos prédios multifuncionais primeiro (taverna, armazém, ferreiro).
- Os prédios podem **determinar o foco da cidade** (fazenda ⇒ foco alimentos; serraria ⇒ madeira etc.).

### 4.2 Raids de bandidos nas cidades
- Bandidos (e bandos de animais) atacam uma cidade; o jogador defende com soldados.
- Gatilhos: rodada, fraqueza da cidade (poucos soldados, suprimentos baixos), proximidade de acampamentos.
- Aviso prévio pela torre de vigia. Resultado: perda de suprimentos, mortes de civis, rebeliões por insatisfação se falhar.
- Já existe base de IA (soldados, animais, briga entre NPC e animais). Falta definir "onde nascem" e a lógica de rodada.
- Raios também podem **atacar rotas comerciais**.

### 4.3 Carroças (viagem rápida)
- Teleporte entre cidades **conectadas**: só facções ao menos neutras; o caminho não pode ter facção inimiga (mesma regra das rotas).
- Variações: (a) apenas fade + passar tempo; (b) viagem com evento aleatório (emboscada); (c) carroças visíveis nas estradas (NPCs com carroça) — bonito, mas caro de fazer.
- Custo em dinheiro ou tempo (avança relógio/rodada).
- Pode ser o mesmo "pacote" das rotas comerciais.

### 4.4 Dungeons subterrâneas procedurais
Ainda a decidir como encaixam. Possibilidades:
- Entradas nas grutas atuais e em ruínas; interior gerado por salas + corredores (BSP ou caminhada aleatória).
- **Como implementar tecnicamente:** os arrays `H/T/B` são globais W×W. Caminhos:
  1. **Região reservada** dentro da grade (um canto selado de ~100×100) onde a dungeon é gerada ao entrar; mais simples; reaproveita física, navegação, colisão.
  2. **Trocar o mundo** (salvar o atual, gerar outro): mais limpo, bem mais trabalhoso.
  - Recomendação: opção 1.
- Papel no jogo: **fonte de minérios**, loot raro, chefes, relíquias. Dificuldade escala com a profundidade.
- Equilibrar com as grutas atuais (hoje têm baú + lobos/urso).

### 4.5 Tática antes de invadir cidades
- Hoje todos os soldados nascem do mesmo lado. Proposta: tela de planejamento com **pontos de entrada** (portões, muralha, rio), divisão do exército em grupos e ordem de chegada.
- Níveis de profundidade: (a) escolher 1 de N pontos de partida; (b) dividir em 2–3 pelotões com alvos; (c) reconhecimento (espiões revelam defesas).
- Dificuldade: a IA dos aliados hoje segue o jogador (`armyAssault`). Precisaria de ordens simples por pelotão (ir ao ponto X, atacar torre Y).
- Pode ser feita **dentro da fase "líder"** (decisões) com consequências para o comandante.

### 4.6 Missões diferenciadas
Escolta de carroça, defesa de raid, caçar fera específica, entrega de suprimentos, sabotar suprimentos inimigos, espionagem, encomenda de pesca/comida, resgatar facção aliada, missões diplomáticas. Muitas podem usar as mecânicas já existentes (acampamento, refém, entrega).

---

## 5. Sistema de facções (o mais complexo)

### 5.1 Dois personagens
- **Líder:** toma as decisões estratégicas (declarar guerra, alianças, rotas comerciais, distribuição de suprimentos, festivais, política de recrutamento).
- **Comandante** (o que jogamos hoje): executa em campo e **lida com as consequências**.
- Sugestão de implementação: o líder é uma **camada de interface** (mapa estratégico/sala de guerra num prédio da capital) e não um personagem jogável separado; entre "rodadas" você decide como líder; durante as rodadas você joga como comandante.
- **A definir (próxima conversa):** como funcionam as rodadas.

### 5.2 Facções e cidades
- Facções podem ter várias cidades. Hoje cada cidade inimiga é independente. Proposta: no gerar mundo, agrupar cidades em facções (nome, cor, bandeira, personalidade).
- O dono da cidade vira um **`factionId`** (em vez de `owner: 'enemy'|'player'`). Muda código em vários lugares (mapa, HUD, preço, aliados).
- Níveis e dificuldade de invasão continuam por cidade.

### 5.3 Relações
| Relação | Efeito |
|---|---|
| **Neutra** | O jogador anda livremente pelas cidades. |
| **Inimiga** | Não pode entrar; se entrar, soldados ficam hostis e atacam. |
| **Aliada** | Anda livre, ganha benefícios no comércio e **soldados aliados participam das guerras**. |

- Sugestão técnica: guardar um valor de relação (−100 a +100) com faixas (inimiga / neutra / aliada), em vez de 3 estados fixos. Ações melhoram/pioram (ajudar em raid, atacar aliado, rota comercial, missões).
- "Inimiga": o jogador entrando em cidade proibida precisa de **detecção de zona** (já há `G.curCity` e muralha/portões). Pode ter aviso e tempo de tolerância.
- Aliados na guerra: soldados do aliado nascem junto com os seus (precisa modelo de exército por facção e quantidade).
- **IA das outras facções:** simulada de forma abstrata por rodada (força, recursos, relações) e só "materializa" na cena quando você está perto/participa.

---

## 5B. Sistema de rodadas (o "refresh" do mundo)

### Ideia
Uma **rodada (mês)** é o ciclo que faz o mundo "andar". Ela alterna duas fases:

1. **Fase do líder:** toma as decisões (preços, políticas, alianças, rotas, prioridades...).
2. **Fase do comandante:** o mundo é "atualizado" com as consequências das decisões do líder **e** das outras facções; o comandante (o jogador atual) cumpre tarefas no mundo.
3. **Encerrar o mês:** quando terminar o que quer fazer, o jogador vai à **prefeitura** e "encerra o mês". Volta à tela do líder, que decide de novo.

Exemplo dado: se o líder decidiu que alimentos ficam mais baratos na capital, ao gerar o mundo da rodada os alimentos estarão mais baratos nela.

### O que o "refresh" gera a cada rodada
- **Acampamentos de bandidos**, agora **em quantidade limitada**.
- **Recursos explorados** (nós de pesca, madeira, minério, ervas etc.) também **limitados**.
- **Missões** limitadas.
- Preços e ofertas conforme as decisões do líder e o foco/necessidade das cidades.
- Eventos das outras facções (guerras, alianças, raids, rotas, rebeliões).

### Missões típicas do comandante (para manter a vila "alinhada")
- **Suprir os recursos** da cidade.
- **Eliminar bandidos ao redor das caravanas** (rotas comerciais).
- **Resgatar reféns.**
- **Organizar o arsenal e o batalhão** (equipar, melhorar, recrutar).
- **Defender a cidade de raids.**

### Antiabuso: nada de farm infinito
- A quantidade de **suprimentos disponíveis para comprar é limitada** por rodada.
- **Vender também é limitado:** os vendedores **ficam sem ouro** em certo ponto.
- O ouro precisa ser dividido entre **upgrades** e **a cidade**. O jogador precisa **priorizar**.

### Encerrar o mês (resolução)
Sugestão do que acontece ao encerrar:
1. Consumo e produção de suprimentos de cada cidade (consumo base × necessidade%).
2. Checagem de debuffs, instabilidade e rebeliões.
3. Simulação abstrata das outras facções (relações, guerras, rotas).
4. Eventos agendados (raids, festivais).
5. **Relatório do mês** (tela de resumo: o que mudou, o que faltou, alertas).
6. Volta para a fase do líder.

### Notas técnicas e alternativas
- **"Gerar o mundo" não deve refazer o terreno.** Terreno, cidades e estradas persistem (semente fixa). O que muda é uma **camada dinâmica**: acampamentos, baús, bandos, nós de recursos, missões, estoque e ouro dos vendedores, preços. Cada camada é gerada por `(semente, nº da rodada, estado)`, o que é reproduzível e combina com salvar/carregar.
- Hoje já existe base pronta: acampamentos reaparecem depois de 2 dias de jogo e despawnam quando concluídos; baús escondidos são fixos. Passaria a ser controlado pela rodada.
- **Duração da rodada:** duas opções.
  - **Sem limite de tempo** (o jogador decide quando encerrar): simples, mas permite fazer tudo com calma; a pressão vem só dos limites (suprimentos, vendedores, missões) e dos raids.
  - **Com relógio** (ex.: N dias de jogo por mês, usando o ciclo dia/noite atual; ou pontos de ação): cria pressão e escolhas, mas pode frustrar.
  - Híbrido: sem limite, mas **eventos agendados** durante o mês (ex.: raid no dia X) que acontecem se o jogador demorar ou se encerrar cedo.
- **Raids:** podem ser agendados na rodada (aviso antes) e virar a missão "defender a cidade".
- **Carga de conteúdo:** gerar missões variadas por rodada sem repetição cansativa exige uma boa tabela de tipos e parâmetros.
- **Ritmo:** se o mês acaba rápido, a tela do líder aparece muito; precisa ser leve (poucas decisões por vez, boas sugestões padrão).
- **Prefeitura:** novo edifício (ou ampliar o existente) com interação "encerrar o mês" e acesso à fase do líder. Pode ser também onde se vê o relatório e os suprimentos.
- **Fim de campanha:** pensar em quantas rodadas até acabar (vitória por dominação/diplomacia, derrota se a capital cair, limite de meses opcional).

---

## 5C. Alianças e inimigos (nível de relação)

### Como subir o nível com uma facção

**Como líder** (cada ação **só uma vez por mês**):
- Criar **rotas comerciais** para as cidades daquela facção.
- **Dar uma quantidade de recursos.**
- **Aceitar pedidos** (missões daquela facção).
- **Se juntar a uma guerra** do lado dela.

**Como comandante:**
- Cumprir **missões da facção nas prefeituras dela**.
- **Eliminar bandidos e animais** por perto.
- **Oferecer relíquias** (encontradas em dungeons).
- **Resgatar cidadãos** e **proteger caravanas** dessa facção.

### Como descer o nível
- Fazer **negócios com uma facção inimiga** dela.
- **Declarar guerra.**
- Fazer **missões de outras facções que a prejudicam.**

### Regra de influência entre facções
Ganhar pontos com uma facção pode **custar pontos com outra**. Exemplo: negociar com A, que é inimiga de B, deixa B com mais **desconfiança**.

### Notas de design e dificuldades
- **Modelo:** um valor de relação por par (jogador × facção), de −100 a +100, com faixas (inimiga, neutra, aliada), possivelmente com faixas intermediárias (hostil, desconfiada, amistosa).
- **Grafo entre as facções NPC:** para existir "A é inimiga de B" é preciso gerar relações **entre as facções**, não só com o jogador. Isso pode ser sorteado no mundo e mudar com o tempo (guerras e alianças das rodadas). Sem isso, a regra de desconfiança não tem de onde sair.
- **Efeito colateral:** a mudança de relação com X propaga para os aliados e inimigos de X (sugestão: inimigos de X perdem uma fração do ganho; aliados de X ganham uma fração menor).
- **Limite mensal:** definir se é **uma vez por mês por facção** ou **uma vez por mês no total** (por tipo de ação). Hoje está ambíguo.
- **Comandante sem limite?** As ações em campo (missões, caravanas, relíquias) parecem limitadas pelas missões da rodada e pelo conteúdo, não por contador. Confirmar.
- **Visibilidade:** o jogador precisa **ver** as relações (tela de diplomacia com a lista de facções, relação atual, inimigos e aliados de cada uma, histórico do mês). Sem isso, as consequências parecem aleatórias.
- **Efeito no mundo:** relação muda o que os soldados fazem nas cidades da facção (hostis, neutros, aliados), os preços e quem participa das guerras.
- **Declarar guerra** pode ter **peso grande** (queda forte, aliados da facção também se afastam) e exigir motivo/ultimato.

### Ideias para ampliar o sistema (a pedido: "ainda preciso de novas ideias")
- **Decaimento:** relações voltam devagar ao neutro com o tempo, então é preciso manter a amizade (e as inimizades esfriam).
- **Personalidade das facções:** mercantil (gosta de rotas), militarista (gosta de guerra e caça), religiosa (relíquias), agrária (alimentos). Cada uma valoriza ações diferentes.
- **Pedidos de favores/dívidas:** a facção ajuda e depois cobra; recusar derruba a relação.
- **Tratados:** pacto de não agressão, embargo (corta rotas de um inimigo comum), aliança militar, tributo.
- **Mediação:** usar relação alta com duas facções para fazer a paz entre elas (grande ganho).
- **Casamento/reféns diplomáticos** (opcional) para consolidar alianças.
- **Espiões e sabotagem** (missão do comandante) para prejudicar um inimigo sem declarar guerra.
- **Eventos:** pedido de ajuda de uma facção, traição, ultimato, convite para festival, rumores que o jogador pode confirmar ou desmentir.
- **Reputação visível no mundo:** guardas reagem de forma diferente (cumprimentam, desconfiam, ameaçam); preços e conversas de NPCs mudam.
- **Benefícios por faixa:** aliada dá desconto, passagem livre, soldados na guerra, acesso a itens/receitas exclusivas, carroça gratuita; neutra dá só passagem; inimiga fecha as cidades.

### Possíveis armadilhas
- **Complexidade das consequências:** muitas relações cruzadas podem confundir. Mostrar a causa sempre ("B perdeu confiança porque você negociou com A").
- **Corrida às alianças:** se ser aliado de todos for fácil, o sistema perde graça. O custo de oposição entre facções deve forçar escolhas.
- **Cascata de guerra:** declarar guerra a uma facção pode puxar toda a rede de alianças; precisa de freios e avisos.

---

## 5D. Guerras (campanha, não batalha de minutos)

### Objetivo
Fazer o jogador **estar em uma guerra**, com frentes, pontos e tempo, e não em uma batalha rápida. Hoje a guerra é: apertar F e invadir uma cidade. A proposta transforma isso numa **campanha entre duas cidades**.

### Regras descritas

**Estrutura**
- Só dá para **conquistar uma cidade por guerra**.
- No caminho entre as duas cidades há **trincheiras e barricadas** (do jogador e do inimigo), além de **acampamentos**: os **pontos de controle**.
- A guerra consiste em **atacar os acampamentos e trincheiras inimigos** até chegar à cidade.
- O jogador pode tentar **desviar e ir direto** à cidade, que então estará **extremamente forte**.
- **A cada ponto controlado do inimigo, a cidade fica com menos soldados.**
- **Limite de soldados por tela:** há um máximo ativo, que vai sendo reposto conforme morrem (para o jogo não renderizar "um milhão" de soldados).
- Ao conquistar o último ponto e chegar na cidade, a **batalha final é igual à de hoje**, mas o jogador **escolhe os pontos da cidade onde seus soldados nascem**.
- O jogador pode **conquistar acampamentos sem lutar**, pagando recursos aos soldados. **Quanto mais perto da cidade, mais caro.**

**Recursos e estado de guerra**
- A guerra **gasta recursos**, que podem faltar na cidade. Em troca, a cidade entra em **"estado de guerra"**: **sem debuffs nem rebelião por falta de recursos** enquanto durar.
- A **cidade conquistada** fica muito prejudicada e, se as necessidades não forem atendidas logo, começa uma **rebelião**.

**Missões paralelas (debuffs no inimigo)**
- Atacar **caravanas**, **matar mensageiros**, **sequestrar cidadãos importantes** em cidades fora da guerra, etc.

**Ataques do inimigo**
- O inimigo ataca em **ondas de três ataques**. O jogador recebe um **aviso** de que vai acontecer e escolhe:
  1. **Falhar a missão atual** para se **teleportar** ao local (se estiver em missão).
  2. **"Confio em meus soldados":** abre uma tela para entregar **recursos** ao soldado com uma **meta**; se houver recursos suficientes, **a batalha é ganha**.
  3. **"Entendido":** começa um **timer de 30 segundos** para ir ao local. Se não chegar (ou ignorar), os soldados inimigos tomam o território.
- **Ataques furtivos:** o inimigo conquista um ponto do jogador, e o jogador precisa **recuar um pouco** para reconquistá-lo.
- **Raids de mercenários** na **cidade do jogador mais próxima da guerra**: opções 1 e 3, com **1 minuto**; se ignorar ou não chegar, **perde alguns recursos**.

**Aliados**
- Com aliados na guerra: **desconto no envio de soldados**, **mais soldados** na batalha da cidade, **mais missões**. Em troca, os aliados exigem um **espólio de guerra**.
- Se o **inimigo** tiver aliados: **mais soldados** na cidade, **custo maior** e **mais chance de raids e ataques**.

**Cidades no meio do caminho (não estão na guerra)**
1. **Desvio**, se houver espaço.
2. **Leilão:** a cidade (não a facção) entra na guerra ao seu lado. Se virar aliada, a facção mantém a cidade. Se virar inimiga, ao conquistar o jogador pode **liberar** para a facção original (sobe a relação) ou **tomar a cidade** (gera uma nova guerra).
3. Sem acordo e sem desvio: a cidade **entra na guerra** (mas **não puxa aliados**). Os dois lados precisam conquistá-la.

**Paz** (enquanto houver guerra, **não é possível encerrar a rodada**)
1. Se a guerra foi **declarada pelo jogador** e está **equilibrada**, a paz é concedida. Se foi pelo inimigo, **não**.
2. Se o **inimigo estiver perdendo**, aceita a paz e **paga** em recursos.
3. Se o **jogador estiver perdendo**, a paz é aceita **mediante pagamento** de recursos.

---

### Análise, dificuldades e sugestões

**1. A guerra precisa de um estado próprio (máquina de estados).**
Sugestão de objeto `WAR` (serializável): `{ atacante, defensor, cidadeAlvo, pontos[], forçaPorLado, recursosGastos, aliados, ondas, cronograma, placar }`.
- Fases: **declaração → mobilização → avanço pelos pontos → batalha final → desfecho (conquista / paz / derrota)**.
- Eventos (ondas, furtivos, raids, missões) disparam por um **cronograma** da guerra, não pelo mês.

**2. Conflito de tempo com as rodadas.**
- Se a guerra impede "encerrar o mês", e o mês é a unidade de consumo, produção e relações, o que acontece com o tempo durante a guerra?
- Opções:
  - **A) Tempo de guerra separado:** a guerra tem seu relógio (dias de guerra, 1 dia de guerra = N minutos reais ou "ciclos" de eventos). O mês fica suspenso ("estado de guerra"), por isso não há debuffs.
  - **B) Meses continuam com regras de guerra:** o consumo segue, mas a cidade recebe isenção de debuffs.
  - Recomendação: **A** (mais coerente com "estado de guerra") e garantir que o resto do mundo (relações, outras facções) ande por eventos de guerra.
- Definir também a **duração esperada**: minutos? horas de jogo? O texto fala em "não uma batalha de alguns minutos"; sugiro metas como 1–3 horas por guerra.

**3. Frente de batalha = grafo linear de pontos.**
- Pontos de controle em sequência ao longo do caminho real entre as cidades (4–8 pontos), cada um com dono (jogador/inimigo/neutro), força, tipo (acampamento, trincheira, barricada, ponte, vila) e custo de "compra".
- **Boa notícia: já existe boa base**: acampamentos de bandidos (geração, escavação do terreno, bandeira, população, limpeza, despawn/respawn). Um ponto de controle é uma variante do acampamento com dono e captura.
- **Captura:** limpar os soldados e manter a posição por alguns segundos; a bandeira troca de cor.
- **Caminho:** calcular uma rota entre as duas cidades (estradas já existem, e há A* de navegação) e posicionar os pontos ao longo dela, escavando/aplainando como os acampamentos.
- **Desvio:** o jogador pode ignorar pontos, mas a cidade fica mais forte (cada ponto do inimigo ainda de pé mantém soldados na cidade).

**4. Limite de soldados e reposição.**
- Gerenciar um **teto de soldados ativos** (ex.: 24–40 perto do jogador) com uma **fila de reposição**; os demais são só números no estado da guerra (força).
- Soldados só existem na cena se estão perto do jogador (já há descarte por distância). Reposição ao longe é só contagem.

**5. Ondas, avisos e as três opções.** Pontos importantes:
- **Opção 2 ("Confio em meus soldados")** precisa de uma fórmula **determinística e visível**: `chance/resultado = f(soldados no ponto, melhorias, recursos entregues vs meta da onda)`. Mostrar a meta e o quanto falta. Sem aleatoriedade oculta.
- **Opção 1 (teleporte)** pode reutilizar o conceito de carroça/viagem rápida. Penalizar a missão falha de forma clara.
- **Opção 3 (30 s)** exige UI de contagem e uma marca no mapa/bússola. 30 s só dá para ir a pontos muito próximos; sugestão: o timer varia com a distância (ou o ataque só vem a pontos que o jogador consiga alcançar), senão a opção fica injusta.
- Não sobrecarregar: **limitar a frequência** (cooldown mínimo entre alertas) e **aumentar com a dificuldade/aliados do inimigo**. Muitos avisos cansam.
- **Ataque furtivo:** o ponto fica "contestado" e o jogador precisa voltar; ligar a um indicador no mapa.

**6. Raids de mercenários na cidade mais próxima da guerra.**
- Reaproveita a defesa de cidade e a lógica de bandos/raid. Perder "alguns recursos" precisa de regra (porcentagem do estoque? lista?).

**7. Missões paralelas.**
- Cada missão remove um **bônus do inimigo** (ex.: caravana atacada ⇒ menos suprimento/soldados; mensageiro morto ⇒ ataques mais lentos ou sem coordenação; cidadão importante sequestrado ⇒ moral/relação ou desconto). Registrar os efeitos como **modificadores** no objeto `WAR`.
- Estão em "cidades fora da guerra": cuidado com a relação com aquelas facções (a regra de 5C pode punir).

**8. Cidades no meio do caminho.**
- **Desvio** exige verificar o espaço (rota por terreno livre que contorne a cidade); água e montanhas podem impedir. Sugestão: calcular com o mesmo caminho do A*.
- **Leilão:** precisa de uma regra clara de valor (recursos + relação) e de limite de uma tentativa por guerra. O desfecho "liberar para a facção original" aumenta a relação; "tomar" cria nova guerra, então avisar o jogador.
- **Forçado:** a cidade vira alvo dos dois lados; é uma 2ª conquista dentro da mesma guerra? (Conflita com "só uma cidade por guerra"; sugestão: a cidade forçada é conquistada **como parte** da guerra, sem contar como a cidade-alvo.)

**9. Aliados.**
- Soldados aliados precisam de uma **nova categoria de unidade** (hoje só existem `ALLIES` do jogador, inimigos e NPCs). Aliados da facção aliada ganham cor própria e nascem no ponto de partida.
- Espólio de guerra: definir o que é (um recurso, uma cidade, um valor fixo?) e o que acontece se o jogador recusar.
- Aliados do inimigo aumentam o custo, a força e a chance de ataques (ligar à tabela de eventos).

**10. Batalha final.**
- Mantém a mecânica atual, mas com **seleção dos pontos de nascimento** das tropas: tela de planejamento (mapa da cidade com zonas válidas), ligada ao item "sistema tático" da lista de ideias.
- Quantidade de soldados na cidade: função dos pontos que o inimigo ainda mantém.

**11. Compra de acampamentos sem lutar.**
- Preço cresce com a proximidade da cidade. Pode ser uma forma de "gastar recursos para poupar tempo". Atenção: se for barato demais, ninguém luta; sugerir custo alto e **efeito colateral** (os soldados comprados deixam o ponto frágil a ataques furtivos).

**12. Estado de guerra e recursos.**
- Retirar debuffs/rebelião por recursos durante a guerra simplifica o balanço: o gasto da guerra vira o "custo de oportunidade". Cuidado: o jogador pode esvaziar tudo e o estado de guerra evita punição. Sugestão: **depois** da guerra, a cidade precisa se recuperar (aplica o que faltou), e a cidade conquistada já nasce em crise.

**13. Paz.**
- Precisa de um **placar da guerra** claro (ex.: pontos controlados, força relativa, recursos, moral). Sem ele, "equilibrada" ou "perdendo" fica impreciso.
- Valor do pagamento: proporcional ao placar e ao tamanho das cidades. Mostrar antes de aceitar.

**14. Derrota.**
- O texto não define a **derrota do jogador**. Sugestões: se o inimigo conquistar todos os pontos do jogador e vencer a **batalha de defesa** da cidade do jogador, o jogador **perde a cidade** (ou paga tributo/capital cai?). Definir.

### Fatiamento sugerido para implementar a guerra
- **G1 — Guerra mínima:** objeto `WAR`, frente linear de 3–5 pontos (reaproveitando acampamentos com dono), captura, redução de soldados da cidade, batalha final com escolha de pontos de nascimento, uma cidade por guerra.
- **G2 — Pressão do inimigo:** ondas de ataque, avisos, três opções, ataques furtivos, raids de mercenários, teto de soldados com reposição.
- **G3 — Economia da guerra:** gasto de recursos, estado de guerra, compra de pontos, missões paralelas com debuffs.
- **G4 — Diplomacia na guerra:** cidades do meio (desvio/leilão/forçada), aliados e espólio, aliados do inimigo.
- **G5 — Paz e pós-guerra:** negociação, conquista com cidade em crise, rebelião.

---

## 6. Gestão de cidades (suprimentos)

### 6.1 Os quatro suprimentos
| Suprimento | Para quê | Se faltar |
|---|---|---|
| **Alimentos** | Moradores | Soldados recrutados ficam mais fracos que os inimigos, independente de upgrades; não recruta novos nem faz upgrades. |
| **Minérios** | Armas | Não compra armas/munição nem conserta. |
| **Madeira** | Reforma de casas | Tudo custa o **triplo** (sem estrutura). |
| **Dinheiro** | Festivais / felicidade | Não recruta soldados nem se cura; **50% de chance de ser roubado** nas ruas. |

### 6.2 Colapso
- **Dois suprimentos zerados ⇒ rebelião:** a cidade vira **nova facção inimiga do jogador**, ou uma facção vizinha a **absorve**.
- Conforme debuffs surgem, **fumaça sai de prédios** (efeito visual de ruína crescente).
- **Sugestão de suavização:** medidor de "instabilidade" que sobe enquanto houver suprimento zerado, dando algumas rodadas para reagir, com avisos claros (HUD, mensagens do líder/NPC, fumaça fraca primeiro).

### 6.3 Pontos de atenção
- **Modelo de recurso (decisão importante):**
  - **A) Pool global do jogador:** simples, mas rota comercial e carroça perdem sentido.
  - **B) Estoque por cidade:** cada cidade tem estoque dos 4 recursos; entregas por rotas/carroças/jogador. Mais rico, mais complexo. **Recomendado**, com automação.
- **Carga de gestão:** 4 recursos × várias cidades pode virar planilha cansativa. Mitigar com: tela de visão geral (uma linha por cidade), automação por rotas e "gerentes", alertas, limite de cidades que o jogador gerencia diretamente.
- **O que é "suprir"?** Definir se a necessidade é um valor por rodada (consumo) ou um meta de estoque. Sugestão: consumo por rodada = base × necessidade%; estoque cai; entregas repõem.

---

## 7. Comércio e focos das cidades

### 7.1 Foco da cidade
- Cada cidade tem **um foco** entre os 4 suprimentos: necessidade **50%** (metade para suprir).
- Tem uma **falta**: necessidade **200%** no suprimento oposto.
- Dos outros dois, o sorteio define qual fica em **150%** e qual em **100%**.
- Exemplo (Águia de Prata): foco madeira (50%), alimentos 100%, dinheiro 150%, minérios 200%.

### 7.2 Preços e economia
- Comprar o que a cidade produz (necessidade 50%) é **mais barato**; vender o que ela precisa (200%) rende mais.
- Quando a necessidade da cidade é suprida, o valor **estabiliza**.
- **Antiexploit:** cidades de NPCs de outras facções suprem-se mais fácil (menor demanda) para não virarem "dinheiro infinito". Sugestões complementares: queda de preço a cada unidade vendida e recuperação lenta; limite de carga por viagem; reabastecimento gradual.

### 7.3 Rotas comerciais
- Critérios: (1) a facção da outra cidade ser **pelo menos neutra**; (2) se houver cidade no meio do caminho, a facção dela também precisa ser pelo menos neutra.
- Servem para suprir **as duas** cidades: cada uma só **oferece o que tem sobrando**.
- **Modelo sugerido (degraus):** necessidades em degraus 50 / 100 / 150 / 200%. Uma rota **desloca um degrau**: quem exporta sobe um degrau no recurso exportado; quem importa desce um degrau no recurso importado.
  - Exemplo: A tem alimentos 50% e minérios 100%; B tem alimentos 100% e minérios 50%. Rota "A exporta alimentos / B exporta minérios": A alimentos ⇒ 100%, A minérios ⇒ 50%; B o contrário. Ambas ficam equilibradas.
- Limites sugeridos: número máximo de rotas por cidade, custo de manutenção, rotas vulneráveis a **raids** e a mudanças de relação (se a facção vira inimiga, a rota cai).
- Visual opcional: caravanas nas estradas (caro).

### 7.4 Bônus quando a necessidade é 50%
| Suprimento | Bônus |
|---|---|
| Alimentos | Upgrade de soldados **20%** mais barato |
| Minérios | Armas, munição e conserto **20%** mais baratos |
| Dinheiro | Recrutamento e cura **20%** mais baratos |
| Madeira | Edifícios **10%** mais baratos e missões **10%** mais bem pagas |

Esse sistema **substitui** os descontos atuais de cidades conquistadas.

---

## 7B. Tipos de cidade, portos e edifícios-símbolo

### Cinco tipos de cidade
Os quatro focos (alimentos, minérios, madeira, dinheiro) mais o **porto**.

### O porto
- Negocia com **civilizações de fora** (mercado externo, fora das facções do mapa).
- Em vez de foco e porcentagens definidos pelo jogo, **o jogador define a distribuição a cada rodada do líder**: o que a cidade produz mais e o que lhe falta.
- É uma exceção à regra do sorteio de focos (seção 7.1).

**Notas e dificuldades:**
- **Só em cidade litorânea.** Hoje as cidades são geradas em terra firme; precisa de critério para achar um sítio com costa (praia ou foz de rio) e de um local de píer. Mundos de montanha ou sem litoral podem não ter porto; definir o que fazer (garantir ao menos um porto? cidade ribeirinha com cais?).
- **Risco de "porto sempre ótimo":** se escolher a distribuição é grátis, todo jogador quer um porto e ajusta tudo a cada mês. Sugestões de freio:
  - a distribuição tem **custo** ou **cooldown** (ex.: mudar o foco só a cada N meses, ou paga-se pela troca);
  - o **mercado externo é limitado** (compra e venda por rodada, como no resto do sistema);
  - o que o porto "produz" depende de **pessoas e prédios**, não só de escolha;
  - o mar traz **risco** (piratas, tempestades) que o jogador precisa cobrir.
- **Rotas por mar:** o porto pode ligar-se a outros portos por navio, ignorando a regra "cidade no meio do caminho". Sugestão: rota marítima é cara, mas contorna facções inimigas.
- **Possibilidades extras:** pesca em escala, importação de itens raros/receitas, pirataria como raid naval, navios com carroça marítima (viagem rápida entre portos), comércio com "civilizações de fora" como fonte de eventos.
- **Visual:** píer, navio atracado, mar com movimento. Um navio voxel é um modelo novo e o píer exige vaga na costa.

### Edifício que representa cada cidade
Cada cidade ganha um **edifício-símbolo** que mostra o foco dela, visível de longe:

| Foco | Edifício |
|---|---|
| **Alimentos** | Campo de cultivo e cercado de animais |
| **Minérios** | Prédio parecido com uma fábrica, com **carrinhos e trilhos de mina** em volta |
| **Madeira** | **Madeireira** |
| **Dinheiro** | **Praça de festas** mais decorada e um **banco** |
| **Porto** | **Píer com um navio atracado** |

**Notas técnicas:**
- Já existe base: a geração tem "vagas especiais" (`spRects`) para loja, clínica, quartel, capela e quadro de missões, e `cityDecor` já faz plantações, currais, lagoa e piquenique. Parte do campo de alimentos já está pronta como decoração; precisa virar edifício-símbolo mais grande e reconhecível.
- Cada símbolo precisa de **vaga**, **modelo voxel**, **colisão/navegação** e **interação** (ver estoque, produção, o gerente da cidade).
- O edifício-símbolo pode ser onde o jogador **acompanha o suprimento** daquela cidade (e onde a fumaça de ruína aparece primeiro quando o suprimento falta).
- Tamanhos: a maioria exige área maior que as casas; a cidade precisa reservar espaço antes de preencher o resto (já é a estratégia atual: ruas primeiro, depois edifícios).

### Pontos de atenção
- **Distribuição dos tipos no mundo:** com 7 cidades e 5 tipos, cada tipo aparece ~1–2 vezes; com facções de várias cidades, cada facção terá uma "cesta" de recursos (reforça comércio e conflito).
- A cidade do jogador (capital) também tem um tipo; decidir se é sorteado ou escolhido.
- **Conquista:** ao conquistar uma cidade, ela mantém o tipo? Poderia ter reforma/conversão, com custo (madeira e dinheiro).

---

## 8. Dependências e ordem sugerida

Sugestão de fases (pode mudar):

0. **Fundação:** `STATE` serializável, salvar/carregar, tabelas de dados, helpers de UI.
1. **Itens + inventário + cura + durabilidade** (loot, vender, usar).
2. **Atividades simples e cozinha:** pesca, lenha/mineração básica, fogueira/taverna, buffs.
3. **Economia de cidade sem facções:** estoques, 4 suprimentos, focos, debuffs, fumaça.
4. **Comércio:** preços dinâmicos, rotas, carroças.
5. **Facções, relações e rodadas:** líder/comandante, diplomacia, aliados na guerra, rebeliões.
6. **Raids, tática pré-invasão, missões novas, dungeons.**

Alternativas:
- **Dungeons antes** da fase 3, porque dão a fonte de minérios.
- **Rodadas antes da fase 3**, porque o consumo de suprimentos só faz sentido com "tempo" de jogo discreto.
- **Facções sem gestão** como protótipo (só relações + guerra), validando o loop de jogo antes de empilhar economia.

---

## 9. Riscos e pontos de atenção

- **Escopo:** é praticamente um segundo jogo por cima do primeiro. Fatiar por fases com algo jogável a cada uma.
- **Snowball / espiral da morte:** debuffs em cascata ⇒ rebelião ⇒ perde cidade. Precisa de avisos, tempo de reação, e talvez uma "válvula" (empréstimo, ajuda de aliado).
- **Excesso de gestão:** o jogador quer atirar e explorar. Automatizar o repetitivo.
- **Roubo de 50% do dinheiro:** pode ser muito punitivo; considerar depositar o dinheiro (banco/armazém) como contramedida.
- **Salvar:** sem isso, nada de longo prazo funciona.
- **Desempenho:** muitos sistemas por rodada em 7+ cidades; simular abstratamente as cidades longe da cena.
- **Consistência com o que existe:** preços, `owner`, `conquerCity`, quartel, quadro de missões e mapa precisam migrar para facções.

---

## 10. Perguntas em aberto

1. **Rodadas (descrito em 5B, faltam detalhes):** quanto dura uma rodada (sem limite, N dias de jogo, pontos de ação)? Quantas decisões o líder toma por rodada? Quantas rodadas tem uma campanha? O que o jogador perde se encerrar o mês cedo? Os raids acontecem mesmo assim? O "refresh" do mundo é uma recarga com tela de carregamento ou uma atualização na própria cena?
2. **Dinheiro:** é global do jogador ou por cidade? E os outros recursos (estoque global vs por cidade)?
3. **Líder:** o jogador pode "virar" líder a qualquer momento ou só em um lugar/momento (sala de guerra, início da rodada)?
4. **Quantas facções e cidades** no mundo (hoje são 7 cidades)? O mundo cresce?
5. **Perda:** se a capital cair, é fim de jogo? E a vitória: dominar todas as facções, ou unir por diplomacia também?
6. **Inventário:** vai ter peso/limite de slots? Itens caem no chão?
7. **Durabilidade:** qual o nível de punição desejado?
8. **Cidades fora da sua facção** produzem/consomem de verdade ou são abstratas?
9. **Rebelião:** a nova facção é jogável/diplomática ou só uma inimiga a conquistar?
10. **Carroças:** custo em dinheiro, tempo (avança rodada), risco de emboscada?
11. **Alianças:** o limite de "uma vez por mês" vale por facção, por tipo de ação ou no total? As ações do comandante têm limite?
12. **Relações entre facções NPC:** são sorteadas na geração, mudam sozinhas a cada rodada, ou só mudam por causa do jogador?
13. **Perda de pontos:** quanto vale uma ação e quanto se perde com os inimigos da facção? A relação decai com o tempo?
15. **Portos:** a distribuição que o jogador define é livre ou tem regras (ex.: um recurso a 50%, um a 200%)? Há custo, cooldown ou limite no mercado externo? O que fazer em mundos sem litoral?
16. **Cidade do jogador:** o tipo da capital é sorteado ou escolhido? Cidades conquistadas mantêm o tipo ou podem ser convertidas?
17. **Edifício-símbolo:** é também o lugar de gerenciar o suprimento daquela cidade? Pode ser destruído em raids/guerra?
18. **Tempo da guerra:** a guerra tem relógio próprio (dias de guerra) ou usa o mês? Quanto tempo real uma guerra deve durar?
19. **Placar da guerra:** como definir "equilibrada" e "perdendo" (pontos controlados, força, recursos, moral)?
20. **Derrota:** se o inimigo vencer, o jogador perde a cidade? Há batalha de defesa? A capital pode cair?
21. **Quantos pontos** tem uma frente (4–8?) e eles ficam sobre as estradas reais? E se não houver caminho por terra (ilhas)?
22. **Opção 3 (30 s):** como garantir que o ataque seja alcançável? O tempo muda com a distância?
23. **Cidade forçada a entrar na guerra:** conta como a cidade conquistada da guerra ou é uma segunda conquista?
24. **Espólio de guerra dos aliados:** o que é (recurso, cidade, valor)? E se recusar?
25. **Raids de mercenários:** quanto se perde e como se calcula?
26. **Compra de acampamento:** pode ser repetida? Existe risco ao comprar (ex.: ataques furtivos)?
27. **Estado de guerra:** quando termina, o que acontece com o que faltou de recursos na cidade?
14. **Declarar guerra:** exige motivo ou pode ser feito sempre? Quais as consequências com os aliados da facção atacada?

---

## 11. Para conversar na próxima rodada de ideias (anotado pelo pedido)

- ~~Como funcionam as **rodadas**~~ (anotado em 5B; faltam detalhes).
- ~~O **sistema de relações e alianças**~~ (anotado em 5C; faltam números e detalhes).
- ~~A **guerra** (início, formação do exército aliado, tática pré-invasão, fim)~~ (anotado em 5D, com análise e fatiamento G1–G5; faltam números e decisões nas perguntas 18–27).

---

## 12. DECISÕES TOMADAS (respostas do autor às perguntas da seção 10)

> Estas respostas **substituem** o que estiver em conflito nas seções acima. Onde havia dúvida, está marcado **[confirmar]**.

### Tempo e estrutura
- **Rodada** = **turno do líder + turno do comandante**. Cada turno dura **o tempo que o jogador quiser**; **sem limite**. Uma nova rodada começa quando o jogador **encerra o turno do comandante**. (O termo "mês" passa a ser "rodada".)
- O líder só age **ao encerrar a rodada** (na prefeitura).
- **Missões obrigatórias não cumpridas:** perdem-se **recursos** e **pontos de aliança**. Se a **meta de recursos** ficar muito abaixo, entram os **debuffs**.
- **Fim de jogo:** não há final. Ao dominar tudo, opção de **iniciar um novo mapa levando upgrades, recursos e itens** (New Game+). **Se a capital cair, é fim de jogo (por enquanto)**; no futuro o comandante poderá entrar em outra facção.
- **Salvar o jogo:** aprovado (obrigatório). Também **salvar o estado das guerras** (o salvamento serve para negociar a paz) **[confirmar o sentido da frase "Salve em caso de guerras que servirá para fazer a paz"]**.
- Gestão das cidades é feita **na prefeitura** (não nos edifícios-símbolo).

### Mundo e cidades
- **Quantidade:** 8–10 cidades e 3–4 facções (sugestão aceita).
- **Tipo da capital:** sorteado, mas **nunca porto**. **Portos são para cidades mais fortes.**
- **Porto:** distribuição com **uma troca por rodada**; **o jogador precisa ter um porto**; a distribuição **só vale para aquele porto**.
  - Consequência: o mundo precisa garantir **ao menos um porto alcançável** (entre as cidades mais fortes) **[confirmar o que acontece se o único porto for perdido ou se o mapa não tiver litoral]**.
- **Edifício-símbolo:** é só um **símbolo visual**. Cidade que sofreu **raid** exibe **muita fumaça** (representa incêndio).
- **Cidades de outras facções:** **abstratas** (simuladas por números), materializadas em cena só quando o jogador está perto.
- **Rebelião:** a cidade rebelde vira **facção inimiga**, mas **pode virar aliada com o tempo**.
- **Roubo (rua):** não é "50% do ouro", e sim **50% de chance de ser roubado ao entrar na cidade**, tirando **~20% do ouro**. A chance é rolada **a cada entrada**; se for roubado uma vez e continuar lá, **não é roubado de novo** naquela permanência.
- **Caravanas:** ficam **paradas no mapa entre as estradas**, só decorativas. **Sem custo** definido. **Emboscada só** se o jogador pegar a missão de defender a caravana.

### Itens e progressão
- **Inventário:** com **limite de slots**; o jogador pode fazer **um upgrade** de capacidade. **Itens não caem no chão** **[confirmar o que acontece quando o inventário está cheio ao receber um item]**.
- **Durabilidade:** a arma **quebra** e fica **inutilizável até ser consertada**. **[confirmar: o que o jogador usa se todas quebrarem?]**
- **Dungeons:** acessadas por **portais mágicos** que surgem aleatoriamente (**no máximo 3 por rodada**). Recompensas possíveis: **uma quantidade de algum recurso**, **uma arma lendária** (arma com upgrade) ou **uma relíquia**.

### Relações e eventos
- **Ações do líder:** número **limitado de ações por rodada**, **não por facção**. **Começa com 1** e **aumenta com upgrades**. **[confirmar quais decisões gastam ação: alianças/rotas/doações/pedidos/guerra; e quais são gratuitas (ex.: distribuição do porto)]**
- **Decaimento:** a relação **decai por rodada**. Sem números ainda.
- **Declarar guerra:** o jogador pode **sempre que quiser**.
- **Sistema de Eventos (a descrever):** muda relações entre facções e dá efeitos (debuffs, etc.).
- **Sistema de Reunião entre facções (a descrever):** decisões entre facções. Ex.: uma facção com debuff por evento declara guerra para minimizar; decisões podem prejudicar a facção a ponto de ela querer entrar em guerra.
- **Temperamento das facções:** algumas mais propensas à **guerra**, outras ao **pacifismo**.

### Guerra (atualiza a seção 5D)
- **A guerra não impede mais encerrar a rodada.** Passa a existir **novas ações para o líder** que podem mudar o curso da guerra.
- A guerra **atravessa várias rodadas** (sem relógio próprio). A **paz** é negociada pelo líder.
- **Placar:** **pontos controlados**.
- **Derrota:** se o jogador **perder o último ponto**, ocorre uma **batalha na cidade** (o jogador é teleportado antes). Ao começar, **se ele morrer e não tiver outra cidade, é game over**; se tiver, **vai para outra cidade** (perdeu a atacada). Se o **jogador declarou a guerra e perdeu**, há **chance** de o inimigo, em vez da cidade, **pedir X recursos**; se o jogador não tiver, entra em **dívida** (o recurso fica **negativo**).
- **Pontos da frente:** **dependem da distância**. Sem caminho por terra: **ainda sem decisão** (ver sugestões na resposta).
- **Opção dos 30 s:** o tempo **muda com a distância**.
- **Cidade forçada a entrar na guerra:** **conta como cidade conquistada**. No fim da guerra, o jogador escolhe **devolver à facção original** (sobe a relação) ou **mantê-la** (pode gerar inimigo ou nova guerra). **[confirmar se conta para o limite de "uma cidade por guerra"]**
- **Espólio dos aliados:** **10% para cada aliado**, **não pode recusar** **[confirmar: 10% de quê?]**.
- **Raids de mercenários:** perda de **valor fixo de recursos** (**valor a definir**).
- **Compra de acampamento:** pode ser repetida e tem **risco de ataque furtivo**; o jogador pode fazer **missões para eliminar guerrilheiros** e reduzir a chance de ataques furtivos.

### Perguntas que ficaram abertas
- Q5 (estoque global ou por cidade): **o autor pediu explicação** (ver resposta no chat).
- Q27d (o que acontece ao fim da guerra com o que faltou): **o autor pediu explicação** (ver resposta no chat).
- Sistema de Eventos e Sistema de Reunião entre facções: **o autor descreverá**.
- Dúvidas marcadas com **[confirmar]** acima.

---

## 13. DECISÕES — 2ª rodada de respostas (substituem o que conflitar)

### Suprimentos: como funciona de verdade (resolve a pergunta 5)
- **Estoque geral** (quantidades totais do jogador). O jogador **distribui** o estoque entre as cidades na **prefeitura**, que abre a **tela do líder**, na hora de encerrar a rodada.
- **Meta de recursos por cidade = o que ela precisa para passar a rodada sem debuff.** Cidades que produzem um recurso em abundância têm **necessidade zero** daquele recurso (a "meta" do foco some).
- **Valores base usados no exemplo:** recursos físicos **10** a 100%; **ouro 100** a 100%. Necessidades: 100% = 10 (ou 100 ouro), 150% = 15 (150 ouro), 200% = 20 (200 ouro).
  - Exemplo: **Cidade Alimento** precisa de: alimentos 0, minério 10, madeira 15, ouro 200. **Cidade Minério**: alimentos 10, minério 0, madeira 20, ouro 150.
- **Caravana (rota comercial):** quem recebe um recurso pela rota passa a ter **necessidade 0** dele (a caravana já entrega). No exemplo, com uma rota entre Alimento e Minério: Alimento fica com minério 0; Minério fica com alimentos 0. **O exportador não perde nada** (o foco continua em 0).
  - Isso **substitui** o modelo de degraus ±1 proposto na seção 7.3.
  - É assim que **caravanas e portos fazem sentido**: reduzem o que o jogador precisa distribuir do estoque.
- **Entregar mais de 100% da necessidade dá buff na rodada.** Ex.: entregar 25 de madeira em vez de 15 dá um **desconto** naquela rodada (tipo/valor do buff ainda a definir).
- A **meta de recursos** (se faltar muito) causa **debuffs**; missões obrigatórias não cumpridas tiram recursos e pontos de aliança (ver seção 12).

### Guerra
- **Recuperação pós-guerra:** **prazo de 3 a 5 rodadas** para a cidade se recompor, já que o jogador também precisa prover a **cidade conquistada**.
- **Limite de "uma cidade por guerra":** ao declarar guerra, o jogador escolhe **uma cidade-alvo**; **se no caminho conquistar outras, pode**. A cidade forçada a entrar na guerra conta como conquistada.
- **Conquista de cidade de facção que não está em guerra:** o jogador pode **negociar pagar um valor em ouro para mantê-la temporariamente**, **sob promessa de entregá-la**. Se não fizer isso (ou não houver acordo), **a facção entra em guerra também**.
- **Espólio dos aliados:** **10% de cada aliado, tirado dos recursos da cidade conquistada**. Se a cidade não tiver recursos, **paga com os do jogador**. Não pode recusar.
- **Defesa da cidade:** se o jogador vence a batalha de defesa, **a guerra continua**; **os inimigos mantêm o ponto** e, **depois de um tempo**, vem um **novo ataque**. Quem defende é **o batalhão do jogador**, e **enquanto ele tiver dinheiro conseguirá defender**; **a cada onda, mais inimigos** que a anterior, até ficar impossível. (Ou seja: a defesa tem **relógio inexorável**; o jogador precisa de paz ou de contra-ataque.)
- **Frente sem caminho por terra:** aceita a sugestão de **garantir caminho por terra entre todas as cidades na geração do mundo**; **guerra naval** entre portos é ideia futura. 

### Cidades e progressão
- **Evolução da capital:** a capital **evolui até virar cidade fortificada**; **cada nível sobe o nível do líder** (aumenta o número de ações). **Outras cidades do jogador também evoluem**, mas **não contam como pontos de líder**; **cidades evoluídas dão descontos nas lojas**. **Evoluir gasta ação**.
- **Ações:** **tudo gasta ação**, exceto **pedido de paz** e **declaração de guerra** (por enquanto).
- **Porto:** **ao menos um por mapa, se possível**; se não houver, aceita-se.

### Itens
- **Armas quebradas:** **sem alternativa automática** (o jogador tem que gerenciar). ⚠ *Risco:* pode travar o jogador se todas quebrarem e faltar minério para consertar. Decisão tomada pelo autor; reavaliar nos testes.
- **Inventário cheio:** abre **janela ao lado do inventário** para escolher **quais itens descartar para pegar os novos**; **o resto some**.

### (Respondidas abaixo, na seção 14)
- **Origem do estoque geral:** como ele cresce (produção automática das cidades-foco por rodada, compra, missões, portais, atividades)?
- **Buff de entrega acima de 100%:** qual tipo/valor? Vale por recurso e por cidade?
- **Descontos de foco** (antigos "−20% / −10%" quando a necessidade era 50%): continuam, agora que o foco tem necessidade 0?
- **Cidade mantida temporariamente:** por quantas rodadas e quanto ouro?
- **Defesa da cidade:** "enquanto tiver dinheiro" significa custo por onda do batalhão? Quanto cresce cada onda?
- **Estado de guerra:** vale para todas as cidades do jogador ou só para as envolvidas?

---

## 14. DECISÕES — 3ª rodada de respostas (substituem o que conflitar)

### Origem do estoque geral
- **Produção abundante** de uma cidade-foco que **não está sendo levada para nenhum lugar** (caravana/distribuição) **vai para o comandante** (estoque geral), **por rodada**.
- **Outras fontes:** missões, comércio, dungeons (portais), acampamentos de bandidos, cavernas, animais e **outros sistemas que entrarão (ex.: pescaria)**.

### Buffs (resolvem a pergunta sobre os descontos de foco)
- Os **descontos antigos por foco/50% deixam de existir**. **Valem só os buffs por entrega acima da meta**, com o mesmo conteúdo de antes:

| Recurso entregue acima da meta | Buff na rodada |
|---|---|
| Alimentos | Upgrade de soldados **20%** mais barato |
| Minérios | Compra de armas, munição e conserto **20%** mais baratos |
| Dinheiro | Recrutamento de soldados e cura **20%** mais baratos |
| Madeira | Desconto de **10%** em todos os edifícios e missões pagam **10%** a mais |

- **Entregar o recurso a uma cidade que o produz** (necessidade zero) **também gera o buff**: é "devolver a produção para a cidade, em vez de gastá-la no exército".

### Guerra e cidades
- **Cidade mantida temporariamente** (conquistada de facção fora da guerra): **~100 ouro por rodada** para cidade de **tier baixo**; **+10% a cada tier** (a calibrar nos testes).
- **Defesa por ondas:** **sem custo por onda.** Quem defende são **os soldados que o jogador recrutou**. Chega um momento em que eles morreram e o **jogador não tem dinheiro para recrutar**: aí enfrenta **sozinho uma invasão de 20 soldados**, que **repõe um novo a cada morte**.
- **Estado de guerra:** vale **apenas para as cidades envolvidas na guerra**. (Atenção: o sistema de reuniões e eventos, descrito depois, também mexe com guerra.)

### Armas (punição)
- A **durabilidade serve como punição**. O jogador **pode sempre consertar**, mas ao consertar **gera dívida** e **fica com o dinheiro negativo**.
  - Isso **resolve o risco de travamento** apontado antes (arma quebrada + sem minério): o conserto **nunca é bloqueado**, só custa dívida.
  - **A definir:** limite da dívida, juros e os efeitos de estar com ouro negativo (ver a regra "dinheiro zerado" na seção 6.1).

### Perguntas em aberto depois desta rodada
- **Buff por entrega acima da meta:** o valor é **fixo** (20% / 10%) ou **cresce com o quanto passou da meta**? Vale **por cidade** ou basta **uma cidade** receber acima da meta? Os buffs de recursos diferentes **se somam**?
- **Fórmula do tier:** "100 ouro no tier 1, +10% por tier" quer dizer 100, 110, 120... ou 100, 110, 121...?
- **Dívida:** tem limite? Há juros por rodada? O que ela bloqueia (recrutar, curar, comprar), e vale a regra de roubo de 50%?
- **Produção das cidades-foco:** quanto produz por rodada (valor base) e como cresce com upgrades/tier?
- **Sistemas pendentes de descrição:** Eventos, Reunião entre facções e Temperamento das facções.

---

## 15. DECISÕES — 4ª rodada de respostas (substituem o que conflitar)

**Regra geral do autor: na dúvida, optar pelo mais simples.**

- **Buff por entrega acima da meta:** **valor fixo** (20% / 10%). Se o jogador entregar **além disso**, o excedente **adianta a meta da rodada seguinte** (a próxima rodada já começa com parte da meta preenchida).
- **Tier do custo da cidade mantida:** **soma** (100, 110, 120...).
- **Dívida:** **sem limite** (apenas o que o computador suportar). **Bloqueia qualquer compra**, já que não dá para pagar com número negativo. **Não vale o roubo de 50%** ao entrar na cidade.
- **Produção das cidades-foco:** **5 por rodada**, **+1 por tier**.
- **Eventos, Reunião entre facções e Temperamento:** descritos nas seções 16, 17 e 18.

### Ordem de implementação (discussão)
Ver recomendação na conversa: construir os sistemas independentes **primeiro**, com **ganchos** para as facções (livro de recursos que aceita saldo negativo, pipeline de modificadores de preço, estado serializável, contador de rodada, tabelas de dados), depois as rodadas e a gestão de cidades, e só então as facções, relações, eventos e guerra.

---

## 16. Sistema de Eventos

### Descrição do autor
- **A cada rodada** há uma **probabilidade (começar com 30%)** de ocorrer um **evento aleatório**.
- Os eventos afetam **recursos, preços, alianças e até guerras**. O jogador pode ter **ações** (respostas) nos eventos.
- Alguns eventos **afetam o jogador** (reduzir o estoque, rebelião na própria cidade). **Nem todos são ruins**: também dão bônus.
- **Por enquanto, 10 eventos**; mais serão adicionados depois.

**Exemplo — grande chuva:** "Uma grande chuva destruiu as plantações das cidades X e Y das facções A e B; o povo teme a fome (estoque de alimentos reduzido em 75%)." Respostas:
- **A) Oferecer alimento** às cidades: gasta recursos e **aumenta** a relação com as facções.
- **B) Enviar comerciantes vendendo o alimento pelo dobro**: ganha ouro, mas **diminui muito** a relação.
- **C) Ignorar**: **diminui** a relação com essas facções.

**Lista inicial citada:**
1. Rebelião na cidade X
2. Ataque às caravanas
3. Raid de bandidos na cidade X
4. Colheita farta
5. Descoberta de um veio de ouro
6. Chegada de comerciantes estrangeiros
7. Sequestro de uma pessoa importante da facção X
8. Guerra aleatória (com **lista de motivos**)
9. Grande chuva (exemplo acima, que vira o 9º)
10. *(a definir; sugestões abaixo)*

**Regra para facções NPC:** se uma facção ficar **muitas rodadas sem bater duas metas**, pode ocorrer **rebelião** nela ou ela **declarar guerra a outra facção** para tentar saquear uma cidade.

### Sugestões e análise
- **Estrutura de dados (tabela `EVENTOS`):** `{ id, tipo (bom/ruim/neutro), pesos e requisitos, alvo (facção/cidade/jogador), efeitos automáticos, duração, respostas[ {texto, custo, efeitos, mudança de relação} ] }`. Facilita adicionar eventos novos sem mexer no código.
- **Quando rolar:** sugiro **no começo do turno do líder**, para o jogador poder reagir; eventos que precisam de ação em campo (raid, caravana) viram **missões/avisos para o turno do comandante**.
- **Respostas gastam ação do líder?** Pela regra "tudo gasta ação" (seção 13), as respostas deveriam gastar. **[confirmar]**
- **Um evento por rodada no máximo** (30% de chance), com sorteio ponderado por **condições** (ex.: colheita farta só se há cidade-foco de alimentos; rebelião só se há cidade em crise).
- **Efeitos temporários:** definir **duração em rodadas** (ex.: 3 rodadas de estoque reduzido).
- **Facções NPC:** os eventos que as afetam são **resolvidos de forma abstrata** (sem cena), exceto quando o jogador está perto.
- **Sugestões para o 10º evento (e extras futuros):** epidemia numa cidade; incêndio na cidade; seca; visita diplomática (bônus de relação); portal mágico extra (dungeon bônus); festival (bônus de moral); migração de refugiados (população/necessidade aumenta, mas dá soldados); traição de um oficial (soldados perdem força); mercenários buscando contrato (recrutamento mais barato ou risco); boato de espião (relação cai se ignorado).
- **Guerra aleatória — lista de motivos (proposta):** disputa de fronteira; saque por fome (facção sem metas); vingança por sequestro ou caravana atacada; traição de aliança; insulto diplomático; disputa de rota comercial; ambição do líder; retaliação por embargo/taxação (ligação com as reuniões); ajuda a um aliado.
- **Ligação com outros sistemas:** facções agressivas disparam eventos de guerra com mais frequência; reuniões e eventos podem criar o motivo de "declarar guerra" que o jogador também pode usar.

---

## 17. Sistema de Reuniões entre facções

### Descrição do autor
- **A cada 5 rodadas** as facções se reúnem, **estejam em guerra ou não**.
- Elas decidem **efeitos** (buffs e debuffs em certas áreas). **O jogador escolhe um** que entra em votação para ter efeito.
- **Votação:** ganha a **maioria**. **Empate: leilão** para aprovar ou não.
- **Antes da votação**, o jogador pode **comprar apoio** das facções **neutras e aliadas**.
- **Se não for aprovado:** **nenhum efeito** nas 5 rodadas, e o **efeito anterior também deixa de existir**.
- **Relações:** quem votou **junto** do jogador **sobe**; quem votou **contra** **desce** (entende que o jogador quer prejudicá-lo). Se uma proposta **prejudica muito** uma facção (ex.: taxar minérios para a civilização Z, que não produz minérios e tem meta total de 350%), a relação com ela **cai muito**.

**Exemplos de propostas:**
- **"Tirar taxação sobre minérios de outras cidades"** → minérios mais baratos para comprar e vender.
- **"Valorizar preço da madeira"** → madeira mais cara para comprar e vender.
- **"Criação de uma Guilda Mercantil para comércio no estrangeiro"** → **escolha um recurso** que será **automaticamente suprido** em todas as suas cidades e **outro que dobra a necessidade**; aplica a todas as cidades.
- **"Formação de uma Guarda Unificada contra bandidos e mercenários"** → caravanas recebidas, além de suprir a necessidade, **geram 5 do produto transportado por rodada**; porém **acampamentos de bandidos param de aparecer**.

O autor pediu **ajuda para definir manualmente** a lista de propostas.

### Sugestões e análise
- **Lista inicial de propostas (rascunho para escolher/ajustar):**

| Proposta | Efeito |
|---|---|
| Tirar taxação sobre [recurso] | [Recurso] mais barato para comprar e vender |
| Valorizar o preço de [recurso] | [Recurso] mais caro para comprar e vender |
| Guilda Mercantil | 1 recurso suprido automaticamente nas suas cidades; outro dobra a necessidade |
| Guarda Unificada | Caravanas geram +5 do produto por rodada; acampamentos param de aparecer |
| Pacto de Não Agressão | Nenhuma declaração de guerra por 5 rodadas (guerras em curso continuam) |
| Fundo de Reconstrução | Cidades em crise (qualquer facção) recebem uma entrega mínima por rodada |
| Festival Continental | Relações com todas as facções sobem um pouco; custa ouro |
| Convenção de Cerco | Guerras: ataque às cidades custa menos recursos, mas as defesas ficam mais fortes |
| Regulamento de Armas | Conserto mais barato, mas munição mais cara |
| Reforma Agrária | Alimentos: necessidade de todos −25%; ouro: +25% |
| Liga de Portos | Rotas por mar mais baratas; porto produz extra |

  (as quatro primeiras linhas e as duas guildas/guardas são do autor; as demais são sugestões.)
- **Quem sugere as opções?** Sugestão: cada reunião **sorteia 3–4 propostas** disponíveis; o jogador escolhe **uma** (a "agenda"). As facções NPC podem ter **propostas próprias** que também entram na votação (ou só a do jogador?). **[confirmar]**
- **Empates frequentes:** com 3–4 facções + jogador, **2×2** é comum. Sugestão: **voto ponderado pelo número de cidades** da facção (reduz empates) e leilão só em empate real.
- **Voto das facções NPC (fórmula simples, para começar):** `interesse = benefício − prejuízo da proposta para a facção (ponderado pelas metas dela) + bônus pela relação com o jogador + ajuste de temperamento + apoio comprado`. Vota a favor se `interesse > 0`. Mostrar ao jogador uma **prévia** (ex.: "Z contra, A a favor, B indeciso").
- **Comprar apoio:** custo em ouro (ou ação do líder?) proporcional ao quanto a proposta prejudica a facção. Só funciona com **neutras e aliadas**.
- **Escopo do efeito:** algumas propostas são **globais** (preços de mercado) e outras são **do proponente** (guildas, guarda unificada). Definir por proposta.
- **Se a proposta falha, o efeito anterior some:** cria um ciclo de **5 rodadas**; propostas boas precisam ser renovadas. Atenção para **efeitos de duração longa** (ex.: acampamentos parando) que dependem desse ciclo.
- **Ligação com guerra:** durante guerra, o jogador ainda pode participar da reunião (é independente), podendo usar a reunião para **buscar aliados**.
- **Ligação com relações:** o prejuízo causado pelas propostas gera **inimigos** mesmo sem guerra, o que alimenta eventos e declarações de guerra das facções agressivas.
- **Dificuldade:** média. Precisa de um **modelo de necessidades por facção** (para calcular quem é prejudicado), de **tela de votação** e de **simulação abstrata** das facções NPC.

---

## 18. Sistema de Temperamento das facções

### Descrição do autor
Cada facção gerada tem **um de três temperamentos**:

| Temperamento | Comportamento |
|---|---|
| **Pacífica** | **Nunca declara guerra**, nem por um aliado. Se estiver em guerra, **opta por negociar a paz**, **pedindo valores baixos** caso o inimigo esteja perdendo. |
| **Neutra** | Declara guerra **apenas se a relação estiver muito baixa**. Em geral **prefere alianças**. Se um aliado entra em guerra, **pode entrar junto mediante pagamento**. |
| **Agressiva** | Se alguém vira inimigo, **é questão de tempo** até declarar guerra. Se um aliado está em guerra, **entra imediatamente**. |

### Sugestões e análise
- **Simples de implementar** (um campo `temperamento` por facção + regras nas decisões da IA).
- **Sorteio no mundo:** sugestão de proporção (ex.: ~25% pacífica, 50% neutra, 25% agressiva) para o mundo nunca ficar só pacífico ou só em guerra. Ao menos uma facção agressiva e uma pacífica quando houver 4 facções.
- **Onde influencia:** declaração de guerra (eventos e metas), entrada em guerra por aliados, negociação de paz, **votos nas reuniões** (pacíficas tendem a votar contra propostas que prejudiquem aliados/relações; agressivas a favor de propostas de guerra/segurança), preço do apoio comprado.
- **Para a agressiva "questão de tempo":** usar um **temporizador em rodadas** (ex.: 2–4) a partir do momento em que vira inimiga, com avisos ao jogador.
- **Preço de ajuda da neutra:** definir a fórmula (ex.: proporcional ao tamanho da guerra).
- **Pode mudar?** Opcional: temperamento muda raramente por eventos (uma facção pacífica fica agressiva depois de ser atacada). **[confirmar]**
- **Facções geradas por rebelião:** que temperamento recebem? (sugestão: neutra ou herdado do tipo de rebelião.)

---

## 19. DECISÕES — 5ª rodada (Eventos, Reuniões, Temperamento)

> **Tudo isto é um norte geral.** Os detalhes são decididos **na hora de implementar** cada sistema.

- **Sugestões das seções 17 e 18 aprovadas** (lista de propostas, fórmula de voto, prévia de votação, temperamentos com proporção sugerida, temporizador da facção agressiva).
- **Eventos:** rolam **no começo do turno** (do líder); **não gastam ação**; **duração dos efeitos temporários: 5 rodadas**. Os eventos serão definidos na implementação.
- **Reuniões:** **3 propostas sorteadas por reunião**; o jogador escolhe uma. **Voto ponderado por número de cidades**; se ainda empatar, **leilão**. **A proposta vale para todos.** Detalhes (custo do apoio etc.) na implementação.
- **Temperamento:** facções de **rebelião** recebem temperamento **aleatório**. Demais detalhes na implementação.

---

## 20. ROTEIRO DE IMPLEMENTAÇÃO (norte)

Regra: **cada fase termina com algo jogável** e deixa **ganchos** para as fases seguintes (estado salvável, livro de recursos com saldo negativo, modificadores de preço, contador de rodada, tabelas de dados). Na dúvida, o mais simples.

| Fase | Conteúdo | Entrega jogável | Aproveita o que já existe |
|---|---|---|---|
| **0. Fundação** | Estado do jogo serializável (`STATE`), salvar/carregar, tabelas de dados (itens, receitas...), helpers de interface (janelas, grade de slots, tooltip), livro de recursos (alimentos, minérios, madeira, ouro com saldo negativo), função única de preço com modificadores, contador de rodada | Salvar e carregar partida; menus usando a nova base | Painéis, mixer de sons, modos normal/criativo |
| **1. Itens e inventário** | Inventário com slots (+ upgrade), janela de descarte quando cheio, itens (matéria-prima, consumíveis, troféus, relíquias), loot de inimigos/baús/animais, venda no armeiro, itens de cura, barra rápida, **durabilidade** (quebra e conserto com dívida) | Coletar, vender, curar-se, armas que quebram | Armeiro, clínica, baús, animais, inimigos |
| **2. Atividades** | **Pesca**, **cozinhar** (fogueira/taverna) com buffs temporários, vendedores com estoque e ouro limitados | Pescar, cozinhar, comer, vender | Água/rios, fogueiras de acampamento |
| **3. Portais e raids** | Portais mágicos aleatórios (máx. 3), **dungeon procedural** (região reservada), recompensas (recurso, arma lendária, relíquia); **raids** de bandidos com aviso e opções simples; fumaça em cidade que sofreu raid | Dungeons e defesa de cidade | Grutas, bandos, briga animais × NPCs, aliados |
| **4. Rodadas e prefeitura (sem facções)** | Turno do líder e do comandante, prefeitura, estoque geral, metas/necessidades por cidade, entrega e buffs, caravanas decorativas e rotas, tipos de cidade e edifícios-símbolo, **portos**, evolução da capital e ações do líder, missões obrigatórias, debuffs, fumaça e rebelião, **framework de eventos** | O ciclo "decidir → jogar → encerrar" funcionando | Quartel, quadro de missões, cidades, acampamentos |
| **5. Facções** | Geração de 3–4 facções e 8–10 cidades, relações, temperamento, IA abstrata, **reuniões**, eventos completos | Diplomacia e votações | Cidades, mapa, preços |
| **6. Guerra** | G1–G5 (seção 5D): frente com pontos, ondas, economia da guerra, cidades do meio, aliados, paz, pós-guerra | A campanha de guerra | Acampamentos, aliados, batalha atual de cidade |

### Pontos de atenção
- **Fase 4 como teste de diversão:** valida a gestão antes de empilhar a política.
- **Geração de mundo:** garantir **caminho por terra** entre as cidades e **ao menos um porto** (entre as cidades mais fortes) antes das fases 4–6.
- **Compatibilidade com saves:** cada fase que muda o estado deve **versionar** o save.
- **Conteúdo manual** (eventos, propostas, receitas, peixes, itens) vai para tabelas de dados; escrevemos junto com a implementação de cada fase.

### Próximo passo sugerido
**Começar pela Fase 0** (fundação) e, em seguida, a Fase 1 (itens e inventário).

### (Respondidas na seção 19)
- **Eventos:** quando rolar (início do turno do líder?) e se as respostas gastam ação; o 10º evento; os efeitos temporários e suas durações; a lista de motivos da guerra aleatória (proposta acima).
- **Reuniões:** quem sorteia/propõe as opções; **peso do voto** (1 por facção ou por cidade); custo do apoio; escopo de cada proposta (global ou do proponente); se facções NPC propõem também.
- **Temperamento:** proporção no sorteio, se muda com o tempo, preço da ajuda da facção neutra e temperamento das facções nascidas de rebelião.
