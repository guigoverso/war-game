# Decisões de design (respostas às 27 perguntas)

**Status:** decidido, não implementado. Complementa `1_pois-revisao.md`, `2_mapa-e-distribuicao.md` e `3_tarefas.md`. Onde há conflito, **este arquivo vale**.

## Mapa (tarefa 1)
- Cidades: **6 a 8**.
- Distância mínima entre os centros das cidades: **220 blocos** (`MIND`). Se o terreno não comportar (mundo com muita água), a distância desce como já desce hoje.
- Lado do mapa: **704**.

## Saves antigos
Não é preciso se preocupar: sem conversão de POIs antigos e sem compatibilidade com mapas de 896.

## Nível (vale para produção, pedágio e Entreposto)
- Do **jogador**: nível do líder (`rd.lvl`, o nível da capital).
- Das **facções NPC**: o maior nível entre as cidades da facção.
- **Sem teto na produção** por enquanto; o sistema de nível do líder vai ser mudado no futuro. Por isso, o nível deve ser lido por **uma função só** (por exemplo `poiLvl(dono)`), para trocar a regra em um lugar.

## Produção dos POIs (muda a regra atual, tarefa 3)
- **Todas as produções** (Fazenda, Mina, Serraria, Acampamento de caçadores) passam de "3 por rodada" para **1 + Nível** (hoje `POIX.prod`, em `js/poigame.js`).
- O que é produzido vai para o **armazém** (o couro também).
- Pedágio da Ponte: **20 × Nível** por rodada (hoje 30 fixo). Já é só uma renda extra para o dono: ninguém paga para passar, nem o jogador nem as caravanas.

## Acampamento de caçadores (tarefa 3)
- +couro por rodada (regra acima), guerra reduz o suprimento de couro do inimigo.
- Ao ser **conquistado**: um baú com **1 a 3 carnes**, **uma vez só**.

## Taverna e ferreiro (tarefa 4)
- Conserto de arma: ouro pelo preço normal; **ou** com sucata: a quantidade de sucata da tabela atual **+ 60% do preço em ouro** (a sucata cobre os outros 40%).
- O ferreiro atende em **qualquer Taverna**. Em Taverna de **outra facção**, os preços ganham o buff ou debuff da relação com ela.
- **Taverna de bandidos:** só NPCs bandidos. Os NPCs normais só aparecem quando a Taverna pertence a uma facção.
- **Taverna de outra facção:** mesmos NPCs, preços com a relação. **Não dá para recrutar** lá.
- **Mercenário (NPC novo):** abre a tela de recrutamento de soldados. Aparece **só na Taverna do jogador**.

## Santuário (tarefa 5)
- **Peregrinos e sacerdotes são só ambientação: não dão missão.** Aparecem em Santuário de qualquer dono, **menos quando está com bandidos** (nesse caso não há ninguém).
- **Paz:** quando uma cidade do dono não foi suprida, há **50% de chance** de o humor dela **não ficar em Descontente**. Não acumula entre vários Santuários.
- **Rebelião:** o humor do Santuário **não mexe na contagem de rodadas sem suprimento**: ela conta como se o Santuário não existisse. Em vez disso, quando uma cidade do dono **ia se rebelar** (por exemplo, estava a 1 rodada da rebelião e o jogador encerrou o turno do comandante), há **30% de chance de a rebelião ser adiada para a rodada seguinte**, dando mais tempo ao jogador. Não acumula.
- **Guerra:** reduzir a fadiga, com 30% de chance de não funcionar, não acumula. **Fica parado até a fadiga existir.**

## Ruínas (tarefa 6)
- De **2 a 3** no mapa (hoje 3 a 5).
- Sem dono e **sem anexar**. Funcionam como um acampamento de bandidos: guarnição que volta com as rodadas, baú que **não** volta.
- Baú com **30%** de chance de artefato.

## Entreposto comercial (tarefa 7)
- Pertence à **facção** dona (a regra de dono é a de todo POI). Se o dono for **bandido**, não há lojista nem renda (como a Taverna de bandidos); só ganha lojista e renda quando é de uma facção.
- Renda: **40 × Nível** por caravana da facção que passa por ele.
- Loja: **comida, munição, remédios e materiais**, preço **10% acima**. Em Entreposto de outra facção: 10% + buff ou debuff da relação.
- Guerra: **só quando as duas facções estão em guerra**, impede caravanas (do jogador e do inimigo) que passariam por ele.
- O jogador **pode** criar caravanas passando pelo próprio Entreposto.

## Quartel (tarefa 8)
- Vale em **qualquer cidade do jogador**. Só ouro: 35% do preço de um colete novo, como hoje. Com couro suficiente (5): a regra do ferreiro, **5 couros + 60% do preço em ouro**.

## Geração (tarefa 9)
- Limites por tipo no mapa: **Santuário 3, Forte 3, Torre 4**; o resto sem limite.
- Estradas curtas (menos de 80 blocos) ficam sem POI de estrada.
- A Ponte é independente da regra Taverna × Entreposto.
- **Estradas de ligação** (substitui a seção de "Mudança na regra de estradas" do doc 2): só Ponte, Taverna, Entreposto e Fazenda. A **Fazenda ganha um desvio até a estrada mais próxima**, não até a sua cidade.

## Geral
- Preços de compra na Negociação: Caçadores ◉3500, Santuário ◉3500, Entreposto ◉4500.
- Todos os números ficam em `POIX` e podem ser ajustados depois de jogar.

## Mudanças nas tarefas
Já aplicadas em `3_tarefas.md`.
