# Fase 3 — Portais, dungeons e raids: o que foi feito e como testar

Branch: `factions-update`. Arquivos novos: `js/dungeon.js`, `js/raids.js`. Alterados: `game.js`, `weapons.js`, `fishing.js`, `store.js`, `entities.js`, `allies.js`, `poi.js`, `save.js`, `state.js`, `inventory.js`, `index.html`.

## Ajustes pedidos junto com a fase
- **Vara de uma mão só, apontada para cima** (estilo Minecraft): cabo de cortiça na mão, carretilha com manivela, haste fina em gomos que sobe com passadores de linha e ponta vermelha. A linha fica pendurada com boia e anzol; ao lançar, a vara balança para a frente e a linha sai da ponta até a boia; puxando, a vara entorta para trás e vibra com a tensão.
- **Comprar antes de Vender** no menu da Loja.
- **Clínica com botões "Curar" e "Comprar"** (cada um abre sua tela, com "Voltar").
- **Taverna:** clientes sentados e o taverneiro não viram mais para o jogador (ficam parados).
- **Minigame no botão esquerdo:** o botão direito lança e recolhe a linha; o botão **esquerdo** fisga quando morde e segura para puxar.

## Dungeons e portais
- Num canto do mapa (o que tem menos terra) há uma **plataforma de rocha** reservada de 100×100 blocos com **3 alas** de dungeon, geradas por semente: 6–7 salas de 7 a 12 blocos ligadas por corredores de 3 de largura, pilares nas salas grandes, tochas, caixas, chão de lajes e teto de pedra. Todas as salas são alcançáveis (verifiquei por busca em largura).
- Dentro da dungeon o ambiente é **escuro** (névoa preta, sem sol e nuvens) e você usa a **tocha** como luz. O som muda para o de caverna.
- **Portais mágicos** (arco de pedra com redemoinho roxo e uma **coluna de luz** visível de longe) surgem em terra firme, **no máximo 3 por vez, renovados a cada 3 dias de jogo** (até as rodadas existirem). Aparecem no **minimapa e no mapa grande** como losangos roxos ("Portal 1/2/3").
- Cada portal tem **nível** (1 a 3, conforme a distância da sua cidade) e uma **recompensa anunciada**: **uma quantidade de um recurso** (alimentos, minério, madeira ou ouro), **uma arma lendária** ou **uma relíquia**.
- **E** no portal entra na ala. Inimigos (aranhas, escorpiões, cães, drones, brutamontes e um chefe — escorpião, brutamontes ou **golem** conforme o nível) guardam um **baú trancado** no fundo. Mate todos, abra o baú: ele dá o loot de dungeon (relíquias só saem aqui) **e a recompensa do portal**. A **pedra de saída** (E) leva de volta ao portal; o portal se desfaz depois que a recompensa é entregue. Se você sair antes, o portal continua e os inimigos voltam ao entrar de novo. Morrer na dungeon leva você para a sua cidade.
- **Arma lendária:** +50% de dano, desgaste pela metade e uma ★ no nome (HUD, bolsa e barra).

## Raids de bandidos
- A partir do 2º dia de jogo, a cada dia há **35% de chance** de um raid numa cidade sua (com intervalo mínimo de 1,5 dia). Bandidos (5 + nível da cidade) surgem na borda da cidade e atacam moradores e quem estiver por perto; seus soldados aliados também combatem.
- **Aviso:** abre uma janela com as opções: **(1) "Abandonar a missão e ir até lá"** (só aparece se você tem missão ativa; ela falha e você é levado à praça da cidade) ou **(2) "Entendido (60 s)"**: você tem 60 segundos para chegar. A cidade pisca em vermelho no mapa e há um contador na tela.
- **Defendeu** (todos os bandidos mortos): recompensa em ouro. **Não chegou a tempo:** a cidade é saqueada: você perde ◉120 (ou o que tiver) e 15% dos recursos, e a cidade fica **soltando fumaça** (colunas de fumaça sobre as casas) por 4 dias de jogo.
- Não dá para entrar num portal durante um raid em andamento (até você chegar à cidade).

## Como testar (modo criativo)
1. Na pausa, **Criar portais agora** e **Ir ao portal mais próximo**. Veja a coluna de luz roxa, o prompt e o losango roxo no minimapa.
2. **E** no portal: você entra. Explore com **Invencível** ligado; desligue para ver os inimigos te atacarem (música de batalha toca). Mate todos e abra o baú. Veja a recompensa e use a pedra de saída (E).
3. **Iniciar raid agora**: a janela de aviso aparece. Teste "Entendido" e deixe o tempo passar (ou fique longe) para ver o saque e a fumaça; teste de novo indo até a cidade e matando os bandidos para ver a recompensa. Aceite uma missão no quadro antes para ver a opção de teleporte.
4. **Dar uma arma lendária** e atire para ver o dano maior (★ no nome).
5. Salve e carregue: portais, armas lendárias e cidades em chamas continuam.

