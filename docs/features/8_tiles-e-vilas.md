# Tiles, vilas e cidades maiores (feature 8, especificação da etapa 4)

Plano: `docs/features/6_plano-mapa-mundi.md` (etapa 4). Mecânicas gerais: `docs/features/5_mapa-mundi.md`. **Só especificação: nenhum código de jogo até a aprovação.**
Convenção: **[DECIDIDO]** confirmado pelo usuário; **[PROPOSTA]** sugestão da IA; **[ABERTO]** pergunta.

## Rodada 1 (2026-11-23)

- **[DECIDIDO] Cidade** = uma vila **muito grande e de tamanhos variados**. Em relação às cidades antigas, a única mudança é que, em vez de **um** prédio que mostra o tipo de produção, ela passa a ter **vários** (para ocupar o espaço maior).
- **[DECIDIDO] Vila** (as cidades atuais, menores) muda assim:
  - o máximo de defesa que ganha são **cercas** (sem muralha de pedra);
  - **menos soldados**;
  - **sem ruas**: no lugar, **estradas** (de terra, ligando as casas).
- **[DECIDIDO] Estado do tile fora da tela:** só as **diferenças da semente** (dono, nível, mortos, loot, prédios novos) + **produção resumida** (estoque e produção por rodada). Sem simular o mapa local quando o jogador não está nele.
- **[DECIDIDO] Ordem da especificação:** **tipos de tile primeiro**, depois vila/cidade, conteúdo do tile e lógica de mundo.
- **[ADIADO] Tiles produtivos (fazenda, mina, serraria): sítio dentro de tile ou tile inteiro?** O usuário disse que os tiles **terão mudança** e pediu que, ao fim da rodada de perguntas, a IA o peça para **especificar melhor os tiles**.

## Rodada 2 (2026-11-23): tile = tema + POI principal + complementares

- **[DECIDIDO]** Tile é uma **área com um tema** e **um POI principal** (a "capital" do tile), mais POIs **complementares** que reforçam o tema (fazendas menores, plantações, santuário, acampamentos de bandidos, tavernas, bandos de animais...), colocados com lógica (fazendas e tavernas perto da estrada; acampamentos e animais longe).
- **[DECIDIDO]** O POI principal aparece no mapa mundi como as cidades. **Controlar o POI principal = controlar o tile.** A propriedade segue a lógica dos POIs (o jogador pode entrar e achar a fazenda dominada por bandidos e lutar). A **anexação** dos tiles é especificada na etapa 8; **o tile substitui o bônus que os POIs davam hoje**.
- **[DECIDIDO]** Tipos de tile (POI principal -> terrenos recomendados):
  | Tile | POI principal | Também tem | Terreno |
  |---|---|---|---|
  | Vila | vila (antiga cidade) | complementares | qualquer |
  | Ponte | ponte | complementares | majoritariamente água |
  | Fazenda | fazenda | vila de trabalhadores | planície e deserto |
  | Mina | mina | vila de trabalhadores | montanha e neve |
  | Fortaleza | forte | complementares | qualquer |
  | Serraria | serraria | vila de trabalhadores | floresta |
  | Animais | acampamento de caçadores | complementares | floresta |
  | Ruínas (novo POI) | vila vazia em escombros | complementares | qualquer |
- **[DECIDIDO]** **Entreposto e taverna** entram em qualquer tile por onde passa **estrada de caravana**.
- **[DECIDIDO]** **Tile de vila x tile COM vila:** tile de recurso dá **bônus de produção**; tile de vila dá **outro bônus (a definir)**. No tile de recurso a vila é onde moram os trabalhadores.
- **[DECIDIDO]** Tiles são mini-mundos para explorar, obter recursos, fazer missões e guerrear. Meta: **no mínimo ~7 POIs por tile**. Adiado: aumentar o mapa; POIs **procedurais** (fazenda, mina etc. com formatos diferentes) "bem pra frente".

