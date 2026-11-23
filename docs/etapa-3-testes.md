# Roteiro de testes: etapa 3 (campo do mundo e mapa local por janela)

O código desta etapa **nunca foi aberto no navegador** (a sessão foi só código). Por isso o primeiro passo é ver se o jogo carrega. Se algo quebrar, copie a mensagem de erro (F12 → Console) e passe para a próxima sessão.
Sempre recarregue com **Ctrl+F5**. Sem `?cenario=tile` nem `?mundo=1` o jogo deve ser **idêntico ao de antes**.

## 0. Teste automático (terminal, sem abrir o jogo)
```powershell
cd tests; node macro/campo.js 11
```
Tudo deve sair `OK`. Com `--mapa` imprime o mundo inteiro em texto, um formato por vez (`~` mar, `.` planície, `f` floresta, `:` deserto, `*` neve, `^` rocha, `o` centro de tile). Rode também com outras sementes (`5`, `970901248`).

## 1. O jogo normal não pode ter mudado
1. Abra `index.html?auto=1&mute=1&seed=11`. Deve gerar o mundo de sempre (704, cidades, POIs, estradas), sem erro no Console.
2. Rode `node tests/smoke.js` (primeira vez: `cd tests && npm install && npx playwright install chromium`). Tudo `OK`.

## 2. Um tile: `?cenario=tile`
Abra `index.html?cenario=tile&auto=1&mute=1` (semente 11, janela de natureza 256×256).
Validar:
- [ ] Carrega sem erro e você começa na **sua cidade pequena**, no centro do mapa (o jogo exige uma cidade; ela não faz parte do conceito do tile).
- [ ] O terreno **não é uma ilha com mar em volta**: a terra segue até a borda do mapa.
- [ ] **Borda fechada por árvores**: ande até as bordas. Deve haver uma faixa de árvores de largura irregular (6 a 11 blocos, "orgânica") e **não dá para atravessar** nem sair do mapa (parede invisível dentro da faixa).
- [ ] Em **algum ponto da borda há uma abertura** sem árvores, de uns 10 blocos de largura, com uma **estrada de terra** que vem dela até um portão da cidade. É a "trilha para um vizinho".
- [ ] Pausa (Tab) → aba **Facções**: o painel "Teste de tile" mostra o formato do mundo, o tile (i,j), o centro no mundo, o número de trilhas/aberturas, uma imagem do mundo inteiro (quadrado vermelho = seu tile, pontos brancos = centros da grade, linhas claras = trilhas) e atalhos. **Confira se as aberturas listadas batem com as que você vê no jogo** (E, W, S, N) e se a imagem corresponde à posição.
- [ ] Botão "📍 Ir à primeira abertura da borda" leva você até a abertura, olhando para fora.
- [ ] Minimapa/mapa (M): sem faixas estranhas; a estrada da abertura aparece.
- [ ] Anote se alguma abertura ficou **sem estrada** (o painel escreve "sem estrada") e se a estrada tem degraus feios ou termina no meio do mato.

## 3. Janela de cidade: `?tipo=cidade`
`index.html?cenario=tile&tipo=cidade&auto=1&mute=1`
- [ ] Mapa de **320** (veja o tamanho no painel). Mesmos itens do passo 2.

## 4. Os quatro formatos de mundo
Abra um por vez e olhe a **imagem do mundo** no painel (Tab → Facções), ela mostra o formato inteiro:
- `...&forma=continentes` (3 massas de terra separadas por mar)
- `...&forma=pangeia` (uma terra grande recortada)
- `...&forma=arquipelagos` (muitas ilhas pequenas)
- `...&forma=lago` (terra com um lago grande no meio)
- [ ] Cada formato é reconhecível; o mundo é cercado de mar; a **escolha automática** (sem `forma=`) muda com a semente (`&seed=5`, `&seed=7`).
- [ ] O tile escolhido tem **bastante terra** (o jogo escolhe o tile com ~80% de terra perto do centro). Em arquipélagos o tile pode ter costa/ilhas: olhe se a costa tem praia e o mar é azul, sem paredões estranhos.

