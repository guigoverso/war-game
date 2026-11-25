# Mapa Mundi + Mapas Locais (feature 5)

Branch: `mapa-mundi-update` (a partir de `factions-update`). **Nenhuma implementação começa** até fecharmos as mecânicas e o plano de implementação.
Este arquivo é o registro das decisões. Convenção: **[DECIDIDO]** foi confirmado pelo usuário; **[PROPOSTA]** é sugestão da IA aguardando resposta; **[ABERTO]** é pergunta.

## Ideia central
Hoje o jogo tem um único mapa (704×704) com 6 a 8 cidades. A mudança: um **Mapa Mundi** gerado por semente, com **trilhas** (grafo, como no jogo de referência), onde cada ponto/tile da trilha é um **Mapa Local** menor, gerado por semente quando o jogador entra. Os tiles servem a exploração, confronto e recursos.

## Decisões

- **[DECIDIDO]** Guerra (feature 3 `3_frente-da-guerra.md` e 4 `4_operacoes-de-guerra.md`) **pausada**. A frente por terreno (`warfront.js`) será substituída: o jogador move o batalhão pela trilha de tiles até a cidade alvo, com inimigos estacionados nos tiles; ao ocuparem o mesmo tile, começa a batalha.
- **[DECIDIDO]** Cada tile de cidade tem **uma só cidade**, maior que a atual (~40% do mapa local).
- **[DECIDIDO]** Estradas locais geradas conforme a posição do tile no mundo: tile com saídas só em lados opostos = estrada de um ponto ao outro; tile com bifurcação = estrada com bifurcação.
- **[DECIDIDO]** Fazer **antes** uma definição de arquitetura modular do projeto.
- **[DECIDIDO]** Tiles precisam de mais tipos de acontecimento para o mundo ficar dinâmico (lista em "Ideias de eventos de tile").
- **[DECIDIDO]** Atores no mundo além do jogador: bandidos, caravanas, soldados de outras cidades, comerciantes, nômades etc.
- **[DECIDIDO]** Loading de mapa local menor é aceitável (o mapa atual gera em poucos segundos).
- **[DECIDIDO]** Batalhas do jogador são **sempre jogadas** (nunca automáticas). Entre atores de outras facções, sem o jogador, resolve por número (a confirmar, pergunta 5).
- **[DECIDIDO]** O que são os tiles ainda **não está definido**; é a primeira tarefa de design (ver "Tipos de tile").
- **[DECIDIDO]** Número de tiles do mundo: chute inicial e ajuste por teste (vai para `map-modifiers.js`).
- **[TENDÊNCIA do usuário]** Economia de ação por turno: **uma ação de um batalhão por turno** (ou uma ação por batalhão). A evolução da facção liberaria mais turnos no mapa e mais batalhões. Ver análise "Ações por rodada".
- **[ABERTO]** Tamanho do mapa local. Referência histórica: 640 (início) → 896 → 704 (hoje). Ver análise "Tamanho do tile".

## Análise das respostas do usuário

### Atores no mapa mundi (ponto 3): é o que une o resto
Se bandido, caravana, soldado, comerciante e nômade são **o mesmo tipo de coisa** (um ator com posição num tile, dono, unidades e destino), a regra vira uma só: **dois atores no mesmo tile = encontro**. Isso substitui sistemas que hoje são separados:
- caravana = ator andando por uma aresta (some `roadSpot`/estrada real; emboscar = encontrar o ator no tile);
- raid = ator bandido chegando ao tile da cidade;
- guerra = batalhão chegando ao tile do inimigo (sua ideia);
- rebelião e missões podem virar encontro/ator também.
Encontro entre atores **fora de vista do jogador** é resolvido por número (força x força, com a mesma ficha de unidades); com o jogador presente, abre o mapa local e é jogado. Isso mantém a simulação barata e dá um mundo vivo sem simular tudo em 3D.

### Pontos por rodada (ponto 4): recomendo a opção 2
Opção 1 (andar de graça): sem pressão de tempo, dá para explorar o mundo inteiro e voltar antes do fim da rodada; a rodada deixa de importar. Opção 2 (pool de ~15): andar custa, agir custa, e o jogador decide entre explorar, lutar ou cuidar da cidade; combina com `actCost`/`canAct`/`spendAct` que já existem em `econ.js`. Ajustes sugeridos:
- custo por aresta depende do terreno (estrada barata, mata/montanha cara);
- **tempo dentro do mapa local não gasta ponto**; só entrar/sair e as ações de rodada gastam;
- ações de local (saquear, anexar POI, negociar) têm custo próprio.
**[ABERTO]** O pool é compartilhado entre os atores que o jogador controla? (ver "Mover dois atores").

### Mover dois atores: possível, com uma regra
Viável **se o mundo for só dados** (ator = `{id, dono, tile, unidades, destino}`, sem Three.js). O jogador teria, por exemplo, o **personagem** (corpo jogável em tempo real) e o **batalhão** (ator de mapa mundi). Restrição: só **um mapa local ativo por vez**, então:
- o personagem anda e joga em tempo real; o batalhão só se move no mapa mundi;
- encontro do batalhão: **batalha automática** por número, ou fica **pendente** até o jogador escolher jogá-la (aí o personagem é levado ao tile);
- pool compartilhado torna dividir esforço uma decisão real; pool separado (ex.: personagem 15, batalhão 5) é mais simples de entender.
Custo extra: UI de seleção do ator ativo e ordem de resolução quando os dois chegam a encontros no mesmo turno.

### Estradas por tile
Tecnicamente cabe: o mundo guarda as saídas de cada tile; o gerador local liga os pontos de saída (reuso de `carveRoad` com várias pontas e um nó central quando há bifurcação). Pontos de atenção:
- **Casar as bordas:** o ponto de saída na borda entre A e B deve ser o mesmo nos dois tiles. Derivar a posição de um hash da **aresta** (`hash(idA,idB)`), não do tile.
- Se o grafo for irregular como na imagem (não é grade), a direção de cada aresta vira um dos pontos da borda do quadrado (por ângulo).
- Terreno e bioma dos tiles devem vir de um **campo contínuo do mundo** (altura, umidade, mar), para o tile vizinho de mar ter costa coerente.
- A cidade de ~40% precisa de portões nas saídas da estrada; muro e torres por nível (`cityWallBuild`) já existem.

### Arquitetura modular (ponto 0): proposta
Hoje: ~60 arquivos de scripts globais, sem build, 571 usos de `WORLD` em 37 arquivos. Não recomendo converter para ES modules agora: seria uma refatoração do tamanho da própria feature, e quebra abrir `index.html` direto. Proposta em **camadas dentro do mesmo estilo de scripts globais**, com regra de dependência:
1. **`core`** — `util`, `state`, `save`, `Hooks`, `Ledger`, modificadores e textos. Sem Three.js, sem DOM.
2. **`macro`** (mundo como dados) — grafo do mundo, tiles, atores, encontros, rodadas, economia, facções, guerra, caravanas. **Sem Three.js e sem DOM**: roda em Node, então dá para testar rodadas, guerra e economia sem navegador (hoje "testar = jogar").
3. **`local`** (mapa em 3D) — geração do terreno/cidade/estradas, nav, entidades, armas, render. Recebe uma **descrição do tile** (`{seed, tipo, saídas, dono, ...}`) e devolve **eventos** (ex.: "encontro vencido", "cidade anexada") para o macro.
4. **`ui`** — caderno, painéis, HUD, mapa mundi.
Contrato: macro nunca toca malhas; local nunca altera o `STATE` direto, só emite resultado. Passo 0 técnico: `WORLD` passa a ser "o mapa local atual" (alias temporário) para o jogo atual continuar rodando como um tile. Pastas: `js/core`, `js/macro`, `js/local`, `js/ui`, mantendo a ordem de carga em `index.html`.