## Rodada 3 (2026-11-23)
- **[DECIDIDO] Tile sem tema (passagem):** existe, **fora das rotas principais** (onde passam caravanas); **sem vila, entreposto ou taverna**. Pouca chance de construção humana (fazenda, mina, serraria, santuário...); predominam **cavernas, acampamentos de bandidos, baús perdidos e matilhas**. Sem dono, nada a anexar.
- **[DECIDIDO] Vila de trabalhadores (tile de recurso):** sem economia própria; **gera impostos**; pode ser **tomada ou saqueada** por bandidos ou facções inimigas em guerra; pode **se rebelar** por sabotagem de inimigos (mecânica a fazer).
- **[DECIDIDO] Ruínas:** é um **POI normal**, vila antiga e abandonada, **sem condição para existir**; nasce como qualquer POI. (Não é estado de vila destruída.)
- **[DECIDIDO] Domínio:** basta tomar o **POI principal**; complementares hostis são desafio e loot opcionais.

## Rodada 4 (2026-11-23)
- **[DECIDIDO] Ruínas:** **tile próprio**, pode ser **anexado, mas não reconstruído**.
- **[DECIDIDO] Fortaleza e ponte** nascem **pelo mapa** (consequência do grafo): ponte onde a estrada cruza água estreita; fortaleza em gargalo e entre territórios.
- **[DECIDIDO] Proporção de tiles temáticos x passagem:** o **jogador escolhe na criação do mundo** (opção do novo mundo; padrão e limites em `map-modifiers.js`).
- **[ADIADO]** Bônus do tile de vila (decidido junto com a anexação, etapa 8).

## Rodada 6 (2026-11-23)
- **[DECIDIDO]** **Tile de vila** (principal = vila) **gera impostos** ("mais impostos"). Quantidade: a IA calcula (ver proposta abaixo).
- **[DECIDIDO] Correção da rodada 3:** **só o tile de vila gera imposto.** Tiles de recurso (fazenda, mina, serraria, animais) produzem **comida/recurso, não imposto**, mesmo com moradores.
- **[DECIDIDO]** Uma facção pode ter **várias cidades e tiles**.
- **[DECIDIDO]** A vila de trabalhadores **não aparece em todo tile de recurso** (vilas demais): fica menos comum. Um **POI novo, menor que a vila**, o substitui como "onde os trabalhadores descansam": comércio pequeno. Taverna já existe; faltam ideias (ver conversa; a escolha entra aqui).

- **[DECIDIDO] Proporção inicial** (mundo de ~36 nós, ajustável na criação do mundo): 5 a 7 cidades, **7 a 9 vilas**, ~10 de recurso, 2 a 3 fortalezas, 2 a 3 pontes, 1 a 2 ruínas, o resto passagem.
- **[DECIDIDO] Imposto da vila:** `12 + 5 × rank` por rodada (~17 a 27, cerca de metade da cidade, que rende `25 + 10 × rank`). Vai para `economy-modifiers.js`; calibrar na etapa 11.
- **[DECIDIDO] POIs de descanso (dois novos, menores que a vila, com comércio pequeno):**
  1. **Pousada:** camas (alvo `poibed`) e lojinha de comida e cura; não é taverna (beber/conversar) nem entreposto (caravanas). Variações visuais por tema (feira na fazenda etc.).
  2. **Alojamento de trabalhadores com cantina:** barracão e tendas com cozinha de campo, rústico, vizinho ao POI principal de recurso.
  Os demais (termas, feira, feitoria, posto de muda, curandeiro) estão em `docs/ideias-futuras-pois.md`. A vila de trabalhadores fica rara nos tiles de recurso.

## Rodada 7 (2026-11-23): conteúdo do tile
- **[DECIDIDO] Layout fixo, conteúdo vivo:** terreno, estradas e posição dos POIs são fixos pela semente; acampamentos reaparecem (2 dias), grutas renovam baú e animais a cada rodada, bandos andam, donos e raids mudam (como no jogo de hoje). O que muda vai em `STATE` como diferença da semente.
- **[DECIDIDO] Entrada e saída:** o jogador **entra pela abertura da trilha** (borda por onde veio; posição pelo hash da aresta) e **sai tanto pelo mapa mundi quanto andando até uma abertura no mapa local**. Sair gasta ações do mapa.
- **[DECIDIDO] O que o jogador faz em todo tile:** missões e entregas locais; coletar e caçar (pesca, caça, recursos do tema); saquear e explorar (baús, grutas, ruínas, acampamentos com refém); descansar e comerciar (pousada, taverna, entreposto, feitoria).
- **[DECIDIDO] Ajustes da tabela:** (1) **tile de cidade:** qualquer POI pode aparecer, com **peso pelo terreno** em que a cidade está (montanha: mais minas; floresta: mais serrarias; etc.); (2) **fazenda, mina e serraria:** o slot "vila" vira sorteio, **40% vila de trabalhadores e 60% POI de descanso** (pousada ou alojamento). Substitui o "vila rara" da tabela.
- **[ABERTO]** POIs de guerra nos tiles (acampamento, trincheira...): ver recomendação na conversa.

