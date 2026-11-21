# Atualizações dos POIs: tarefas

Origem: seção "Descrição e regras das features" de `docs/fase-6-guerra.md` (itens 4, 8 e 9 da tabela de features). Escrito em 2026-11-20. A feature 35 (evolução do nível do líder) fica para uma implementação futura e não está neste documento.
Código envolvido: `js/poigame.js` (`POIX`, `poiRetakeChance`, gancho `round`, `poiBinoc`, vigia em `poiAct`, `poiMarkCheck`, marcador no minimapa e mapa em `game.js`, `svcPost`), `js/econ.js` (`shopLeft`/`shopTake`/`refreshShops`), `js/policies.js` (cartão "Terras livres", `STATE.poiX.decided`/`defer`/`clr`).

**Regras gerais:**
- Só **acrescentar** campos em `STATE.poiX` (ausentes = padrão): não precisa subir `SAVE_VERSION`.
- Números novos ficam em `POIX` (`js/poigame.js`).
- **Avisos na tela:** cada tarefa lista os que vão aparecer; não criar outros. Eventos vão para o relatório da rodada (`rdNow`), sem toast.
- Terminar cada tarefa com `node tests/smoke.js` e atualizar a tabela de tipos e a tabela de features em `docs/fase-6-guerra.md`.

## Ordem

| # | Tarefa | Feature | Tam. | Sessão |
|---|---|---|---|---|
| 1 | **Retomada de POI livre que ficou sem decisão** | 4 | M | Nova |
| 2 | **Retomada por sorteio na guerra (POIs do jogador)** | 4 | P | Continua da 1 |
| 3 | **Torre: "Fazer vigia", um uso por torre por rodada** | 8 | M | Nova |
| 4 | **Entreposto: estoque limitado** | 9 | P | Continua da 3 |
| 5 | **Fechamento** | todas | P | Continua da 4 |

P = pequeno, M = médio. As tarefas 1 a 4 não dependem entre si.

**Como ler a coluna "Sessão":**
- **Nova** = conversa nova (contexto limpo): a tarefa mexe em outra área do código ou a conversa já está longa.
- **Continua** = na mesma conversa da tarefa anterior: usa os mesmos arquivos e o que já foi lido.

**Por quê:**
- **1 (Nova):** mexe no cartão "Terras livres" (`policies.js`) e na troca de dono dos POIs; contexto próprio.
- **2 (Continua da 1):** é o mesmo gancho `round` e a mesma `poiRetakeChance`; pequena.
- **3 (Nova):** área diferente (torre, mapa e minimapa em `game.js`, avisos); não aproveita nada da 1 e da 2.
- **4 (Continua da 3):** pequena, no mesmo `poigame.js`; só mude para uma conversa nova se a da 3 já estiver longa (usa `econ.js`, que a 3 não leu).
- **5 (Continua da 4):** só docs e smoke, com o que foi feito ainda na conversa.

Em cada sessão, terminar com `node tests/smoke.js`.

## O que fazer em cada tarefa