### Ideias de eventos de tile (para o mundo dinâmico)
Acampamento de bandidos, caravana parada, mercador ambulante, nômades, ruínas/relíquia, fonte de recurso (mina, madeira, pesca), travessia (ponte, vau, barca), clima, emboscada, refugiados, patrulha de facção, ninho de bestas, santuário, local sagrado de rebelião. **[ABERTO]** quais entram no primeiro corte.

## Análise da rodada 2

### Tamanho do tile
Histórico do projeto (`git log` de `js/phys.js`): **640** no começo (20×20 chunks de 32), depois **896**, e **704** hoje (896 cansava de atravessar). Cidade atual: `half` de 36 a 45, ou seja lado de 72 a 90 blocos, cerca de 1,3 a 2% da área do mapa de 640.
Com 40% da **área** do tile (não do lado):
| Tile | Área da cidade | Lado da cidade | `half` | Vs. hoje |
|---|---|---|---|---|
| 640 | ~164 mil | ~405 | ~200 | 5x o lado, ~25x a área |
| 320 | ~41 mil | ~202 | ~100 | 2,3x o lado, ~6x a área |
| 256 | ~26 mil | ~162 | ~80 | 2x o lado, ~4x a área |
Recomendação: **tile de cidade ~320** e tiles de viagem/natureza menores (256). 640 repetiria o problema de atravessar, e uma cidade de 400 blocos de lado seria cansativa e pesada (prédios, NPCs, nav). Tamanho por tipo de tile, num modificador (`TILE_SIZE`). Atenção técnica: `W` é uma `const` global lida no carregamento (21 arquivos); com tamanhos por tile ela precisa virar variável do mapa local ativo (parte do passo 0). Tem de ser múltiplo de 32 (`CHK`).

### Ações por rodada
Sua ideia "uma ação de um batalhão por turno, mais turnos com a evolução da facção" é o mesmo que um **pool de ações** que cresce com o nível, só que mais fácil de entender que "15 pontos". Proposta:
- **Pool de ações por rodada** = f(nível da facção) (placeholder: 3, 4, 5, 6, 8). Qualquer batalhão pode gastar.
- **Uma ação = um passo** (entrar no próximo tile da trilha) **ou** uma ordem (acampar, atacar, saquear, anexar).
- Limite por batalhão por rodada (ex.: no máximo 2 ações), senão um só batalhão atravessa o mundo; o pool grande obriga a repartir entre batalhões.
- Número de batalhões também por nível (`BATTALION_MAX` em modificador).
- O personagem jogável não gasta do pool para andar **dentro** do mapa local; trocar de tile custa ação.
Risco a calibrar: pool de 3 a 4 passos faz o mapa parecer lento; pool com custo por terreno (estrada 1, mata 2) dá variedade. Fica em `map-modifiers.js`.

### Batalha sempre jogada: consequências
- O jogador precisa estar **presente** na batalha: o personagem entra no tile do batalhão (ponto de entrada na borda da trilha, ou ao lado do batalhão).
- Batalhas do jogador em fila: batalhão com encontro **pendente fica parado** até a batalha ser jogada; escolhe-se a ordem.
- Regra de derrota a definir (recuo para o tile anterior com baixas, ou fim de jogo?).
- Mais batalhões = mais batalhas para jogar: o fim do jogo pode ficar longo; deixar uma opção de resolver por número como **recurso opcional futuro**, não agora.
- Batalhas fora do jogador (facção contra facção, bandido contra caravana inimiga) seguem por número, senão o mundo não se mexe.
- O mapa da batalha é o **mapa local daquele tile** (terreno do tile; exércitos entram por bordas opostas; em tile de cidade, vira cerco).

### Tipos de tile (pergunta 1 adiada: primeira tarefa de design)
Rascunho só para discutir: `cidade`, `estrada/campo`, `floresta`, `montanha/passo`, `costa/mar` (barcos), `ponte/travessia`, `forte/fronteira`, `ruínas`. Cada tile = tipo + bioma + um espaço para **sítios** (0 a 2: mina, fazenda, serraria, torre...) + um espaço para **evento**. Assim os POIs da Fase 6 viram sítios dentro de tiles de natureza e não tiles inteiros; a decidir ao fechar a taxonomia.

## Rodada 3: decisões e análise

### Decisões
- **[DECIDIDO]** Tamanho: tile de **cidade ~320**, tiles de natureza/viagem **~256** (`TILE_SIZE` por tipo, em modificador).
- **[DECIDIDO]** Pool de ações por rodada: **no máximo 3** (a confirmar o que o 3 limita; ver análise).
- **[DECIDIDO]** Derrota = **o comandante (jogador) morre**; o batalhão dele é destruído. Se há outro batalhão no mapa, o turno do Comandante continua com ele; se não há, a rodada acaba e vai para o turno do Líder.
- **[DECIDIDO]** Batalhões são criados no **turno do Líder**. O primeiro é grátis (só o comandante). Do segundo em diante custa uma **guarnição cheia** (ex.: 5 x 100 = 500), abatida pelos soldados que um comandante doar (de graça se doar todos).
- **[PROPOSTA do usuário]** Guarnição cheia de **10 soldados**. Eles só existem como entidades dentro do tile, quando o jogador os invoca (a mensagem foi cortada em "mais atores para...").
- **[DECIDIDO]** Tipos de tile aprovados: cidade, campo/planície, floresta, montanha, costa, ponte, forte, ruínas, deserto (adicional).
- **[DECIDIDO]** O mapa local deve **refletir o tile**: deserto gera deserto; metade campo e metade montanha gera um mapa metade e metade; a forma faz sentido com o entorno (sem ilha no meio do continente; rios liberados; bordas majoritariamente de árvores; curva nas bordas na direção de tile vizinho).

### Ações por rodada: o que era o "limite"
Com um pool de 3 ações, nada impediria gastar as 3 no mesmo batalhão (andar 3 tiles seguidos). O "limite por batalhão" seria uma regra extra para impedir isso. **Se o pool é só 3, o limite não precisa existir**: a regra fica "3 ações por rodada, de qualquer batalhão". Duas leituras do seu "máximo 3" (**[ABERTO]** qual):
- **A)** 3 ações por rodada no total (o nível da facção sobe de 1 até 3).
- **B)** 3 é o máximo de **batalhões** (e o pool de ações é outro número).
Minha sugestão: usar A e fazer o nível da facção liberar de 1 a 3 ações; batalhões = nível também, até 3. Simples e fácil de calibrar.

