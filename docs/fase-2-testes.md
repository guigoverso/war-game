# Fase 2 — Loja, vendedores limitados, pesca e cozinha: o que foi feito e como testar

Branch: `factions-update`. Arquivos novos: `js/store.js`, `js/cooking.js`, `js/fishing.js`. Alterados: `data.js`, `inventory.js`, `city.js`, `entities.js`, `game.js`, `weapons.js`, `save.js`, `state.js`, `index.html`.

## Ajustes pedidos antes da fase
- **Loot de inimigos a 30%:** cada inimigo morto por você tem 30% de chance de deixar itens (medi 30,3% em 2.000 mortes). **Baús dão sempre pelo menos um item.**
- **Nova "Loja"** (edifício próprio) no lugar do armeiro para vender itens. O armeiro agora só tem armas, munição, colete e conserto. Na Loja você fala com o mercador (E), vê o menu **Vender / Comprar (em breve)** e, em Vender, a **mochila** aparece para escolher o que vender.
- **Cores dos espaços:** relíquia com fundo **dourado**, itens de cura com fundo **vermelho claro** (na bolsa, na loja e nos atalhos). O resto ficou igual.

## O que existe agora
### Edifícios (todas as cidades)
- **Loja** (sinal verde "LOJA", mercador de chapéu atrás do balcão, prateleiras e caixotes). Se não couber um prédio, vira uma barraca de mercador na praça. Marcada com **L** nos mapas.
- **Taverna** (balcão, mesas, lareira acesa, cozinheiro de touca). Marcada com **T** nos mapas.
- Corrigi também um defeito de geração: pequenos trechos de rua podiam ficar soltos entre duas casas. Agora o último passo da geração liga qualquer trecho solto à rede principal contornando as casas (verifiquei 1 rede de ruas por cidade nas sementes 7 e 11).

### Vendedores com ouro e estoque limitados
- Cada cidade tem um vendedor com **ouro limitado** (250 + 100 por nível da cidade). Ao vender, o ouro dele cai; sem ouro ele não compra mais.
- Cada item vendido vai para o **estoque** dele e o preço daquele item cai 5% por unidade acumulada (mínimo 35% do valor).
- A cada **dia de jogo**, o vendedor recupera 1/3 do ouro máximo e revende 30% do estoque (o preço se recupera).
- Cidade inimiga paga metade. Relíquias e a vara não vendem.

### Pesca
- Todo jogador começa com a **Vara de pescar** (item que não vende nem se descarta).
- De frente para a água (3 a 10 m), aparece "[T] Pescar". **T** lança a linha; espere a mordida ("❗ O peixe mordeu! Clique!"), clique em até 1,3 s, depois **segure o botão esquerdo** para puxar. Solte para a tensão cair. Se a tensão (barra de baixo) chegar ao vermelho, a linha arrebenta; se o progresso zera ou o tempo acaba, o peixe escapa. T de novo recolhe a linha.
- Peixes por tipo de água (rio/lago ou mar), bioma e hora (bagre à noite, truta e salmão em regiões frias). Há também caranguejo, **peixe dourado** (raríssimo) e **bota velha** (lixo).
- Peixes viram itens (vendem na loja e servem de ingrediente).

### Cozinha e bônus
- **Fogueira de acampamento** (E ao lado) cozinha receitas simples; a **taverna** cozinha todas.
- Receitas: peixe assado, espeto de carne, sopa de peixe, ensopado rústico e banquete do caçador.
- Os pratos curam e dão **bônus temporários** (aparecem à esquerda na tela, com o tempo): **Força** (+10% dano), **Regeneração** (+0,6 vida/s), **Resistência** (−15% dano recebido) e **Agilidade** (+8% velocidade). Duram 3 a 4 minutos de jogo e entram no salvamento.
- Comer pratos com bônus funciona mesmo com a vida cheia.

### Salvamento
Bônus, vendedores e a vara entram no save (versão 3; salvamentos antigos carregam e ganham a vara).

## Como testar
1. **Loot:** no criativo, mate vários inimigos (ou use "Invocar bando"): só cerca de 3 em cada 10 deixam itens. Abra um baú: sempre vem algum item.
2. **Loja:** vá à loja da sua cidade (letra **L** no mapa), aperte **E** perto do balcão. Clique em **🎒 Vender itens**; a mochila aparece. Clique em um item e **Vender 1** ou **Vender tudo**. Veja o preço cair e o "Ouro do vendedor" diminuir. No criativo, **Zerar ouro do vendedor da cidade atual** mostra a recusa de compra.
3. **Cores:** relíquias (douradas) e curas (vermelhas) na bolsa (B), na loja e na barra 7/8/9.
4. **Pesca:** vá à beira de um rio, lago ou mar, olhe para a água e aperte **T**. Siga as instruções na tela.
5. **Cozinha:** no criativo, clique em **Kit de cozinha (peixes, carne, ervas)**. Vá a uma fogueira de acampamento ou à **taverna** (letra **T** no mapa) e aperte **E**. Cozinhe e depois coma o prato (B → Usar, ou atalho 7/8/9). Veja os bônus à esquerda. **Dar todos os bônus** aplica os quatro de uma vez.
6. **Salvar/carregar:** salve com bônus ativos e o vendedor com ouro menor; carregue e confira.

## Decisões minhas (aprovar ou mudar)
- Ouro do vendedor, queda de preço por estoque e recuperação por dia são provisórios.
- "Comprar" na loja fica desativado ("em breve").
- A fogueira só faz receitas simples; a taverna faz todas.
- Os bônus de comida duram em tempo real de jogo (sem rodadas, que chegam na Fase 4).
- Pesca só com a vara e só com o botão esquerdo/T (sem iscas por enquanto).