### 1. Retomada de POI livre que ficou sem decisão (feature 4, 1ª regra)
**Regra:** se o Comandante esvaziou um POI e, no turno do Líder seguinte, **não o resolveu** (anexar, vender ou doar), ao **encerrar o turno do Líder** ele é retomado. Se for retomado, **50% bandidos** (a guarnição reaparece) e **50% a facção mais perto do POI** (qualquer uma que não seja a do jogador, **inclusive as em guerra com ele**). Se não houver facção com cidades, vão os bandidos.
- Hoje o POI não resolvido só volta a ter cartão na rodada seguinte (`decided`). Passa a valer o sorteio de 50% **em toda rodada** em que ele ficou livre e sem anexar, doar ou vender (cartão ignorado, ou que sumiu porque você resolveu outro POI na mesma rodada).
- **A opção "Adiar" (Z) sai e entra "Ignorar":** a opção deixa de ter contagem própria (some `X.defer` e a regra "2ª vez = bandidos voltam", em `poiOpts` e `Hooks.on('resetState')` de `poigame.js`). Ignorar apenas deixa o POI livre; quem vale é o sorteio de 50% acima, igual a um cartão que sumiu. Textos do cartão (`eff` e a descrição, que fala em "deixar para depois") passam a avisar do risco de 50% de retomada.
- Nos 50% restantes o POI continua livre e o cartão volta na rodada seguinte (como hoje).
- Se a facção toma o POI: dono = facção (bandeira, guarnição e moradores pelo `poiSetOwner`/`poiGarrisonSync`).
- Exemplo do documento: rodada 3, o Comandante esvazia uma torre e um forte; na rodada 4 anexa o forte (o cartão da torre some); ao encerrar o Líder, sorteia: bandidos reaparecem na torre, ou a facção mais próxima a toma.
- **Avisos (relatório da rodada):** "🏴 Bandidos retomaram <POI> que estava livre." ou "🏳 <Facção> assumiu <POI> que estava livre." Nenhum toast.
- **Teste:** `?auto=1&mute=1&seed=11`, matar a guarnição (`damageEnemy(e,99999,false)` em `p.gar.enemies`), encerrar a rodada duas vezes sem decidir; repetir com `Math.random` fixo (0 e 0,99) para ver os dois resultados. Acrescentar ao smoke.

### 2. Retomada por sorteio na guerra (feature 4, 2ª e 3ª regras)
**Regra:** o sorteio por distância (`poiRetakeChance`) **já existe e vale só para os POIs do jogador** (chance por rodada, medida a partir da sua cidade mais próxima; retomada por bandidos; aviso no relatório). Continua **só para o jogador** (POIs de facções não entram). O que falta é a guerra.
- **Na guerra** (alguma facção em guerra com o jogador): multiplicar a chance por `POIX.retake.war` (< 1; sugestão 0,5, a calibrar), em `poiRetakeChance`. O número final entra no objeto `WAR` quando ele existir.
- Exemplo 2 do documento (com a tarefa 1): uma facção toma um POI livre; já o POI que o jogador anexou e fica longe das suas cidades segue sujeito ao sorteio e, na rodada 6, pode ser capturado.
- O cartão "Terras livres" já mostra a chance de retomada; passa a mostrar o valor com o redutor de guerra, porque usa a mesma função.
- **Avisos (relatório da rodada):** o atual, "🏴 Bandidos retomaram <POI>, longe demais das suas cidades." Nenhum novo.
- **Teste:** com `Math.random` fixo e uma guerra ligada (`?cenario=pois` ou declarando guerra), conferir que `poiRetakeChance(p)` cai pela metade e que o aviso entra no relatório. Acrescentar ao smoke.

### 3. Torre: uma só ação, "Fazer vigia", um uso por torre por rodada (feature 8)
**Regra:** a torre passa a ter **uma única ação**, **"Fazer vigia"**, que é o binóculo atual com as correções abaixo. A antiga vigia separada (raio de 400, só acampamentos, POIs de bandidos e ruínas) e o item "Usar o binóculo" **são fundidos** nessa ação; sai o código duplicado (`poivigil` e `poibinoc` em `poiScan`/`poiAct`, `poiBinoc`). Ela **sorteia o achado do jeito do binóculo atual** (`poiBinoc`: raio de 300, pesos `POIX.binoc.w` do mais raro ao mais comum, categoria sem candidatos fica fora).
- **Avança 4 horas** (`POIX.vigilHours`; o campo `hours` do binóculo sai).
- **Um achado por torre por rodada.** Cada torre só pode ser usada uma vez; depois fica inutilizável até a rodada seguinte. O contador deixa de ser global (`X.bin.n`, `X.vigil`) e passa a ser **por torre** (`X.vigil[p.id] = rodada`). `POIX.binoc.max` sai.
- Só no turno do Comandante e só em torre sua (como a vigia de hoje).
- **Marcador:** um **"?"** no lugar da estrela laranja, no minimapa (`game.js`, perto da linha 584) e no mapa grande (perto da linha 648). Sem rótulo de tipo no mapa.
- **Vários marcadores:** `G.poiMark` (um só) vira uma lista `G.poiMarks`. Usar duas torres deixa **dois "?" ao mesmo tempo**. Cada um some ao jogador chegar a 15 blocos dele, ou no fim da rodada (`poiMarkCheck` e o gancho `round`).
- **Avisos na tela:**
  - achou algo: "Um novo ponto de interesse foi marcado no mapa." (sem dizer o tipo; ao chegar ao ponto, o aviso atual "Você chegou ao ponto de interesse." fica);
  - não há mais nada no raio: "Não foi encontrado nada fora do normal.";
  - torre já usada na rodada: "Esta torre já foi usada nesta rodada.";
  - fora do turno do Comandante: o aviso atual da vigia.