### Morte do comandante: pontos a fechar
1. **Um comandante por batalhão ou um só personagem?** O texto sugere que cada batalhão tem seu comandante e o jogador controla o do batalhão ativo. Então o comandante é um personagem (nome, equipamento) ou só o "corpo" do jogador?
2. **Primeiro batalhão sempre grátis = morrer não custa quase nada**, e pode virar atalho para voltar à base. Onde o batalhão novo nasce (qualquer cidade sua ou a capital)? Morrer perde itens carregados e ouro? Sugestão: nasce na capital e o comandante perde o que carregava.
3. **Sem batalhão e sem ouro:** o grátis garante que nunca trava o jogo. Ok.
4. **Doação de soldados** no turno do Líder: só entre batalhões que estão na mesma cidade, ou à distância?

### Guarnição de 10
- No mundo, o batalhão é só um **número** (soldados, nível, equipamento). Entidades só nascem ao entrar no mapa local, então 10 não pesa no macro.
- Dentro do mapa local: 10 aliados + inimigos estacionados (também ~10?) + NPCs da cidade maior. Aceitável; o gargalo previsto é a IA de seguir/atacar (`allies.js`, `pickTarget`) e a navegação (`nav.js`) em cidade de 320 com muita gente. Testar cedo.
- Economia: 10 x 100 = **1000 por batalhão novo**; calibrar com `ECON` (renda por rodada) antes de fixar. Preço do soldado e tamanho da guarnição vão para `map-modifiers.js`.

### Tiles: terreno x papel (reorganização sugerida)
Sua lista mistura dois eixos. Separá-los simplifica o gerador:
- **Terreno** (bioma): campo, floresta, montanha, deserto e (a confirmar) neve. Um tile pode ser **mistura de dois** (A e B, com direção e transição).
- **Água**: nenhuma / rio / **costa** (pouca terra, muito mar) / **ponte** (duas terras com mar no meio e uma ponte).
- **Papel**: nada / cidade / forte / ruínas / sítios (mina, fazenda...).
Assim "costa de deserto" ou "ponte entre florestas" saem sem criar tipos novos. **Deserto e neve já existem no código** (`plains`, `forest`, `mountain`, `snow`, `desert`); não precisa criar biomas, só fazer o gerador aceitar mistura. **[ABERTO]** neve continua no jogo?

### Quanto custa o mapa local "fazer sentido"? (SUBSTITUÍDO pela rodada 4: a forma vem do campo do mundo, não de rótulos de borda)
Olhei `genWorld` (`world.js`, linhas 64 a 287, uma função só). Duas peças dominam:
1. **Forma da terra** (`landMask`): hoje são 5 formas fixas (ilha, continente, anel, península, faixa) cercadas de mar. Trocar por uma máscara montada a partir do **descritor do tile**: cada lado é `aberto` (tem vizinho e trilha), `fechado` (muralha de árvores ou penhasco) ou `água` (vizinho é mar). Tile de floresta no meio do continente = terra até a borda, com faixa de árvores; ilha só onde o mundo manda. **Custo: médio-baixo**, é a mudança mais isolada.
2. **Bioma dominante único** (`dominant`, 12 usos em `world.js` e 3 fora): virar um **campo de bioma** (dois biomas e um gradiente), vindo do mapa mundi. **Custo: médio**; precisa mexer em `biomeAt`, relevo (montanha) e decoração.
O que mais custa é **extrair** `genWorld` em etapas (relevo, rios, biomas, estradas, árvores) para receber parâmetros por tile; isso já é o passo 0 da arquitetura. Rios ficam como estão. A faixa de árvores nas bordas é parecida com o mar de hoje (uma banda com buracos nas saídas de estrada).
**Sobre a "curva" nas bordas:** entendi que, onde há tile vizinho, a área jogável e a estrada se **abrem e curvam na direção dele**, e onde não há a borda se fecha. **[ABERTO]** é isso mesmo?
Para casar com o vizinho: campo contínuo no mundo (altura, umidade, mar) amostrado em cada tile, e saída de estrada na borda definida por hash da aresta (já descrito acima).

## Rodada 4: decisões e análise

### Decisões
- **[DECIDIDO]** "Máximo 3" = **máximo de batalhões** (opção B). O pool de ações é outro número e **não tem limite por batalhão**: com 30 ações o jogador pode gastar as 30 em um só.
- **[DECIDIDO]** Comandante = **um só personagem** que "teleporta" entre os batalhões (cada batalhão tem comandante só na narrativa).
- **[DECIDIDO]** Morte: o batalhão perde todos os soldados e o jogador perde **ouro** (custo de contratar novo comandante). Perder armas e munição: **a pensar**. O batalhão novo pode nascer em cidade diferente da do Líder.
- **[DECIDIDO]** Doação de soldados entre batalhões só quando o comandante está **em uma cidade**.
- **[DECIDIDO]** Neve continua no jogo (biomas: planície, floresta, montanha, deserto, neve).
- **[DECIDIDO]** Ordem de geração do mundo: **mapa mundi, cidades, estrada**, e só então se define quais tiles têm estrada.
- **[DECIDIDO]** A forma do mapa local acompanha o mapa mundi: costa que é baía no mundo gera baía; que é ilha gera ilha.
- **[TESTE PLANEJADO]** Batalha em tile de cidade: **10 soldados do jogador + jogador x 30 da cidade**, para medir desempenho (FPS, IA, navegação).

### Ações: consequência de não ter limite por batalhão
Com pool grande (ex.: 30) e custo 1 por passo, um batalhão atravessa o mundo numa rodada. Para ter decisão de verdade:
- **Custo por terreno** (estrada 1, campo 2, floresta 3, montanha 4, neve/deserto 3; travessia de ponte/barco a definir).
- Ordens custam ação (acampar, atacar, anexar).
- O pool sobe com o nível da facção; o teto de 3 batalhões idem (1, 2, 3).
- **[ABERTO]** trocar de batalhão (o "teleporte") é grátis? Recomendo **grátis**: é só escolher quem age.
- **[ABERTO]** inimigos e outros atores só andam entre rodadas, ou reagem às ações do jogador?

### Morte: o que perder
O inventário é do personagem, que atravessa os batalhões. Opções para armas e munição:
- **A)** perde munição e consumíveis, **mantém armas** (armas são progressão, vêm de loot e compras);
- **B)** deixa tudo num **corpo no tile**, recuperável por um batalhão que chegue lá;
- **C)** perde tudo (duro demais com batalhão grátis).
Sugestão: **A** na primeira versão; B é um bom evento futuro ("recuperar o corpo").

### Teste de 10 x 30 em cidade
Dá para medir **no jogo atual** antes de qualquer arquitetura: criar 30 inimigos e 10 aliados na cidade e olhar FPS e tempo de `findPath`/`pickTarget`. Entra como **primeira verificação técnica** do plano: define se o tile de cidade pode ter 30 + 10 ou se é preciso reduzir.

### Estradas: ordem de geração
1. Campo do mundo (relevo, água, bioma) e mapa mundi (grafo de tiles).
2. Cidades em tiles de terra.
3. **Estradas** ligando as cidades pelo grafo (custo por terreno; cruzar água estreita gera tile de **ponte**).
4. Cada tile deriva o que tem: **sem estrada** (só trilha), reta, curva, bifurcação, cruzamento (nº de lados com estrada).
Duas espécies de aresta: **estrada** (rápida/barata; caravanas só usam estas) e **trilha** (lenta). Isso dá sentido a rotas de caravana e a emboscadas na estrada, e reaproveita `carveRoad` e `bridgeSpots` no nível local. O ponto de saída da estrada na borda continua vindo do hash da aresta, para os dois tiles casarem.

