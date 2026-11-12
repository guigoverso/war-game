# Fase 1 — Itens, inventário, cura e durabilidade: o que foi feito e como testar

Branch: `factions-update`. Arquivo novo: `js/inventory.js`. Alterados: `data.js`, `state.js`, `game.js`, `weapons.js`, `entities.js`, `poi.js`, `save.js`, `index.html`.

## Ajustes pedidos junto com a fase
- **Dívida:** a moeda abaixo da barra de vida fica **rosa-avermelhada** (`#ff3d7f`, tom diferente do vermelho da vida) e mostra "(dívida)".
- **Modo criativo:** já começa com **invencível, munição infinita e pente infinito** ligados (dá para desligar na pausa).

## O que existe agora
- **Bolsa (tecla B):** 20 espaços, com **um upgrade** para 30 espaços (◉300). Itens empilham (máximo por item na tabela de dados).
- **15 itens** em `DATA.items`: materiais (sucata, couro, carne, ervas), troféus (pele de lobo, presa de javali, seda de aranha, ferrão de escorpião, garra de urso, moeda antiga, joia), relíquia (só para facções no futuro; não vende) e curas (bandagem, kit médico, erva curativa).
- **Loot** (`DATA.loot`): cada inimigo morto **por você** e cada **baú** pode dar itens. Soldado dá sucata/bandagem/couro; lobo dá pele e carne; urso dá garra, couro e carne; aranha dá seda; escorpião dá ferrão; javali dá presa e carne; etc. Mortes por aliados ou por brigas entre bichos e soldados não dão loot.
- **Sem itens no chão:** se a bolsa está cheia, o novo item vira **pendente**; aparece o aviso "🎒 Bolsa cheia — B". Ao abrir a bolsa, você escolhe o item novo e clica no item da bolsa que quer descartar no lugar. O que não for guardado some.
- **Curas:** bandagem (+25), kit médico (+60), erva curativa (+40 ao longo de 8 s). Usa pela bolsa ou pelos **atalhos 7, 8, 9** (barra no centro de baixo da tela). A clínica também vende bandagem e kit médico.
- **Vender:** o armeiro tem a seção "Vender itens da bolsa" (cidade inimiga paga metade). A relíquia não vende.
- **Durabilidade das armas:** cada arma tem 0–100%. Cai ao atirar; abaixo de **50%** causa 10% menos dano, abaixo de **25%** causa 25% menos. Em **0%** a arma **quebra** e não atira. O HUD mostra a durabilidade ao lado do nome da arma.
- **Conserto:** no armeiro, "🔧 Consertar". **Nunca é bloqueado**: sem ouro suficiente o ouro fica **negativo** (dívida), e em dívida você não compra nada.
- **Salvar:** a bolsa, os atalhos e a durabilidade entram no salvamento (versão 2; salvamentos da Fase 0 continuam carregando).

## Como testar

### 1. Bolsa e itens (modo criativo)
1. Entre pelo **🛠 MODO CRIATIVO**. Na pausa (Esc/Tab/O), clique em **Dar 1 de cada item**.
2. Feche a pausa e aperte **B**: a bolsa abre com os itens. Clique em um item: aparecem detalhes, **Usar**, **Atalho 7/8/9** e **Descartar**.
3. Em um item de cura, clique em **Atalho 7**. Fechada a bolsa, a barra embaixo mostra o ícone com a quantidade. Aperte **7** com a vida baixa para curar (com vida cheia ele avisa e não gasta).

### 2. Bolsa cheia e descarte
1. Na pausa, clique em **Encher a bolsa (teste de bolsa cheia)**, depois em **Dar 1 de cada item**.
2. Aparece "🎒 Bolsa cheia!" e o alerta vermelho na barra. Aperte **B**.
3. Na caixa vermelha, clique em um item novo (fica dourado) e depois em um item da bolsa: ele é trocado. **Descartar novo** descarta o item novo.
4. Descartando qualquer item, o espaço liberado já é usado por um pendente.

### 3. Ampliar a bolsa
Na bolsa, **Ampliar bolsa** (◉300) passa para 30 espaços. Só pode ser feito uma vez e respeita a regra de dívida.

### 4. Loot de verdade
- **Inimigos:** mate bandidos, soldados ou animais (use "Invocar bando de animais" no criativo). Aparece "🎁 +1 🔩 Sucata de metal…". Animais dão peles e presas.
- **Baús:** abra um baú (com o ouro vem também uma lista de itens).

### 5. Vender
Vá ao **armeiro** (E perto da loja): a seção "🎒 Vender itens da bolsa" lista seus itens. **Vender 1** ou **Vender tudo**. Em cidade inimiga paga metade. A relíquia não aparece.

### 6. Clínica
Na clínica há **Bandagem** e **Kit médico** para comprar (ficam na bolsa). Sem espaço na bolsa ou em dívida, a compra é recusada.

### 7. Durabilidade e conserto
1. No criativo, clique em **Desgastar arma atual −40%** algumas vezes e atire: o HUD mostra a durabilidade e o dano cai nas faixas.
2. Quando chegar a 0%, a arma **não atira** e aparece "💥 QUEBRADA".
3. Vá ao armeiro e clique em **🔧 Consertar**. Com pouco ouro, o botão avisa "(gera dívida)", e depois do conserto o ouro fica negativo e a moeda do HUD fica rosa-avermelhada.
4. **Desgaste das armas** (botão no criativo) liga e desliga o desgaste; **Consertar todas as armas (grátis)** restaura tudo.

### 8. Salvar e carregar
Salve (pausa → 💾), mude a bolsa e a durabilidade, carregue: bolsa, atalhos e durabilidade voltam.

### 9. Console (F12)
```js
invGive([['kit_medico',2]])   // dá itens (devolve o texto do aviso)
STATE.inv; STATE.dur           // bolsa e durabilidade
rollLoot('wolf')               // sorteia o loot de um lobo
```

## Decisões que tomei sozinho (para você aprovar ou mudar)
- **Tecla B** abre a bolsa (a tecla I continua sendo o modo invisível do criativo).
- **Valores:** bolsa 20 → 30 espaços (◉300), desgaste por tiro de cada arma, preços dos itens e chances de loot são provisórios e ficam em `DATA.items`, `DATA.loot` e na tabela `WEAR` de `js/inventory.js`.
- **Atalhos 7, 8 e 9** (3 espaços) para itens consumíveis.
- **Conserto** cobra só ouro por enquanto (o minério entra quando houver estoque, na Fase 4).
- **Vendedores com ouro limitado** ficam para a Fase 2.
- **Melhoria de equipamentos com itens** não foi incluída nesta fase (só venda); posso adicionar depois.

## Verificado por mim (por script, sem ouvir áudio)
Itens e tabelas válidas; dar, usar, empilhar, atalhos, regeneração; bolsa cheia, pendentes, troca e descarte; upgrade de bolsa; loot de inimigos e de baú; desgaste, quebra e bloqueio do tiro; conserto com dívida; cor da moeda; venda; salvar e carregar de bolsa/durabilidade; console sem erros.