## Rodada 8 (2026-11-23): posição do POI principal e batalhas no tile
- **[DECIDIDO]** Três tipos de batalha no tile: **Conquista** (a facção ataca o POI principal), **Defesa** (a facção está no POI principal e repele invasores) e **Choque de exércitos** (dois batalhões se encontram no tile). Correspondem aos layouts 3, 2 e 1 da rodada 10 da feature 5.
- **[DECIDIDO]** Posição do POI principal: **variada** (o centro é a escolha óbvia, mas quer variações).
- **[DECIDIDO] Como resolver o POI de guerra x entradas do tile:**
  1. A batalha é conhecida **antes** do mapa local ser gerado (o macro decide o encontro), então o gerador recebe um **descritor de batalha** `{tipo, entrada do atacante, entrada do defensor, quem está estacionado}`. Os POIs de guerra **são montados por batalha**, não fixos pela semente.
  2. O que fica **fixo pela semente** são as **zonas de guerra** reservadas (clareiras planas): **uma por abertura** (acampamento de quem entra por ela), **um anel em volta do POI principal** (defesa e conquista) e **uma praça de encontro** no cruzamento de estradas mais próximo do centro (choque).
  3. Cada batalha escolhe quais zonas preencher: Conquista = atacante na zona da sua abertura, defensor no anel do principal; Defesa = idem com os papéis trocados; Choque = cada lado na zona da própria abertura e barricada/trincheira na praça de encontro. Tile com 1 entrada = conquista/defesa; com 2 a 4 entradas, as aberturas usadas são as de origem de cada lado.
  3b. **Choque com batalhão estacionado:** quem já estava no tile fica na praça de encontro (ou no anel do principal, se o tile for dele).
- **[DECIDIDO] Posição do POI principal** (arquétipos sorteados pela semente, com restrição por tema): **central** (~30%), **deslocado** (25% a 40% do centro), **à beira da estrada** (a estrada passa por ele), **no fundo** (oposto da abertura principal; bom para tile de 1 entrada), **encosta/altura** (mina, fortaleza), **margem** (ponte, serraria na borda da floresta). Restrições: ≥ 70 da borda do tile, ≥ ~80 de qualquer abertura (espaço para a defesa) e a estrada sempre liga o principal às aberturas. Cidade enorme: deslocamento máximo `(384 − lado) / 2 − 8`; vila: até ~100.

- **[DECIDIDO]** POIs de guerra **montados por batalha** nas zonas reservadas. **Persistência:** ficam **enquanto durar o conflito**; só mudam se for preciso **reposicioná-los** (ex.: nova batalha por outra abertura). Entram no estado salvo do tile (lista `{tipo, zona, dono}`).
- **[DECIDIDO]** Tile de **uma entrada**: POI principal **no fundo**, longe da abertura. Arquétipos de posição aprovados.
- **A detalhar na etapa 10 (guerra):** tipos e quantidade de POIs de guerra por zona, regra exata de reposicionamento, custo para construí-los.