### Forma do mapa: o mundo é um campo, o tile é uma janela
Entendi o seu exemplo: se no mapa mundi a costa é uma baía, o tile gera uma baía; se é ilha, uma ilha. Isso muda minha proposta anterior (rótulos aberto/fechado/água por lado). O caminho correto é:
- O mundo é **uma função de posição** (altura, água, bioma, rios) em coordenadas de mundo. O mapa mundi desenha essa função em **baixa resolução** (uma amostra a cada ~16 blocos); o tile a avalia em **alta** (1 bloco), mais ruído de detalhe.
- Os **rótulos** (costa, deserto, ponte, "metade campo metade montanha") **saem da classificação da janela**, não são entrada. O mapa mundi mostra o que o tile vai ser porque os dois leem o mesmo campo.
- Vizinhos **casam sozinhos** (costa, rios, bioma), pois amostram o mesmo campo.
- A "curva" na borda é a continuação natural do campo; a faixa de árvores/penhasco só fecha as bordas **onde não há trilha** para um tile vizinho (aberturas só nas saídas de trilha).
- Água entre duas terras = ponte é consequência do campo mais a estrada.
Custo: **médio-alto**, mas é a peça central. O `genWorld` já usa ruído por posição (`fbm(x/100, ...)`); falta tirar a **forma fixa** (`landMask` com 5 formas) e o **bioma único** (`dominant`) e tornar tudo função de coordenadas de mundo. Etapas que hoje alteram arrays (rios, estradas, lagos) viram: campo puro + passes de entalhe locais. Tiles de cidade de 320 e de natureza de 256: a janela do tile de cidade ocupa a célula de 256 do mundo mais uma margem (~32 de cada lado), amostrada do mesmo campo.

## Rodada 5: decisões e análise

### Decisões
- **[DECIDIDO]** Estradas (ordem de geração, estrada x trilha), ações e batalhões (custo por terreno, pool por nível, teto de 3) e morte (perde soldados, ouro, munição/consumíveis; mantém armas) aceitos como propostos.
- **[DECIDIDO]** Troca de batalhão é **grátis** (resposta "Sim" à pendência).
- **[DECIDIDO]** Guarnição de 10 soldados: o ponto era "mais atores para **gerenciar em um mapa**": cobre o teste 10 x 30 (ver rodada 4).

### Soft-lock por falta de arma e munição
Cenário: sem ouro, sem munição e todas as armas quebradas. Hoje (`weapons.js`) a pistola é a arma inicial (preço 0, pacote de 24 balas por 8 de ouro) e **não há arma corpo a corpo**. Pontos que tornam o risco menor do que parece: a renda das cidades vem **por rodada**, não do combate, então o jogador só trava de verdade se não tiver cidade e nem ouro (início do jogo ou depois de perder tudo).
Análise das duas ideias:
1. **Pistola inquebrável + dívida para munição:** resolve o travamento de arma com mudança pequena (a pistola é a arma de partida). A dívida existe nas cidades ("moeda vermelha"), mas dívida do **jogador** é sistema novo (limite, juros, quem cobra). Mais complexo do que o problema.
2. **Arma inquebrável (facão ou arco):** o **facão** exige um sistema corpo a corpo inteiro (acerto, animação, modelo de arma em primeira pessoa), grande para ser correção de soft-lock; o **arco** ainda usa munição. Bom como **conteúdo futuro**, não como correção.
**Proposta (a validar):** combinar o mais barato:
- pistola **inquebrável** (sem desgaste);
- **ração de munição da pistola** no turno do Líder (se a reserva estiver abaixo de um piso, recebe um pacote; `PISTOL_RATION` em `map-modifiers.js`), em vez de dívida;
- **kit do comandante novo**: ao contratar (ou no batalhão grátis) ele vem com a pistola e um pacote de balas;
- facão/arco entram depois, como feature à parte.
**[ABERTO]** concorda com a pistola inquebrável + ração + kit, deixando facão/arco para depois?

### Atores no mapa: entre rodadas ou reagindo? (exemplos)
- **Só entre rodadas:** você gasta suas ações; depois, no fim da rodada, todos os atores andam. Exemplo: bandidos a 2 tiles de você só chegam na rodada seguinte; dá para planejar, atacar primeiro ou fugir. Simples e previsível.
- **Reagindo (a cada ação sua):** cada passo seu faz os atores hostis darem um passo. Exemplo: um soldado inimigo que te viu te persegue enquanto você anda; uma caravana foge quando você se aproxima. Mais vivo, porém difícil de calibrar com pool de 30 ações (30 passos x N atores).
- **Híbrido (recomendado):** atores andam **entre rodadas**, mas há **interceptação**: ao entrar ou parar num tile **adjacente** a um ator hostil, ele pode interceptar (encontro imediato) ou fugir. Mantém o planejamento e dá surpresa.
**[ABERTO]** qual das três?

## Rodada 6: decisões e análise

### Decisões
- **[DECIDIDO]** Pistola **inquebrável**. O **kit do comandante novo** vem com pistola, munição e alguns itens de cura.
- **[DECIDIDO]** Convenção: "**dívida**" = **ouro negativo**. Dívida para comprar munição = o saldo continua diminuindo mesmo em zero.
- **[DECIDIDO]** Ordem do turno do Comandante: **jogador age -> NPCs agem -> jogador age -> NPCs agem...**. Se o jogador entra num tile com NPC hostil, a **batalha começa automaticamente** (sempre jogada).

### Dívida e munição: o que existe hoje
`js/state.js` (`Ledger`): saldos já podem ficar negativos, mas **quem está em dívida tem as compras bloqueadas** (`Ledger.anyDebt()`, checado em `store.js`; a dívida de itens/suprimentos das cidades também conta). Então a ideia exige uma **exceção**: a munição da pistola pode ser comprada mesmo em dívida.
- Cuidados: um **piso** de dívida (`PISTOL_DEBT_FLOOR`, ex.: -100) para não virar poço sem fundo; pacote é barato (8 de ouro por 24 balas), então a espiral é rasa.
- Isso **substitui a "ração de munição"** que propus: é menos código (um `if` na compra) e usa sua ideia. A ração só voltaria se aparecer um caso de jogador longe de qualquer loja.
- A morte tira ouro **até zero** (nunca joga o saldo para negativo), senão morrer em sequência vira espiral.
- Munição só se compra em loja de cidade; comandante sem balas longe de uma cidade luta só com os soldados. O kit do comandante novo e as sobras fecham esse buraco.
**[ABERTO]** a exceção vale só para a pistola ou para qualquer arma básica? Recomendo só a pistola.