## Verificado por mim (por script, sem ouvir áudio)
Loja e taverna em todas as cidades das sementes 7 e 11; ruas conectadas; mercador e cozinheiro nas posições; taxa de loot e baú garantido; classes de cor; venda com saturação, vendedor sem ouro e recuperação diária; receitas, ingredientes por categoria, pratos e bônus (dano, resistência, velocidade, regeneração, expiração); pesca completa (lançar, mordida, puxar, pegar), HUD; salvar/carregar de bônus e vendedores; console sem erros.

---

# Fase 2 — parte 2: armas como itens, vara equipável, cardumes, taverna grande

## Ajustes pedidos
- **Armas e curas como itens.** No inventário (B) há três áreas: **barra de armas 1–6**, **atalhos de cura 7–9** e a **bolsa**. O que está nas barras **não ocupa espaço na bolsa**. Armas novas (compradas no armeiro) vão direto para a primeira vaga livre da barra 1–6; sem vaga, ficam na bolsa até você colocá-las na barra. As teclas **1–6 e a roda do mouse** agora seguem a **barra** (posição), não o número da arma. A durabilidade, a munição e o conserto continuam por arma.
- **Curas:** clique num item de cura e escolha **Atalho 7, 8 ou 9**; a pilha inteira vai para o atalho. Quando a pilha acaba, o atalho se reabastece sozinho com o que houver na bolsa, e novas curas do mesmo tipo entram direto no atalho.
- **Vara de pescar = arma.** Item da barra 1–6, **comprada na Loja** (◉60, aba "Comprar"). Para pescar é preciso equipá-la (tecla da barra ou roda do mouse). Com ela na mão **não dá para atacar** (botão esquerdo não faz nada) e o **botão direito** pesca (não dá zoom). O modelo na mão é completo: cabo de cortiça, carretilha com manivela, haste em gomos com passadores e ponta vermelha, e a **linha pendurada com boia e anzol**; ao lançar, a linha sai da ponta da vara até a boia na água.
- **Cardumes (pontos de pesca).** Só se pesca em **cardumes**: um anel branco na água com peixes nadando em círculo, perto das margens (~40 por mundo, rio/lago e mar). Mire em um cardume (3 a 15 m à frente) e aperte o botão direito. **Depois de pescar com sucesso, o cardume some** (volta depois de 2 dias de jogo). Se o peixe escapar ou a linha arrebentar, o cardume continua.
- **Taverna maior.** Salão de pelo menos 8×8: **balcão** com prateleira de garrafas, canecas no balcão e o taverneiro atrás; **mesas** com bancos, **canecas de cerveja e pratos de comida** em cima e **2 a 4 clientes sentados**; **barris**; e um **fogão** no fundo (com panelas e chaminé). No fogão (E) o jogador cozinha todas as receitas; no balcão (E) o **taverneiro vende comida pronta** (peixe assado, espeto, sopa, ensopado). Todas as 7 cidades de teste tiveram a taverna grande.
- **Placas cortadas:** as placas (LOJA, CLÍNICA, ARMEIRO, TAVERNA, PREFEITURA, QUARTEL) ficavam coladas na parede e eram parcialmente cobertas por molduras que saem da fachada. Agora ficam 22 cm à frente da parede e o texto aparece inteiro.
- **Relíquias:** não saem mais de baús comuns (só da tabela `chest_dungeon`, para as dungeons da Fase 3). **Moeda antiga e joia** têm **10% de chance cada** em baús comuns.
- O armeiro continua vendendo armas, munição, colete e conserto (sem venda de itens).

## Como testar
1. **Barras:** no criativo, na pausa clique **Dar 1 de cada item**/**Liberar todas as armas**. Aperte **B**: clique numa arma e use **Barra 1…6**, **Equipar**, **Para a bolsa**. Use as teclas 1–6 e a roda do mouse. Confira que o que está nas barras não conta em "Bolsa: x/20".
2. **Curas:** clique numa bandagem e em **Atalho 7**; use a tecla 7 até acabar: o atalho reabastece sozinho da bolsa.
3. **Vara:** na Loja (E no balcão) → **Comprar** → vara (◉60). Ela vai para a barra; aperte a tecla da barra. Tente atirar: nada acontece.
4. **Pesca:** vá à beira da água e procure o **anel com peixes**. Olhe para ele (a dica "[Botão direito] Pescar neste cardume" aparece), aperte o botão direito para lançar, de novo quando mordar ("❗") e **segure** para puxar. Ao pegar o peixe, o cardume desaparece.
5. **Taverna:** entre numa taverna (letra **T** no mapa). Fale com o taverneiro (balcão) para comprar comida e use o fogão (fundo, à direita) para cozinhar.
6. **Placas:** passe por LOJA/CLÍNICA/ARMEIRO/etc. e confira o texto completo.
7. **Baús:** abra vários baús comuns: nunca saem relíquias; moeda antiga e joia aparecem em ~10% das aberturas cada.
8. **Salvar/carregar:** o salvamento (versão 4) guarda as barras, as pilhas dos atalhos e os cardumes já pescados; salvamentos antigos carregam e as armas viram itens.

## Decisões minhas
- A barra de armas tem 6 vagas e a vara ocupa uma. Com as 6 armas, a vara precisa dividir espaço (você escolhe qual deixa na bolsa).
- Vender armas: só as que estão **na bolsa**, e nunca a última arma. Itens das barras não aparecem na tela de venda.
- A vara custa ◉60 e vende por ◉30. O taverneiro não compra itens (só vende).
- Cardumes reaparecem após 2 dias de jogo (depois passa a seguir as rodadas).