## [PROPOSTA] Composição de POIs por tile (384; sem aprovação ainda)
Números em `map-modifiers.js`. Contagem **sem baús** (6 a 10 baús escondidos por tile, em todos os tipos). Meta: **~12 a 14 POIs** nos temáticos, 8 a 12 na passagem, 4 a 5 na cidade (ela ocupa 40% a 60%).
| Tile | Principal (1) | Tema (4 a 5) | Ambiente (6 a 8) |
|---|---|---|---|
| Cidade | cidade enorme | **qualquer POI**, com peso pelo terreno em volta (montanha: mais minas; floresta: mais serrarias; planície/deserto: mais fazendas...) | acampamento, bando, gruta (se há montanha) |
| Vila | vila (imposto) | pousada, taverna, fazenda pequena, santuário, entreposto (se há estrada) | acampamentos de bandidos, bandos, gruta, torre de vigia |
| Fazenda | fazenda | fazendas menores, plantações, pousada, taverna, vila ou descanso (40/60) | acampamentos, bandos, torre de vigia, ruínas raras |
| Mina | mina | minas menores, alojamento com cantina, pousada, entreposto, vila ou descanso (40/60) | gruta (várias), acampamentos, bandos |
| Serraria | serraria | serrarias menores, alojamento com cantina, pousada, caçadores, vila ou descanso (40/60) | bandos, acampamentos, torre de vigia |
| Animais | acampamento de caçadores | caçadores menores, alojamento com cantina, pousada, santuário | bandos (vários), gruta, acampamentos |
| Ponte | ponte (pedágio) | pousada, taverna, entreposto, pesca, torre de vigia | acampamentos, bandos |
| Fortaleza | forte | acampamento fortificado, atalaia, trincheira, pousada, vila de apoio | acampamentos, bandos, gruta |
| Ruínas | vila em escombros | ruínas menores, relíquia, santuário | guardiões, bandos, gruta, acampamentos |
| Passagem | nenhum | raros: fazenda, santuário, pousada abandonada | 8 a 12: caverna, acampamento, bandos, matilhas |
Regra de posição: tema e comércio (pousada, taverna, entreposto) **perto da estrada**; acampamentos, bandos e grutas **longe**; o entreposto só onde passa **caravana**; o alojamento **colado ao principal**. A mecânica nova da torre de vigia é da etapa 8; os POIs de guerra (fortcamp, trincheira, atalaia) só aparecem na fortaleza por enquanto.

## Rodada 5 (2026-11-23)
- **[DECIDIDO]** Torre de vigia = POI de tema/ambiente em qualquer tile (sem tile próprio).
- **[ADIADO p/ etapa 8]** Tile Animais: tende a produzir **carne e couro**.
- **[DECIDIDO]** Tamanho do tile: **384** (múltiplo de 32; `TILE_SIZE` em `map-modifiers.js`). **Vila ocupa no máximo 10% do tile** (lado até ~121; vila de 90 = 5,5%, de 120 = 9,8%). **Mais POIs por tile** que os ~7 pedidos antes. **Cidade grande** ocupa **40% a 60%** do tile (em 384: lado 243 a 297, `half` 121 a 149).
- Hoje (referência): vila de 72 a 90 de lado = 1,0% a 1,6% do mapa de 704.
- **[DECIDIDO]** **Cidades enormes:** lado 243 a 297 (40% a 60% do tile de 384). Isso supera os ~200 planejados na etapa 1B: ao implementar, revisar `CITY_FOOT`, o tempo de geração e a nav/população (cidade de ~60 mil a 88 mil blocos²).
- **[DECIDIDO]** **Todos os tiles usam 384** (passagem e ponte inclusive); um só `TILE_SIZE`.
- **[DECIDIDO]** **Cidades enormes: 5 a 7 no mundo** (início, ajustável em `map-modifiers.js`). **Toda cidade é grande**, capital ou não. Funcionam como as cidades atuais (humor, produção, rebeliões etc.). **Tipo fixo**: vila não evolui para cidade.
- (Resolvido na rodada 6: tile de vila gera imposto; 7 a 9 vilas; facção pode ter várias cidades e tiles.)