### Turno alternado: pontos a fechar
- **Um passo dos NPCs por quê?** (a) uma rodada de NPCs a **cada ação** do jogador, qualquer custo; ou (b) proporcional ao **custo** (andar na montanha, custo 4, dá 4 passos aos NPCs). Recomendo **(a)**: simples e previsível; o custo do terreno já pesa no pool de ações do jogador.
- **O que o NPC faz num passo:** andar 1 tile em direção ao destino (patrulha, perseguição, rota de caravana, avanço de guerra). Se entra no tile do jogador, também **começa a batalha** (emboscada).
- **Passar por um tile com hostil estacionado** para o movimento ali (o tile bloqueia a trilha, como na ideia da guerra).
- **Encontros sem o jogador** (NPC x NPC) resolvem por número no passo dos NPCs.
- **Ritmo:** com 30 ações são até 30 alternâncias; precisa de **animação rápida/pular** dos passos dos NPCs e um resumo do que mudou. Só animar atores visíveis; o resto é dado puro.
- Substitui a ideia de "interceptação" da rodada 5.

## Rodada 7: decisões
- **[DECIDIDO]** Piso da dívida para comprar munição de pistola: **-9999** (`PISTOL_DEBT_FLOOR`). Só a **pistola** pode comprar munição em dívida. A morte **nunca** gera dívida (tira ouro até zero).
- **[DECIDIDO]** Turno alternado: **um passo** dos NPCs por ação do jogador. O resumo do que mudou vai para o **livro**.
- **Próximo:** levantar as mecânicas do jogo e marcar quais mudam com o mapa mundi (lista nesta rodada), depois escrever o plano de implementação.

## Inventário das mecânicas e impacto previsto (rascunho da IA, para o usuário revisar)
Impacto: **Alto** = refeito; **Médio** = regra fica, a parte espacial muda; **Baixo** = quase intacto; **Novo** = não existe hoje.
| # | Mecânica (hoje) | Impacto | Por quê |
|---|---|---|---|
| 1 | Rodadas: turno do Líder e turno do Comandante | Médio | turno do Comandante vira turno no mapa mundi (pool de ações, alternância com NPCs) |
| 2 | Ações/pontos do Líder (`actCost`, `canAct`) | Baixo | continuam; ganha criação de batalhões |
| 3 | Economia das cidades (necessidades, produção, impostos, preços, humor, armazém, suprimentos) | Baixo | é por cidade; muda só de onde vêm as cidades |
| 4 | Evolução da cidade e da facção (`LVL`, muros) | Médio | nível da facção passa a liberar ações e batalhões; cidade de 320 e muro maior |
| 5 | Políticas locais e eventos | Baixo | cartões por cidade |
| 6 | Facções: relações, grafo, oferta/escassez, eventos, reuniões, eventos globais | Baixo-Médio | lógica é de dados; rotas (`fgRoutes`) e resgate/eventos espaciais mudam |
| 7 | Missões (quadro, entrega, facção) | Médio | destinos viram tiles; "levar a" ganha deslocamento no mundo |
| 8 | Caravanas (rota, guarda, saque, compra) | Alto | viram atores que andam por arestas (estrada) |
| 9 | Raids (ondas, emboscada de caravana) | Médio | passam a ser atores bandidos chegando ao tile da cidade |
| 10 | Rebelião (batalha, mina, ruínas) | Médio | batalha vai para o tile da cidade; missão da mina vira tile/sítio |
| 11 | POIs (10 tipos, anexação, guarnição, renda, pedágio, entreposto, vigia, santuário, ponte) | Alto | viram sítios dentro de tiles; geração, "no caminho", vigia (raio 300 > tile), preços |
| 12 | Guerra (frente, operações, POIs de guerra, cabo de guerra, fadiga, espiões, aliados, paz) | Alto | refeita como batalhões no grafo; **pausada**; a fadiga já entra nas consequências da batalha (`12`, 4B-13) |
| 13 | Combate (armas, inimigos, IA, aliados, quartel, mercenário) | Baixo | vive no mapa local; guarnição 10 e teste 10x30; **batalha grande com geradores e IA de cobertura/recarga: ver `12_batalha-no-tile.md`** |
| 14 | Jogador (vida, inventário, buffs, durabilidade, lojas, cura, pesca, culinária) | Baixo | pistola inquebrável, kit, dívida de munição, morte nova |
| 15 | Morte do jogador | Novo | batalhão destruído, perde ouro/soldados/munição; **revista em `12_batalha-no-tile.md` (4B-3, 4B-10: branda na batalha pequena; fuga na Defesa)** |
| 16 | Batalhões, comandante único, criação no turno do Líder | Novo | batalhão macro + soldados só no tile; **elites e comuns, recrutamento com limites por rodada: ver `12_batalha-no-tile.md` (4B-4, 4B-19)** |
| 17 | Mapa mundi, trilhas, ações, turno alternado NPCs, resumo no livro | Novo | camada macro inteira |
| 18 | Dungeons/portais, veios, lendárias, portal dourado | A decidir | espaço à parte ou sítio de tile |
| 19 | Escritório do Líder, sala de reunião | Baixo | continuam espaços à parte |
| 20 | Mapas: minimapa, mapa grande, caderno > Mapa, escolha no mapa | Alto | mapa mundi + minimapa local |
| 21 | Geração: terreno, biomas, cidades, estradas, pontes, árvores, decoração | Alto | campo do mundo + janela do tile |
| 22 | Dia/noite, clima, som, animais, pesca | Baixo | locais |
| 23 | Salvar/carregar | Alto | grafo, atores, diferenças por tile; `SAVE_VERSION` |
| 24 | Cenários de teste, modo criativo, smoke | Médio | cenários por tile; smoke novo |

## Rodada 8: decisões
- **[DECIDIDO] Caravana (8):** ao entrar num tile com caravana, ela aparece na estrada como hoje, mais para decoração ou saque.
- **[DECIDIDO] Raid (9):** o evento continua, de outra forma. Bandidos surgem **perto da cidade** e chegam em **3 a 5 ações** (passos dos NPCs); o jogador tem que **interceptar**. Ao chegar, ficam **2 a 3 turnos** no tile da cidade. Se o jogador entrar nesse momento, a cidade está **em chamas** e a luta é como **invadir a cidade** (a invasão antiga está desativada no código, mas existe; reaproveitar).
- **[DECIDIDO]** POIs viram **sítios dentro de um tile**.
- **[DECIDIDO]** **Torre de vigia**: a mecânica atual deixa de fazer sentido; **repensar ou descartar**. Ideias da IA: (a) revelar atores nos tiles vizinhos no mapa mundi; (b) avisar de onde vem um raid e por qual trilha.
- **[DECIDIDO] Missões de entrega (7):** viajar gasta ações normais; para entregar, **entrar no tile e ir até a prefeitura**.
- **[TAREFA FUTURA]** Quando a mudança estiver mais estável, **percorrer todas as mecânicas** (tabela acima) para ver se há mais coisas a mudar ou vale **adicionar**.

### Pontos abertos do raid
- **Tempo do mundo:** os NPCs dão 1 passo por ação do jogador. Se o jogador encerra o turno com ações sobrando, os NPCs completam os passos equivalentes? Sugestão: **a rodada tem N "tempos"** (= o pool); ações não gastas viram passos dos NPCs, e o tempo sempre passa. Atenção: se o pool cresce com o nível, o mundo "corre" mais rápido; o ritmo dos NPCs pode ser em tempos fixos por rodada, separado do pool.
- **Se o jogador não intercepta nem entra:** o que a cidade perde após os 2 a 3 turnos? (hoje há `RAID_LOSS_*`; reaproveitar).
- **Cidade em chamas:** vale enquanto os bandidos estão lá; ao vencer, cidade salva com baixas; ao perder, ?