- **Dica de interação:** "[E] Fazer vigia (avança 4 h e marca um ponto de interesse)", com "— já feito nesta rodada" quando for o caso.
- Efeitos colaterais que continuam: o POI achado passa a aparecer no mapa (`X.seen`); o achado não se repete na mesma rodada (`X.bin.f`, agora compartilhado por todas as torres para duas torres não marcarem a mesma coisa).
- Atualizar a linha da Torre na tabela de tipos de `fase-6-guerra.md` ("Fazer vigia", 1 uso por torre por rodada, 4 h) e a seção do binóculo da fatia 3 (que passa a ser histórico).
- **Teste:** `?cenario=pois`, torre sua: fazer a vigia (marca um "?"), repetir na mesma torre (recusa); com duas torres, dois "?" ao mesmo tempo no mapa; sem candidatos no raio, aparece "Não foi encontrado nada fora do normal." Acrescentar ao smoke.

### 4. Entreposto: estoque limitado (feature 9)
**Regra:** o lojista do entreposto (`svcPost`) passa a ter **estoque limitado**, **menor que o das lojas das cidades**. Hoje vende sem limite.
- Itens limitados: **materiais** (os mesmos que as lojas já limitam: carne, tora, minério, couro, via `shopLeft`/`shopTake`). Comida, munição e remédios seguem sem limite.
- Estoque do entreposto = estoque da loja da cidade de referência (`poiPriceCity(p)`) × `POIX.post.stockMul` (sugestão 0,5), arredondado para baixo; renovado **a cada rodada**. Guardar em `STATE.poiX.postStock[p.id] = {r: rodada, s: {item: qtd}}` e recriar sob demanda quando `r !== STATE.round`. Respeitar `fsupStockMul` e `meetStockMul`, como as lojas.
- A tela mostra a quantidade restante ao lado de cada material, como as lojas das cidades, e desabilita o botão quando zera.
- **Avisos:** nenhum novo; o texto do botão mostra a quantidade.
- **Teste:** `?cenario=pois`, `svcPost(p)`; comprar até zerar; `endRound` e ver o estoque voltar. Acrescentar ao smoke.

### 5. Fechamento
- Atualizar em `docs/fase-6-guerra.md`: tabela de tipos (Torre, Entreposto), tabela de features (4, 8 e 9 com estado e "O que falta") e a seção "Estado atual dos POIs".
- Atualizar `docs/MAPA.md` se surgirem funções novas (estoque do entreposto, retomada por dono).
- `node tests/smoke.js` passando e `/encerrar-sessao`.

## Riscos
- **Retomada por facção (tarefa 1):** a mudança de dono de um POI visível precisa atualizar bandeira, guarnição e moradores (`poiSetOwner`, `poiGarrisonSync`).
- **Smoke intermitente** ("moradores na rodada N+1", `civNext`): pode confundir os testes novos; separar a falha antiga das novas.