## Rodada 9 (2026-11-23): perguntas antes de implementar
- **[DECIDIDO]** Tabela de composição aprovada. **Tile de vila usa os mesmos pesos por terreno da cidade** (qualquer POI pode aparecer, com mais minas em montanha, serrarias em floresta etc.; peso inicial x3, ajustável).
- **[ADIADO p/ etapa 8]** Ligação do tile com rodadas e economia por tile. A 4F cobre só o **formato do estado** e a **fórmula de produção**.
- **[DECIDIDO] Etapa 1B:** feita até o **multinível**. Falta **vilas de formatos variados** e **cidades que não sejam uma vila grande esticada**; entram na 4B/4C (lugar ideal para testar, mesmo fora do escopo original).
- **[DECIDIDO]** Commitar a documentação antes de abrir as sessões de implementação.
- **[DECIDIDO] Soldados (inicial):** vila **3 a 6**; cidade **10 fora de guerra** (mais em batalha, a calibrar na guerra).
- **[DECIDIDO] Pousada e alojamento:** loja com **comida + cura + a produção daquele tile**, se houver.
- **[DECIDIDO] Ruínas:** por ora reaproveita o POI `ruins` atual; o funcionamento muda mais para frente.
- **[DECIDIDO]** Peso por terreno inicial x3. **Vilas não têm rank:** o imposto usa o **mesmo rank fixo para todas** (valor inicial em `economy-modifiers.js`).
- **[DECIDIDO]** A 4B pode **recalibrar os ajustes de tamanho da cidade** (ruas, casas, pessoas) e medir velocidade.
- **[MEDIDO] Linha de base de geração** (Chromium sem janela, até o jogo rodar; 2 execuções): mapa 704 = **7,7 a 10,9 s** (~15 µs por bloco), mapa 640 = 6,6 s, cenário batalha (320, 2 cidades) = 1,2 s, `?cenario=tile` 256 = 1,1 s, 320 de cidade = 1,5 s. **Previsão para 384: ~2,2 s** sem POIs extras. **Limite proposto:** tile temático ≤ 4 s e cidade enorme ≤ 5 s nesse mesmo teste (ajustável).
- **[ABERTO]** Onde fica a proporção de temas na criação do mundo: proposta `?temas=70` por URL agora, tela de menu depois (aguarda OK).

## Revisão na 4B (2026-11-23)
- **[DECIDIDO]** Cidade enorme: pegada **25 a 35%** do tile (antes 40 a 60%) e caixa **até 45%** (`CITY_HUGE.areaFrac`/`boxMax`), para sobrar anel livre a POIs e a zona de cerco. Lado típico 200 a 230.

## Revisão na 4E (2026-11-23)
- **[DECIDIDO]** 'Principal no centro' do texto da composição passou a valer só para ~30% dos tiles: a posição vem dos arquétipos da rodada 8 (`tileMainPlan`). A cidade/vila usa o deslocamento máximo `(tile − 2·half)/2 − 14` (a folga de 14 é a `CITY_HUGE.margin`, no lugar dos 8 do texto) e fica a `half + 12` das aberturas; a folga de 70 da borda e 80 das aberturas vale para os POIs normais.
- **[IMPLEMENTADO COM SUBSTITUTOS]** POIs que ainda não existem entram com o mais parecido e a tabela do tile marca `pend`: vila de trabalhadores e vila de apoio (-> alojamento), plantação (-> fazenda), pesca (-> torre de vigia). Tema ponte sem ponte no tile vira entreposto até o grafo (etapa 5). POI principal que não cabe (vila em escombros, forte) cai em ruínas/torre.
- **[IMPLEMENTADO]** Zonas de guerra reservadas (abertura, anel, praça), montagem por batalha com POIs de TESTE (acampamento fortificado, trincheira, barricada), reposicionamento. Tipos e quantidade verdadeiros: etapa 10.

## Pendente
- Ligação do tile com rodadas, economia por tile e simulação fora da tela: etapas 7 e 8.
- Anexação, carne e couro do tile Animais, bônus extra do tile de vila: etapa 8.
- POIs de guerra por zona (tipos, quantidade, custo, reposicionamento): etapa 10. **REDEFINIR (usuário, 2026-11-24):** com batalhas num ponto de um mapa aberto, os POIs de guerra (resistência ao longo de um caminho de conquista) perdem o sentido, porque o jogador pode dar a volta e atacar o POI principal. Os da 4E (acampamento, trincheira, barricada nas zonas) são só de TESTE. Falta pensar como passar a sensação de batalha (caos, improviso, destruição); as zonas reservadas da 4E podem virar pontos de entrada/captura em vez de POIs.
- Atualizar `5_mapa-mundi.md` com 384, cidades enormes, temas e passagem.