## Mapa mundi: visão da IA (rascunho; SUBSTITUÍDO na rodada 9: o mapa será 3D, não 2D)
Ver a resposta da rodada 8; resumo: mapa 2D ilustrado desenhado a partir do campo do mundo; nós = tiles com ícone por tipo; ligações = estrada (contínua) ou trilha (tracejada); atores e batalhões como marcadores; fog por visão; prévia do caminho com o custo em ações; painel com contador de ações e batalhões; mesmo mapa serve ao turno do Líder (criar batalhões) e ao do Comandante.

## Rodada 9: decisões e análise

### Glossário (confirmado pelo usuário)
- **Rodada** = turno do Líder + turno do Comandante.
- **Turno** = o controle de um dos personagens (Líder ou Comandante).
- **Ação** = interação com o mapa, principalmente **andar**. (As "ações do Líder" de `econ.js`, `actCost`, são outra coisa; ao escrever, dizer "ações do mapa" quando houver risco de confusão.)

### Raid: regras fechadas
- Encerrar o turno do Comandante com a raid **não resolvida** = **perde**, a cidade é **saqueada** e sofre os efeitos da derrota (reaproveitar `RAID_LOSS_*`).
- Visual de "destruída" = o da **rebelião** (fumaça, destruição, corpos). Regra: **destruída na rodada N se os bandidos já estão dentro; e durante toda a rodada N+1 se a raid foi perdida.**
  1. invadem e jogador perde: N destruída -> N+1 destruída -> N+2 normal;
  2. invadem e jogador vence: N destruída -> N+1 normal;
  3. não invadem, mas jogador perde: N normal -> N+1 destruída -> N+2 normal.
- Se o jogador entra com os bandidos já na cidade: luta como **invasão** (o visual de rebelião e a invasão antiga existem no código).
- Estado salvo: marca da cidade (`ruinaAte`/invadida) que o gerador do tile lê.
- **Pontos a confirmar:** (a) os "2 a 3 turnos dos bandidos no tile" da rodada 8 continuam (passos dos NPCs em que dá para reagir) ou o limite agora é só encerrar o turno?; (b) quando a raid é anunciada (início da rodada, para o Líder poder criar um batalhão na cidade ameaçada?); (c) a defesa natural é manter um **batalhão parado na cidade**: bandido que entra no tile de um batalhão seu gera batalha.

### Torre de vigia: nova mecânica (proposta do usuário)
Ao usar a torre, o jogador **escolhe um tile e o marca**; o jogo coloca ali um **tesouro ou uma dungeon**, que só existe **naquela rodada** (some, com a marca, na seguinte). O tile não pode ficar do outro lado do mapa.
- Reaproveita `poiVigil`/`STATE.poiX.marks`; o uso continua sendo uma interação local dentro do tile da torre (1 por torre por rodada).
- **Alcance:** só tiles a no máximo X de **custo de caminho** da torre (sugestão: algo como 8 a 10 ações), e que o jogador consiga alcançar (não oceano, não ocupado por inimigo forte).
- Recompensa escala com o `poiLvl` do dono; um tesouro por uso, para não virar fazenda de ouro; o custo real é o gasto de ações para ir até lá.
- Dungeon marcada = portal que some junto com a marca. Depende da decisão sobre dungeons (item 18 da tabela).
- Todos os atores já estão revelados, então a vigia deixa de dar informação e passa a dar **objetivo**.

### Mapa mundi em 3D (diorama)
Referência: ilha flutuando sobre o mar, terreno em blocos com paredes de penhasco, caminhos claros sobre o chão, modelos 3D nos pontos, e o **boneco do jogador** em cima do tile (aqui: soldado com as cores da facção, de `buildHuman`).
- (SUBSTITUÍDO na rodada 10: grade quadrada não agrada; tiles são **pontos orgânicos**, ver rodada 10.) Tile = célula de uma grade quadrada (vizinhos N, L, S, O; sem diagonais).
- Terreno em colunas de voxels de baixa resolução (ex.: 8x8 colunas por célula) por `BoxBatch`; laterais em camadas de terra; mar como plano translúcido. Barato: a grade inteira são poucos milhares de colunas.
- Modelos por tipo (cidade = casas pequenas com a bandeira, floresta = árvores, montanha = pico, costa = praia, ponte, forte = torre, ruínas = colunas quebradas, deserto = cactos, neve = pinheiros brancos) com os utilitários de voxel de `voxel.js`; sítios como ícones menores.
- Atores: batalhões (retrato/boneco com a bandeira), bandidos, caravanas (carroça), soldados e nômades como bonecos pequenos andando pelas trilhas; raid com fumaça sobre a cidade. Tudo revelado (sem névoa).
- Câmera inclinada com giro e zoom limitados; clique por raio (`rayWorld`) para escolher tile; prévia do caminho com o custo em ações; boneco anda passo a passo, depois os NPCs andam e o resumo vai para o livro.
- Cena própria (outra `THREE.Scene`) alternada com a do mapa local; hoje `scene` é global em `render.js`, então a troca precisa ser projetada (parte do passo de arquitetura).
- Estrada = faixa clara contínua; trilha = tracejada ou mais estreita.

### Formato do mundo: continentes, pangeia, arquipélagos, grande lago
Possível e encaixa no campo do mundo: substituir as 5 formas atuais (`landMask`) por 4 máscaras em escala de mundo, além do bioma predominante já escolhido.
- **Pangeia:** uma massa. **Grande lago:** massa com lago no centro. **Continentes:** poucas massas grandes. **Arquipélago:** muitas ilhas pequenas e médias. O tamanho da grade pode variar por formato (arquipélago precisa de mais células).
- **Tiles de mar conectando:** é a decisão de maior impacto. Mar vira **tile navegável** (ideia original do "mar com barcos"). Perguntas: o jogador precisa de **navio**? Como o batalhão atravessa o mar e a que custo? Batalha em tile de mar significa **combate naval**?
- Proposta para o primeiro corte: tile de mar só atravessável por **rota marítima entre tiles de costa com porto** (embarque automático, custo extra em ações); **nenhum ator hostil para em tile de mar** e sem combate naval ainda (pirata e naval como feature futura).
- O gerador **tem de garantir conectividade**: toda cidade alcançável (ponte, estrada ou rota marítima).
- Sorteio das cidades por massa de terra (uma ilha pequena pode ficar sem cidade) e facções separadas por mar mudam a guerra (invasão por mar).

## Rodada 10: decisões e análise

### Raid: regras fechadas
- **Contagem:** quando o bandido termina seu movimento **no tile da cidade**, começa a contagem: ficam **estacionados por 3 ações**. Na **primeira** ação o visual da cidade muda (rebelião). Passadas as 3 ações, **somem do mapa**. Vale para cidade do jogador **ou de NPC**.
- **Duas origens:** (1) **bandidos soltos** no mapa que acabam indo a uma cidade; (2) **política de raids** no início do turno do Líder: surgem bandidos a **3 a 5 tiles** da cidade.
- O restante é como na rodada 9 (encerrar o turno com a raid não resolvida = perde; efeitos `RAID_LOSS_*`; regra N / N+1 / N+2 do visual). O evento da raid continua valendo e a defesa por **batalhão estacionado** vale, mas com 3 batalhões e várias cidades não é boa estratégia fixa.
- Regra unificada a confirmar: a raid é **perdida** quando a contagem acaba (3 ações sem resolver) **ou** quando o turno do Comandante termina com os bandidos ainda lá, o que vier primeiro.