## 5. Costa, baía, ilha e rio vindos do campo
Em um tile litorâneo (por exemplo, formato continentes ou arquipélagos; use `&ti=&tj=` para escolher outro tile, números de 0 a 6):
- [ ] A costa é **suave** (praia, depois mar), sem parede reta na borda do mapa.
- [ ] Rios aparecem como **vales com água** vindo de fora para dentro do mapa (não nascem do nada nem terminam num buraco quadrado).
- [ ] Biomas coerentes e **deserto nunca encostado em neve** (`&bio=desert`, `&bio=snow`, `&bio=mountain` mudam o bioma dominante).
- [ ] Sem cidade/estrada **dentro d'água**; se o tile não tiver terra suficiente para a cidade, anote o erro.

## 6. Continuidade com o vizinho (o teste principal da etapa)
Dois tiles que se sobrepõem têm de mostrar **exatamente o mesmo terreno** na parte comum.
1. No painel (Tab → Facções), em "Deslocar a janela 128 blocos", clique em **→**. Abre uma janela livre (`wx`/`wz`) deslocada 128 blocos para leste.
2. Abra o **mapa grande (M)** do tile original e do deslocado (anote cada um; ou abra em duas abas do navegador) e compare: a **metade direita do original = metade esquerda do deslocado** (a costa, os rios e as serras têm o mesmo desenho, 128 blocos mais para a esquerda). A cidade e a estrada ficam em lugares diferentes (a cidade é recolocada no centro da janela e aplaina o terreno em volta; compare fora dela).
3. Repita com ↓, ← e ↑.
4. Atalhos de vizinho: o painel lista "Ir para o vizinho: → Leste (i,j)…". Clique e confira que a **abertura do outro lado** fica na borda oposta (a abertura leste de um tile é a oeste do vizinho) e que a estrada de terra aponta para a mesma direção.
- [ ] Terreno igual na parte comum. [ ] Aberturas dos dois tiles se correspondem (lado oposto). [ ] Se a janela livre cair no mar, o jogo pode falhar ao carregar: escolha `wx`/`wz` em terra (é uma limitação conhecida deste cenário).

## 7. `?mundo=1`: o mapa normal como janela do campo
`index.html?mundo=1&auto=1&mute=1&seed=11`
- [ ] Gera o mapa de 704 com cidades, estradas e POIs como antes, mas o **terreno vem do campo do mundo** (sem forma de ilha própria) e a **borda inteira é fechada por árvores** (não há trilhas para vizinhos).
- [ ] Sem erros, jogável, tempo de geração parecido com o normal (anote se demorar muito mais).
- [ ] `?w=640` e `&forma=...` também funcionam.

## 8. O que anotar para a próxima sessão
- Mensagens de erro do Console, se houver.
- Aberturas sem estrada, estradas com degrau, árvores sobre a estrada, parede invisível falhando (dá para sair do mapa) ou bloqueando demais.
- Largura da faixa de árvores e das aberturas boa? Ajuste em `WORLD_FIELD` (`js/modifiers/map-modifiers.js`: `borderBase`, `borderVar`, `gapHalf`, `gapDepth`, `trailProb`, `coastWidth`, `landTarget`).
- Os 4 formatos têm terra demais ou de menos? (medição em Node: continentes 18 a 21%, pangeia ~40%, arquipélagos 16 a 24%, lago ~35% do mundo)
- Limitações conhecidas desta etapa: a grade de tiles é provisória (etapa 5 troca por grafo); o tile tem sempre a sua cidade pequena; tile de mar puro não é suportado; cidades grandes (200 de lado) e tipos de tile são da etapa 4; salvar/carregar não foi adaptado ao mundo novo (etapa 8).