## Decisões minhas (aprovar ou mudar)
- Chance de raid (35%/dia), tempo (60 s), perda (◉120 + 15% dos recursos) e recompensa do raid (◉40 + 30×nível) são provisórios.
- Raids só atingem cidades suas; a alerta de teleporte só existe se você tem missão ativa (como no desenho do jogo).
- Portais e raids seguem os dias de jogo até as rodadas existirem (Fase 4).
- A dungeon não gera mais de 3 alas; cada portal usa uma ala diferente.

## Verificado por mim (por script, sem ouvir áudio)
Geração da dungeon (3 alas, todas as salas alcançáveis); portais (nível, recompensa, minimapa); entrar, aggro, baú trancado, limpar, abrir e receber a recompensa, sair, morrer dentro; raid de aviso, perda por tempo, defesa com recompensa, teleporte com missão e raid automático por dia; fumaça; salvar/carregar de portais, lendárias e fumaça; clínica, loja, taverna e minigame no botão esquerdo; console sem erros.

---

# Fase 3 — ajustes (rodada 2)

- **Raids com bandidos:** os atacantes agora usam o visual dos bandidos de acampamento (bandana vermelha), não o de soldados.
- **Soldados chamados no raid:** assim que o raid começa, **todos os seus soldados são teleportados para trás de você**, onde você estiver, em formação, e já partem para combater os bandidos (com a opção de teleporte da missão, eles vão junto). Ao fim do raid voltam a acompanhar você. (Antes eles só patrulhavam a cidade, por isso só um aparecia por perto.)
- **Lojas com uma opção só:** a **taverna** abre direto na lista de comidas, sem menu e sem botão "Voltar".
- **Sem marcações de dungeon no mapa e no minimapa:** os portais não aparecem mais nos mapas; a coluna de luz roxa basta.
- **Minimapa da dungeon:** dentro da dungeon o minimapa mostra a **planta da ala** (chão claro, rocha escura) girando com você, com a **saída** (roxo) e o **baú** (dourado). **Inimigos não aparecem** nele (nem aliados/cidades).
- **Baú de dungeon novo:** maior, **roxo e brilhante**, todo **quadrado** (a tampa é um bloco que abre para trás), com cantos e fechadura dourados, gema na tampa e um halo que pulsa. Agora fica no centro da sala, livre de pilares e caixas (verifiquei nas 3 alas).
- **Brilho do portal estático:** o redemoinho e as luzes ficam parados.
- **Máximo de 3 itens por baú** (comum e de dungeon).
- **Arrastar e soltar na bolsa (B):** arraste itens entre a **bolsa**, a **barra de armas 1–6** e os **atalhos de cura 7–9**. Tipo errado (ex.: cura na barra de armas) é recusado com aviso. Os botões de mover foram removidos; ficaram Usar, Equipar e Descartar.
- **Ampliar a bolsa agora é no Armeiro** (cartão "🎒 Ampliar a bolsa", ◉300 vezes o preço da cidade); o botão saiu da tela da bolsa.

## Como testar
1. **Raid:** recrute alguns soldados no quartel, vá para longe da cidade e use **Iniciar raid agora** (criativo): todos os soldados aparecem atrás de você. Veja os bandidos de bandana vermelha.
2. **Taverna:** fale com o taverneiro: a lista de comidas abre direto.
3. **Dungeon:** crie portais, entre e veja o minimapa com a planta; abra o baú roxo.
4. **Bolsa:** aperte B e arraste itens entre as três áreas. Compre a ampliação da bolsa no armeiro.

---

# Fase 3 — ajustes (rodada 3)

- **Soldados no raid só quando os bandidos te veem:** em vez de aparecerem no começo do raid, os soldados são chamados (e surgem atrás de você) no instante em que um bandido, a até 46 m, enxerga você. Assim não precisam atravessar o mapa devagar.
- **Dungeon, "ainda falta um inimigo":** a causa provável eram as **aranhas**, que escalavam as paredes de rocha e ficavam por cima do teto. Na dungeon elas agora andam no chão como os outros. Além disso, **só no modo criativo**, os inimigos restantes aparecem em **vermelho no minimapa da dungeon** e há uma **contagem na tela** ("👁 Inimigos restantes: N"). No modo normal nada disso aparece.
- **Dungeon persistente:** os inimigos que você elimina **continuam mortos** se você sair e voltar (e o baú continua destravado se você já limpou a ala). Não dá para farmar. Os sobreviventes voltam aos postos com vida cheia. Isso entra no salvamento.
- **Armeiro com abas:** **🔫 Armas** (compra, munição e conserto) e **🛠 Úteis** (colete e ampliação da bolsa).
- **Sem ouro por matar inimigos:** o ouro por abate foi removido (ficam o loot de itens e a munição). Missões, baús e raids continuam pagando.

## Como testar
1. **Raid:** recrute soldados, fique longe da cidade e use **Iniciar raid agora**: nada acontece com os soldados. Aproxime-se dos bandidos até eles te verem: os soldados aparecem atrás de você.
2. **Dungeon:** no criativo, entre numa dungeon, mate parte dos inimigos, saia e volte: só os vivos reaparecem. Veja a contagem e os pontos vermelhos no minimapa. Em jogo normal eles não aparecem.
3. **Armeiro:** troque entre as abas Armas e Úteis.
4. **Abates:** mate inimigos e confira que o ouro não muda.