### Os quatro layouts de batalha (modelo único de "encontro")
Um encontro = `{tile, atacante, defensor, layout}`. Os layouts:
1. **Campo:** o batalhão do jogador encontra os bandidos **fora** do tile da cidade: batalha no tile contra o exército deles.
2. **Defesa da cidade:** o batalhão está **estacionado na cidade** e os bandidos entram: batalha dentro da cidade, com os bandidos chegando **de fora e de vários lados**.
3. **Invasão da cidade:** o batalhão encontra os bandidos **estacionados na cidade**: o jogador é o invasor. É a **invasão antiga** (desativada, mas no código) na cidade do jogador, com bandidos no lugar dos soldados inimigos.
4. **Abordagem naval (novo):** ver "Mar".
Efeito: com **mais atores numa batalha só**, as **ondas de raid deixam de ser necessárias**: `RAID_WAVES`/`RAID_GAP`/`RAID_TIME` (`raids.js`) são substituídos por um **tamanho de exército** que escala com o nível/rank da cidade (a calibrar com o teste 10x30). Os mesmos layouts servem à **guerra** (exército inimigo entrando na sua cidade = 2; você atacando cidade inimiga = 3; encontro no campo = 1).

### Mapa mundi natural (resposta à pergunta 1)
Grade perfeita descartada. Proposta:
- **Tile = ponto (nó) no mundo contínuo**, não célula quadrada. Pontos por amostragem com distância mínima (~256 a 300) sobre a terra; vizinhança por triangulação (2 a 5 vizinhos por tile); trilhas escolhidas dentro disso.
- No mapa 3D o terreno é **uma paisagem contínua** (como na referência) com **pontos** nos tiles e caminhos sinuosos: nenhuma fronteira quadrada é desenhada.
- O mapa local é uma **janela** do campo do mundo centrada no ponto, com área jogável de borda **arredondada/orgânica** (a "curva" que você descreveu): **aberturas** na direção de cada vizinho (ângulo da aresta) e o resto fechado por árvores, penhasco ou mar. A saída de uma abertura leva à abertura oposta do vizinho; a coerência de costas, rios e biomas vem do campo.
- O hash da aresta passa a decidir a **posição da abertura** na borda; estrada atravessa a abertura.
- Com isso a regra "mesmo tile com NPC = batalha" e a pergunta de "entrar pela borda" ficam como estão (entrar só pelo mapa mundi).

### Mar
- **Tile de mar não pode ser entrado**, exceto para **batalha**. Sem exploração, sem gerador de terreno de mar: só a **arena naval**.
- **Navio:** necessário para cruzar. Ideias do usuário: **alugar** um navio para passar; se o jogador tem **cidade com porto**, tem navio. Mecânica de comprar navios: **depois**.
- **Custo de atravessar:** mesma regra do jogador (ações), **baixo**, por ser água.
- **Batalha no mar (simples):** cenário com **dois navios de frente um para o outro**, ligados por **pedaços de madeira como ponte improvisada**. **Barreira invisível** em volta dos navios para NPCs não caírem na água (colisão `Col` e bloqueio em `nav.js`; barato). Atores hostis **podem** estar em tile de mar (piratas, frotas de facção), ao contrário da proposta anterior.
- **A definir:** onde se embarca (só cidade/costa com porto?), preço do aluguel (por travessia ou por tile?), se o batalhão pode **terminar o turno em tile de mar** (provavelmente sim, exposto a piratas), tamanho e modelo dos navios (novos modelos voxel), quantos soldados cabem, o que acontece em derrota no mar (mesma regra da morte), IA das facções para usar navios. Gerador deve garantir que a **ilha inicial** permita jogar (porto ou mais de uma cidade) e que toda cidade seja alcançável.

## Rodada 11: decisões
- **[DECIDIDO]** Raid perdida quando a contagem de 3 ações acaba **ou** o turno do Comandante termina com os bandidos lá (o que vier primeiro).
- **[DECIDIDO] Mar:** embarca-se em **qualquer lugar com trilha ligada ao mar** (terra com caminho até a água já vira barco); **cobra-se para entrar na água** (quem tem cidade com porto não paga); o batalhão **pode terminar o turno no mar**; arena naval e modelos de navio **só depois** de o teste de batalha **10 x 30** rodar bem.
- **[ENTREGUE]** Representação visual do mapa natural (pontos, trilhas, estrada, rota marítima e a janela local de um tile de costa com baía), mostrada na conversa.
- **Ponto sobre a ilha inicial (explicação):** com aluguel de navio, uma ilha inicial pequena (1 cidade, 2 ou 3 tiles) obrigaria a pagar para sair logo no começo, sem ouro; o gerador deve garantir ilha inicial com **tiles e cidades/sítios suficientes** (valor mínimo em `map-modifiers.js`).

## Rodada 12: decisões e primeiro teste
- **[DECIDIDO]** Desenho do mapa mundi natural (pontos, trilhas, janela local) **confere** com o que o usuário imagina.
- **[DECIDIDO] Ilha inicial:** o gerador **confere** se a ilha inicial é pequena demais (poucos tiles e cidades alcançáveis sem navio, mínimo em `map-modifiers.js`); se for, a **cidade inicial vira porto** (navio grátis, sem aluguel).
- **[DECIDIDO]** Preço inicial do aluguel de navio: **100** (por entrada na água), a ajustar jogando.
- **[FEITO] Cenário `?cenario=batalha`** (`js/tiletest.js`; números em `TILE_TEST`, `js/modifiers/map-modifiers.js`; textos em `js/texts/map-texts.js`): mapa de **320**, **uma cidade** de meia-largura 100 (~39% da área) no centro, **30 soldados inimigos** dentro dela, **10 soldados** do jogador invocados com ele (`armyAssault`), e POIs/acampamentos com bandidos e moradores gerados como no jogo normal. Modo criativo (invencível) ligado; painel de testes na aba Facções da pausa (medir, voltar ao portão, centro da cidade, matar inimigos). Parâmetros: `?inim=N`, `?alia=N`, `?pos=centro`.
- **Teste de desempenho** (`node tests/batalha.js`, Chromium sem janela, desenho por software, então o "desenhar" não vale para placa de vídeo): atualizar (IA, tiros, navegação) **~1,6 ms sem batalha e ~2,6 ms com 30 x 10**; 390 a 815 chamadas de desenho; sem erros no console; o teste de fumaça completo continua OK. Resultado: o custo de lógica de 30 + 10 é pequeno. **Falta jogar na tela** (placa de vídeo real, batalha de verdade, jogador vulnerável) para decidir.
- **Pendências do cenário:** não há faixa de árvores na borda do mapa (terra até 90% e depois mar); o HUD mostra "Cidades: 1/7" (contador não considera o mapa de uma cidade); só 4 POIs/acampamentos nascem num mapa de 320 (61 bandidos fora da cidade).

