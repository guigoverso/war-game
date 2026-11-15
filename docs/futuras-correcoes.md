# Futuras correções

Lista de ajustes anotados para fazer depois. Itens marcados com [x] já foram corrigidos.

- [x] **Portal dourado durante batalha:** não deve ser possível entrar no portal dourado enquanto há uma batalha em andamento. — **corrigido:** entrar no portal dourado durante a disputa mostra um aviso e não entra (`doInteract`, `CONTEST.active`)
- [x] **Lojas durante invasão:** não deve ser possível acessar as lojas de uma cidade enquanto ela está sendo invadida. — **corrigido:** lojas fechadas só enquanto há combate (onda de raid na sua cidade ou ataque a cidade inimiga) e abertas no intervalo entre ondas (`raidLocked`)
- [ ] **Balanceamento das raids (pendente: precisa de teste jogando):** ainda estão muito fáceis. Porém invadir uma cidade fortificada sozinho é bem mais difícil. Entender o porque.
- [x] **Som espacial:** está sendo possível escutar sons de longe como se estivesse do meu lado.  — **corrigido:** volume cai com o quadrado da distância, alcance 90 (`sfx`)
- [x] **Pulo:** está sendo possível pular dois blocos. O máximo é 1.  — **corrigido:** impulso 7,8 → 7,2 (altura ~1,08 bloco)
- [x] **Área com muitas árvores:** Está muito confuso navegar por essas áreas e encontrar inimigos. Uma sugestão é, se o jogador estiver na área da árvore, deixar suas folhas meio transparente para que ele possa ver em volta. — **corrigido:** as copas (e a neve dos pinheiros) ficam em malha própria; quando o jogador está sob uma, só os pedaços acima da cabeça e a até ~3,3 blocos dele ficam vazados em tela quadriculada (shader em `LEAF_MAT`, `world.js`)
- [ ] **NPCs presos nas folhas das árvores (não reproduzido: as folhas não têm colisão, investigar jogando):** NPCs que surgem ou andam pelas árvores ficam presos nas folhas
- [x] **Preço do quartel:** corrigido, o botão de comprar arma mostra o preço real (`bp(w.price,'weapon')`).
- [x] **Som do vento:** está muito constante, a cada segundo eu escuto. O espaçamento deve ser maior. — **corrigido:** removido o LFO rápido e rajadas bem mais espaçadas (30–70 s)
- [x] Na entrada da cidade está com dois matros de bandeira, deve ter apenas um.  — **corrigido:** um mastro por entrada
- [x] Na parte de facção dos livros, as facções tem que estarem do lado esquerdo e a informação do lado direito — **corrigido:** lista à esquerda, detalhes à direita
- [x] Facções não podem ter o mesmo substantivo. Por exemplo: Reino do Lobo, Império do Lobo.  — **corrigido:** sem substantivo repetido (`FAC_EPITH`, `FAC_FIXED`)
- [x] Outras formas de gerar o nome, por exemplo: Águias Prateadas, Culto da Folha, O Sexto Dia.  — **corrigido:** nomes prontos como Águias Prateadas, Culto da Folha, O Sexto Dia
- [x] Na tela de caravanas tem que mostrar o que a Cidade está enviando e o que ela está recebendo — **corrigido:** mostra o que cada cidade envia e recebe
- [x] Há postes sendo construídos na frente das portas dos edifícios — **corrigido:** `lamp` não é construído a menos de 2,6 blocos de uma porta
- [x] Cavernas devem renovar seus animais e baú com o passar das rodadas — **corrigido:** `renewCave`: a cada 3–5 rodadas por gruta, fora da vista, o baú reabre e os animais voltam se todos morreram
- [ ] Após decidir uma política, o botão de decidir política deve desaparecer (o botão do livro e a notificação já somem sem política pendente; confirmar jogando qual botão ainda aparece)
- [x] Ícone de minério bruto não está aparecendo na bolsa — **corrigido:** ícone ⛏ com seletor de emoji (U+FE0F), que sumia no fundo escuro
- [x] Os bonus de quando dá mais suprimentos que o necessário devem vir só na próxima rodada  — **corrigido:** bônus de entrega acima da meta só vale na rodada seguinte (`rd.rnext` → `rd.rbuf` em `endRound`)
- [x] No relatório da rodada anterior, se a cidade foi corretamente suprida (ou até mais para ter bonus), deve estar escrito — **corrigido:** relatório traz '✔ suprida corretamente' (e o bônus para a próxima rodada)

## Ajustes seguintes (feitos)
- Declarar guerra fica desativado na rodada 0 (livro, aba Facções).
- Passar o mouse numa cidade no mapa grande mostra também a produção.
- Tipos de cidade por rodízio embaralhado pela semente (`initEconomy`): nenhum tipo some nem domina. Só vale para mundos/saves novos; cidades já salvas mantêm o tipo.
- O portal dourado no minimapa se comporta como a estrela de missão (no aro quando longe, no local quando perto, por cima de tudo).
- A política Dungeon dourada tem só as opções A e B.
- Portais (comuns e dourado) nunca nascem dentro de árvores: `treeNear` (células de tronco em `TREEC`, `world.js`) exige 4–5 blocos livres.
- Inimigos de dungeon presos em pilares, paredes e fora da ala: a causa era `spawnEnemy` usar `freeSpot` (que olha o terreno de cima) também na dungeon. Agora a dungeon usa `dgFreeSpot` (só piso da ala, sem blocos por perto), e `rescueStuck` ganhou resgate no mundo de baixo que devolve o inimigo ao ponto livre mais próximo.