## Rodada 13: ajuste do cenário `?cenario=batalha` (só código; **não testado**, o usuário testa)
- **Duas cidades:** a **sua**, pequena (`TILE_TEST.home`: centro 52,52, meia-largura 36, a menor cidade normal), no canto; e a de **outra facção** (`TILE_TEST.big`: centro 210,210, meia-largura 100), com cores diferentes das suas (a facção NPC sempre usa cor diferente da do jogador). Uma estrada liga as duas.
- Você **começa na sua cidade**; a batalha começa pela **regra normal** de ataque a cidade ao se aproximar (`startAttack` chama `armyAssault`, que leva os 10 soldados para trás de você). A cidade inimiga tem exatamente 30 soldados (`tileTestFillEnemies` completa ou tira os que `populateCities` criou).
- Atalhos: `?pos=portao` (portão norte inimigo) e `?pos=centro`; painel na pausa com Minha cidade / Portão / Centro inimigo / Matar / Medir.
- **Riscos que o teste deve olhar:** a cidade pequena cabe sem encostar na grande (vão de ~22 blocos entre as muralhas, estrada no meio); terra até 97% do mapa; `tests/batalha.js` foi ajustado mas não rodado.

## Rodada 14: cenário validado e duas features novas
- **[VALIDADO]** O cenário `?cenario=batalha` funciona (o usuário testou). Correções feitas no caminho: `WORLD.home` (comentário no meio da linha) e guerra declarada antes do ataque (sem guerra, atacar é "crime" e os soldados não vêm).
- **[A IMPLEMENTAR]** **Cidades em blocos com formatos variados:** hoje a cidade (quadrado de meia-largura `half`) tem muitos lotes vazios; passa a ser montada em blocos (quarteirões) e com pegadas mais variadas que o quadrado (L, T, cruz, oval, irregular), muro e portões acompanhando. Etapa 1B do plano.
- **[A IMPLEMENTAR]** **Ordem de movimento dos soldados:** o jogador clica num ponto e os soldados se movem até lá. Etapa 1A do plano.
- **[PLANO]** Ordem de implementação em `docs/features/6_plano-mapa-mundi.md` (etapas 0 a 11, mundo novo atrás de `?mundo=1`).

## Perguntas abertas (ordem de importância)
> Rodada 14: pendentes: tecla da ordem dos soldados e se vale para todos ou por grupo; as pendências de rodadas anteriores continuam.
> Rodada 12: pendentes: jogar o cenário `?cenario=batalha` e dizer se 30 x 10 está bom (e se sobe/desce), tamanho do exército de raid, preço do aluguel.
> Rodada 11: pendentes: teste 10x30 (primeiro), preço do aluguel do navio, garantia da ilha inicial.
> Rodada 10: pendentes: regra única de perda da raid; origem e tamanho dos bandidos soltos; tamanho do exército de raid; porto/aluguel/embarque; fim de turno no mar; arena naval (modelos, soldados). Resolvido: tiles orgânicos.
> Rodada 9: pendentes: (a), (b) e (c) da raid, alcance da tabela da vigia, navio e rota marítima, combate naval, dungeons, fim da "grade quadrada de 4 vizinhos", mockup 3D.
> Rodada 8: pendentes: tempo do mundo ao sobrar ações, perda se o raid não for impedido, vigia (descartar ou nova), forma do mapa mundi, entrar no tile pelo mapa ou pela borda.
> Rodada 7: todas as de dívida e turno resolvidas. Pendente: teste 10x30 e o plano.
> Rodada 6: pendentes: exceção de dívida só para pistola?, NPCs: um passo por ação (a) ou por custo (b)?, teste 10x30. Mecânicas principais praticamente fechadas: falta escrever o **plano de implementação em etapas**.
> Rodada 5: pendentes: soft-lock (pistola inquebrável + ração + kit), atores entre rodadas x reagindo, resultado do teste 10x30.
> Rodada 4: resolvidos "3", comandante, doação e neve. Pendentes: troca de batalhão grátis, atores reagem ou só entre rodadas, perda de armas/munição, o que fazer com a guarnição (mensagem cortada), resultado do teste 10x30.
> Rodada 3: tamanho decidido; ações = ver "limite" acima; derrota decidida; tipos aprovados. Pendentes novos: significado do "3", comandante por batalhão, nascimento após a morte, neve, curva nas bordas, fim da mensagem sobre a guarnição.
> Rodada 2: 1 = adiada (definir tipos de tile); 2 = chute inicial e teste; 3 = análise acima (propondo 320/256); 4 = análise acima (pool de ações); 5 = respondida (sempre jogada).
1. **POIs da Fase 6:** viram **tipos de tile** (mina, fazenda, ponte, forte) ou continuam como pontos dentro de um tile maior? Isso decide quanto da Fase 6 se reaproveita.
2. **Cidade:** hoje há 6 a 8 cidades. No novo mundo, quantos tiles de cidade e quantos tiles no total (ordem de grandeza)?
3. **Tamanho do mapa local:** hoje 704. Para a cidade ocupar 40%, um tile de ~256 a 320 seria o ponto de partida? Ou tiles de tamanhos diferentes por tipo (cidade grande, selva pequena)?
4. **Pontos:** opção 2 com tempo local grátis (acima) está bom? E pool compartilhado ou separado entre personagem e batalhão?
5. **Batalha de batalhão:** sempre automática, sempre jogada, ou escolha do jogador? Quando o jogador não está presente, resolve por número?
6. **Mundo vivo:** os atores se movem só entre rodadas (passo por rodada) ou também enquanto o jogador anda no mapa mundi?
7. **Exército aliado (`ARMY`) e escolta:** acompanham o personagem entre tiles ou são o "batalhão" do ator separado?
8. **Persistência:** tile visitado guarda só as diferenças em relação à semente (donos, prédios, mortos, loot)? Concorda?
9. **Escritório do Líder, salão de reunião, dungeons:** continuam como espaços à parte (não são tiles)? Provavelmente sim.

## Impacto estimado nos sistemas (a detalhar no plano)
| Sistema | Muda como |
|---|---|
| `world`, `city`, `nav`, `poi`, `pois` | viram o gerador **local**, parametrizado por tile |
| `caravans`, `raids` (parte), `bookmap`, `facgraph` | passam a usar atores e arestas do grafo |
| `warfront`, `warops`, `war*` | refeitos como movimento de batalhão (pausados) |
| `econ`, `rounds`, `factions`, `rebellion`, `missions`, `policies`, `meeting` | mudam a origem de `WORLD.cities` (cada cidade vira um tile), regra em si fica |
| `save` | novo `SAVE_VERSION`: grafo, atores, diferenças por tile |
| `entities`, `allies`, `weapons`, `ambient` | quase intactos; vivem dentro do mapa local ativo |

## Próximos passos (propostos)
1. Responder as perguntas abertas (principalmente 1 a 5).
2. Fechar o desenho das mecânicas (atores, encontros, pontos, guerra por batalhão).
3. Escrever o plano de implementação em etapas pequenas, cada uma deixando o jogo jogável (primeira: arquitetura em camadas + `WORLD` como mapa local atual).
